import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentStudent } from '@/lib/auth/server-auth'
import { syncElectionStatus } from '@/lib/election-status'

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

    // ── Auto-pilot sync ────────────────────────────────────────────────
    // Derive the effective status from the clock (unless admin has set a
    // manualOverride). Sync the stored `status` column to match so the
    // admin panel + audit trail reflect the live state. This is the
    // "Jarvis" heart — every page load reconciles the election with time.
    const effectiveStatus = await syncElectionStatus(election)

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
        status: effectiveStatus,
        // Expose scheduling metadata so the frontend can show countdowns
        // and the AUTO/MANUAL badge without an extra round-trip.
        storedStatus: election.status,
        manualOverride: election.manualOverride,
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
