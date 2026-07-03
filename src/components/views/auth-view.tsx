'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useNav } from '@/lib/stores/nav-store'
import { useAuth, type StudentUser } from '@/lib/stores/auth-store'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { supportWhatsAppUrl, SUPPORT_MESSAGES } from '@/lib/support'
import {
  ShieldCheck,
  Mail,
  KeyRound,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  UserCheck,
  AlertCircle,
  Atom,
  Leaf,
  FlaskConical,
  Sigma,
  Microscope,
  Info,
} from 'lucide-react'

// ===================== Types =====================

interface ClaimStudent {
  id: string
  fullName: string
  matricNumber: string
  level: string
  programme: string
  email: string | null
  isVerified: boolean
  verificationStatus: string
  hasPassword: boolean
}

interface SendOtpResponse {
  message: string
  emailSent: boolean
  maskedEmail: string
  demoOtp?: string
  demoMode: boolean
}

interface SetPasswordResponse {
  student: StudentUser
  token: string
  message: string
}

interface LoginResponse {
  student: StudentUser
  token: string
  notice?: string
}

type ClaimStep = 1 | 2 | 3 | 4
type Mode = 'claim' | 'signin'

// ===================== Helpers =====================

function maskEmail(email: string | null): string {
  if (!email) return '—'
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  const visible = local.slice(0, 3)
  return `${visible}***@${domain}`
}

// ===================== Constants =====================

const COHORTS = [
  { name: 'Physics', icon: Atom },
  { name: 'Biology', icon: Leaf },
  { name: 'Chemistry', icon: FlaskConical },
  { name: 'Mathematics', icon: Sigma },
  { name: 'Integrated Sci.', icon: Microscope },
] as const

const CLAIM_STEPS = [
  { label: 'Matric', icon: UserCheck },
  { label: 'Verify', icon: Mail },
  { label: 'Secure', icon: ShieldCheck },
] as const

// ===================== Brand Panel (desktop only) =====================

