import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const matricNumber = (body?.matricNumber ?? '').toString().trim()
    const channel = body?.channel === 'phone' ? 'phone' : 'email'

    if (!matricNumber) {
      return NextResponse.json(
        { error: 'Matric number is required' },
        { status: 400 }
      )
    }

    const student = await db.student.findUnique({
      where: { matricNumber },
      select: { id: true, fullName: true, email: true, phone: true },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'No student found with that matric number' },
        { status: 404 }
      )
    }

    // Only return OTP if the channel has a destination on file
    if (channel === 'email' && !student.email) {
      return NextResponse.json(
        { error: 'No email on file for this student. Try phone instead.' },
        { status: 400 }
      )
    }
    if (channel === 'phone' && !student.phone) {
      return NextResponse.json(
        { error: 'No phone number on file for this student. Try email instead.' },
        { status: 400 }
      )
    }

    // Lazy import to avoid circular module init
    const { generateOTP } = await import('@/lib/auth/server-auth')
    const { storeOTP } = await import('@/lib/otp-store')

    const otp = generateOTP()
    storeOTP(matricNumber, otp, channel)

    return NextResponse.json({
      message: 'OTP sent',
      otp, // included for demo purposes (no real email/SMS gateway)
      channel,
      destination:
        channel === 'email' ? student.email : student.phone,
    })
  } catch (error) {
    console.error('[auth/send-otp] Error:', error)
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    )
  }
}
