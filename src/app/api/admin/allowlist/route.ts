import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminFromToken } from '@/lib/auth/server-auth'

/**
 * GET /api/admin/allowlist
 * Returns allowlist stats + paginated entries for the admin dashboard.
 *
 * Query params:
 *   - programme: filter by programme (optional)
 *   - level: filter by level (optional)
 *   - search: search by matric or name (optional)
 *   - claimed: "true" | "false" | "all" (default: all)
 *   - page, pageSize
 */
export async function GET(request: Request) {
  try {
    const admin = await getAdminFromToken()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const programme = searchParams.get('programme') ?? undefined
    const level = searchParams.get('level') ?? undefined
    const search = searchParams.get('search') ?? undefined
    const claimedFilter = searchParams.get('claimed') ?? 'all'
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') ?? '50', 10)

    const where: Record<string, unknown> = {}
    if (programme && programme !== 'all') where.programme = programme
    if (level && level !== 'all') where.level = level
    if (search) {
      where.OR = [
        { matricNumber: { contains: search } },
        { fullName: { contains: search } },
      ]
    }
    if (claimedFilter === 'true') where.isClaimed = true
    if (claimedFilter === 'false') where.isClaimed = false

    // Fetch entries + total count + per-cohort stats in parallel.
    // SQLite/Prisma doesn't support _sum on booleans, so we count claimed
    // separately per cohort using findMany + filter.
    const [entries, total, allCohorts] = await Promise.all([
      db.matricAllowlist.findMany({
        where,
        orderBy: { matricNumber: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          matricNumber: true,
          fullName: true,
          programme: true,
          level: true,
          cohort: true,
          isClaimed: true,
          claimedAt: true,
          uploadedAt: true,
        },
      }),
      db.matricAllowlist.count({ where }),
      db.matricAllowlist.groupBy({
        by: ['programme', 'level'],
        _count: true,
        orderBy: { programme: 'asc' },
      }),
    ])

    // Count claimed per cohort (can't _sum booleans in SQLite)
    const claimedCounts = await Promise.all(
      allCohorts.map((c) =>
        db.matricAllowlist.count({
          where: { programme: c.programme, level: c.level, isClaimed: true },
        })
      )
    )

    return NextResponse.json({
      entries,
      total,
      page,
      pageSize,
      stats: allCohorts.map((s, i) => ({
        programme: s.programme,
        level: s.level,
        total: s._count,
        claimed: claimedCounts[i],
      })),
    })
  } catch (error) {
    console.error('[admin/allowlist GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch allowlist' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/allowlist?matric=230315001
 * Removes a single matric from the allowlist (e.g. if a class rep made an
 * error). Refuses to delete if the matric is already claimed.
 */
export async function DELETE(request: Request) {
  try {
    const admin = await getAdminFromToken()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const matric = searchParams.get('matric')
    if (!matric) {
      return NextResponse.json({ error: 'Matric number required' }, { status: 400 })
    }

    const entry = await db.matricAllowlist.findUnique({
      where: { matricNumber: matric },
    })
    if (!entry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (entry.isClaimed) {
      return NextResponse.json(
        { error: 'Cannot delete a claimed matric. Revoke the claim first via the disputes panel.' },
        { status: 400 }
      )
    }

    await db.matricAllowlist.delete({ where: { id: entry.id } })

    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'allowlist_delete',
        target: matric,
        details: `Removed ${matric} (${entry.fullName}) from allowlist`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/allowlist DELETE] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete entry' },
      { status: 500 }
    )
  }
}
