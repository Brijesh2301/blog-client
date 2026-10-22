'use client'

import { MotionConfig } from 'framer-motion'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import * as React from 'react'

import { ConsentProvider } from '@/components/consent/consent-provider'

/**
 * Theme + motion providers.
 *
 * next-themes injects a tiny blocking inline script that sets the `dark` class
 * on <html> BEFORE first paint, which is what prevents the light-mode flash.
 * `disableTransitionOnChange` suppresses CSS transitions for one frame while
 * the theme swaps, so switching does not animate every colour on the page.
 *
 * MotionConfig reducedMotion="user" makes every framer-motion animation in the
 * tree honour prefers-reduced-motion without a per-component check.
 *
 * ConsentProvider sits INSIDE these rather than beside them because it is read
 * by components all over the tree — every ad slot, the banner, the footer's
 * settings link. It holds no visual state of its own, so its position in the
 * provider stack is about reach, not ordering.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      // Must match the storage key referenced in the no-flash script.
      storageKey="devlume-theme"
    >
      <MotionConfig reducedMotion="user">
        <ConsentProvider>{children}</ConsentProvider>
      </MotionConfig>
    </NextThemesProvider>
  )
}
