'use client'

import { Check, Languages } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { LOCALES, LOCALE_META, localePath, splitLocale, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { cn } from '@/lib/utils'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * LANGUAGE SWITCHER
 * ═════════════════════════════════════════════════════════════════════════════
 * Real `<a href>` links, not a select that pushes a route.
 *
 * That is the whole point. A crawler following the header finds `/hi/blog/x`
 * as an ordinary link and indexes it; a `<select>` with an `onChange` handler
 * is invisible to it, and so is every Hindi page on the site. It also means
 * the browser's own affordances work — middle-click, open in new tab, copy
 * link address.
 *
 * Each option links to THE SAME PAGE in the other language, derived from the
 * current pathname, rather than dumping the reader on the homepage. Being
 * bounced to the homepage for choosing a language is how people conclude a
 * language option is broken.
 */
export function LanguageSwitcher({
  locale,
  className,
}: {
  locale: Locale
  className?: string
}) {
  const t = getDictionary(locale)
  const pathname = usePathname() ?? '/'

  /*
   * The pathname React sees is the REWRITTEN one — the proxy rewrites `/blog`
   * to `/en/blog` internally, so `usePathname()` can return either shape
   * depending on how the page was reached. `splitLocale` normalises both to
   * the locale-free path, which is what the links are then rebuilt from.
   */
  const { path } = splitLocale(pathname)

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      <Languages
        aria-hidden="true"
        className="text-foreground-subtle mr-1 size-4 shrink-0"
      />

      {/*
        A group label rather than a visual one. The flags-and-codes pattern is
        avoided deliberately: a flag is a country, not a language, and Hindi is
        not the flag of one country any more than English is.
      */}
      <span className="sr-only" id="language-switcher-label">
        {t.nav.changeLanguage}
      </span>

      <ul aria-labelledby="language-switcher-label" className="flex items-center gap-0.5">
        {LOCALES.map((candidate) => {
          const meta = LOCALE_META[candidate]
          const active = candidate === locale

          return (
            <li key={candidate}>
              <Link
                href={localePath(path, candidate)}
                // `hreflang` on the link itself tells a crawler what it will
                // find on the other end before it follows it.
                hrefLang={meta.bcp47}
                lang={meta.bcp47}
                aria-current={active ? 'true' : undefined}
                aria-label={
                  active
                    ? `${meta.englishLabel} (current)`
                    : `${t.language.switchTo} ${meta.englishLabel}`
                }
                className={cn(
                  'inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm transition-colors',
                  active
                    ? 'bg-surface-2 text-foreground font-medium'
                    : 'text-foreground-muted hover:bg-surface-2 hover:text-foreground'
                )}
              >
                {active ? <Check className="size-3" aria-hidden="true" /> : null}
                {/* The native name, so a speaker can recognise it. */}
                {meta.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * The compact form, for the mobile menu where horizontal space is scarce.
 *
 * Same links, same semantics — only the layout differs, so there is no second
 * implementation to keep in step.
 */
export function LanguageSwitcherStacked({ locale }: { locale: Locale }) {
  const t = getDictionary(locale)
  const pathname = usePathname() ?? '/'
  const { path } = splitLocale(pathname)

  return (
    <div className="flex flex-col gap-2">
      <span className="text-eyebrow text-foreground-subtle font-sans uppercase">
        {t.nav.language}
      </span>
      <ul className="flex gap-2">
        {LOCALES.map((candidate) => {
          const meta = LOCALE_META[candidate]
          const active = candidate === locale

          return (
            <li key={candidate} className="flex-1">
              <Link
                href={localePath(path, candidate)}
                hrefLang={meta.bcp47}
                lang={meta.bcp47}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'flex h-10 items-center justify-center gap-1.5 rounded-lg border text-sm transition-colors',
                  active
                    ? 'border-primary/40 bg-primary-soft text-primary font-medium'
                    : 'border-border text-foreground-muted hover:border-border-strong hover:text-foreground'
                )}
              >
                {active ? <Check className="size-3.5" aria-hidden="true" /> : null}
                {meta.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
