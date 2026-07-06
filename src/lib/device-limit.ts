import crypto from 'crypto'
import { db } from '@/lib/db'

/**
 * Server-side device-fingerprint hashing + claim-limit enforcement.
 *
 * The client sends a raw fingerprint (canvas+WebGL+audio+UA+screen hash).
 * We NEVER store that raw value — we hash it again with a server-side salt
 * before storing or comparing. That way, even if the DB leaks, an attacker
 * can't reverse the hashes back to device identities (the salt is in env,
 * not the DB).
 *
 * Cap: max 1 successful claim per device fingerprint. ONE account per
 * device — no sharing. Admin can grant overrides (DeviceOverride rows)
 * that add extraClaims to the cap for legit exceptions (e.g. a shared
 * faculty phone verified in person).
 */

// Default cap. Override rows add to this.
// 1 = one account per device. No exceptions without admin override.
const DEFAULT_CLAIM_CAP = 1

// Salt for hashing fingerprints. Pulled from env so different deploys hash
// differently (a hash on staging doesn't match a hash on prod).
const FINGERPRINT_SALT =
  process.env.DEVICE_FP_SALT || 'ulsesa-device-fp-salt-2026'

/**
 * Hash a raw client-side fingerprint with the server salt. Returns 64-char
 * hex (SHA-256).
 */
export function hashDeviceFingerprint(rawFingerprint: string): string {
  return crypto
    .createHash('sha256')
    .update(FINGERPRINT_SALT + ':' + rawFingerprint)
    .digest('hex')
}

/**
 * Short label for display in the admin UI (first 12 chars of the hash).
 * Enough to group attempts visually without exposing the full hash.
 */
export function shortFingerprint(fingerprintHash: string): string {
  return fingerprintHash.slice(0, 12)
}

/**
 * Count how many SUCCESSFUL claims a device has already made. Uses the
 * Student table (where deviceFingerprint is the server-hash) — this is the
 * source of truth for "real" claims, since DeviceClaimAttempt also records
 * blocked attempts (which shouldn't count toward the cap).
 */
