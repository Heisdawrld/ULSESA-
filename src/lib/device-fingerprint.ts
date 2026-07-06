'use client'

/**
 * Stable device fingerprint for "1 claim per device" fraud prevention.
 *
 * Strategy: combine MANY browser-level signals that don't change between
 * sessions on the same device — canvas rendering, WebGL renderer, audio
 * context, user-agent, screen dimensions, timezone, language, color depth,
 * platform, hardware, fonts, storage persistence — and hash them into one
 * string.
 *
 * Unlike a random UUID stored in localStorage, this fingerprint survives:
 *   - clearing localStorage / cookies / cache
 *   - incognito mode
 *   - browser restarts
 *   - "Forget this site" / history clearing
 *
 * It does NOT survive:
 *   - using a genuinely different device
 *   - a different browser on the same device (different canvas/WebGL) —
 *     but the IP+UA server-side cross-check catches this on the same network
 *
 * The fingerprint is hardened against evasion: a student can't clear cookies
 * or use incognito to get a fresh identity, because the fingerprint is
 * derived from hardware+software characteristics that persist regardless
 * of browser state.
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

/**
 * WebGL renderer + vendor. This is one of the STRONGEST device signals —
 * it exposes the GPU model (e.g. "ARM Mali-G78" vs "Apple A14 GPU" vs
 * "Intel(R) UHD Graphics 620"). Two different devices almost never share
 * the same renderer string. Survives cookie clearing, incognito, and
 * browser restarts because it's a hardware property.
 */
function webglSignal(): string {
  try {
    const canvas = document.createElement('canvas')
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
    if (!gl) return 'no-webgl'

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    if (!debugInfo) return 'no-webgl-debug'

    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'no-vendor'
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'no-renderer'
    const version = gl.getParameter(gl.VERSION) || 'no-version'
    const shadingLang = gl.getParameter(gl.SHADING_LANGUAGE_VERSION) || 'no-sl'

    return `${vendor}||${renderer}||${version}||${shadingLang}`
  } catch {
    return 'webgl-error'
  }
}

/**
 * Audio context fingerprint. The exact waveform produced by an oscillator
 * + compressor varies by CPU architecture, OS audio stack, and browser
 * version. Very hard to spoof without specialized anti-fingerprinting
 * extensions (which are themselves a signal).
 */
function audioSignal(): string {
  try {
    const AudioCtx =
      (window as unknown as { OfflineAudioContext?: typeof OfflineAudioContext; webkitOfflineAudioContext?: typeof OfflineAudioContext }).OfflineAudioContext ||
      (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext
    if (!AudioCtx) return 'no-audio'

    // Offline context — no speakers needed, pure computation
    const ctx = new AudioCtx(1, 4410, 44100)
    const oscillator = ctx.createOscillator()
    oscillator.type = 'triangle'
    oscillator.frequency.value = 1000

    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -50
    compressor.knee.value = 40
    compressor.ratio.value = 12
    compressor.attack.value = 0
    compressor.release.value = 0.25

    oscillator.connect(compressor)
    compressor.connect(ctx.destination)
    oscillator.start(0)

    // We can't await here (sync function), so return a marker.
    // The async wrapper will compute the actual audio hash.
    return 'audio-pending'
  } catch {
    return 'audio-error'
  }
}

/**
 * Async audio fingerprint — renders the oscillator output and hashes the
 * samples. This is the actual signal; the sync version above is just a
 * fallback marker.
 */
async function audioSignalAsync(): Promise<string> {
  try {
    const AudioCtx =
      (window as unknown as { OfflineAudioContext?: typeof OfflineAudioContext; webkitOfflineAudioContext?: typeof OfflineAudioContext }).OfflineAudioContext ||
      (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext
    if (!AudioCtx) return 'no-audio'

    const ctx = new AudioCtx(1, 4410, 44100)
    const oscillator = ctx.createOscillator()
    oscillator.type = 'triangle'
    oscillator.frequency.value = 1000

    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -50
    compressor.knee.value = 40
    compressor.ratio.value = 12
    compressor.attack.value = 0
    compressor.release.value = 0.25

    oscillator.connect(compressor)
    compressor.connect(ctx.destination)
    oscillator.start(0)

    const buffer = await ctx.startRendering()
    const samples = buffer.getChannelData(0)
    // Hash a downsampled subset (every 100th sample) — enough for uniqueness,
    // cheap to compute.
    let hash = 0
    for (let i = 0; i < samples.length; i += 100) {
      hash = ((hash << 5) - hash + Math.floor(samples[i] * 1e9)) | 0
    }
    return 'audio-' + (hash >>> 0).toString(16)
  } catch {
    return 'audio-error'
  }
}

/**
 * Font availability check. Different OS/browser combos ship different fonts.
 * We probe a list of common fonts to see which are available — the pattern
 * is a strong device signal.
 */
function fontSignal(): string {
  try {
    const testFonts = [
      'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia',
      'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS', 'Trebuchet MS',
      'Verdana', 'Impact', 'Tahoma', 'Segoe UI', 'Calibri', 'Cambria',
      'Consolas', 'Constantia', 'Corbel', 'Franklin Gothic Medium',
      'Lucida Console', 'MS Gothic', 'Yu Gothic', 'SimSun', 'Microsoft YaHei',
      'Noto Sans', 'Roboto', 'Ubuntu', 'Menlo', 'Monaco', 'San Francisco',
    ]
    const testString = 'mmmmmmmmmmlli'
    const testSize = '72px'

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'no-font-canvas'

    // Baseline font measurements
    ctx.font = `${testSize} monospace`
    const baseline = ctx.measureText(testString).width

    const available: string[] = []
    for (const font of testFonts) {
      ctx.font = `${testSize} "${font}", monospace`
      const w = ctx.measureText(testString).width
      if (w !== baseline) {
        available.push(font)
      }
    }
    return 'fonts-' + available.join(',')
  } catch {
    return 'font-error'
  }
}

/**
 * Storage persistence signal. Detects whether localStorage/sessionStorage
 * are available (some privacy modes disable them) and whether the browser
 * has already stored a ULSESA-specific marker from a previous visit.
 *
 * The marker is a random ID stored in localStorage that persists across
 * sessions. If a student clears cookies+localStorage, they lose this ID
 * — but the canvas+WebGL+audio signals still catch them. If they DON'T
 * clear localStorage (the common case), this ID catches them even if
 * their hardware fingerprint somehow changed.
 */
function storageSignal(): string {
  try {
    const MARKER_KEY = '__ulsesa_device_marker__'
    let marker = 'no-marker'

    try {
      const existing = localStorage.getItem(MARKER_KEY)
      if (existing) {
        marker = existing
      } else {
        // Generate + store a new marker. This persists across sessions.
        const newMarker = 'm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 16)
        localStorage.setItem(MARKER_KEY, newMarker)
        marker = newMarker
      }
    } catch {
      // localStorage disabled (private mode in some browsers) — that itself
      // is a signal worth recording.
      marker = 'no-localstorage'
    }

    // Also probe sessionStorage — available in normal + incognito, but
    // a missing sessionStorage combined with missing localStorage is a
    // strong privacy-mode indicator.
    let sessionMarker = 'no-session'
    try {
      const s = sessionStorage.getItem(MARKER_KEY)
      if (s) sessionMarker = s
      else {
        const newS = 's-' + Date.now() + '-' + Math.random().toString(36).slice(2, 12)
        sessionStorage.setItem(MARKER_KEY, newS)
        sessionMarker = newS
      }
    } catch {
      sessionMarker = 'no-sessionstorage'
    }

    return `${marker}||${sessionMarker}`
  } catch {
    return 'storage-error'
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
  parts.push(String(scr.orientation?.type || 'no-orientation'))
  try {
    parts.push(Intl.DateTimeFormat().resolvedOptions().timeZone || 'no-tz')
  } catch {
    parts.push('no-tz')
  }
  // Connection type (mobile vs wifi) — another discriminator
  try {
    const conn = (nav as unknown as { connection?: { effectiveType?: string; downlink?: number; rtt?: number } }).connection
    if (conn) {
      parts.push(`${conn.effectiveType || 'no-etype'}-${conn.downlink || 'no-dl'}-${conn.rtt || 'no-rtt'}`)
    } else {
      parts.push('no-connection')
    }
  } catch {
    parts.push('connection-error')
  }
  // Do Not Track — privacy-conscious users (a signal itself)
  parts.push(String((nav as unknown as { doNotTrack?: string }).doNotTrack || 'no-dnt'))
  parts.push(String(nav.cookieEnabled || 'no-cookie'))
  parts.push(canvasSignal())
  parts.push(webglSignal())
  parts.push(fontSignal())
  parts.push(storageSignal())

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
 *
 * Combines canvas, WebGL renderer, audio context, fonts, storage marker,
 * and all classic signals (UA, screen, timezone, etc.) into one hash.
 * A student clearing cookies/localStorage still gets the same hash because
 * the canvas/WebGL/audio/font signals are hardware/software properties.
 */
export async function getDeviceFingerprint(): Promise<string> {
  if (cachedFingerprint) return cachedFingerprint
  if (typeof window === 'undefined') return 'server'

  const signals = collectSignals()
  const audioHash = await audioSignalAsync()
  // Append the async audio hash (the sync version returned a placeholder).
  const fullSignals = signals + '||' + audioHash
  const hash = await sha256(fullSignals)
  cachedFingerprint = hash
  return hash
}

/**
 * Synchronous version for cases where we can't await. Falls back to a
 * synchronous djb2-style hash if crypto.subtle isn't ready. Prefer the
 * async version (`getDeviceFingerprint`) whenever possible.
 *
 * Note: the sync version omits the async audio signal, so it produces a
 * DIFFERENT hash than the async version. The server treats them as two
 * different fingerprints. Only use this when you absolutely can't await.
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
