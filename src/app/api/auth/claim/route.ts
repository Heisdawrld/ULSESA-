import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * NEW allowlist-based claim flow (no email OTP).
 *
 * Student types their matric. We check the MatricAllowlist table:
 *  - Not found            → 404 "matric not in voter register"
 *  - Found + unclaimed    → return name + programme + level for confirmation
 *  - Found + already claimed → return `alreadyClaimed: true` so the frontend
 *                               shows the dispute / sign-in options
 *
 * No personal data is returned beyond what's on the attendance list (name,
 * programme, level — all of which the student already knows from their own
 * matric).
 */
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

    // Check the allowlist (voter register)
    const entry = await db.matricAllowlist.findUnique({
      where: { matricNumber },
      select: {
        id: true,
        matricNumber: true,
        fullName: true,
        programme: true,
        level: true,
        cohort: true,
        isClaimed: true,
      },
    })

    if (!entry) {
      return NextResponse.json(
        {
          error:
            'This matric number is not in the ULSESA voter register. Only students whose names appear on submitted class attendance lists can vote. If you believe this is an error, contact your class rep or the ULSESA electoral committee.',
        },
        { status: 404 }
      )
    }

    if (entry.isClaimed) {
      // Account already claimed — the real student may be a fraud victim.
      // Show the dispute option. We deliberately do NOT reveal who claimed it.
      return NextResponse.json({
        matricNumber: entry.matricNumber,
        expectedName: entry.fullName,
        programme: entry.programme,
        level: entry.level,
        alreadyClaimed: true,
      })
    }

    // Unclaimed — return details for the "Is this you?" confirmation step.
    return NextResponse.json({
      matricNumber: entry.matricNumber,
      fullName: entry.fullName,
      programme: entry.programme,
      level: entry.level,
      cohort: entry.cohort,
      alreadyClaimed: false,
    })
  } catch (error) {
    console.error('[auth/claim] Error:', error)
    return NextResponse.json(
      { error: 'Failed to verify matric number' },
      { status: 500 }
    )
  }
}
