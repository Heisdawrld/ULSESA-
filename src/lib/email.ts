import nodemailer from 'nodemailer'
import { Resend } from 'resend'

// ============================================================================
// ULSESA transactional email — OTP delivery
// ----------------------------------------------------------------------------
// Provider priority:
//   1. Resend  (if RESEND_API_KEY is set)  — primary, recommended
//   2. Gmail/SMTP via nodemailer (if SMTP_HOST + SMTP_USER + SMTP_PASSWORD set)
//   3. Demo mode (no provider configured)  — OTP returned in API response for
//      the developer to read. NEVER runs in production once either provider
//      is configured.
//
// Why two providers? Resend is the primary path (better deliverability, no
// App Password / 500-day-cap headaches). The nodemailer/Gmail transport is
// kept as an automatic fallback so that if RESEND_API_KEY is ever absent but
// SMTP_* vars are present, OTPs still flow — no code change needed.
// ============================================================================

// --- Resend (primary) ------------------------------------------------------
const RESEND_API_KEY = process.env.RESEND_API_KEY
// Default to Resend's sandbox sender on the free tier — the ONLY address an
// unverified account can send from. Once a custom domain is verified in the
// Resend dashboard, set RESEND_FROM to e.g.
//   "ULSESA Portal <no-reply@ulsesa.org>"
const RESEND_FROM =
  process.env.RESEND_FROM || 'ULSESA Portal <onboarding@resend.dev>'

// Lazily-instantiated Resend client. `new Resend(undefined)` would throw, so
// we only construct it when a key exists.
let resendClient: Resend | null = null
function getResend(): Resend {
  if (resendClient) return resendClient
  resendClient = new Resend(RESEND_API_KEY)
  return resendClient
}

// --- nodemailer / Gmail SMTP (fallback) ------------------------------------
const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASSWORD = process.env.SMTP_PASSWORD
const SMTP_FROM = process.env.SMTP_FROM || 'ULSESA Portal <no-reply@ulsesa.org>'

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
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    pool: false,
  })
  return transporter
}

// --- Provider selection ----------------------------------------------------
export const resendConfigured = Boolean(RESEND_API_KEY)
export const smtpConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASSWORD)
// True if ANY provider is ready to send real email.
export const isEmailConfigured = resendConfigured || smtpConfigured

/**
 * Build the HTML body for the OTP email. Shared between Resend and nodemailer
 * so both paths send identical-looking mail.
 */
function buildOtpHtml(studentName: string, otp: string): string {
  return `
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
  `
}

/**
 * Send an OTP verification email to the student.
 * Returns:
 *   - { sent: true }                      on successful delivery
 *   - { sent: false, demoOtp: otp }       when no provider is configured OR
 *                                          every provider failed (so the
 *                                          student isn't blocked)
 */
export async function sendOTPEmail(
  email: string,
  studentName: string,
  otp: string
): Promise<{ sent: boolean; demoOtp?: string }> {
  if (!isEmailConfigured) {
    console.warn(
      '[email] No provider configured. Running in DEMO mode — OTP will be shown on screen. ' +
        'Set RESEND_API_KEY (recommended) or SMTP_HOST/SMTP_USER/SMTP_PASSWORD in .env.'
    )
    return { sent: false, demoOtp: otp }
  }

  const subject = 'Your ULSESA Verification Code'
  const html = buildOtpHtml(studentName, otp)

  // --- 1. Try Resend (primary) -------------------------------------------
  if (resendConfigured) {
    try {
      const { data, error } = await getResend().emails.send({
        from: RESEND_FROM,
        to: email,
        subject,
        html,
      })
      if (error) {
        // Resend returns a structured error (e.g. unverified domain, bad
        // recipient). Log it and fall through to the SMTP fallback if
        // available, otherwise demo mode.
        console.error('[email] Resend rejected the email:', error)
      } else {
        return { sent: true }
      }
    } catch (err) {
      // Network/transport error talking to Resend's API.
      console.error('[email] Resend request failed:', err)
    }
  }

  // --- 2. Try nodemailer/Gmail SMTP (fallback) ---------------------------
  if (smtpConfigured) {
    try {
      const transport = getTransporter()
      await transport.sendMail({
        from: SMTP_FROM,
        to: email,
        subject,
        html,
      })
      return { sent: true }
    } catch (err) {
      console.error('[email] SMTP send failed:', err)
    }
  }

  // --- 3. Demo mode — last resort so students aren't blocked -------------
  console.warn('[email] All providers failed — falling back to demo mode.')
  return { sent: false, demoOtp: otp }
}
