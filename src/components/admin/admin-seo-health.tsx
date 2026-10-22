'use client'

import Link from 'next/link'
import * as React from 'react'

import { adminRequest } from '@/lib/admin-api'
import { formatDate } from '@/lib/utils'
import type { ContentHealth } from '@/types/admin'

/**
 * Site-wide SEO health.
 *
 * These are the problems that are invisible from inside a single post but
 * obvious across the archive — two posts competing for the same title, a
 * published post with no meta description, a guide that has silently gone
 * stale. Each row links straight to the thing that needs fixing.
 */
export function AdminSeoHealth() {
  const [data, setData] = React.useState<ContentHealth | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    adminRequest<ContentHealth>('/admin/health')
      .then((next) => !cancelled && setData(next))
      .catch(() => !cancelled && setError('Could not load the health report.'))
    return () => {
      cancelled = true
    }
  }, [])

  const issueCount = data
    ? data.duplicateTitles.length +
      data.duplicateDescriptions.length +
      data.missingMeta.length +
      data.stale.length +
      data.lowScore.length
    : 0

  return (
    <div className="p-5 lg:p-8">
      <header className="mb-6">
        <h1 className="font-display text-h2 font-semibold tracking-tight">SEO health</h1>
        <p className="text-foreground-muted mt-1 text-sm">
          {data
            ? issueCount === 0
              ? 'No issues found across published posts.'
              : `${issueCount} issue${issueCount === 1 ? '' : 's'} worth fixing.`
            : 'Checking published posts…'}
        </p>
      </header>

      {error ? (
        <p role="alert" className="text-danger-700 text-sm">
          {error}
        </p>
      ) : !data ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="border-border bg-surface h-24 rounded-xl border" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <Group
            title="Duplicate titles"
            why="Two pages with the same title compete for the same query, and Google picks one — usually not the one you wanted."
            empty="Every published title is unique."
            items={data.duplicateTitles.map((row) => ({
              key: row.value ?? 'null',
              label: row.value ?? '(empty)',
              meta: `${row.n} posts`,
            }))}
          />

          <Group
            title="Duplicate descriptions"
            why="Duplicate descriptions get rewritten by Google, so you lose control of the snippet."
            empty="Every published description is unique."
            items={data.duplicateDescriptions.map((row) => ({
              key: row.value ?? 'null',
              label: row.value ?? '(empty)',
              meta: `${row.n} posts`,
            }))}
          />

          <Group
            title="Missing metadata"
            why="A published post without a description, focus keyword or cover alt text is shipping with known gaps."
            empty="Every published post has its metadata."
            items={data.missingMeta.map((row) => ({
              key: row.id,
              label: row.title,
              href: `/admin/posts/${row.id}`,
              meta: 'incomplete',
            }))}
          />

          <Group
            title="Stale content"
            why="Freshness is a ranking factor. Review these, then update the reviewed date — or say explicitly that they still stand."
            empty="Nothing has gone stale."
            items={data.stale.map((row) => ({
              key: row.id,
              label: row.title,
              href: `/admin/posts/${row.id}`,
              meta: row.reviewedAt
                ? `reviewed ${formatDate(row.reviewedAt)}`
                : 'never reviewed',
            }))}
          />

          <Group
            title="Low SEO score"
            why="Published posts scoring under 70. Usually a missing description, too few internal links, or thin wordcount."
            empty="Every published post scores 70 or above."
            items={data.lowScore.map((row) => ({
              key: row.id,
              label: row.title,
              href: `/admin/posts/${row.id}`,
              meta: `score ${row.seoScore ?? '–'}`,
            }))}
          />
        </div>
      )}
    </div>
  )
}

function Group({
  title,
  why,
  empty,
  items,
}: {
  title: string
  why: string
  empty: string
  items: { key: string; label: string; href?: string; meta: string }[]
}) {
  return (
    <section className="border-border bg-surface rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-h4 font-semibold tracking-tight">{title}</h2>
          <p className="text-meta text-foreground-subtle mt-1 max-w-2xl leading-relaxed">
            {why}
          </p>
        </div>
        <span
          className={
            items.length === 0
              ? 'bg-success-100 text-success-700 dark:bg-success-500/15 shrink-0 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold'
              : 'bg-danger-100 text-danger-700 dark:bg-danger-500/15 shrink-0 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold'
          }
        >
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-foreground-subtle mt-3 text-sm">{empty}</p>
      ) : (
        <ul className="divide-hairline mt-3 flex flex-col divide-y">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-3 py-2">
              {item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-primary min-w-0 flex-1 truncate text-sm"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
              )}
              <span className="text-meta text-foreground-subtle shrink-0">
                {item.meta}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
