'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useNav } from '@/lib/stores/nav-store'
import { useAuth, type StudentUser } from '@/lib/stores/auth-store'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp'
import {
  ShieldCheck,
  Mail,
  Phone,
  KeyRound,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Upload,
  FileText,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  UserCheck,
  IdCard,
  AlertCircle,
  Atom,
  Leaf,
  FlaskConical,
  Sigma,
  Microscope,
} from 'lucide-react'

// ===================== Types =====================

interface ClaimedStudent {
  id: string
  fullName: string
  level: string
  programme: string
  matricNumber: string
  email: string | null
  phone: string | null
  verificationStatus: string
  isVerified: boolean
}

type Step = 0 | 1 | 2 | 3
type Channel = 'email' | 'phone'

// ===================== Helpers =====================

function maskEmail(email: string | null): string {
  if (!email) return 'No email on file'
  const [user, domain] = email.split('@')
  if (!domain) return email
  if (user.length <= 2) return `${user[0] ?? ''}***@${domain}`
  return `${user.slice(0, 2)}***@${domain}`
}

function maskPhone(phone: string | null): string {
  if (!phone) return 'No phone on file'
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return phone
  return `***${digits.slice(-4)}`
}

function toStudentUser(s: ClaimedStudent): StudentUser {
  return {
    id: s.id,
    matricNumber: s.matricNumber,
    fullName: s.fullName,
    level: s.level,
    programme: s.programme,
    email: s.email,
    isVerified: s.isVerified,
  }
}

// ===================== Step Indicator =====================

const stepDefs = [
  { n: 1, label: 'Identify', icon: UserCheck },
  { n: 2, label: 'Verify', icon: ShieldCheck },
  { n: 3, label: 'Secure', icon: Lock },
]

