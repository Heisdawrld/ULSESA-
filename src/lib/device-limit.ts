import crypto from 'crypto'
import { db } from '@/lib/db'

/**
 * Server-side device-fingerprint hashing + claim-limit enforcement.
 *
 * The client sends a raw fingerprint (canvas+UA+screen hash). We NEVER store
 * that raw value — we hash it again with a server-side salt before storing
 * or comparing. That way, even if the DB leaks, an attacker can't reverse
 * the hashes back to device identities (the salt is in env, not the DB).
 *
 * Cap: max 2 successful claims per device fingerprint. Admin can grant
 * overrides (DeviceOverride rows) that add extraClaims to the cap.
 */

// Default cap. Override rows add to this.
const DEFAULT_CLAIM_CAP = 2

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
