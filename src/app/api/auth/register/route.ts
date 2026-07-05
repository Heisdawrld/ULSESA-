import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import {
  hashPassword,
  signStudentToken,
} from '@/lib/auth/server-auth'
import { verifyToken } from '@/lib/auth/sign-token'
import {
  checkClaimLimit,
  getClientIp,
  formatRetryAfter,
} from '@/lib/rate-limiter'

/**
 * SECURE allowlist-based registration.
 *
 * Body: { matricNumber, password, verificationToken, deviceFingerprint, email?, phone? }
 *
 * Flow:
 *  1. Verify the verificationToken (issued by /auth/claim after name match)
 *     — this proves the student typed the correct name. Without it, anyone
 *       could register by just knowing a matric.
 *  2. Validate matric is in allowlist AND unclaimed
 *  3. Validate device fingerprint hasn't already claimed another matric
 *  4. Rate limit: max 3 claims per IP per day
 *  5. Create Student record (auto-verified)
 *  6. Mark allowlist entry as claimed
 *  7. Set auth cookie + return token
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const matricNumber = (body?.matricNumber ?? '').toString().trim()
    const password = (body?.password ?? '').toString()
    const verificationToken = (body?.verificationToken ?? '').toString().trim()
    const deviceFingerprint = (body?.deviceFingerprint ?? '').toString().trim()
    const email = (body?.email ?? '').toString().trim() || null
    const phone = (body?.phone ?? '').toString().trim() || null
    const ip = getClientIp(request)

    if (!matricNumber || !password) {
      return NextResponse.json(
        { error: 'Matric number and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    if (!deviceFingerprint) {
      return NextResponse.json(
        { error: 'Device verification failed. Please refresh the page and try again.' },
        { status: 400 }
      )
    }

    // ── 1. Verify the claim verification token ────────────────────────────
    // This token was issued by /auth/claim ONLY after the student typed
    // their name correctly. Rejecting requests without it prevents someone
    // from skipping name verification and registering with just a matric.
    if (!verificationToken) {
      return NextResponse.json(
        {
          error:
            'Name verification required. Please go back to step 1 and verify your matric number and name before setting a password.',
        },
        { status: 400 }
      )
    }

    const payload = verifyToken<{ matricNumber: string; type: string }>(
      verificationToken
    )
    if (!payload || payload.type !== 'claim-verification') {
      return NextResponse.json(
        {
          error:
            'Your verification session has expired. Please go back to step 1 and re-verify your matric number and name.',
        },
        { status: 401 }
      )
    }
    if (payload.matricNumber !== matricNumber) {
      return NextResponse.json(
        { error: 'Verification mismatch. Please start again from step 1.' },
        { status: 400 }
      )
    }

    // ── 2. Check the allowlist ────────────────────────────────────────────
    const entry = await db.matricAllowlist.findUnique({
      where: { matricNumber },
    })

    if (!entry) {
      return NextResponse.json(
        {
          error:
            'This matric number is not in the ULSESA voter register. Contact your class rep or the electoral committee.',
        },
        { status: 404 }
      )
    }

    if (entry.isClaimed) {
      return NextResponse.json(
        {
          error:
            'This matric has already been claimed. If this is your matric and you did not claim it, use the "Report a problem" option to file a dispute.',
          alreadyClaimed: true,
        },
        { status: 409 }
      )
    }

    // ── 3. Device fingerprint check ───────────────────────────────────────
    const existingClaim = await db.student.findFirst({
      where: { deviceFingerprint },
      select: { id: true, matricNumber: true },
    })

    if (existingClaim) {
      return NextResponse.json(
        {
          error:
            'This device has already been used to claim an account. ULSESA enforces one account per device to prevent fraud. If you need to claim a different matric, use a different device, or contact the electoral committee if you believe this is an error.',
          deviceBlocked: true,
        },
        { status: 409 }
      )
    }

    // ── 4. Rate limit: max claims per IP per day ──────────────────────────
    const claimLimit = checkClaimLimit(ip)
    if (!claimLimit.allowed) {
      return NextResponse.json(
        {
          error: `You've reached the maximum number of account claims from this device. If you need help, contact the electoral committee. Try again in ${formatRetryAfter(
            claimLimit.retryAfterMs
          )}.`,
        },
        { status: 429 }
      )
    }

    // ── 5. Create the Student record ──────────────────────────────────────
    const passwordHash = await hashPassword(password)
    const student = await db.student.create({
      data: {
        matricNumber: entry.matricNumber,
        fullName: entry.fullName,
        level: entry.level,
        programme: entry.programme,
        email,
        phone,
        password: passwordHash,
        isVerified: true,
        verificationStatus: 'approved',
        deviceFingerprint,
        claimIp: ip,
      },
    })

    // ── 6. Mark the allowlist entry as claimed ────────────────────────────
    await db.matricAllowlist.update({
      where: { id: entry.id },
      data: {
        isClaimed: true,
        claimedAt: new Date(),
        claimedByStudentId: student.id,
      },
    })

    // ── 7. Audit log ──────────────────────────────────────────────────────
    await db.verificationLog.create({
      data: {
        studentId: student.id,
        action: 'approved',
        notes: `Self-registered via allowlist. Name verified. Device: ${deviceFingerprint.slice(0, 8)}…, IP: ${ip}`,
      },
    })

    await db.activity.create({
      data: {
        studentId: student.id,
        action: 'account_claimed',
        details: 'Account claimed via matric allowlist self-registration (name-verified)',
      },
    })

    // ── 8. Issue token + cookie ───────────────────────────────────────────
    const token = signStudentToken({
      studentId: student.id,
      matricNumber: student.matricNumber,
      type: 'student',
    })

    const cookieStore = await cookies()
    cookieStore.set('ddp-student-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    })

    return NextResponse.json({
      student: {
        id: student.id,
        matricNumber: student.matricNumber,
        fullName: student.fullName,
        level: student.level,
        programme: student.programme,
        email: student.email,
        isVerified: student.isVerified,
        verificationStatus: student.verificationStatus,
        hasVoted: student.hasVoted,
      },
      token,
      message: 'Account claimed successfully! You are now verified and can vote in the ULSESA election.',
    })
  } catch (error) {
    console.error('[auth/register] Error:', error)
    return NextResponse.json(
      { error: 'Failed to register account' },
      { status: 500 }
    )
  }
}
