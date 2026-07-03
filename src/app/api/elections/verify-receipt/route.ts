import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { normaliseReceiptCode } from '@/lib/receipt'

/**
 * POST /api/elections/verify-receipt
 *
 * Public endpoint — no auth required. Lets ANYONE verify that a receipt code
 * corresponds to a real, counted vote. Returns the position title + timestamp
 * but NEVER the candidate or the voter's identity.
 *
 * This is the transparency mechanism: after voting, a student can share their
 * code (e.g. on social media to prove turnout), and anyone can confirm it's
 * genuine — without learning who they voted for.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const raw = (body?.receiptCode ?? '').toString()
    const code = normaliseReceiptCode(raw)

    if (code.length !== 8) {
      return NextResponse.json(
        { valid: false, error: 'Receipt codes are 8 characters (e.g. ABCD-1234).' },
        { status: 400 }
      )
    }

    const vote = await db.vote.findUnique({
      where: { receiptCode: code },
      include: {
        position: { select: { title: true } },
        election: { select: { title: true } },
      },
    })

    if (!vote) {
      return NextResponse.json(
        { valid: false, error: 'No vote found with that receipt code.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      valid: true,
      electionTitle: vote.election.title,
      positionTitle: vote.position.title,
      timestamp: vote.timestamp.toISOString(),
    })
  } catch (error) {
    console.error('[elections/verify-receipt] Error:', error)
    return NextResponse.json(
      { error: 'Failed to verify receipt' },
      { status: 500 }
    )
  }
}
