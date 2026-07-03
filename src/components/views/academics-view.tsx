'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useNav } from '@/lib/stores/nav-store'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { cn } from '@/lib/utils'
import {
  BookOpen,
  CalendarDays,
  ArrowRight,
  Sparkles,
  Download,
  FileText,
  FileQuestion,
  Book,
  Presentation,
  Video,
  MapPin,
  ChevronRight,
  Layers,
  ExternalLink,
  FlaskConical,
  Atom,
  Leaf,
  Calculator,
  Beaker,
  Microscope,
  Plus,
  Trash2,
  CalendarClock,
} from 'lucide-react'

// ===================== Types =====================

interface Course {
  id: string
  code: string
  title: string
  level: string
  semester: string
  description?: string
  department?: string
  googleDriveUrl?: string | null
}

interface Resource {
  id: string
  title: string
  type: string
  url: string
  description?: string
  course?: { code: string; title: string } | null
}

interface TimetableEntry {
  id: string
  course: string
  day: string // Monday-Saturday
  startTime: string // "08:00"
  endTime: string // "10:00"
  venue: string
  color: string // preset color key
}

// ===================== Static data =====================

const LEVELS = ['100', '200', '300', '400', '500'] as const

const DEPARTMENTS = [
  { key: 'all', label: 'All', short: 'All' },
  { key: 'Biology Education', label: 'Biology Edu', short: 'BED' },
  { key: 'Chemistry Education', label: 'Chemistry Edu', short: 'CED' },
  { key: 'Mathematics Education', label: 'Mathematics Edu', short: 'MED' },
  { key: 'Physics Education', label: 'Physics Edu', short: 'PED' },
  { key: 'Integrated Science Education', label: 'Integrated Sci Edu', short: 'IED' },
  { key: 'General', label: 'General', short: 'GEN' },
] as const

// Personal Timetable Builder config
const TIMETABLE_STORAGE_KEY = 'ulsesa-timetable'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

// Hourly time slots from 08:00 to 17:00 (9 one-hour blocks)
const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'] as const

const COLOR_OPTIONS = [
  { key: 'primary', label: 'Indigo', swatch: 'bg-primary', block: 'bg-primary/85 text-primary-foreground border-primary' },
  { key: 'cyan', label: 'Cyan', swatch: 'bg-cyan-accent', block: 'bg-cyan-accent/85 text-cyan-accent-foreground border-cyan-accent' },
  { key: 'emerald', label: 'Emerald', swatch: 'bg-emerald-500', block: 'bg-emerald-500/85 text-white border-emerald-500' },
  { key: 'amber', label: 'Amber', swatch: 'bg-amber-500', block: 'bg-amber-500/85 text-white border-amber-500' },
  { key: 'rose', label: 'Rose', swatch: 'bg-rose-500', block: 'bg-rose-500/85 text-white border-rose-500' },
] as const

// ===================== Helpers =====================

function colorBlockClass(key: string) {
  return COLOR_OPTIONS.find((c) => c.key === key)?.block || COLOR_OPTIONS[0].block
}

function hourValue(time: string) {
  return parseInt(time.split(':')[0], 10)
}

function formatTime(time: string) {
  const [hStr, mStr] = time.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  const ampm = h < 12 ? 'AM' : 'PM'
  const hour12 = h % 12 || 12
  return `${hour12}:${mStr.padStart(2, '0')} ${ampm}`
}

function resourceIcon(type: string) {
  switch (type) {
    case 'note':
      return FileText
    case 'past_question':
      return FileQuestion
    case 'textbook':
      return Book
    case 'slides':
      return Presentation
    case 'video':
      return Video
    default:
      return FileText
  }
}

function departmentTint(department?: string) {
  switch (department) {
    case 'Biology Education':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    case 'Chemistry Education':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    case 'Mathematics Education':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    case 'Physics Education':
      return 'bg-primary/10 text-primary border-primary/20'
    case 'Integrated Science Education':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
    default:
      return 'bg-cyan-accent/10 text-cyan-accent dark:text-cyan-accent border-cyan-accent/20'
  }
}

