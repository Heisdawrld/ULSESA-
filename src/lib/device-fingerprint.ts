'use client'

/**
 * Stable device fingerprint for "max 2 claims per device" fraud prevention.
 *
 * Strategy: combine browser-level signals that don't change between sessions
 * on the same device — canvas rendering, user-agent, screen dimensions,
 * timezone, language, color depth, platform — and hash them into one string.
 *
 * Unlike a random UUID stored in localStorage, this fingerprint survives:
 *   - clearing localStorage / cookies
 *   - incognito mode
 *   - browser restarts
 *
 * It does NOT survive:
 *   - using a different browser on the same device (different canvas)
 *   - using a different device entirely
 *
 * That's the right tradeoff: a determined fraudster can still use a second
 * browser/device, but the casual "let me claim 5 matrics from my laptop"
 * attack is stopped. The server hashes this fingerprint with a salt before
 * storing, so the raw value never persists — only the hash.
 *
 * Privacy note: this is computed client-side and sent over HTTPS to the
 * server, which hashes + salts it. The raw fingerprint is not persisted.
 */

let cachedFingerprint: string | null = null

/**
 * Render a canvas with a mix of text + shapes + colors. The exact pixel
 * output varies by OS, GPU, font rendering engine, and browser version —
 * making it a strong device-correlation signal.
 */
function canvasSignal(): string {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 240
    canvas.height = 60
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'no-canvas'

    // Text rendering — picks up font + antialiasing differences
    ctx.textBaseline = 'top'
    ctx.font = "16px 'Arial'"
    ctx.fillStyle = '#f60'
    ctx.fillRect(125, 1, 62, 20)

    ctx.fillStyle = '#069'
    ctx.fillText('ULSESA · 2026 · 🔬', 2, 15)

    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
    ctx.fillText('device-check', 4, 40)

    // Circle + bezier — picks up GPU rendering differences
    ctx.beginPath()
    ctx.arc(50, 30, 20, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(29, 78, 216, 0.4)'
    ctx.fill()

    return canvas.toDataURL()
  } catch {
    return 'canvas-error'
  }
}

function collectSignals(): string {
  const nav = navigator
  const scr = screen

  const parts: string[] = []
  // Order matters — same order every time.
  parts.push(nav.userAgent || 'no-ua')
  parts.push(nav.language || 'no-lang')
  parts.push((nav.languages || []).join(','))
  parts.push(nav.platform || 'no-platform')
  parts.push(String(nav.hardwareConcurrency || 'no-cores'))
  parts.push(String(nav.deviceMemory || 'no-mem'))
  parts.push(String(nav.maxTouchPoints || 0))
  parts.push(String(scr.width) + 'x' + String(scr.height))
  parts.push(String(scr.colorDepth) + '-bit')
  parts.push(String(scr.availWidth) + 'x' + String(scr.availHeight))
  try {
    parts.push(Intl.DateTimeFormat().resolvedOptions().timeZone || 'no-tz')
  } catch {
    parts.push('no-tz')
  }
  parts.push(canvasSignal())

  return parts.join('||')
}

/**
 * SHA-256 hash a string using the Web Crypto API. Returns hex.
 * Available in all modern browsers (secure contexts + service workers).
 */
async function sha256(input: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // Fallback: simple non-crypto hash (djb2). Not ideal but better than
    // sending raw signals. Only used in ancient browsers.
    let h = 5381
    for (let i = 0; i < input.length; i++) {
      h = ((h << 5) + h) ^ input.charCodeAt(i)
    }
    return 'fallback-' + (h >>> 0).toString(16)
  }
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  const bytes = new Uint8Array(buf)
  let hex = ''
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, '0')
  }
  return hex
}

/**
 * Returns the device fingerprint hash. Computed once, cached for the session.
 * Safe to call multiple times. Returns 'server' on SSR.
 */
export async function getDeviceFingerprint(): Promise<string> {
  if (cachedFingerprint) return cachedFingerprint
  if (typeof window === 'undefined') return 'server'

  const signals = collectSignals()
  const hash = await sha256(signals)
  cachedFingerprint = hash
  return hash
}

/**
 * Synchronous version for cases where we can't await. Falls back to a
 * synchronous djb2-style hash if crypto.subtle isn't ready. Prefer the
 * async version (`getDeviceFingerprint`) whenever possible.
 */
export function getDeviceFingerprintSync(): string {
  if (cachedFingerprint) return cachedFingerprint
  if (typeof window === 'undefined') return 'server'

  const signals = collectSignals()
  // Sync djb2 fallback — less collision-resistant than SHA-256 but works
  // without async. The server re-hashes with its salt either way.
  let h = 5381
  for (let i = 0; i < signals.length; i++) {
    h = ((h << 5) + h) ^ signals.charCodeAt(i)
  }
  const hash = 'sync-' + (h >>> 0).toString(16).padStart(8, '0')
  cachedFingerprint = hash
  return hash
}
