import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth/server-auth'
import {
  getEffectiveStatus,
  getSchedulingMode,
  type ElectionStatus,
} from '@/lib/election-status'

export async function GET() {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const election = await db.election.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        positions: {
          orderBy: { order: 'asc' },
          include: {
            candidates: {
              orderBy: { voteCount: 'desc' },
              select: {
                id: true,
                name: true,
                level: true,
                programme: true,
                voteCount: true,
                manifesto: true,
              },
            },
            _count: { select: { votes: true } },
          },
        },
      },
    })

    if (!election) {
      return NextResponse.json({ election: null })
    }

    // Compute the live effective status + scheduling mode so the admin
    // panel shows the truth (auto vs manual override) without polling.
    const effectiveStatus = getEffectiveStatus(election)
    const scheduling = getSchedulingMode(election)

    return NextResponse.json({
      election: {
        ...election,
        effectiveStatus,
        schedulingMode: scheduling.mode,
        manualOverride: scheduling.override,
      },
    })
  } catch (error) {
    console.error('[admin/election GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch election' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const action = (body?.action ?? '').toString().trim().toLowerCase()

    // ── Validate action ────────────────────────────────────────────────
    // start / end / cancel = set a manualOverride (wins over the clock)
    // clear_override = return to auto-pilot (manualOverride = null)
    const validActions = ['start', 'end', 'cancel', 'clear_override']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `action must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      )
    }

    const election = await db.election.findFirst({
      orderBy: { createdAt: 'desc' },
    })

    if (!election) {
      return NextResponse.json(
        { error: 'No election configured' },
        { status: 404 }
      )
    }

    // Map action → manualOverride value
    const overrideMap: Record<string, ElectionStatus> = {
      start: 'active',
      end: 'ended',
      cancel: 'cancelled',
    }

    let newOverride: string | null
    let auditAction: string
    let auditDetails: string

    if (action === 'clear_override') {
      newOverride = null
      auditAction = 'clear_election_override'
      auditDetails = `Cleared manual override on "${election.title}" — election returned to auto-pilot (status now derived from schedule). Action by ${admin.name}.`
    } else {
      newOverride = overrideMap[action]
      auditAction =
        action === 'start'
          ? 'force_start_election'
          : action === 'end'
            ? 'force_end_election'
            : 'cancel_election'
      const verb =
        action === 'start'
          ? 'force-opened'
          : action === 'end'
            ? 'force-closed'
            : 'cancelled'
      auditDetails = `Election "${election.title}" ${verb} via manual override by ${admin.name}. Auto-pilot suspended until override cleared.`
    }

    const updated = await db.election.update({
      where: { id: election.id },
      data: {
        manualOverride: newOverride,
        // Also update the mirrored status so the admin UI flips instantly
        // (no flicker while waiting for the next GET to sync).
        status: newOverride ?? (await getEffectiveStatus(election)),
      },
    })

    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: auditAction,
        target: election.title,
        details: auditDetails,
      },
    })

    return NextResponse.json({
      election: updated,
      effectiveStatus: getEffectiveStatus(updated),
      schedulingMode: getSchedulingMode(updated).mode,
    })
  } catch (error) {
    console.error('[admin/election POST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update election' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { startDate, endDate, title, description } = body

    const election = await db.election.findFirst({
      orderBy: { createdAt: 'desc' },
    })

    if (!election) {
      return NextResponse.json(
        { error: 'No election configured' },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = {}
    if (startDate) {
      const parsed = new Date(startDate)
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: 'Invalid startDate format' },
          { status: 400 }
        )
      }
      data.startDate = parsed
    }
    if (endDate) {
      const parsed = new Date(endDate)
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: 'Invalid endDate format' },
          { status: 400 }
        )
      }
      data.endDate = parsed
    }
    if (typeof title === 'string' && title.trim()) data.title = title.trim()
    if (typeof description === 'string') data.description = description

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update. Provide startDate, endDate, title, or description.' },
        { status: 400 }
      )
    }

    const updated = await db.election.update({
      where: { id: election.id },
      data,
    })

    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'update_election_schedule',
        target: election.title,
        details: `Election "${election.title}" schedule updated by ${admin.name}: ${Object.keys(data).join(', ')}`,
      },
    })

    return NextResponse.json({ election: updated })
  } catch (error) {
    console.error('[admin/election PUT] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update election' },
      { status: 500 }
    )
  }
}
