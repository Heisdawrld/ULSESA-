import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import {
  verifyPassword,
  signAdminToken,
} from '@/lib/auth/server-auth'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const username = (body?.username ?? '').toString().trim()
    const password = (body?.password ?? '').toString()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    const admin = await db.admin.findUnique({
      where: { username },
    })

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    const ok = await verifyPassword(password, admin.password)
    if (!ok) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    const safeAdmin = {
      id: admin.id,
      username: admin.username,
      name: admin.name,
      role: admin.role,
    }

    const token = signAdminToken({
      adminId: admin.id,
      username: admin.username,
      type: 'admin',
    })

    const cookieStore = await cookies()
    cookieStore.set('ddp-admin-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
    })

    return NextResponse.json({ admin: safeAdmin, token })
  } catch (error) {
    console.error('[auth/admin-login] Error:', error)
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    )
  }
}
