'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { AdminView } from '@/components/views/admin-view'

// Standalone ULSESA admin portal.
//
// The user (project owner) explicitly asked for their own /admin route — a
// self-contained admin portal with NO main-site Navbar / Footer / mobile
// bottom nav. The AdminView component already ships with its own login gate
// (AdminLogin) and its own sidebar, so this page just provides:
//   - a slim sticky header with the ULSESA logo + "Admin Portal" label
//   - a "back to main site" link
//   - the AdminView itself
//
// The header is exactly 4rem (h-16) tall so the existing `top-16` /
// `pt-16` / `min-h-[calc(100vh-4rem)]` offsets inside AdminView line up
// exactly the way they do when AdminView is rendered inside the main `/`
// route under the regular Navbar.
export default function AdminPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Sticky portal header (4rem — matches the offset AdminView expects) */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="group flex items-center gap-2.5"
            aria-label="Back to ULSESA main site"
          >
            <div className="relative size-9 shrink-0 overflow-hidden rounded-xl ring-1 ring-primary/20">
              <Image
                src="/ulsesa-logo.jpg"
                alt="ULSESA logo"
                fill
                sizes="36px"
                className="object-cover"
                priority
              />
            </div>
            <div className="leading-tight">
              <p className="font-display text-sm font-bold sm:text-base">
                ULSESA Admin Portal
              </p>
              <p className="hidden text-[10px] text-muted-foreground sm:block">
                University of Lagos · Science Education
              </p>
            </div>
          </Link>
        </div>

        <Link
          href="/"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:text-sm"
        >
          <ArrowLeft className="size-3.5" />
          <span className="hidden sm:inline">Back to main site</span>
          <span className="sm:hidden">Main site</span>
          <ExternalLink className="hidden size-3 sm:inline" />
        </Link>
      </header>

      {/* AdminView fills the rest of the viewport. Its own internal layout
          already accounts for the 4rem header above (uses pt-16 / top-16). */}
      <main className="flex-1">
        <AdminView />
      </main>
    </div>
  )
}
