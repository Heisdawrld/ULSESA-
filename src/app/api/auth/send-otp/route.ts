import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateOTP } from '@/lib/auth/server-auth'
import { storeOTP } from '@/lib/otp-store'
import { sendOTPEmail, isEmailConfigured } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const matricNumber = (body?.matricNumber ?? '').toString().trim()

    if (!matricNumber) {
      return NextResponse.json(
        { error: 'Matric number is required' },
        { status: 400 }
      )
    }

    const student = await db.student.findUnique({
      where: { matricNumber },
      select: {
        id: true,
        fullName: true,
        email: true,
        password: true,
        verificationStatus: true,
      },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'No student found with that matric number' },
        { status: 404 }
      )
    }

    // If the student already has a password, they've already claimed — tell them to login
    if (student.password) {
      return NextResponse.json(
        {
          error:
            'This account has already been claimed. Please sign in instead.',
          alreadyClaimed: true,
        },
        { status: 400 }
      )
    }

    // The email MUST be on file — this is the identity lock.
    // Students cannot use any random email; only the email the class reps collected.
    if (!student.email) {
      return NextResponse.json(
        {
          error:
            'No email is on file for your account. Please contact the ULSESA admin to add your email before claiming.',
        },
        { status: 400 }
      )
    }

    // Generate and store the OTP
    const otp = generateOTP()
    storeOTP(matricNumber, otp)

    // Send the OTP email
    const result = await sendOTPEmail(student.email, student.fullName, otp)

    // Mask the email for the response (e.g., "chi***@gmail.com")
    const [localPart, domain] = student.email.split('@')
    const maskedEmail = domain
      ? `${localPart.slice(0, 3)}***@${domain}`
      : '***'

    return NextResponse.json({
      message: result.sent
        ? `Verification code sent to ${maskedEmail}`
        : 'Verification code generated (demo mode)',
      emailSent: result.sent,
      maskedEmail,
      // Only include the OTP in the response when in DEMO mode (SMTP not configured)
      // In production with real SMTP, this field is omitted entirely.
      ...(result.sent ? {} : { demoOtp: result.demoOtp }),
      demoMode: !isEmailConfigured,
    })
  } catch (error) {
    console.error('[auth/send-otp] Error:', error)
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    )
  }
}
