import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import type { Pagination as PaginationType } from '@/types/content'

/**
 * Crawlable pagination.
 *
 * Every page is a real `<a href="?page=N">`, rendered server-side. This is a
 * hard SEO requirement, not a preference: "load more" buttons and infinite
 * scroll leave posts past page 1 with no crawlable path, so they are
 * discoverable only through the sitemap and accumulate no internal link signal.
 *
 * `rel="prev"` / `rel="next"` are included for the crawlers that still read
 * them. Google retired them as an indexing signal, but they remain valid HTML
 * and cost nothing.
 *
 * The window is deliberately small (first, last, and a few either side of the
 * current page) so a 60-page archive does not emit 60 links from every page.
 */
export function Pagination({
  pagination,
  basePath,
  searchParams = {},
  className,
}: {
  pagination: PaginationType
  /** Path without the query string, e.g. `/blog` or `/category/performance`. */
  basePath: string
  /** Other filters to preserve across page links. */
  searchParams?: Record<string, string | undefined>
  className?: string
}) {
  const { page, totalPages, hasPrev, hasNext } = pagination
  if (totalPages <= 1) return null

  const href = (target: number) => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value)
    }
    // Page 1 is the canonical bare URL: /blog, never /blog?page=1.
    if (target > 1) params.set('page', String(target))
    const qs = params.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-center gap-1.5', className)}
    >
      <Link
        href={href(page - 1)}
        rel="prev"
        aria-label="Previous page"
        aria-disabled={!hasPrev}
        tabIndex={hasPrev ? undefined : -1}
        className={cn(
          'border-border inline-flex h-10 items-center gap-1 rounded-lg border px-3',
          'text-sm font-medium transition-colors',
          hasPrev
            ? 'text-foreground-muted hover:border-border-strong hover:text-foreground'
            : 'pointer-events-none opacity-40'
        )}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Previous</span>
      </Link>

      <ol className="flex items-center gap-1">
        {buildWindow(page, totalPages).map((entry, i) =>
          entry === 'gap' ? (
            <li
              key={`gap-${i}`}
              aria-hidden="true"
              className="text-foreground-subtle px-1"
            >
              …
            </li>
          ) : (
            <li key={entry}>
              <Link
                href={href(entry)}
                aria-label={`Page ${entry}`}
                aria-current={entry === page ? 'page' : undefined}
                className={cn(
                  'inline-flex size-10 items-center justify-center rounded-lg',
                  'tabular text-sm font-medium transition-colors',
                  entry === page
                    ? 'bg-primary text-foreground-onbrand'
                    : 'border-border text-foreground-muted hover:border-border-strong hover:text-foreground border'
                )}
              >
                {entry}
              </Link>
            </li>
          )
        )}
      </ol>

      <Link
        href={href(page + 1)}
        rel="next"
        aria-label="Next page"
        aria-disabled={!hasNext}
        tabIndex={hasNext ? undefined : -1}
        className={cn(
          'border-border inline-flex h-10 items-center gap-1 rounded-lg border px-3',
          'text-sm font-medium transition-colors',
          hasNext
            ? 'text-foreground-muted hover:border-border-strong hover:text-foreground'
            : 'pointer-events-none opacity-40'
        )}
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
    </nav>
  )
}

/** First, last, and a window around the current page, with gap markers. */
function buildWindow(page: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const window = new Set<number>([1, total, page])
  for (let offset = 1; offset <= 1; offset++) {
    if (page - offset > 1) window.add(page - offset)
    if (page + offset < total) window.add(page + offset)
  }
  // Keep the control a stable width near the ends.
  if (page <= 3) [2, 3, 4].forEach((n) => n < total && window.add(n))
  if (page >= total - 2)
    [total - 1, total - 2, total - 3].forEach((n) => n > 1 && window.add(n))

  const sorted = [...window].sort((a, b) => a - b)
  const out: (number | 'gap')[] = []
  let previous = 0
  for (const n of sorted) {
    if (previous && n - previous > 1) out.push('gap')
    out.push(n)
    previous = n
  }
  return out
}
