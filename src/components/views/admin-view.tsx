'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { toast } from 'sonner'
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Vote,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  Activity,
  BadgeCheck,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  PlayCircle,
  StopCircle,
  Megaphone,
  RefreshCw,
  ExternalLink,
  FileText,
  Loader2,
  KeyRound,
  UserPlus,
  IdCard,
  FileCheck,
  Maximize2,
  Download,
  Crown,
  Clock,
  TrendingUp,
  Users2,
} from 'lucide-react'

import { useAuth, type AdminUser } from '@/lib/stores/auth-store'
import { api } from '@/lib/api-client'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

// ===================== Types =====================
type Section =
  | 'dashboard'
  | 'students'
  | 'verification'
  | 'election'
  | 'audit'
  | 'settings'

interface AdminStats {
  totalStudents: number
  verifiedStudents: number
  eligibleVoters: number
  votesCast: number
  turnout: number
  systemHealth: string
  electionStatus: string
  electionTitle?: string | null
}

interface StudentRow {
  id: string
  matricNumber: string
  fullName: string
  level: string
  programme: string
  email: string | null
  phone: string | null
  isVerified: boolean
  verificationStatus: string
  hasVoted?: boolean
  hasPassword?: boolean
  idDocumentUrl?: string | null
  createdAt: string
  updatedAt?: string
}

interface VerificationRequest extends StudentRow {
  verificationLogs?: Array<{
    id: string
    action: string
    notes: string | null
    timestamp: string
    admin: { id: string; name: string; username: string }
  }>
}

interface AuditLog {
  id: string
  action: string
  target: string | null
  details: string | null
  timestamp: string
  admin: { id: string; name: string; username: string } | null
}

interface ElectionPosition {
  id: string
  title: string
  order: number
  voteCount?: number
  _count?: { votes: number }
  candidates: Array<{
    id: string
    name: string
    level?: string | null
    programme?: string | null
    voteCount: number
  }>
}

interface Election {
  id: string
  title: string
  status: string
  startDate: string
  endDate: string | null
  positions?: ElectionPosition[]
}

// ===================== Helpers =====================
function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr)
  const diff = Date.now() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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

function statusBadge(status: string) {
  switch (status) {
    case 'approved':
      return (
        <Badge className="border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          Approved
        </Badge>
      )
    case 'admin_verified':
      return (
        <Badge className="gap-1 border-transparent bg-emerald-600/20 text-emerald-700 dark:text-emerald-300">
          <ShieldCheck className="size-3" />
          Admin Verified
        </Badge>
      )
    case 'pending':
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          Pending
        </Badge>
      )
    case 'submitted':
      return (
        <Badge className="border-transparent bg-cyan-accent/20 text-cyan-accent">
          Submitted
        </Badge>
      )
    case 'rejected':
      return (
        <Badge className="border-transparent bg-red-500/15 text-red-600 dark:text-red-400">
          Rejected
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="capitalize">
          {status}
        </Badge>
      )
  }
}

function electionStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return (
        <Badge className="border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 gap-1">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active
        </Badge>
      )
    case 'upcoming':
      return (
        <Badge className="border-transparent bg-cyan-accent/20 text-cyan-accent">Upcoming</Badge>
      )
    case 'ended':
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          Ended
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="capitalize">
          {status}
        </Badge>
      )
  }
}

function auditActionBadge(action: string) {
  const map: Record<string, string> = {
    approve_student:
      'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent',
    reject_student:
      'bg-red-500/15 text-red-600 dark:text-red-400 border-transparent',
    start_election:
      'bg-primary/15 text-primary border-transparent',
    end_election:
      'bg-cyan-accent/20 text-cyan-accent border-transparent',
    create_announcement:
      'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-transparent',
  }
  return (
    <Badge className={cn('capitalize', map[action] || '')}>
      {action.replace(/_/g, ' ')}
    </Badge>
  )
}

// ===================== ID Document Preview =====================
//
// The student-uploaded ID is stored as a base64 data URL on
// `Student.idDocumentUrl`. This component renders a small thumbnail that,
// when clicked, opens a Dialog with the full-size image so the admin can
// actually inspect the photo, name, matric number, and programme on the
// card/biodata form before deciding to approve or reject.
//
// `studentName` / `studentMatric` are used as Dialog titles so the admin
// always knows whose document they're looking at.
function IdDocumentPreview({
  dataUrl,
  studentName,
  studentMatric,
  compact = false,
}: {
  dataUrl: string
  studentName: string
  studentMatric: string
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={[
          'group relative block w-full overflow-hidden rounded-xl border border-border bg-muted/30 text-left transition-all hover:border-primary/50 hover:ring-2 hover:ring-primary/20',
          compact ? '' : '',
        ].join(' ')}
        aria-label={`View ${studentName}'s uploaded ID document`}
      >
        <div className="flex items-center gap-3 p-2.5">
          {/* Thumbnail — using a plain <img> because the src is a runtime
              base64 data URL, not a known path that next/image can optimize. */}
          <img
            src={dataUrl}
            alt={`Uploaded student ID for ${studentName} (${studentMatric})`}
            className="size-16 shrink-0 rounded-lg object-cover ring-1 ring-border"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <IdCard className="size-3.5" />
              Uploaded ID Document
            </div>
            <p className="mt-0.5 truncate text-sm font-medium text-foreground">
              {studentName}
            </p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {studentMatric}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-lg bg-primary/10 px-2 py-1.5 text-[11px] font-medium text-primary">
            <Maximize2 className="size-3" />
            View ID
          </div>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <FileCheck className="size-5 text-primary" />
              Uploaded ID Document
            </DialogTitle>
            <DialogDescription>
              {studentName} ·{' '}
              <span className="font-mono">{studentMatric}</span> — compare
              the photo and details on this document against the registered
              info above before approving.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
            <img
              src={dataUrl}
              alt={`Uploaded student ID for ${studentName} (${studentMatric})`}
              className="max-h-[70vh] w-full object-contain"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ===================== Admin Login =====================
function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const { setAdmin } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post<{ admin: AdminUser; token: string }>(
        '/auth/admin-login',
        { username, password }
      )
      setAdmin(res.admin, res.token)
      toast.success(`Welcome back, ${res.admin.name}`)
      onLogin()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 -z-10 bg-grid opacity-40" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="overflow-hidden border-border/60 shadow-xl">
          <CardHeader className="space-y-3 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-white/15 backdrop-blur overflow-hidden ring-1 ring-white/20">
                <Image
                  src="/ulsesa-logo.jpg"
                  alt="ULSESA logo"
                  width={36}
                  height={36}
                  className="rounded-lg"
                />
              </div>
              <div>
                <CardTitle className="font-display text-2xl">
                  ULSESA Admin
                </CardTitle>
                <CardDescription className="text-primary-foreground/80">
                  Shaping Tomorrow&apos;s Scientific Innovators
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-username">Username</Label>
                <Input
                  id="admin-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Signing in…
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
            <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Demo credentials</p>
              <p className="mt-1 font-mono">admin / ulsesa-admin-2026</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

// ===================== Sidebar =====================
const NAV_ITEMS: { id: Section; label: string; icon: typeof Users }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'verification', label: 'Verification', icon: ShieldCheck },
  { id: 'election', label: 'Election', icon: Vote },
  { id: 'audit', label: 'Audit Logs', icon: ScrollText },
  { id: 'settings', label: 'Settings', icon: Settings },
]

