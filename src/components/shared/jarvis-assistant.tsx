'use client'

/**
 * ULSESA Intelligence — a "Jarvis-style" interactive assistant.
 *
 * Two layers:
 *
 *  1. FIRST-VISIT BOOT OVERLAY
 *     Shows once per browser (localStorage flag `ulsesa-jarvis-greeted`).
 *     A full-screen glass overlay with an animated arc-reactor orb, a
 *     short "initialising" boot line, then a time-aware typewriter
 *     greeting, and three quick-action buttons. Feels like booting up
 *     an AI assistant. Skipped for already-authenticated students
 *     (they are returning users) and only fires on the home view.
 *
 *  2. PERSISTENT FLOATING ORB
 *     A small pulsing cyan orb fixed bottom-right. Click to open a
 *     compact quick-actions panel with a rotating tip and nav links.
 *     Hidden on the auth (login) and admin views to avoid clutter.
 *
 * Design notes:
 *  - All animations are CSS-driven (see globals.css `jarvis-*` keyframes)
 *    and respect prefers-reduced-motion.
 *  - Time-of-day greeting is computed against Lagos time (UTC+1).
 *  - localStorage access is gated behind useEffect to stay SSR-safe.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNav, type View } from '@/lib/stores/nav-store'
import { useAuth } from '@/lib/stores/auth-store'
import {
  X,
  Vote,
  HelpCircle,
  LogIn,
  Home,
  Sparkles,
  Bot,
  ChevronRight,
} from 'lucide-react'

// ───────────────────────── Constants ─────────────────────────

const GREETING_FLAG = 'ulsesa-jarvis-greeted'
const GREETING_VERSION = '1'

/** Views where the floating orb should NOT appear. */
const ORB_HIDDEN_VIEWS: View[] = ['auth', 'admin']

/** Helpful tips that rotate inside the orb panel. */
const TIPS: string[] = [
  'Voting opens Tuesday at 8:00 AM (Lagos time) and closes at 6:00 PM.',
  'Your password is your matric number + the last 4 letters of your surname.',
  'You can vote for each position exactly once — choices are anonymous.',
  'Read each candidate’s manifesto before you cast your ballot.',
  'Results update live on the Elections page once voting closes.',
  'Locked out after 3 wrong tries? Wait 15 minutes, or chat with us on WhatsApp.',
]

// ───────────────────────── Helpers ─────────────────────────

/** Time-of-day greeting computed against Lagos time (UTC+1). */
function lagosGreeting(): string {
  const now = new Date()
  const lagosHour = (now.getUTCHours() + 1) % 24
  if (lagosHour >= 5 && lagosHour < 12) return 'Good morning'
  if (lagosHour >= 12 && lagosHour < 17) return 'Good afternoon'
  if (lagosHour >= 17 && lagosHour < 22) return 'Good evening'
  return 'Welcome'
}

/** Build the full greeting message that gets typewritten. */
function buildGreeting(): string {
  return `${lagosGreeting()}. I'm the ULSESA digital assistant. The 2026 election is live — sign in with your matric number to meet the candidates and cast your vote. How can I help you get started?`
}

// ───────────────────────── Arc Reactor Orb ─────────────────────────

function ArcReactorOrb({ size = 96 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Expanding rings */}
      <span className="jarvis-ring absolute inset-0 rounded-full" />
      <span className="jarvis-ring jarvis-ring-2 absolute inset-0 rounded-full" />
      <span className="jarvis-ring jarvis-ring-3 absolute inset-0 rounded-full" />

      {/* Outer halo */}
      <div
        className="absolute rounded-full"
        style={{
          inset: -size * 0.15,
          background:
            'radial-gradient(circle, color-mix(in oklch, var(--cyan-accent) 22%, transparent) 0%, transparent 70%)',
        }}
      />

      {/* Rotating conic sweep */}
      <div
        className="jarvis-sweep absolute rounded-full"
        style={{ inset: size * 0.08 }}
      />

      {/* Core */}
      <div
        className="jarvis-orb-core relative rounded-full"
        style={{ width: size * 0.62, height: size * 0.62 }}
      >
        {/* Inner highlight */}
        <span
          className="absolute rounded-full bg-white/40 blur-[2px]"
          style={{
            width: size * 0.18,
            height: size * 0.18,
            top: size * 0.12,
            left: size * 0.14,
          }}
        />
      </div>
    </div>
  )
}

// ───────────────────────── Typewriter ─────────────────────────

/**
 * Reveals `text` one character at a time after `start` becomes true.
 * Returns the visible substring and whether it has finished.
 */
function useTypewriter(text: string, start: boolean, speed = 26) {
  const [count, setCount] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!start) return
    setCount(0)
    setDone(false)
    let i = 0
    const id = setInterval(() => {
      i += 1
      setCount(i)
      if (i >= text.length) {
        clearInterval(id)
        setDone(true)
      }
    }, speed)
    return () => clearInterval(id)
  }, [text, start, speed])

  return { visible: text.slice(0, count), done }
}

// ───────────────────────── Quick Actions ─────────────────────────

interface QuickAction {
  label: string
  description: string
  icon: typeof Vote
  view: View
  subview?: string
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Meet the candidates',
    description: 'Browse all 13 candidates across 7 positions',
    icon: Vote,
    view: 'elections',
    subview: 'candidates',
  },
  {
    label: 'How voting works',
    description: 'Password rule, anonymity, one vote per position',
    icon: HelpCircle,
    view: 'help',
  },
  {
    label: 'Sign in to vote',
    description: 'Matric number + surname suffix',
    icon: LogIn,
    view: 'auth',
  },
]

// ───────────────────────── First-visit Boot Overlay ─────────────────────────

function BootOverlay({ onDismiss }: { onDismiss: () => void }) {
  const { navigate } = useNav()
  const [phase, setPhase] = useState<'booting' | 'greeting'>('booting')
  // Compute the greeting once (lazy initializer) so the typewriter target
  // stays stable across re-renders without recomputing new Date() each time.
  const [greeting] = useState(() => buildGreeting())
  const { visible, done } = useTypewriter(greeting, phase === 'greeting')

  // booting → greeting after a short "initialising" beat
  useEffect(() => {
    if (phase !== 'booting') return
    const id = setTimeout(() => setPhase('greeting'), 1300)
    return () => clearTimeout(id)
  }, [phase])

  // Lock body scroll while the overlay is up
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const handleAction = (action: QuickAction) => {
    onDismiss()
    navigate(action.view, action.subview ?? null)
  }

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="jarvis-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
        onClick={onDismiss}
      />

      {/* Card */}
      <motion.div
        className="glass-strong relative w-full max-w-md overflow-hidden rounded-3xl border border-border/60 p-7 shadow-2xl shadow-primary/20 sm:p-8"
        initial={{ scale: 0.94, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 8, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Scan line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
          <div className="jarvis-scanline h-px w-full" />
        </div>

        {/* Close */}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss assistant"
          className="absolute right-4 top-4 z-10 flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" />
        </button>

        {/* Orb */}
        <div className="flex flex-col items-center pb-2 pt-1">
          <ArcReactorOrb size={104} />

          {/* Status line */}
          <div className="mt-5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-accent">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-accent opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-cyan-accent" />
            </span>
            {phase === 'booting' ? 'Initialising ULSESA Intelligence' : 'System online'}
          </div>
        </div>

        {/* Title */}
        <h2
          id="jarvis-title"
          className="mt-4 text-center font-display text-xl font-bold tracking-tight"
        >
          <span className="text-gradient-brand">ULSESA Intelligence</span>
        </h2>

        {/* Greeting / typewriter */}
        <div className="mt-3 min-h-[5.5rem] text-center">
          <AnimatePresence mode="wait">
            {phase === 'booting' ? (
              <motion.p
                key="booting"
                className="font-mono text-xs text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Calibrating voter register…
                <span className="jarvis-cursor" />
              </motion.p>
            ) : (
              <motion.p
                key="greeting"
                className="text-sm leading-relaxed text-foreground/90"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <span className={!done ? 'jarvis-cursor' : ''}>{visible}</span>
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Quick actions */}
        <AnimatePresence>
          {done && (
            <motion.div
              className="mt-5 space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
            >
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => handleAction(action)}
                  className="group flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card/60 p-3 text-left transition-all hover:border-cyan-accent/50 hover:bg-cyan-accent/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient-soft text-primary ring-1 ring-primary/15 transition-transform group-hover:scale-105">
                    <action.icon className="size-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-tight">
                      {action.label}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {action.description}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-accent" />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dismiss */}
        <AnimatePresence>
          {done && (
            <motion.button
              type="button"
              onClick={onDismiss}
              className="mt-4 w-full rounded-xl py-2 text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              Maybe later
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

// ───────────────────────── Floating Orb + Panel ─────────────────────────

function FloatingOrb() {
  const { view, navigate } = useNav()
  const [open, setOpen] = useState(false)
  const [tipIndex, setTipIndex] = useState(0)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Rotate tips while open
  useEffect(() => {
    if (!open) return
    const id = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length)
    }, 6500)
    return () => clearInterval(id)
  }, [open])

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const go = (action: QuickAction) => {
    setOpen(false)
    navigate(action.view, action.subview ?? null)
  }

  return (
    <div
      ref={popoverRef}
      className="fixed bottom-32 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6"
    >
      <AnimatePresence>
        {open && (
          <motion.div
            className="glass-strong w-[20rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-border/60 shadow-2xl shadow-primary/20"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="relative flex items-center gap-3 border-b border-border/50 bg-brand-gradient-soft p-4">
              <div className="relative size-9 shrink-0">
                <span className="jarvis-ring absolute inset-0 rounded-full" />
                <div className="jarvis-orb-core absolute inset-1.5 rounded-full" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold leading-tight">
                  ULSESA Intelligence
                </p>
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-accent opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-cyan-accent" />
                  </span>
                  Online
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* Rotating tip */}
            <div className="p-4">
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-accent">
                <Sparkles className="size-3" />
                Tip
              </div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={tipIndex}
                  className="text-sm leading-relaxed text-foreground/90"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                >
                  {TIPS[tipIndex]}
                </motion.p>
              </AnimatePresence>

              {/* Tip dots */}
              <div className="mt-3 flex gap-1">
                {TIPS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setTipIndex(i)}
                    aria-label={`Show tip ${i + 1}`}
                    className={`h-1 rounded-full transition-all ${
                      i === tipIndex
                        ? 'w-5 bg-cyan-accent'
                        : 'w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div className="border-t border-border/50 p-2">
              <button
                type="button"
                onClick={() => go({ label: 'Home', description: '', icon: Home, view: 'home' })}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60"
              >
                <Home className="size-4 text-muted-foreground" />
                <span className="flex-1 font-medium">Home</span>
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </button>
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => go(action)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60"
                >
                  <action.icon className="size-4 text-muted-foreground" />
                  <span className="flex-1 font-medium">{action.label}</span>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The orb button */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close ULSESA assistant' : 'Open ULSESA assistant'}
        aria-expanded={open}
        className="group relative flex size-14 items-center justify-center rounded-full shadow-xl shadow-primary/30 transition-transform hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 200, damping: 18 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
      >
        {/* Expanding ring */}
        <span className="jarvis-ring absolute inset-0 rounded-full" />
        {/* Halo */}
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle, color-mix(in oklch, var(--cyan-accent) 30%, transparent) 0%, transparent 70%)',
          }}
        />
        {/* Core */}
        <div className="jarvis-orb-core relative size-10 rounded-full">
          <Bot className="absolute inset-0 m-auto size-5 text-white drop-shadow" />
        </div>

        {/* Pulse ping when closed (subtle attention nudge) */}
        {!open && (
          <span className="absolute -right-0.5 -top-0.5 flex size-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-accent opacity-60" />
            <span className="relative inline-flex size-3 rounded-full bg-cyan-accent ring-2 ring-background" />
          </span>
        )}
      </motion.button>
    </div>
  )
}

// ───────────────────────── Root Component ─────────────────────────

export function JarvisAssistant() {
  const { view } = useNav()
  const [showBoot, setShowBoot] = useState(false)
  const [checked, setChecked] = useState(false)

  // Decide whether to show the first-visit boot overlay.
  // Only on the home view, only for non-authenticated visitors, only once.
  useEffect(() => {
    const isAuthed = useAuth.getState().isAuthenticated()
    if (isAuthed) {
      setChecked(true)
      return
    }
    let seen = false
    try {
      seen = localStorage.getItem(GREETING_FLAG) === GREETING_VERSION
    } catch {
      // localStorage unavailable (private mode) — treat as not seen,
      // but we won't be able to persist the flag, so just show once per session.
    }
    if (seen) {
      setChecked(true)
      return
    }
    // Only auto-trigger on the home view.
    if (view !== 'home') {
      setChecked(true)
      return
    }
    const id = setTimeout(() => {
      setShowBoot(true)
      setChecked(true)
    }, 900)
    return () => clearTimeout(id)
  }, [view])

  const dismissBoot = useCallback(() => {
    setShowBoot(false)
    try {
      localStorage.setItem(GREETING_FLAG, GREETING_VERSION)
    } catch {
      // ignore
    }
  }, [])

  const orbVisible = checked && !ORB_HIDDEN_VIEWS.includes(view) && !showBoot

  return (
    <>
      <AnimatePresence>
        {showBoot && <BootOverlay onDismiss={dismissBoot} />}
      </AnimatePresence>
      {orbVisible && <FloatingOrb />}
    </>
  )
}

export default JarvisAssistant
