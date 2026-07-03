// In-memory OTP store with verification state tracking.
// In a production multi-server setup, this would be Redis or DB-backed.
// For a single-server departmental deployment, in-memory is sufficient.

interface OTPEntry {
  otp: string
  expiry: number
  verified: boolean // tracks whether the student successfully verified the OTP
  attempts: number // track failed attempts to prevent brute force
}

const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes
const MAX_ATTEMPTS = 5

// Use globalThis to preserve the Map across hot reloads in dev
const globalForOTP = globalThis as unknown as {
  __ulsesaOtpStore?: Map<string, OTPEntry>
}

const otpStore: Map<string, OTPEntry> =
  globalForOTP.__ulsesaOtpStore ?? new Map<string, OTPEntry>()

if (process.env.NODE_ENV !== 'production') {
  globalForOTP.__ulsesaOtpStore = otpStore
}

export function storeOTP(matric: string, otp: string): void {
  otpStore.set(matric.toLowerCase(), {
    otp,
    expiry: Date.now() + OTP_TTL_MS,
    verified: false,
    attempts: 0,
  })
}

export function getOTP(matric: string): OTPEntry | null {
  const entry = otpStore.get(matric.toLowerCase())
  if (!entry) return null
  if (Date.now() > entry.expiry) {
    otpStore.delete(matric.toLowerCase())
    return null
  }
  return entry
}

/**
 * Attempt to verify an OTP. On success, marks the entry as verified
 * (but does NOT clear it — set-password will clear it after use).
 * On failure, increments the attempt counter and clears after MAX_ATTEMPTS.
 */
export function verifyOTP(matric: string, otp: string): boolean {
  const entry = getOTP(matric)
  if (!entry) return false

  if (entry.otp === otp) {
    entry.verified = true
    return true
  }

  // Wrong OTP — increment attempts
  entry.attempts += 1
  if (entry.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(matric.toLowerCase())
  }
  return false
}

/**
 * Check whether the student has successfully verified their OTP.
 * Used by set-password to ensure the OTP step was completed.
 */
export function isOTPVerified(matric: string): boolean {
  const entry = getOTP(matric)
  if (!entry) return false
  return entry.verified
}

/**
 * Clear the OTP entry. Called after password is successfully set.
 */
export function clearOTP(matric: string): void {
  otpStore.delete(matric.toLowerCase())
}
