'use client'

import { Eye, FileText, Mail, MessageSquare, Plus, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { adminRequest } from '@/lib/admin-api'
import { cn, formatDate } from '@/lib/utils'
import type { AdminStats } from '@/types/admin'

/** Dashboard. One `/admin/stats` call; the API runs the aggregates in parallel. */
export function AdminDashboard() {
  const [stats, setStats] = React.useState<AdminStats | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    adminRequest<AdminStats>('/admin/stats')
      .then((data) => !cancelled && setStats(data))
      .catch(() => !cancelled && setError('Could not load dashboard statistics.'))
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <Shell>
        <p role="alert" className="text-danger-700 text-sm">
          {error}
        </p>
      </Shell>
    )
  }

  if (!stats) {
    return (
      <Shell>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="border-border bg-surface h-28 rounded-xl border" />
          ))}
        </div>
      </Shell>
    )
  }

  return (
    <Shell
      action={
        <Button asChild size="sm">
          <Link href="/admin/posts/new">
            <Plus aria-hidden="true" />
            New post
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          Icon={FileText}
          label="Published"
          value={stats.posts.published}
          sub={`${stats.posts.draft} draft · ${stats.posts.scheduled} scheduled`}
        />
        <Stat
          Icon={Eye}
          label="Total views"
          value={stats.views.total}
          sub="across published posts"
        />
        <Stat
          Icon={Mail}
          label="Subscribers"
          value={stats.subscribers.confirmed}
          sub={`${stats.subscribers.pending} awaiting confirmation`}
        />
        <Stat
          Icon={MessageSquare}
          label="Comments"
          value={stats.comments.pending}
          sub="awaiting moderation"
          tone={stats.comments.pending > 0 ? 'warn' : undefined}
        />
      </div>

      {stats.posts.staleCount > 0 ? (
        <Link
          href="/admin/seo"
          className="border-highlight/40 bg-highlight-soft hover:border-highlight mt-4 flex items-start gap-2.5 rounded-xl border p-4 text-sm transition-colors"
        >
          <TriangleAlert
            className="text-highlight mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <span>
            <strong className="font-semibold">
              {stats.posts.staleCount} post{stats.posts.staleCount === 1 ? '' : 's'} have
              not been reviewed in over a year.
            </strong>{' '}
            Freshness is a ranking factor — review them or mark them as still current.
          </span>
        </Link>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Most read">
          {stats.topPosts.length === 0 ? (
            <Empty>Nothing published yet.</Empty>
          ) : (
            <ol className="divide-hairline flex flex-col divide-y">
              {stats.topPosts.map((post, i) => (
                <li key={post.id} className="flex items-center gap-3 py-2.5">
                  <span className="font-display tabular text-foreground-subtle w-5 shrink-0 text-center text-sm font-semibold">
                    {i + 1}
                  </span>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="hover:text-primary min-w-0 flex-1 truncate text-sm"
                  >
                    {post.title}
                  </Link>
                  <ScorePill score={post.seoScore} />
                  <span className="tabular text-meta text-foreground-subtle shrink-0">
                    {post.viewCount.toLocaleString('en-US')}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Recently edited">
          {stats.recentPosts.length === 0 ? (
            <Empty>No posts yet.</Empty>
          ) : (
            <ul className="divide-hairline flex flex-col divide-y">
              {stats.recentPosts.map((post) => (
                <li key={post.id} className="flex items-center gap-3 py-2.5">
                  <Link
                    href={`/admin/posts/${post.id}`}
                    className="hover:text-primary min-w-0 flex-1 truncate text-sm"
                  >
                    {post.title}
                  </Link>
                  <StatusPill status={post.status} />
                  <span className="text-meta text-foreground-subtle shrink-0">
                    {formatDate(post.updatedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Posts by category" className="mt-6">
        <ul className="flex flex-col gap-2">
          {stats.categories.map((category) => {
            const max = Math.max(...stats.categories.map((c) => c.n), 1)
            return (
              <li key={category.slug} className="flex items-center gap-3">
                <span className="text-foreground-muted w-40 shrink-0 truncate text-sm">
                  {category.name}
                </span>
                <span
                  className="bg-primary/70 h-2 rounded-full"
                  style={{ width: `${Math.max(2, (category.n / max) * 100)}%` }}
                  aria-hidden="true"
                />
                <span className="tabular text-meta text-foreground-subtle shrink-0">
                  {category.n}
                </span>
              </li>
            )
          })}
        </ul>
      </Panel>
    </Shell>
  )
}

function Shell({
  children,
  action,
}: {
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="p-5 lg:p-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-h2 font-semibold tracking-tight">Dashboard</h1>
          <p className="text-foreground-muted mt-1 text-sm">
            How the site is doing, and what needs attention.
          </p>
        </div>
        {action}
      </header>
      {children}
    </div>
  )
}

function Stat({
  Icon,
  label,
  value,
  sub,
  tone,
}: {
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  label: string
  value: number
  sub: string
  tone?: 'warn'
}) {
  return (
    <div
      className={cn(
        'bg-surface rounded-xl border p-4',
        tone === 'warn' ? 'border-highlight/40' : 'border-border'
      )}
    >
      <div className="text-foreground-subtle flex items-center gap-2">
        <Icon className="size-4" aria-hidden />
        <span className="text-eyebrow font-sans uppercase">{label}</span>
      </div>
      <p className="font-display text-h2 tabular mt-2 font-bold">
        {value.toLocaleString('en-US')}
      </p>
      <p className="text-meta text-foreground-subtle mt-0.5">{sub}</p>
    </div>
  )
}

function Panel({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('border-border bg-surface rounded-xl border p-4', className)}>
      <h2 className="text-eyebrow text-foreground-subtle mb-2 font-sans uppercase">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-foreground-subtle py-6 text-center text-sm">{children}</p>
}

export function ScorePill({ score }: { score: number | null }) {
  if (score === null) return null
  return (
    <span
      title={`SEO score ${score}`}
      className={cn(
        'tabular shrink-0 rounded px-1.5 py-0.5 text-[0.625rem] font-semibold',
        score >= 85
          ? 'bg-success-100 text-success-700 dark:bg-success-500/15'
          : score >= 70
            ? 'bg-highlight-soft text-highlight'
            : 'bg-danger-100 text-danger-700 dark:bg-danger-500/15'
      )}
    >
      {score}
    </span>
  )
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2 py-0.5 text-[0.625rem] font-medium capitalize',
        status === 'published'
          ? 'bg-success-100 text-success-700 dark:bg-success-500/15'
          : status === 'scheduled'
            ? 'bg-secondary-soft text-secondary'
            : 'bg-surface-2 text-foreground-muted'
      )}
    >
      {status.replace('_', ' ')}
    </span>
  )
}
