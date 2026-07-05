'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
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
  Upload,
  IdCard,
  Clock,
  Hourglass,
  RotateCcw,
  FileUp,
  FolderUp,
  ImagePlus,
  Camera,
  X,
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

// Claim flow steps are defined below in the ClaimFlow component (secure
// name-verified flow). This top-level type is kept for the old AuthView
// component's mode switching only.
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

// ===================== Claim Flow (secure: name-verified, no OTP) =====================

interface ClaimFlowProps {
  onSwitchToSignIn: () => void
  onAuthSuccess: (student: StudentUser, token: string, message: string) => void
}

// Steps: 1 = enter matric, 2 = type full name (verified against register),
//         3 = set password
// Plus: 'dispute' = matric already claimed, file a report
type ClaimStep = 1 | 2 | 3 | 'dispute'

// Response from POST /auth/claim (phase 1: matric lookup only)
interface ClaimLookup {
  matricNumber: string
  programme?: string
  level?: string
  alreadyClaimed: boolean
  requiresName?: boolean
  // Phase 2 (name verified):
  nameVerified?: boolean
  verificationToken?: string
  // When already claimed:
  expectedName?: string
}

// Response from POST /auth/register
interface RegisterResponse {
  student: StudentUser
  token: string
  message: string
}

// Response from POST /disputes
interface DisputeResponse {
  success: boolean
  message: string
  disputeId?: string
}

function ClaimFlow({ onSwitchToSignIn, onAuthSuccess }: ClaimFlowProps) {
  const [step, setStep] = useState<ClaimStep>(1)
  const [loading, setLoading] = useState(false)

  // Step 1 — matric
  const [matric, setMatric] = useState('')

  // Step 2 — name verification
  const [lookup, setLookup] = useState<ClaimLookup | null>(null)
  const [typedName, setTypedName] = useState('')
  const [nameAttempts, setNameAttempts] = useState(0)

  // Step 3 — password + optional contact
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  // Dispute form
  const [disputeName, setDisputeName] = useState('')
  const [disputeContact, setDisputeContact] = useState('')
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeFiled, setDisputeFiled] = useState(false)

  // Password strength meter
  const pwStrength = (() => {
    let s = 0
    if (password.length >= 6) s++
    if (password.length >= 10) s++
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++
    if (/\d/.test(password) || /[^a-zA-Z0-9]/.test(password)) s++
    return s
  })()
  const pwLabels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong']
  const pwColors = ['bg-muted', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500']

  // --- Step 1: look up matric in allowlist ---
  async function handleMatricSubmit() {
    const cleaned = matric.trim().replace(/[^0-9]/g, '')
    if (cleaned.length !== 9) {
      toast.error('Matric number must be 9 digits.')
      return
    }
    setLoading(true)
    try {
      const data = await api.post<ClaimLookup>('/auth/claim', {
        matricNumber: cleaned,
      })
      setLookup(data)
      if (data.alreadyClaimed) {
        setStep('dispute')
      } else if (data.requiresName) {
        setStep(2)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to verify matric number'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // --- Step 2: type full name to verify identity ---
  async function handleNameSubmit() {
    if (!lookup) return
    if (typedName.trim().length < 3) {
      toast.error('Please enter your full name.')
      return
    }
    setLoading(true)
    try {
      const data = await api.post<ClaimLookup>('/auth/claim', {
        matricNumber: lookup.matricNumber,
        fullName: typedName.trim(),
      })
      if (data.alreadyClaimed) {
        // Race condition: someone claimed between step 1 and step 2
        setLookup(data)
        setStep('dispute')
      } else if (data.nameVerified && data.verificationToken) {
        // Name matched — store the verification token, move to password step
        setLookup({ ...lookup, verificationToken: data.verificationToken })
        setStep(3)
      } else {
        // Shouldn't happen, but handle gracefully
        toast.error('Verification failed. Please try again.')
      }
    } catch (err) {
      // Name didn't match or rate limited
      const msg = err instanceof Error ? err.message : 'Name verification failed'
      setNameAttempts((n) => n + 1)
      toast.error(msg)
      // If locked or too many attempts, go back to step 1
      if (/locked|too many|temporarily/i.test(msg)) {
        setTimeout(() => {
          handleReset()
        }, 3000)
      }
    } finally {
      setLoading(false)
    }
  }

  // --- Step 3: set password + register ---
  async function handleRegister() {
    if (!lookup || !lookup.verificationToken) {
      toast.error('Verification expired. Please start again.')
      setStep(1)
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match.')
      return
    }

    // Get device fingerprint (client-side, persisted in localStorage + cookie)
    const { getDeviceFingerprint } = await import('@/lib/device-fingerprint')
    const deviceFingerprint = getDeviceFingerprint()

    setLoading(true)
    try {
      const data = await api.post<RegisterResponse>('/auth/register', {
        matricNumber: lookup.matricNumber,
        password,
        verificationToken: lookup.verificationToken,
        deviceFingerprint,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      })
      toast.success(data.message)
      onAuthSuccess(data.student, data.token, data.message)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      toast.error(msg)
      // If device-blocked, already-claimed, or verification expired, go back to step 1
      if (/already been claimed|one account per device|verification|expired/i.test(msg)) {
        setStep(1)
        setLookup(null)
        setMatric('')
        setTypedName('')
        setNameAttempts(0)
      }
    } finally {
      setLoading(false)
    }
  }

  // --- Dispute: file a fraud report ---
  async function handleFileDispute() {
    if (!lookup) return
    if (!disputeName.trim()) {
      toast.error('Please enter your name.')
      return
    }
    if (disputeReason.trim().length < 10) {
      toast.error('Please explain the situation (at least 10 characters).')
      return
    }
    setLoading(true)
    try {
      const data = await api.post<DisputeResponse>('/disputes', {
        matricNumber: lookup.matricNumber,
        reporterName: disputeName.trim(),
        reporterContact: disputeContact.trim() || undefined,
        reason: disputeReason.trim(),
      })
      setDisputeFiled(true)
      toast.success(data.message)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to file dispute'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setStep(1)
    setMatric('')
    setLookup(null)
    setTypedName('')
    setNameAttempts(0)
    setPassword('')
    setConfirm('')
    setEmail('')
    setPhone('')
    setDisputeName('')
    setDisputeContact('')
    setDisputeReason('')
    setDisputeFiled(false)
  }

  return (
    <div className="glass-strong overflow-hidden rounded-3xl border border-border/60 p-6 shadow-2xl shadow-primary/5 sm:p-8">
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            Claim your account
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your matric number, verify your name, then set a password to activate your account.
          </p>
        </div>

        {/* Step indicator */}
        {step !== 'dispute' && (
          <div className="flex items-center justify-center gap-2 text-xs">
            {[
              { n: 1, label: 'Matric' },
              { n: 2, label: 'Name' },
              { n: 3, label: 'Secure' },
            ].map((s, i) => {
              const current = step === s.n
              const done = typeof step === 'number' && step > s.n
              return (
                <div key={s.n} className="flex items-center gap-2">
                  <div
                    className={[
                      'flex size-7 items-center justify-center rounded-full text-[11px] font-bold transition-colors',
                      current
                        ? 'bg-primary text-primary-foreground'
                        : done
                          ? 'bg-emerald-500 text-white'
                          : 'bg-muted text-muted-foreground',
                    ].join(' ')}
                  >
                    {done ? <CheckCircle2 className="size-3.5" /> : s.n}
                  </div>
                  <span className={current ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                    {s.label}
                  </span>
                  {i < 2 && <div className="h-px w-6 bg-border" />}
                </div>
              )
            })}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ---------- Step 1: Enter matric ---------- */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="claim-matric" className="text-sm font-medium">
                  Matric number
                </Label>
                <Input
                  id="claim-matric"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="e.g. 230315011"
                  value={matric}
                  onChange={(e) => setMatric(e.target.value.replace(/[^0-9]/g, '').slice(0, 9))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading && matric.length === 9) handleMatricSubmit()
                  }}
                  className="h-12 rounded-xl text-base tracking-wider"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the 9 digits exactly as they appear on your student ID. No slashes or spaces.
                </p>
              </div>

              <Button
                type="button"
                size="lg"
                className="h-12 w-full rounded-xl text-base font-semibold"
                onClick={handleMatricSubmit}
                disabled={loading || matric.length !== 9}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Checking register…
                  </>
                ) : (
                  <>
                    <UserCheck className="size-4" />
                    Check my matric
                  </>
                )}
              </Button>

              <div className="rounded-xl bg-muted/40 p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  Already claimed your account?{' '}
                  <button
                    type="button"
                    onClick={onSwitchToSignIn}
                    className="font-semibold text-primary hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </motion.div>
          )}

          {/* ---------- Step 2: Verify your name ---------- */}
          {step === 2 && lookup && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div className="flex flex-col items-center text-center py-2">
                <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <UserCheck className="size-8" />
                </div>
                <p className="text-sm text-muted-foreground">Matric found on the register.</p>
                <p className="mt-1 font-display text-xl font-bold tracking-tight">
                  Verify your identity
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {lookup.programme}
                  </span>
                  <span className="rounded-full bg-cyan-accent/10 px-3 py-1 text-xs font-medium text-cyan-accent-foreground dark:text-cyan-accent">
                    {lookup.level} Level
                  </span>
                  <span className="rounded-full bg-muted px-3 py-1 font-mono text-xs text-muted-foreground">
                    {lookup.matricNumber}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="flex items-start gap-2">
                  <Lock className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    For security, we need you to type your full name exactly as it appears on your class attendance list.
                    This prevents someone else from claiming your matric. Your name is <strong>not shown</strong> — only you know it.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="claim-name" className="text-sm font-medium">
                  Your full name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="claim-name"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. Daniel Ogundipe Inioluwa"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading && typedName.trim().length >= 3) handleNameSubmit()
                  }}
                  className="h-12 rounded-xl text-base"
                  disabled={loading}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Enter all your names (first, middle, surname) in any order. Case doesn&apos;t matter.
                  {nameAttempts > 0 && (
                    <span className="mt-1 block text-amber-600 dark:text-amber-400">
                      Attempt {nameAttempts + 1} — if your name doesn&apos;t match, contact your class rep to confirm the exact spelling on the attendance list.
                    </span>
                  )}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  size="lg"
                  className="h-12 w-full rounded-xl text-base font-semibold"
                  onClick={handleNameSubmit}
                  disabled={loading || typedName.trim().length < 3}
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Verifying name…
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-4" />
                      Verify my name
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 w-full rounded-xl text-xs text-muted-foreground"
                  onClick={handleReset}
                >
                  ← Use a different matric
                </Button>
              </div>
            </motion.div>
          )}

          {/* ---------- Step 3: Set password ---------- */}
          {step === 3 && lookup && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    Identity verified — {typedName}
                  </p>
                </div>
                <p className="mt-1 pl-6 text-xs text-muted-foreground">
                  Set a password to secure your account. You&apos;ll use this with your matric number to sign in and vote.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="claim-password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="claim-password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {/* Strength meter */}
                {password.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          i < pwStrength ? pwColors[pwStrength] : 'bg-muted'
                        }`}
                      />
                    ))}
                    <span className="text-[10px] font-medium text-muted-foreground w-12 text-right">
                      {pwLabels[pwStrength]}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="claim-confirm" className="text-sm font-medium">
                  Confirm password
                </Label>
                <div className="relative">
                  <Input
                    id="claim-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="h-12 rounded-xl pr-12"
                    disabled={loading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !loading && password.length >= 6 && password === confirm) {
                        handleRegister()
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {confirm.length > 0 && password !== confirm && (
                  <p className="text-xs text-red-500">Passwords don&apos;t match</p>
                )}
              </div>

              {/* Optional contact — not required, no OTP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="claim-email" className="text-sm font-medium">
                    Email <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="claim-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 rounded-xl"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="claim-phone" className="text-sm font-medium">
                    Phone <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="claim-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="0801 234 5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-10 rounded-xl"
                    disabled={loading}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Email/phone are optional — only used if you need account recovery help. We won&apos;t send verification codes.
              </p>

              <Button
                type="button"
                size="lg"
                className="h-12 w-full rounded-xl text-base font-semibold"
                onClick={handleRegister}
                disabled={loading || password.length < 6 || password !== confirm}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Activating account…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-4" />
                    Activate my account
                  </>
                )}
              </Button>

              <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-3">
                <Lock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  One account per device. Your device is linked to this matric to prevent fraud. If someone else claimed your matric, use the dispute option.
                </p>
              </div>
            </motion.div>
          )}

          {/* ---------- Dispute: matric already claimed ---------- */}
          {step === 'dispute' && lookup && (
            <motion.div
              key="step-dispute"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {!disputeFiled ? (
                <>
                  <div className="flex flex-col items-center text-center py-2">
                    <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
                      <AlertCircle className="size-8" />
                    </div>
                    <h3 className="font-display text-xl font-bold tracking-tight">
                      This matric is already claimed
                    </h3>
                    <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                      The matric <span className="font-mono font-semibold text-foreground">{lookup.matricNumber}</span> belongs to{' '}
                      <span className="font-semibold text-foreground">{lookup.expectedName}</span> on the voter register, but someone has already set up an account with it.
                    </p>
                    <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                      If this is your matric and you didn&apos;t claim it, file a dispute below. The electoral committee will revoke the fraudulent claim and free the matric for you.
                    </p>
                  </div>

                  <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                    <div className="space-y-2">
                      <Label htmlFor="dispute-name" className="text-sm font-medium">
                        Your full name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="dispute-name"
                        placeholder="As it appears on the register"
                        value={disputeName}
                        onChange={(e) => setDisputeName(e.target.value)}
                        className="h-10 rounded-xl"
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dispute-contact" className="text-sm font-medium">
                        Contact <span className="text-muted-foreground font-normal">(email or WhatsApp)</span>
                      </Label>
                      <Input
                        id="dispute-contact"
                        placeholder="So we can reach you"
                        value={disputeContact}
                        onChange={(e) => setDisputeContact(e.target.value)}
                        className="h-10 rounded-xl"
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dispute-reason" className="text-sm font-medium">
                        What happened? <span className="text-red-500">*</span>
                      </Label>
                      <textarea
                        id="dispute-reason"
                        placeholder="e.g. I just tried to claim my matric and found it was already taken. I did not authorise anyone to use my matric."
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        rows={3}
                        disabled={loading}
                        className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="lg"
                    className="h-12 w-full rounded-xl text-base font-semibold"
                    onClick={handleFileDispute}
                    disabled={loading || !disputeName.trim() || disputeReason.trim().length < 10}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Filing dispute…
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="size-4" />
                        File dispute
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="font-medium text-muted-foreground hover:text-foreground"
                    >
                      ← Try a different matric
                    </button>
                    <button
                      type="button"
                      onClick={onSwitchToSignIn}
                      className="font-semibold text-primary hover:underline"
                    >
                      Sign in instead
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-center py-6">
                  <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <h3 className="font-display text-xl font-bold tracking-tight">
                    Dispute filed
                  </h3>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    The electoral committee has been notified. They&apos;ll review the claim on{' '}
                    <span className="font-mono font-semibold text-foreground">{lookup.matricNumber}</span> and revoke it if it&apos;s fraudulent.
                  </p>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    Check back in a few minutes — once the matric is freed, you can claim it from the start.
                  </p>
                  <Button
                    type="button"
                    className="mt-5 h-10 rounded-xl"
                    onClick={handleReset}
                  >
                    <RotateCcw className="size-4" />
                    Back to start
                  </Button>
                </div>
              )}
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
            placeholder="e.g. 230315099"
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
