import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentStudent } from '@/lib/auth/server-auth'

export async function GET() {
  try {
    const student = await getCurrentStudent()
    if (!student) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const [fullStudent, activities] = await Promise.all([
      db.student.findUnique({
        where: { id: student.id },
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
        },
      }),
      db.activity.findMany({
        where: { studentId: student.id },
        orderBy: { timestamp: 'desc' },
        take: 10,
      }),
    ])

    return NextResponse.json({ student: fullStudent, activities })
  } catch (error) {
    console.error('[students/me] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch student profile' },
      { status: 500 }
    )
  }
}
