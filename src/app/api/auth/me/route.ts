import { NextResponse } from 'next/server'
import { getCurrentStudent } from '@/lib/auth/server-auth'

export async function GET() {
  try {
    const student = await getCurrentStudent()
    return NextResponse.json({ student })
  } catch (error) {
    console.error('[auth/me] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    )
  }
}
