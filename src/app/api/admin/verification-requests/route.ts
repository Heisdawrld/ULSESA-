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

    const requests = await db.student.findMany({
      where: { verificationStatus: 'submitted' },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        matricNumber: true,
        fullName: true,
        level: true,
        programme: true,
        email: true,
        phone: true,
        idDocumentUrl: true,
        verificationStatus: true,
        updatedAt: true,
        verificationLogs: {
          orderBy: { timestamp: 'desc' },
          include: {
            admin: {
              select: { id: true, name: true, username: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ requests })
  } catch (error) {
    console.error('[admin/verification-requests] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch verification requests' },
      { status: 500 }
    )
  }
}
