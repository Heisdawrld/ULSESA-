import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth/server-auth'

// POST /api/admin/students/[id]/manual-verify
//
// Admin fallback: manually verifies a student's identity, bypassing the email
// OTP requirement. This is used when a student's email OTP fails (e.g. the
// Gmail 500/day sending cap is hit) and they need to claim their account.
//
// Sets:
//   - student.verificationStatus = 'admin_verified'
//   - student.isVerified = true
//
// Logs:
//   - VerificationLog { action: 'admin_verified', notes, adminId }
//   - AuditLog     { action: 'manual_verify', target: matricNumber, details }
//
// After this, the student can set a password via /api/auth/set-password
// WITHOUT going through OTP (see set-password route for the bypass).
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
    const notes = body?.notes ? (body.notes as string).toString().trim() : null

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

    const updated = await db.student.update({
      where: { id: studentId },
      data: {
        verificationStatus: 'admin_verified',
        isVerified: true,
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
        action: 'admin_verified',
        notes: notes ?? 'Manually verified by admin — OTP bypassed.',
      },
    })

    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'manual_verify',
        target: existing.matricNumber,
        details: `Manually verified identity (OTP bypass) for ${existing.fullName} (${existing.matricNumber})${notes ? ` — ${notes}` : ''}`,
      },
    })

    await db.activity.create({
      data: {
        studentId,
        action: 'account_verified',
        details:
          'An administrator manually verified your identity. You can now set a password without an email code.',
      },
    })

    return NextResponse.json({
      student: updated,
      message:
        'Student manually verified. They can now set a password without OTP.',
    })
  } catch (error) {
    console.error('[admin/students/manual-verify] Error:', error)
    return NextResponse.json(
      { error: 'Failed to manually verify student' },
      { status: 500 }
    )
  }
}
