import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth/server-auth'

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
      d = new Date(Number(val))
    } else if (typeof val === 'number') {
      d = new Date(val)
    } else if (typeof val === 'string') {
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
 * GET /api/admin/voting-activity
 *
 * Admin-only. Returns every allowlist entry with its voting status so the
 * admin can monitor turnout on election day — who has voted, who hasn't,
 * who to chase via WhatsApp.
 *
 * Returns full matric numbers and full names (admin privilege).
 *
 * Each entry:
 *   - matricNumber  (full, e.g. "200134567")
 *   - fullName      (full, e.g. "EFFIONG FLORENCE JOY")
 *   - programme / level / cohort
 *   - isClaimed     (has a Student claimed this matric?)
 *   - voteCount     (how many positions they cast a ballot for)
 *   - firstVoteAt   (timestamp of their first vote, or null)
 *
 * Plus aggregate stats (totalEligible, totalVoted, totalClaimed, turnout)
 * and a per-cohort breakdown.
 */
export async function GET() {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rows = (await db.$queryRawUnsafe(`
      SELECT
        ma.matricNumber,
        ma.fullName,
        ma.programme,
        ma.level,
        ma.cohort,
        ma.isClaimed,
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
      isClaimed: number
      voteCount: bigint
      firstVoteAt: Date | null
    }>

    const entries = rows.map((r) => ({
      matricNumber: r.matricNumber,
      fullName: r.fullName,
      programme: r.programme,
      level: r.level,
      cohort: r.cohort,
      isClaimed: r.isClaimed === 1,
      voteCount: Number(r.voteCount),
      firstVoteAt: safeISODate(r.firstVoteAt),
    }))

    // Aggregate stats
    const totalEligible = entries.length
    const totalVoted = entries.filter((e) => e.voteCount > 0).length
    const totalClaimed = entries.filter((e) => e.isClaimed).length
    const turnout =
      totalEligible > 0
        ? Number(((totalVoted / totalEligible) * 100).toFixed(2))
        : 0

    // Per-cohort breakdown
    const cohortMap = new Map<string, { total: number; voted: number }>()
    for (const e of entries) {
      const key = `${e.programme} · ${e.level}`
      const cur = cohortMap.get(key) ?? { total: 0, voted: 0 }
      cur.total++
      if (e.voteCount > 0) cur.voted++
      cohortMap.set(key, cur)
    }
    const cohorts = Array.from(cohortMap.entries()).map(([label, v]) => ({
      label,
      total: v.total,
      voted: v.voted,
      turnout: v.total > 0 ? Number(((v.voted / v.total) * 100).toFixed(2)) : 0,
    }))

    return NextResponse.json({
      entries,
      stats: {
        totalEligible,
        totalVoted,
        totalClaimed,
        totalNotVoted: totalEligible - totalVoted,
        turnout,
      },
      cohorts,
    })
  } catch (error) {
    console.error('[admin/voting-activity] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch voting activity' },
      { status: 500 }
    )
  }
}
