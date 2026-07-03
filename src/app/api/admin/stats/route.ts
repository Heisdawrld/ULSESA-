import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth/server-auth'

export async function GET() {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const [totalStudents, verifiedStudents, votesCast, latestElection] =
      await Promise.all([
        db.student.count(),
        db.student.count({ where: { isVerified: true } }),
        db.vote.count(),
        db.election.findFirst({ orderBy: { createdAt: 'desc' } }),
      ])

    const turnout =
      verifiedStudents > 0
        ? Number(((votesCast / verifiedStudents) * 100).toFixed(2))
        : 0

    const electionStatus = latestElection?.status ?? 'No election configured'

    return NextResponse.json({
      stats: {
        totalStudents,
        verifiedStudents,
        eligibleVoters: verifiedStudents,
        votesCast,
        turnout,
        systemHealth: '99.9%',
        electionStatus,
        electionTitle: latestElection?.title ?? null,
      },
    })
  } catch (error) {
    console.error('[admin/stats] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    )
  }
}
