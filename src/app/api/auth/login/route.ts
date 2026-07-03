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
        { error: 'Invalid matric number or password' },
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

    if (!student.isVerified) {
      return NextResponse.json(
        {
          error: 'Account not yet verified',
          verificationStatus: student.verificationStatus,
        },
        { status: 403 }
      )
    }

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

    return NextResponse.json({ student: safeStudent, token })
  } catch (error) {
    console.error('[auth/login] Error:', error)
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    )
  }
}
