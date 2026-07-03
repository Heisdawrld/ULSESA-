import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentStudent } from '@/lib/auth/server-auth'

export async function POST(request: Request) {
  try {
    const student = await getCurrentStudent()
    if (!student) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const action = (body?.action ?? '').toString().trim()
    const details = body?.details
      ? (body.details as string).toString().trim()
      : null

    if (!action) {
      return NextResponse.json(
        { error: 'action is required' },
        { status: 400 }
      )
    }

    const activity = await db.activity.create({
      data: {
        studentId: student.id,
        action,
        details,
      },
    })

    return NextResponse.json({ activity })
  } catch (error) {
    console.error('[students/me/activity] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    )
  }
}
