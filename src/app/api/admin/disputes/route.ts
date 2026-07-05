import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminFromToken } from '@/lib/auth/server-auth'

/**
 * GET /api/admin/disputes
 * Lists all disputes for the admin panel. Supports status filter.
 *
 * POST /api/admin/disputes [body: { disputeId, action: "revoke" | "dismiss", note? }]
 *  - revoke: deletes the fraudulently-claimed Student record, un-claims the
 *    allowlist entry, marks dispute as resolved_revoked. The real student can
 *    now re-claim.
 *  - dismiss: marks dispute as resolved_dismissed (admin believes the original
 *    claim was legitimate).
 */
export async function GET(request: Request) {
  try {
    const admin = await getAdminFromToken()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? 'pending'

    const where = status === 'all' ? {} : { status }

    const disputes = await db.dispute.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    // Enrich with accused student details
    const enriched = await Promise.all(
      disputes.map(async (d) => {
        let accused: {
          id: string
          fullName: string
          matricNumber: string
          deviceFingerprint: string | null
          claimIp: string | null
          createdAt: Date
          hasVoted: boolean
        } | null = null
        if (d.accusedStudentId) {
          accused = await db.student.findUnique({
            where: { id: d.accusedStudentId },
            select: {
              id: true,
              fullName: true,
              matricNumber: true,
              deviceFingerprint: true,
              claimIp: true,
              createdAt: true,
              hasVoted: true,
            },
          })
        }
        return { ...d, accused }
      })
    )

    return NextResponse.json({ disputes: enriched })
  } catch (error) {
    console.error('[admin/disputes GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch disputes' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromToken()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const disputeId = (body?.disputeId ?? '').toString().trim()
    const action = (body?.action ?? '').toString().trim() // "revoke" | "dismiss"
    const note = (body?.note ?? '').toString().trim() || null

    if (!disputeId || !['revoke', 'dismiss'].includes(action)) {
      return NextResponse.json(
        { error: 'disputeId and action (revoke|dismiss) are required' },
        { status: 400 }
      )
    }

    const dispute = await db.dispute.findUnique({
      where: { id: disputeId },
    })
    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
    }
    if (dispute.status !== 'pending') {
      return NextResponse.json(
        { error: `Dispute already ${dispute.status}` },
        { status: 400 }
      )
    }

    if (action === 'revoke') {
      // Delete the fraudulent Student record + free the allowlist entry.
      if (dispute.accusedStudentId) {
        const accused = await db.student.findUnique({
          where: { id: dispute.accusedStudentId },
          select: { id: true, matricNumber: true, hasVoted: true, fullName: true },
        })
        if (accused) {
          await db.verificationLog.create({
            data: {
              studentId: accused.id,
              action: 'rejected',
              notes: `Account revoked by admin due to dispute ${dispute.id}. Reporter: ${dispute.reporterName}. Reason: ${dispute.reason}`,
            },
          })
          await db.student.delete({ where: { id: accused.id } })
        }
        // Free the allowlist entry
        await db.matricAllowlist.updateMany({
          where: { matricNumber: dispute.matricNumber },
          data: {
            isClaimed: false,
            claimedAt: null,
            claimedByStudentId: null,
          },
        })
      }

      await db.dispute.update({
        where: { id: disputeId },
        data: {
          status: 'resolved_revoked',
          resolvedAt: new Date(),
          resolvedBy: admin.id,
          resolutionNote: note ?? 'Claim revoked — fraudulent registration.',
        },
      })

      await db.auditLog.create({
        data: {
          adminId: admin.id,
          action: 'dispute_revoke',
          target: dispute.matricNumber,
          details: `Revoked claim on ${dispute.matricNumber} (${dispute.expectedName}). Dispute filed by ${dispute.reporterName}.`,
        },
      })

      return NextResponse.json({
        success: true,
        message: `Claim revoked. The matric ${dispute.matricNumber} is now free for the legitimate student to re-claim.`,
      })
    } else {
      // dismiss
      await db.dispute.update({
        where: { id: disputeId },
        data: {
          status: 'resolved_dismissed',
          resolvedAt: new Date(),
          resolvedBy: admin.id,
          resolutionNote: note ?? 'Dispute dismissed — original claim deemed legitimate.',
        },
      })

      await db.auditLog.create({
        data: {
          adminId: admin.id,
          action: 'dispute_dismiss',
          target: dispute.matricNumber,
          details: `Dismissed dispute on ${dispute.matricNumber}. Reporter: ${dispute.reporterName}.`,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Dispute dismissed. The original claim remains valid.',
      })
    }
  } catch (error) {
    console.error('[admin/disputes POST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to resolve dispute' },
      { status: 500 }
    )
  }
}
