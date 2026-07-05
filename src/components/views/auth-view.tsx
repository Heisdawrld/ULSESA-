'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useNav } from '@/lib/stores/nav-store'
import { useAuth, type StudentUser } from '@/lib/stores/auth-store'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { supportWhatsAppUrl, SUPPORT_MESSAGES } from '@/lib/support'
import {
  PASSWORD_RULE_HINT,
  PASSWORD_RULE_EXAMPLE,
} from '@/lib/password-generator'
import {
  ShieldCheck,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  Atom,
  Leaf,
  FlaskConical,
  Sigma,
  Microscope,
  Info,
  Lightbulb,
  KeyRound,
  ChevronDown,
  MessageCircle,
} from 'lucide-react'

// ===================== Types =====================

interface LoginResponse {
  student: StudentUser
  token: string
  message: string
}

// BrandPanel takes this; only 'signin' is used now (the claim flow is gone).
type Mode = 'claim' | 'signin'

// ===================== Constants =====================

const COHORTS = [
  { name: 'Physics', icon: Atom },
  { name: 'Biology', icon: Leaf },
  { name: 'Chemistry', icon: FlaskConical },
  { name: 'Mathematics', icon: Sigma },
  { name: 'Integrated Sci.', icon: Microscope },
] as const

// ===================== Brand Panel (desktop only) =====================
// Kept verbatim from the prior design — desktop-only royal-blue/cyan
// branding panel. Always rendered with mode="signin" now that the claim
// flow is gone.

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
        <span>Secured by ULSESA · Only pre-registered members can vote</span>
      </div>
    </div>
  )
}

// ===================== Student Login (pre-set password) =====================

interface StudentLoginProps {
  onAuthSuccess: (student: StudentUser, token: string, message: string) => void
}

/**
 * Pre-set password login.
 *
 * Students sign in with matric + a password that was generated for them at
 * upload time using the rule:
 *   password = matricNumber + last4(lowercase(surname))
 *
 * The hint box makes the rule explicit so real students know what to type.
 * An attacker still needs to know the target's name as it appears on the
 * attendance list to construct the password — combined with the per-matric
 * 5-attempt lockout, that's enough for an election-day portal.
 *
 * API contract (POST /api/auth/login):
 *   200 → { student, token, message }
 *   401 → { error, remaining }            wrong password (attempts left)
 *   404 → { error }                        matric not in voter register
 *   429 → { error, locked, retryAfter }    locked (5 fails) or IP cooldown
 */
