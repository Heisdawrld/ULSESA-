import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import {
  hashPassword,
  signStudentToken,
} from '@/lib/auth/server-auth'

/**
 * NEW allowlist-based registration (replaces the old OTP + set-password flow).
 *
 * Body: { matricNumber, password, deviceFingerprint, email?, phone? }
 *
 * Flow:
 *  1. Validate matric is in allowlist AND unclaimed
 *  2. Validate device fingerprint hasn't already claimed another matric
 *  3. Create Student record (auto-verified — the allowlist IS the identity proof)
 *  4. Mark allowlist entry as claimed by this student
 *  5. Set auth cookie + return token
 *
 * No email OTP. No ID upload. No admin approval gate. The matric allowlist +
 * name confirmation + device fingerprint + dispute queue is the fraud defence.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const matricNumber = (body?.matricNumber ?? '').toString().trim()
    const password = (body?.password ?? '').toString()
    const deviceFingerprint = (body?.deviceFingerprint ?? '').toString().trim()
    const email = (body?.email ?? '').toString().trim() || null
    const phone = (body?.phone ?? '').toString().trim() || null

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

    // 1. Check the allowlist
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

    // 2. Device fingerprint check — prevent one device from claiming multiple matrics
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

    // 3. Extract client IP for audit (best-effort)
    const forwarded = request.headers.get('x-forwarded-for')
    const claimIp = forwarded ? forwarded.split(',')[0].trim() : null

    // 4. Create the Student record — auto-verified (allowlist = identity proof)
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
        claimIp,
      },
    })

    // 5. Mark the allowlist entry as claimed
    await db.matricAllowlist.update({
      where: { id: entry.id },
      data: {
        isClaimed: true,
        claimedAt: new Date(),
        claimedByStudentId: student.id,
      },
    })

    // 6. Audit log
    await db.verificationLog.create({
      data: {
        studentId: student.id,
        action: 'approved',
        notes: `Self-registered via allowlist. Device: ${deviceFingerprint.slice(0, 8)}…, IP: ${claimIp ?? 'unknown'}`,
      },
    })

    await db.activity.create({
      data: {
        studentId: student.id,
        action: 'account_claimed',
        details: 'Account claimed via matric allowlist self-registration',
      },
    })

    // 7. Issue token + cookie
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
