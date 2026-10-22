'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import type { TocEntry } from '@/lib/article'

/**
 * Sticky table of contents with scroll-spy.
 *
 * The links themselves are plain server-rendered `<a href="#id">` anchors —
 * they work with JavaScript disabled, and they are real internal links the
 * crawler can see. The ONLY thing this client component adds is the active
 * highlight.
 *
 * Scroll-spy uses IntersectionObserver rather than a scroll handler, so it
 * costs nothing on the main thread between intersections. The rootMargin
 * pins the detection line near the top of the viewport: without it, a heading
 * counts as "visible" while it is still near the bottom of the screen and the
 * highlight runs ahead of what the reader is actually looking at.
 */
export function TableOfContents({
  entries,
  className,
}: {
  entries: TocEntry[]
  className?: string
}) {
  const [activeId, setActiveId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (entries.length === 0) return

    const headings = entries
      .map((entry) => document.getElementById(entry.id))
      .filter((el): el is HTMLElement => el !== null)

    if (headings.length === 0) return

    const observer = new IntersectionObserver(
      (observed) => {
        // Several headings can be in view at once; the topmost visible one is
        // the section the reader is in.
        const visible = observed
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (visible[0]) {
          setActiveId(visible[0].target.id)
          return
        }

        // Nothing intersecting means we are between headings — keep the last
        // one that has scrolled past the top, rather than clearing the
        // highlight and making the TOC flicker.
        const above = observed
          .filter((entry) => entry.boundingClientRect.top < 0)
          .sort((a, b) => b.boundingClientRect.top - a.boundingClientRect.top)

        if (above[0]) setActiveId(above[0].target.id)
      },
      {
        // Detection band sits just under the sticky header.
        rootMargin: '-88px 0px -70% 0px',
        threshold: 0,
      }
    )

    for (const heading of headings) observer.observe(heading)
    return () => observer.disconnect()
  }, [entries])

  if (entries.length < 2) return null

  return (
    <nav aria-label="On this page" className={cn('w-full', className)}>
      <h2 className="text-eyebrow text-foreground-subtle mb-3 font-sans uppercase">
        On this page
      </h2>
      <ol className="border-hairline flex flex-col gap-0.5 border-l">
        {entries.map((entry) => {
          const active = entry.id === activeId
          return (
            <li key={entry.id}>
              <a
                href={`#${entry.id}`}
                aria-current={active ? 'location' : undefined}
                className={cn(
                  'block border-l-2 py-1.5 text-sm leading-snug transition-colors',
                  'hover:text-foreground -ml-px',
                  entry.level === 3 ? 'pl-6 text-[0.8125rem]' : 'pl-4',
                  active
                    ? 'border-primary text-primary font-medium'
                    : 'text-foreground-muted border-transparent'
                )}
              >
                {entry.text}
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
