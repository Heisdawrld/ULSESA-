'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Vote,
  BookOpen,
  Calendar,
  Users2,
  CheckCircle,
  Download,
  Activity as ActivityIcon,
  ShieldCheck,
  Clock,
  ChevronRight,
  LogIn,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react'

import { useNav } from '@/lib/stores/nav-store'
import { useAuth, type StudentUser } from '@/lib/stores/auth-store'
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
import { cn } from '@/lib/utils'

// ============ Types ============
interface Activity {
  id: string
  action: string
  details: string | null
  timestamp: string
}

interface StudentMeResponse {
  student: StudentUser & {
    verificationStatus: string
    hasVoted: boolean
  }
  activities: Activity[]
}

// ============ Helpers ============
function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr)
  const diff = Date.now() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 7) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

const ACTIVITY_CONFIG: Record<
  string,
  { icon: typeof CheckCircle; color: string; bg: string; label: string }
> = {
  account_verified: {
    icon: CheckCircle,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    label: 'Account verified',
  },
  downloaded_notes: {
    icon: Download,
    color: 'text-cyan-accent',
    bg: 'bg-cyan-accent/10',
    label: 'Downloaded notes',
  },
  voted: {
    icon: Vote,
    color: 'text-cyan-accent',
    bg: 'bg-cyan-accent/10',
    label: 'Voted in election',
  },
}

function getActivityConfig(action: string) {
  return (
    ACTIVITY_CONFIG[action] || {
      icon: ActivityIcon,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
      label: action.replace(/_/g, ' '),
    }
  )
}

const QUICK_ACTIONS: {
  label: string
  icon: typeof Vote
  view: 'elections' | 'academics' | 'community'
  gradient: string
}[] = [
  { label: 'Election', icon: Vote, view: 'elections', gradient: 'from-primary to-primary/70' },
  { label: 'My Courses', icon: BookOpen, view: 'academics', gradient: 'from-cyan-accent to-cyan-accent/70' },
  { label: 'Timetable', icon: Calendar, view: 'academics', gradient: 'from-emerald-500 to-emerald-600' },
  { label: 'Community', icon: Users2, view: 'community', gradient: 'from-violet-500 to-violet-600' },
]

