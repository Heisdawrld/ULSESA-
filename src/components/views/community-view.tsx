'use client'

import { useEffect, useState, useCallback } from 'react'
import type { SVGProps } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  Users,
  GraduationCap,
  HeartHandshake,
  BookOpen,
  School,
  MessageCircle,
  Sparkles,
  UserCircle,
  ArrowRight,
  PlusCircle,
  Megaphone,
  Bell,
  Users2,
  ShieldCheck,
} from 'lucide-react'

// ===================== Types =====================

interface CommunityGroup {
  id: string
  title: string
  description?: string
  category: string
  whatsappLink: string
  memberCount: number
  createdAt?: string
}

// ===================== WhatsApp Brand Icon =====================

function WhatsAppIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.83 9.83 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413Z" />
    </svg>
  )
}

// ===================== Static data =====================

// Feature cards explaining what's inside the official ULSESA WhatsApp Community
const COMMUNITY_FEATURES = [
  {
    icon: Users2,
    title: 'All 5 Cohorts',
    desc: 'Biology, Chemistry, Mathematics, Physics & Integrated Science Education — every ULSESA student under one roof.',
    tint: 'from-primary/15 to-primary/5 text-primary',
  },
  {
    icon: Megaphone,
    title: 'Announcements',
    desc: 'ULSESA news, election updates, event reminders, and deadline alerts the moment they drop.',
    tint: 'from-cyan-accent/20 to-cyan-accent/5 text-cyan-accent',
  },
  {
    icon: Bell,
    title: 'Departmental Updates',
    desc: 'Faculty notices, exam schedules, registration windows, and Teaching Practice info — straight from the source.',
    tint: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400',
  },
  {
    icon: MessageCircle,
    title: 'Stay Connected',
    desc: 'Ask questions, share notes, find study partners, and keep in touch across levels and cohorts.',
    tint: 'from-purple-500/15 to-purple-500/5 text-purple-600 dark:text-purple-400',
  },
]

const SERVICES = [
  {
    icon: GraduationCap,
    title: 'Peer Tutoring',
    desc: 'Get matched with senior students offering free tutoring across all 5 Science Education departments — Biology, Chemistry, Mathematics, Physics, and Integrated Science.',
    tint: 'from-primary/15 to-primary/5 text-primary',
    cta: 'Request a tutor',
  },
  {
    icon: HeartHandshake,
    title: 'Mentorship Program',
    desc: 'Connect with ULSESA alumni and faculty mentors for guidance on teaching careers, postgraduate studies, and education research opportunities.',
    tint: 'from-cyan-accent/20 to-cyan-accent/5 text-cyan-accent',
    cta: 'Find a mentor',
  },
  {
    icon: Users,
    title: 'Study Groups',
    desc: 'Join or form study groups by course, level, or department. Collaborate, share notes, and prepare for exams together with fellow ULSESA members.',
    tint: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400',
    cta: 'Browse groups',
  },
  {
    icon: School,
    title: 'Teaching Practice Support',
    desc: 'Get help with lesson planning, classroom management, and teaching practice assessments from peers who have completed their TP year.',
    tint: 'from-purple-500/15 to-purple-500/5 text-purple-600 dark:text-purple-400',
    cta: 'Get support',
  },
]

const DISCUSSIONS = [
  { id: '1', title: 'Best approach to teaching genetics in secondary schools?', author: 'Adaeze Okoro', replies: 14, lastActivity: '2h ago', tag: 'BED 301' },
  { id: '2', title: 'Quantum Mechanics teaching strategies — who has tips?', author: 'Dawrld Olamide', replies: 23, lastActivity: '5h ago', tag: 'PED 301' },
  { id: '3', title: 'Teaching Practice year — survival guide for 400-level', author: 'Fatima Ibrahim', replies: 19, lastActivity: '8h ago', tag: 'TP' },
  { id: '4', title: 'Physical Chemistry past question patterns?', author: 'Chidi Eze', replies: 11, lastActivity: '1d ago', tag: 'CED 301' },
  { id: '5', title: 'ULSESA Career Talk: EdTech opportunities for science educators', author: 'Tunde Bello', replies: 31, lastActivity: '3d ago', tag: 'Careers' },
]

// ===================== Helpers =====================

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ===================== Sub-components =====================

function HeroSkeleton() {
  return (
    <Card className="rounded-3xl overflow-hidden">
      <CardContent className="grid md:grid-cols-[auto_1fr] gap-6 p-6 md:p-10">
        <Skeleton className="h-24 w-24 rounded-3xl" />
        <div className="space-y-4">
          <Skeleton className="h-5 w-40 rounded-full" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-12 w-56 rounded-full mt-4" />
        </div>
      </CardContent>
    </Card>
  )
}

