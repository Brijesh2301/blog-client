'use client'

import * as NavigationMenu from '@radix-ui/react-navigation-menu'

import { localePath, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { ChevronDown, Search } from 'lucide-react'
import Link from 'next/link'

import { Logo } from '@/components/brand/logo'
import { MainNavLinks } from '@/components/layout/main-nav'
import { MobileNav } from '@/components/layout/mobile-nav'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Button } from '@/components/ui/button'
import { categories } from '@/config/navigation'
import { useScrolledPast } from '@/lib/hooks'
import { cn } from '@/lib/utils'

/**
 * Sticky glass header.
 *
 * CLS: the header reserves a fixed 4rem height at every scroll position. The
 * "shrink on scroll" effect changes padding and shadow on the INNER bar only,
 * so the sticky element never changes the space it occupies and content below
 * it never moves.
 *
 * INP: the scroll listener is passive and only calls setState when the
 * threshold is actually crossed, so a long scroll triggers two renders, not
 * one per frame.
 *
 * Crawlability: the header mega-menu mounts its panel on demand (Radix
 * behaviour), so it is NOT the crawl path for category pages. Every category
 * is a plain server-rendered <a> in the footer on every page — see
 * components/layout/site-footer.tsx.
 */
export function SiteHeader({
  locale,
  onOpenSearch,
}: {
  locale: Locale
  /** Opens the command palette. Provided by the palette provider. */
  onOpenSearch?: () => void
}) {
  const t = getDictionary(locale)

  // Subscribes to window scroll via useSyncExternalStore (see lib/hooks.ts):
  // a passive listener, a boolean snapshot, and React bails out on every
  // event that does not cross the threshold.
  const scrolled = useScrolledPast(12)

  return (
    <header
      // h-16 is fixed for the life of the page; only the inner bar animates.
      className="sticky top-0 z-50 h-16 w-full"
    >
      <div
        className={cn(
          'ease-out-expo absolute inset-0 border-b transition-all duration-300',
          scrolled
            ? 'glass border-glass-border shadow-sm'
            : 'bg-background/0 border-transparent'
        )}
      />

      <div className="relative mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        {/* The logo must return a Hindi reader to the Hindi home, not English. */}
        <Logo href={localePath('/', locale)} />

        {/* ── Desktop navigation ───────────────────────────────────────── */}
        <NavigationMenu.Root
          delayDuration={120}
          className="relative ml-4 hidden lg:block"
        >
          <NavigationMenu.List className="flex items-center gap-0.5">
            {/* Topics mega-menu */}
            <NavigationMenu.Item>
              <NavigationMenu.Trigger
                className={cn(
                  'group inline-flex h-9 items-center gap-1 rounded-md px-3',
                  'text-foreground-muted font-sans text-[0.9375rem] font-medium',
                  'hover:bg-surface-2 hover:text-foreground transition-colors',
                  'data-[state=open]:bg-surface-2 data-[state=open]:text-foreground'
                )}
              >
                {t.nav.topics}
                <ChevronDown
                  aria-hidden="true"
                  className="size-3.5 transition-transform duration-300 group-data-[state=open]:rotate-180"
                />
              </NavigationMenu.Trigger>

              <NavigationMenu.Content
                className={cn(
                  'absolute left-0 top-full mt-2 w-[min(42rem,calc(100vw-2rem))]',
                  'border-border bg-surface-raised rounded-2xl border p-3 shadow-xl',
                  'data-[motion=from-start]:animate-fade-in',
                  'data-[motion=from-end]:animate-fade-in',
                  'data-[state=open]:animate-fade-in'
                )}
              >
                <ul className="grid gap-1 sm:grid-cols-2">
                  {categories.map((category) => (
                    <li key={category.slug}>
                      <NavigationMenu.Link asChild>
                        <Link
                          href={localePath(category.href, locale)}
                          className="group/item hover:bg-surface-2 flex items-start gap-3 rounded-xl p-3 transition-colors"
                        >
                          <span
                            className={cn(
                              'mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg',
                              category.tone
                            )}
                          >
                            <category.icon className="size-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0">
                            <span className="text-foreground block font-sans text-sm font-semibold">
                              {category.title}
                            </span>
                            <span className="text-foreground-muted mt-0.5 block text-xs leading-relaxed">
                              {category.description}
                            </span>
                          </span>
                        </Link>
                      </NavigationMenu.Link>
                    </li>
                  ))}
                </ul>

                <div className="border-hairline mt-2 border-t px-3 pb-1 pt-3">
                  <NavigationMenu.Link asChild>
                    <Link
                      href={localePath('/topics', locale)}
                      className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                    >
                      Browse every topic and series
                    </Link>
                  </NavigationMenu.Link>
                </div>
              </NavigationMenu.Content>
            </NavigationMenu.Item>

            <MainNavLinks locale={locale} />
          </NavigationMenu.List>
        </NavigationMenu.Root>

        <div className="ml-auto flex items-center gap-2">
          {/* ── Search trigger ─────────────────────────────────────────── */}
          <button
            type="button"
            onClick={onOpenSearch}
            className={cn(
              'border-border group hidden h-9 items-center gap-2 rounded-md border',
              'bg-surface-2 text-foreground-subtle pl-3 pr-2 text-sm',
              'hover:border-border-strong hover:text-foreground-muted transition-colors',
              'sm:inline-flex'
            )}
          >
            <Search className="size-4" aria-hidden="true" />
            <span className="pr-6">{t.nav.search}</span>
            <kbd className="border-border bg-surface font-mono-ui text-foreground-subtle pointer-events-none hidden items-center gap-0.5 rounded border px-1.5 py-0.5 text-[0.6875rem] lg:inline-flex">
              <span className="text-[0.8em]">⌘</span>K
            </kbd>
          </button>

          {/* Icon-only search on narrow screens. */}
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label={t.nav.search}
            className="text-foreground-muted hover:bg-surface-2 hover:text-foreground grid size-9 place-items-center rounded-md transition-colors sm:hidden"
          >
            <Search className="size-[1.125rem]" aria-hidden="true" />
          </button>

          {/* Before the theme toggle: language is a content decision, theme
              is a preference, and the more consequential control comes first. */}
          <LanguageSwitcher locale={locale} className="hidden md:flex" />

          <ThemeToggle className="hidden sm:inline-flex" />

          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link href={localePath('/newsletter', locale)}>{t.nav.subscribe}</Link>
          </Button>

          <MobileNav onOpenSearch={onOpenSearch} />
        </div>
      </div>
    </header>
  )
}
