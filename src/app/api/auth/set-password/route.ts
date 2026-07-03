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

    // SECURITY: Verify that the OTP was successfully verified before allowing password creation.
    // This prevents anyone from setting a password without proving email ownership.
    if (!isOTPVerified(matricNumber)) {
      return NextResponse.json(
        {
          error:
            'Email verification required. Please verify your email with the code before setting a password.',
        },
        { status: 403 }
      )
    }

    const student = await db.student.findUnique({
      where: { matricNumber },
      select: {
        id: true,
        matricNumber: true,
        fullName: true,
        password: true,
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

    const passwordHash = await hashPassword(password)

    const updated = await db.student.update({
      where: { id: student.id },
      data: {
        password: passwordHash,
        verificationStatus: 'submitted', // pending admin approval
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
        action: 'submitted',
        notes: 'Student verified email via OTP and set a password. Pending admin approval.',
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
      message:
        'Account claimed successfully! Your account is now pending admin approval. You can explore the portal, but voting will be unlocked once an admin verifies you.',
    })
  } catch (error) {
    console.error('[auth/set-password] Error:', error)
    return NextResponse.json(
      { error: 'Failed to set password' },
      { status: 500 }
    )
  }
}
