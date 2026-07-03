import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const announcements = await db.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ announcements })
  } catch (error) {
    console.error('[announcements] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch announcements' },
      { status: 500 }
    )
  }
}
