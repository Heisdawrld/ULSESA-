import { NextResponse } from 'next/server'
import { verifyOTP } from '@/lib/otp-store'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const matricNumber = (body?.matricNumber ?? '').toString().trim()
    const otp = (body?.otp ?? '').toString().trim()

    if (!matricNumber || !otp) {
      return NextResponse.json(
        { error: 'Matric number and OTP are required' },
        { status: 400 }
      )
    }

    const valid = verifyOTP(matricNumber, otp)
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      )
    }

    return NextResponse.json({ verified: true })
  } catch (error) {
    console.error('[auth/verify-otp] Error:', error)
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    )
  }
}
