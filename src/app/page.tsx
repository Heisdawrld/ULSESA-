'use client'

import { useNav } from '@/lib/stores/nav-store'
import { Navbar, MobileBottomNav } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { lazy, Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load views for better performance
const HomeView = lazy(() => import('@/components/views/home-view').then(m => ({ default: m.HomeView })))
const AuthView = lazy(() => import('@/components/views/auth-view').then(m => ({ default: m.AuthView })))
const DashboardView = lazy(() => import('@/components/views/dashboard-view').then(m => ({ default: m.DashboardView })))
const ElectionsView = lazy(() => import('@/components/views/elections-view').then(m => ({ default: m.ElectionsView })))
const AcademicsView = lazy(() => import('@/components/views/academics-view').then(m => ({ default: m.AcademicsView })))
const CommunityView = lazy(() => import('@/components/views/community-view').then(m => ({ default: m.CommunityView })))
const ResourcesView = lazy(() => import('@/components/views/resources-view').then(m => ({ default: m.ResourcesView })))
const AboutView = lazy(() => import('@/components/views/about-view').then(m => ({ default: m.AboutView })))
const HelpView = lazy(() => import('@/components/views/help-view').then(m => ({ default: m.HelpView })))
const AdminView = lazy(() => import('@/components/views/admin-view').then(m => ({ default: m.AdminView })))

function ViewSkeleton() {
  return (
    <div className="container mx-auto px-4 lg:px-6 py-8 space-y-6">
      <Skeleton className="h-12 w-1/3" />
      <Skeleton className="h-64 w-full rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    </div>
  )
}

function ViewRouter() {
  const { view } = useNav()

  return (
    <Suspense fallback={<ViewSkeleton />}>
      {view === 'home' && <HomeView />}
      {view === 'auth' && <AuthView />}
      {view === 'dashboard' && <DashboardView />}
      {view === 'elections' && <ElectionsView />}
      {view === 'academics' && <AcademicsView />}
      {view === 'community' && <CommunityView />}
      {view === 'resources' && <ResourcesView />}
      {view === 'about' && <AboutView />}
      {view === 'help' && <HelpView />}
      {view === 'admin' && <AdminView />}
    </Suspense>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pb-20 lg:pb-0">
        <ViewRouter />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  )
}
