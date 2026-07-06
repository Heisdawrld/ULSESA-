import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth/server-auth'
import { getDefaultClaimCap } from '@/lib/device-limit'

/**
 * GET /api/admin/device-activity
 *
 * Returns a per-device summary of claim attempts so the admin can spot a
 * single device claiming many accounts. Each row aggregates one fingerprint
 * hash with:
 *   - claimCount         (successful claims — Student rows with this hash)
 *   - blockedAttempts    (rejected because the cap was hit)
 *   - totalAttempts      (success + blocked)
 *   - firstSeen          (earliest attempt timestamp)
 *   - lastSeen           (latest attempt timestamp)
 *   - overrideAllowance  (sum of active DeviceOverride.extraClaims)
 *   - cap                (DEFAULT_CLAIM_CAP + overrideAllowance)
 *   - recentMatrics      (up to 5 matrics claimed/blocked from this device)
 *
 * Sorted by totalAttempts DESC. Limited to the last 7 days.
 */
export async function GET() {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cap = getDefaultClaimCap()

    // Pull the last 7 days of attempts. SQLite stores DateTime as ISO-ish
    // strings or epoch-ms depending on the adapter; we use the relative
    // "datetime('now', '-7 days')" expression so it works either way.
    const rows = (await db.$queryRawUnsafe(`
      SELECT
        fingerprintHash,
        fingerprintShort,
        COUNT(*)                                         AS totalAttempts,
        SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) AS successCount,
        SUM(CASE WHEN outcome = 'blocked' THEN 1 ELSE 0 END) AS blockedCount,
        MIN(createdAt)                                   AS firstSeen,
        MAX(createdAt)                                   AS lastSeen
      FROM DeviceClaimAttempt
      WHERE createdAt > datetime('now', '-7 days')
      GROUP BY fingerprintHash
      ORDER BY totalAttempts DESC
      LIMIT 200
    `)) as Array<{
      fingerprintHash: string
      fingerprintShort: string
      totalAttempts: number | bigint
      successCount: number | bigint
      blockedCount: number | bigint
      firstSeen: string | number
      lastSeen: string | number
    }>

    // For each fingerprint, fetch the recent matrics claimed/blocked + any overrides.
    const enriched = await Promise.all(
      rows.map(async (r) => {
        const recent = (await db.$queryRawUnsafe(
          `SELECT matricNumber, outcome, createdAt
           FROM DeviceClaimAttempt
           WHERE fingerprintHash = ?
           ORDER BY createdAt DESC
           LIMIT 5`,
          r.fingerprintHash
        )) as Array<{
          matricNumber: string
          outcome: string
          createdAt: string | number
        }>

        const overrideRow = (await db.$queryRawUnsafe(
          `SELECT COALESCE(SUM(extraClaims), 0) AS n
           FROM DeviceOverride
           WHERE fingerprintHash = ?
             AND (expiresAt IS NULL OR expiresAt > CURRENT_TIMESTAMP)`,
          r.fingerprintHash
        )) as Array<{ n: bigint }>

        const overrides = Number(overrideRow[0]?.n ?? 0)
        const successCount = Number(r.successCount)
        const blockedCount = Number(r.blockedCount)
        const totalAttempts = Number(r.totalAttempts)

        return {
          fingerprintHash: r.fingerprintHash,
          fingerprintShort: r.fingerprintShort,
          successCount,
          blockedCount,
          totalAttempts,
          firstSeen: r.firstSeen,
          lastSeen: r.lastSeen,
          overrides,
          cap: cap + overrides,
          // Flag devices that are at/over the cap so the admin UI can highlight them.
          status:
            blockedCount > 0
              ? 'blocked'
              : successCount >= cap + overrides
                ? 'at-cap'
                : 'normal',
          recent: recent.map((x) => ({
            matricNumber: x.matricNumber,
            outcome: x.outcome,
            createdAt: x.createdAt,
          })),
        }
      })
    )

    // Aggregate stats
    const totalDevices = enriched.length
    const totalClaims = enriched.reduce((s, r) => s + r.successCount, 0)
    const totalBlocked = enriched.reduce((s, r) => s + r.blockedCount, 0)
    const devicesAtCap = enriched.filter(
      (r) => r.status === 'blocked' || r.status === 'at-cap'
    ).length

    return NextResponse.json({
      devices: enriched,
      stats: {
        totalDevices,
        totalClaims,
        totalBlocked,
        devicesAtCap,
        defaultCap: cap,
      },
    })
  } catch (error) {
    console.error('[admin/device-activity] Error:', error)
    return NextResponse.json(
      { error: 'Failed to load device activity' },
      { status: 500 }
    )
  }
}
