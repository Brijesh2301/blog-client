'use client'

import { localePath, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { Command } from 'cmdk'
import { ArrowRight, FileText, Hash, Search, Sun, Moon, Monitor } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import * as React from 'react'

import { categories, footerNav, mainNav } from '@/config/navigation'
import { cn } from '@/lib/utils'

/**
 * Command palette (Cmd/Ctrl + K).
 *
 * Phase 1 indexes the static route graph — navigation, every category, and the
 * utility/legal pages — plus theme actions. Phase 3 adds debounced article
 * search against the API behind the same input; the UI does not change.
 *
 * SEO: this is a navigation convenience, never the only path to a page. Every
 * destination it offers is also a crawlable <a href> in the footer, and the
 * /search page provides the no-JS equivalent.
 */
export function CommandPalette({
  locale,
  open,
  onOpenChange,
}: {
  locale: Locale
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = getDictionary(locale)

  const router = useRouter()
  const { setTheme } = useTheme()

  const run = React.useCallback(
    (action: () => void) => {
      onOpenChange(false)
      // Let the dialog close and restore focus before navigating, otherwise
      // Radix focus restore fights the route change.
      requestAnimationFrame(action)
    },
    [onOpenChange]
  )

  const utilityPages = React.useMemo(() => footerNav.flatMap((group) => group.items), [])

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Search and navigate"
      // cmdk renders a Radix dialog internally: focus trap and Escape are handled.
      className={cn(
        'fixed left-1/2 top-[12vh] z-[90] w-[min(36rem,calc(100vw-2rem))]',
        '-translate-x-1/2 overflow-hidden rounded-2xl',
        'border-border bg-surface-raised border shadow-xl',
        'data-[state=open]:animate-fade-in'
      )}
      overlayClassName="fixed inset-0 z-[85] bg-ink-950/50 backdrop-blur-sm data-[state=open]:animate-fade-in"
    >
      <div className="border-hairline flex items-center gap-3 border-b px-4">
        <Search className="text-foreground-subtle size-4 shrink-0" aria-hidden="true" />
        <Command.Input
          placeholder={t.search.placeholder}
          className="text-foreground placeholder:text-foreground-subtle h-14 w-full bg-transparent font-sans text-[0.9375rem] outline-none"
        />
        <kbd className="border-border bg-surface font-mono-ui text-foreground-subtle hidden shrink-0 rounded border px-1.5 py-0.5 text-[0.6875rem] sm:block">
          esc
        </kbd>
      </div>

      <Command.List className="max-h-[min(24rem,60vh)] overflow-y-auto overscroll-contain p-2">
        <Command.Empty className="text-foreground-muted px-3 py-10 text-center text-sm">
          <p className="text-foreground font-medium">{t.listing.noResults}</p>
          <p className="mt-1">
            Try a broader term, or browse{' '}
            <button
              type="button"
              className="text-primary underline underline-offset-2"
              onClick={() => run(() => router.push(localePath('/blog', locale)))}
            >
              all articles
            </button>
            .
          </p>
        </Command.Empty>

        <Command.Group heading="Go to" className={groupClass}>
          {mainNav.map((item) => (
            <Command.Item
              key={item.href}
              value={`${item.title} ${item.href}`}
              onSelect={() => run(() => router.push(localePath(item.href, locale)))}
              className={itemClass}
            >
              <FileText className="text-foreground-subtle size-4" aria-hidden="true" />
              <span className="flex-1">{item.title}</span>
              <ArrowRight
                className="text-foreground-subtle size-3.5 opacity-0 data-[selected=true]:opacity-100"
                aria-hidden="true"
              />
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Topics" className={groupClass}>
          {categories.map((category) => (
            <Command.Item
              key={category.slug}
              value={`${category.title} ${category.description}`}
              onSelect={() => run(() => router.push(localePath(category.href, locale)))}
              className={itemClass}
            >
              <category.icon
                className="text-foreground-subtle size-4"
                aria-hidden="true"
              />
              <span className="flex-1">{category.title}</span>
              <Hash className="text-foreground-subtle size-3.5" aria-hidden="true" />
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Theme" className={groupClass}>
          <Command.Item
            value="light theme appearance"
            onSelect={() => run(() => setTheme('light'))}
            className={itemClass}
          >
            <Sun className="text-foreground-subtle size-4" aria-hidden="true" />
            Switch to light
          </Command.Item>
          <Command.Item
            value="dark theme appearance"
            onSelect={() => run(() => setTheme('dark'))}
            className={itemClass}
          >
            <Moon className="text-foreground-subtle size-4" aria-hidden="true" />
            Switch to dark
          </Command.Item>
          <Command.Item
            value="system theme appearance auto"
            onSelect={() => run(() => setTheme('system'))}
            className={itemClass}
          >
            <Monitor className="text-foreground-subtle size-4" aria-hidden="true" />
            Match system
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Pages" className={groupClass}>
          {utilityPages.map((item) => (
            <Command.Item
              key={item.href}
              value={`${item.title} ${item.href}`}
              onSelect={() => run(() => router.push(localePath(item.href, locale)))}
              className={itemClass}
            >
              <FileText className="text-foreground-subtle size-4" aria-hidden="true" />
              {item.title}
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  )
}

const groupClass = cn(
  '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2',
  '[&_[cmdk-group-heading]]:font-sans [&_[cmdk-group-heading]]:text-eyebrow',
  '[&_[cmdk-group-heading]]:uppercase',
  '[&_[cmdk-group-heading]]:text-foreground-subtle'
)

const itemClass = cn(
  'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5',
  'font-sans text-sm text-foreground-muted',
  'data-[selected=true]:bg-surface-2 data-[selected=true]:text-foreground'
)