function SidebarContent({
  admin,
  active,
  onSelect,
  onLogout,
}: {
  admin: AdminUser
  active: Section
  onSelect: (s: Section) => void
  onLogout: () => void
}) {
  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-4 text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15 overflow-hidden ring-1 ring-white/20">
            <Image
              src="/ulsesa-logo.jpg"
              alt="ULSESA"
              width={32}
              height={32}
              className="rounded-lg"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-semibold tracking-wide">
              ULSESA Admin
            </p>
            <p className="truncate text-[10px] text-primary-foreground/70">
              Shaping Tomorrow&apos;s Scientific Innovators
            </p>
          </div>
          <Badge className="border-transparent bg-white/20 text-primary-foreground text-[10px]">
            {admin.role}
          </Badge>
        </div>
        <Separator className="my-3 bg-white/15" />
        <div className="flex items-center gap-3">
          <Avatar className="size-8 border-2 border-white/30">
            <AvatarFallback className="bg-white/20 text-primary-foreground text-xs">
              {getInitials(admin.name)}
            </AvatarFallback>
          </Avatar>
          <p className="truncate text-sm font-medium">{admin.name}</p>
        </div>
      </div>

      <nav className="mt-2 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon
                className={cn(
                  'size-4 transition-transform',
                  isActive
                    ? 'text-primary-foreground'
                    : 'group-hover:scale-110'
                )}
              />
              {item.label}
            </button>
          )
        })}
      </nav>

      <Separator />
      <button
        onClick={onLogout}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
      >
        <LogOut className="size-4" /> Logout
      </button>
    </div>
  )
}

