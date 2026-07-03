'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useNav } from '@/lib/stores/nav-store'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  FileText,
  FileQuestion,
  Book,
  Presentation,
  Video,
  Download,
  Search,
  Sparkles,
  Library,
  Filter,
  X,
  ExternalLink,
  FolderOpen,
  Info,
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
  type: string // note | past_question | textbook | slides | video
  url: string
  description?: string
  course?: { code: string; title: string } | null
}

// ===================== Helpers =====================

const TYPES = [
  { key: 'all', label: 'All', icon: FolderOpen },
  { key: 'note', label: 'Notes', icon: FileText },
  { key: 'past_question', label: 'Past Questions', icon: FileQuestion },
  { key: 'textbook', label: 'Textbooks', icon: Book },
  { key: 'slides', label: 'Slides', icon: Presentation },
  { key: 'video', label: 'Videos', icon: Video },
] as const

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

function typeTint(type: string) {
  switch (type) {
    case 'note':
      return 'from-blue-500/15 to-blue-500/5 text-blue-600 dark:text-blue-400'
    case 'past_question':
      return 'from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400'
    case 'textbook':
      return 'from-primary/15 to-primary/5 text-primary'
    case 'slides':
      return 'from-cyan-accent/20 to-cyan-accent/5 text-cyan-accent dark:text-cyan-accent'
    case 'video':
      return 'from-purple-500/15 to-purple-500/5 text-purple-600 dark:text-purple-400'
    default:
      return 'from-muted to-muted/5 text-muted-foreground'
  }
}

function typeBadgeClass(type: string) {
  switch (type) {
    case 'note':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    case 'past_question':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
    case 'textbook':
      return 'bg-primary/10 text-primary border-primary/20'
    case 'slides':
      return 'bg-cyan-accent/15 text-cyan-accent dark:text-cyan-accent border-cyan-accent/30'
    case 'video':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

function prettyType(type: string) {
  return type.replace('_', ' ')
}

// ===================== Sub-components =====================

function ResourceCard({ resource, index }: { resource: Resource; index: number }) {
  const Icon = resourceIcon(resource.type)
  const tint = typeTint(resource.type)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4) }}
    >
      <Card className="h-full rounded-2xl hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300 group flex flex-col">
        <CardContent className="flex flex-col gap-3 h-full">
          <div className="flex items-start justify-between gap-2">
            <div className={cn('inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br', tint)}>
              <Icon className="h-6 w-6" />
            </div>
            <Badge variant="outline" className={cn('rounded-full text-[11px] font-semibold capitalize', typeBadgeClass(resource.type))}>
              {prettyType(resource.type)}
            </Badge>
          </div>

          <h3 className="font-semibold text-base leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {resource.title}
          </h3>
          {resource.description && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 flex-1">
              {resource.description}
            </p>
          )}

          {resource.course && (
            <div className="flex items-center gap-2 pt-1">
              <Badge variant="outline" className="rounded-md font-mono font-semibold text-[11px] bg-primary/5">
                {resource.course.code}
              </Badge>
              <span className="text-xs text-muted-foreground truncate">{resource.course.title}</span>
            </div>
          )}

          <Button
            size="sm"
            onClick={() => toast.success('Downloading…', { description: resource.title })}
            className="w-full rounded-full mt-1"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function ResourceSkeleton() {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex flex-col gap-3 h-full">
        <div className="flex items-center justify-between">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="h-9 w-full rounded-full" />
      </CardContent>
    </Card>
  )
}

// ===================== Main view =====================

