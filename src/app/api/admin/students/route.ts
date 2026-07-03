import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth/server-auth'

export async function GET(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // pending | submitted | approved | admin_verified | rejected
    const search = searchParams.get('search')?.trim()

    const where: {
      verificationStatus?: string
      OR?: Array<Record<string, { contains: string }>>
    } = {}

    if (
      status &&
      ['pending', 'submitted', 'approved', 'admin_verified', 'rejected'].includes(status)
    ) {
      where.verificationStatus = status
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { matricNumber: { contains: search } },
        { email: { contains: search } },
        { programme: { contains: search } },
      ]
    }

    const students = await db.student.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
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
        idDocumentUrl: true,
        createdAt: true,
        updatedAt: true,
        password: true, // fetched only to derive hasPassword; never returned
      },
    })

    // Strip the password hash and expose a derived boolean instead so the admin
    // UI can show/hide the manual-verify and reset-password buttons.
    const safeStudents = students.map(
      ({ password: _password, ...rest }) => ({
        ...rest,
        hasPassword: Boolean(_password),
      })
    )

    return NextResponse.json({ students: safeStudents })
  } catch (error) {
    console.error('[admin/students] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    )
  }
}

// POST /api/admin/students
//
// Admin creates a new pre-registered student. The student starts unclaimed
// (no password) with verificationStatus: 'pending' — they will go through the
// normal claim flow (matric → OTP → set password → admin approval), OR the
// admin can fast-track them with manual-verify.
//
// Body: { matricNumber, fullName, level, programme, email?, phone? }
// Validates:
//   - matricNumber unique (400 if already exists)
//   - fullName required
//   - level in [100, 200, 300, 400, 500]
export async function POST(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const matricNumber = (body?.matricNumber ?? '').toString().trim()
    const fullName = (body?.fullName ?? '').toString().trim()
    const level = (body?.level ?? '').toString().trim()
    const programme = (body?.programme ?? '').toString().trim()
    const email = body?.email ? (body.email as string).toString().trim() : null
    const phone = body?.phone ? (body.phone as string).toString().trim() : null

    if (!matricNumber) {
      return NextResponse.json(
        { error: 'Matric number is required' },
        { status: 400 }
      )
    }

    if (!fullName) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      )
    }

    const allowedLevels = ['100', '200', '300', '400', '500']
    if (!allowedLevels.includes(level)) {
      return NextResponse.json(
        { error: 'Level must be one of: 100, 200, 300, 400, 500' },
        { status: 400 }
      )
    }

    if (!programme) {
      return NextResponse.json(
        { error: 'Programme is required' },
        { status: 400 }
      )
    }

    // Uniqueness check — explicit so we can return a friendly 400 instead of
    // relying on Prisma's P2002 error.
    const existing = await db.student.findUnique({
      where: { matricNumber },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json(
        { error: `A student with matric number "${matricNumber}" already exists` },
        { status: 400 }
      )
    }

    const newStudent = await db.student.create({
      data: {
        matricNumber,
        fullName,
        level,
        programme,
        email: email || null,
        phone: phone || null,
        // New pre-registered students start unclaimed and unverified.
        password: null,
        isVerified: false,
        verificationStatus: 'pending',
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
        createdAt: true,
        updatedAt: true,
      },
    })

    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'create_student',
        target: matricNumber,
        details: `Created student record for ${fullName} (${matricNumber}) — ${level} level, ${programme}.`,
      },
    })

    return NextResponse.json(
      {
        student: newStudent,
        message: 'Student added successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[admin/students/create] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create student' },
      { status: 500 }
    )
  }
}