function StepIndicator({ current }: { current: Step }) {
  // current step 0 = mode select (no progress), 1-3 = claim flow
  const activeIdx = current === 0 ? -1 : current - 1
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {stepDefs.map((s, i) => {
        const done = activeIdx > i
        const active = activeIdx === i
        const Icon = s.icon
        return (
          <div key={s.n} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                  : done
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full ${
                  active
                    ? 'bg-primary-foreground/20'
                    : done
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border border-border'
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
              </div>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < stepDefs.length - 1 && (
              <div
                className={`h-px w-6 sm:w-10 ${done ? 'bg-primary' : 'bg-border'}`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ===================== Brand panel (desktop) =====================

const COHORTS = [
  { name: 'Biology Education', icon: Leaf },
  { name: 'Chemistry Education', icon: FlaskConical },
  { name: 'Mathematics Education', icon: Sigma },
  { name: 'Physics Education', icon: Atom },
  { name: 'Integrated Science Education', icon: Microscope },
]

function BrandPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between rounded-l-[24px] bg-brand-gradient text-primary-foreground p-8 relative overflow-hidden">
      {/* Decorative grid */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.2) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
        aria-hidden
      />
      <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-cyan-accent/30 blur-3xl pointer-events-none" aria-hidden />
      <div className="absolute bottom-0 -left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl pointer-events-none" aria-hidden />

      <div className="relative">
        <div className="flex items-center gap-3 mb-10">
          <div className="relative h-11 w-11 rounded-xl overflow-hidden ring-2 ring-white/30 shadow-lg shrink-0">
            <Image
              src="/ulsesa-logo.jpg"
              alt="ULSESA Logo"
              fill
              className="object-cover"
              sizes="44px"
            />
          </div>
          <div>
            <p className="font-bold font-display leading-tight text-lg">ULSESA Portal</p>
            <p className="text-[11px] text-primary-foreground/70">Faculty of Education • UNILAG</p>
          </div>
        </div>

        <h2 className="font-display text-3xl font-bold leading-tight">
          One Identity.
          <br />
          One Community.
          <br />
          <span className="text-gradient-cyan">One Platform.</span>
        </h2>
        <p className="mt-4 text-sm text-primary-foreground/80 max-w-xs">
          Shaping Tomorrow&apos;s Scientific Innovators — claim your verified account to vote, access resources, and join the ULSESA community securely.
        </p>
      </div>

      {/* 5 Cohorts list */}
      <div className="relative mt-8">
        <p className="text-[10px] uppercase tracking-widest text-primary-foreground/60 mb-2.5 font-semibold">
          5 Cohorts • One Family
        </p>
        <div className="space-y-1.5">
          {COHORTS.map((c) => {
            const Icon = c.icon
            return (
              <div key={c.name} className="flex items-center gap-2.5 text-xs">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 backdrop-blur shrink-0">
                  <Icon className="h-3 w-3" strokeWidth={2} />
                </div>
                <span className="text-primary-foreground/90">{c.name}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="relative space-y-3 mt-8">
        {[
          { icon: ShieldCheck, text: 'Matric-verified identity' },
          { icon: Lock, text: 'Encrypted password & tokens' },
          { icon: CheckCircle2, text: 'Anonymous, fair elections' },
        ].map((f) => {
          const Icon = f.icon
          return (
            <div key={f.text} className="flex items-center gap-3 text-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
                <Icon className="h-4 w-4" strokeWidth={1.9} />
              </div>
              <span className="text-primary-foreground/90">{f.text}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ===================== Loading button helper =====================

function LoadingButton({
  loading,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { loading?: boolean }) {
  return (
    <Button disabled={loading || props.disabled} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </Button>
  )
}

// ===================== Main view =====================

export function AuthView() {
  const { navigate } = useNav()
  const { setStudent } = useAuth()

  const [mode, setMode] = useState<'claim' | 'signin'>('claim')
  const [step, setStep] = useState<Step>(0)

  // Shared state
  const [matric, setMatric] = useState('')
  const [student, setStudentInfo] = useState<ClaimedStudent | null>(null)
  const [channel, setChannel] = useState<Channel>('email')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [demoOtp, setDemoOtp] = useState<string | null>(null)
  const [idDocName, setIdDocName] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)

  // Sign-in state
  const [signinMatric, setSigninMatric] = useState('')
  const [signinPwd, setSigninPwd] = useState('')
  const [showSigninPwd, setShowSigninPwd] = useState(false)

  // Loading flags
  const [claiming, setClaiming] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [signingIn, setSigningIn] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // If a session already exists, send user to dashboard
  useEffect(() => {
    if (useAuth.getState().isAuthenticated()) {
      navigate('dashboard')
    }
  }, [navigate])

  function resetClaimFlow() {
    setStep(0)
    setMatric('')
    setStudentInfo(null)
    setChannel('email')
    setOtpSent(false)
    setOtp('')
    setDemoOtp(null)
    setIdDocName(null)
    setPassword('')
    setConfirmPassword('')
  }

  // ---------- Step 1: Claim ----------
  async function handleClaim() {
    const trimmed = matric.trim()
    if (!trimmed) {
      toast.error('Enter your matric number')
      return
    }
    setClaiming(true)
    try {
      const res = await api.post<{ student: ClaimedStudent }>('/auth/claim', {
        matricNumber: trimmed,
      })
      setStudentInfo(res.student)
      toast.success(`Welcome, ${res.student.fullName.split(' ')[0]}!`)
      if (res.student.isVerified) {
        // Already verified → switch to sign in
        toast.info('Your account is already verified. Please sign in.')
        setMode('signin')
        setSigninMatric(res.student.matricNumber)
        resetClaimFlow()
      } else {
        // Go to step 1: confirm identity, then advance to step 2 (verify)
        setStep(1)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not verify matric number')
    } finally {
      setClaiming(false)
    }
  }

  // ---------- Step 2: Send OTP ----------
  async function handleSendOtp() {
    if (!student) return
    setSendingOtp(true)
    try {
      const res = await api.post<{ message: string; otp?: string }>('/auth/send-otp', {
        matricNumber: student.matricNumber,
        channel,
      })
      setOtpSent(true)
      setDemoOtp(res.otp ?? null)
      toast.success(`OTP sent to your ${channel}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send OTP')
    } finally {
      setSendingOtp(false)
    }
  }

  // ---------- Step 2: Verify OTP ----------
  async function handleVerifyOtp() {
    if (!student) return
    if (otp.length < 4) {
      toast.error('Enter the full OTP code')
      return
    }
    setVerifying(true)
    try {
      await api.post('/auth/verify-otp', {
        matricNumber: student.matricNumber,
        otp,
      })
      toast.success('Identity verified!')
      setStep(3)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Invalid or expired OTP')
    } finally {
      setVerifying(false)
    }
  }

  // ---------- Step 3: Set password ----------
  async function handleComplete() {
    if (!student) return
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setCompleting(true)
    try {
      const res = await api.post<{ student: ClaimedStudent; token: string }>(
        '/auth/set-password',
        {
          matricNumber: student.matricNumber,
          password,
          idDocumentUrl: idDocName ?? undefined,
        }
      )
      setStudent(toStudentUser(res.student), res.token)
      toast.success('Account secured! Welcome to ULSESA.')
      navigate('dashboard')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to complete registration')
    } finally {
      setCompleting(false)
    }
  }

  // ---------- Sign in ----------
  async function handleSignIn() {
    const m = signinMatric.trim()
    if (!m || !signinPwd) {
      toast.error('Enter your matric number and password')
      return
    }
    setSigningIn(true)
    try {
      const res = await api.post<{ student: ClaimedStudent; token: string }>(
        '/auth/login',
        { matricNumber: m, password: signinPwd }
      )
      setStudent(toStudentUser(res.student), res.token)
      toast.success(`Welcome back, ${res.student.fullName.split(' ')[0]}!`)
      navigate('dashboard')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Invalid credentials')
    } finally {
      setSigningIn(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      setIdDocName(f.name)
      toast.success(`ID document ready: ${f.name}`)
    }
  }

  // ---------- Render ----------
  return (
    <div className="min-h-[calc(100vh-4rem)] relative overflow-hidden flex items-center justify-center px-4 py-10 md:py-16">
      {/* Background */}
      <div className="absolute inset-0 bg-grid pointer-events-none" aria-hidden />
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-72 w-[60rem] rounded-full bg-primary/15 blur-3xl pointer-events-none" aria-hidden />
      <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-cyan-accent/15 blur-3xl pointer-events-none" aria-hidden />

      <div className="relative w-full max-w-4xl">
        <div className="grid lg:grid-cols-2 rounded-[24px] overflow-hidden shadow-2xl shadow-primary/10 border border-border/60 bg-card">
          <BrandPanel />

          {/* Right side: form */}
          <div className="p-6 md:p-8">
            <div className="lg:hidden flex items-center gap-2.5 mb-5">
              <div className="relative h-9 w-9 rounded-xl overflow-hidden ring-1 ring-primary/20 shrink-0">
                <Image
                  src="/ulsesa-logo.jpg"
                  alt="ULSESA Logo"
                  fill
                  className="object-cover"
                  sizes="36px"
                />
              </div>
              <div>
                <p className="font-bold font-display text-sm leading-tight">ULSESA Portal</p>
                <p className="text-[10px] text-muted-foreground">Faculty of Education • UNILAG</p>
              </div>
            </div>

            {/* Mode select (Step 0) */}
            {step === 0 && (
              <div className="animate-fade-in">
                <h1 className="text-2xl font-bold font-display tracking-tight">Get started</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Claim your account if it&apos;s your first time, or sign in to continue.
                </p>

                <Tabs value={mode} onValueChange={(v) => setMode(v as 'claim' | 'signin')} className="mt-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="claim">
                      <IdCard className="h-3.5 w-3.5 mr-1.5" />
                      Claim Account
                    </TabsTrigger>
                    <TabsTrigger value="signin">
                      <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                      Sign In
                    </TabsTrigger>
                  </TabsList>

                  {/* Claim account */}
                  <TabsContent value="claim" className="mt-5 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="matric">Matric Number</Label>
                      <Input
                        id="matric"
                        placeholder="e.g. 230317091"
                        inputMode="numeric"
                        value={matric}
                        onChange={(e) => setMatric(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleClaim()}
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter your 9-digit student matric number, e.g. <code className="font-mono text-cyan-accent-foreground dark:text-cyan-accent">230317091</code>.
                      </p>
                    </div>
                    <LoadingButton
                      loading={claiming}
                      onClick={handleClaim}
                      className="w-full h-11 rounded-full"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </LoadingButton>
                    <div className="text-center text-xs text-muted-foreground">
                      New to ULSESA? Your account is pre-created — just claim it.
                    </div>
                  </TabsContent>

                  {/* Sign in */}
                  <TabsContent value="signin" className="mt-5 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-matric">Matric Number</Label>
                      <Input
                        id="signin-matric"
                        placeholder="e.g. 230317091"
                        inputMode="numeric"
                        value={signinMatric}
                        onChange={(e) => setSigninMatric(e.target.value)}
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter your 9-digit matric, e.g. <code className="font-mono text-cyan-accent-foreground dark:text-cyan-accent">230317091</code>.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="signin-pwd">Password</Label>
                        <button
                          type="button"
                          onClick={() => toast.info('Contact the admin to reset your password.')}
                          className="text-xs text-primary hover:underline"
                        >
                          Forgot?
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          id="signin-pwd"
                          type={showSigninPwd ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={signinPwd}
                          onChange={(e) => setSigninPwd(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
                          className="h-11 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSigninPwd((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showSigninPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <LoadingButton
                      loading={signingIn}
                      onClick={handleSignIn}
                      className="w-full h-11 rounded-full"
                    >
                      Sign In
                      <ArrowRight className="h-4 w-4" />
                    </LoadingButton>
                    <div className="text-center text-xs text-muted-foreground">
                      Demo: <code className="font-mono">230317091</code> / <code className="font-mono">student123</code>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Steps 1-3: Claim flow */}
            {step > 0 && (
              <div>
                <StepIndicator current={step} />

                <AnimatePresence mode="wait">
                  {/* Step 1 — Identify (confirmation of who was found) */}
                  {step === 1 && student && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <h2 className="text-xl font-bold font-display">Confirm your identity</h2>
                      <Card className="rounded-2xl bg-primary/5 border-primary/20">
                        <CardContent className="flex items-center gap-3 py-2">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold font-display">
                            {student.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{student.fullName}</p>
                            <p className="text-xs text-muted-foreground">
                              {student.programme} • {student.level} Level
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">{student.matricNumber}</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Button onClick={() => setStep(2)} className="w-full h-11 rounded-full">
                        Continue to verification
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  )}

                  {/* Step 2 — Verify identity */}
                  {step === 2 && student && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div>
                        <h2 className="text-xl font-bold font-display">Verify your identity</h2>
                        <p className="text-sm text-muted-foreground">
                          Choose where to receive your one-time code.
                        </p>
                      </div>

                      {/* Contact preview */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border p-3 text-xs">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="h-3 w-3" /> Email
                          </div>
                          <p className="font-medium mt-1 truncate">{maskEmail(student.email)}</p>
                        </div>
                        <div className="rounded-xl border p-3 text-xs">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3 w-3" /> Phone
                          </div>
                          <p className="font-medium mt-1">{maskPhone(student.phone)}</p>
                        </div>
                      </div>

                      {/* Channel selection */}
                      <RadioGroup
                        value={channel}
                        onValueChange={(v) => setChannel(v as Channel)}
                        className="grid grid-cols-2 gap-2"
                      >
                        <Label
                          htmlFor="ch-email"
                          className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                            channel === 'email' ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                          }`}
                        >
                          <RadioGroupItem id="ch-email" value="email" />
                          <Mail className="h-4 w-4" />
                          <div>
                            <p className="text-sm font-medium">Email</p>
                            <p className="text-[11px] text-muted-foreground">Recommended</p>
                          </div>
                        </Label>
                        <Label
                          htmlFor="ch-phone"
                          className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                            channel === 'phone' ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                          }`}
                        >
                          <RadioGroupItem id="ch-phone" value="phone" />
                          <Phone className="h-4 w-4" />
                          <div>
                            <p className="text-sm font-medium">SMS</p>
                            <p className="text-[11px] text-muted-foreground">Carrier rates apply</p>
                          </div>
                        </Label>
                      </RadioGroup>

                      {/* Send OTP button */}
                      {!otpSent && (
                        <LoadingButton
                          loading={sendingOtp}
                          onClick={handleSendOtp}
                          className="w-full h-11 rounded-full"
                        >
                          Send OTP to {channel === 'email' ? 'email' : 'phone'}
                          <ArrowRight className="h-4 w-4" />
                        </LoadingButton>
                      )}

                      {/* OTP input */}
                      {otpSent && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-3"
                        >
                          {demoOtp && (
                            <div className="flex items-start gap-2 rounded-xl bg-cyan-accent/10 border border-cyan-accent/30 p-3 text-xs">
                              <Sparkles className="h-4 w-4 text-cyan-accent mt-0.5 shrink-0" />
                              <div>
                                <p className="font-semibold text-cyan-accent-foreground dark:text-cyan-accent">
                                  Demo mode
                                </p>
                                <p className="text-muted-foreground">
                                  Your OTP is{' '}
                                  <code className="font-mono font-bold text-foreground">{demoOtp}</code>
                                </p>
                              </div>
                            </div>
                          )}

                          <Label>Enter OTP</Label>
                          <div className="flex justify-center">
                            <InputOTP
                              maxLength={6}
                              value={otp}
                              onChange={(v) => setOtp(v)}
                            >
                              <InputOTPGroup>
                                <InputOTPSlot index={0} className="h-11 w-11 text-base" />
                                <InputOTPSlot index={1} className="h-11 w-11 text-base" />
                                <InputOTPSlot index={2} className="h-11 w-11 text-base" />
                              </InputOTPGroup>
                              <InputOTPSeparator />
                              <InputOTPGroup>
                                <InputOTPSlot index={3} className="h-11 w-11 text-base" />
                                <InputOTPSlot index={4} className="h-11 w-11 text-base" />
                                <InputOTPSlot index={5} className="h-11 w-11 text-base" />
                              </InputOTPGroup>
                            </InputOTP>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <button
                              type="button"
                              onClick={handleSendOtp}
                              disabled={sendingOtp}
                              className="text-primary hover:underline disabled:opacity-50"
                            >
                              Resend code
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOtpSent(false)
                                setOtp('')
                                setDemoOtp(null)
                              }}
                              className="text-muted-foreground hover:underline"
                            >
                              Change channel
                            </button>
                          </div>

                          <LoadingButton
                            loading={verifying}
                            onClick={handleVerifyOtp}
                            className="w-full h-11 rounded-full"
                          >
                            Verify code
                            <CheckCircle2 className="h-4 w-4" />
                          </LoadingButton>
                        </motion.div>
                      )}

                      {/* ID upload */}
                      <Separator className="my-2" />
                      <div>
                        <Label className="mb-2">Upload Student ID (optional)</Label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className={`w-full flex items-center gap-3 rounded-xl border border-dashed p-4 text-left transition-colors hover:bg-accent ${
                            idDocName ? 'border-primary/40 bg-primary/5' : 'border-border'
                          }`}
                        >
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${idDocName ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            {idDocName ? <FileText className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            {idDocName ? (
                              <>
                                <p className="text-sm font-medium truncate">{idDocName}</p>
                                <p className="text-[11px] text-muted-foreground">Tap to replace</p>
                              </>
                            ) : (
                              <>
                                <p className="text-sm font-medium">Upload ID card or schedule</p>
                                <p className="text-[11px] text-muted-foreground">PNG, JPG or PDF • speeds up verification</p>
                              </>
                            )}
                          </div>
                        </button>
                      </div>

                      <Button
                        variant="ghost"
                        onClick={() => setStep(0)}
                        className="w-full"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </Button>
                    </motion.div>
                  )}

                  {/* Step 3 — Set password */}
                  {step === 3 && student && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div>
                        <h2 className="text-xl font-bold font-display">Secure your account</h2>
                        <p className="text-sm text-muted-foreground">
                          Set a strong password to finish claiming your account.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pwd">Password</Label>
                        <div className="relative">
                          <Input
                            id="pwd"
                            type={showPwd ? 'text' : 'password'}
                            placeholder="At least 8 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-11 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPwd((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-pwd">Confirm password</Label>
                        <div className="relative">
                          <Input
                            id="confirm-pwd"
                            type={showConfirmPwd ? 'text' : 'password'}
                            placeholder="Re-enter your password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="h-11 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPwd((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showConfirmPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {confirmPassword.length > 0 && (
                          <p className={`text-xs flex items-center gap-1 ${password === confirmPassword ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                            {password === confirmPassword ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" /> Passwords match
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3 w-3" /> Passwords don&apos;t match
                              </>
                            )}
                          </p>
                        )}
                      </div>

                      {/* Password strength meter */}
                      <div className="space-y-1.5">
                        <div className="flex gap-1">
                          {[0, 1, 2, 3].map((i) => {
                            const thresholds = [8, 10, 12, 14]
                            const colors = ['bg-destructive', 'bg-cyan-accent', 'bg-primary', 'bg-emerald-500']
                            const reached = password.length >= thresholds[i]
                            return (
                              <div
                                key={i}
                                className={`h-1.5 flex-1 rounded-full transition-colors ${
                                  reached ? colors[i] : 'bg-muted'
                                }`}
                              />
                            )
                          })}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Use 8+ characters with a mix of letters, numbers and symbols.
                        </p>
                      </div>

                      <LoadingButton
                        loading={completing}
                        onClick={handleComplete}
                        className="w-full h-11 rounded-full"
                      >
                        Complete registration
                        <CheckCircle2 className="h-4 w-4" />
                      </LoadingButton>

                      <Button
                        variant="ghost"
                        onClick={() => setStep(2)}
                        className="w-full"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <Separator className="my-6" />
            <p className="text-center text-[11px] text-muted-foreground">
              By continuing you agree to the ULSESA terms & privacy policy.
              <br />
              Need help?{' '}
              <button onClick={() => navigate('help')} className="text-primary hover:underline">
                Visit help center
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthView
