'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useNav } from '@/lib/stores/nav-store'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Vote,
  BookOpen,
  GraduationCap,
  Users2,
  ArrowRight,
  Megaphone,
  CalendarDays,
  Clock,
  MapPin,
  Sparkles,
  ShieldCheck,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  FlaskConical,
  Atom,
  Microscope,
  Sigma,
  Leaf,
} from 'lucide-react'

// ===================== Types =====================

interface Announcement {
  id: string
  title: string
  content: string
  category: string // academic | election | event | general
  createdAt: string
}

interface EventItem {
  id: string
  title: string
  description?: string
  date: string
  time: string
  location?: string
  category: string // upcoming | this_week | past
}

// ===================== Helpers =====================

function timeAgo(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function truncate(text: string, n: number) {
  if (!text) return ''
  return text.length > n ? text.slice(0, n).trimEnd() + '…' : text
}

function formatEventDate(iso: string) {
  const d = new Date(iso)
  return {
    day: d.getDate().toString().padStart(2, '0'),
    month: d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
    weekday: d.toLocaleDateString('en-GB', { weekday: 'short' }),
  }
}

function announcementBadgeClass(category: string) {
  switch (category?.toLowerCase()) {
    case 'academic':
      return 'bg-primary/10 text-primary border-primary/20'
    case 'election':
      return 'bg-cyan-accent/15 text-cyan-accent-foreground dark:text-cyan-accent border-cyan-accent/30'
    case 'event':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

// ===================== Static config =====================

const quickAccess = [
  { label: 'Election', desc: 'Vote & candidates', icon: Vote, view: 'elections' as const, tint: 'from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400' },
  { label: 'Courses', desc: 'Browse materials', icon: BookOpen, view: 'academics' as const, tint: 'from-primary/15 to-primary/5 text-primary' },
  { label: 'Results', desc: 'Your dashboard', icon: GraduationCap, view: 'dashboard' as const, tint: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400' },
  { label: 'Community', desc: 'Connect & share', icon: Users2, view: 'community' as const, tint: 'from-cyan-accent/20 to-cyan-accent/5 text-cyan-accent-foreground dark:text-cyan-accent' },
]

const features = [
  { icon: ShieldCheck, title: 'Secure Voting', desc: 'End-to-end verified, anonymous ballots with one-student-one-vote enforcement across all 5 cohorts.' },
  { icon: CheckCircle2, title: 'Verified Identity', desc: 'Matric-based claiming with OTP + ID upload keeps the ULSESA community trusted.' },
  { icon: BarChart3, title: 'Transparent Results', desc: 'Real-time tally with public, auditable records after polls close — built for fair governance.' },
  { icon: Users2, title: 'Science Education Hub', desc: 'Announcements, events, resources and community — unified for Biology, Chemistry, Maths, Physics & Integrated Science Education.' },
]

const cohorts = [
  { name: 'Biology Education', icon: Leaf },
  { name: 'Chemistry Education', icon: FlaskConical },
  { name: 'Mathematics Education', icon: Sigma },
  { name: 'Physics Education', icon: Atom },
  { name: 'Integrated Science Education', icon: Microscope },
]

// ===================== Sub-components =====================

function SectionHeader({
  title,
  icon: Icon,
  actionLabel,
  onAction,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold font-display tracking-tight">{title}</h2>
      </div>
      {actionLabel && (
        <Button variant="ghost" size="sm" onClick={onAction} className="text-primary hover:text-primary">
          {actionLabel}
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

function AnnouncementCard({ a, index }: { a: Announcement; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Card className="h-full rounded-2xl hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group">
        <CardContent className="flex flex-col gap-3 h-full">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${announcementBadgeClass(a.category)}`}>
              {a.category}
            </Badge>
            <span className="text-[11px] text-muted-foreground">{timeAgo(a.createdAt)}</span>
          </div>
          <h3 className="font-semibold text-base leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {a.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
            {truncate(a.content, 140)}
          </p>
          <div className="flex items-center gap-1 text-xs font-medium text-primary mt-1">
            Read more
            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function AnnouncementSkeleton() {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex flex-col gap-3 h-full">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-5 w-5/6" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-20 mt-1" />
      </CardContent>
    </Card>
  )
}

function EventCard({ ev, index }: { ev: EventItem; index: number }) {
  const { day, month, weekday } = formatEventDate(ev.date)
  const isThisWeek = ev.category?.toLowerCase() === 'this_week'
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
    >
      <Card className="rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
        <CardContent className="flex items-center gap-4 py-2">
          {/* Date block */}
          <div className="flex flex-col items-center justify-center min-w-[68px] h-[68px] rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary border border-primary/10">
            <span className="text-2xl font-bold font-display leading-none">{day}</span>
            <span className="text-[10px] font-semibold mt-1">{month}</span>
            <span className="text-[9px] text-muted-foreground">{weekday}</span>
          </div>
          {/* Body */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className={`rounded-full px-2 py-0 text-[10px] font-semibold ${
                  isThisWeek
                    ? 'bg-cyan-accent/15 text-cyan-accent-foreground dark:text-cyan-accent border-cyan-accent/30'
                    : 'bg-primary/10 text-primary border-primary/20'
                }`}
              >
                {isThisWeek ? 'This Week' : 'Upcoming'}
              </Badge>
            </div>
            <h3 className="font-semibold text-base leading-snug truncate">{ev.title}</h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {ev.time}
              </span>
              {ev.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {truncate(ev.location, 32)}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function EventSkeleton() {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex items-center gap-4 py-2">
        <Skeleton className="h-[68px] w-[68px] rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-20 rounded-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </CardContent>
    </Card>
  )
}

// ===================== Main view =====================

export function HomeView() {
  const { navigate } = useNav()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [loadingAnn, setLoadingAnn] = useState(true)
  const [loadingEv, setLoadingEv] = useState(true)
  const [annError, setAnnError] = useState<string | null>(null)
  const [evError, setEvError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    api
      .get<{ announcements: Announcement[] }>('/announcements')
      .then((res) => {
        if (!mounted) return
        const list = (res.announcements || []).slice(0, 6)
        setAnnouncements(list)
        setAnnError(null)
      })
      .catch((e: unknown) => {
        if (!mounted) return
        setAnnError(e instanceof Error ? e.message : 'Failed to load announcements')
        setAnnouncements([])
      })
      .finally(() => mounted && setLoadingAnn(false))
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    api
      .get<{ events: EventItem[] }>('/events')
      .then((res) => {
        if (!mounted) return
        const list = (res.events || []).slice(0, 5)
        setEvents(list)
        setEvError(null)
      })
      .catch((e: unknown) => {
        if (!mounted) return
        setEvError(e instanceof Error ? e.message : 'Failed to load events')
        setEvents([])
      })
      .finally(() => mounted && setLoadingEv(false))
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="animate-fade-in">
      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden border-b border-border/40">
        {/* Grid + dots background */}
        <div className="absolute inset-0 bg-grid pointer-events-none" aria-hidden />
        {/* Brand glows */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-[60rem] rounded-full bg-primary/25 blur-3xl pointer-events-none" aria-hidden />
        <div className="absolute top-32 right-10 h-40 w-40 rounded-full bg-cyan-accent/25 blur-3xl pointer-events-none" aria-hidden />

        <div className="container mx-auto px-4 lg:px-6 relative py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="max-w-4xl mx-auto text-center"
          >
            {/* Logo + badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex justify-center mb-6"
            >
              <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden ring-2 ring-primary/20 shadow-xl shadow-primary/20 glow-primary animate-float">
                <Image
                  src="/ulsesa-logo.jpg"
                  alt="ULSESA Logo"
                  fill
                  className="object-cover"
                  sizes="80px"
                  priority
                />
              </div>
            </motion.div>

            <Badge
              variant="outline"
              className="mb-6 rounded-full glass px-4 py-1.5 text-xs font-medium border-primary/20"
            >
              <Sparkles className="h-3.5 w-3.5 text-cyan-accent mr-1.5" />
              ULSESA • UNILAG
            </Badge>

            <h1 className="font-display font-extrabold tracking-tight text-4xl sm:text-5xl md:text-6xl leading-[1.05]">
              <span className="text-gradient-brand">ULSESA</span>{' '}
              Digital Portal
            </h1>

            <p className="mt-5 text-base md:text-lg text-muted-foreground font-medium">
              <span className="text-foreground/80">One Identity</span>
              <span className="mx-2 text-cyan-accent">•</span>
              <span className="text-foreground/80">One Community</span>
              <span className="mx-2 text-cyan-accent">•</span>
              <span className="text-foreground/80">One Platform</span>
            </p>

            <p className="mt-3 text-sm md:text-base text-cyan-accent-foreground dark:text-cyan-accent font-semibold tracking-wide">
              Shaping Tomorrow&apos;s Scientific Innovators
            </p>

            <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              The official digital operating system of the University of Lagos Science Education Students&apos; Association — Faculty of Education.
              Vote, learn, connect and grow — all in one verified space across 5 departments.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={() => navigate('elections')}
                className="w-full sm:w-auto rounded-full px-7 h-11 text-base shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all bg-brand-gradient"
              >
                <Vote className="h-4.5 w-4.5" />
                Vote Now
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('academics')}
                className="w-full sm:w-auto rounded-full px-7 h-11 text-base glass hover:bg-accent"
              >
                Explore Portal
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick-access cards */}
            <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {quickAccess.map((q, i) => {
                const Icon = q.icon
                return (
                  <motion.button
                    key={q.label}
                    onClick={() => navigate(q.view)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 + i * 0.06 }}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.97 }}
                    className="group text-left"
                  >
                    <Card className="rounded-2xl hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden">
                      <CardContent className="p-5">
                        <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${q.tint} mb-3`}>
                          <Icon className="h-5 w-5" strokeWidth={1.9} />
                        </div>
                        <p className="font-semibold text-base">{q.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{q.desc}</p>
                        <div className="flex items-center gap-1 text-xs font-medium text-primary mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          Open
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===================== ANNOUNCEMENTS ===================== */}
      <section className="container mx-auto px-4 lg:px-6 py-12 md:py-16">
        <SectionHeader
          title="Latest Announcements"
          icon={Megaphone}
          actionLabel="View all"
          onAction={() => navigate('community')}
        />
        {loadingAnn ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <AnnouncementSkeleton key={i} />
            ))}
          </div>
        ) : annError ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-40" />
              We couldn&apos;t load announcements right now.
              <div className="text-xs mt-1 opacity-70">{annError}</div>
            </CardContent>
          </Card>
        ) : announcements.length === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No announcements yet. Check back soon.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {announcements.map((a, i) => (
              <AnnouncementCard key={a.id} a={a} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* ===================== ELECTION COUNTDOWN ===================== */}
      <section className="container mx-auto px-4 lg:px-6 pb-12 md:pb-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative overflow-hidden rounded-[24px] bg-brand-gradient text-primary-foreground shadow-2xl shadow-primary/30">
            {/* Decorative grid + glow */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.2) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
              aria-hidden
            />
            <div className="absolute -top-20 -right-10 h-64 w-64 rounded-full bg-cyan-accent/30 blur-3xl pointer-events-none" aria-hidden />
            <div className="absolute bottom-0 left-1/3 h-32 w-72 rounded-full bg-white/10 blur-3xl pointer-events-none" aria-hidden />

            <div className="relative grid md:grid-cols-2 gap-6 p-6 md:p-10 items-center">
              <div>
                <Badge className="bg-white/15 text-white border-0 mb-4 backdrop-blur">
                  <Vote className="h-3 w-3 mr-1" />
                  ULSESA General Election 2026
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold font-display tracking-tight">
                  Election Countdown
                </h2>
                <p className="mt-2 text-primary-foreground/80 text-sm md:text-base">
                  Voting opens Monday, 8:00 AM. Make your voice count — every verified ULSESA student gets one anonymous ballot per position.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => navigate('elections')}
                    className="bg-white text-primary hover:bg-white/90 rounded-full px-5 h-10"
                  >
                    <Users2 className="h-4 w-4" />
                    View Candidates
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('help')}
                    className="bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white rounded-full px-5 h-10"
                  >
                    Election Guidelines
                  </Button>
                </div>
              </div>

              {/* Countdown display */}
              <div className="flex items-center justify-center md:justify-end">
                <div className="grid grid-cols-2 gap-3 md:gap-4 w-full max-w-sm">
                  {[
                    { label: 'Days', value: '03' },
                    { label: 'Hours', value: '12' },
                    { label: 'Minutes', value: '45' },
                    { label: 'Seconds', value: '30' },
                  ].map((unit) => (
                    <div
                      key={unit.label}
                      className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4 md:p-5 text-center"
                    >
                      <div className="text-3xl md:text-4xl font-bold font-display tabular-nums">
                        {unit.value}
                      </div>
                      <div className="text-[11px] uppercase tracking-wider text-primary-foreground/70 mt-1">
                        {unit.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ===================== COHORTS STRIP ===================== */}
      <section className="container mx-auto px-4 lg:px-6 pb-12 md:pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
        >
          <Card className="rounded-2xl border-border/60 overflow-hidden">
            <div className="bg-brand-gradient-soft p-6 md:p-8">
              <div className="text-center mb-6">
                <Badge variant="outline" className="rounded-full bg-background/70 backdrop-blur border-primary/20 text-primary mb-2">
                  5 Cohorts • One Family
                </Badge>
                <h2 className="text-xl md:text-2xl font-bold font-display tracking-tight">
                  The Departments of ULSESA
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {cohorts.map((c, i) => {
                  const Icon = c.icon
                  return (
                    <motion.div
                      key={c.name}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className="flex flex-col items-center gap-2 rounded-2xl glass p-4 text-center hover:ring-brand transition-all hover:-translate-y-0.5"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <p className="text-xs font-semibold leading-tight">{c.name}</p>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* ===================== UPCOMING EVENTS ===================== */}
      <section className="container mx-auto px-4 lg:px-6 pb-12 md:pb-16">
        <SectionHeader title="Upcoming Events" icon={CalendarDays} />
        {loadingEv ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <EventSkeleton key={i} />
            ))}
          </div>
        ) : evError ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" />
              We couldn&apos;t load events right now.
              <div className="text-xs mt-1 opacity-70">{evError}</div>
            </CardContent>
          </Card>
        ) : events.length === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No upcoming events scheduled.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((ev, i) => (
              <EventCard key={ev.id} ev={ev} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* ===================== FEATURE HIGHLIGHTS ===================== */}
      <section className="container mx-auto px-4 lg:px-6 pb-16 md:pb-24">
        <div className="text-center mb-8">
          <Badge variant="outline" className="rounded-full bg-primary/5 text-primary border-primary/20 mb-3">
            Why ULSESA Portal
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
            Built for a thriving science education community
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
            From verified identity to transparent governance, every feature is engineered to serve Science Education students fairly.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                whileHover={{ y: -4 }}
              >
                <Card className="h-full rounded-2xl hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
                      <Icon className="h-5 w-5" strokeWidth={1.85} />
                    </div>
                    <h3 className="font-semibold text-base">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default HomeView
