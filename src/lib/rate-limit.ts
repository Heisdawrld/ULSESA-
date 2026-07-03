/**
 * Simple in-memory rate limiter for single-server deployments.
 *
 * For a multi-server setup, swap this for Redis. For ULSESA's scale
 * (~2000 students, single Render instance), in-memory is sufficient.
 *
 * Strategy: token bucket per key. Each key gets max `maxRequests` calls
 * per `windowMs`. After that, calls return `false` (rate limited) until
 * the window resets.
 */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

// Periodically prune expired buckets to prevent memory leaks.
// In Node, setInterval persists across requests.
if (typeof globalThis !== 'undefined') {
  const g = globalThis as unknown as { __ulsesaPruneInterval?: NodeJS.Timeout }
  if (!g.__ulsesaPruneInterval) {
    g.__ulsesaPruneInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, bucket] of buckets) {
        if (now > bucket.resetAt) {
          buckets.delete(key)
        }
      }
    }, 5 * 60 * 1000) // prune every 5 minutes
    // Allow the process to exit even if the interval is alive.
    g.__ulsesaPruneInterval.unref?.()
  }
}

export interface RateLimitOptions {
  /** Unique identifier for the bucket (e.g., `otp:${matric}` or `otp:${ip}`). */
  key: string
  /** Max number of requests allowed in the window. */
  maxRequests: number
  /** Window size in milliseconds. */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * Check whether a request should be allowed. Increments the counter
 * if allowed. Call this once per incoming request.
 */
export function rateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const existing = buckets.get(opts.key)

  // No bucket yet, or expired — start fresh.
  if (!existing || now > existing.resetAt) {
    const resetAt = now + opts.windowMs
    buckets.set(opts.key, { count: 1, resetAt })
    return { allowed: true, remaining: opts.maxRequests - 1, resetAt }
  }

  // Bucket exists and is active.
  if (existing.count >= opts.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count += 1
  return {
    allowed: true,
    remaining: opts.maxRequests - existing.count,
    resetAt: existing.resetAt,
  }
}

/**
 * Get client IP from a Next.js Request. Handles Render's proxy headers.
 */
export function getClientIP(request: Request): string {
  const headers = request.headers
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    'unknown'
  )
}
