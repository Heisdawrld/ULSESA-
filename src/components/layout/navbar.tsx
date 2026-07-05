'use client'

import Image from 'next/image'
import { useNav } from '@/lib/stores/nav-store'
import { useAuth } from '@/lib/stores/auth-store'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Menu, Home, BookOpen, Vote, Users, LifeBuoy, LogOut, LayoutDashboard, Info, ChevronRight, Sparkles } from 'lucide-react'
import { useState } from 'react'

const desktopNav = [
  { label: 'Home', view: 'home' as const },
  { label: 'Students', view: 'dashboard' as const },
  { label: 'Academics', view: 'academics' as const },
  { label: 'Elections', view: 'elections' as const },
  { label: 'Community', view: 'community' as const },
  { label: 'Resources', view: 'resources' as const },
  { label: 'About', view: 'about' as const },
  { label: 'Help', view: 'help' as const },
]

const mobileNav = [
  { label: 'Home', view: 'home' as const, icon: Home },
  { label: 'Academics', view: 'academics' as const, icon: BookOpen },
  { label: 'Vote', view: 'elections' as const, icon: Vote },
  { label: 'Community', view: 'community' as const, icon: Users },
  { label: 'Profile', view: 'dashboard' as const, icon: LayoutDashboard },
]

export function Navbar() {
  const { view, navigate } = useNav()
  const { student, logoutStudent } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 glass">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <button
          onClick={() => navigate('home')}
          className="flex items-center gap-2.5 group"
        >
          <div className="relative h-10 w-10 rounded-xl overflow-hidden ring-1 ring-primary/20 shadow-lg shadow-primary/10 transition-transform group-hover:scale-105">
            <Image
              src="/ulsesa-logo.jpg"
              alt="ULSESA Logo"
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-bold leading-tight font-display tracking-tight">ULSESA</p>
            <p className="text-[10px] text-muted-foreground leading-tight">UNILAG • Faculty of Education</p>
          </div>
        </button>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {desktopNav.map((item) => (
            <button
              key={item.view}
              onClick={() => navigate(item.view)}
              className={`relative px-3 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground ${
                view === item.view ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {item.label}
              {view === item.view && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-6 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {student ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                  <Avatar className="h-9 w-9 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {student.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  {student.isVerified && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{student.fullName}</span>
                    <span className="text-xs text-muted-foreground">{student.matricNumber}</span>
                    {student.isVerified && (
                      <Badge className="mt-1 w-fit bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 text-[10px]">Verified</Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('dashboard')}>
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('elections')}>
                  <Vote className="mr-2 h-4 w-4" /> Elections
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { logoutStudent(); navigate('home') }} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={() => navigate('auth')}
              size="sm"
              className="hidden sm:inline-flex bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg shadow-primary/20"
            >
              Sign In
            </Button>
          )}

          {/* Mobile menu trigger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              <SheetHeader className="px-6 pt-6 pb-4 border-b">
                <SheetTitle className="text-left">
                  <div className="flex items-center gap-2.5">
                    <div className="relative h-9 w-9 rounded-lg overflow-hidden ring-1 ring-primary/20">
                      <Image src="/ulsesa-logo.jpg" alt="ULSESA" fill className="object-cover" sizes="36px" />
                    </div>
                    <div>
                      <span className="font-display font-bold block leading-tight">ULSESA Portal</span>
                      <span className="text-[10px] text-muted-foreground">Shaping Innovators</span>
                    </div>
                  </div>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-4">
                {desktopNav.map((item) => (
                  <button
                    key={item.view}
                    onClick={() => { navigate(item.view); setMobileOpen(false) }}
                    className={`flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                      view === item.view
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-accent text-foreground'
                    }`}
                  >
                    {item.label}
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </button>
                ))}
                {!student && (
                  <Button
                    onClick={() => { navigate('auth'); setMobileOpen(false) }}
                    className="mt-2 bg-primary hover:bg-primary/90 rounded-full"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Sign In
                  </Button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

export function MobileBottomNav() {
  const { view, navigate } = useNav()
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 glass pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {mobileNav.map((item) => {
          const Icon = item.icon
          const isActive = view === item.view
          return (
            <button
              key={item.view}
              onClick={() => navigate(item.view)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <div className={`relative ${isActive ? 'scale-110' : ''} transition-transform`}>
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
