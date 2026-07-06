import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getEffectiveStatus } from '@/lib/election-status'

export async function GET() {
  try {
    // Find the current election (active preferred, fallback to most recent)
    const elections = await db.election.findMany({
      orderBy: { createdAt: 'desc' },
    })

    if (!elections.length) {
      return NextResponse.json({
        positions: [],
        totalVotes: 0,
        totalEligible: 0,
        turnout: 0,
        election: null,
      })
    }

    const election =
      elections.find((e) => getEffectiveStatus(e) === 'active') ||
      elections.find((e) => getEffectiveStatus(e) === 'ended') ||
      elections.find((e) => getEffectiveStatus(e) === 'upcoming') ||
      elections[0]

    const effectiveStatus = getEffectiveStatus(election)

    const positions = await db.position.findMany({
      where: { electionId: election.id },
      orderBy: { order: 'asc' },
      include: {
        candidates: {
          orderBy: { voteCount: 'desc' },
        },
        _count: { select: { votes: true } },
      },
    })

    const totalVotes = await db.vote.count({
      where: { electionId: election.id },
    })

    const totalEligible = await db.student.count({
      where: { isVerified: true },
    })

    const turnout =
      totalEligible > 0
        ? Number(((totalVotes / totalEligible) * 100).toFixed(2))
        : 0

    return NextResponse.json({
      election: {
        id: election.id,
        title: election.title,
        status: effectiveStatus,
        manualOverride: election.manualOverride,
        startDate: election.startDate,
        endDate: election.endDate,
      },
      positions: positions.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        order: p.order,
        totalVotes: p._count.votes,
        candidates: p.candidates.map((c) => ({
          id: c.id,
          name: c.name,
          manifesto: c.manifesto,
          photoUrl: c.photoUrl,
          level: c.level,
          programme: c.programme,
          bio: c.bio,
          voteCount: c.voteCount,
        })),
      })),
      totalVotes,
      totalEligible,
      turnout,
    })
  } catch (error) {
    console.error('[elections/results] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch election results' },
      { status: 500 }
    )
  }
}
