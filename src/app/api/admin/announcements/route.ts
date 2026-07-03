import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth/server-auth'

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
    const title = (body?.title ?? '').toString().trim()
    const content = (body?.content ?? '').toString().trim()
    const category = body?.category
      ? (body.category as string).toString().trim()
      : 'general'

    if (!title || !content) {
      return NextResponse.json(
        { error: 'title and content are required' },
        { status: 400 }
      )
    }

    const announcement = await db.announcement.create({
      data: { title, content, category },
    })

    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'create_announcement',
        target: title,
        details: `Created announcement "${title}" (category: ${category})`,
      },
    })

    return NextResponse.json({ announcement })
  } catch (error) {
    console.error('[admin/announcements] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create announcement' },
      { status: 500 }
    )
  }
}
