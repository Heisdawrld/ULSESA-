'use client'

/**
 * Lightweight device fingerprint for one-claim-per-device fraud prevention.
 *
 * Strategy: generate a random UUID on first visit, persist it in BOTH
 * localStorage and a long-lived cookie. The server receives this fingerprint
 * on account claim and rejects a second claim from the same fingerprint.
 *
 * This is deliberately simple — it's not a canvas/WebGL fingerprint. The goal
 * is to stop casual "let me claim 5 matrics from my laptop" fraud, not to
 * defeat a determined attacker with multiple devices. Combined with the
 * matric allowlist + dispute queue, it's sufficient for a departmental
 * election.
 */

const STORAGE_KEY = 'ulsesa_device_fp'
const COOKIE_KEY = 'ulsesa_df'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

function generateFingerprint(): string {
  // crypto.randomUUID is available in all modern browsers
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}-${Math.random().toString(36).slice(2, 11)}`
}

function setCookie(name: string, value: string, maxAge: number) {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + maxAge * 1000).toUTCString()
  // HttpOnly would be ideal but we need JS access; SameSite=Lax + Secure-ish
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

let cachedFingerprint: string | null = null

/**
 * Returns the device fingerprint, creating + persisting it on first call.
 * Safe to call multiple times — returns the same value within a session.
 */
export function getDeviceFingerprint(): string {
  if (cachedFingerprint) return cachedFingerprint
  if (typeof window === 'undefined') return 'server'

  // Try localStorage first
  let fp: string | null = null
  try {
    fp = localStorage.getItem(STORAGE_KEY)
  } catch {
    // localStorage might be blocked (private mode) — fall back to cookie
  }

  // Try cookie if localStorage missed
  if (!fp) {
    fp = getCookie(COOKIE_KEY)
  }

  // Generate + persist if nothing found
  if (!fp) {
    fp = generateFingerprint()
    try {
      localStorage.setItem(STORAGE_KEY, fp)
    } catch {
      // ignore — cookie is the fallback
    }
    setCookie(COOKIE_KEY, fp, COOKIE_MAX_AGE)
  } else {
    // Backfill the missing store so both stay in sync
    try {
      if (!localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, fp)
    } catch { /* ignore */ }
    if (!getCookie(COOKIE_KEY)) setCookie(COOKIE_KEY, fp, COOKIE_MAX_AGE)
  }

  cachedFingerprint = fp
  return fp
}
