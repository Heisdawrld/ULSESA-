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
        phone: true,
        verificationStatus: true,
        isVerified: true,
      },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'No student found with that matric number. Please contact the department office.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ student })
  } catch (error) {
    console.error('[auth/claim] Error:', error)
    return NextResponse.json(
      { error: 'Failed to verify matric number' },
      { status: 500 }
    )
  }
}
