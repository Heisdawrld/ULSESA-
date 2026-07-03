import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    const resources = await db.resource.findMany({
      where: courseId ? { courseId } : undefined,
      include: { course: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ resources })
  } catch (error) {
    console.error('[resources] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch resources' },
      { status: 500 }
    )
  }
}