export function ResourcesView() {
  const { navigate } = useNav()
  const [resources, setResources] = useState<Resource[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeType, setActiveType] = useState<string>('all')
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all')
  const [search, setSearch] = useState('')

  const fetchData = useCallback(() => {
    let mounted = true
    setLoading(true)
    api
      .get<{ resources: Resource[] }>('/resources')
      .then((res) => {
        if (!mounted) return
        setResources(res.resources || [])
        setError(null)
      })
      .catch((e: unknown) => {
        if (!mounted) return
        setError(e instanceof Error ? e.message : 'Failed to load resources')
        setResources([])
      })
      .finally(() => mounted && setLoading(false))

    api
      .get<{ courses: Course[] }>('/courses')
      .then((res) => {
        if (!mounted) return
        setCourses(res.courses || [])
      })
      .catch(() => {
        // optional — ignore
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    return fetchData()
  }, [fetchData])

  const filtered = useMemo(() => {
    const selectedCourse = selectedCourseId !== 'all'
      ? courses.find((c) => c.id === selectedCourseId)
      : null
    const q = search.trim().toLowerCase()
    return resources.filter((r) => {
      if (activeType !== 'all' && r.type !== activeType) return false
      // API returns resources with course.code (not courseId), so compare by code.
      if (selectedCourse && r.course?.code !== selectedCourse.code) return false
      if (q) {
        const matches =
          r.title.toLowerCase().includes(q) ||
          (r.description?.toLowerCase().includes(q) ?? false) ||
          (r.course?.code.toLowerCase().includes(q) ?? false) ||
          (r.course?.title.toLowerCase().includes(q) ?? false)
        if (!matches) return false
      }
      return true
    })
  }, [resources, activeType, selectedCourseId, search, courses])

  const hasActiveFilters = activeType !== 'all' || selectedCourseId !== 'all' || search !== ''
  const driveCoursesCount = useMemo(() => courses.filter((c) => c.googleDriveUrl).length, [courses])

  function clearFilters() {
    setActiveType('all')
    setSelectedCourseId('all')
    setSearch('')
  }

  return (
    <div className="animate-fade-in">
      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-grid pointer-events-none" aria-hidden />
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-64 w-[50rem] rounded-full bg-primary/20 blur-3xl pointer-events-none" aria-hidden />
        <div className="absolute top-16 right-16 h-32 w-32 rounded-full bg-cyan-accent/20 blur-3xl pointer-events-none" aria-hidden />

        <div className="container mx-auto px-4 lg:px-6 relative py-12 md:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <Badge variant="outline" className="mb-4 rounded-full bg-background/70 backdrop-blur px-3 py-1 border-primary/20">
              <Sparkles className="h-3.5 w-3.5 text-cyan-accent mr-1.5" />
              ULSESA Resource Library
            </Badge>
            <h1 className="font-display font-extrabold tracking-tight text-3xl sm:text-4xl md:text-5xl leading-tight">
              Course <span className="text-gradient-brand">materials</span> & study resources
            </h1>
            <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-2xl">
              Lecture notes, past questions, textbooks, slides, and video tutorials for all ULSESA Science Education courses — searchable and free to download.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ===================== LIBRARY ===================== */}
      <section className="container mx-auto px-4 lg:px-6 py-8 md:py-12">
        {/* Google Drive banner */}
        {!loading && driveCoursesCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6"
          >
            <Card className="rounded-2xl bg-cyan-accent/5 border-cyan-accent/30">
              <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-accent/15 text-cyan-accent shrink-0">
                  <Info className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Course materials also on Google Drive</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {driveCoursesCount} course{driveCoursesCount === 1 ? '' : 's'} have a dedicated Google Drive folder. Visit the Academics page and tap &ldquo;Open Materials&rdquo; on any course card.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('academics')}
                  className="rounded-full shrink-0 border-cyan-accent/40 text-cyan-accent hover:bg-cyan-accent/10"
                >
                  Go to Academics
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Search bar (always visible) */}
        <div className="mb-5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search by title, course code, or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-full pl-11 pr-4 h-12 text-base shadow-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card className="rounded-2xl mb-6">
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Filters</span>
              {hasActiveFilters && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearFilters}
                  className="ml-auto h-7 text-xs rounded-full"
                >
                  <X className="h-3 w-3" />
                  Clear all
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {/* Type pills */}
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 block">Resource type</Label>
                <div className="flex flex-wrap items-center gap-2">
                  {TYPES.map((t) => {
                    const Icon = t.icon
                    const isActive = activeType === t.key
                    return (
                      <Button
                        key={t.key}
                        size="sm"
                        variant={isActive ? 'default' : 'outline'}
                        onClick={() => setActiveType(t.key)}
                        className={cn('rounded-full h-9 px-4', !isActive && 'hover:bg-muted')}
                      >
                        <Icon className="h-4 w-4" />
                        {t.label}
                      </Button>
                    )
                  })}
                </div>
              </div>

              {/* Course dropdown */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground sm:w-32">
                  Course
                </Label>
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                  <SelectTrigger className="w-full sm:w-[320px] rounded-full">
                    <SelectValue placeholder="All courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All courses</SelectItem>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="font-mono font-semibold">{c.code}</span> — {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results count */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading resources…' : (
              <>
                <span className="font-semibold text-foreground">{filtered.length}</span> resource{filtered.length === 1 ? '' : 's'}
                {hasActiveFilters && ' matched'}
              </>
            )}
          </p>
          <Badge variant="outline" className="rounded-full bg-primary/5 text-primary border-primary/20 hidden sm:flex">
            <Library className="h-3 w-3 mr-1" />
            {resources.length} total
          </Badge>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <ResourceSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              <Library className="h-9 w-9 mx-auto mb-3 opacity-40" />
              Couldn&apos;t load resources right now.
              <div className="text-xs mt-1 opacity-70">{error}</div>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              <FolderOpen className="h-9 w-9 mx-auto mb-3 opacity-40" />
              No resources match your filters.
              {hasActiveFilters && (
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={clearFilters} className="rounded-full">
                    <X className="h-4 w-4" />
                    Clear filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((r, i) => (
              <ResourceCard key={r.id} resource={r} index={i} />
            ))}
          </div>
        )}

        {/* Help footer */}
        {!loading && !error && filtered.length > 0 && (
          <Card className="rounded-2xl mt-8 bg-muted/30 border-dashed">
            <CardContent className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
                <ExternalLink className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Looking for something specific?</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Browse the full academics catalogue for Google Drive folders, or email the ULSESA academic team for older materials.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toast.message('Need help?', { description: 'Email ulsesa01@gmail.com for archived materials.' })}
                className="rounded-full shrink-0"
              >
                Contact ULSESA
                <ExternalLink className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}

export default ResourcesView
