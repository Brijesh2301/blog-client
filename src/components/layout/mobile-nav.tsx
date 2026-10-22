'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, Menu, Search, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'
import { Suspense } from 'react'

import { Logo } from '@/components/brand/logo'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Button } from '@/components/ui/button'
import { categories, footerNav, mainNav } from '@/config/navigation'
import { cn } from '@/lib/utils'

/**
 * Mobile slide-in navigation.
 *
 * Radix Dialog gives the correct behaviour for free and all of it is required:
 * focus trap, focus restore to the trigger, Escape to close, scroll lock, and
 * aria-modal with the rest of the page marked aria-hidden.
 *
 * The panel is unmounted while closed, so none of this markup costs anything
 * on first paint; the category links it contains are also in the footer, so
 * nothing here is the only path to a page.
 */
/**
 * The panel reads `usePathname()`, a request-time value that would block every
 * dynamic route from prerendering. The trigger button is rendered statically
 * and the panel — which is closed, and therefore invisible, on first paint —
 * streams in behind Suspense. See components/layout/main-nav.tsx.
 */
export function MobileNav({ onOpenSearch }: { onOpenSearch?: () => void }) {
  return (
    <Suspense fallback={<MobileNavTrigger disabled />}>
      <MobileNavPanel onOpenSearch={onOpenSearch} />
    </Suspense>
  )
}

/** Rendered in the static shell and as the Suspense fallback: same box, same
 *  position, so the real trigger replacing it shifts nothing. */
function MobileNavTrigger({ disabled }: { disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label="Open menu"
      disabled={disabled}
      className="text-foreground-muted hover:bg-surface-2 hover:text-foreground grid size-9 place-items-center rounded-md transition-colors lg:hidden"
    >
      <Menu className="size-5" aria-hidden="true" />
    </button>
  )
}

function MobileNavPanel({ onOpenSearch }: { onOpenSearch?: () => void }) {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()
  const [lastPathname, setLastPathname] = React.useState(pathname)

  // Close on navigation: the panel would otherwise stay open over the new page.
  // This is React's "adjust state when a prop changes" pattern -- a guarded
  // setState during render, which costs one extra render pass only on the
  // renders where the route actually changed. An effect would instead fire on
  // every mount and is what the compiler lint flags.
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setOpen(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <MobileNavTrigger />
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="bg-ink-950/50 data-[state=open]:animate-fade-in fixed inset-0 z-[70] backdrop-blur-sm" />

        <Dialog.Content
          className={cn(
            'fixed inset-y-0 right-0 z-[80] flex w-[min(21rem,90vw)] flex-col',
            'border-border bg-background border-l shadow-xl',
            'data-[state=open]:animate-fade-in'
          )}
        >
          <Dialog.Title className="sr-only">Site navigation</Dialog.Title>

          <div className="border-hairline flex h-16 shrink-0 items-center justify-between border-b px-5">
            <Logo />
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close menu"
                className="text-foreground-muted hover:bg-surface-2 hover:text-foreground grid size-9 place-items-center rounded-md transition-colors"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          {/* overscroll-contain stops the page behind scrolling at the ends. */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-6">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onOpenSearch?.()
              }}
              className="border-border bg-surface-2 text-foreground-subtle hover:border-border-strong mb-7 flex h-11 w-full items-center gap-2.5 rounded-lg border px-3.5 text-sm transition-colors"
            >
              <Search className="size-4" aria-hidden="true" />
              Search articles
            </button>

            <nav aria-label="Main" className="flex flex-col gap-8">
              <ul className="flex flex-col gap-1">
                {mainNav.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex items-center justify-between rounded-lg px-3 py-2.5',
                          'font-display text-lg font-semibold tracking-tight transition-colors',
                          active
                            ? 'bg-primary-soft text-primary'
                            : 'text-foreground hover:bg-surface-2'
                        )}
                      >
                        {item.title}
                        <ArrowRight
                          className="text-foreground-subtle size-4"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  )
                })}
              </ul>

              <div>
                <h2 className="text-eyebrow text-foreground-subtle mb-3 px-3 font-sans uppercase">
                  Topics
                </h2>
                <ul className="flex flex-col gap-0.5">
                  {categories.map((category) => (
                    <li key={category.slug}>
                      <Link
                        href={category.href}
                        className="text-foreground-muted hover:bg-surface-2 hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                      >
                        <span
                          className={cn(
                            'grid size-7 shrink-0 place-items-center rounded-md',
                            category.tone
                          )}
                        >
                          <category.icon className="size-3.5" aria-hidden="true" />
                        </span>
                        {category.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="text-eyebrow text-foreground-subtle mb-3 px-3 font-sans uppercase">
                  Devlume
                </h2>
                <ul className="flex flex-col gap-0.5">
                  {footerNav
                    .find((g) => g.title === 'Devlume')
                    ?.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="text-foreground-muted hover:bg-surface-2 hover:text-foreground block rounded-lg px-3 py-2 text-sm transition-colors"
                        >
                          {item.title}
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            </nav>
          </div>

          <div className="border-hairline flex shrink-0 items-center justify-between gap-3 border-t px-5 py-4">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link href="/newsletter">Subscribe</Link>
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
