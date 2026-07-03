// In-memory OTP store for demo purposes.
// In a real system, this would be Redis or a DB-backed store.

interface OTPEntry {
  otp: string
  expiry: number
  channel: 'email' | 'phone'
}

const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes

// Use globalThis to preserve the Map across hot reloads in dev
const globalForOTP = globalThis as unknown as {
  __ddpOtpStore?: Map<string, OTPEntry>
}

const otpStore: Map<string, OTPEntry> =
  globalForOTP.__ddpOtpStore ?? new Map<string, OTPEntry>()

if (process.env.NODE_ENV !== 'production') {
  globalForOTP.__ddpOtpStore = otpStore
}

export function storeOTP(
  matric: string,
  otp: string,
  channel: 'email' | 'phone' = 'email'
): void {
  otpStore.set(matric.toLowerCase(), {
    otp,
    expiry: Date.now() + OTP_TTL_MS,
    channel,
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

export function clearOTP(matric: string): void {
  otpStore.delete(matric.toLowerCase())
}

export function verifyOTP(matric: string, otp: string): boolean {
  const entry = getOTP(matric)
  if (!entry) return false
  if (entry.otp !== otp) return false
  clearOTP(matric)
  return true
}