// ===================== Dashboard Section =====================
function AdminTurnoutDonut({
  percent,
  size = 132,
  stroke = 12,
  label = 'Turnout',
}: {
  percent: number
  size?: number
  stroke?: number
  label?: string
}) {
  const clamped = Math.max(0, Math.min(100, percent))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <defs>
          <linearGradient id="admin-turnout-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" className="[stop-color:var(--primary)]" />
            <stop offset="100%" className="[stop-color:var(--cyan-accent)]" />
          </linearGradient>
        </defs>
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#admin-turnout-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: 'easeOut', delay: 0.15 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={Math.round(clamped)}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="font-display text-3xl font-extrabold tracking-tight text-foreground"
        >
          {clamped.toFixed(1)}%
        </motion.span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  accent,
  loading,
}: {
  icon: typeof Users
  label: string
  value: string | number
  subtitle: string
  accent: 'primary' | 'emerald' | 'cyan-accent'
  loading?: boolean
}) {
  const accents = {
    primary: 'from-primary/15 to-primary/5 text-primary',
    emerald: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400',
    'cyan-accent': 'from-cyan-accent/20 to-cyan-accent/5 text-cyan-accent',
  }
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            {loading ? (
              <Skeleton className="mt-2 h-8 w-20" />
            ) : (
              <p className="mt-1 font-display text-3xl font-bold">{value}</p>
            )}
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {subtitle}
            </p>
          </div>
          <div
            className={cn(
              'grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br',
              accents[accent]
            )}
          >
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardSection() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<VerificationRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [election, setElection] = useState<Election | null>(null)
  const [acting, setActing] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [editDatesOpen, setEditDatesOpen] = useState(false)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [savingDates, setSavingDates] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setRequestsLoading(true)
    try {
      const [s, r, e] = await Promise.all([
        api.get<{ stats: AdminStats }>('/admin/stats'),
        api.get<{ requests: VerificationRequest[] }>(
          '/admin/verification-requests'
        ),
        api.get<{ election: Election | null }>('/admin/election'),
      ])
      setStats(s.stats)
      setRequests(r.requests.slice(0, 5))
      setElection(e.election)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setLoading(false)
      setRequestsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  async function updateElectionDates() {
    setSavingDates(true)
    try {
      const res = await api.put<{ election: Election }>('/admin/election', {
        startDate: editStart,
        endDate: editEnd || undefined,
      })
      setElection(res.election)
      toast.success('Election dates updated')
      setEditDatesOpen(false)
      void fetchAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update dates')
    } finally {
      setSavingDates(false)
    }
  }

  function openEditDates() {
    if (!election) return
    // Convert ISO string to datetime-local format (YYYY-MM-DDTHH:MM)
    const fmt = (d: string) => {
      const dt = new Date(d)
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
    }
    setEditStart(election.startDate ? fmt(election.startDate) : '')
    setEditEnd(election.endDate ? fmt(election.endDate) : '')
    setEditDatesOpen(true)
  }

  async function toggleElection(action: 'start' | 'end') {
    setActing(true)
    try {
      const res = await api.post<{ election: Election }>('/admin/election', {
        action,
      })
      setElection(res.election)
      toast.success(
        action === 'start' ? 'Election started' : 'Election ended'
      )
      void fetchAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActing(false)
    }
  }

  async function quickVerify(
    student: VerificationRequest,
    action: 'approve' | 'reject'
  ) {
    setPendingId(student.id)
    try {
      await api.post(`/admin/students/${student.id}/verify`, { action })
      toast.success(
        `${student.fullName} ${action === 'approve' ? 'approved' : 'rejected'}`
      )
      setRequests((prev) => prev.filter((r) => r.id !== student.id))
      void fetchAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setPendingId(null)
    }
  }

  const turnoutPct = stats
    ? Math.min(100, Math.round(stats.turnout))
    : 0
  const verifiedRatio = stats && stats.totalStudents > 0
    ? Math.round((stats.verifiedStudents / stats.totalStudents) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          ULSESA Admin Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Real-time overview of the ULSESA platform
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Students"
          value={stats?.totalStudents ?? 0}
          subtitle="Registered accounts"
          accent="primary"
          loading={loading}
        />
        <StatCard
          icon={BadgeCheck}
          label="Verified"
          value={stats?.verifiedStudents ?? 0}
          subtitle="Eligible voters"
          accent="emerald"
          loading={loading}
        />
        <StatCard
          icon={Vote}
          label="Votes Cast"
          value={stats?.votesCast ?? 0}
          subtitle={`Turnout: ${stats?.turnout.toFixed(1) ?? 0}%`}
          accent="cyan-accent"
          loading={loading}
        />
        <StatCard
          icon={Activity}
          label="System Health"
          value={stats?.systemHealth ?? '99.9%'}
          subtitle="All services operational"
          accent="emerald"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Election status — with turnout donut */}
        <Card className="lg:col-span-1 overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display text-lg">
                  Election Status
                </CardTitle>
                <CardDescription className="truncate">
                  {stats?.electionTitle || 'No election configured'}
                </CardDescription>
              </div>
              {election ? (
                electionStatusBadge(election.status)
              ) : (
                <Badge variant="secondary" className="text-muted-foreground">
                  None
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Turnout donut + key stats */}
            {stats && (
              <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-muted/30 p-3">
                <AdminTurnoutDonut percent={stats.turnout} size={104} stroke={10} />
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Verified ratio
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Progress value={verifiedRatio} className="h-1.5 flex-1" />
                      <span className="text-xs font-semibold">
                        {verifiedRatio}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Votes cast
                    </p>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="font-display text-xl font-bold">
                        {stats.votesCast}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        / {stats.eligibleVoters} eligible
                      </span>
                    </div>
                  </div>
                  {election?.status === 'active' &&
                    stats.eligibleVoters > stats.votesCast && (
                      <p className="flex items-start gap-1.5 rounded-md bg-cyan-accent/10 p-1.5 text-[11px] text-cyan-accent">
                        <TrendingUp className="mt-0.5 size-3 shrink-0" />
                        <span>
                          {stats.eligibleVoters - stats.votesCast} eligible
                          student
                          {stats.eligibleVoters - stats.votesCast === 1
                            ? ''
                            : 's'}{' '}
                          still to vote.
                        </span>
                      </p>
                    )}
                </div>
              </div>
            )}
            <Separator />
            <div className="flex flex-col gap-2 pt-1">
              {election?.status === 'upcoming' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={acting} className="w-full">
                      <PlayCircle className="size-4" /> Start Election
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Start election?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will open voting for all verified students. The
                        action will be recorded in the audit log.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => void toggleElection('start')}
                      >
                        Confirm Start
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {election?.status === 'active' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      disabled={acting}
                      className="w-full"
                    >
                      <StopCircle className="size-4" /> End Election
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>End election?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will immediately close voting. Results will be
                        final. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-white hover:bg-destructive/90"
                        onClick={() => void toggleElection('end')}
                      >
                        Confirm End
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {(!election || election.status === 'ended') && (
                <div className="rounded-xl bg-muted/40 p-3 text-center text-xs text-muted-foreground">
                  {election
                    ? 'This election has ended.'
                    : 'No election configured.'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent verification requests */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="font-display text-lg">
                Pending Verification
              </CardTitle>
              <CardDescription>
                Most recent submissions awaiting review
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-muted-foreground">
              {requests.length} pending
            </Badge>
          </CardHeader>
          <CardContent>
            {requestsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl border border-border/60 p-3"
                  >
                    <Skeleton className="size-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <div className="grid size-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="size-6" />
                </div>
                <p className="font-medium">All caught up!</p>
                <p className="text-sm text-muted-foreground">
                  No pending verification requests.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {requests.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col gap-3 rounded-xl border border-border/60 p-3 sm:flex-row sm:items-center"
                  >
                    <Avatar className="size-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {getInitials(r.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {r.fullName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.matricNumber} · {r.level} · {r.programme}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600"
                        disabled={pendingId === r.id}
                        onClick={() => void quickVerify(r, 'approve')}
                      >
                        <CheckCircle2 className="size-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/30 text-red-600 hover:bg-red-500/10 hover:text-red-600"
                        disabled={pendingId === r.id}
                        onClick={() => void quickVerify(r, 'reject')}
                      >
                        <XCircle className="size-4" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ===================== Students Section =====================
function StudentsSection() {
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selected, setSelected] = useState<StudentRow | null>(null)
  const [acting, setActing] = useState(false)
  const [notes, setNotes] = useState('')

  // Manual verify / reset password state
  const [manualVerifying, setManualVerifying] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [showManualVerifyConfirm, setShowManualVerifyConfirm] = useState(false)
  const [showResetPasswordConfirm, setShowResetPasswordConfirm] = useState(false)

  // Add student dialog state
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addingStudent, setAddingStudent] = useState(false)
  const [newMatric, setNewMatric] = useState('')
  const [newFullName, setNewFullName] = useState('')
  const [newLevel, setNewLevel] = useState('')
  const [newProgramme, setNewProgramme] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (search.trim()) params.set('search', search.trim())
      const q = params.toString()
      const res = await api.get<{ students: StudentRow[] }>(
        `/admin/students${q ? `?${q}` : ''}`
      )
      setStudents(res.students)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load students'
      )
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search])

  useEffect(() => {
    void fetchStudents()
  }, [fetchStudents])

  async function verify(student: StudentRow, action: 'approve' | 'reject') {
    setActing(true)
    try {
      await api.post(`/admin/students/${student.id}/verify`, {
        action,
        notes: notes.trim() || undefined,
      })
      toast.success(
        `${student.fullName} ${action === 'approve' ? 'approved' : 'rejected'}`
      )
      setSelected(null)
      setNotes('')
      void fetchStudents()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActing(false)
    }
  }

  async function handleManualVerify() {
    if (!selected) return
    setManualVerifying(true)
    try {
      await api.post(`/admin/students/${selected.id}/manual-verify`, {
        notes: notes.trim() || undefined,
      })
      toast.success(`${selected.fullName} manually verified`)
      setShowManualVerifyConfirm(false)
      setSelected(null)
      setNotes('')
      void fetchStudents()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Manual verify failed')
    } finally {
      setManualVerifying(false)
    }
  }

  async function handleResetPassword() {
    if (!selected) return
    setResettingPassword(true)
    try {
      await api.post(`/admin/students/${selected.id}/reset-password`, {
        notes: notes.trim() || undefined,
      })
      toast.success(`Password reset for ${selected.fullName}`)
      setShowResetPasswordConfirm(false)
      setSelected(null)
      setNotes('')
      void fetchStudents()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setResettingPassword(false)
    }
  }

  function resetAddForm() {
    setNewMatric('')
    setNewFullName('')
    setNewLevel('')
    setNewProgramme('')
    setNewEmail('')
    setNewPhone('')
  }

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault()
    if (!newMatric.trim() || !newFullName.trim() || !newLevel || !newProgramme.trim()) {
      toast.error('Please fill in all required fields')
      return
    }
    setAddingStudent(true)
    try {
      await api.post('/admin/students', {
        matricNumber: newMatric.trim(),
        fullName: newFullName.trim(),
        level: newLevel,
        programme: newProgramme.trim(),
        email: newEmail.trim() || undefined,
        phone: newPhone.trim() || undefined,
      })
      toast.success('Student added')
      setShowAddDialog(false)
      resetAddForm()
      void fetchStudents()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add student')
    } finally {
      setAddingStudent(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Students
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage and verify student accounts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void fetchStudents()}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <UserPlus className="size-4" /> Add Student
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, matric, email, programme…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void fetchStudents()
                }}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="size-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="admin_verified">Admin Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                <Users className="size-6" />
              </div>
              <p className="font-medium">No students found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters or search query.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Matric</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Programme
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.id} className="cursor-pointer">
                      <TableCell
                        className="font-medium"
                        onClick={() => setSelected(s)}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                              {getInitials(s.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{s.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell
                        className="font-mono text-xs"
                        onClick={() => setSelected(s)}
                      >
                        {s.matricNumber}
                      </TableCell>
                      <TableCell onClick={() => setSelected(s)}>
                        {s.level}
                      </TableCell>
                      <TableCell
                        className="hidden max-w-48 truncate text-muted-foreground md:table-cell"
                        onClick={() => setSelected(s)}
                      >
                        {s.programme}
                      </TableCell>
                      <TableCell onClick={() => setSelected(s)}>
                        {statusBadge(s.verificationStatus)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelected(s)}
                        >
                          <Eye className="size-4" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student detail dialog */}
      <Dialog
        open={!!selected}
        onOpenChange={(o) => {
          if (!o) {
            setSelected(null)
            setNotes('')
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">
                  Student Details
                </DialogTitle>
                <DialogDescription>
                  Review and verify this student account
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-14">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(selected.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-display text-lg font-semibold">
                      {selected.fullName}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {selected.matricNumber}
                    </p>
                  </div>
                  <div className="ml-auto">
                    {statusBadge(selected.verificationStatus)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Level</p>
                    <p className="font-medium">{selected.level}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Programme</p>
                    <p className="font-medium">{selected.programme}</p>
                  </div>
                  <div className="col-span-2 rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium truncate">
                      {selected.email || '—'}
                    </p>
                  </div>
                  <div className="col-span-2 rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{selected.phone || '—'}</p>
                  </div>
                  <div className="col-span-2 rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Joined</p>
                    <p className="font-medium">
                      {formatDateTime(selected.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Uploaded ID document — render the actual image (base64
                    data URL) with a clickable thumbnail + Dialog preview.
                    This is what the admin uses to verify the student's
                    identity for the manual-upload fallback path. */}
                {selected.idDocumentUrl && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                      <IdCard className="size-3.5" />
                      Uploaded ID Document
                    </div>
                    <IdDocumentPreview
                      dataUrl={selected.idDocumentUrl}
                      studentName={selected.fullName}
                      studentMatric={selected.matricNumber}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Tap the card above to view the full-size image. Compare
                      the photo, name, and matric number on the document
                      against the details shown above before approving.
                    </p>
                  </div>
                )}

                {(selected.verificationStatus === 'submitted' ||
                  selected.verificationStatus === 'pending' ||
                  (selected.verificationStatus !== 'admin_verified' &&
                    !selected.hasPassword) ||
                  selected.hasPassword) && (
                  <div className="space-y-2">
                    <Label htmlFor="verify-notes">
                      Notes <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Textarea
                      id="verify-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add internal notes for this decision…"
                      rows={2}
                    />
                  </div>
                )}

                {/* Manual verify + reset password admin tools */}
                {selected.verificationStatus !== 'admin_verified' &&
                  !selected.hasPassword && (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <ShieldCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                            {selected.idDocumentUrl
                              ? 'Approve (verify identity)'
                              : 'Manual verification (skip OTP)'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {selected.idDocumentUrl
                              ? "You've reviewed the uploaded ID document and confirmed it matches the student's registered details. Approving lets the student set a password and sign in without an email code."
                              : "Use this when the student's email OTP fails or they can't access their email. The student can then claim their account and set a password without the email code."}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 hover:text-emerald-700 dark:text-emerald-300"
                        disabled={manualVerifying || acting}
                        onClick={() => setShowManualVerifyConfirm(true)}
                      >
                        <ShieldCheck className="size-4" />
                        {selected.idDocumentUrl
                          ? 'Approve (Verify Identity)'
                          : 'Manually Verify (Skip OTP)'}
                      </Button>
                    </div>
                  )}

                {selected.hasPassword && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <KeyRound className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                          Reset password
                        </p>
                        <p className="text-xs text-muted-foreground">
                          The student will need to go through the claim flow
                          again with their matric number. Since they&apos;re
                          already admin-verified, they won&apos;t need an email
                          code.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 hover:text-amber-700 dark:text-amber-300"
                      disabled={resettingPassword || acting}
                      onClick={() => setShowResetPasswordConfirm(true)}
                    >
                      <KeyRound className="size-4" />
                      Reset Password
                    </Button>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
                {(selected.verificationStatus === 'submitted' ||
                  selected.verificationStatus === 'pending') && (
                  <>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="border-red-500/30 text-red-600 hover:bg-red-500/10 hover:text-red-600"
                          disabled={acting}
                        >
                          <XCircle className="size-4" /> Reject
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Reject this student?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {selected.fullName} ({selected.matricNumber}) will
                            not be able to vote. They can resubmit later.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-white hover:bg-destructive/90"
                            onClick={() => void verify(selected, 'reject')}
                          >
                            Confirm Reject
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button
                      disabled={acting}
                      onClick={() => void verify(selected, 'approve')}
                    >
                      <CheckCircle2 className="size-4" /> Approve
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual verify confirmation */}
      <AlertDialog
        open={showManualVerifyConfirm}
        onOpenChange={setShowManualVerifyConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selected?.idDocumentUrl
                ? 'Approve — verify this student\u2019s identity?'
                : 'Manually verify this student without OTP?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selected?.idDocumentUrl
                ? "You've reviewed the uploaded ID document. This will verify the student's identity without an email OTP code. They will be able to set a password immediately. Continue?"
                : "This will verify the student's identity without an email OTP code. They will be able to set a password immediately. Continue?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={manualVerifying}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 text-white hover:bg-emerald-600/90"
              disabled={manualVerifying}
              onClick={(e) => {
                e.preventDefault()
                void handleManualVerify()
              }}
            >
              {manualVerifying ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Verifying…
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" /> Confirm Manual Verify
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset password confirmation */}
      <AlertDialog
        open={showResetPasswordConfirm}
        onOpenChange={setShowResetPasswordConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset this student&apos;s password?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear the student&apos;s current password. They will
              need to claim their account again and set a new password (no OTP
              required since they were already verified). Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resettingPassword}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 text-white hover:bg-amber-600/90"
              disabled={resettingPassword}
              onClick={(e) => {
                e.preventDefault()
                void handleResetPassword()
              }}
            >
              {resettingPassword ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Resetting…
                </>
              ) : (
                <>
                  <KeyRound className="size-4" /> Confirm Reset
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add student dialog */}
      <Dialog
        open={showAddDialog}
        onOpenChange={(o) => {
          setShowAddDialog(o)
          if (!o) resetAddForm()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Add Student</DialogTitle>
            <DialogDescription>
              Pre-register a student record. The student will start unverified
              and can claim their account with their matric number.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStudent} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-matric">
                Matric Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="new-matric"
                placeholder="e.g., 230315099"
                value={newMatric}
                onChange={(e) => setNewMatric(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-fullname">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="new-fullname"
                placeholder="e.g., Adekunle Bola Ahmed"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="new-level">
                  Level <span className="text-destructive">*</span>
                </Label>
                <Select value={newLevel} onValueChange={setNewLevel} required>
                  <SelectTrigger id="new-level">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                    <SelectItem value="300">300</SelectItem>
                    <SelectItem value="400">400</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-programme">
                  Programme <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={newProgramme}
                  onValueChange={setNewProgramme}
                  required
                >
                  <SelectTrigger id="new-programme">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="BSc Physics">BSc Physics</SelectItem>
                    <SelectItem value="BSc Astrophysics">
                      BSc Astrophysics
                    </SelectItem>
                    <SelectItem value="BSc Geophysics">
                      BSc Geophysics
                    </SelectItem>
                    <SelectItem value="BSc Geology">BSc Geology</SelectItem>
                    <SelectItem value="BSc Chemistry">BSc Chemistry</SelectItem>
                    <SelectItem value="BSc Biochemistry">
                      BSc Biochemistry
                    </SelectItem>
                    <SelectItem value="BSc Botany">BSc Botany</SelectItem>
                    <SelectItem value="BSc Zoology">BSc Zoology</SelectItem>
                    <SelectItem value="BSc Microbiology">
                      BSc Microbiology
                    </SelectItem>
                    <SelectItem value="BSc Mathematics">
                      BSc Mathematics
                    </SelectItem>
                    <SelectItem value="BSc Statistics">
                      BSc Statistics
                    </SelectItem>
                    <SelectItem value="BEd Computer Science">
                      BEd Computer Science
                    </SelectItem>
                    <SelectItem value="Ed Biology">Ed Biology</SelectItem>
                    <SelectItem value="Ed Chemistry">Ed Chemistry</SelectItem>
                    <SelectItem value="Ed Mathematics">Ed Mathematics</SelectItem>
                    <SelectItem value="Ed Physics">Ed Physics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">
                Email{' '}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="new-email"
                type="email"
                placeholder="student@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-phone">
                Phone{' '}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="new-phone"
                placeholder="e.g., 08031234567"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
            </div>
            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={addingStudent}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={addingStudent}>
                {addingStudent ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Adding…
                  </>
                ) : (
                  <>
                    <UserPlus className="size-4" /> Create Student
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ===================== Verification Section =====================
function VerificationSection() {
  const [requests, setRequests] = useState<VerificationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<VerificationRequest | null>(
    null
  )
  const [notes, setNotes] = useState('')

  const fetchReqs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ requests: VerificationRequest[] }>(
        '/admin/verification-requests'
      )
      setRequests(res.requests)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load requests'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchReqs()
  }, [fetchReqs])

  async function approve(r: VerificationRequest) {
    setActingId(r.id)
    try {
      // Two approve paths depending on how the student reached 'submitted':
      //   - idDocumentUrl present → student uploaded an ID via the manual
      //     fallback. Use the manual-verify endpoint so they get
      //     `admin_verified` status and can set a password without OTP.
      //   - no idDocumentUrl     → student went through the OTP path and
      //     already set a password. Use the regular verify/approve endpoint
      //     to flip their status to 'approved' so they can vote.
      if (r.idDocumentUrl) {
        await api.post(`/admin/students/${r.id}/manual-verify`, {
          notes: notes.trim() || undefined,
        })
      } else {
        await api.post(`/admin/students/${r.id}/verify`, {
          action: 'approve',
          notes: notes.trim() || undefined,
        })
      }
      toast.success(
        r.idDocumentUrl
          ? `${r.fullName}'s identity verified`
          : `${r.fullName} approved`
      )
      setRequests((prev) => prev.filter((x) => x.id !== r.id))
      setNotes('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActingId(null)
    }
  }

  async function confirmReject() {
    if (!rejectTarget) return
    setActingId(rejectTarget.id)
    try {
      await api.post(`/admin/students/${rejectTarget.id}/verify`, {
        action: 'reject',
        notes: notes.trim() || undefined,
      })
      toast.success(`${rejectTarget.fullName} rejected`)
      setRequests((prev) => prev.filter((x) => x.id !== rejectTarget.id))
      setRejectTarget(null)
      setNotes('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Verification Queue
          </h1>
          <p className="text-sm text-muted-foreground">
            Review submitted student verification requests
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void fetchReqs()}>
          <RefreshCw className="size-4" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-16 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <div className="grid size-14 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="size-7" />
            </div>
            <p className="font-display text-lg font-semibold">
              No pending verification requests
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              When students submit their verification documents, they will
              appear here for review.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {requests.map((r) => (
            <Card key={r.id} className="flex flex-col">
              <CardHeader className="gap-3">
                <div className="flex items-start gap-3">
                  <Avatar className="size-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(r.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="font-display text-base">
                      {r.fullName}
                    </CardTitle>
                    <CardDescription className="font-mono text-xs">
                      {r.matricNumber}
                    </CardDescription>
                  </div>
                  {statusBadge(r.verificationStatus)}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Level</p>
                    <p className="font-medium">{r.level}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Programme</p>
                    <p className="font-medium">{r.programme}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="truncate font-medium">
                      {r.email || '—'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{r.phone || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="font-medium">
                      {r.updatedAt
                        ? formatDateTime(r.updatedAt)
                        : formatDateTime(r.createdAt)}
                    </p>
                  </div>
                </div>
                {r.idDocumentUrl && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                      <IdCard className="size-3.5" />
                      Uploaded ID Document
                    </div>
                    <IdDocumentPreview
                      dataUrl={r.idDocumentUrl}
                      studentName={r.fullName}
                      studentMatric={r.matricNumber}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Tap to inspect the full image. Verify the photo, name,
                      and matric number match the details above before
                      approving.
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-red-500/30 text-red-600 hover:bg-red-500/10 hover:text-red-600"
                  disabled={actingId === r.id}
                  onClick={() => {
                    setRejectTarget(r)
                    setNotes('')
                  }}
                >
                  <XCircle className="size-4" /> Reject
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 text-white hover:bg-emerald-600/90"
                  disabled={actingId === r.id}
                  onClick={() => void approve(r)}
                >
                  {actingId === r.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  {r.idDocumentUrl ? 'Approve (Verify Identity)' : 'Approve'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Reject dialog with notes */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(o) => {
          if (!o) {
            setRejectTarget(null)
            setNotes('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          {rejectTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">
                  Reject verification?
                </DialogTitle>
                <DialogDescription>
                  {rejectTarget.fullName} ({rejectTarget.matricNumber}) will be
                  marked as rejected and won&apos;t be able to vote. They will
                  see your reason and can re-upload a clearer image.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="reject-notes">
                  Reason{' '}
                  <span className="text-muted-foreground">
                    (shown to the student)
                  </span>
                </Label>
                <Textarea
                  id="reject-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    rejectTarget.idDocumentUrl
                      ? 'e.g. The photo on the ID is too dark to verify. Please upload a clearer, well-lit image showing your name and matric number.'
                      : 'e.g. Please contact ULSESA support to verify your identity.'
                  }
                  rows={3}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  disabled={actingId === rejectTarget.id}
                  onClick={() => void confirmReject()}
                >
                  {actingId === rejectTarget.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <XCircle className="size-4" />
                  )}
                  Confirm Reject
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ===================== Election Section =====================
function ElectionSection() {
  const [election, setElection] = useState<Election | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [acting, setActing] = useState(false)
  const [exporting, setExporting] = useState(false)

  const fetchElection = useCallback(
    async (silent = false) => {
      if (silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      try {
        const res = await api.get<{ election: Election | null }>(
          '/admin/election'
        )
        setElection(res.election)
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to load election'
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    []
  )

  useEffect(() => {
    void fetchElection()
  }, [fetchElection])

  // Auto-refresh live results every 20s while election is active
  useEffect(() => {
    if (election?.status !== 'active') return
    const id = window.setInterval(() => {
      void fetchElection(true)
    }, 20000)
    return () => window.clearInterval(id)
  }, [election?.status, fetchElection])

  async function toggle(action: 'start' | 'end') {
    setActing(true)
    try {
      const res = await api.post<{ election: Election }>('/admin/election', {
        action,
      })
      setElection((prev) => ({
        ...res.election,
        positions: prev?.positions ?? res.election.positions,
      }))
      toast.success(
        action === 'start' ? 'Election started' : 'Election ended'
      )
      void fetchElection(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActing(false)
    }
  }

  // BUG FIX: use sum of candidate voteCounts (displayTotal) instead of
  // p._count.votes (real Vote rows). The seed data pre-populates voteCount
  // with display values that don't correspond to real Vote rows, so dividing
  // by _count.votes produces nonsense like 2550%. This mirrors the fix
  // applied to the public Results view in CRON-WEBDEV-REVIEW-2.
  const positionStats = useMemo(() => {
    if (!election?.positions) return []
    return election.positions.map((p) => {
      const sorted = p.candidates.slice().sort((a, b) => b.voteCount - a.voteCount)
      const displayTotal = sorted.reduce((s, c) => s + c.voteCount, 0)
      const realVotes = p._count?.votes ?? 0
      const leading = sorted[0]
      const winner =
        election.status === 'ended' && leading && leading.voteCount > 0
          ? leading
          : null
      const isTied =
        sorted.length >= 2 &&
        sorted[0].voteCount > 0 &&
        sorted[0].voteCount === sorted[1].voteCount
      return {
        position: p,
        sorted,
        displayTotal,
        realVotes,
        leading,
        winner,
        isTied,
      }
    })
  }, [election])

  const totalDisplayVotes = positionStats.reduce(
    (s, p) => s + p.displayTotal,
    0
  )
  const totalRealVotes = positionStats.reduce(
    (s, p) => s + p.realVotes,
    0
  )
  const totalCandidates = positionStats.reduce(
    (s, p) => s + p.sorted.length,
    0
  )

  function exportCsv() {
    if (!election?.positions) return
    setExporting(true)
    try {
      const rows: string[] = []
      rows.push('Position,Order,Candidate,Level,Programme,Votes,Percentage,Status')
      for (const p of election.positions) {
        const sorted = p.candidates.slice().sort((a, b) => b.voteCount - a.voteCount)
        const displayTotal = sorted.reduce((s, c) => s + c.voteCount, 0)
        sorted.forEach((c, idx) => {
          const pct = displayTotal > 0 ? ((c.voteCount / displayTotal) * 100).toFixed(1) : '0.0'
          const status =
            election.status === 'ended' && idx === 0 && c.voteCount > 0
              ? 'Winner'
              : idx === 0 && c.voteCount > 0
                ? 'Leading'
                : ''
          const cell = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`
          rows.push(
            [
              cell(p.title),
              p.order,
              cell(c.name),
              cell(c.level ?? ''),
              cell(c.programme ?? ''),
              c.voteCount,
              pct,
              status,
            ].join(',')
          )
        })
      }
      const csv = rows.join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
      a.href = url
      a.download = `ulsesa-election-results-${stamp}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Results exported as CSV')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  const isActive = election?.status === 'active'
  const hasEnded = election?.status === 'ended'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Election Control
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage election lifecycle and view live results
            {isActive && (
              <span className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live · auto-refresh 20s
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchElection(true)}
          disabled={refreshing}
        >
          <RefreshCw
            className={cn('size-4', refreshing && 'animate-spin')}
          />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-display text-xl">
                {election?.title || 'No election configured'}
              </CardTitle>
              <CardDescription>
                Manage the active election cycle
              </CardDescription>
            </div>
            {election && electionStatusBadge(election.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {election && (
            <>
              {/* Premium stats row with icons */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <button
                  type="button"
                  onClick={openEditDates}
                  className="group rounded-xl border border-border/60 bg-muted/30 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="size-3.5" />
                      Start date
                    </div>
                    <span className="text-[10px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">Edit</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold">
                    {formatDateTime(election.startDate)}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={openEditDates}
                  className="group rounded-xl border border-border/60 bg-muted/30 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="size-3.5" />
                      End date
                    </div>
                    <span className="text-[10px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">Edit</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold">
                    {election.endDate ? formatDateTime(election.endDate) : '—'}
                  </p>
                </button>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Vote className="size-3.5 text-primary" />
                    Recorded votes
                  </div>
                  <p className="mt-1 text-sm font-semibold">
                    {totalRealVotes}{' '}
                    <span className="text-xs font-normal text-muted-foreground">
                      / {totalDisplayVotes} display
                    </span>
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-accent/20 bg-cyan-accent/5 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users2 className="size-3.5 text-cyan-accent" />
                    Candidates
                  </div>
                  <p className="mt-1 text-sm font-semibold">
                    {totalCandidates}{' '}
                    <span className="text-xs font-normal text-muted-foreground">
                      across {positionStats.length} positions
                    </span>
                  </p>
                </div>
              </div>
            </>
          )}
          <Separator />
          <div className="flex flex-col gap-2 sm:flex-row">
            {election?.status === 'upcoming' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={acting} className="flex-1">
                    <PlayCircle className="size-4" /> Start Election
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Start election?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Voting will open immediately for all verified students.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void toggle('start')}>
                      Confirm Start
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {election?.status === 'active' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={acting}
                    className="flex-1"
                  >
                    <StopCircle className="size-4" /> End Election
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>End election?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Voting will close immediately. Results will be final.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-white hover:bg-destructive/90"
                      onClick={() => void toggle('end')}
                    >
                      Confirm End
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {election?.positions && election.positions.length > 0 && (
              <Button
                variant="outline"
                onClick={exportCsv}
                disabled={exporting}
                className="flex-1 sm:flex-none"
              >
                {exporting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                Export CSV
              </Button>
            )}
            {(!election || election.status === 'ended') && !election?.positions && (
              <div className="flex-1 rounded-xl bg-muted/40 p-3 text-center text-sm text-muted-foreground">
                {election
                  ? 'This election has ended. No further actions available.'
                  : 'No election configured in the database.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Election Dates Dialog */}
      <Dialog open={editDatesOpen} onOpenChange={setEditDatesOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Clock className="size-5 text-primary" />
              Edit Election Schedule
            </DialogTitle>
            <DialogDescription>
              Change the start and end date/time for this election. Times are in WAT (UTC+1).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-start">Start Date & Time</Label>
              <Input
                id="edit-start"
                type="datetime-local"
                value={editStart}
                onChange={(e) => setEditStart(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-end">End Date & Time</Label>
              <Input
                id="edit-end"
                type="datetime-local"
                value={editEnd}
                onChange={(e) => setEditEnd(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline" disabled={savingDates}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={() => void updateElectionDates()}
              disabled={savingDates || !editStart}
            >
              {savingDates && <Loader2 className="size-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Per-position turnout breakdown */}
      {positionStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <TrendingUp className="size-5 text-primary" />
              Per-Position Turnout
            </CardTitle>
            <CardDescription>
              Recorded vote count per position vs. total display votes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {positionStats.map(
                ({ position, realVotes, displayTotal, sorted, winner, isTied }) => {
                  const share =
                    totalDisplayVotes > 0
                      ? Math.round((displayTotal / totalDisplayVotes) * 100)
                      : 0
                  return (
                    <div
                      key={position.id}
                      className={cn(
                        'rounded-xl border p-3 transition-colors',
                        winner
                          ? 'border-emerald-500/40 bg-emerald-500/5'
                          : isActive
                            ? 'border-cyan-accent/30 bg-cyan-accent/5'
                            : 'border-border/60'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">
                          {position.title}
                        </p>
                        <Badge
                          variant="secondary"
                          className="shrink-0 text-[10px]"
                        >
                          {share}% of votes
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-end gap-2">
                        <span className="font-display text-2xl font-bold leading-none">
                          {realVotes}
                        </span>
                        <span className="pb-0.5 text-xs text-muted-foreground">
                          recorded {displayTotal !== realVotes && `· ${displayTotal} display`}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${share}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className={cn(
                            'h-full rounded-full',
                            winner
                              ? 'bg-emerald-500'
                              : isActive
                                ? 'bg-cyan-accent'
                                : 'bg-primary'
                          )}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>
                          {sorted.length} candidate{sorted.length === 1 ? '' : 's'}
                        </span>
                        {winner ? (
                          <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                            <Crown className="size-3" />
                            {winner.name.split(' ')[0]} won
                          </span>
                        ) : isTied ? (
                          <span className="font-medium text-amber-600 dark:text-amber-400">
                            Tied
                          </span>
                        ) : isActive && sorted[0]?.voteCount > 0 ? (
                          <span className="inline-flex items-center gap-1 font-medium text-cyan-accent">
                            <TrendingUp className="size-3" />
                            {sorted[0].name.split(' ')[0]} leading
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )
                }
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live results preview — BUG FIXED */}
      {election?.positions && election.positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <span
                className={cn(
                  'size-2 rounded-full',
                  isActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'
                )}
              />
              {hasEnded ? 'Final Results' : 'Live Results'}
            </CardTitle>
            <CardDescription>
              Per-position candidate standings · percentages based on display
              vote counts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {positionStats.map(
              ({
                position: p,
                sorted,
                displayTotal,
                winner,
                isTied,
              }) => (
                <div key={p.id} className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-display text-sm font-semibold">
                        {p.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {displayTotal} display votes · {sorted.length} candidate{sorted.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    {winner ? (
                      <Badge className="shrink-0 border-transparent bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px]">
                        <Crown className="size-3" />
                        Winner declared
                      </Badge>
                    ) : isTied ? (
                      <Badge className="shrink-0 border-transparent bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px]">
                        Tied
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        {displayTotal} votes
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {sorted.map((c, idx) => {
                      // BUG FIX: use displayTotal (sum of candidate voteCounts)
                      // not real Vote row count — see comment above positionStats.
                      const pct =
                        displayTotal > 0
                          ? Math.round((c.voteCount / displayTotal) * 100)
                          : 0
                      const isWinner = winner?.id === c.id
                      const leading = idx === 0 && c.voteCount > 0 && !winner
                      return (
                        <div
                          key={c.id}
                          className={cn(
                            'space-y-1 rounded-lg border p-2.5',
                            isWinner
                              ? 'border-emerald-500/40 bg-emerald-500/5'
                              : leading
                                ? 'border-cyan-accent/40 bg-cyan-accent/5'
                                : 'border-border/60'
                          )}
                        >
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex min-w-0 items-center gap-2">
                              {isWinner ? (
                                <Badge className="shrink-0 border-transparent bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px]">
                                  <Crown className="size-3" />
                                  Winner
                                </Badge>
                              ) : leading ? (
                                <Badge className="shrink-0 border-transparent bg-cyan-accent/20 text-cyan-accent text-[10px]">
                                  Leading
                                </Badge>
                              ) : null}
                              <span className="truncate font-medium">
                                {c.name}
                              </span>
                              {c.level && c.programme && (
                                <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">
                                  · {c.level} · {c.programme}
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {c.voteCount} · {pct}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className={cn(
                                'h-full rounded-full',
                                isWinner
                                  ? 'bg-emerald-500'
                                  : leading
                                    ? 'bg-cyan-accent'
                                    : 'bg-primary'
                              )}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ===================== Audit Logs Section =====================
function AuditLogsSection() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ logs: AuditLog[] }>('/admin/audit-logs')
      setLogs(res.logs)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load audit logs'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchLogs()
  }, [fetchLogs])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground">
            Chronological trail of all admin actions
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void fetchLogs()}>
          <RefreshCw className="size-4" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">
            Recent Activity
          </CardTitle>
          <CardDescription>
            Showing last {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                <ScrollText className="size-6" />
              </div>
              <p className="font-medium">No audit logs yet</p>
              <p className="text-sm text-muted-foreground">
                Admin actions will be recorded here.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[60vh]">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Details
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatDateTime(log.timestamp)}
                          <div className="text-[10px] opacity-70">
                            {formatRelativeTime(log.timestamp)}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {log.admin?.name || 'System'}
                        </TableCell>
                        <TableCell>
                          {auditActionBadge(log.action)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.target || '—'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-xs text-muted-foreground md:table-cell">
                          {log.details || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ===================== Settings Section =====================
function SettingsSection() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('general')
  const [posting, setPosting] = useState(false)

  async function postAnnouncement(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required')
      return
    }
    setPosting(true)
    try {
      await api.post('/admin/announcements', {
        title: title.trim(),
        content: content.trim(),
        category,
      })
      toast.success('Announcement posted')
      setTitle('')
      setContent('')
      setCategory('general')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to post announcement'
      )
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Platform configuration and announcements
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Megaphone className="size-5 text-primary" />
            New Announcement
          </CardTitle>
          <CardDescription>
            Broadcast an update to all students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={postAnnouncement} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ann-title">Title</Label>
              <Input
                id="ann-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Exam timetable released"
                maxLength={120}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ann-content">Content</Label>
              <Textarea
                id="ann-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write the announcement body…"
                rows={5}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ann-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="ann-category" className="w-full sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="election">Election</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={posting}>
                {posting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Posting…
                  </>
                ) : (
                  <>
                    <Megaphone className="size-4" /> Post Announcement
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">About this admin</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminInfoCard />
        </CardContent>
      </Card>
    </div>
  )
}

function AdminInfoCard() {
  const { admin } = useAuth()
  if (!admin) return null
  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-14">
        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
          {getInitials(admin.name)}
        </AvatarFallback>
      </Avatar>
      <div className="space-y-1">
        <p className="font-display text-lg font-semibold">{admin.name}</p>
        <p className="text-sm text-muted-foreground">
          @{admin.username} · {admin.role}
        </p>
      </div>
    </div>
  )
}

// ===================== Main AdminView =====================
export function AdminView() {
  const { admin, isAdminAuthenticated, logoutAdmin } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [section, setSection] = useState<Section>('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isAuthed = mounted && isAdminAuthenticated() && !!admin

  const handleLogout = () => {
    logoutAdmin()
    toast.success('Signed out')
  }

  const handleSelect = (s: Section) => {
    setSection(s)
    setMobileOpen(false)
  }

  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!isAuthed) {
    return <AdminLogin onLogin={() => setSection('dashboard')} />
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Desktop sidebar */}
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-border bg-sidebar/40 lg:block">
        <SidebarContent
          admin={admin!}
          active={section}
          onSelect={handleSelect}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="fixed left-4 top-20 z-40 lg:hidden"
          >
            <Menu className="size-4" /> Menu
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="px-4 pt-4">
            <SheetTitle className="font-display">ULSESA Admin</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            <SidebarContent
              admin={admin!}
              active={section}
              onSelect={handleSelect}
              onLogout={handleLogout}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="flex-1 px-4 pb-12 pt-16 sm:px-6 lg:pt-8">
        <div className="mx-auto max-w-7xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {section === 'dashboard' && <DashboardSection />}
              {section === 'students' && <StudentsSection />}
              {section === 'verification' && <VerificationSection />}
              {section === 'election' && <ElectionSection />}
              {section === 'audit' && <AuditLogsSection />}
              {section === 'settings' && <SettingsSection />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
