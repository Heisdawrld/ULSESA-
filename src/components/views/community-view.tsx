'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
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
  Trophy,
  Layers,
  FlaskConical,
  Hash,
} from 'lucide-react'

// ===================== Types =====================

interface CommunityGroup {
  id: string
  title: string
  description?: string
  category: string // general | level | department | sports | academic | announcement
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

// ===================== Helpers =====================

const CATEGORIES = [
  { key: 'all', label: 'All', icon: Hash },
  { key: 'general', label: 'General', icon: Sparkles },
  { key: 'level', label: 'Level', icon: Layers },
  { key: 'department', label: 'Department', icon: BookOpen },
  { key: 'sports', label: 'Sports', icon: Trophy },
  { key: 'academic', label: 'Academic', icon: GraduationCap },
  { key: 'announcement', label: 'Announcements', icon: Megaphone },
] as const

function categoryBadgeClass(category: string) {
  switch (category) {
    case 'general':
      return 'bg-cyan-accent/10 text-cyan-accent dark:text-cyan-accent border-cyan-accent/20'
    case 'level':
      return 'bg-primary/10 text-primary border-primary/20'
    case 'department':
      return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
    case 'sports':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    case 'academic':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    case 'announcement':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

function categoryLabel(category: string) {
  const found = CATEGORIES.find((c) => c.key === category)
  return found ? found.label : category
}

function formatMemberCount(count: number) {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
  return String(count)
}

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ===================== Static data =====================

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
    tint: 'from-cyan-accent/20 to-cyan-accent/5 text-cyan-accent dark:text-cyan-accent',
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

// ===================== Sub-components =====================

function CategoryPills({ active, onChange }: { active: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {CATEGORIES.map((c) => {
        const Icon = c.icon
        const isActive = active === c.key
        return (
          <Button
            key={c.key}
            size="sm"
            variant={isActive ? 'default' : 'outline'}
            onClick={() => onChange(c.key)}
            className={cn('rounded-full h-9 px-4', !isActive && 'hover:bg-muted')}
          >
            <Icon className="h-4 w-4" />
            {c.label}
          </Button>
        )
      })}
    </div>
  )
}

function GroupCard({ group, index }: { group: CommunityGroup; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4) }}
    >
      <Card className="h-full rounded-2xl hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 group flex flex-col overflow-hidden">
        <CardContent className="flex flex-col gap-3 h-full">
          <div className="flex items-start justify-between gap-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25D366]/15 text-[#25D366] shrink-0">
              <WhatsAppIcon className="h-6 w-6" />
            </div>
            <Badge variant="outline" className={cn('rounded-full text-[11px] font-semibold capitalize', categoryBadgeClass(group.category))}>
              {categoryLabel(group.category)}
            </Badge>
          </div>

          <h3 className="font-semibold text-base leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {group.title}
          </h3>
          {group.description && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1">
              {group.description}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span className="font-semibold text-foreground tabular-nums">{formatMemberCount(group.memberCount)}</span>
              <span>members</span>
            </div>
          </div>

          <Button
            size="sm"
            asChild
            className="w-full rounded-full mt-1 bg-[#25D366] text-white hover:bg-[#1FB855] border-0"
          >
            <a href={group.whatsappLink} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon className="h-4 w-4" />
              Join Group
            </a>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function GroupSkeleton() {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex flex-col gap-3 h-full">
        <div className="flex items-center justify-between">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-full rounded-full" />
      </CardContent>
    </Card>
  )
}

// ===================== Main view =====================

export function CommunityView() {
  const [groups, setGroups] = useState<CommunityGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCat, setActiveCat] = useState<string>('all')

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
        setError(e instanceof Error ? e.message : 'Failed to load community groups')
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

  const filtered = useMemo(() => {
    if (activeCat === 'all') return groups
    return groups.filter((g) => g.category === activeCat)
  }, [groups, activeCat])

  const totalMembers = useMemo(
    () => groups.reduce((sum, g) => sum + (g.memberCount || 0), 0),
    [groups]
  )

  return (
    <div className="animate-fade-in">
      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-grid pointer-events-none" aria-hidden />
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-64 w-[50rem] rounded-full bg-[#25D366]/20 blur-3xl pointer-events-none" aria-hidden />
        <div className="absolute top-16 right-16 h-32 w-32 rounded-full bg-primary/20 blur-3xl pointer-events-none" aria-hidden />

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
              Connect on <span className="text-gradient-brand">WhatsApp</span> & beyond
            </h1>
            <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-2xl">
              Join official ULSESA WhatsApp groups across all 5 Science Education cohorts, levels, and interests — plus peer support services and student discussions.
            </p>
            {!loading && !error && groups.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground tabular-nums">{groups.length}</span> groups
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-cyan-accent" />
                  <span className="font-semibold text-foreground tabular-nums">{totalMembers.toLocaleString()}</span> total members
                </span>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ===================== TABS ===================== */}
      <section className="container mx-auto px-4 lg:px-6 py-8 md:py-12">
        <Tabs defaultValue="groups" className="gap-6">
          <TabsList className="bg-muted/60 rounded-full p-1 h-auto flex flex-wrap">
            <TabsTrigger value="groups" className="rounded-full px-5 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <WhatsAppIcon className="h-4 w-4" />
              WhatsApp Groups
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

          {/* WHATSAPP GROUPS */}
          <TabsContent value="groups" className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-bold font-display tracking-tight">WhatsApp Community Groups</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {loading ? 'Loading groups…' : `${filtered.length} group${filtered.length === 1 ? '' : 's'} available`}
                </p>
              </div>
              <Badge variant="outline" className="rounded-full bg-[#25D366]/10 text-[#1FB855] border-[#25D366]/30 w-fit">
                <WhatsAppIcon className="h-3 w-3 mr-1" />
                Tap to join on WhatsApp
              </Badge>
            </div>

            <CategoryPills active={activeCat} onChange={setActiveCat} />

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <GroupSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <Card className="rounded-2xl border-dashed">
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  <WhatsAppIcon className="h-9 w-9 mx-auto mb-3 opacity-40 text-[#25D366]" />
                  Couldn&apos;t load community groups right now.
                  <div className="text-xs mt-1 opacity-70">{error}</div>
                </CardContent>
              </Card>
            ) : filtered.length === 0 ? (
              <Card className="rounded-2xl border-dashed">
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  <WhatsAppIcon className="h-9 w-9 mx-auto mb-3 opacity-40 text-[#25D366]" />
                  No groups available in this category.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((g, i) => (
                  <GroupCard key={g.id} group={g} index={i} />
                ))}
              </div>
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
                onClick={() => toast.message('Coming soon', { description: 'Discussion posting will be enabled shortly.' })}
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
                    onClick={() => toast.message('Coming soon', { description: 'Threaded discussions will be available shortly.' })}
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
