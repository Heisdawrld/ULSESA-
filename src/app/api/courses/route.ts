import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const courses = await db.course.findMany({
      orderBy: [{ level: 'asc' }, { code: 'asc' }],
    })
    return NextResponse.json({ courses })
  } catch (error) {
    console.error('[courses] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    )
  }
}