function StudentLogin({ onAuthSuccess }: StudentLoginProps) {
  const [matric, setMatric] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  // Alert banner shown when the matric is locked (429). The matric input
  // stays editable so the student can try a different one — changing it
  // clears the lock banner.
  const [lockedAlert, setLockedAlert] = useState<string | null>(null)
  // Inline red error for 401/404/generic. Cleared on any input change.
  const [inlineError, setInlineError] = useState<string | null>(null)

  const isLocked = lockedAlert !== null

  /**
   * Build a WhatsApp support link pre-filled with the matric the student is
   * currently trying, so the support person can look them up faster.
   * Uses SUPPORT_MESSAGES.account as the friendly opener (already templated
   * with the right greeting), then adds the specific "can't log in" context.
   */
  function buildWhatsAppUrl() {
    const matricSnippet = matric.trim()
      ? ` My matric is ${matric.trim()}.`
      : ''
    const msg = `${SUPPORT_MESSAGES.account}${matricSnippet} I can't log in to vote — I'm not sure of the exact spelling of my surname as it appears on my class attendance list. The name on my list is: `
    return supportWhatsAppUrl(msg)
  }

  function clearTransientErrors() {
    setInlineError(null)
    setLockedAlert(null)
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    clearTransientErrors()

    const cleanedMatric = matric.trim().replace(/[^0-9]/g, '')
    if (!cleanedMatric) {
      setInlineError('Enter your 9-digit matric number to continue.')
      return
    }
    if (cleanedMatric.length !== 9) {
      setInlineError('Matric number must be exactly 9 digits.')
      return
    }
    if (!password) {
      setInlineError('Enter your password. (Hint: it uses your matric + surname.)')
      return
    }

    setLoading(true)
    try {
      const data = await api.post<LoginResponse>('/auth/login', {
        matricNumber: cleanedMatric,
        password,
      })
      onAuthSuccess(data.student, data.token, data.message)
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Sign in failed. Please try again.'

      // 404 — matric not in voter register. Keep matric filled so they can
      // double-check the digits; clear the password (it's wrong anyway).
      if (/not in the .*voter register/i.test(msg)) {
        setInlineError(msg)
        setPassword('')
        toast.error('Matric not found', {
          description:
            'Check the digits, or contact your class rep if you think this is a mistake.',
        })
        return
      }

      // 429 — matric locked after 5 wrong attempts, or IP cooldown. Show
      // the lock banner prominently with a lock icon.
      if (/is now locked|too many failed attempts from your device/i.test(msg)) {
        setLockedAlert(msg)
        setPassword('')
        toast.error('Account temporarily locked', {
          description: 'Try again later or contact ULSESA support.',
        })
        return
      }

      // 401 — wrong password, attempts remaining. Keep the matric filled,
      // clear the password so they can retype it.
      if (
        /attempts remaining|next failed attempt|wrong password|wrong matric/i.test(
          msg
        )
      ) {
        setInlineError(msg)
        setPassword('')
        toast.error('Wrong password', {
          description:
            'Remember: matric + last 4 letters of your surname (lowercase).',
        })
        return
      }

      // Fallback (500, network, unexpected)
      setInlineError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-strong overflow-hidden rounded-3xl border border-border/60 p-6 shadow-2xl shadow-primary/5 sm:p-8">
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            Sign in to vote
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use your matric number and your pre-set password to access the ULSESA portal.
          </p>
        </div>

        {/* ─── Password rule hint box (prominent, friendly) ─── */}
        <Alert className="border-cyan-accent/30 bg-cyan-accent/5 text-foreground">
          <Lightbulb className="text-cyan-accent" />
          <AlertTitle className="text-foreground">
            What&apos;s my password?
          </AlertTitle>
          <AlertDescription className="text-muted-foreground">
            <p>{PASSWORD_RULE_HINT}</p>
            <p className="mt-1.5 rounded-md bg-cyan-accent/10 px-2.5 py-1.5 font-mono text-xs text-cyan-accent-foreground dark:text-cyan-accent">
              {PASSWORD_RULE_EXAMPLE}
            </p>
            <p className="mt-1.5 text-xs">
              Your <strong>surname</strong> is the{' '}
              <em>first word</em> of your name as it appears on your class
              attendance list (Nigerian convention:{' '}
              <span className="font-mono">SURNAME FirstName Middle</span>).
            </p>
          </AlertDescription>
        </Alert>

        {/* ─── Locked banner (429) ─── */}
        <AnimatePresence initial={false}>
          {isLocked && lockedAlert && (
            <motion.div
              key="locked-alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <Alert variant="destructive">
                <Lock />
                <AlertTitle>This matric is temporarily locked</AlertTitle>
                <AlertDescription>{lockedAlert}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Inline error (401 / 404 / generic) ─── */}
        <AnimatePresence initial={false}>
          {inlineError && !isLocked && (
            <motion.div
              key="inline-error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{inlineError}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Form ─── */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="signin-matric" className="text-sm font-medium">
              Matric number
            </Label>
            <Input
              id="signin-matric"
              inputMode="numeric"
              autoComplete="username"
              placeholder="e.g. 230315001"
              value={matric}
              onChange={(e) => {
                setMatric(e.target.value.replace(/[^0-9]/g, '').slice(0, 9))
                clearTransientErrors()
              }}
              className="h-12 rounded-xl text-base tracking-wider"
              disabled={loading}
              maxLength={9}
              aria-describedby="signin-matric-help"
            />
            <p id="signin-matric-help" className="text-xs text-muted-foreground">
              9 digits, exactly as on your student ID. No slashes or spaces.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signin-password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Input
                id="signin-password"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Your pre-set password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  clearTransientErrors()
                }}
                className="h-12 rounded-xl pr-12 text-base"
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
          </div>

          <Button
            type="submit"
            size="lg"
            className="h-12 w-full rounded-xl text-base font-semibold"
            disabled={loading || isLocked || !matric || !password}
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
        </form>

        {/* ─── Can't log in? — collapsible help ─── */}
        <Collapsible open={showHelp} onOpenChange={setShowHelp}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <KeyRound className="size-3.5" />
              Can&apos;t log in?
              <ChevronDown
                className={`size-3.5 transition-transform ${showHelp ? 'rotate-180' : ''}`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1">
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-3 rounded-xl border border-border bg-muted/30 p-4"
            >
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 size-4 shrink-0 text-cyan-accent" />
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <p>
                    <span className="font-semibold text-foreground">
                      Password reminder:
                    </span>{' '}
                    {PASSWORD_RULE_HINT}
                  </p>
                  <p className="font-mono text-cyan-accent-foreground dark:text-cyan-accent">
                    {PASSWORD_RULE_EXAMPLE}
                  </p>
                  <p>
                    Make sure your surname spelling matches exactly what&apos;s
                    on your class attendance list. Hyphens and apostrophes are
                    ignored — only letters count.
                  </p>
                  <p>
                    Your surname is the <strong>first word</strong> of the name
                    on the register (e.g.{' '}
                    <span className="font-mono">BELLO Aisha Mohammed</span>{' '}
                    → surname is <strong>BELLO</strong> → last 4 ={' '}
                    <code className="rounded bg-muted px-1 py-0.5">ello</code>).
                  </p>
                  <p>
                    If your name on the register has unusual spelling,
                    abbreviations, or you&apos;re not sure how it was entered,
                    reach out and we&apos;ll help you figure it out.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <a
                  href={buildWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1FB855] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
                >
                  <MessageCircle className="size-4" />
                  Chat on WhatsApp
                </a>
              </div>

              <p className="text-center text-[11px] text-muted-foreground">
                Or email{' '}
                <a
                  href="mailto:ulsesa01@gmail.com"
                  className="font-medium text-primary hover:underline"
                >
                  ulsesa01@gmail.com
                </a>
              </p>
            </motion.div>
          </CollapsibleContent>
        </Collapsible>

        {/* ─── Footer security note ─── */}
        <div className="flex items-start gap-2 rounded-xl bg-muted/30 p-3">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            After 5 wrong attempts, this matric is locked for 15 minutes. One
            account per student — your vote is anonymous and tied to your
            matric only.
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

  // If already authenticated, send to dashboard
  useEffect(() => {
    if (useAuth.getState().isAuthenticated()) {
      navigate('dashboard')
    }
  }, [navigate])

  function handleAuthSuccess(
    student: StudentUser,
    token: string,
    message: string
  ) {
    setStudent(student, token)
    if (message) {
      toast.success(message)
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
          <BrandPanel mode="signin" />

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

            <StudentLogin onAuthSuccess={handleAuthSuccess} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthView
