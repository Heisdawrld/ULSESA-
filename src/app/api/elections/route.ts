import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentStudent } from '@/lib/auth/server-auth'

export async function GET() {
  try {
    // Find the current election: prefer active, then upcoming, then most recent
    const elections = await db.election.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        positions: {
          orderBy: { order: 'asc' },
          include: {
            candidates: {
              orderBy: { voteCount: 'desc' },
            },
          },
        },
      },
    })

    if (!elections.length) {
      return NextResponse.json({
        election: null,
        positions: [],
        hasVoted: {},
      })
    }

    const election =
      elections.find((e) => e.status === 'active') ||
      elections.find((e) => e.status === 'upcoming') ||
      elections[0]

    // Determine which positions the current student (if any) has voted in
    const student = await getCurrentStudent()
    let hasVoted: Record<string, boolean> = {}
    if (student) {
      const votes = await db.vote.findMany({
        where: {
          studentId: student.id,
          electionId: election.id,
        },
        select: { positionId: true },
      })
      hasVoted = votes.reduce(
        (acc, v) => {
          acc[v.positionId] = true
          return acc
        },
        {} as Record<string, boolean>
      )
    }

    return NextResponse.json({
      election: {
        id: election.id,
        title: election.title,
        description: election.description,
        status: election.status,
        startDate: election.startDate,
        endDate: election.endDate,
      },
      positions: election.positions.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        order: p.order,
        candidates: p.candidates,
      })),
      hasVoted,
      isAuthenticated: !!student,
    })
  } catch (error) {
    // DB unreachable — return empty election so the frontend shows an
    // empty state instead of crashing.
    console.error('[elections] Error:', error)
    return NextResponse.json({
      election: null,
      positions: [],
      hasVoted: {},
      error: 'Database unavailable',
    })
  }
}
