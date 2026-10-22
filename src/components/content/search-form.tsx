'use client'

import { Search, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Search input.
 *
 * It is a real `<form method="get" action="/search">`, so submitting works with
 * JavaScript disabled — the server renders the results. The client enhancement
 * is debounced live navigation as you type.
 *
 * The debounce exists for two reasons: it stops a keystroke-per-request storm
 * against the API, and `router.replace` rather than `push` keeps the back
 * button useful (otherwise every character becomes a history entry).
 */
export function SearchForm({
  defaultValue = '',
  className,
}: {
  defaultValue?: string
  className?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [value, setValue] = React.useState(defaultValue)
  const [isPending, startTransition] = React.useTransition()

  // Keep in sync when the URL changes from elsewhere (back button, a link).
  const [lastDefault, setLastDefault] = React.useState(defaultValue)
  if (defaultValue !== lastDefault) {
    setLastDefault(defaultValue)
    setValue(defaultValue)
  }

  React.useEffect(() => {
    // Nothing to do when the input already matches the URL.
    if (value === (searchParams.get('q') ?? '')) return

    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      if (value.trim()) params.set('q', value.trim())
      startTransition(() => {
        router.replace(params.toString() ? `/search?${params}` : '/search', {
          scroll: false,
        })
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [value, router, searchParams])

  return (
    <form
      method="get"
      action="/search"
      role="search"
      className={cn('relative', className)}
      onSubmit={(event) => {
        // The debounce has already navigated; stop a duplicate submit.
        event.preventDefault()
      }}
    >
      <label htmlFor="site-search" className="sr-only">
        Search articles
      </label>

      <Search
        aria-hidden="true"
        className="text-foreground-subtle pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2"
      />

      <input
        id="site-search"
        name="q"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search articles…"
        autoComplete="off"
        // Autofocus is deliberate here and nowhere else: arriving on /search is
        // an explicit intent to type.
        autoFocus
        className={cn(
          'border-border bg-surface h-14 w-full rounded-xl border pl-11 pr-11',
          'text-foreground font-sans text-[0.9375rem]',
          'transition-[border-color,box-shadow] duration-200',
          'placeholder:text-foreground-subtle',
          'hover:border-border-strong',
          'focus:border-primary focus:ring-primary/15 focus:outline-none focus:ring-4'
        )}
      />

      {value ? (
        <button
          type="button"
          onClick={() => setValue('')}
          aria-label="Clear search"
          className="text-foreground-subtle hover:bg-surface-2 hover:text-foreground absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg transition-colors"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}

      <span aria-live="polite" className="sr-only">
        {isPending ? 'Searching' : ''}
      </span>
    </form>
  )
}
