'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { toast } from 'sonner'
import {
  Vote,
  Shield,
  Users,
  Eye,
  FileCheck,
  Clock,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Loader2,
  BarChart3,
  Crown,
  Lock,
  User,
  Sparkles,
  Trophy,
  RefreshCw,
  Quote,
  PartyPopper,
  TrendingUp,
} from 'lucide-react'

import { useNav } from '@/lib/stores/nav-store'
import { useAuth } from '@/lib/stores/auth-store'
import { api } from '@/lib/api-client'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// ============ Types ============
interface Candidate {
  id: string
  name: string
  manifesto: string | null
  level: string | null
  programme: string | null
  bio: string | null
  voteCount: number
}

interface Position {
  id: string
  title: string
  description: string | null
  order: number
  candidates: Candidate[]
}

interface ElectionData {
  election: {
    id: string
    title: string
    description: string | null
    status: string // 'upcoming' | 'active' | 'ended' | 'cancelled'
    startDate: string
    endDate: string
  }
  positions: Position[]
  hasVoted: Record<string, boolean>
}

interface ResultsCandidate {
  name: string
  voteCount: number
}
interface ResultsPosition {
  id: string
  title: string
  candidates: ResultsCandidate[]
}
interface ResultsData {
  positions: ResultsPosition[]
  totalVotes: number
  totalEligible: number
  turnout: number
}

type Subview = 'home' | 'candidates' | 'vote' | 'results'

// ============ Helpers ============
function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const AVATAR_GRADIENTS = [
  'from-primary to-primary/70',
  'from-emerald-500 to-emerald-700',
  'from-cyan-accent to-teal-600',
  'from-purple-500 to-purple-700',
  'from-rose-500 to-rose-700',
  'from-cyan-500 to-cyan-700',
]
function getAvatarGradient(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[idx]
}

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

interface Countdown {
  hours: number
  minutes: number
  seconds: number
  total: number
  isPast: boolean
}

function computeRemaining(targetDate: string | null): Countdown {
  if (!targetDate) return { hours: 0, minutes: 0, seconds: 0, total: 0, isPast: true }
  const diff = new Date(targetDate).getTime() - Date.now()
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, total: 0, isPast: true }
  const totalSeconds = Math.floor(diff / 1000)
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    total: diff,
    isPast: false,
  }
}

function useCountdown(targetDate: string | null): Countdown {
  const [remaining, setRemaining] = useState<Countdown>(() => computeRemaining(targetDate))
  useEffect(() => {
    setRemaining(computeRemaining(targetDate))
    if (!targetDate) return
    const id = setInterval(() => setRemaining(computeRemaining(targetDate)), 1000)
    return () => clearInterval(id)
  }, [targetDate])
  return remaining
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'upcoming':
      return 'Voting Starts Soon'
    case 'active':
      return 'Voting Open'
    case 'ended':
      return 'Voting Ended'
    case 'cancelled':
      return 'Cancelled'
    default:
      return status
  }
}

const TRANSPARENCY_FEATURES = [
  {
    icon: Lock,
    title: 'Anonymous Ballots',
    desc: 'Your identity is never linked to your vote',
  },
  {
    icon: FileCheck,
    title: 'Audit Trail',
    desc: 'Every vote is recorded on a tamper-proof log',
  },
  {
    icon: Users,
    title: 'Public Turnout',
    desc: 'Live turnout visible to all students',
  },
  {
    icon: Shield,
    title: 'Verified Voters Only',
    desc: 'Only department-verified students can vote',
  },
]

