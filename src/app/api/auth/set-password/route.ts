import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import {
  hashPassword,
  signStudentToken,
} from '@/lib/auth/server-auth'
import { isOTPVerified, clearOTP } from '@/lib/otp-store'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const matricNumber = (body?.matricNumber ?? '').toString().trim()
    const password = (body?.password ?? '').toString()

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

    const student = await db.student.findUnique({
      where: { matricNumber },
      select: {
        id: true,
        matricNumber: true,
        fullName: true,
        password: true,
        verificationStatus: true,
      },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'No student found with that matric number' },
        { status: 404 }
      )
    }

    // SECURITY: Prevent re-claiming an account that already has a password
    if (student.password) {
      return NextResponse.json(
        {
          error:
            'This account has already been claimed. Please sign in instead.',
          alreadyClaimed: true,
        },
        { status: 400 }
      )
    }

    // SECURITY: Require proof of identity before allowing password creation.
    // Two valid proof paths:
    //   1. OTP verified — student proved email ownership (normal flow).
    //   2. Admin manually verified — admin confirmed identity offline
    //      (fallback when email delivery fails, e.g. Gmail 500/day cap).
    const otpVerified = isOTPVerified(matricNumber)
    const adminVerified = student.verificationStatus === 'admin_verified'

    if (!otpVerified && !adminVerified) {
      return NextResponse.json(
        {
          error:
            'Email verification required. Please verify your email with the code before setting a password.',
        },
        { status: 403 }
      )
    }

    const passwordHash = await hashPassword(password)

    // If admin already verified identity, the student is fully approved once
    // they set a password. If they came through OTP, they stay in 'submitted'
    // pending admin approval (matches the pre-existing behaviour).
    const newStatus = adminVerified ? 'approved' : 'submitted'

    const updated = await db.student.update({
      where: { id: student.id },
      data: {
        password: passwordHash,
        verificationStatus: newStatus,
        ...(adminVerified ? { isVerified: true } : {}),
      },
      select: {
        id: true,
        matricNumber: true,
        fullName: true,
        level: true,
        programme: true,
        email: true,
        isVerified: true,
        verificationStatus: true,
        hasVoted: true,
      },
    })

    await db.verificationLog.create({
      data: {
        studentId: student.id,
        action: newStatus,
        notes: adminVerified
          ? 'Admin had manually verified identity. Student set a password; account is now fully approved.'
          : 'Student verified email via OTP and set a password. Pending admin approval.',
      },
    })

    // Clear the OTP entry now that the password is set
    clearOTP(matricNumber)

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
      student: updated,
      token,
      message: adminVerified
        ? 'Account claimed successfully! Your identity was verified by an admin and you can now use all portal features, including voting.'
        : 'Account claimed successfully! Your account is now pending admin approval. You can explore the portal, but voting will be unlocked once an admin verifies you.',
    })
  } catch (error) {
    console.error('[auth/set-password] Error:', error)
    return NextResponse.json(
      { error: 'Failed to set password' },
      { status: 500 }
    )
  }
}