// ============ Main Component ============
export function DashboardView() {
  const { navigate } = useNav()
  const { student } = useAuth()
  const [data, setData] = useState<StudentMeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    if (!student) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<StudentMeResponse>('/students/me')
      setData(res)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load dashboard'
      setError(msg)
      // Non-blocking toast — dashboard should still render with auth-store data
      toast.error('Could not load latest activity', { description: msg })
    } finally {
      setLoading(false)
    }
  }, [student])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

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
            <div className="relative bg-brand-gradient p-8 text-primary-foreground">
              <div className="absolute inset-0 bg-grid opacity-20" aria-hidden />
              <div className="relative">
                <div className="mx-auto w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-white/30 shadow-lg mb-4">
                  <Image
                    src="/ulsesa-logo.jpg"
                    alt="ULSESA Logo"
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <h2 className="text-2xl font-bold font-display">Welcome to ULSESA</h2>
                <p className="text-sm text-primary-foreground/80 mt-2">
                  Sign in to access your personalized student portal
                </p>
              </div>
            </div>
            <CardContent className="pt-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                Track your verification status, vote in ULSESA elections, access course materials, and more.
              </p>
              <Button
                onClick={() => navigate('auth')}
                className="w-full rounded-full bg-brand-gradient hover:opacity-90 text-primary-foreground"
              >
                <LogIn className="h-4 w-4" />
                Sign in to Continue
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

  const isVerified = data?.student.isVerified ?? student.isVerified
  const hasVoted = data?.student.hasVoted ?? false
  const verificationStatus =
    data?.student.verificationStatus ?? (student.isVerified ? 'approved' : 'pending')
  const firstName = student.fullName.split(' ')[0]

  return (
    <div className="container mx-auto px-4 lg:px-6 py-6 lg:py-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ============ Main Content ============ */}
        <div className="lg:col-span-2 space-y-6">
          {/* Welcome Header */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="rounded-2xl border-border/60 overflow-hidden">
              <div className="relative bg-brand-gradient p-6 text-primary-foreground">
                <div className="absolute inset-0 bg-grid opacity-20" aria-hidden />
                <div className="absolute -top-12 -right-8 h-40 w-40 rounded-full bg-cyan-accent/25 blur-3xl pointer-events-none" aria-hidden />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs text-primary-foreground/80">
                      <Sparkles className="h-3 w-3" />
                      <span>ULSESA Portal</span>
                    </div>
                    <p className="text-sm text-primary-foreground/80">{getGreeting()},</p>
                    <h1 className="text-2xl sm:text-3xl font-bold font-display truncate">
                      {firstName} 👋
                    </h1>
                    <p className="text-sm text-primary-foreground/80">
                      {student.level} Level • {student.programme}
                    </p>
                    <div className="pt-2">
                      {isVerified ? (
                        <Badge className="bg-green-500/20 text-green-100 border-0 backdrop-blur">
                          <CheckCircle className="h-3 w-3" /> Verified
                        </Badge>
                      ) : (
                        <Badge className="bg-cyan-accent/20 text-cyan-accent border-0 backdrop-blur">
                          <Clock className="h-3 w-3" /> Pending Verification
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Avatar className="h-16 w-16 border-2 border-white/30 shadow-lg shrink-0">
                    <AvatarFallback className="bg-white/10 text-primary-foreground text-lg font-bold">
                      {getInitials(student.fullName)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Quick Action Cards */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {QUICK_ACTIONS.map((action, i) => {
                const Icon = action.icon
                return (
                  <motion.button
                    key={action.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i }}
                    onClick={() => navigate(action.view)}
                    className="group text-left"
                  >
                    <Card className="rounded-2xl border-border/60 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-0.5 h-full">
                      <CardContent className="pt-5 pb-5 px-4 flex flex-col items-center text-center gap-2.5">
                        <div
                          className={cn(
                            'h-11 w-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-md',
                            action.gradient
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-medium">{action.label}</span>
                      </CardContent>
                    </Card>
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* Verification Status Card (only if not verified) */}
          {!isVerified && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="rounded-2xl border-cyan-accent/30 bg-cyan-accent/5">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-cyan-accent/15 text-cyan-accent-foreground dark:text-cyan-accent flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base">Account Verification in Progress</CardTitle>
                      <CardDescription>Your account is being reviewed by ULSESA admins</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        Status:{' '}
                        <span className="capitalize text-foreground font-medium">
                          {verificationStatus}
                        </span>
                      </span>
                      <span className="text-muted-foreground">Step 2 of 3</span>
                    </div>
                    <Progress value={66} className="h-2 bg-cyan-accent/15 [&>div]:bg-cyan-accent" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] text-center pt-1">
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-6 w-6 rounded-full bg-green-500/15 text-green-500 flex items-center justify-center">
                        <CheckCircle className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-muted-foreground">Registered</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-6 w-6 rounded-full bg-cyan-accent/15 text-cyan-accent-foreground dark:text-cyan-accent flex items-center justify-center ring-2 ring-cyan-accent/30">
                        <Clock className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-foreground font-medium">Under Review</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                        <CheckCircle className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-muted-foreground">Approved</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Recent Activity */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="rounded-2xl border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ActivityIcon className="h-4 w-4 text-primary" />
                    Recent Activity
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchDashboard}
                    className="text-xs text-muted-foreground h-7"
                    disabled={loading}
                  >
                    <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-xl" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3 w-2/3" />
                          <Skeleton className="h-2.5 w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="text-center py-6">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Couldn&apos;t load activity</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={fetchDashboard}
                      className="mt-2 text-xs"
                    >
                      Retry
                    </Button>
                  </div>
                ) : data?.activities?.length ? (
                  <div className="space-y-1 max-h-80 overflow-y-auto scrollbar-thin pr-1 -mr-1">
                    {data.activities.map((activity) => {
                      const config = getActivityConfig(activity.action)
                      const Icon = config.icon
                      return (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 p-2 rounded-xl hover:bg-accent/50 transition-colors"
                        >
                          <div
                            className={cn(
                              'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                              config.bg
                            )}
                          >
                            <Icon className={cn('h-4 w-4', config.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{config.label}</p>
                            {activity.details && (
                              <p className="text-xs text-muted-foreground truncate">
                                {activity.details}
                              </p>
                            )}
                            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                              {formatRelativeTime(activity.timestamp)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ActivityIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No activity yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Your recent actions will appear here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ============ Sidebar ============ */}
        <div className="space-y-6">
          {/* Election Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card className="rounded-2xl border-border/60 overflow-hidden">
              <div className="bg-brand-gradient-soft p-5 border-b border-border/60">
                <div className="flex items-center gap-2 mb-1">
                  <Vote className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Election Status</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  ULSESA General Election 2026
                </p>
              </div>
              <CardContent className="pt-5">
                {hasVoted ? (
                  <div className="text-center py-2">
                    <div className="mx-auto w-12 h-12 rounded-2xl bg-green-500/15 text-green-500 flex items-center justify-center mb-2">
                      <CheckCircle className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold">Thank you for voting!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your voice matters. Results will be published after voting ends.
                    </p>
                    <Button
                      onClick={() => navigate('elections')}
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full rounded-full"
                    >
                      View Results
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : isVerified ? (
                  <div className="text-center py-2">
                    <div className="mx-auto w-12 h-12 rounded-2xl bg-cyan-accent/15 text-cyan-accent-foreground dark:text-cyan-accent flex items-center justify-center mb-2">
                      <Vote className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold">You haven&apos;t voted yet</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-3">
                      Make your voice heard in the ULSESA election.
                    </p>
                    <Button
                      onClick={() => navigate('elections')}
                      className="w-full rounded-full bg-brand-gradient hover:opacity-90 text-primary-foreground"
                      size="sm"
                    >
                      Vote Now
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <div className="mx-auto w-12 h-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mb-2">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold">Verification Required</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Only verified ULSESA students can vote in the election.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Profile Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="rounded-2xl border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="relative h-7 w-7 rounded-md overflow-hidden ring-1 ring-primary/20 shrink-0">
                    <Image
                      src="/ulsesa-logo.jpg"
                      alt="ULSESA"
                      fill
                      className="object-cover"
                      sizes="28px"
                    />
                  </div>
                  <CardTitle className="text-base">ULSESA Profile</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-border">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(student.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{student.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {student.matricNumber}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-accent/40 p-2.5">
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
                      Level
                    </p>
                    <p className="font-semibold">{student.level}</p>
                  </div>
                  <div className="rounded-xl bg-accent/40 p-2.5">
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
                      Cohort
                    </p>
                    <p className="font-semibold truncate">{student.programme}</p>
                  </div>
                </div>
                {student.email && (
                  <div className="rounded-xl bg-accent/40 p-2.5">
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
                      Email
                    </p>
                    <p className="text-xs font-medium truncate">{student.email}</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-full"
                  onClick={() => navigate('elections')}
                >
                  View Elections
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
