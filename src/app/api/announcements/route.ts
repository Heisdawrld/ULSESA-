import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const announcements = await db.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ announcements })
  } catch (error) {
    // If the DB is unreachable, return an empty array so the frontend
    // shows an empty state instead of breaking. The health endpoint
    // (/api/health) reports the real DB status for diagnostics.
    console.error('[announcements] Error:', error)
    return NextResponse.json({ announcements: [], error: 'Database unavailable' })
  }
}
