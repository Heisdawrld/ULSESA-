import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/disputes
 * Student files a fraud report: "My matric was already claimed by someone else."
 *
 * Body: { matricNumber, reporterName, reporterContact?, reason }
 *
 * The allowlist gives us the expected name. We create a Dispute record with
 * status "pending" and link it to the accused student (the one who claimed
 * the matric). The admin resolves it from the admin panel.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const matricNumber = (body?.matricNumber ?? '').toString().trim()
    const reporterName = (body?.reporterName ?? '').toString().trim()
    const reporterContact = (body?.reporterContact ?? '').toString().trim() || null
    const reason = (body?.reason ?? '').toString().trim()

    if (!matricNumber || !reporterName) {
      return NextResponse.json(
        { error: 'Matric number and your name are required' },
        { status: 400 }
      )
    }

    if (reason.length < 10) {
      return NextResponse.json(
        { error: 'Please provide a brief explanation (at least 10 characters)' },
        { status: 400 }
      )
    }

    // Verify the matric is in the allowlist
    const entry = await db.matricAllowlist.findUnique({
      where: { matricNumber },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            matricNumber: true,
            deviceFingerprint: true,
            claimIp: true,
            createdAt: true,
          },
        },
      },
    })

    if (!entry) {
      return NextResponse.json(
        { error: 'This matric is not in the voter register.' },
        { status: 404 }
      )
    }

    if (!entry.isClaimed || !entry.student) {
      return NextResponse.json(
        { error: 'This matric has not been claimed yet. You can claim it directly.' },
        { status: 400 }
      )
    }

    // Rate-limit: one pending dispute per matric at a time
    const existingPending = await db.dispute.findFirst({
      where: { matricNumber, status: 'pending' },
    })
    if (existingPending) {
      return NextResponse.json({
        success: true,
        message:
          'A dispute for this matric is already under review. The electoral committee has been notified and will resolve it shortly. Thank you for your patience.',
        disputeId: existingPending.id,
      })
    }

    const dispute = await db.dispute.create({
      data: {
        matricNumber,
        expectedName: entry.fullName,
        reporterName,
        reporterContact,
        reason,
        accusedStudentId: entry.student.id,
      },
    })

    return NextResponse.json({
      success: true,
      message:
        'Dispute filed successfully. The electoral committee will review it and revoke the fraudulent claim if confirmed. Please check back in a few minutes to re-claim your matric.',
      disputeId: dispute.id,
    })
  } catch (error) {
    console.error('[disputes POST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to file dispute' },
      { status: 500 }
    )
  }
}