function FeatureSkeleton() {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex flex-col gap-3 h-full">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </CardContent>
    </Card>
  )
}

// ===================== Main view =====================

export function CommunityView() {
  const [groups, setGroups] = useState<CommunityGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGroups = useCallback(() => {
    let mounted = true
    setLoading(true)
    api
      .get<{ groups: CommunityGroup[] }>('/community')
      .then((res) => {
        if (!mounted) return
        setGroups(res.groups || [])
        setError(null)
      })
      .catch((e: unknown) => {
        if (!mounted) return
        setError(e instanceof Error ? e.message : 'Failed to load community')
        setGroups([])
      })
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    return fetchGroups()
  }, [fetchGroups])

  // The single official ULSESA community (first group from API)
  const community = groups[0]

  return (
    <div className="animate-fade-in">
      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-grid pointer-events-none" aria-hidden />
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-64 w-[50rem] rounded-full bg-[#25D366]/20 blur-3xl pointer-events-none" aria-hidden />
        <div className="absolute top-16 right-16 h-32 w-32 rounded-full bg-cyan-accent/25 blur-3xl pointer-events-none" aria-hidden />

        <div className="container mx-auto px-4 lg:px-6 relative py-12 md:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <Badge variant="outline" className="mb-4 rounded-full bg-background/70 backdrop-blur px-3 py-1 border-[#25D366]/30">
              <WhatsAppIcon className="h-3.5 w-3.5 text-[#25D366] mr-1.5" />
              ULSESA Community Hub
            </Badge>
            <h1 className="font-display font-extrabold tracking-tight text-3xl sm:text-4xl md:text-5xl leading-tight">
              One <span className="text-gradient-brand">Community</span>, Every ULSESA Student
            </h1>
            <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-2xl">
              The entire ULSESA department — all 5 Science Education cohorts — lives under a single official WhatsApp Community. Join it once and stay connected to announcements, discussions, and peer support.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ===================== TABS ===================== */}
      <section className="container mx-auto px-4 lg:px-6 py-8 md:py-12">
        <Tabs defaultValue="connect" className="gap-6">
          <TabsList className="bg-muted/60 rounded-full p-1 h-auto flex flex-wrap">
            <TabsTrigger value="connect" className="rounded-full px-5 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <WhatsAppIcon className="h-4 w-4" />
              Connect
            </TabsTrigger>
            <TabsTrigger value="services" className="rounded-full px-5 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <HeartHandshake className="h-4 w-4" />
              Student Services
            </TabsTrigger>
            <TabsTrigger value="discussions" className="rounded-full px-5 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <MessageCircle className="h-4 w-4" />
              Discussions
            </TabsTrigger>
          </TabsList>

          {/* CONNECT TAB — single official WhatsApp Community */}
          <TabsContent value="connect" className="space-y-8 animate-fade-in">
            {loading ? (
              <div className="space-y-8">
                <HeroSkeleton />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <FeatureSkeleton key={i} />
                  ))}
                </div>
              </div>
            ) : error ? (
              <Card className="rounded-2xl border-dashed">
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  <WhatsAppIcon className="h-9 w-9 mx-auto mb-3 opacity-40 text-[#25D366]" />
                  Couldn&apos;t load the ULSESA Community right now.
                  <div className="text-xs mt-1 opacity-70">{error}</div>
                  <Button variant="outline" size="sm" className="mt-4 rounded-full" onClick={fetchGroups}>
                    Try again
                  </Button>
                </CardContent>
              </Card>
            ) : community ? (
              <>
                {/* === Hero community card === */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card className="relative overflow-hidden rounded-3xl border-[#25D366]/25 shadow-xl shadow-[#25D366]/10">
                    {/* Subtle gradient backdrop */}
                    <div className="absolute inset-0 bg-brand-gradient-soft pointer-events-none" aria-hidden />
                    <div className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-[#25D366]/20 blur-3xl pointer-events-none" aria-hidden />
                    <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-cyan-accent/15 blur-3xl pointer-events-none" aria-hidden />

                    <CardContent className="relative grid md:grid-cols-[auto_1fr] gap-6 md:gap-8 p-6 md:p-10 items-center">
                      {/* Glowing WhatsApp icon */}
                      <motion.div
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="mx-auto md:mx-0 flex h-24 w-24 md:h-28 md:w-28 items-center justify-center rounded-3xl bg-[#25D366] text-white shadow-2xl shadow-[#25D366]/40 glow-cyan"
                      >
                        <WhatsAppIcon className="h-14 w-14 md:h-16 md:w-16" />
                      </motion.div>

                      <div className="flex flex-col gap-4 text-center md:text-left">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                          <Badge className="rounded-full bg-[#25D366]/15 text-[#1FB855] border border-[#25D366]/30 hover:bg-[#25D366]/20">
                            <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                            Official ULSESA
                          </Badge>
                          <Badge variant="outline" className="rounded-full bg-background/80 backdrop-blur">
                            <Users className="h-3.5 w-3.5 mr-1 text-cyan-accent" />
                            {community.memberCount.toLocaleString()}+ members
                          </Badge>
                        </div>

                        <div>
                          <h2 className="font-display font-extrabold text-2xl md:text-4xl tracking-tight leading-tight">
                            {community.title}
                          </h2>
                          {community.description && (
                            <p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto md:mx-0">
                              {community.description}
                            </p>
                          )}
                        </div>

                        {/* Prominent Join CTA */}
                        <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 pt-2">
                          <Button
                            asChild
                            size="lg"
                            className="w-full sm:w-auto rounded-full h-14 px-8 text-base font-semibold bg-[#25D366] text-white hover:bg-[#1FB855] border-0 shadow-lg shadow-[#25D366]/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                          >
                            <a href={community.whatsappLink} target="_blank" rel="noopener noreferrer">
                              <WhatsAppIcon className="h-5 w-5" />
                              Join the Community
                              <ArrowRight className="h-4 w-4" />
                            </a>
                          </Button>
                          <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-cyan-accent" />
                            Free • One tap • All cohorts
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* === What's inside? === */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold font-display tracking-tight">
                      What&apos;s inside?
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Joining the ULSESA WhatsApp Community connects you to everything — instantly.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {COMMUNITY_FEATURES.map((f, i) => {
                      const Icon = f.icon
                      return (
                        <motion.div
                          key={f.title}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.15 + i * 0.08 }}
                        >
                          <Card className="h-full rounded-2xl hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                            <CardContent className="flex flex-col gap-3 h-full">
                              <div className={cn('inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br shrink-0', f.tint)}>
                                <Icon className="h-6 w-6" strokeWidth={1.75} />
                              </div>
                              <h4 className="font-semibold text-base leading-snug">{f.title}</h4>
                              <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                                {f.desc}
                              </p>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              </>
            ) : (
              <Card className="rounded-2xl border-dashed">
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  <WhatsAppIcon className="h-9 w-9 mx-auto mb-3 opacity-40 text-[#25D366]" />
                  No community is available right now. Please check back soon.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* STUDENT SERVICES */}
          <TabsContent value="services" className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl md:text-2xl font-bold font-display tracking-tight">Student Services</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Programs and peer-support initiatives offered by ULSESA for all Science Education students.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SERVICES.map((s, i) => {
                const Icon = s.icon
                return (
                  <motion.div
                    key={s.title}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                  >
                    <Card className="h-full rounded-2xl hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
                      <CardContent className="flex flex-col sm:flex-row gap-4 h-full">
                        <div className={cn('inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br shrink-0', s.tint)}>
                          <Icon className="h-7 w-7" strokeWidth={1.75} />
                        </div>
                        <div className="flex-1 flex flex-col">
                          <h3 className="font-semibold text-lg leading-snug">{s.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed mt-1 flex-1">
                            {s.desc}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toast.message('Coming soon', { description: `${s.title} sign-ups open after the ULSESA election.` })}
                            className="rounded-full w-fit mt-3"
                          >
                            {s.cta}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </TabsContent>

          {/* DISCUSSIONS */}
          <TabsContent value="discussions" className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-bold font-display tracking-tight">Discussions</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Join the conversation — {DISCUSSIONS.length} active topics across ULSESA.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => toast.message('Coming soon', { description: 'Threaded discussions will be available shortly — for now, chat in the WhatsApp Community.' })}
                className="rounded-full w-fit"
              >
                <PlusCircle className="h-4 w-4" />
                Start Discussion
              </Button>
            </div>

            <Card className="rounded-2xl overflow-hidden">
              <CardContent className="p-0 divide-y divide-border/60">
                {DISCUSSIONS.map((d, i) => (
                  <motion.button
                    key={d.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    onClick={() => toast.message('Coming soon', { description: 'Threaded discussions will be available shortly — for now, chat in the WhatsApp Community.' })}
                    className="w-full text-left flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors group"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                        {initials(d.author)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="rounded-full text-[10px] font-mono">
                          {d.tag}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">{d.lastActivity}</span>
                      </div>
                      <div className="font-semibold text-sm leading-snug mt-1 group-hover:text-primary transition-colors line-clamp-1">
                        {d.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <UserCircle className="h-3 w-3" />
                        {d.author}
                      </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-center gap-0.5 px-3 shrink-0">
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-semibold tabular-nums">{d.replies}</span>
                      <span className="text-[10px] text-muted-foreground">replies</span>
                    </div>
                  </motion.button>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  )
}

export default CommunityView
