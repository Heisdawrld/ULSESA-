import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { maskMatric, displayFirstName } from '@/lib/matric-mask'

/**
 * Safely convert a raw SQL date value (which may be a bigint epoch-ms,
 * a string, or null) to an ISO string. SQLite's MIN()/MAX() aggregates
 * return epoch milliseconds as bigint, while direct column selects
 * return ISO strings — this handles both.
 */
function safeISODate(val: unknown): string | null {
  if (val === null || val === undefined) return null
  try {
    let d: Date
    if (typeof val === 'bigint') {
      // SQLite MIN()/MAX() on a DateTime column returns epoch-ms as bigint
      d = new Date(Number(val))
    } else if (typeof val === 'number') {
      d = new Date(val)
    } else if (typeof val === 'string') {
      // Numeric string (epoch-ms from SQLite aggregate) → convert to number
      if (/^\d{10,}$/.test(val)) {
        d = new Date(Number(val))
      } else {
        d = new Date(val)
      }
    } else {
      d = new Date(val as Date)
    }
    if (isNaN(d.getTime())) return null
    return d.toISOString()
  } catch {
    return null
  }
}

/**
 * GET /api/elections/turnout
 *
 * Public endpoint — no auth required. Returns a privacy-safe view of
 * who has voted, designed for the student-facing "Turnout" view.
 *
 * Purpose: peer accountability. Students see that their classmates are
 * voting, which drives turnout — without compromising ballot secrecy
 * or password security.
 *
 * Returns:
 *   - Aggregate stats (total eligible, total voted, turnout %)
 *   - Per-cohort breakdown
 *   - List of students who HAVE voted, with:
 *       maskedMatric  ("2303*****") — first 4 digits only
 *       displayName   (surname hidden — it's the password component)
 *       programme / level
 *       votedAt       timestamp
 *
 * Deliberately does NOT return:
 *   - Full matric numbers (admin-only)
 *   - Surnames (password component — would allow password reconstruction)
 *   - Who hasn't voted (anti-fraud: don't expose a target list)
 *   - Which candidate anyone voted for (ballot secrecy)
 */
export async function GET() {
  try {
    const rows = (await db.$queryRawUnsafe(`
      SELECT
        ma.matricNumber,
        ma.fullName,
        ma.programme,
        ma.level,
        ma.cohort,
        COUNT(v.id) as voteCount,
        MIN(v.timestamp) as firstVoteAt
      FROM MatricAllowlist ma
      LEFT JOIN Student s ON ma.claimedByStudentId = s.id
      LEFT JOIN Vote v ON v.studentId = s.id
      GROUP BY ma.id
      ORDER BY ma.programme, ma.level, ma.matricNumber
    `)) as Array<{
      matricNumber: string
      fullName: string
      programme: string
      level: string
      cohort: string
      voteCount: bigint
      firstVoteAt: Date | null
    }>

    const totalEligible = rows.length
    const votedRows = rows.filter((r) => Number(r.voteCount) > 0)
    const totalVoted = votedRows.length
    const turnout =
      totalEligible > 0
        ? Number(((totalVoted / totalEligible) * 100).toFixed(2))
        : 0

    // Build the masked voted list — most recent first.
    const voted = votedRows
      .map((r) => ({
        maskedMatric: maskMatric(r.matricNumber),
        displayName: displayFirstName(r.fullName),
        programme: r.programme,
        level: r.level,
        votedAt: safeISODate(r.firstVoteAt),
      }))
      .sort((a, b) => {
        if (!a.votedAt || !b.votedAt) return 0
        return new Date(b.votedAt).getTime() - new Date(a.votedAt).getTime()
      })

    // Per-cohort breakdown
    const cohortMap = new Map<string, { total: number; voted: number }>()
    for (const r of rows) {
      const key = `${r.programme} · ${r.level}`
      const cur = cohortMap.get(key) ?? { total: 0, voted: 0 }
      cur.total++
      if (Number(r.voteCount) > 0) cur.voted++
      cohortMap.set(key, cur)
    }
    const cohorts = Array.from(cohortMap.entries()).map(([label, v]) => ({
      label,
      total: v.total,
      voted: v.voted,
      turnout: v.total > 0 ? Number(((v.voted / v.total) * 100).toFixed(2)) : 0,
    }))

    return NextResponse.json({
      stats: { totalEligible, totalVoted, turnout },
      cohorts,
      voted,
    })
  } catch (error) {
    console.error('[elections/turnout] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch turnout data' },
      { status: 500 }
    )
  }
}
