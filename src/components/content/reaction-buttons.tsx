'use client'

import { Bookmark, Heart, Loader } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { PublicApiError, getMyReactions, toggleReaction } from '@/lib/public-api'
import { cn } from '@/lib/utils'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * REACTIONS — like and bookmark
 * ═════════════════════════════════════════════════════════════════════════════
 * Client-only by necessity: whether YOU liked this article is per-reader state,
 * and baking it into the cached HTML would show one reader's likes to everyone.
 *
 * The parts that matter for SEO and layout stability:
 *
 *  - The like COUNT is server-rendered from the cached post, so the number is
 *    in the HTML. Only the filled/unfilled state is resolved client-side.
 *  - The buttons render at their final size immediately, in their signed-out
 *    shape. The session lookup changes colour and fill, never dimensions, so
 *    there is no layout shift when it lands.
 *  - Signed-out readers get a working button that explains what it needs,
 *    rather than a hidden one — a disabled-looking control with no explanation
 *    reads as broken.
 */

export function ReactionButtons({
  slug,
  initialLikeCount,
  className,
}: {
  slug: string
  initialLikeCount: number
  className?: string
}) {
  const [likeCount, setLikeCount] = React.useState(initialLikeCount)
  const [liked, setLiked] = React.useState(false)
  const [bookmarked, setBookmarked] = React.useState(false)
  const [pending, setPending] = React.useState<'like' | 'bookmark' | null>(null)
  const [notice, setNotice] = React.useState('')

  // The reader's own state, fetched after paint. A 401 is the normal
  // signed-out answer, and `getMyReactions` throwing simply leaves both
  // buttons in their empty state, which is correct for a visitor.
  React.useEffect(() => {
    const controller = new AbortController()
    void getMyReactions(slug, controller.signal)
      .then((state) => {
        setLiked(state.liked)
        setBookmarked(state.bookmarked)
      })
      .catch(() => {
        /* Signed out, or offline. Empty state is the right answer. */
      })
    return () => controller.abort()
  }, [slug])

  async function handle(type: 'like' | 'bookmark') {
    if (pending) return
    setPending(type)
    setNotice('')

    // Optimistic: a reaction is cheap and reversible, and waiting on a round
    // trip before the heart fills makes the whole site feel slow.
    const wasActive = type === 'like' ? liked : bookmarked
    if (type === 'like') {
      setLiked(!wasActive)
      setLikeCount((count) => Math.max(0, count + (wasActive ? -1 : 1)))
    } else {
      setBookmarked(!wasActive)
    }

    try {
      const result = await toggleReaction(slug, type)
      // Reconcile with the server's answer: another device may have toggled
      // the same reaction, and the server's count is authoritative.
      if (type === 'like') {
        setLiked(result.active)
        setLikeCount(result.likeCount)
      } else {
        setBookmarked(result.active)
        // Where the saved article actually went. Shown only at the moment it
        // becomes relevant, which is how /saved gets discovered without
        // putting a link in the nav for the majority who never save anything.
        setNotice(result.active ? 'saved' : '')
      }
    } catch (error) {
      // Roll the optimistic update back rather than leaving the UI lying.
      if (type === 'like') {
        setLiked(wasActive)
        setLikeCount((count) => Math.max(0, count + (wasActive ? 1 : -1)))
      } else {
        setBookmarked(wasActive)
      }

      setNotice(
        error instanceof PublicApiError && error.status === 401
          ? 'Sign in to save and react to articles.'
          : 'That did not go through. Try again.'
      )
    } finally {
      setPending(null)
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handle('like')}
          aria-pressed={liked}
          aria-label={liked ? 'Remove your like' : 'Like this article'}
          className={cn(
            reactionButton,
            liked
              ? 'border-danger-500/40 bg-danger-500/10 text-danger-700 dark:text-danger-500'
              : 'text-foreground-muted hover:text-foreground'
          )}
        >
          {pending === 'like' ? (
            <Loader className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Heart
              className={cn(
                'size-4 transition-transform',
                liked && 'scale-110 fill-current'
              )}
              aria-hidden="true"
            />
          )}
          <span className="tabular">{likeCount.toLocaleString('en-US')}</span>
        </button>

        <button
          type="button"
          onClick={() => handle('bookmark')}
          aria-pressed={bookmarked}
          aria-label={bookmarked ? 'Remove from your saved articles' : 'Save for later'}
          className={cn(
            reactionButton,
            bookmarked
              ? 'border-primary/40 bg-primary-soft text-primary'
              : 'text-foreground-muted hover:text-foreground'
          )}
        >
          {pending === 'bookmark' ? (
            <Loader className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Bookmark
              className={cn('size-4 transition-transform', bookmarked && 'fill-current')}
              aria-hidden="true"
            />
          )}
          {/*
            Width reserved for the LONGER label.

            The signed-in state arrives from a fetch on mount, with no user
            input anywhere near it — so a "Save" that becomes "Saved" lands
            outside CLS's 500ms input grace period and counts in full. At
            phone width that extra 9px is enough to re-wrap the row above the
            article. `inline-block` with a fixed min-width makes the swap
            free.
          */}
          <span className="inline-block min-w-[2.75rem] text-left">
            {bookmarked ? 'Saved' : 'Save'}
          </span>
        </button>
      </div>

      {/* Reserved by `min-h`, so a status message cannot shift the article. */}
      <p
        role="status"
        aria-live="polite"
        className="text-foreground-subtle min-h-4 text-xs"
      >
        {notice === 'saved' ? (
          <>
            Saved.{' '}
            <Link
              href="/saved"
              className="decoration-border hover:text-primary hover:decoration-primary underline underline-offset-2 transition-colors"
            >
              View your saved articles
            </Link>
          </>
        ) : (
          notice
        )}
      </p>
    </div>
  )
}

const reactionButton = cn(
  'inline-flex h-9 items-center gap-2 rounded-full border border-border bg-surface px-3.5',
  'text-sm font-medium transition-colors',
  'hover:border-border-strong',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35'
)
