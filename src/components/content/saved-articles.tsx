'use client'

import { Bookmark, LogIn } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { PostCard } from '@/components/content/post-card'
import { Button } from '@/components/ui/button'
import { PublicApiError, getBookmarks } from '@/lib/public-api'
import type { PostCard as PostCardType } from '@/types/content'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * SAVED ARTICLES
 * ═════════════════════════════════════════════════════════════════════════════
 * The other half of the Save button. Without this screen the bookmark is a
 * write with no read — the reader saves something and has no way to get back
 * to it, which is worse than not offering the button at all.
 *
 * Entirely client-rendered, and that is correct here rather than a compromise:
 * the content is one specific reader's list. Server-rendering it would make
 * the route dynamic, defeat caching for every visitor, and — if anything
 * between here and the browser ever cached it — serve one reader's saved list
 * to the next. The page itself is `noindex`; there is nothing here for a
 * crawler, and the articles are all indexed at their own URLs anyway.
 */

type Saved = PostCardType & { savedAt: string }

type State =
  | { phase: 'loading' }
  | { phase: 'signed-out' }
  | { phase: 'error' }
  | { phase: 'ready'; items: Saved[] }

export function SavedArticles() {
  const [state, setState] = React.useState<State>({ phase: 'loading' })

  React.useEffect(() => {
    const controller = new AbortController()

    getBookmarks(controller.signal)
      .then((data) => setState({ phase: 'ready', items: data.bookmarks }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        // 401 is not an error state, it is the signed-out state — and it
        // deserves an invitation to sign in, not a failure message.
        setState(
          error instanceof PublicApiError && error.status === 401
            ? { phase: 'signed-out' }
            : { phase: 'error' }
        )
      })

    return () => controller.abort()
  }, [])

  if (state.phase === 'loading') {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="border-border bg-surface-2 h-72 animate-pulse rounded-2xl border"
          />
        ))}
      </div>
    )
  }

  if (state.phase === 'signed-out') {
    return (
      <Empty
        icon={<LogIn className="text-primary size-5" aria-hidden="true" />}
        title="Sign in to see your saved articles"
        body="Saving is tied to your account so the list follows you between devices."
        action={
          <Button asChild size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
        }
      />
    )
  }

  if (state.phase === 'error') {
    return (
      <Empty
        icon={<Bookmark className="text-primary size-5" aria-hidden="true" />}
        title="Could not load your saved articles"
        body="The request did not go through. Reloading usually fixes it."
      />
    )
  }

  if (state.items.length === 0) {
    return (
      <Empty
        icon={<Bookmark className="text-primary size-5" aria-hidden="true" />}
        title="Nothing saved yet"
        body="The Save button at the top of any article adds it here."
        action={
          <Button asChild variant="secondary" size="sm">
            <Link href="/blog">Browse articles</Link>
          </Button>
        }
      />
    )
  }

  return (
    <>
      <p className="text-foreground-muted mb-6 text-sm">
        {state.items.length} saved {state.items.length === 1 ? 'article' : 'articles'},
        most recent first.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {state.items.map((item) => (
          // `h2`, because on this page each card title is a top-level item
          // under the page's single h1 rather than a third-level heading.
          <PostCard key={item.id} post={item} headingLevel="h2" />
        ))}
      </div>
    </>
  )
}

function Empty({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode
  title: string
  body: string
  action?: React.ReactNode
}) {
  return (
    <div className="border-border bg-surface-2 flex flex-col items-center gap-3 rounded-2xl border px-6 py-16 text-center">
      <span className="bg-primary-soft grid size-11 place-items-center rounded-full">
        {icon}
      </span>
      <p className="font-display text-h4 font-semibold">{title}</p>
      <p className="text-foreground-muted max-w-sm text-sm leading-relaxed">{body}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}