function departmentIcon(department?: string) {
  switch (department) {
    case 'Biology Education':
      return Leaf
    case 'Chemistry Education':
      return Beaker
    case 'Mathematics Education':
      return Calculator
    case 'Physics Education':
      return Atom
    case 'Integrated Science Education':
      return Microscope
    default:
      return FlaskConical
  }
}

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `tt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ===================== Sub-components (Courses) =====================

function LevelPills({ active, onChange }: { active: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant={active === 'all' ? 'default' : 'outline'}
        onClick={() => onChange('all')}
        className="rounded-full h-9 px-4"
      >
        All Levels
      </Button>
      {LEVELS.map((lvl) => (
        <Button
          key={lvl}
          size="sm"
          variant={active === lvl ? 'default' : 'outline'}
          onClick={() => onChange(lvl)}
          className="rounded-full h-9 px-4"
        >
          {lvl} Level
        </Button>
      ))}
    </div>
  )
}

function DepartmentPills({ active, onChange }: { active: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {DEPARTMENTS.map((d) => {
        const isActive = active === d.key
        return (
          <Button
            key={d.key}
            size="sm"
            variant={isActive ? 'default' : 'outline'}
            onClick={() => onChange(d.key)}
            className={cn('rounded-full h-9 px-4', !isActive && 'hover:bg-muted')}
          >
            {d.label}
          </Button>
        )
      })}
    </div>
  )
}

function CourseCard({ course, index, onView }: { course: Course; index: number; onView: (c: Course) => void }) {
  const DeptIcon = departmentIcon(course.department)
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4) }}
    >
      <Card className="h-full rounded-2xl hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 group flex flex-col">
        <CardContent className="flex flex-col gap-3 h-full">
          <div className="flex items-start justify-between gap-2">
            <Badge className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 rounded-md font-mono font-semibold">
              {course.code}
            </Badge>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <Badge variant="outline" className="rounded-full text-[11px] font-medium">
                <Layers className="h-3 w-3 mr-1 text-muted-foreground" />
                {course.level} Lvl
              </Badge>
              <Badge variant="outline" className="rounded-full text-[11px] font-medium">
                {course.semester}
              </Badge>
            </div>
          </div>
          <h3 className="font-semibold text-base leading-snug group-hover:text-primary transition-colors">
            {course.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1">
            {course.description || 'No description available.'}
          </p>
          {course.department && (
            <Badge variant="outline" className={cn('rounded-full text-[11px] font-medium w-fit', departmentTint(course.department))}>
              <DeptIcon className="h-3 w-3 mr-1" />
              {course.department}
            </Badge>
          )}
          <div className="flex flex-col gap-2 mt-1">
            {course.googleDriveUrl && (
              <Button
                size="sm"
                asChild
                className="w-full rounded-full bg-cyan-accent text-cyan-accent-foreground hover:bg-cyan-accent/90"
              >
                <a href={course.googleDriveUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open Materials
                </a>
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onView(course)}
              className={cn(
                'w-full rounded-full',
                !course.googleDriveUrl && 'group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors'
              )}
            >
              <BookOpen className="h-4 w-4" />
              View Resources
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function CourseSkeleton() {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex flex-col gap-3 h-full">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-20 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-5 w-28 rounded-full" />
        <Skeleton className="h-8 w-full rounded-full mt-2" />
      </CardContent>
    </Card>
  )
}

// ===================== Personal Timetable Builder =====================

function TimetableBuilder() {
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Form state
  const [course, setCourse] = useState('')
  const [day, setDay] = useState<string>('Monday')
  const [startTime, setStartTime] = useState<string>('08:00')
  const [endTime, setEndTime] = useState<string>('09:00')
  const [venue, setVenue] = useState('')
  const [color, setColor] = useState<string>('primary')

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TIMETABLE_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as TimetableEntry[]
        if (Array.isArray(parsed)) setEntries(parsed)
      }
    } catch {
      // ignore malformed storage
    }
    setHydrated(true)
  }, [])

  // Persist to localStorage whenever entries change (after hydration)
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(entries))
    } catch {
      // ignore quota errors
    }
  }, [entries, hydrated])

  const resetForm = useCallback(() => {
    setCourse('')
    setDay('Monday')
    setStartTime('08:00')
    setEndTime('09:00')
    setVenue('')
    setColor('primary')
  }, [])

  const handleAdd = useCallback(() => {
    const trimmedCourse = course.trim()
    if (!trimmedCourse) {
      toast.error('Please enter a course name')
      return
    }
    if (!venue.trim()) {
      toast.error('Please enter a venue')
      return
    }
    const startH = hourValue(startTime)
    const endH = hourValue(endTime)
    if (endH <= startH) {
      toast.error('End time must be after start time')
      return
    }

    const entry: TimetableEntry = {
      id: generateId(),
      course: trimmedCourse,
      day,
      startTime,
      endTime,
      venue: venue.trim(),
      color,
    }
    setEntries((prev) => [...prev, entry])
    toast.success('Class added to your timetable')
    setDialogOpen(false)
    resetForm()
  }, [course, day, startTime, endTime, venue, color, resetForm])

  const handleRemove = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    toast.success('Class removed')
  }, [])

  const handleClearAll = useCallback(() => {
    setEntries([])
    toast.success('Timetable cleared')
  }, [])

  // Build a quick lookup: entries by day
  const entriesByDay = useMemo(() => {
    const map: Record<string, TimetableEntry[]> = {}
    for (const dayName of DAYS) map[dayName] = []
    for (const e of entries) {
      if (map[e.day]) map[e.day].push(e)
    }
    return map
  }, [entries])

  const hasEntries = entries.length > 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-display tracking-tight">My Timetable</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Build your personal weekly schedule. {hasEntries ? `${entries.length} class${entries.length === 1 ? '' : 'es'} saved on this device.` : 'Saved privately on this device.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setDialogOpen(true)} className="rounded-full">
            <Plus className="h-4 w-4" />
            Add Class
          </Button>
          {hasEntries && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="rounded-full">
                  <Trash2 className="h-4 w-4" />
                  Clear Timetable
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all classes?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all {entries.length} class{entries.length === 1 ? '' : 'es'} from your timetable. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearAll}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Clear all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Empty state */}
      {!hasEntries ? (
        <Card className="rounded-2xl border-dashed bg-brand-gradient-soft">
          <CardContent className="py-14 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary glow-primary"
            >
              <CalendarClock className="h-10 w-10" strokeWidth={1.5} />
            </motion.div>
            <h3 className="font-display font-bold text-lg">Your timetable is empty</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Add your courses, labs, and seminars to build a personal weekly schedule. Everything stays on this device.
            </p>
            <Button onClick={() => setDialogOpen(true)} className="rounded-full mt-5">
              <Plus className="h-4 w-4" />
              Add your first class
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Weekly grid (desktop / horizontal scroll on mobile) */}
          <Card className="rounded-2xl overflow-hidden">
            <CardHeader className="border-b pb-4">
              <CardTitle className="font-display flex items-center gap-2 text-lg">
                <CalendarDays className="h-5 w-5 text-primary" />
                Weekly Schedule
              </CardTitle>
              <CardDescription>Mon–Sat, 8:00 AM – 5:00 PM. Hover a class to remove it.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto scrollbar-thin">
                <div
                  className="min-w-[860px] grid gap-px bg-border/60"
                  style={{
                    gridTemplateColumns: '88px repeat(6, minmax(140px, 1fr))',
                    gridTemplateRows: '44px repeat(9, minmax(60px, 1fr))',
                  }}
                >
                  {/* Header row: Time corner + 6 day headers */}
                  <div className="bg-muted/40 p-2 text-[11px] font-semibold text-muted-foreground flex items-center justify-center">
                    Time
                  </div>
                  {DAYS_SHORT.map((d, idx) => {
                    const dayName = DAYS[idx]
                    const count = entriesByDay[dayName]?.length || 0
                    return (
                      <div
                        key={d}
                        className="bg-muted/40 p-2 text-center text-xs font-semibold flex flex-col items-center justify-center"
                      >
                        <span>{d}</span>
                        {count > 0 && (
                          <span className="text-[10px] text-cyan-accent font-medium">{count} class{count === 1 ? '' : 'es'}</span>
                        )}
                      </div>
                    )
                  })}

                  {/* Time labels (left column) */}
                  {TIME_SLOTS.slice(0, 9).map((t, i) => (
                    <div
                      key={t}
                      style={{ gridColumn: 1, gridRow: i + 2 }}
                      className="bg-muted/20 p-2 text-[10px] text-muted-foreground font-medium flex items-start justify-center pt-1"
                    >
                      {formatTime(t)}
                    </div>
                  ))}

                  {/* Background cells for each day × hour */}
                  {DAYS.map((_, dIdx) =>
                    TIME_SLOTS.slice(0, 9).map((_, tIdx) => (
                      <div
                        key={`bg-${dIdx}-${tIdx}`}
                        style={{ gridColumn: dIdx + 2, gridRow: tIdx + 2 }}
                        className="bg-background"
                      />
                    ))
                  )}

                  {/* Entry blocks (positioned with grid-row span) */}
                  {entries.map((e) => {
                    const dIdx = DAYS.indexOf(e.day as (typeof DAYS)[number])
                    if (dIdx < 0) return null
                    const startH = hourValue(e.startTime)
                    const endH = hourValue(e.endTime)
                    // 8 AM maps to row 2 (after header row 1). So row start = startH - 8 + 2 = startH - 6
                    const rowStart = startH - 6
                    const rowSpan = Math.max(1, endH - startH)
                    return (
                      <div
                        key={e.id}
                        style={{
                          gridColumn: dIdx + 2,
                          gridRow: `${rowStart} / span ${rowSpan}`,
                        }}
                        className="group relative p-1.5"
                      >
                        <div
                          className={cn(
                            'h-full w-full rounded-lg border p-2 flex flex-col gap-0.5 shadow-sm overflow-hidden',
                            colorBlockClass(e.color)
                          )}
                        >
                          <div className="text-[11px] font-bold leading-tight line-clamp-2">{e.course}</div>
                          <div className="text-[10px] opacity-90 flex items-center gap-0.5 leading-tight">
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{e.venue}</span>
                          </div>
                          <div className="text-[10px] opacity-90 leading-tight mt-auto">
                            {formatTime(e.startTime)} – {formatTime(e.endTime)}
                          </div>
                          <button
                            type="button"
                            aria-label={`Remove ${e.course}`}
                            onClick={() => handleRemove(e.id)}
                            className="absolute top-1 right-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/30 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mobile list view */}
          <Card className="rounded-2xl lg:hidden">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base">By Day</CardTitle>
              <CardDescription>Quick list of all your classes.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border/60">
              {DAYS.map((dayName) => {
                const dayEntries = entriesByDay[dayName] || []
                if (dayEntries.length === 0) return null
                return (
                  <div key={dayName} className="p-4">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{dayName}</div>
                    <div className="space-y-2">
                      {dayEntries
                        .slice()
                        .sort((a, b) => hourValue(a.startTime) - hourValue(b.startTime))
                        .map((e) => (
                          <div
                            key={e.id}
                            className={cn(
                              'group flex items-start gap-3 rounded-xl border p-3',
                              colorBlockClass(e.color)
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm leading-tight truncate">{e.course}</div>
                              <div className="text-[11px] opacity-90 flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate">{e.venue}</span>
                              </div>
                              <div className="text-[11px] opacity-90 mt-0.5">
                                {formatTime(e.startTime)} – {formatTime(e.endTime)}
                              </div>
                            </div>
                            <button
                              type="button"
                              aria-label={`Remove ${e.course}`}
                              onClick={() => handleRemove(e.id)}
                              className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/20 hover:bg-black/40 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </>
      )}

      {/* Add Class Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Add Class to Timetable
            </DialogTitle>
            <DialogDescription>
              Build your personal weekly schedule. Saved privately on this device.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Course name */}
            <div className="space-y-1.5">
              <Label htmlFor="tt-course">Course name</Label>
              <Input
                id="tt-course"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. Quantum Mechanics or SED 301"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              />
            </div>

            {/* Day + Venue */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Day</Label>
                <Select value={day} onValueChange={setDay}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tt-venue">Venue</Label>
                <Input
                  id="tt-venue"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. Physics Lab 1"
                />
              </div>
            </div>

            {/* Start + End time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start time</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.slice(0, 9).map((t) => (
                      <SelectItem key={t} value={t}>{formatTime(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>End time</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.slice(1).map((t) => (
                      <SelectItem key={t} value={t}>{formatTime(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Color picker */}
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_OPTIONS.map((c) => {
                  const isSelected = color === c.key
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setColor(c.key)}
                      aria-label={c.label}
                      aria-pressed={isSelected}
                      className={cn(
                        'h-9 w-9 rounded-full border-2 transition-all flex items-center justify-center',
                        c.swatch,
                        isSelected ? 'border-foreground ring-2 ring-foreground/30 scale-110' : 'border-white/40 hover:scale-105'
                      )}
                    >
                      {isSelected && <Sparkles className="h-4 w-4 text-white" />}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4" />
              Add to Timetable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ===================== Main view =====================

export function AcademicsView() {
  const { navigate } = useNav()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeLevel, setActiveLevel] = useState<string>('all')
  const [activeDept, setActiveDept] = useState<string>('all')

  const [dialogCourse, setDialogCourse] = useState<Course | null>(null)
  const [dialogResources, setDialogResources] = useState<Resource[]>([])
  const [dialogLoading, setDialogLoading] = useState(false)

  const fetchCourses = useCallback(() => {
    let mounted = true
    setLoading(true)
    api
      .get<{ courses: Course[] }>('/courses')
      .then((res) => {
        if (!mounted) return
        setCourses(res.courses || [])
        setError(null)
      })
      .catch((e: unknown) => {
        if (!mounted) return
        setError(e instanceof Error ? e.message : 'Failed to load courses')
        setCourses([])
      })
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    return fetchCourses()
  }, [fetchCourses])

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (activeLevel !== 'all' && c.level !== activeLevel) return false
      if (activeDept !== 'all' && c.department !== activeDept) return false
      return true
    })
  }, [courses, activeLevel, activeDept])

  const openResources = useCallback(async (course: Course) => {
    setDialogCourse(course)
    setDialogResources([])
    setDialogLoading(true)
    try {
      const res = await api.get<{ resources: Resource[] }>(`/resources?courseId=${course.id}`)
      setDialogResources(res.resources || [])
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load resources')
    } finally {
      setDialogLoading(false)
    }
  }, [])

  return (
    <div className="animate-fade-in">
      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-grid pointer-events-none" aria-hidden />
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-64 w-[50rem] rounded-full bg-primary/20 blur-3xl pointer-events-none" aria-hidden />
        <div className="absolute top-20 right-12 h-32 w-32 rounded-full bg-cyan-accent/20 blur-3xl pointer-events-none" aria-hidden />

        <div className="container mx-auto px-4 lg:px-6 relative py-12 md:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <Badge variant="outline" className="mb-4 rounded-full bg-background/70 backdrop-blur px-3 py-1 border-primary/20">
              <Sparkles className="h-3.5 w-3.5 text-cyan-accent mr-1.5" />
              ULSESA Academic Hub
            </Badge>
            <h1 className="font-display font-extrabold tracking-tight text-3xl sm:text-4xl md:text-5xl leading-tight">
              Courses & <span className="text-gradient-brand">Timetable</span>
            </h1>
            <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-2xl">
              Browse all Science Education courses across our 5 cohorts, open Google Drive materials, and build your own personal weekly timetable.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ===================== TABS ===================== */}
      <section className="container mx-auto px-4 lg:px-6 py-8 md:py-12">
        <Tabs defaultValue="courses" className="gap-6">
          <TabsList className="bg-muted/60 rounded-full p-1 h-auto flex flex-wrap">
            <TabsTrigger value="courses" className="rounded-full px-5 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BookOpen className="h-4 w-4" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="timetable" className="rounded-full px-5 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CalendarDays className="h-4 w-4" />
              Timetable
            </TabsTrigger>
          </TabsList>

          {/* COURSES */}
          <TabsContent value="courses" className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold font-display tracking-tight">Science Education Courses</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {loading ? 'Loading courses…' : `${filtered.length} course${filtered.length === 1 ? '' : 's'} available`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('resources')}
                  className="rounded-full w-fit"
                >
                  Browse All Resources
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">Department</div>
                  <DepartmentPills active={activeDept} onChange={setActiveDept} />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">Level</div>
                  <LevelPills active={activeLevel} onChange={setActiveLevel} />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <CourseSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <Card className="rounded-2xl border-dashed">
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  <BookOpen className="h-9 w-9 mx-auto mb-3 opacity-40" />
                  Couldn&apos;t load courses right now.
                  <div className="text-xs mt-1 opacity-70">{error}</div>
                </CardContent>
              </Card>
            ) : filtered.length === 0 ? (
              <Card className="rounded-2xl border-dashed">
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  <BookOpen className="h-9 w-9 mx-auto mb-3 opacity-40" />
                  No courses match these filters.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((c, i) => (
                  <CourseCard key={c.id} course={c} index={i} onView={openResources} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* TIMETABLE — personal builder */}
          <TabsContent value="timetable" className="animate-fade-in">
            <TimetableBuilder />
          </TabsContent>
        </Tabs>
      </section>

      {/* ===================== COURSE RESOURCES DIALOG ===================== */}
      <Dialog open={!!dialogCourse} onOpenChange={(o) => !o && setDialogCourse(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {dialogCourse?.code} — Resources
            </DialogTitle>
            <DialogDescription>
              {dialogCourse?.title}{dialogCourse?.department ? ` • ${dialogCourse.department}` : ''} • {dialogCourse?.level} Level • {dialogCourse?.semester} Semester
            </DialogDescription>
          </DialogHeader>

          {dialogCourse?.googleDriveUrl && (
            <div className="flex items-center gap-3 rounded-xl bg-cyan-accent/10 border border-cyan-accent/20 p-3 text-sm">
              <ExternalLink className="h-4 w-4 text-cyan-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground">Course Google Drive folder</div>
                <div className="text-xs text-muted-foreground">All official course materials are hosted on Google Drive.</div>
              </div>
              <Button
                size="sm"
                asChild
                className="rounded-full bg-cyan-accent text-cyan-accent-foreground hover:bg-cyan-accent/90 shrink-0"
              >
                <a href={dialogCourse.googleDriveUrl} target="_blank" rel="noopener noreferrer">
                  Open
                </a>
              </Button>
            </div>
          )}

          {dialogLoading ? (
            <div className="space-y-2 py-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-24 rounded-full" />
                </div>
              ))}
            </div>
          ) : dialogResources.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No resources uploaded for this course yet.
              <div className="mt-3 flex flex-col sm:flex-row gap-2 justify-center">
                {dialogCourse?.googleDriveUrl && (
                  <Button size="sm" asChild className="rounded-full bg-cyan-accent text-cyan-accent-foreground hover:bg-cyan-accent/90">
                    <a href={dialogCourse.googleDriveUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Open Drive
                    </a>
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => { setDialogCourse(null); navigate('resources') }} className="rounded-full">
                  Browse all resources
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
              {dialogResources.map((r) => {
                const Icon = resourceIcon(r.type)
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 p-3 rounded-xl border hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm leading-snug truncate">{r.title}</div>
                      {r.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">{r.description}</div>
                      )}
                      <Badge variant="outline" className="mt-1 rounded-full text-[10px] capitalize">
                        {r.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toast.message('Downloading…', { description: r.title })}
                      className="rounded-full shrink-0"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Get
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AcademicsView
