'use client'

import { Plus } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { ScorePill, StatusPill } from '@/components/admin/admin-dashboard'
import { Button } from '@/components/ui/button'
import { adminRequest } from '@/lib/admin-api'
import { cn, formatDate } from '@/lib/utils'
import type { AdminPostRow } from '@/types/admin'

const FILTERS = ['all', 'draft', 'in_review', 'scheduled', 'published'] as const

/** Post list. Includes drafts, which the public API never returns. */
export function AdminPostList() {
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]>('all')
  const [error, setError] = React.useState<string | null>(null)
  /**
   * Data is stored WITH the filter it belongs to, so "is it loading?" is
   * derived. Clearing it synchronously inside the effect would trigger a
   * cascading render, and could leave rows from the previous filter on screen
   * if a request failed.
   */
  const [loaded, setLoaded] = React.useState<{
    filter: string
    posts: AdminPostRow[]
  } | null>(null)

  React.useEffect(() => {
    let cancelled = false
    const query = filter === 'all' ? '' : `?status=${filter}`

    adminRequest<{ posts: AdminPostRow[] }>(`/admin/posts${query}`)
      .then((data) => !cancelled && setLoaded({ filter, posts: data.posts }))
      .catch(() => !cancelled && setError('Could not load posts.'))

    return () => {
      cancelled = true
    }
  }, [filter])

  const posts = loaded && loaded.filter === filter ? loaded.posts : null

  return (
    <div className="p-5 lg:p-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-h2 font-semibold tracking-tight">Posts</h1>
          <p className="text-foreground-muted mt-1 text-sm">
            Drafts, scheduled and published work.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/posts/new">
            <Plus aria-hidden="true" />
            New post
          </Link>
        </Button>
      </header>

      <div
        role="tablist"
        aria-label="Filter by status"
        className="mb-4 flex flex-wrap gap-1.5"
      >
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            onClick={() => setFilter(value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium capitalize transition-colors',
              filter === value
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-border bg-surface text-foreground-muted hover:text-foreground'
            )}
          >
            {value.replace('_', ' ')}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="text-danger-700 text-sm">
          {error}
        </p>
      ) : !posts ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="border-border bg-surface h-14 rounded-lg border" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="text-foreground-subtle py-16 text-center text-sm">
          Nothing here. Write the first one.
        </p>
      ) : (
        /* Tables are the one element allowed to scroll horizontally, inside
           their own container, so the page body never does. */
        <div className="border-border bg-surface overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[46rem] text-sm">
            <thead>
              <tr className="border-hairline border-b text-left">
                <Th>Title</Th>
                <Th>Status</Th>
                <Th>SEO</Th>
                <Th>Words</Th>
                <Th>Views</Th>
                <Th>Updated</Th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-hairline border-b last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/posts/${post.id}`}
                      className="hover:text-primary font-medium"
                    >
                      {post.title}
                    </Link>
                    <span className="text-meta text-foreground-subtle mt-0.5 block">
                      {post.categoryName ?? 'Uncategorised'} · {post.authorName}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={post.status} />
                  </td>
                  <td className="px-4 py-3">
                    <ScorePill score={post.seoScore} />
                  </td>
                  <td className="tabular text-foreground-muted px-4 py-3">
                    {post.wordCount.toLocaleString('en-US')}
                  </td>
                  <td className="tabular text-foreground-muted px-4 py-3">
                    {post.viewCount.toLocaleString('en-US')}
                  </td>
                  <td className="text-meta text-foreground-subtle px-4 py-3">
                    {formatDate(post.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-eyebrow text-foreground-subtle px-4 py-2.5 font-sans uppercase">
      {children}
    </th>
  )
}
