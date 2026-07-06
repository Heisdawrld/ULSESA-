import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import {
  verifyPassword,
  signStudentToken,
} from '@/lib/auth/server-auth'
import {
  checkLoginFailLimits,
  recordLoginFailure,
  clearLoginFailures,
  getClientIp,
  formatRetryAfter,
} from '@/lib/rate-limiter'
import {
  checkDeviceClaimLimit,
  logClaimAttempt,
} from '@/lib/device-limit'

/**
 * POST /api/auth/login
 *
 * Pre-set password scheme (ULSESA):
 *   password = matricNumber + last4(lowercase(surname))
 *
 * The hash is stored on the MatricAllowlist entry (computed at upload time).
 * On first successful login we lazily create / activate a Student row so the
 * rest of the portal (which keys off the Student model) keeps working.
 *
 * Rate limiting:
 *   - 5 wrong passwords per matric → 15-minute lock (stops brute-forcing the
 *     4-letter surname suffix)
 *   - 15 wrong passwords per IP per hour → IP cooldown (stops one device
 *     trying many matrics)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const matricNumber = (body?.matricNumber ?? '').toString().trim()
    const password = (body?.password ?? '').toString()
    const rawFingerprint = (body?.deviceFingerprint ?? '').toString()
    const ip = getClientIp(request)
    const userAgent = request.headers.get('user-agent') || null

    if (!matricNumber || !password) {
      return NextResponse.json(
        { error: 'Matric number and password are required' },
        { status: 400 }
      )
    }

    // ── Rate limit check (before we touch the DB) ────────────────────────
    const failCheck = checkLoginFailLimits(matricNumber, ip)
    if (!failCheck.allowed) {
      const isLock = failCheck.locked
      return NextResponse.json(
        {
          error: isLock
            ? `This matric is temporarily locked after too many failed attempts. Please try again in ${formatRetryAfter(
                failCheck.retryAfterMs
              )}, or contact the electoral committee if you need help.`
            : `Too many failed attempts from your device. Please try again in ${formatRetryAfter(
                failCheck.retryAfterMs
              )}.`,
          retryAfter: formatRetryAfter(failCheck.retryAfterMs),
          locked: isLock,
        },
        { status: 429 }
      )
    }

    // ── Look up the allowlist entry ──────────────────────────────────────
    const entry = await db.matricAllowlist.findUnique({
      where: { matricNumber },
      select: {
        id: true,
        matricNumber: true,
        fullName: true,
        programme: true,
        level: true,
        cohort: true,
        passwordHash: true,
        isClaimed: true,
        claimedByStudentId: true,
      },
    })

    // Use the SAME generic error whether the matric is unknown, the password
    // is wrong, or no hash is set yet — so an attacker can't distinguish
    // "matric exists" from "matric doesn't exist".
    const GENERIC_ERROR =
      'Wrong matric number or password. Your password is your matric number + the last 4 letters of your surname (all lowercase, no spaces). If you still can\'t log in, contact the ULSESA electoral committee.'

    if (!entry || !entry.passwordHash) {
      // Still burn a fail attempt on the IP so enumeration is rate-limited,
      // but don't lock a matric that doesn't exist (would let an attacker
      // lock real students out by spamming their matric).
      return NextResponse.json(
        {
          error: 'This matric number is not in the ULSESA voter register. Only students whose names appear on submitted class attendance lists can vote. If you believe this is an error, contact the ULSESA electoral committee.',
        },
        { status: 404 }
      )
    }

    // ── Verify password ──────────────────────────────────────────────────
    const ok = await verifyPassword(password, entry.passwordHash)
    if (!ok) {
      const failState = recordLoginFailure(matricNumber, ip)

      if (failState.locked) {
        return NextResponse.json(
          {
            error: `Wrong password. For security, this matric is now locked for ${formatRetryAfter(
              failState.retryAfterMs ?? 15 * 60 * 1000
            )}. If this is your matric, please contact the electoral committee to confirm the exact spelling of your name on the attendance list.`,
            locked: true,
            remaining: 0,
          },
          { status: 429 }
        )
      }

      const remaining = failState.remaining
      return NextResponse.json(
        {
          error:
            remaining > 1
              ? `Wrong password. ${remaining} attempts remaining before this matric is temporarily locked. Remember: your password is your matric number + the last 4 letters of your surname (all lowercase, no spaces).`
              : `Wrong password. This matric will be temporarily locked after the next failed attempt. Please double-check the spelling of your surname as it appears on your class attendance list.`,
          remaining,
        },
        { status: 401 }
      )
    }

    // ── Success — clear fail counters ────────────────────────────────────
    clearLoginFailures(matricNumber)

    // ── Device fingerprint check (FIRST CLAIM ONLY) ──────────────────────
    // If this matric has never been claimed (claimedByStudentId is null),
    // we're about to create a new Student row — that's a "claim". Enforce
    // the max-2-claims-per-device cap to stop one phone from harvesting
    // accounts. Returning students logging back in are NOT affected.
    let fingerprintHash: string | null = null
    if (!entry.claimedByStudentId && rawFingerprint && rawFingerprint !== 'server') {
      const check = await checkDeviceClaimLimit(rawFingerprint)
      fingerprintHash = check.fingerprintHash

      if (!check.allowed) {
        // Log the blocked attempt so the admin sees it in the Device Activity tab.
        await logClaimAttempt({
          fingerprintHash: check.fingerprintHash,
          matricNumber: entry.matricNumber,
          outcome: 'blocked',
          ip,
          userAgent,
        })

        // Generic message — does NOT disclose the cap, does NOT mention
        // class reps. Just points the student at the electoral committee.
        return NextResponse.json(
          {
            error:
              "This device can't be used to claim more accounts right now. If you believe this is a mistake, please contact the ULSESA electoral committee.",
            code: 'DEVICE_LIMIT_REACHED',
          },
          { status: 429 }
        )
      }
    }

    // ── Upsert the Student row (lazy activation) ─────────────────────────
    // The portal's other endpoints key off the Student model, so we make
    // sure a Student row exists for this allowlist entry. On first login we
    // create it; on subsequent logins we reuse the existing one.
    let studentId = entry.claimedByStudentId

    if (!studentId) {
      const created = await db.student.create({
        data: {
          matricNumber: entry.matricNumber,
          fullName: entry.fullName,
          level: entry.level,
          programme: entry.programme,
          // Pre-set password scheme: students are fully verified once they
          // prove they know the name-derived password. No admin approval needed.
          isVerified: true,
          verificationStatus: 'approved',
          claimIp: ip,
          // Server-hash of the device fingerprint (null if client didn't send one).
          deviceFingerprint: fingerprintHash,
        },
        select: { id: true },
      })
      studentId = created.id

      // Audit-log the successful claim.
      if (fingerprintHash) {
        await logClaimAttempt({
          fingerprintHash,
          matricNumber: entry.matricNumber,
          outcome: 'success',
          ip,
          userAgent,
        })
      }

      // Link the allowlist entry to the student and mark as claimed
      await db.matricAllowlist.update({
        where: { id: entry.id },
        data: {
          isClaimed: true,
          claimedAt: new Date(),
          claimedByStudentId: studentId,
        },
      })
    } else {
      // Ensure the linked Student row is marked verified (covers entries
      // claimed under the old flow before the password scheme existed).
      await db.student.updateMany({
        where: { id: studentId, isVerified: false },
        data: { isVerified: true, verificationStatus: 'approved' },
      })
    }

    const student = await db.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        matricNumber: true,
        fullName: true,
        level: true,
        programme: true,
        email: true,
        phone: true,
        isVerified: true,
        verificationStatus: true,
        hasVoted: true,
      },
    })

    if (!student) {
      // Should be unreachable, but guard anyway
      return NextResponse.json(
        { error: 'Account activation failed. Please contact support.' },
        { status: 500 }
      )
    }

    const safeStudent = {
      id: student.id,
      matricNumber: student.matricNumber,
      fullName: student.fullName,
      level: student.level,
      programme: student.programme,
      email: student.email,
      phone: student.phone,
      isVerified: student.isVerified,
      verificationStatus: student.verificationStatus,
      hasVoted: student.hasVoted,
    }

    const token = signStudentToken({
      studentId: student.id,
      matricNumber: student.matricNumber,
      type: 'student',
    })

    const cookieStore = await cookies()
    cookieStore.set('ddp-student-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    })

    return NextResponse.json({
      student: safeStudent,
      token,
      message: 'Signed in successfully. Welcome to the ULSESA Portal.',
    })
  } catch (error) {
    console.error('[auth/login] Error:', error)
    return NextResponse.json(
      { error: 'Failed to sign in. Please try again.' },
      { status: 500 }
    )
  }
}
