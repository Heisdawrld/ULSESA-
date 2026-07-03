import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentStudent } from '@/lib/auth/server-auth'

/**
 * GET /api/elections/my-receipts
 *
 * Returns the calling student's own vote receipts for the current election.
 * Each receipt includes the 8-char code (formatted XXXX-XXXX), the position
 * title, and the timestamp — but NEVER the candidate they voted for.
 *
 * This lets a student confirm "my vote was recorded" while keeping the
 * ballot itself anonymous (consistent with the election's anonymity promise).
 */
export async function GET() {
  try {
    const student = await getCurrentStudent()
    if (!student) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      )
    }

    // Find the current election (active > upcoming > latest)
    const election = await db.election.findFirst({
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    })
    if (!election) {
      return NextResponse.json({ receipts: [] })
    }

    const votes = await db.vote.findMany({
      where: {
        studentId: student.id,
        electionId: election.id,
      },
      include: {
        position: { select: { title: true } },
      },
      orderBy: { timestamp: 'asc' },
    })

    const receipts = votes.map((v) => ({
      receiptCode: v.receiptCode,
      positionTitle: v.position.title,
      timestamp: v.timestamp.toISOString(),
    }))

    return NextResponse.json({
      electionTitle: election.title,
      receipts,
    })
  } catch (error) {
    console.error('[elections/my-receipts] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch receipts' },
      { status: 500 }
    )
  }
}
