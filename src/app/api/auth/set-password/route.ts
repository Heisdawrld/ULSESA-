import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import {
  hashPassword,
  signStudentToken,
} from '@/lib/auth/server-auth'
import { clearOTP } from '@/lib/otp-store'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const matricNumber = (body?.matricNumber ?? '').toString().trim()
    const password = (body?.password ?? '').toString()
    const idDocumentUrl = body?.idDocumentUrl
      ? (body.idDocumentUrl as string).toString().trim()
      : null

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
      select: { id: true, matricNumber: true, fullName: true },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'No student found with that matric number' },
        { status: 404 }
      )
    }

    const passwordHash = await hashPassword(password)

    const updated = await db.student.update({
      where: { id: student.id },
      data: {
        password: passwordHash,
        verificationStatus: 'submitted',
        idDocumentUrl: idDocumentUrl ?? undefined,
      },
      select: {
        id: true,
        matricNumber: true,
        fullName: true,
        level: true,
        programme: true,
        email: true,
        phone: true,
        isVerified: true,
        verificationStatus: true,
        hasVoted: true,
      },
    })

    await db.verificationLog.create({
      data: {
        studentId: student.id,
        action: 'submitted',
        notes: 'Student submitted verification documents and set password.',
      },
    })

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

    return NextResponse.json({ student: updated, token })
  } catch (error) {
    console.error('[auth/set-password] Error:', error)
    return NextResponse.json(
      { error: 'Failed to set password' },
      { status: 500 }
    )
  }
}
