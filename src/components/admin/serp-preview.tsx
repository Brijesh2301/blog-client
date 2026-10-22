'use client'

import { Globe, Monitor, Smartphone } from 'lucide-react'
import * as React from 'react'

import { cn, truncate } from '@/lib/utils'

/**
 * Live SERP preview, desktop and mobile.
 *
 * Why both: Google truncates at different points on each, and mobile is the
 * indexing default. A title that fits on desktop and is cut on mobile is the
 * single most common thing writers miss, so the preview defaults to mobile.
 *
 * The pixel widths below are approximations of Google's rendering, not exact
 * measurements — they are tuned to truncate at roughly the same point as the
 * real thing, which is what makes the preview useful rather than decorative.
 */

const DESKTOP_TITLE = 60
const MOBILE_TITLE = 52
const DESKTOP_DESC = 160
const MOBILE_DESC = 130

export function SerpPreview({
  title,
  description,
  slug,
  siteUrl,
  breadcrumb,
}: {
  title: string
  description: string
  slug: string
  siteUrl: string
  breadcrumb?: string
}) {
  const [device, setDevice] = React.useState<'mobile' | 'desktop'>('mobile')
  const isMobile = device === 'mobile'

  const shownTitle = truncate(
    title || 'Untitled post',
    isMobile ? MOBILE_TITLE : DESKTOP_TITLE
  )
  const shownDesc = truncate(
    description || 'No meta description yet. Google will invent a snippet from the page.',
    isMobile ? MOBILE_DESC : DESKTOP_DESC
  )

  const host = siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const path = [breadcrumb, slug].filter(Boolean).join(' › ')

  return (
    <section
      aria-labelledby="serp-heading"
      className="border-border bg-surface rounded-xl border p-4"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3
          id="serp-heading"
          className="text-eyebrow text-foreground-subtle font-sans uppercase"
        >
          Search preview
        </h3>
        <div
          role="radiogroup"
          aria-label="Preview device"
          className="border-border bg-surface-2 inline-flex items-center gap-0.5 rounded-full border p-0.5"
        >
          {(
            [
              ['mobile', Smartphone, 'Mobile'],
              ['desktop', Monitor, 'Desktop'],
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={device === value}
              aria-label={`${label} preview`}
              onClick={() => setDevice(value)}
              className={cn(
                'grid size-7 place-items-center rounded-full transition-colors',
                device === value
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-foreground-subtle hover:text-foreground'
              )}
            >
              <Icon className="size-3.5" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      {/* The preview deliberately uses its own typography, not the design
          system: it is imitating Google, and matching our brand fonts would
          make it misleading. */}
      <div
        className={cn(
          'dark:bg-ink-950 rounded-lg bg-white p-4',
          isMobile ? 'max-w-sm' : 'max-w-xl'
        )}
        style={{ fontFamily: 'arial, sans-serif' }}
      >
        <div className="flex items-center gap-2">
          <span className="border-ink-300 dark:border-ink-700 dark:bg-ink-900 grid size-6 shrink-0 place-items-center rounded-full border bg-white">
            <Globe className="text-ink-500 size-3" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="text-ink-900 dark:text-ink-100 block truncate text-[0.8125rem] leading-tight">
              {host}
            </span>
            <span className="text-ink-500 block truncate text-[0.75rem] leading-tight">
              {path ? `https://${host} › ${path}` : `https://${host}`}
            </span>
          </span>
        </div>

        <p
          className={cn(
            'mt-2 leading-snug text-[#1a0dab] dark:text-[#8ab4f8]',
            isMobile ? 'text-[1.0625rem]' : 'text-[1.25rem]'
          )}
        >
          {shownTitle}
        </p>

        <p className="text-ink-600 dark:text-ink-400 mt-1 text-[0.8125rem] leading-snug">
          {shownDesc}
        </p>
      </div>

      <dl className="text-meta mt-3 grid grid-cols-2 gap-2">
        <div className="bg-surface-2 flex items-center justify-between rounded-md px-2.5 py-1.5">
          <dt className="text-foreground-subtle">Title</dt>
          <dd
            className={cn(
              'tabular font-medium',
              title.length > DESKTOP_TITLE ? 'text-danger-700' : 'text-foreground-muted'
            )}
          >
            {title.length}/{DESKTOP_TITLE}
          </dd>
        </div>
        <div className="bg-surface-2 flex items-center justify-between rounded-md px-2.5 py-1.5">
          <dt className="text-foreground-subtle">Description</dt>
          <dd
            className={cn(
              'tabular font-medium',
              description.length > DESKTOP_DESC || description.length < 140
                ? 'text-danger-700'
                : 'text-foreground-muted'
            )}
          >
            {description.length}/{DESKTOP_DESC}
          </dd>
        </div>
      </dl>
    </section>
  )
}
