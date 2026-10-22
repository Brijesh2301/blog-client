'use client'

import * as React from 'react'

import { CommandPalette } from '@/components/layout/command-palette'
import { SiteHeader } from '@/components/layout/site-header'
import type { Locale } from '@/i18n/config'

/**
 * Owns the command-palette state and wires it to the header triggers.
 *
 * This exists so the root layout can stay a Server Component: only the header
 * chrome and the palette are client code, while {children} — the actual page
 * content that needs to be indexed — is still server-rendered.
 */
export function SiteShell({ locale }: { locale: Locale }) {
  const [searchOpen, setSearchOpen] = React.useState(false)

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Cmd+K on macOS, Ctrl+K elsewhere.
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      <SiteHeader locale={locale} onOpenSearch={() => setSearchOpen(true)} />
      <CommandPalette locale={locale} open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
