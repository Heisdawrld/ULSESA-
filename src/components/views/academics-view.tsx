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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  ArrowRight,
  Sparkles,
  Download,
  FileText,
  FileQuestion,
  Book,
  Presentation,
  Video,
  Clock,
  MapPin,
  Award,
  TrendingUp,
  ChevronRight,
  Layers,
  ExternalLink,
  FlaskConical,
  Atom,
  Leaf,
  Calculator,
  Beaker,
  Microscope,
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

// ===================== Static demo data =====================

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

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const
const TIME_SLOTS = [
  '08:00 — 09:00',
  '09:00 — 10:00',
  '10:00 — 11:00',
  '11:00 — 12:00',
  '12:00 — 13:00',
  '13:00 — 14:00',
  '14:00 — 15:00',
  '15:00 — 16:00',
] as const

type ClassBlock = {
  day: number
  slot: number
  code: string
  title: string
  venue: string
  tint: string
}

// 300 Level Science Education weekly schedule — codes: SED/BED/CED/MED/PED/IED
const TIMETABLE: ClassBlock[] = [
  { day: 0, slot: 0, code: 'PED 301', title: 'Quantum Mechanics Teaching', venue: 'Sci Ed Hall A', tint: 'bg-primary/15 text-primary border-primary/30' },
  { day: 0, slot: 2, code: 'SED 401', title: 'Curriculum Development', venue: 'Faculty Aud', tint: 'bg-cyan-accent/15 text-cyan-accent dark:text-cyan-accent border-cyan-accent/30' },
  { day: 0, slot: 5, code: 'MED 301', title: 'Algebra & Geometry Teaching', venue: 'Math Ed Lab', tint: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },

  { day: 1, slot: 1, code: 'PED 301', title: 'Quantum Mechanics Teaching', venue: 'Sci Ed Hall A', tint: 'bg-primary/15 text-primary border-primary/30' },
  { day: 1, slot: 3, code: 'CED 301', title: 'Physical Chemistry Teaching', venue: 'Chem Ed Lab', tint: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  { day: 1, slot: 6, code: 'MED 301', title: 'Algebra & Geometry Teaching', venue: 'Math Ed Lab', tint: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },

  { day: 2, slot: 0, code: 'BED 301', title: 'Genetics & Evolution Teaching (Lab)', venue: 'Bio Ed Lab', tint: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' },
  { day: 2, slot: 1, code: 'BED 301', title: 'Genetics & Evolution Teaching (Lab)', venue: 'Bio Ed Lab', tint: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' },
  { day: 2, slot: 4, code: 'PED 301', title: 'Quantum Tutorial', venue: 'Sci Ed Hall A', tint: 'bg-primary/15 text-primary border-primary/30' },

  { day: 3, slot: 1, code: 'MED 301', title: 'Algebra & Geometry Teaching', venue: 'Math Ed Lab', tint: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  { day: 3, slot: 3, code: 'IED 301', title: 'Environmental Science Education', venue: 'Int Sci Lab', tint: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' },
  { day: 3, slot: 5, code: 'CED 301', title: 'Physical Chemistry Teaching', venue: 'Chem Ed Lab', tint: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },

  { day: 4, slot: 0, code: 'SED 401', title: 'Curriculum Tutorial', venue: 'Faculty Aud', tint: 'bg-cyan-accent/15 text-cyan-accent dark:text-cyan-accent border-cyan-accent/30' },
  { day: 4, slot: 2, code: 'PED 301', title: 'Quantum Mechanics Teaching', venue: 'Sci Ed Hall A', tint: 'bg-primary/15 text-primary border-primary/30' },
  { day: 4, slot: 4, code: 'Seminar', title: 'ULSESA Departmental Seminar', venue: 'Main Hall', tint: 'bg-primary/15 text-primary border-primary/30' },
]

const SEMESTERS = ['First Semester 2025/2026', 'Second Semester 2024/2025'] as const

interface ResultRow {
  code: string
  title: string
  unit: number
  grade: string
  score: number
}

const RESULTS: Record<string, ResultRow[]> = {
  'First Semester 2025/2026': [
    { code: 'PED 301', title: 'Quantum Mechanics Teaching', unit: 3, grade: 'A', score: 78 },
    { code: 'CED 301', title: 'Physical Chemistry Teaching', unit: 3, grade: 'B', score: 68 },
    { code: 'MED 301', title: 'Algebra & Geometry Teaching', unit: 3, grade: 'A', score: 74 },
    { code: 'SED 401', title: 'Curriculum Development', unit: 2, grade: 'B', score: 65 },
    { code: 'BED 301', title: 'Genetics & Evolution Teaching', unit: 2, grade: 'A', score: 72 },
    { code: 'SED 399', title: 'Teaching Practice I', unit: 2, grade: 'A', score: 80 },
  ],
  'Second Semester 2024/2025': [
    { code: 'IED 201', title: 'Integrated Science Methods', unit: 3, grade: 'B', score: 64 },
    { code: 'SED 205', title: 'Educational Psychology', unit: 3, grade: 'A', score: 76 },
    { code: 'PED 201', title: 'Classical Mechanics for Educators', unit: 2, grade: 'A', score: 71 },
    { code: 'GST 202', title: 'Communication Skills', unit: 2, grade: 'B', score: 62 },
    { code: 'SED 299', title: 'Micro-Teaching Practicum', unit: 2, grade: 'A', score: 79 },
  ],
}

const GRADE_POINTS: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 }

function gradeBadgeClass(grade: string) {
  switch (grade) {
    case 'A':
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    case 'B':
      return 'bg-primary/15 text-primary border-primary/30'
    case 'C':
      return 'bg-cyan-accent/15 text-cyan-accent dark:text-cyan-accent border-cyan-accent/30'
    case 'D':
      return 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30'
    default:
      return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
  }
}

function computeCgpa(rows: ResultRow[]) {
  let totalUnits = 0
  let totalPoints = 0
  for (const r of rows) {
    const gp = GRADE_POINTS[r.grade] ?? 0
    totalPoints += gp * r.unit
    totalUnits += r.unit
  }
  return {
    cgpa: totalUnits ? totalPoints / totalUnits : 0,
    totalUnits,
    totalPoints,
  }
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

// ===================== Sub-components =====================

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

function TimetableGrid() {
  return (
    <Card className="rounded-2xl overflow-hidden">
      <CardHeader className="border-b">
        <CardTitle className="font-display flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Weekly Schedule — 300 Level
        </CardTitle>
        <CardDescription>First Semester, 2025/2026 session. Tap and drag horizontally on mobile to view all days.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto scrollbar-thin">
          <div className="min-w-[820px]">
            {/* Header row */}
            <div className="grid grid-cols-[120px_repeat(5,1fr)] border-b bg-muted/30">
              <div className="p-3 text-xs font-semibold text-muted-foreground border-r">
                Time
              </div>
              {DAYS.map((d) => (
                <div key={d} className="p-3 text-center text-sm font-semibold border-r last:border-r-0">
                  {d}
                </div>
              ))}
            </div>
            {/* Rows */}
            {TIME_SLOTS.map((slot, sIdx) => (
              <div key={slot} className="grid grid-cols-[120px_repeat(5,1fr)] border-b last:border-b-0 min-h-[64px]">
                <div className="p-3 text-[11px] text-muted-foreground border-r bg-muted/20 font-medium">
                  {slot}
                </div>
                {DAYS.map((_, dIdx) => {
                  const block = TIMETABLE.find((c) => c.day === dIdx && c.slot === sIdx)
                  return (
                    <div key={dIdx} className="border-r last:border-r-0 p-1.5">
                      {block ? (
                        <div className={cn('h-full rounded-lg border p-2 flex flex-col gap-0.5', block.tint)}>
                          <div className="text-[11px] font-bold font-mono">{block.code}</div>
                          <div className="text-[10px] font-medium leading-tight line-clamp-2">{block.title}</div>
                          <div className="text-[10px] opacity-80 flex items-center gap-0.5 mt-auto">
                            <MapPin className="h-2.5 w-2.5" /> {block.venue}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ResultsPanel() {
  const [semester, setSemester] = useState<string>(SEMESTERS[0])
  const rows = RESULTS[semester] || []
  const { cgpa, totalUnits } = useMemo(() => computeCgpa(rows), [rows])
  const cgpaPct = Math.min((cgpa / 5) * 100, 100)

  return (
    <div className="space-y-5">
      {/* CGPA Summary */}
      <Card className="rounded-2xl overflow-hidden">
        <div className="relative bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground">
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.2) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
            aria-hidden
          />
          <div className="absolute -top-16 -right-12 h-48 w-48 rounded-full bg-cyan-accent/30 blur-3xl pointer-events-none" aria-hidden />
          <CardContent className="relative grid sm:grid-cols-[auto_1fr] gap-6 items-center py-6">
            <div className="text-center sm:text-left">
              <div className="text-xs uppercase tracking-wider text-primary-foreground/70 font-semibold">Cumulative GPA</div>
              <div className="text-5xl font-bold font-display tabular-nums mt-1 leading-none">
                {cgpa.toFixed(2)}
                <span className="text-2xl text-primary-foreground/60">/5.00</span>
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-medium">
                <TrendingUp className="h-3 w-3 text-cyan-accent" />
                {cgpa >= 4.5 ? 'First Class' : cgpa >= 3.5 ? 'Second Class Upper' : cgpa >= 2.4 ? 'Second Class Lower' : 'Third Class'}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-primary-foreground/80">
                <span>Progress to 5.00</span>
                <span className="font-semibold tabular-nums">{cgpaPct.toFixed(0)}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-white/20 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-accent to-white rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${cgpaPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
                <div>
                  <div className="text-primary-foreground/70">Total Units</div>
                  <div className="font-bold text-lg tabular-nums">{totalUnits}</div>
                </div>
                <div>
                  <div className="text-primary-foreground/70">Courses</div>
                  <div className="font-bold text-lg tabular-nums">{rows.length}</div>
                </div>
                <div>
                  <div className="text-primary-foreground/70">Best Grade</div>
                  <div className="font-bold text-lg">{rows[0]?.grade || '—'}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Semester selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground mr-1">Semester:</span>
        {SEMESTERS.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={semester === s ? 'default' : 'outline'}
            onClick={() => setSemester(s)}
            className="rounded-full"
          >
            {s}
          </Button>
        ))}
      </div>

      {/* Results table */}
      <Card className="rounded-2xl overflow-hidden">
        <CardHeader className="border-b pb-4">
          <CardTitle className="font-display flex items-center gap-2 text-lg">
            <Award className="h-5 w-5 text-cyan-accent" />
            Course Results
          </CardTitle>
          <CardDescription>Official academic record — {semester}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-6">Code</TableHead>
                <TableHead>Course Title</TableHead>
                <TableHead className="text-center">Units</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center pr-6">Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.code}>
                  <TableCell className="pl-6 font-mono font-semibold text-sm">{r.code}</TableCell>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell className="text-center tabular-nums">{r.unit}</TableCell>
                  <TableCell className="text-center tabular-nums">{r.score}</TableCell>
                  <TableCell className="text-center pr-6">
                    <Badge variant="outline" className={cn('rounded-md font-bold w-8 h-8 justify-center', gradeBadgeClass(r.grade))}>
                      {r.grade}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Results shown are demo data. Official transcripts are issued by the ULSESA Exams Office.
      </p>
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
              Courses, <span className="text-gradient-brand">Timetable</span> & Results
            </h1>
            <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-2xl">
              Everything academic in one place — browse all Science Education courses across our 5 cohorts, view your weekly schedule, and track your CGPA progress.
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
            <TabsTrigger value="results" className="rounded-full px-5 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
              Results
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

          {/* TIMETABLE */}
          <TabsContent value="timetable" className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-xl md:text-2xl font-bold font-display tracking-tight">Weekly Timetable</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                ULSESA 300 Level Science Education schedule — tap and drag horizontally on mobile to view all days.
              </p>
            </div>
            <TimetableGrid />

            <Card className="rounded-2xl bg-muted/30">
              <CardContent className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Legend:</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-primary/30 border border-primary/40" /> Physics Edu (PED)</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-cyan-accent/30 border border-cyan-accent/40" /> General (SED)</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-500/30 border border-emerald-500/40" /> Maths Edu (MED)</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-500/30 border border-amber-500/40" /> Chem Edu (CED)</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-rose-500/30 border border-rose-500/40" /> Bio Edu (BED)</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-purple-500/30 border border-purple-500/40" /> Int Sci Edu (IED)</span>
              </CardContent>
            </Card>
          </TabsContent>

          {/* RESULTS */}
          <TabsContent value="results" className="animate-fade-in">
            <div className="mb-5">
              <h2 className="text-xl md:text-2xl font-bold font-display tracking-tight">Academic Results</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Track your CGPA and review per-semester Science Education course grades.
              </p>
            </div>
            <ResultsPanel />
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
