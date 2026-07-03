'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

/**
 * Theme toggle with a premium circular reveal transition.
 *
 * Uses the View Transitions API (Chrome 111+, Safari 18+, Edge 111+) to
 * animate the new theme "wiping in" as an expanding circle from the
 * exact pixel the user clicked. Falls back to instant switch on
 * unsupported browsers (Firefox, older Safari).
 *
 * The clip-path keyframes live in globals.css under
 * `::view-transition-new(root)`.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      const nextTheme = theme === 'dark' ? 'light' : 'dark'

      // Feature-detect the View Transitions API. If unsupported, just
      // flip the theme instantly — the user still gets the toggle.
      const supportsViewTransitions =
        typeof document !== 'undefined' &&
        // @ts-expect-error - startViewTransition is not in TS lib yet
        typeof document.startViewTransition === 'function'

      if (!supportsViewTransitions) {
        setTheme(nextTheme)
        return
      }

      // Capture click coordinates relative to the viewport. We store
      // them as CSS custom properties on :root so the clip-path
      // animation knows where to originate the circle.
      const x = e.clientX
      const y = e.clientY

      // Compute the furthest corner distance — this is the radius the
      // circle needs to reach to fully cover the viewport.
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      )

      document.documentElement.style.setProperty('--theme-x', `${x}px`)
      document.documentElement.style.setProperty('--theme-y', `${y}px`)
      document.documentElement.style.setProperty('--theme-r', `${endRadius}px`)

      // @ts-expect-error - startViewTransition is not in TS lib yet
      const transition = document.startViewTransition(() => {
        setTheme(nextTheme)
      })

      try {
        await transition.finished
      } catch {
        // User can interrupt the transition by clicking again — ignore.
      }
    },
    [theme, setTheme]
  )

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Toggle theme">
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Button
      ref={buttonRef}
      variant="ghost"
      size="icon"
      className="relative h-9 w-9 rounded-full overflow-hidden hover:bg-accent transition-colors"
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform duration-500 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform duration-500 dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
