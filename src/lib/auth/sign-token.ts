import jwt, { type SignOptions } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'ulse-sa-election-2026-dev'

/**
 * Sign a short-lived token for claim verification.
 * This proves the student successfully matched their name, and is required
 * by /auth/register to prevent skipping the name-verification step.
 */
export function signToken(
  payload: Record<string, unknown>,
  expiresIn: string = '10m'
): string {
  const options: SignOptions = { expiresIn: expiresIn as SignOptions['expiresIn'] }
  return jwt.sign(payload, JWT_SECRET, options)
}

export function verifyToken<T = unknown>(token: string): T | null {
  try {
    return jwt.verify(token, JWT_SECRET) as T
  } catch {
    return null
  }
}
