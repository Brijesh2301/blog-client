'use client'

import * as NavigationMenu from '@radix-ui/react-navigation-menu'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

import { mainNav } from '@/config/navigation'
import { localePath, splitLocale, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { cn } from '@/lib/utils'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MAIN NAV LINKS
 * ─────────────────────────────────────────────────────────────────────────────
 * `usePathname()` is a request-time value. Calling it anywhere in the tree of a
 * DYNAMIC route (`/blog/[slug]`) blocks that route from prerendering entirely —
 * Next fails the build with `CLIENT_HOOK_DYNAMIC`.
 *
 * The fix is to isolate the ONLY thing that needs the pathname — which link is
 * highlighted — behind its own Suspense boundary, with a fallback that renders
 * the exact same markup minus the highlight.
 *
 * What that buys:
 *  - every nav link is still in the prerendered HTML, so the crawler sees them
 *    and the header is part of the static shell;
 *  - the fallback and the resolved version are identical in size, so the
 *    highlight streaming in causes no layout shift;
 *  - dynamic routes prerender again.
 */

/** Pure renderer. `pathname: null` is the pre-hydration state. */
function NavLinks({ pathname, locale }: { pathname: string | null; locale: Locale }) {
  const t = getDictionary(locale)

  return (
    <>
      {mainNav.map((item) => {
        /*
         * Compare LOCALE-FREE paths.
         *
         * `pathname` is `/hi/blog` on the Hindi site while `item.href` is
         * `/blog`, so a direct comparison means no nav link is ever
         * highlighted in Hindi.
         */
        const current = pathname === null ? null : splitLocale(pathname).path
        const active =
          current !== null &&
          (current === item.href || current.startsWith(`${item.href}/`))

        return (
          <NavigationMenu.Item key={item.href}>
            <NavigationMenu.Link asChild active={active}>
              <Link
                href={localePath(item.href, locale)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex h-9 items-center rounded-md px-3',
                  'font-sans text-[0.9375rem] font-medium transition-colors',
                  active
                    ? 'bg-surface-2 text-foreground'
                    : 'text-foreground-muted hover:bg-surface-2 hover:text-foreground'
                )}
              >
                {t.nav[item.titleKey]}
              </Link>
            </NavigationMenu.Link>
          </NavigationMenu.Item>
        )
      })}
    </>
  )
}

function ActiveNavLinks({ locale }: { locale: Locale }) {
  return <NavLinks pathname={usePathname()} locale={locale} />
}

export function MainNavLinks({ locale }: { locale: Locale }) {
  return (
    <Suspense fallback={<NavLinks pathname={null} locale={locale} />}>
      <ActiveNavLinks locale={locale} />
    </Suspense>
  )
}
