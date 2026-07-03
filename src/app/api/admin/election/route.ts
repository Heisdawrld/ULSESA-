import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth/server-auth'

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

    return NextResponse.json({ election })
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

    if (action !== 'start' && action !== 'end') {
      return NextResponse.json(
        { error: "action must be 'start' or 'end'" },
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

    const newStatus = action === 'start' ? 'active' : 'ended'

    const updated = await db.election.update({
      where: { id: election.id },
      data: { status: newStatus },
    })

    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: action === 'start' ? 'start_election' : 'end_election',
        target: election.title,
        details: `Election "${election.title}" ${action === 'start' ? 'started' : 'ended'} by ${admin.name}`,
      },
    })

    return NextResponse.json({ election: updated })
  } catch (error) {
    console.error('[admin/election POST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update election' },
      { status: 500 }
    )
  }
}
