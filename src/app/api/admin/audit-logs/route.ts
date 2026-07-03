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

    const logs = await db.auditLog.findMany({
      take: 50,
      orderBy: { timestamp: 'desc' },
      include: {
        admin: {
          select: { id: true, name: true, username: true },
        },
      },
    })

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('[admin/audit-logs] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}
