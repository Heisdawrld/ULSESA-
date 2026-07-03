import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const matricNumber = (body?.matricNumber ?? '').toString().trim()

    if (!matricNumber) {
      return NextResponse.json(
        { error: 'Matric number is required' },
        { status: 400 }
      )
    }

    const student = await db.student.findUnique({
      where: { matricNumber },
      select: {
        id: true,
        fullName: true,
        level: true,
        programme: true,
        matricNumber: true,
        email: true,
        verificationStatus: true,
        isVerified: true,
        // NOTE: we do NOT return the password hash, but we check if one exists
      },
    })

    if (!student) {
      return NextResponse.json(
        {
          error:
            'No student found with that matric number. Only pre-registered ULSESA members can claim an account. If you believe this is an error, contact the department office.',
        },
        { status: 404 }
      )
    }

    // Check whether the student has already claimed their account (has a password)
    const fullStudent = await db.student.findUnique({
      where: { matricNumber },
      select: { password: true },
    })
    const hasPassword = Boolean(fullStudent?.password)

    return NextResponse.json({
      student: {
        ...student,
        hasPassword,
      },
    })
  } catch (error) {
    console.error('[auth/claim] Error:', error)
    return NextResponse.json(
      { error: 'Failed to verify matric number' },
      { status: 500 }
    )
  }
}
