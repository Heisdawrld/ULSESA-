import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth/server-auth'

// POST /api/admin/students/[id]/reset-password
//
// Admin reset: clears a student's password (e.g. when they forget it) and
// marks them as admin_verified so they can claim their account again and set
// a new password WITHOUT going through OTP. This is the same fallback path
// as manual-verify, but additionally clears the existing password hash.
//
// Sets:
//   - student.password = null
//   - student.verificationStatus = 'admin_verified'
//   - student.isVerified = true
//
// Logs:
//   - VerificationLog { action: 'password_reset', notes, adminId }
//   - AuditLog     { action: 'reset_password', target: matricNumber, details }
//
// After this, the student re-enters the claim flow on /auth (matric → set
// password) and set-password will let them through via the admin_verified
// bypass.
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
        password: null,
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
        // NOTE: password intentionally excluded — never return the hash.
      },
    })

    await db.verificationLog.create({
      data: {
        studentId,
        adminId: admin.id,
        action: 'password_reset',
        notes: notes ?? 'Password reset by admin — student can re-claim.',
      },
    })

    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'reset_password',
        target: existing.matricNumber,
        details: `Reset password for ${existing.fullName} (${existing.matricNumber})${notes ? ` — ${notes}` : ''}`,
      },
    })

    return NextResponse.json({
      student: updated,
      message:
        'Password reset. Student can now claim their account again and set a new password.',
    })
  } catch (error) {
    console.error('[admin/students/reset-password] Error:', error)
    return NextResponse.json(
      { error: 'Failed to reset student password' },
      { status: 500 }
    )
  }
}
