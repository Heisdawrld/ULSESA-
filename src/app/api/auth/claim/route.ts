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
        idDocumentUrl: true,
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

    // --- Manual-upload / admin-review state flags -------------------------
    // These let the frontend branch the claim flow:
    //   - adminVerified        → skip OTP, jump straight to set-password (step 4)
    //   - pendingManualReview  → student uploaded an ID, admin hasn't acted yet (step 5)
    //   - rejected             → admin rejected the uploaded ID (step 6)
    //   - rejectionReason      → latest rejection note (only meaningful when rejected)
    //   - idUploaded           → an ID document is on file (for re-upload UI)
    const adminVerified = student.verificationStatus === 'admin_verified'
    const idUploaded = Boolean(student.idDocumentUrl)
    const pendingManualReview =
      student.verificationStatus === 'submitted' &&
      !hasPassword &&
      idUploaded
    const rejected = student.verificationStatus === 'rejected'

    let rejectionReason: string | null = null
    if (rejected) {
      const latestRejection = await db.verificationLog.findFirst({
        where: { studentId: student.id, action: 'rejected' },
        orderBy: { timestamp: 'desc' },
        select: { notes: true, timestamp: true },
      })
      rejectionReason = latestRejection?.notes ?? null
    }

    // The idDocumentUrl is a base64 data URL and could be large (~150–400KB).
    // We deliberately do NOT return it to the unauthenticated claim endpoint —
    // only the admin (via /api/admin/verification-requests) gets to see the
    // actual image. We only expose the boolean `idUploaded` flag here.
    return NextResponse.json({
      student: {
        id: student.id,
        fullName: student.fullName,
        level: student.level,
        programme: student.programme,
        matricNumber: student.matricNumber,
        email: student.email,
        verificationStatus: student.verificationStatus,
        isVerified: student.isVerified,
        hasPassword,
      },
      // Tells the frontend to skip the OTP step entirely when an admin has
      // manually verified the student's identity (Gmail-cap fallback path).
      adminVerified,
      // Tells the frontend the student uploaded an ID and is waiting on the
      // admin — show the "pending review" screen instead of the OTP flow.
      pendingManualReview,
      // Tells the frontend the admin rejected the upload — show the rejection
      // reason and let them re-upload a clearer image.
      rejected,
      rejectionReason,
      idUploaded,
    })
  } catch (error) {
    console.error('[auth/claim] Error:', error)
    return NextResponse.json(
      { error: 'Failed to verify matric number' },
      { status: 500 }
    )
  }
}
