import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import {
  verifyPassword,
  signStudentToken,
} from '@/lib/auth/server-auth'

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

    const student = await db.student.findUnique({
      where: { matricNumber },
    })

    if (!student || !student.password) {
      return NextResponse.json(
        { error: 'Invalid matric number or password. If you haven\'t claimed your account yet, tap "Claim Account".' },
        { status: 401 }
      )
    }

    const ok = await verifyPassword(password, student.password)
    if (!ok) {
      return NextResponse.json(
        { error: 'Invalid matric number or password' },
        { status: 401 }
      )
    }

    // Block login for rejected accounts
    if (student.verificationStatus === 'rejected') {
      return NextResponse.json(
        {
          error:
            'Your account verification was rejected. Please contact ULSESA support on WhatsApp for assistance.',
          verificationStatus: student.verificationStatus,
        },
        { status: 403 }
      )
    }

    // NOTE: We allow login for both 'submitted' (pending approval) and 'approved' students.
    // Students with status='submitted' can explore the portal but cannot vote —
    // the vote API independently checks isVerified before allowing a vote.
    // This way, pending students can see their dashboard and know their status,
    // rather than being locked out entirely.

    const safeStudent = {
      id: student.id,
      matricNumber: student.matricNumber,
      fullName: student.fullName,
      level: student.level,
      programme: student.programme,
      email: student.email,
      phone: student.phone,
      isVerified: student.isVerified,
      verificationStatus: student.verificationStatus,
      hasVoted: student.hasVoted,
    }

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
      student: safeStudent,
      token,
      // Include a notice for pending students so the frontend can show it
      ...(student.verificationStatus === 'submitted'
        ? {
            notice:
              'Your account is pending admin approval. You can explore the portal, but voting will unlock once an admin verifies you.',
          }
        : {}),
    })
  } catch (error) {
    console.error('[auth/login] Error:', error)
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    )
  }
}
