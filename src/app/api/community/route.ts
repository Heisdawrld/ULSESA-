import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const groups = await db.communityGroup.findMany({
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json({ groups })
  } catch (error) {
    console.error('[community] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch community groups' },
      { status: 500 }
    )
  }
}
