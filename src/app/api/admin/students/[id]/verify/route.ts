import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth/server-auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: studentId } = await params

    const body = await request.json().catch(() => ({}))
    const action = (body?.action ?? '').toString().trim().toLowerCase()
    const notes = body?.notes ? (body.notes as string).toString().trim() : null

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      )
    }

    const existing = await db.student.findUnique({
      where: { id: studentId },
      select: { id: true, fullName: true, matricNumber: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    const approved = action === 'approve'
    const newStatus = approved ? 'approved' : 'rejected'

    const updated = await db.student.update({
      where: { id: studentId },
      data: {
        verificationStatus: newStatus,
        isVerified: approved,
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
        idDocumentUrl: true,
        updatedAt: true,
      },
    })

    await db.verificationLog.create({
      data: {
        studentId,
        adminId: admin.id,
        action: newStatus,
        notes,
      },
    })

    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: approved ? 'approve_student' : 'reject_student',
        target: existing.matricNumber,
        details: `${approved ? 'Approved' : 'Rejected'} verification for ${existing.fullName} (${existing.matricNumber})${notes ? ` — ${notes}` : ''}`,
      },
    })

    if (approved) {
      await db.activity.create({
        data: {
          studentId,
          action: 'account_verified',
          details: 'Your account has been verified by the department admin.',
        },
      })
    }

    return NextResponse.json({
      student: updated,
      message: `Student ${approved ? 'approved' : 'rejected'} successfully`,
    })
  } catch (error) {
    console.error('[admin/students/verify] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update student verification' },
      { status: 500 }
    )
  }
}
