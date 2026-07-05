import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminFromToken, hashPassword } from '@/lib/auth/server-auth'
import { generatePlainPassword } from '@/lib/password-generator'

/**
 * POST /api/admin/allowlist/[matric]/rotate-password
 *
 * Body: { action?: "rotate" | "reset" }  (default: "rotate")
 *
 * Two modes:
 *
 * 1. "rotate" (default) — generates a random one-time password, hashes it,
 *    stores it on the allowlist entry (overriding the rule-based hash), and
 *    returns the PLAINTEXT password exactly once. The admin must send it to
 *    the legitimate student immediately (e.g. via WhatsApp) — it is never
 *    retrievable again.
 *
 *    Use case: a student reports their account was claimed by an imposter.
 *    After revoking the fraudulent Student row, the admin rotates the password
 *    so the imposter (who knows the rule-based password from the public
 *    attendance list) can no longer log back in. The real student logs in
 *    with the new custom password.
 *
 * 2. "reset" — restores the rule-based password hash
 *    (matricNumber + last4(lowercase(surname))). Returns the plaintext of the
 *    restored rule-based password for confirmation. Use this to undo a custom
 *    rotation once the situation is resolved and you want the student back on
 *    the standard scheme.
 *
 * Sets `MatricAllowlist.passwordRotatedAt` in both cases (now() for rotate,
 * null for reset) so the admin UI can show a "custom password" badge.
 *
 * Audit logged as `rotate_password` / `reset_password_to_rule`.
 */
const SAFE_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789' // no 0, o, 1, l

function generateRandomPassword(length = 8): string {
  const bytes = new Uint8Array(length)
  // crypto.webcrypto is available in the Node.js runtime (and edge).
  crypto.getRandomValues(bytes)
  const chars: string[] = []
  for (let i = 0; i < length; i++) {
    chars.push(SAFE_ALPHABET[bytes[i] % SAFE_ALPHABET.length])
  }
  // Format as xxxx-xxxx for readability over WhatsApp / phone.
  return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matric: string }> }
) {
  try {
    const admin = await getAdminFromToken()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { matric: matricParam } = await params
    const matricNumber = matricParam.trim()

    if (!matricNumber) {
      return NextResponse.json(
        { error: 'Matric number is required' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const action =
      body?.action === 'reset' ? 'reset' : 'rotate'
    const note = body?.note
      ? (body.note as string).toString().trim().slice(0, 280)
      : null

    const entry = await db.matricAllowlist.findUnique({
      where: { matricNumber },
      select: {
        id: true,
        matricNumber: true,
        fullName: true,
        programme: true,
        level: true,
        passwordHash: true,
        passwordRotatedAt: true,
        isClaimed: true,
      },
    })

    if (!entry) {
      return NextResponse.json(
        { error: `Matric ${matricNumber} is not in the voter register.` },
        { status: 404 }
      )
    }

    // ── RESET → restore the rule-based password ─────────────────────────
    if (action === 'reset') {
      const plainRule = generatePlainPassword(entry.matricNumber, entry.fullName)
      const hash = await hashPassword(plainRule)

      await db.matricAllowlist.update({
        where: { id: entry.id },
        data: {
          passwordHash: hash,
          passwordRotatedAt: null,
        },
      })

      await db.auditLog.create({
        data: {
          adminId: admin.id,
          action: 'reset_password_to_rule',
          target: matricNumber,
          details: `Restored rule-based password for ${entry.fullName} (${matricNumber}).${note ? ` Note: ${note}` : ''}`,
        },
      })

      return NextResponse.json({
        success: true,
        action: 'reset',
        message:
          'Password restored to the rule-based scheme (matric + last 4 letters of surname). The previous custom password no longer works.',
        // Return the rule-based plaintext for the admin's confirmation only.
        ruleBasedPassword: plainRule,
      })
    }

    // ── ROTATE → set a random custom password ───────────────────────────
    const plainPassword = generateRandomPassword(8)
    const hash = await hashPassword(plainPassword)

    await db.matricAllowlist.update({
      where: { id: entry.id },
      data: {
        passwordHash: hash,
        passwordRotatedAt: new Date(),
      },
    })

    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'rotate_password',
        target: matricNumber,
        details: `Generated a custom one-time password for ${entry.fullName} (${matricNumber}).${note ? ` Note: ${note}` : ''}${entry.isClaimed ? ' Account was already claimed.' : ''}`,
      },
    })

    return NextResponse.json({
      success: true,
      action: 'rotate',
      message:
        'Custom password generated. Send it to the student now — it will not be shown again.',
      // PLAINTEXT returned exactly once. The admin must copy it immediately.
      password: plainPassword,
      matricNumber: entry.matricNumber,
      fullName: entry.fullName,
      rotatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[admin/allowlist/rotate-password] Error:', error)
    return NextResponse.json(
      { error: 'Failed to rotate password' },
      { status: 500 }
    )
  }
}
