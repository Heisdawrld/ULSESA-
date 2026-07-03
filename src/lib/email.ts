import nodemailer from 'nodemailer'

// Check if SMTP is configured. If not, we fall back to demo mode
// (return the OTP in the API response so the developer can see it).
const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASSWORD = process.env.SMTP_PASSWORD
const SMTP_FROM = process.env.SMTP_FROM || 'ULSESA Portal <no-reply@ulsesa.org>'

export const isEmailConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASSWORD)

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
    // Fail fast instead of hanging forever — if SMTP credentials are wrong
    // or the server is unreachable, fall back to demo mode within seconds.
    connectionTimeout: 10_000,   // 10s to establish TCP connection
    greetingTimeout: 10_000,     // 10s to receive SMTP greeting
    socketTimeout: 15_000,       // 15s of inactivity → error
    pool: false,                 // don't keep connections open between sends
  })
  return transporter
}

/**
 * Send an OTP verification email to the student.
 * Returns true if the email was sent, false if falling back to demo mode.
 * In demo mode, the caller should return the OTP in the response so the
 * developer can see it (this is NEVER done in production).
 */
export async function sendOTPEmail(
  email: string,
  studentName: string,
  otp: string
): Promise<{ sent: boolean; demoOtp?: string }> {
  if (!isEmailConfigured) {
    // Demo mode — SMTP not configured. Return OTP for display.
    console.warn(
      '[email] SMTP not configured. Running in DEMO mode — OTP will be shown on screen. ' +
        'Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in .env for production.'
    )
    return { sent: false, demoOtp: otp }
  }

  try {
    const transport = getTransporter()
    await transport.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: 'Your ULSESA Verification Code',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #4B0082; font-size: 24px; margin: 0; font-weight: 700;">ULSESA Portal</h1>
            <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">University of Lagos Science Education Students' Association</p>
          </div>
          <h2 style="color: #111827; font-size: 18px; margin-bottom: 16px;">Hi ${studentName},</h2>
          <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
            You're claiming your ULSESA account. Use the verification code below to complete the process:
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <div style="display: inline-block; background: #f3f4f6; border: 2px solid #4B0082; border-radius: 12px; padding: 16px 40px;">
              <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #4B0082; font-family: 'Courier New', monospace;">${otp}</span>
            </div>
          </div>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">
            This code expires in 10 minutes. If you didn't request this, you can safely ignore this email — no one can claim your account without access to your email.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            ULSESA • Shaping Tomorrow's Scientific Innovators<br/>
            University of Lagos, Faculty of Education
          </p>
        </div>
      `,
    })
    return { sent: true }
  } catch (error) {
    console.error('[email] Failed to send OTP email:', error)
    // Fall back to demo mode on error so the student isn't blocked
    return { sent: false, demoOtp: otp }
  }
}
