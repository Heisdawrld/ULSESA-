import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('ddp-student-token')
    cookieStore.delete('ddp-admin-token')
    return NextResponse.json({ message: 'Logged out' })
  } catch (error) {
    console.error('[auth/logout] Error:', error)
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    )
  }
}
