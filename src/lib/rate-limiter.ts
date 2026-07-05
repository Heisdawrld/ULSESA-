/**
 * In-memory rate limiter for the claim flow.
 *
 * Render free tier runs a single persistent web service instance, so
 * in-memory state survives across requests. If the instance restarts,
 * counters reset — acceptable for an election-day tool.
 *
 * Three separate windows:
 *  1. lookupLimit    — per IP, max matric lookups per hour (stops enumeration)
 *  2. claimLimit     — per IP, max successful claims per day (stops mass-claim)
 *  3. nameFailLimit  — per matric, max name-mismatch attempts (stops name guessing)
 *                      + per IP, max name failures per hour
 */

interface Bucket {
  count: number
  expiresAt: number
}

// Map key → bucket
const lookupBuckets = new Map<string, Bucket>()    // ip → lookups this hour
const claimBuckets = new Map<string, Bucket>()     // ip → claims today
const nameFailMatric = new Map<string, Bucket>()   // matric → name fails
const nameFailIp = new Map<string, Bucket>()       // ip → name fails this hour
const matricLock = new Map<string, Bucket>()       // matric → locked until

// Configuration — tuned for election day
const LIMITS = {
  LOOKUPS_PER_HOUR: 15,        // a real student looks up 1-2 times
  CLAIMS_PER_DAY: 3,           // a real student claims exactly 1
  NAME_FAILS_PER_MATRIC: 5,    // allow typos but block guessing
  NAME_FAILS_PER_IP_HOUR: 10,  // block IP-level name spraying
  LOCK_MINUTES: 30,            // lock matric after NAME_FAILS_PER_MATRIC fails
}

function checkBucket(
  map: Map<string, Bucket>,
  key: string,
  windowMs: number,
  max: number
): { allowed: boolean; remaining: number; retryAfterMs?: number } {
  const now = Date.now()
  const existing = map.get(key)

  if (!existing || existing.expiresAt < now) {
    map.set(key, { count: 1, expiresAt: now + windowMs })
    return { allowed: true, remaining: max - 1 }
  }

  if (existing.count >= max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: existing.expiresAt - now,
    }
  }

  existing.count++
  return { allowed: true, remaining: max - existing.count }
}

function recordFailure(
  map: Map<string, Bucket>,
  key: string,
  windowMs: number
): { count: number; threshold: number; locked: boolean } {
  const now = Date.now()
  const existing = map.get(key)

  if (!existing || existing.expiresAt < now) {
    map.set(key, { count: 1, expiresAt: now + windowMs })
    return { count: 1, threshold: LIMITS.NAME_FAILS_PER_MATRIC, locked: false }
  }

  existing.count++
  const locked = existing.count >= LIMITS.NAME_FAILS_PER_MATRIC
  if (locked) {
    // Lock the matric for 30 minutes
    matricLock.set(key, {
      count: 0,
      expiresAt: now + LIMITS.LOCK_MINUTES * 60 * 1000,
    })
  }
  return {
    count: existing.count,
    threshold: LIMITS.NAME_FAILS_PER_MATRIC,
    locked,
  }
}

function isLocked(matric: string): { locked: boolean; retryAfterMs?: number } {
  const lock = matricLock.get(matric)
  if (!lock) return { locked: false }
  if (lock.expiresAt < Date.now()) {
    matricLock.delete(matric)
    nameFailMatric.delete(matric)
    return { locked: false }
  }
  return { locked: true, retryAfterMs: lock.expiresAt - Date.now() }
}

// ── Public API ──────────────────────────────────────────────────────────

export function checkLookupLimit(ip: string) {
  return checkBucket(
    lookupBuckets,
    ip,
    60 * 60 * 1000, // 1 hour
    LIMITS.LOOKUPS_PER_HOUR
  )
}

export function checkClaimLimit(ip: string) {
  return checkBucket(
    claimBuckets,
    ip,
    24 * 60 * 60 * 1000, // 24 hours
    LIMITS.CLAIMS_PER_DAY
  )
}

export function checkNameFailLimits(matric: string, ip: string) {
  // First check if the matric is locked
  const lock = isLocked(matric)
  if (lock.locked) {
    return {
      allowed: false,
      locked: true,
      retryAfterMs: lock.retryAfterMs,
      remaining: 0,
    }
  }

  // Check IP-level name failure rate
  const ipCheck = checkBucket(
    nameFailIp,
    ip,
    60 * 60 * 1000,
    LIMITS.NAME_FAILS_PER_IP_HOUR
  )
  if (!ipCheck.allowed) {
    return {
      allowed: false,
      locked: false,
      retryAfterMs: ipCheck.retryAfterMs,
      remaining: 0,
    }
  }

  return { allowed: true, locked: false, remaining: ipCheck.remaining }
}

export function recordNameFailure(matric: string, ip: string) {
  recordFailure(nameFailMatric, matric, 30 * 60 * 1000) // 30-min window for matric
  const ipResult = checkBucket(
    nameFailIp,
    ip,
    60 * 60 * 1000,
    LIMITS.NAME_FAILS_PER_IP_HOUR
  )
  // We need to INCREMENT the IP counter, not check it. checkBucket increments
  // when allowed, but when blocked it doesn't. Let's just directly increment.
  const now = Date.now()
  const existing = nameFailIp.get(ip)
  if (!existing || existing.expiresAt < now) {
    nameFailIp.set(ip, { count: 1, expiresAt: now + 60 * 60 * 1000 })
  } else {
    existing.count++
  }

  const matricResult = nameFailMatric.get(matric)
  return {
    matricFails: matricResult?.count ?? 0,
    threshold: LIMITS.NAME_FAILS_PER_MATRIC,
    locked: isLocked(matric).locked,
  }
}

export function clearMatricFailures(matric: string) {
  nameFailMatric.delete(matric)
  matricLock.delete(matric)
}

/**
 * Get the client IP from a Next.js Request. Falls back to 'unknown'
 * if no forwarding headers are present (e.g. in local dev).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
}

export function formatRetryAfter(ms?: number): string {
  if (!ms || ms <= 0) return 'a few minutes'
  const minutes = Math.ceil(ms / (60 * 1000))
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`
  const hours = Math.ceil(minutes / 60)
  return `${hours} hour${hours > 1 ? 's' : ''}`
}

// ── Periodic cleanup (prevent memory leak over long uptime) ─────────────
// Run every 10 minutes, purge expired entries.
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      const now = Date.now()
      for (const map of [lookupBuckets, claimBuckets, nameFailMatric, nameFailIp, matricLock]) {
        for (const [key, bucket] of map) {
          if (bucket.expiresAt < now) map.delete(key)
        }
      }
    },
    10 * 60 * 1000
  ).unref?.()
}
