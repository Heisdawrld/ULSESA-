import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentStudent } from '@/lib/auth/server-auth'
import { generateReceiptCode } from '@/lib/receipt'
import { getEffectiveStatus } from '@/lib/election-status'

export async function POST(request: Request) {
  try {
    const student = await getCurrentStudent()
    if (!student) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to vote.' },
        { status: 401 }
      )
    }

    if (!student.isVerified) {
      return NextResponse.json(
        {
          error: 'Your account must be verified before you can vote.',
          verificationStatus: student.verificationStatus,
        },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const candidateId = (body?.candidateId ?? '').toString().trim()
    const positionId = (body?.positionId ?? '').toString().trim()

    if (!candidateId || !positionId) {
      return NextResponse.json(
        { error: 'candidateId and positionId are required' },
        { status: 400 }
      )
    }

    // Validate candidate belongs to position
    const candidate = await db.candidate.findUnique({
      where: { id: candidateId },
      include: { position: { include: { election: true } } },
    })

    if (!candidate || candidate.positionId !== positionId) {
      return NextResponse.json(
        { error: 'Invalid candidate for this position' },
        { status: 400 }
      )
    }

    const election = candidate.position.election
    // Use the clock-derived effective status (auto-pilot) instead of the
    // stored status column. This means voting opens/closes exactly on
    // schedule without needing an admin to flip a switch — unless the
    // admin has set a manualOverride, which getEffectiveStatus respects.
    const effectiveStatus = getEffectiveStatus(election)
    if (effectiveStatus !== 'active') {
      const label =
        effectiveStatus === 'upcoming'
          ? 'Voting has not opened yet. Please check back at the scheduled start time.'
          : effectiveStatus === 'ended'
            ? 'Voting has closed. The election has ended.'
            : 'This election has been cancelled.'
      return NextResponse.json(
        { error: label, status: effectiveStatus },
        { status: 400 }
      )
    }

    // Check the student hasn't already voted for this position
    const existing = await db.vote.findUnique({
      where: {
        studentId_positionId: {
          studentId: student.id,
          positionId,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'You have already voted for this position' },
        { status: 400 }
      )
    }

    // Cast vote + increment candidate count atomically.
    // A unique 8-char receipt code is generated so the student can later
    // confirm their vote was recorded — without revealing who they voted for.
    const receiptCode = await generateReceiptCode()

    await db.$transaction([
      db.vote.create({
        data: {
          electionId: election.id,
          positionId,
          candidateId,
          studentId: student.id,
          receiptCode,
        },
      }),
      db.candidate.update({
        where: { id: candidateId },
        data: { voteCount: { increment: 1 } },
      }),
    ])

    // Determine if the student has now voted in ALL contestable positions
    // for this election. We only count positions that HAVE at least one
    // candidate — an uncontested position (no nominees) can never be voted
    // in, so including it in the cap would permanently prevent hasVoted from
    // flipping to true. This keeps the turnout board accurate when the ballot
    // includes vacant positions (e.g. "Assistant Gen Secretary — no candidates").
    const totalPositions = await db.position.count({
      where: {
        electionId: election.id,
        candidates: { some: {} },
      },
    })
    const studentVotes = await db.vote.count({
      where: {
        studentId: student.id,
        electionId: election.id,
      },
    })

    if (studentVotes >= totalPositions && !student.hasVoted) {
      await db.student.update({
        where: { id: student.id },
        data: { hasVoted: true },
      })
    }

    await db.activity.create({
      data: {
        studentId: student.id,
        action: 'voted',
        details: `Voted for ${candidate.name} as ${candidate.position.title}`,
      },
    })

    return NextResponse.json({
      message: 'Vote cast successfully',
      candidateId,
      positionId,
      receiptCode,
      positionTitle: candidate.position.title,
      completedAllPositions: studentVotes >= totalPositions,
    })
  } catch (error) {
    console.error('[elections/vote] Error:', error)
    return NextResponse.json(
      { error: 'Failed to cast vote' },
      { status: 500 }
    )
  }
}
