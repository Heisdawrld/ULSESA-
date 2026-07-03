import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth/server-auth'

export async function GET(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // pending | submitted | approved | rejected
    const search = searchParams.get('search')?.trim()

    const where: {
      verificationStatus?: string
      OR?: Array<Record<string, { contains: string }>>
    } = {}

    if (
      status &&
      ['pending', 'submitted', 'approved', 'rejected'].includes(status)
    ) {
      where.verificationStatus = status
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { matricNumber: { contains: search } },
        { email: { contains: search } },
        { programme: { contains: search } },
      ]
    }

    const students = await db.student.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        matricNumber: true,
        fullName: true,
        level: true,
        programme: true,
        email: true,
        phone: true,
        isVerified: true,
        verificationStatus: true,
        hasVoted: true,
        idDocumentUrl: true,
        createdAt: true,
        updatedAt: true,
        // explicitly exclude password
      },
    })

    return NextResponse.json({ students })
  } catch (error) {
    console.error('[admin/students] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    )
  }
}