// ============ Main Component ============
export function ElectionsView() {
  const { navigate } = useNav()
  const { student } = useAuth()
  const [subview, setSubview] = useState<Subview>('home')

  // ---- Not signed in ----
  if (!student) {
    return (
      <div className="container mx-auto px-4 lg:px-6 py-12 lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto"
        >
          <Card className="rounded-2xl border-border/60 text-center overflow-hidden">
            <div className="bg-gradient-to-br from-primary to-primary/80 p-8 text-primary-foreground">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mb-4">
                <Vote className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold font-display">Election Portal</h2>
              <p className="text-sm text-primary-foreground/80 mt-2">
                Sign in to view candidates and cast your vote
              </p>
            </div>
            <CardContent className="pt-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                Only verified ULSESA students can participate in the election.
              </p>
              <Button
                onClick={() => navigate('auth')}
                className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Sign In to Vote
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('home')}
                className="w-full text-muted-foreground"
              >
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // ---- Not verified ----
  if (!student.isVerified) {
    return (
      <div className="container mx-auto px-4 lg:px-6 py-12 lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto"
        >
          <Card className="rounded-2xl border-cyan-accent/40 bg-cyan-accent/5 text-center overflow-hidden">
            <div className="bg-gradient-to-br from-cyan-accent/20 to-cyan-accent/5 p-8 border-b border-cyan-accent/20">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-cyan-accent/15 text-cyan-accent flex items-center justify-center mb-4">
                <Shield className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold font-display">Verification Required</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Only verified students can vote in the election
              </p>
            </div>
            <CardContent className="pt-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                Your account is currently pending verification by department administrators. Once
                approved, you&apos;ll be able to view candidates and cast your vote.
              </p>
              <Button
                onClick={() => navigate('dashboard')}
                className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Check Verification Status
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('home')}
                className="w-full text-muted-foreground"
              >
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // ---- Verified student: show election module ----
  return (
    <div className="container mx-auto px-4 lg:px-6 py-6 lg:py-8 animate-fade-in">
      <SubViewNav subview={subview} setSubview={setSubview} />
      <AnimatePresence mode="wait">
        <motion.div
          key={subview}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="mt-6"
        >
          {subview === 'home' && <ElectionHome onNavigate={setSubview} />}
          {subview === 'candidates' && <CandidatesView />}
          {subview === 'vote' && <VoteFlow />}
          {subview === 'results' && <ResultsView />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ============ Sub-View Navigation ============
function SubViewNav({
  subview,
  setSubview,
}: {
  subview: Subview
  setSubview: (v: Subview) => void
}) {
  const items: { id: Subview; label: string; icon: typeof Sparkles }[] = [
    { id: 'home', label: 'Overview', icon: Sparkles },
    { id: 'candidates', label: 'Candidates', icon: Users },
    { id: 'vote', label: 'Vote', icon: Vote },
    { id: 'results', label: 'Results', icon: BarChart3 },
  ]
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-1 -mb-1">
      {items.map((item) => {
        const Icon = item.icon
        const active = subview === item.id
        return (
          <button
            key={item.id}
            onClick={() => setSubview(item.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
              active
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                : 'bg-accent/60 text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

// ============ Home Sub-View ============
function ElectionHome({ onNavigate }: { onNavigate: (v: Subview) => void }) {
  const [data, setData] = useState<ElectionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<ElectionData>('/elections')
      setData(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load election')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Compute countdown target before any early return so hooks stay unconditional
  const targetDate = data
    ? data.election.status === 'upcoming'
      ? data.election.startDate
      : data.election.endDate
    : null
  const countdown = useCountdown(targetDate)

  if (loading) return <HomeSkeleton />
  if (error || !data) {
    return (
      <Card className="rounded-2xl border-border/60">
        <CardContent className="py-10 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {error || 'Election data unavailable'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="mt-3 rounded-full"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { election, positions, hasVoted } = data
  const hasVotedAny = Object.values(hasVoted).some(Boolean)
  const allVoted =
    positions.length > 0 && positions.every((p) => hasVoted[p.id])
  const isActive = election.status === 'active'
  const isEnded = election.status === 'ended'
  const isUpcoming = election.status === 'upcoming'
  const statusLabel = getStatusLabel(election.status)

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="rounded-2xl border-0 overflow-hidden text-primary-foreground">
          <div className="relative bg-gradient-to-br from-primary to-primary/80 p-6 sm:p-8">
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="relative space-y-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="border-0 backdrop-blur bg-white/10 text-primary-foreground">
                      <Image
                        src="/ulsesa-logo.jpg"
                        alt="ULSESA"
                        width={16}
                        height={16}
                        className="rounded-sm"
                      />
                      ULSESA Election
                    </Badge>
                    <Badge
                      className={cn(
                        'border-0 backdrop-blur',
                        isActive && 'bg-green-500/25 text-green-100',
                        isUpcoming && 'bg-cyan-accent/25 text-cyan-accent',
                        isEnded && 'bg-white/15 text-white'
                      )}
                    >
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          isActive && 'bg-green-300 animate-pulse',
                          isUpcoming && 'bg-cyan-accent',
                          isEnded && 'bg-white/70'
                        )}
                      />
                      {statusLabel}
                    </Badge>
                    {hasVotedAny && (
                      <Badge className="bg-green-500/20 text-green-100 border-0 backdrop-blur">
                        <CheckCircle className="h-3 w-3" /> You&apos;ve Voted
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-bold font-display leading-tight">
                    {election.title || 'ULSESA General Election 2026'}
                  </h1>
                  <p className="text-sm text-primary-foreground/80">
                    Transparent • Secure • Anonymous
                  </p>
                  <p className="text-xs text-cyan-accent/90 font-medium tracking-wide">
                    Shaping Tomorrow&apos;s Scientific Innovators
                  </p>
                </div>
                <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center shrink-0 ring-1 ring-white/20">
                  <Image
                    src="/ulsesa-logo.jpg"
                    alt="ULSESA logo"
                    width={44}
                    height={44}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Countdown Timer */}
              {!isEnded && (
                <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-3.5 w-3.5 text-primary-foreground/80" />
                    <p className="text-xs font-medium text-primary-foreground/80">
                      {isUpcoming ? 'Voting starts in' : 'Voting closes in'}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { label: 'Hours', value: countdown.hours },
                      { label: 'Minutes', value: countdown.minutes },
                      { label: 'Seconds', value: countdown.seconds },
                    ].map((unit) => (
                      <div
                        key={unit.label}
                        className="bg-black/20 rounded-xl p-3 text-center"
                      >
                        <p className="text-2xl sm:text-3xl font-bold font-mono tabular-nums">
                          {pad(unit.value)}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-primary-foreground/70">
                          {unit.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isEnded && (
                <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10 flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-cyan-accent shrink-0" />
                  <p className="text-sm text-primary-foreground/90">
                    Voting has ended. Results are now being tallied and published.
                  </p>
                </div>
              )}

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-2">
                {isActive && !allVoted && (
                  <Button
                    onClick={() => onNavigate('vote')}
                    className="bg-cyan-accent text-cyan-accent-foreground hover:bg-cyan-accent/90 rounded-full shadow-lg shadow-cyan-accent/20"
                    size="lg"
                  >
                    <Vote className="h-4 w-4" />
                    {hasVotedAny ? 'Continue Voting' : 'Proceed to Vote'}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
                {allVoted && (
                  <Button
                    onClick={() => onNavigate('results')}
                    className="bg-cyan-accent text-cyan-accent-foreground hover:bg-cyan-accent/90 rounded-full shadow-lg shadow-cyan-accent/20"
                    size="lg"
                  >
                    <BarChart3 className="h-4 w-4" />
                    View Results
                  </Button>
                )}
                <Button
                  onClick={() => onNavigate('candidates')}
                  variant="secondary"
                  className="bg-white/10 backdrop-blur text-primary-foreground hover:bg-white/20 rounded-full border border-white/20"
                  size="lg"
                >
                  <Users className="h-4 w-4" />
                  View Candidates
                </Button>
                {isEnded && (
                  <Button
                    onClick={() => onNavigate('results')}
                    variant="secondary"
                    className="bg-white/10 backdrop-blur text-primary-foreground hover:bg-white/20 rounded-full border border-white/20"
                    size="lg"
                  >
                    <BarChart3 className="h-4 w-4" />
                    View Results
                  </Button>
                )}
              </div>

              {election.description && (
                <p className="text-xs text-primary-foreground/70 leading-relaxed max-w-2xl">
                  {election.description}
                </p>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Transparency Features */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
          Built for Transparency
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TRANSPARENCY_FEATURES.map((feature, i) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <Card className="rounded-2xl border-border/60 h-full">
                  <CardContent className="pt-5 pb-5">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-semibold mb-1">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {feature.desc}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Positions summary */}
      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Positions Up for Election
          </CardTitle>
          <CardDescription>
            {positions.length} positions • {positions.reduce((sum, p) => sum + p.candidates.length, 0)} candidates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {positions
              .sort((a, b) => a.order - b.order)
              .map((p) => {
                const voted = !!hasVoted[p.id]
                return (
                  <button
                    key={p.id}
                    onClick={() => onNavigate('candidates')}
                    className="flex items-center justify-between p-3 rounded-xl bg-accent/40 hover:bg-accent transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.candidates.length} candidate{p.candidates.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {voted ? (
                      <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 border-0 shrink-0">
                        <CheckCircle className="h-3 w-3" /> Voted
                      </Badge>
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </button>
                )
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============ Candidates Sub-View ============
function CandidatesView() {
  const [data, setData] = useState<ElectionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activePositionId, setActivePositionId] = useState<string>('')
  const [manifestoCandidate, setManifestoCandidate] = useState<Candidate | null>(null)
  const [voteCandidate, setVoteCandidate] = useState<{
    candidate: Candidate
    position: Position
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<ElectionData>('/elections')
      setData(res)
      setActivePositionId((prev) => {
        if (prev && res.positions.find((p) => p.id === prev)) return prev
        const sorted = [...res.positions].sort((a, b) => a.order - b.order)
        return sorted[0]?.id || ''
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load candidates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleConfirmVote = async () => {
    if (!voteCandidate) return
    setSubmitting(true)
    try {
      await api.post('/elections/vote', {
        candidateId: voteCandidate.candidate.id,
        positionId: voteCandidate.position.id,
      })
      toast.success('Vote cast successfully!', {
        description: `You voted for ${voteCandidate.candidate.name} as ${voteCandidate.position.title}.`,
      })
      setVoteCandidate(null)
      await fetchData()
    } catch (e) {
      toast.error('Failed to cast vote', {
        description: e instanceof Error ? e.message : 'Please try again',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <CandidatesSkeleton />
  if (error || !data) {
    return (
      <Card className="rounded-2xl border-border/60">
        <CardContent className="py-10 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {error || 'Could not load candidates'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="mt-3 rounded-full"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { election, positions, hasVoted } = data
  const sortedPositions = [...positions].sort((a, b) => a.order - b.order)
  const activePosition =
    sortedPositions.find((p) => p.id === activePositionId) || sortedPositions[0]
  const isActive = election.status === 'active'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display">Meet the Candidates</h1>
          <p className="text-sm text-muted-foreground">
            Review manifestos and cast your vote for each position
          </p>
        </div>
        <Badge
          className={cn(
            'border-0',
            isActive ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'
          )}
        >
          {getStatusLabel(election.status)}
        </Badge>
      </div>

      {/* Position Tabs */}
      <Tabs
        value={activePosition?.id}
        onValueChange={setActivePositionId}
        className="w-full"
      >
        <TabsList className="w-full flex-wrap h-auto p-1 gap-1 bg-accent/60">
          {sortedPositions.map((p) => {
            const voted = !!hasVoted[p.id]
            return (
              <TabsTrigger
                key={p.id}
                value={p.id}
                className="flex-1 min-w-fit gap-1.5 data-[state=active]:bg-background"
              >
                <span className="truncate max-w-[140px]">{p.title}</span>
                {voted && <CheckCircle className="h-3 w-3 text-green-500" />}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {sortedPositions.map((position) => (
          <TabsContent key={position.id} value={position.id} className="mt-4">
            <PositionCandidates
              position={position}
              hasVoted={!!hasVoted[position.id]}
              isActive={isActive}
              onViewManifesto={setManifestoCandidate}
              onVote={(candidate) => setVoteCandidate({ candidate, position })}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Manifesto Dialog */}
      <Dialog
        open={!!manifestoCandidate}
        onOpenChange={(open) => !open && setManifestoCandidate(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Quote className="h-4 w-4 text-primary" />
              Manifesto
            </DialogTitle>
            <DialogDescription>
              {manifestoCandidate?.name} — Full manifesto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {manifestoCandidate?.manifesto || 'No manifesto provided.'}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vote Confirmation Dialog */}
      <AlertDialog
        open={!!voteCandidate}
        onOpenChange={(open) => !open && !submitting && setVoteCandidate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Vote className="h-5 w-5 text-primary" />
              Confirm Your Vote
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              You are about to vote for{' '}
              <span className="font-semibold text-foreground">
                {voteCandidate?.candidate.name}
              </span>{' '}
              as{' '}
              <span className="font-semibold text-foreground">
                {voteCandidate?.position.title}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-xl bg-accent/50 p-3 text-xs text-muted-foreground flex items-start gap-2">
            <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <p>
              Your vote is anonymous. Your identity will not be linked to this vote in any
              public records or results.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmVote}
              disabled={submitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Casting Vote...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Confirm Vote
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function PositionCandidates({
  position,
  hasVoted,
  isActive,
  onViewManifesto,
  onVote,
}: {
  position: Position
  hasVoted: boolean
  isActive: boolean
  onViewManifesto: (c: Candidate) => void
  onVote: (c: Candidate) => void
}) {
  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-lg font-display">{position.title}</CardTitle>
              {position.description && (
                <CardDescription className="mt-1">{position.description}</CardDescription>
              )}
            </div>
            {hasVoted && (
              <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 border-0 shrink-0">
                <CheckCircle className="h-3 w-3" /> Voted
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {position.candidates.map((candidate, i) => (
          <motion.div
            key={candidate.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
          >
            <CandidateCard
              candidate={candidate}
              positionTitle={position.title}
              hasVoted={hasVoted}
              isActive={isActive}
              onViewManifesto={() => onViewManifesto(candidate)}
              onVote={() => onVote(candidate)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function CandidateCard({
  candidate,
  positionTitle,
  hasVoted,
  isActive,
  onViewManifesto,
  onVote,
}: {
  candidate: Candidate
  positionTitle: string
  hasVoted: boolean
  isActive: boolean
  onViewManifesto: () => void
  onVote: () => void
}) {
  const manifestoSnippet = candidate.manifesto
    ? candidate.manifesto.length > 120
      ? candidate.manifesto.slice(0, 120) + '...'
      : candidate.manifesto
    : null

  return (
    <Card className="rounded-2xl border-border/60 h-full overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all">
      <CardContent className="pt-5 space-y-4">
        {/* Header: Avatar + name */}
        <div className="flex items-start gap-3">
          <Avatar className="h-14 w-14 border border-border shrink-0">
            <AvatarFallback
              className={cn(
                'bg-gradient-to-br text-white font-semibold',
                getAvatarGradient(candidate.name)
              )}
            >
              {getInitials(candidate.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base leading-tight truncate">{candidate.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{positionTitle}</p>
            <Badge
              variant="outline"
              className="mt-1.5 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 text-[10px]"
            >
              <Shield className="h-2.5 w-2.5" /> Verified Candidate
            </Badge>
          </div>
        </div>

        {/* Level & programme */}
        {(candidate.level || candidate.programme) && (
          <div className="flex flex-wrap gap-2">
            {candidate.level && (
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-accent/60 text-foreground font-medium">
                {candidate.level} Level
              </span>
            )}
            {candidate.programme && (
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-accent/60 text-foreground font-medium">
                {candidate.programme}
              </span>
            )}
          </div>
        )}

        {/* Bio */}
        {candidate.bio && (
          <p className="text-xs text-muted-foreground leading-relaxed">{candidate.bio}</p>
        )}

        {/* Manifesto snippet */}
        {manifestoSnippet && (
          <div className="rounded-xl bg-accent/40 p-3 border-l-2 border-primary/40">
            <Quote className="h-3 w-3 text-primary/60 mb-1.5" />
            <p className="text-xs italic text-foreground/80 leading-relaxed">
              &ldquo;{manifestoSnippet}&rdquo;
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onViewManifesto}
            className="flex-1 rounded-full"
          >
            <Eye className="h-3.5 w-3.5" />
            View Manifesto
          </Button>
          {isActive && !hasVoted && (
            <Button
              size="sm"
              onClick={onVote}
              className="flex-1 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Vote className="h-3.5 w-3.5" />
              Vote
            </Button>
          )}
          {hasVoted && (
            <Button
              size="sm"
              variant="secondary"
              disabled
              className="flex-1 rounded-full bg-green-500/15 text-green-600 dark:text-green-400"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Voted
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============ Vote Flow Sub-View (guided) ============
function VoteFlow() {
  const [data, setData] = useState<ElectionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [voteTarget, setVoteTarget] = useState<{
    candidateId: string
    positionId: string
    candidateName: string
    positionTitle: string
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<ElectionData>('/elections')
      setData(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load election')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleConfirmVote = async () => {
    if (!voteTarget) return
    setSubmitting(true)
    try {
      await api.post('/elections/vote', {
        candidateId: voteTarget.candidateId,
        positionId: voteTarget.positionId,
      })
      toast.success('Vote cast successfully!', {
        description: `You voted for ${voteTarget.candidateName} as ${voteTarget.positionTitle}.`,
      })
      setVoteTarget(null)
      // Clear selection for this position
      setSelections((prev) => {
        const next = { ...prev }
        delete next[voteTarget.positionId]
        return next
      })
      await fetchData()
    } catch (e) {
      toast.error('Failed to cast vote', {
        description: e instanceof Error ? e.message : 'Please try again',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <VoteFlowSkeleton />
  if (error || !data) {
    return (
      <Card className="rounded-2xl border-border/60">
        <CardContent className="py-10 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{error || 'Could not load election'}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="mt-3 rounded-full"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { election, positions, hasVoted } = data
  const sortedPositions = [...positions].sort((a, b) => a.order - b.order)
  const isActive = election.status === 'active'
  const totalVoted = sortedPositions.filter((p) => hasVoted[p.id]).length
  const totalPositions = sortedPositions.length

  if (!isActive) {
    return (
      <Card className="rounded-2xl border-border/60">
        <CardContent className="py-10 text-center">
          <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-base font-semibold">Voting is not open</p>
          <p className="text-sm text-muted-foreground mt-1">
            {getStatusLabel(election.status)}. Please check back later.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (totalVoted === totalPositions) {
    return (
      <Card className="rounded-2xl border-green-500/30 bg-green-500/5">
        <CardContent className="py-10 text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-green-500/15 text-green-500 flex items-center justify-center">
            <PartyPopper className="h-8 w-8" />
          </div>
          <div>
            <p className="text-lg font-bold font-display">All Votes Cast!</p>
            <p className="text-sm text-muted-foreground mt-1">
              You&apos;ve voted in all {totalPositions} positions. Thank you for participating!
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display">Cast Your Vote</h1>
          <p className="text-sm text-muted-foreground">
            Select a candidate for each position and confirm your choice
          </p>
        </div>
        <Badge className="bg-primary/10 text-primary border-0">
          {totalVoted} / {totalPositions} voted
        </Badge>
      </div>

      {/* Progress */}
      <Card className="rounded-2xl border-border/60">
        <CardContent className="pt-5">
          <Progress value={(totalVoted / totalPositions) * 100} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {totalPositions - totalVoted} position{totalPositions - totalVoted !== 1 ? 's' : ''} remaining
          </p>
        </CardContent>
      </Card>

      {/* Positions */}
      {sortedPositions.map((position) => {
        const voted = !!hasVoted[position.id]
        const selected = selections[position.id]
        return (
          <motion.div
            key={position.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card
              className={cn(
                'rounded-2xl border-border/60 overflow-hidden',
                voted && 'border-green-500/30 bg-green-500/5'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        {String(position.order).padStart(2, '0')}
                      </span>
                      {position.title}
                    </CardTitle>
                    {position.description && (
                      <CardDescription className="mt-1">{position.description}</CardDescription>
                    )}
                  </div>
                  {voted && (
                    <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 border-0 shrink-0">
                      <CheckCircle className="h-3 w-3" /> Voted
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {voted ? (
                  <div className="rounded-xl bg-green-500/10 p-3 flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-green-700 dark:text-green-300">
                      You have voted for this position. Your vote cannot be changed.
                    </span>
                  </div>
                ) : (
                  <>
                    <RadioGroup
                      value={selected || ''}
                      onValueChange={(v) =>
                        setSelections((prev) => ({ ...prev, [position.id]: v }))
                      }
                    >
                      {position.candidates.map((candidate) => (
                        <Label
                          key={candidate.id}
                          htmlFor={`${position.id}-${candidate.id}`}
                          className={cn(
                            'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                            selected === candidate.id
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                              : 'border-border hover:border-primary/40 hover:bg-accent/40'
                          )}
                        >
                          <RadioGroupItem
                            value={candidate.id}
                            id={`${position.id}-${candidate.id}`}
                            className="mt-0.5"
                          />
                          <Avatar className="h-10 w-10 border border-border shrink-0">
                            <AvatarFallback
                              className={cn(
                                'bg-gradient-to-br text-white text-xs font-semibold',
                                getAvatarGradient(candidate.name)
                              )}
                            >
                              {getInitials(candidate.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold leading-tight">
                              {candidate.name}
                            </p>
                            {(candidate.level || candidate.programme) && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {[candidate.level && `${candidate.level} Level`, candidate.programme]
                                  .filter(Boolean)
                                  .join(' • ')}
                              </p>
                            )}
                            {candidate.bio && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {candidate.bio}
                              </p>
                            )}
                          </div>
                        </Label>
                      ))}
                    </RadioGroup>
                    <Button
                      disabled={!selected || submitting}
                      onClick={() => {
                        const c = position.candidates.find((c) => c.id === selected)
                        if (!c) return
                        setVoteTarget({
                          candidateId: c.id,
                          positionId: position.id,
                          candidateName: c.name,
                          positionTitle: position.title,
                        })
                      }}
                      className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Vote className="h-4 w-4" />
                      Cast Vote for {position.title}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )
      })}

      {/* Vote Confirmation */}
      <AlertDialog
        open={!!voteTarget}
        onOpenChange={(open) => !open && !submitting && setVoteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Vote className="h-5 w-5 text-primary" />
              Confirm Your Vote
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              You are about to vote for{' '}
              <span className="font-semibold text-foreground">
                {voteTarget?.candidateName}
              </span>{' '}
              as{' '}
              <span className="font-semibold text-foreground">
                {voteTarget?.positionTitle}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-xl bg-accent/50 p-3 text-xs text-muted-foreground flex items-start gap-2">
            <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <p>
              Your vote is anonymous. Your identity will not be linked to this vote in any
              public records or results.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmVote}
              disabled={submitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Casting Vote...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Confirm Vote
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============ Results Sub-View ============
function ResultsView() {
  const [data, setData] = useState<ResultsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<ResultsData>('/elections/results')
      setData(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load results')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) return <ResultsSkeleton />
  if (error || !data) {
    return (
      <Card className="rounded-2xl border-border/60">
        <CardContent className="py-10 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {error || 'Results are not yet available'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="mt-3 rounded-full"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { positions, totalVotes, totalEligible, turnout } = data

  return (
    <div className="space-y-6">
      {/* Transparency Banner */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="rounded-2xl border-primary/30 bg-primary/5 overflow-hidden">
          <CardContent className="pt-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold flex items-center gap-2">
                Live Results
                <span className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  Real-time
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Updated automatically as votes are cast
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            label: 'Total Votes Cast',
            value: totalVotes.toLocaleString(),
            icon: Vote,
            color: 'text-primary',
            bg: 'bg-primary/10',
          },
          {
            label: 'Eligible Voters',
            value: totalEligible.toLocaleString(),
            icon: Users,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
          },
          {
            label: 'Turnout',
            value: `${turnout.toFixed(1)}%`,
            icon: TrendingUp,
            color: 'text-cyan-accent',
            bg: 'bg-cyan-accent/10',
          },
        ].map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              <Card className="rounded-2xl border-border/60">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center', stat.bg)}>
                      <Icon className={cn('h-4 w-4', stat.color)} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold font-display mt-3">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Per-position results */}
      {positions.length === 0 ? (
        <Card className="rounded-2xl border-border/60">
          <CardContent className="py-10 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No positions to display</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {positions.map((position, i) => (
            <motion.div
              key={position.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              <PositionResults position={position} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Anonymity Note */}
      <Card className="rounded-2xl border-border/60 bg-accent/30">
        <CardContent className="pt-5 flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Your vote is secret</p>
            <p className="text-xs text-muted-foreground mt-1">
              Results are anonymous. Individual voting choices are never linked to student
              identities in any public record.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PositionResults({ position }: { position: ResultsPosition }) {
  const sorted = useMemo(
    () => [...position.candidates].sort((a, b) => b.voteCount - a.voteCount),
    [position.candidates]
  )
  const totalVotes = sorted.reduce((sum, c) => sum + c.voteCount, 0)
  const leadingId = sorted[0]?.name
  const hasVotes = totalVotes > 0

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-cyan-accent" />
          {position.title}
        </CardTitle>
        <CardDescription>
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''} cast
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No candidates for this position
          </p>
        ) : (
          sorted.map((candidate, idx) => {
            const pct = hasVotes ? (candidate.voteCount / totalVotes) * 100 : 0
            const isLeading = candidate.name === leadingId && hasVotes && candidate.voteCount > 0
            return (
              <div
                key={candidate.name}
                className={cn(
                  'rounded-xl p-3 border transition-all',
                  isLeading
                    ? 'border-cyan-accent/40 bg-cyan-accent/5'
                    : 'border-border bg-card'
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {isLeading ? (
                      <Crown className="h-4 w-4 text-cyan-accent shrink-0" />
                    ) : (
                      <span className="text-xs font-mono text-muted-foreground w-4 text-center shrink-0">
                        {idx + 1}
                      </span>
                    )}
                    <span
                      className={cn(
                        'text-sm font-medium truncate',
                        isLeading && 'text-cyan-accent-foreground'
                      )}
                    >
                      {candidate.name}
                    </span>
                    {isLeading && (
                      <Badge className="bg-cyan-accent/20 text-cyan-accent border-0 text-[10px] shrink-0">
                        Leading
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold tabular-nums">
                      {pct.toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {candidate.voteCount}
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
                    className={cn(
                      'h-full rounded-full',
                      isLeading
                        ? 'bg-gradient-to-r from-cyan-accent to-teal-500'
                        : 'bg-gradient-to-r from-primary to-primary/70'
                    )}
                  />
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

// ============ Skeletons ============
function HomeSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-72 rounded-2xl" />
      <div>
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  )
}

function CandidatesSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 rounded-2xl" />
      <Skeleton className="h-10 rounded-full" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

function VoteFlowSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-48 rounded-2xl" />
      ))}
    </div>
  )
}

function ResultsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20 rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-56 rounded-2xl" />
      ))}
    </div>
  )
}

