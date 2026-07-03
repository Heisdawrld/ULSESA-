import { db } from '@/lib/db'

/**
 * Character set for receipt codes.
 * - Ambiguous characters (0/O, 1/I/L) are excluded so codes are easy to
 *   read and type.
 * - Uppercase only, to keep entry case-insensitive.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 8

function randomCode(): string {
  let code = ''
  const max = ALPHABET.length
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[Math.floor(Math.random() * max)]
  }
  return code
}

/**
 * Generate a unique 8-char receipt code, retrying on the (extremely rare)
 * collision. The code is formatted as XXXX-XXXX for readability in the UI,
 * but stored WITHOUT the dash for easier lookup & indexing.
 *
 * With 31^8 ≈ 8.5 billion possible codes and a few thousand votes at most,
 * collisions are astronomically unlikely — but we still check to honour the
 * @unique constraint cleanly.
 */
export async function generateReceiptCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode()
    const exists = await db.vote.findUnique({
      where: { receiptCode: code },
      select: { id: true },
    })
    if (!exists) return code
  }
  // After 8 retries we genuinely cannot generate a unique code — give up
  // loudly rather than risk a constraint violation.
  throw new Error('Failed to generate a unique receipt code after 8 attempts')
}

/**
 * Format a stored 8-char code as "XXXX-XXXX" for display.
 */
export function formatReceiptCode(code: string): string {
  const clean = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  if (clean.length !== CODE_LENGTH) return code
  return `${clean.slice(0, 4)}-${clean.slice(4)}`
}

/**
 * Normalise a user-entered receipt code (strip dashes/spaces, uppercase) so
 * it can be looked up against the stored value.
 */
export function normaliseReceiptCode(input: string): string {
  return input.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
}
