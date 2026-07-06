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
const loginFailMatric = new Map<string, Bucket>()  // matric → login fails
const loginFailIp = new Map<string, Bucket>()      // ip → login fails this hour
const loginLock = new Map<string, Bucket>()        // matric → locked until

// Configuration — tuned for election day
const LIMITS = {
  LOOKUPS_PER_HOUR: 15,        // a real student looks up 1-2 times
  CLAIMS_PER_DAY: 3,           // a real student claims exactly 1
  NAME_FAILS_PER_MATRIC: 5,    // allow typos but block guessing
  NAME_FAILS_PER_IP_HOUR: 10,  // block IP-level name spraying
  LOCK_MINUTES: 30,            // lock matric after NAME_FAILS_PER_MATRIC fails
  // Login rate limiting (pre-set password scheme). The "secret" portion of
  // the password is only 4 letters (~456k combos), so we lock after 3 fails
  // to make brute-forcing impractical. Committee decision: 5 was too lenient,
  // tightened to 3 on 2026-07-06.
  LOGIN_FAILS_PER_MATRIC: 3,
  LOGIN_FAILS_PER_IP_HOUR: 9,
  LOGIN_LOCK_MINUTES: 15,
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

// ── Login rate limiting (pre-set password scheme) ───────────────────────

function isLoginLocked(matric: string): { locked: boolean; retryAfterMs?: number } {
  const lock = loginLock.get(matric)
  if (!lock) return { locked: false }
  if (lock.expiresAt < Date.now()) {
    loginLock.delete(matric)
    loginFailMatric.delete(matric)
    return { locked: false }
  }
  return { locked: true, retryAfterMs: lock.expiresAt - Date.now() }
}

/**
 * Check whether a login attempt is allowed for this matric + IP.
 * Does NOT increment any counter — call recordLoginFailure() on a wrong
 * password. Returns remaining attempts before lock.
 */
export function checkLoginFailLimits(matric: string, ip: string) {
  const lock = isLoginLocked(matric)
  if (lock.locked) {
    return {
      allowed: false,
      locked: true,
      retryAfterMs: lock.retryAfterMs,
      remaining: 0,
    }
  }

  // IP-level cap: stops one attacker trying many matrics from one device
  const ipBucket = loginFailIp.get(ip)
  if (ipBucket && ipBucket.expiresAt > Date.now() && ipBucket.count >= LIMITS.LOGIN_FAILS_PER_IP_HOUR) {
    return {
      allowed: false,
      locked: false,
      retryAfterMs: ipBucket.expiresAt - Date.now(),
      remaining: 0,
    }
  }

  const matricBucket = loginFailMatric.get(matric)
  const fails = matricBucket && matricBucket.expiresAt > Date.now() ? matricBucket.count : 0
  return {
    allowed: true,
    locked: false,
    remaining: Math.max(0, LIMITS.LOGIN_FAILS_PER_MATRIC - fails),
  }
}

/**
 * Record a failed login attempt. Locks the matric for LOGIN_LOCK_MINUTES
 * once the threshold is hit.
 */
export function recordLoginFailure(matric: string, ip: string) {
  const now = Date.now()
  const windowMs = LIMITS.LOGIN_LOCK_MINUTES * 60 * 1000

  // matric-level
  const mExisting = loginFailMatric.get(matric)
  if (!mExisting || mExisting.expiresAt < now) {
    loginFailMatric.set(matric, { count: 1, expiresAt: now + windowMs })
  } else {
    mExisting.count++
  }
  const mCount = loginFailMatric.get(matric)!.count

  // IP-level (1 hour window)
  const ipWindow = 60 * 60 * 1000
  const ipExisting = loginFailIp.get(ip)
  if (!ipExisting || ipExisting.expiresAt < now) {
    loginFailIp.set(ip, { count: 1, expiresAt: now + ipWindow })
  } else {
    ipExisting.count++
  }

  const locked = mCount >= LIMITS.LOGIN_FAILS_PER_MATRIC
  if (locked) {
    loginLock.set(matric, {
      count: 0,
      expiresAt: now + LIMITS.LOGIN_LOCK_MINUTES * 60 * 1000,
    })
  }

  return {
    matricFails: mCount,
    threshold: LIMITS.LOGIN_FAILS_PER_MATRIC,
    locked,
    remaining: Math.max(0, LIMITS.LOGIN_FAILS_PER_MATRIC - mCount),
  }
}

export function clearLoginFailures(matric: string) {
  loginFailMatric.delete(matric)
  loginLock.delete(matric)
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
      for (const map of [lookupBuckets, claimBuckets, nameFailMatric, nameFailIp, matricLock, loginFailMatric, loginFailIp, loginLock]) {
        for (const [key, bucket] of map) {
          if (bucket.expiresAt < now) map.delete(key)
        }
      }
    },
    10 * 60 * 1000
  ).unref?.()
}