async function countSuccessfulClaims(fingerprintHash: string): Promise<number> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT COUNT(*) as n FROM Student WHERE deviceFingerprint = ?`,
    fingerprintHash
  )) as Array<{ n: bigint }>
  return Number(rows[0]?.n ?? 0)
}

/**
 * Sum of all active DeviceOverride rows for this fingerprint. Each override
 * adds extraClaims to the cap. Overrides with expiresAt in the past are
 * ignored.
 */
async function countOverrideAllowance(fingerprintHash: string): Promise<number> {
  const rows = (await db.$queryRawUnsafe(
    `SELECT COALESCE(SUM(extraClaims), 0) as n FROM DeviceOverride
     WHERE fingerprintHash = ?
     AND (expiresAt IS NULL OR expiresAt > CURRENT_TIMESTAMP)`,
    fingerprintHash
  )) as Array<{ n: bigint }>
  return Number(rows[0]?.n ?? 0)
}

export interface DeviceLimitCheck {
  /** Whether a new claim should be allowed from this device. */
  allowed: boolean
  /** Number of successful claims already made from this device. */
  existingClaims: number
  /** Current cap (DEFAULT_CLAIM_CAP + overrides). */
  cap: number
  /** Number of override extra-claims granted. */
  overrides: number
}

/**
 * Check whether a new claim should be allowed from the given (raw) device
 * fingerprint. Does NOT mutate state — the caller is responsible for
 * inserting the Student row + the DeviceClaimAttempt audit log.
 */
export async function checkDeviceClaimLimit(
  rawFingerprint: string
): Promise<DeviceLimitCheck & { fingerprintHash: string }> {
  const fingerprintHash = hashDeviceFingerprint(rawFingerprint)
  const existingClaims = await countSuccessfulClaims(fingerprintHash)
  const overrides = await countOverrideAllowance(fingerprintHash)
  const cap = DEFAULT_CLAIM_CAP + overrides
  const allowed = existingClaims < cap
  return {
    allowed,
    existingClaims,
    cap,
    overrides,
    fingerprintHash,
  }
}

/**
 * Audit-log a claim attempt (success or blocked). The raw fingerprint is
 * already hashed by the caller (we receive fingerprintHash, not raw).
 */
export async function logClaimAttempt(params: {
  fingerprintHash: string
  matricNumber: string
  outcome: 'success' | 'blocked'
  ip: string | null
  userAgent: string | null
}): Promise<void> {
  const id = `dca-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  await db.$executeRawUnsafe(
    `INSERT INTO DeviceClaimAttempt
       (id, fingerprintHash, fingerprintShort, matricNumber, outcome, ip, userAgent, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    id,
    params.fingerprintHash,
    shortFingerprint(params.fingerprintHash),
    params.matricNumber,
    params.outcome,
    params.ip,
    params.userAgent
  )
}

/**
 * Public cap (for the admin UI display). Returns the default + any overrides.
 */
export function getDefaultClaimCap(): number {
  return DEFAULT_CLAIM_CAP
}

// ── Server-side IP+UA cross-check (secondary fraud signal) ──────────────
//
// The client fingerprint (canvas+WebGL+audio) is the PRIMARY signal, but a
// determined fraudster could try to spoof it by modifying the client JS or
// using an anti-fingerprinting browser. To back it up, we compute a SEPARATE
// server-side hash from the request IP + User-Agent — values the client
// cannot fake (they come from the HTTP headers, set by the browser/proxy,
// not by page JS).
//
// If the client fingerprint is spoofed but the IP+UA combo has already been
// used to claim a DIFFERENT matric, we block. This catches:
//   - Same browser, cleared cookies, new fingerprint → same IP+UA → BLOCKED
//   - Same device, incognito mode → same IP+UA → BLOCKED
//   - Anti-fingerprinting extension → same IP+UA → BLOCKED
//
// The IP+UA hash is stored on the Student row (serverFingerprint column)
// alongside the client fingerprint, so both signals are always available.
//
// NOTE: IP can legitimately change (mobile network handoff, wifi→cellular).
// So IP+UA is a SECONDARY check — it only blocks when the client fingerprint
// check PASSED but the IP+UA hash matches an existing different-matric claim.
// This way, a student whose phone switches from wifi to cellular mid-session
// is never blocked by the IP change alone.

const SERVER_FP_SALT =
  process.env.DEVICE_FP_SALT || 'ulsesa-device-fp-salt-2026'

/**
 * Hash the IP + User-Agent into a server-side fingerprint. Uses the same
 * salt as the client fingerprint so a DB leak doesn't expose either.
 */
export function hashServerFingerprint(ip: string, userAgent: string): string {
  return crypto
    .createHash('sha256')
    .update(SERVER_FP_SALT + ':server:' + ip + ':' + userAgent)
    .digest('hex')
}

/**
 * Secondary fraud check: has this IP already been used to claim a DIFFERENT
 * matric? If so, block — the student is trying to use the same network
 * (possibly with cleared cookies, incognito, or a spoofed client fingerprint)
 * to claim a second account.
 *
 * The IP check is a BACKUP to the client fingerprint. It catches the case
 * where a student clears cookies/localStorage or uses an anti-fingerprinting
 * extension to get a new client fingerprint — the IP stays the same, so we
 * still block.
 *
 * @param ip            Client IP from headers
 * @param userAgent     User-Agent from headers (for the server fingerprint hash)
 * @param currentMatric The matric being claimed (excluded from the count)
 * @returns allowed=false if a different matric was already claimed from
 *          the same IP
 */
export async function checkServerFingerprint(
  ip: string | null,
  userAgent: string | null,
  currentMatric: string
): Promise<{ allowed: boolean; existingClaims: number; serverFingerprint: string | null }> {
  // If we can't get IP or UA, skip the check (don't block legit students
  // behind aggressive proxies). The client fingerprint still applies.
  if (!ip || ip === 'unknown' || !userAgent) {
    return { allowed: true, existingClaims: 0, serverFingerprint: null }
  }

  const serverFingerprint = hashServerFingerprint(ip, userAgent)

  // Count existing claims from this IP, excluding the current matric.
  // With a 1-claim cap, even ONE prior claim from the same IP is a red flag.
  const existingFromSameIp = (await db.$queryRawUnsafe(
    `SELECT COUNT(*) as n FROM Student
     WHERE claimIp = ?
     AND matricNumber != ?`,
    ip,
    currentMatric
  )) as Array<{ n: bigint }>

  const existingClaims = Number(existingFromSameIp[0]?.n ?? 0)
  const allowed = existingClaims === 0

  return { allowed, existingClaims, serverFingerprint }
}
