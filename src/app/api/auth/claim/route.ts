import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signToken } from '@/lib/auth/sign-token'
import { namesMatch } from '@/lib/name-match'
import {
  checkLookupLimit,
  checkNameFailLimits,
  recordNameFailure,
  clearMatricFailures,
  getClientIp,
  formatRetryAfter,
} from '@/lib/rate-limiter'

/**
 * SECURE allowlist-based claim flow.
 *
 * The matric alone is NOT enough to verify identity — an attacker can
 * enumerate sequential matrics (just changing the last digits) and claim
 * multiple accounts from different devices. The attendance-list name is
 * the second factor: something the real student knows but a fraudster
 * guessing matrics does not.
 *
 * Two-phase API:
 *
 * Phase 1 — matric lookup (body: { matricNumber })
 *   - Not found            → 404
 *   - Found + already claimed → return alreadyClaimed + expectedName
 *                                (so the real student can file a dispute)
 *   - Found + unclaimed    → return { requiresName: true, programme, level }
 *                                (does NOT return the name)
 *
 * Phase 2 — name verification (body: { matricNumber, fullName })
 *   - Name matches         → return short-lived verificationToken
 *                                (used by /auth/register to prove name was checked)
 *   - Name doesn't match   → 401, increment failure counter
 *   - Too many failures    → 429, matric locked for 30 minutes
 *
 * Rate limits:
 *   - 15 lookups per IP per hour (stops enumeration scripts)
 *   - 10 name-failures per IP per hour (stops name spraying)
 *   - 5 name-failures per matric, then 30-min lock (stops name guessing)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const matricNumber = (body?.matricNumber ?? '').toString().trim()
    const fullName = (body?.fullName ?? '').toString().trim()
    const ip = getClientIp(request)

    if (!matricNumber) {
      return NextResponse.json(
        { error: 'Matric number is required' },
        { status: 400 }
      )
    }

    // ── Rate limit: lookup ────────────────────────────────────────────────
    const lookupLimit = checkLookupLimit(ip)
    if (!lookupLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many attempts from your device. Please try again in ${formatRetryAfter(
            lookupLimit.retryAfterMs
          )}.`,
          retryAfter: formatRetryAfter(lookupLimit.retryAfterMs),
        },
        { status: 429 }
      )
    }

    // ── Lookup the matric ─────────────────────────────────────────────────
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

    // ── Already claimed → return for dispute flow ─────────────────────────
    if (entry.isClaimed) {
      return NextResponse.json({
        matricNumber: entry.matricNumber,
        expectedName: entry.fullName,
        programme: entry.programme,
        level: entry.level,
        alreadyClaimed: true,
      })
    }

    // ── Phase 1: matric lookup only (no name provided) ────────────────────
    // Return that the matric is valid + programme/level for context, but
    // do NOT return the name. The student must type it in phase 2.
    if (!fullName) {
      return NextResponse.json({
        matricNumber: entry.matricNumber,
        programme: entry.programme,
        level: entry.level,
        alreadyClaimed: false,
        requiresName: true,
      })
    }

    // ── Phase 2: name verification ────────────────────────────────────────
    // Check rate limits for name attempts
    const failCheck = checkNameFailLimits(matricNumber, ip)
    if (!failCheck.allowed) {
      const isLock = failCheck.locked
      return NextResponse.json(
        {
          error: isLock
            ? `This matric is temporarily locked due to too many failed name attempts. Please try again in ${formatRetryAfter(
                failCheck.retryAfterMs
              )}, or contact the electoral committee if you need help.`
            : `Too many attempts from your device. Please try again in ${formatRetryAfter(
                failCheck.retryAfterMs
              )}.`,
          retryAfter: formatRetryAfter(failCheck.retryAfterMs),
          locked: isLock,
        },
        { status: 429 }
      )
    }

    // ── Compare names ─────────────────────────────────────────────────────
    const match = namesMatch(fullName, entry.fullName)

    if (!match) {
      const failState = recordNameFailure(matricNumber, ip)
      const remaining = failState.threshold - failState.matricFails

      if (failState.locked) {
        return NextResponse.json(
          {
            error: `The name you entered doesn't match our records. For security, this matric is now locked for 30 minutes. If this is your matric, please contact your class rep or the electoral committee to confirm the exact name on the attendance list.`,
            locked: true,
            remaining: 0,
          },
          { status: 429 }
        )
      }

      return NextResponse.json(
        {
          error:
            remaining > 0
              ? `The name you entered doesn't match our records for this matric. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining before this matric is temporarily locked. Make sure you enter your full name exactly as it appears on your class attendance list.`
              : `The name you entered doesn't match. This matric will be temporarily locked after the next failed attempt.`,
          remaining,
        },
        { status: 401 }
      )
    }

    // ── Name matched → issue short-lived verification token ───────────────
    clearMatricFailures(matricNumber)

    const verificationToken = signToken(
      {
        matricNumber: entry.matricNumber,
        type: 'claim-verification',
      },
      '10m' // expires in 10 minutes
    )

    return NextResponse.json({
      matricNumber: entry.matricNumber,
      programme: entry.programme,
      level: entry.level,
      alreadyClaimed: false,
      nameVerified: true,
      verificationToken,
    })
  } catch (error) {
    console.error('[auth/claim] Error:', error)
    return NextResponse.json(
      { error: 'Failed to verify matric number' },
      { status: 500 }
    )
  }
}