function BrandPanel({ mode }: { mode: Mode }) {
  return (
    <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-brand-gradient p-10 xl:p-12">
      {/* Decorative overlays */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-20" />
      <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-cyan-accent/30 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-primary/40 blur-[120px]" />

      {/* Top: logo + name */}
      <div className="relative z-10 flex items-center gap-3">
        <div className="relative size-12 overflow-hidden rounded-2xl ring-2 ring-white/30 shadow-xl">
          <Image
            src="/ulsesa-logo.jpg"
            alt="ULSESA logo"
            fill
            sizes="48px"
            className="object-cover"
            priority
          />
        </div>
        <div>
          <p className="font-display text-xl font-bold text-white leading-tight">
            ULSESA Portal
          </p>
          <p className="text-xs font-medium text-white/70">
            University of Lagos · Science Education
          </p>
        </div>
      </div>

      {/* Middle: hero text + cohort grid */}
      <div className="relative z-10 max-w-md space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur ring-1 ring-white/20">
              <Sparkles className="size-3.5 text-cyan-accent" />
              {mode === 'claim' ? 'Claim your account' : 'Welcome back'}
            </span>
            <h1 className="font-display text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
              Shaping Tomorrow&apos;s{' '}
              <span className="text-cyan-accent">Scientific Innovators</span>
            </h1>
            <p className="text-base text-white/80 leading-relaxed">
              One identity. One community. One platform — built for every
              Science Education student at UNILAG.
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Cohort icons */}
        <div className="grid grid-cols-5 gap-3 pt-2">
          {COHORTS.map((c) => (
            <div
              key={c.name}
              className="group flex flex-col items-center gap-2 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 backdrop-blur transition-all hover:bg-white/10 hover:ring-white/20"
            >
              <div className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-cyan-accent ring-1 ring-white/15 transition-transform group-hover:scale-110">
                <c.icon className="size-5" />
              </div>
              <span className="text-[10px] font-medium text-white/70 text-center leading-tight">
                {c.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: trust line */}
      <div className="relative z-10 flex items-center gap-2 text-xs text-white/60">
        <ShieldCheck className="size-4 text-cyan-accent" />
        <span>Secured by ULSESA · Only pre-registered members can claim</span>
      </div>
    </div>
  )
}

// ===================== Step Indicator =====================

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-between gap-1">
      {CLAIM_STEPS.map((step, idx) => {
        const stepNum = idx + 1
        const isComplete = stepNum < current
        const isActive = stepNum === current
        const Icon = step.icon
        return (
          <div key={step.label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={[
                  'flex size-9 items-center justify-center rounded-full text-sm font-semibold transition-all',
                  isComplete
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
                    : isActive
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-md shadow-primary/30'
                      : 'bg-muted text-muted-foreground',
                ].join(' ')}
              >
                {isComplete ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <Icon className="size-4" />
                )}
              </div>
              <span
                className={[
                  'text-[11px] font-medium tracking-wide',
                  isActive || isComplete
                    ? 'text-foreground'
                    : 'text-muted-foreground',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>
            {idx < CLAIM_STEPS.length - 1 && (
              <div
                className={[
                  'mx-2 h-0.5 flex-1 rounded-full transition-colors',
                  stepNum < current ? 'bg-primary' : 'bg-border',
                ].join(' ')}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ===================== Detail Row =====================

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground text-right">
        {icon}
        {value}
      </span>
    </div>
  )
}

// ===================== Claim Flow =====================

interface ClaimFlowProps {
  onSwitchToSignIn: () => void
  onAuthSuccess: (student: StudentUser, token: string, message: string) => void
}

function ClaimFlow({ onSwitchToSignIn, onAuthSuccess }: ClaimFlowProps) {
  const [step, setStep] = useState<ClaimStep>(1)
  const [loading, setLoading] = useState(false)

  // Step 1 state
  const [matric, setMatric] = useState('')

  // Fetched student
  const [student, setStudent] = useState<ClaimStudent | null>(null)
  const [alreadyClaimed, setAlreadyClaimed] = useState(false)

  // OTP state (step 3)
  const [otp, setOtp] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [demoMode, setDemoMode] = useState(false)
  const [demoOtp, setDemoOtp] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)

  // Password state (step 4)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Map claim step (1..4) → indicator step (1..3)
  // 1→1, 2→2, 3→2, 4→3
  const indicatorStep: 1 | 2 | 3 =
    step === 4 ? 3 : step === 3 ? 2 : step

  // --- Step 1: submit matric ---
  async function handleMatricSubmit() {
    const cleaned = matric.trim()
    if (!cleaned) {
      toast.error('Please enter your matric number.')
      return
    }
    setLoading(true)
    setAlreadyClaimed(false)
    try {
      const data = await api.post<{ student: ClaimStudent }>('/auth/claim', {
        matricNumber: cleaned,
      })
      setStudent(data.student)
      setMaskedEmail(maskEmail(data.student.email))
      if (data.student.hasPassword) {
        setAlreadyClaimed(true)
      } else {
        setStep(2)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to verify matric number'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // --- Step 2: send OTP ---
  async function handleSendOtp() {
    if (!student) return
    setLoading(true)
    try {
      const data = await api.post<SendOtpResponse>('/auth/send-otp', {
        matricNumber: student.matricNumber,
      })
      setMaskedEmail(data.maskedEmail)
      setDemoMode(data.demoMode)
      setDemoOtp(data.demoOtp ?? null)
      setEmailSent(data.emailSent)
      setOtp('')
      setStep(3)
      if (data.demoMode && data.demoOtp) {
        toast.info('Demo mode: code shown on screen.')
      } else if (data.emailSent) {
        toast.success(`Verification code sent to ${data.maskedEmail}`)
      } else {
        toast.message('Code generated. Check your email.')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send code'
      if (/already been claimed/i.test(msg)) {
        toast.error('This account has already been claimed. Please sign in.')
        onSwitchToSignIn()
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  // --- Step 3: verify OTP ---
  async function handleVerifyOtp() {
    if (!student) return
    if (otp.length !== 6) {
      toast.error('Enter the 6-digit code.')
      return
    }
    setLoading(true)
    try {
      await api.post<{ verified: boolean }>('/auth/verify-otp', {
        matricNumber: student.matricNumber,
        otp,
      })
      setStep(4)
      toast.success('Email verified!')
    } catch {
      toast.error('Invalid or expired code. Try again or resend.')
    } finally {
      setLoading(false)
    }
  }

  // --- Step 3: resend OTP ---
  async function handleResendOtp() {
    if (!student) return
    try {
      const data = await api.post<SendOtpResponse>('/auth/send-otp', {
        matricNumber: student.matricNumber,
      })
      setMaskedEmail(data.maskedEmail)
      setDemoMode(data.demoMode)
      setDemoOtp(data.demoOtp ?? null)
      setEmailSent(data.emailSent)
      setOtp('')
      toast.success('New code sent.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to resend code'
      toast.error(msg)
    }
  }

  // --- Step 4: set password ---
  async function handleSetPassword() {
    if (!student) return
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const data = await api.post<SetPasswordResponse>('/auth/set-password', {
        matricNumber: student.matricNumber,
        password,
      })
      onAuthSuccess(data.student, data.token, data.message)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to set password'
      if (/email verification required/i.test(msg)) {
        toast.error('Email verification required. Please go back and verify.')
      } else if (/already been claimed/i.test(msg)) {
        toast.error('Already claimed — sign in instead.')
        onSwitchToSignIn()
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setStep(1)
    setMatric('')
    setStudent(null)
    setAlreadyClaimed(false)
    setOtp('')
    setMaskedEmail('')
    setDemoMode(false)
    setDemoOtp(null)
    setEmailSent(false)
    setPassword('')
    setConfirm('')
    setShowPw(false)
    setShowConfirm(false)
  }

  return (
    <div className="glass-strong overflow-hidden rounded-3xl border border-border/60 p-6 shadow-2xl shadow-primary/5 sm:p-8">
      <StepIndicator current={indicatorStep} />

      <div className="mt-6 min-h-[320px]">
        <AnimatePresence mode="wait">
          {/* ---------- Step 1: Enter Matric ---------- */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight">
                  Claim your account
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter the matric number your class representative registered
                  you with.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="matric" className="text-sm font-medium">
                  Matric number
                </Label>
                <Input
                  id="matric"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="e.g. 230315011"
                  value={matric}
                  onChange={(e) =>
                    setMatric(e.target.value.replace(/[^0-9]/g, ''))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading) handleMatricSubmit()
                  }}
                  className="h-12 rounded-xl text-base tracking-wide"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the matric number you were registered with.
                </p>
              </div>

              {alreadyClaimed && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <AlertCircle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                      This account has already been claimed
                    </p>
                    <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-300/80">
                      Please sign in with your matric number and password.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="mt-3 h-8"
                      onClick={onSwitchToSignIn}
                    >
                      Go to Sign In
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              <Button
                type="button"
                size="lg"
                className="w-full h-12 rounded-xl text-base font-semibold"
                onClick={handleMatricSubmit}
                disabled={loading || !matric.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Checking…
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Only pre-registered ULSESA members can claim an account.{' '}
                <a
                  href={supportWhatsAppUrl(SUPPORT_MESSAGES.account)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  Need help?
                </a>
              </p>
            </motion.div>
          )}

          {/* ---------- Step 2: Review Details & Send Code ---------- */}
          {step === 2 && student && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight">
                  Confirm your details
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review the information we have on file before sending the
                  verification code.
                </p>
              </div>

              <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/40 p-4">
                <DetailRow label="Full name" value={student.fullName} />
                <DetailRow
                  label="Matric number"
                  value={student.matricNumber}
                />
                <DetailRow
                  label="Cohort"
                  value={`${student.level} Level · ${student.programme}`}
                />
                <div className="border-t border-border/60 pt-3">
                  <DetailRow
                    label="Email on file"
                    value={maskedEmail}
                    icon={<Mail className="size-3.5" />}
                  />
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-cyan-accent/30 bg-cyan-accent/5 p-4">
                <Info className="size-5 shrink-0 text-cyan-accent" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    A verification code will be sent to the email above.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    This is the email your class representative collected — it
                    cannot be changed. If this email is wrong,{' '}
                    <a
                      href={supportWhatsAppUrl(SUPPORT_MESSAGES.account)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-cyan-accent hover:underline"
                    >
                      contact ULSESA support
                    </a>
                    .
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-xl"
                  onClick={handleReset}
                  disabled={loading}
                >
                  <ArrowLeft className="size-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className="h-12 flex-1 rounded-xl text-base font-semibold"
                  onClick={handleSendOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Mail className="size-4" />
                      Send Verification Code
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ---------- Step 3: Enter Verification Code ---------- */}
          {step === 3 && student && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight">
                  Enter verification code
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Code sent to{' '}
                  <span className="font-semibold text-foreground">
                    {maskedEmail}
                  </span>
                </p>
              </div>

              {/* Demo mode banner */}
              {demoMode && demoOtp && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      Demo Mode · SMTP not configured
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-amber-900 dark:text-amber-100">
                    Your verification code is:{' '}
                    <span className="ml-1 font-mono text-lg font-bold tracking-[0.25em] text-amber-900 dark:text-amber-100">
                      {demoOtp}
                    </span>
                  </p>
                  <p className="mt-1 text-[11px] text-amber-700/80 dark:text-amber-300/70">
                    In production this code is delivered only via email.
                  </p>
                </div>
              )}

              {/* Email sent confirmation */}
              {emailSent && !demoMode && (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-xs text-emerald-800 dark:text-emerald-300">
                    Check your email at {maskedEmail} for the verification code.
                  </p>
                </div>
              )}

              <div className="flex flex-col items-center gap-4 py-2">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(v) => setOtp(v)}
                  containerClassName="justify-center"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="size-12 text-lg" />
                    <InputOTPSlot index={1} className="size-12 text-lg" />
                    <InputOTPSlot index={2} className="size-12 text-lg" />
                  </InputOTPGroup>
                  <span className="px-1 text-muted-foreground/60">·</span>
                  <InputOTPGroup>
                    <InputOTPSlot index={3} className="size-12 text-lg" />
                    <InputOTPSlot index={4} className="size-12 text-lg" />
                    <InputOTPSlot index={5} className="size-12 text-lg" />
                  </InputOTPGroup>
                </InputOTP>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                  disabled={loading}
                >
                  Resend code
                </button>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-xl"
                  onClick={() => setStep(2)}
                  disabled={loading}
                >
                  <ArrowLeft className="size-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className="h-12 flex-1 rounded-xl text-base font-semibold"
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-4" />
                      Verify
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ---------- Step 4: Set Password ---------- */}
          {step === 4 && student && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight">
                  Set your password
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose a password you&apos;ll use to sign in next time.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl pr-12"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-sm font-medium">
                  Confirm password
                </Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="h-12 rounded-xl pr-12"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={
                      showConfirm ? 'Hide password' : 'Show password'
                    }
                  >
                    {showConfirm ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {confirm.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    {password === confirm ? (
                      <>
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Passwords match
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="size-3.5 text-destructive" />
                        <span className="text-destructive">
                          Passwords do not match
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-xs text-muted-foreground">
                  After setting your password, your account will be{' '}
                  <span className="font-medium text-foreground">
                    pending admin approval
                  </span>
                  . You can explore the portal while you wait.
                </p>
              </div>

              <Button
                type="button"
                size="lg"
                className="h-12 w-full rounded-xl text-base font-semibold"
                onClick={handleSetPassword}
                disabled={
                  loading || password.length < 6 || password !== confirm
                }
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Securing…
                  </>
                ) : (
                  <>
                    <KeyRound className="size-4" />
                    Complete Registration
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ===================== Sign In Flow =====================

interface SignInFlowProps {
  onSwitchToClaim: () => void
  onAuthSuccess: (student: StudentUser, token: string, notice?: string) => void
}

function SignInFlow({ onSwitchToClaim, onAuthSuccess }: SignInFlowProps) {
  const [matric, setMatric] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSignIn() {
    if (!matric.trim() || !password) {
      toast.error('Enter your matric number and password.')
      return
    }
    setLoading(true)
    try {
      const data = await api.post<LoginResponse>('/auth/login', {
        matricNumber: matric.trim(),
        password,
      })
      onAuthSuccess(data.student, data.token, data.notice)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign in failed'
      if (/rejected/i.test(msg)) {
        toast.error('Your verification was rejected. Contact support.', {
          action: {
            label: 'WhatsApp',
            onClick: () =>
              window.open(
                supportWhatsAppUrl(SUPPORT_MESSAGES.account),
                '_blank',
                'noopener,noreferrer'
              ),
          },
        })
      } else if (/Invalid matric/i.test(msg)) {
        toast.error(
          "Invalid matric or password. If you haven't claimed your account, tap Claim Account.",
          {
            action: {
              label: 'Claim',
              onClick: onSwitchToClaim,
            },
          }
        )
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-strong overflow-hidden rounded-3xl border border-border/60 p-6 shadow-2xl shadow-primary/5 sm:p-8">
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            Welcome back
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to continue to your ULSESA dashboard.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="signin-matric" className="text-sm font-medium">
            Matric number
          </Label>
          <Input
            id="signin-matric"
            inputMode="numeric"
            autoComplete="username"
            placeholder="e.g. 230315011"
            value={matric}
            onChange={(e) => setMatric(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) handleSignIn()
            }}
            className="h-12 rounded-xl text-base"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="signin-password" className="text-sm font-medium">
              Password
            </Label>
            <a
              href={supportWhatsAppUrl(SUPPORT_MESSAGES.password)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <Input
              id="signin-password"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) handleSignIn()
              }}
              className="h-12 rounded-xl pr-12"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="button"
          size="lg"
          className="h-12 w-full rounded-xl text-base font-semibold"
          onClick={handleSignIn}
          disabled={loading || !matric.trim() || !password}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              <Lock className="size-4" />
              Sign In
            </>
          )}
        </Button>

        <div className="rounded-xl bg-muted/40 p-3 text-center">
          <p className="text-xs text-muted-foreground">
            Haven&apos;t claimed your account yet?{' '}
            <button
              type="button"
              onClick={onSwitchToClaim}
              className="font-semibold text-primary hover:underline"
            >
              Claim it now
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

// ===================== Main AuthView =====================

export function AuthView() {
  const { navigate } = useNav()
  const { setStudent } = useAuth()
  const [mode, setMode] = useState<Mode>('claim')

  // If already authenticated, send to dashboard
  useEffect(() => {
    if (useAuth.getState().isAuthenticated()) {
      navigate('dashboard')
    }
  }, [navigate])

  function handleClaimSuccess(
    student: StudentUser,
    token: string,
    message: string
  ) {
    setStudent(student, token)
    toast.success('Account claimed! Pending admin approval.')
    if (message) toast.info(message, { duration: 6000 })
    navigate('dashboard')
  }

  function handleSignInSuccess(
    student: StudentUser,
    token: string,
    notice?: string
  ) {
    setStudent(student, token)
    if (notice) {
      toast.info(notice, { duration: 6000 })
    } else {
      toast.success(`Welcome back, ${student.fullName.split(' ')[0]}!`)
    }
    navigate('dashboard')
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-8 sm:py-12">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[60rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-56 w-56 rounded-full bg-cyan-accent/15 blur-3xl" />

      <div className="relative w-full max-w-4xl animate-slide-up">
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-2xl shadow-primary/10 lg:grid lg:grid-cols-[1fr_1.1fr]">
          <BrandPanel mode={mode} />

          {/* Right side: form */}
          <div className="p-6 sm:p-8">
            {/* Mobile-only logo header */}
            <div className="mb-5 flex items-center gap-2.5 lg:hidden">
              <div className="relative size-10 shrink-0 overflow-hidden rounded-xl ring-1 ring-primary/20">
                <Image
                  src="/ulsesa-logo.jpg"
                  alt="ULSESA logo"
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </div>
              <div>
                <p className="font-display text-sm font-bold leading-tight">
                  ULSESA Portal
                </p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Faculty of Education · UNILAG
                </p>
              </div>
            </div>

            <Tabs
              value={mode}
              onValueChange={(v) => setMode(v as Mode)}
              className="w-full"
            >
              <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-muted/70 backdrop-blur">
                <TabsTrigger
                  value="claim"
                  className="rounded-lg text-sm font-semibold"
                >
                  <UserCheck className="size-4" />
                  Claim Account
                </TabsTrigger>
                <TabsTrigger
                  value="signin"
                  className="rounded-lg text-sm font-semibold"
                >
                  <Lock className="size-4" />
                  Sign In
                </TabsTrigger>
              </TabsList>

              <TabsContent value="claim" className="mt-6">
                <ClaimFlow
                  onSwitchToSignIn={() => setMode('signin')}
                  onAuthSuccess={handleClaimSuccess}
                />
              </TabsContent>

              <TabsContent value="signin" className="mt-6">
                <SignInFlow
                  onSwitchToClaim={() => setMode('claim')}
                  onAuthSuccess={handleSignInSuccess}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthView
