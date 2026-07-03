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

// Claim flow steps. Numeric steps 1-4 are the OTP-based path; the string
// steps ('upload', 'pending', 'rejected') are the manual ID-upload fallback
// path used when the student can't receive the email code.
//
//   1 → enter matric
//   2 → review details & send OTP                  (also offers "upload ID instead")
//   3 → enter OTP code
//   4 → set password
//   'upload'   → upload student ID / biodata image
//   'pending'  → ID uploaded, waiting for admin review
//   'rejected' → admin rejected the uploaded ID, can re-upload
type ClaimStep = 1 | 2 | 3 | 4 | 'upload' | 'pending' | 'rejected'
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

  // Admin-verified flag — when true, the student was manually verified by
  // an ULSESA admin and can skip the OTP step entirely.
  const [adminVerified, setAdminVerified] = useState(false)

  // Manual-upload flags (returned from /auth/claim)
  const [pendingManualReview, setPendingManualReview] = useState(false)
  const [rejectedInfo, setRejectedInfo] = useState<{
    rejected: boolean
    reason: string | null
  }>({ rejected: false, reason: null })
  const [idUploaded, setIdUploaded] = useState(false)

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

  // Upload state (step 'upload')
  const [documentData, setDocumentData] = useState<string | null>(null)
  const [documentName, setDocumentName] = useState<string>('')
  const [documentType, setDocumentType] = useState<'student_id' | 'biodata'>(
    'student_id'
  )
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Map claim step (1..4) → indicator step (1..3) for the OTP path.
  // For the manual-upload path ('upload' | 'pending' | 'rejected') the
  // StepIndicator is hidden entirely — those screens have their own visual
  // language (status cards) that don't fit the 3-dot progression.
  const indicatorStep: 1 | 2 | 3 | null =
    typeof step === 'number'
      ? step === 4
        ? 3
        : step === 3
          ? 2
          : step
      : null

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
      const data = await api.post<{
        student: ClaimStudent
        adminVerified: boolean
        pendingManualReview?: boolean
        rejected?: boolean
        rejectionReason?: string | null
        idUploaded?: boolean
      }>('/auth/claim', {
        matricNumber: cleaned,
      })
      setStudent(data.student)
      setMaskedEmail(maskEmail(data.student.email))
      setAdminVerified(data.adminVerified ?? false)
      setPendingManualReview(data.pendingManualReview ?? false)
      setRejectedInfo({
        rejected: data.rejected ?? false,
        reason: data.rejectionReason ?? null,
      })
      setIdUploaded(data.idUploaded ?? false)

      if (data.student.hasPassword) {
        // Already claimed — show the "go to sign in" card on step 1.
        setAlreadyClaimed(true)
      } else if (data.adminVerified) {
        // Admin manually verified this student — skip OTP, go straight
        // to setting a password.
        setStep(4)
      } else if (data.pendingManualReview) {
        // Student already uploaded an ID — show the pending-review screen.
        setStep('pending')
      } else if (data.rejected) {
        // Admin rejected the previous upload — show the rejection screen.
        setStep('rejected')
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

  // --- Step 'upload': handle file selection from input or drag-drop ----
  // Reads the file as a base64 data URL and stashes it in state. The actual
  // upload happens when the student clicks "Submit for review".
  function handleFileSelected(file: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, or HEIC).')
      return
    }
    // 8 MB cap matches the server-side limit. We check pre-read so we don't
    // try to cram a 50 MB file through FileReader.
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image is too large. Maximum size is 8 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string' && result.startsWith('data:image/')) {
        setDocumentData(result)
        setDocumentName(file.name)
      } else {
        toast.error('Could not read the selected image.')
      }
    }
    reader.onerror = () => {
      toast.error('Could not read the selected image.')
    }
    reader.readAsDataURL(file)
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFileSelected(file)
    // Clear the input value so selecting the same file twice still fires.
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelected(file)
  }

  // --- Step 'upload': submit the data URL to the server ---
  async function handleUploadId() {
    if (!student) return
    if (!documentData) {
      toast.error('Please select an image of your student ID first.')
      return
    }
    setUploading(true)
    try {
      await api.post<{ success: boolean; message: string }>('/auth/upload-id', {
        matricNumber: student.matricNumber,
        documentData,
        documentType,
      })
      toast.success('ID uploaded — pending admin review.')
      setDocumentData(null)
      setDocumentName('')
      setStep('pending')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to upload ID'
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }

  function handleReset() {
    setStep(1)
    setMatric('')
    setStudent(null)
    setAlreadyClaimed(false)
    setAdminVerified(false)
    setPendingManualReview(false)
    setRejectedInfo({ rejected: false, reason: null })
    setIdUploaded(false)
    setOtp('')
    setMaskedEmail('')
    setDemoMode(false)
    setDemoOtp(null)
    setEmailSent(false)
    setPassword('')
    setConfirm('')
    setShowPw(false)
    setShowConfirm(false)
    setDocumentData(null)
    setDocumentName('')
    setDocumentType('student_id')
    setUploading(false)
    setDragging(false)
  }

  return (
    <div className="glass-strong overflow-hidden rounded-3xl border border-border/60 p-6 shadow-2xl shadow-primary/5 sm:p-8">
      {indicatorStep && <StepIndicator current={indicatorStep} />}

      <div className={indicatorStep ? 'mt-6 min-h-[320px]' : 'mt-0 min-h-[320px]'}>
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

              {/* Manual-verification fallback — for students whose email is
                  wrong, blocked, or whose OTP never arrives (Gmail 500/day
                  cap). Uploads a photo of their student ID / biodata form
                  for an ULSESA admin to review. */}
              <div className="pt-1">
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    or
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-12 w-full rounded-xl border-dashed text-sm font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setStep('upload')}
                  disabled={loading}
                >
                  <IdCard className="size-4" />
                  Can&apos;t access email? Upload Student ID instead
                </Button>
                {idUploaded && (
                  <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
                    You&apos;ve previously uploaded an ID — you can re-upload a
                    clearer image if needed.
                  </p>
                )}
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

              {/* Admin-verified banner — shown when the student was manually
                  verified by an ULSESA admin and skipped the OTP step. */}
              {adminVerified && (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
                  <ShieldCheck className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Identity verified by ULSESA admin
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Your account was manually verified by the ULSESA
                      administrator, so you can set your password directly
                      without an email code. Set your password below to
                      complete your account.
                    </p>
                  </div>
                </div>
              )}

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

          {/* ---------- Step 'upload': Manual ID upload ---------- */}
          {step === 'upload' && student && (
            <motion.div
              key="step-upload"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div>
                <div className="mb-2 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <IdCard className="size-5" />
                </div>
                <h2 className="font-display text-2xl font-bold tracking-tight">
                  Upload your student ID
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  If you can&apos;t receive the email code, upload a clear
                  photo of your student ID card or biodata form. An ULSESA
                  admin will review it and verify your account manually.
                </p>
              </div>

              {/* Document type toggle */}
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => setDocumentType('student_id')}
                  className={[
                    'flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    documentType === 'student_id'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                >
                  <IdCard className="size-4" />
                  Student ID card
                </button>
                <button
                  type="button"
                  onClick={() => setDocumentType('biodata')}
                  className={[
                    'flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    documentType === 'biodata'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                >
                  <FileUp className="size-4" />
                  Biodata form
                </button>
              </div>

              {/* Dropzone / preview */}
              {documentData ? (
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/30">
                    {/* Using a plain <img> instead of next/image because the
                        src is a runtime base64 data URL, not a known path. */}
                    <img
                      src={documentData}
                      alt="Selected student ID preview"
                      className="max-h-72 w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setDocumentData(null)
                        setDocumentName('')
                      }}
                      className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-background/90 text-foreground shadow-md ring-1 ring-border hover:bg-background"
                      aria-label="Remove selected image"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    <ImagePlus className="mr-1 inline size-3.5" />
                    {documentName || 'Selected image'}
                  </p>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      fileInputRef.current?.click()
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  className={[
                    'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors',
                    dragging
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/40',
                  ].join(' ')}
                >
                  <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <Upload className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Tap to upload or drag &amp; drop
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      JPG, PNG, or HEIC · up to 8 MB
                    </p>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Camera className="size-3.5" />
                    <span>You can use your phone camera</span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={onFileInputChange}
                    className="hidden"
                  />
                </div>
              )}

              {/* Tips */}
              <div className="flex items-start gap-2 rounded-xl bg-cyan-accent/5 p-3 ring-1 ring-cyan-accent/20">
                <Info className="mt-0.5 size-4 shrink-0 text-cyan-accent" />
                <p className="text-xs text-muted-foreground">
                  Make sure your <span className="font-medium text-foreground">name, matric number, photograph, and programme</span> are
                  all clearly visible. A clear, well-lit photo speeds up
                  verification.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-xl"
                  onClick={() => setStep(2)}
                  disabled={uploading}
                >
                  <ArrowLeft className="size-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className="h-12 flex-1 rounded-xl text-base font-semibold"
                  onClick={handleUploadId}
                  disabled={uploading || !documentData}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <FileUp className="size-4" />
                      Submit for review
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ---------- Step 'pending': waiting for admin ---------- */}
          {step === 'pending' && student && (
            <motion.div
              key="step-pending"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-5 py-6 text-center"
            >
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-cyan-accent/20 to-primary/20 text-primary ring-1 ring-primary/20"
              >
                <Hourglass className="size-9" />
              </motion.div>
              <div className="space-y-2">
                <h2 className="font-display text-2xl font-bold tracking-tight">
                  Your ID is pending admin review
                </h2>
                <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                  An ULSESA administrator will compare the uploaded photo
                  against your registered name, level, and programme, then
                  either approve or reject it.
                </p>
              </div>
              <div className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-muted/30 p-4 text-left">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="size-4 text-cyan-accent" />
                  <span className="font-medium text-foreground">
                    What happens next?
                  </span>
                </div>
                <ol className="ml-6 list-decimal space-y-1.5 text-xs text-muted-foreground">
                  <li>
                    Once approved, come back here and re-enter your matric
                    number (
                    <span className="font-mono font-semibold text-foreground">
                      {student.matricNumber}
                    </span>
                    ).
                  </li>
                  <li>
                    You&apos;ll skip the email code and go straight to
                    setting your password.
                  </li>
                  <li>
                    If your upload is rejected, you&apos;ll see the reason
                    and can re-upload a clearer image.
                  </li>
                </ol>
              </div>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-12 rounded-xl"
                onClick={handleReset}
              >
                <RotateCcw className="size-4" />
                Start over
              </Button>
            </motion.div>
          )}

          {/* ---------- Step 'rejected': admin rejected ---------- */}
          {step === 'rejected' && student && (
            <motion.div
              key="step-rejected"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div>
                <div className="mb-2 flex size-11 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-red-500/20">
                  <AlertCircle className="size-5" />
                </div>
                <h2 className="font-display text-2xl font-bold tracking-tight">
                  Your ID was rejected
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  An ULSESA admin reviewed your uploaded ID and couldn&apos;t
                  verify it. Please re-upload a clearer image and try again.
                </p>
              </div>

              {rejectedInfo.reason && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                    <AlertCircle className="size-3.5" />
                    Reason from admin
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    &ldquo;{rejectedInfo.reason}&rdquo;
                  </p>
                </div>
              )}

              <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-3">
                <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Common reasons: photo is blurry or too dark, name or matric
                  number isn&apos;t visible, or the document doesn&apos;t
                  match the registered details for{' '}
                  <span className="font-medium text-foreground">
                    {student.fullName}
                  </span>
                  .
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-xl"
                  onClick={handleReset}
                  disabled={uploading}
                >
                  <RotateCcw className="size-4" />
                  Start over
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className="h-12 flex-1 rounded-xl text-base font-semibold"
                  onClick={() => {
                    setDocumentData(null)
                    setDocumentName('')
                    setStep('upload')
                  }}
                  disabled={uploading}
                >
                  <Upload className="size-4" />
                  Re-upload ID
                </Button>
              </div>
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
