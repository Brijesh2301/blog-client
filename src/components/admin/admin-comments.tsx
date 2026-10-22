'use client'

import { Check, ExternalLink, MessageSquare, ShieldAlert, Trash2 } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { adminRequest } from '@/lib/admin-api'
import { cn, formatDate } from '@/lib/utils'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * COMMENT MODERATION QUEUE
 * ═════════════════════════════════════════════════════════════════════════════
 * Not optional furniture: the API holds every guest comment and every comment
 * containing a link, so without this screen those comments are stored and
 * never seen by anyone. The moderation policy and this queue are one feature.
 *
 * Three outcomes, deliberately:
 *
 *   APPROVE  publishes it and purges the article's cached thread, so it
 *            appears in the server-rendered HTML within seconds.
 *   SPAM     keeps the row, for pattern-matching later. Deleting spam throws
 *            away the only evidence of what the spam looked like.
 *   DELETE   for comments that are not spam but should not stand — abuse, or
 *            a commenter's own request.
 */

type PendingComment = {
  id: string
  body: string
  createdAt: string
  guestName: string | null
  authorName: string | null
  postSlug: string | null
  postTitle: string | null
}

type Decision = 'approved' | 'spam' | 'deleted'

export function AdminComments() {
  const [rows, setRows] = React.useState<PendingComment[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [reloadToken, setReloadToken] = React.useState(0)

  // Returns the data rather than setting state, so the effect below only ever
  // calls setState from a resolved promise — a synchronous setState inside an
  // effect body triggers a cascading render.
  const fetchRows = React.useCallback(
    () => adminRequest<{ comments: PendingComment[] }>('/comments/pending'),
    []
  )

  React.useEffect(() => {
    let cancelled = false
    fetchRows()
      .then((data) => !cancelled && setRows(data.comments))
      .catch(() => !cancelled && setError('Could not load the moderation queue.'))
    return () => {
      cancelled = true
    }
  }, [fetchRows, reloadToken])

  async function decide(id: string, status: Decision) {
    setBusyId(id)
    setError(null)
    try {
      await adminRequest(`/comments/${id}`, { method: 'PATCH', body: { status } })
      // Dropped locally rather than refetched: the row leaves the queue either
      // way, and a refetch would make the remaining list jump.
      setRows((current) => current?.filter((row) => row.id !== id) ?? null)
    } catch {
      setError('That did not go through. The comment is unchanged.')
      setReloadToken((n) => n + 1)
    } finally {
      setBusyId(null)
    }
  }

  // `p-5 lg:p-8` matches every other admin screen: the shell supplies no
  // padding of its own, so each page owns its gutter.
  return (
    <div className="flex flex-col gap-6 p-5 lg:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-h2 font-semibold tracking-tight">Comments</h1>
        {/* Measure-capped: an unbounded paragraph ran the inline code chip
            into the right edge of a wide screen. */}
        <p className="text-foreground-muted max-w-2xl text-sm leading-relaxed">
          Guest comments, and anything containing a link, are held here. Approved comments
          appear in the article&apos;s server-rendered HTML with{' '}
          <code className={codeChip}>rel=&quot;ugc nofollow&quot;</code> on every link.
        </p>
      </header>

      {error ? (
        <p
          role="alert"
          className="border-danger-500/30 bg-danger-500/10 text-danger-700 dark:text-danger-500 rounded-lg border px-4 py-3 text-sm"
        >
          {error}
        </p>
      ) : null}

      {rows === null ? (
        <ul className="flex max-w-4xl flex-col gap-3">
          {[0, 1, 2].map((index) => (
            <li
              key={index}
              className="border-border bg-surface-2 h-28 animate-pulse rounded-xl border"
            />
          ))}
        </ul>
      ) : rows.length === 0 ? (
        <div className="border-border bg-surface-2 flex max-w-4xl flex-col items-center gap-3 rounded-xl border px-6 py-14 text-center">
          <span className="bg-primary-soft grid size-11 place-items-center rounded-full">
            <MessageSquare className="text-primary size-5" aria-hidden="true" />
          </span>
          <p className="font-medium">Nothing waiting</p>
          <p className="text-foreground-muted max-w-sm text-sm">
            Comments from signed-in readers that contain no links are approved
            automatically and never reach this queue.
          </p>
        </div>
      ) : (
        <ul className="flex max-w-4xl flex-col gap-3">
          {rows.map((row) => {
            const author = row.authorName ?? row.guestName ?? 'Anonymous'
            const busy = busyId === row.id

            return (
              <li
                key={row.id}
                className={cn(
                  'border-border bg-surface rounded-xl border p-4 transition-opacity sm:p-5',
                  busy && 'pointer-events-none opacity-50'
                )}
              >
                <div className="text-meta text-foreground-subtle flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-foreground font-medium">{author}</span>

                  {row.authorName ? (
                    <span className="bg-primary-soft text-primary rounded-full px-1.5 py-0.5 text-[0.6875rem] font-medium">
                      Member
                    </span>
                  ) : (
                    <span className="bg-surface-2 rounded-full px-1.5 py-0.5 text-[0.6875rem] font-medium">
                      Guest
                    </span>
                  )}

                  <time dateTime={row.createdAt}>{formatDate(row.createdAt)}</time>

                  {row.postSlug ? (
                    <Link
                      href={`/blog/${row.postSlug}`}
                      target="_blank"
                      className="hover:text-primary inline-flex items-center gap-1 transition-colors"
                    >
                      {row.postTitle ?? row.postSlug}
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>

                {/*
                  The RAW body, not the rendered HTML. A moderator needs to see
                  exactly what was submitted — including the URLs that got it
                  held — rather than a sanitised version that hides them.
                */}
                <p className="text-foreground-muted mt-2.5 whitespace-pre-wrap text-sm leading-relaxed">
                  {row.body}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="xs" onClick={() => void decide(row.id, 'approved')}>
                    <Check aria-hidden="true" />
                    Approve
                  </Button>
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => void decide(row.id, 'spam')}
                  >
                    <ShieldAlert aria-hidden="true" />
                    Spam
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => void decide(row.id, 'deleted')}
                  >
                    <Trash2 aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

const codeChip = 'rounded bg-surface-2 px-1 py-0.5 text-xs'
