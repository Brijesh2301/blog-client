'use client'

import { CornerDownRight, Loader, MessageCircle, X } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PublicApiError, getSession, postComment } from '@/lib/public-api'
import { cn } from '@/lib/utils'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * COMMENT FORM
 * ═════════════════════════════════════════════════════════════════════════════
 * The ONLY interactive part of the comment section. The thread itself is
 * server-rendered (see comments.tsx) so it is in the HTML and crawlable; this
 * component adds the ability to write, nothing more.
 *
 * That split is why the reply state lives in a context rather than in the
 * form. The Reply buttons sit inside server-rendered comments, which cannot
 * hold state — so each is a tiny client island that writes into this context,
 * and the single form reads from it. One form, one set of handlers, and the
 * thread stays server HTML.
 *
 * Spam defences, same stack as the newsletter form:
 *  - a honeypot field no real reader can see or focus;
 *  - a time-to-submit floor, since bots post instantly;
 *  - server-side moderation that holds anything with a link, signed in or not.
 */

type ReplyTarget = { id: string; author: string } | null

type CommentsContextValue = {
  replyTo: ReplyTarget
  setReplyTo: (target: ReplyTarget) => void
}

const CommentsContext = React.createContext<CommentsContextValue | null>(null)

export function CommentsProvider({ children }: { children: React.ReactNode }) {
  const [replyTo, setReplyTo] = React.useState<ReplyTarget>(null)
  const value = React.useMemo(() => ({ replyTo, setReplyTo }), [replyTo])

  return <CommentsContext.Provider value={value}>{children}</CommentsContext.Provider>
}

function useComments(): CommentsContextValue {
  const context = React.useContext(CommentsContext)
  // Never throw: a missing provider should not blank an article page.
  return context ?? { replyTo: null, setReplyTo: () => {} }
}

/**
 * The per-comment Reply button.
 *
 * Moves focus to the form rather than opening a second form inline. Two open
 * composers is a state-management trap and, on mobile, pushes the thread
 * around under the reader's thumb.
 */
export function ReplyButton({ id, author }: { id: string; author: string }) {
  const { setReplyTo } = useComments()

  return (
    <button
      type="button"
      onClick={() => {
        setReplyTo({ id, author })
        const field = document.getElementById('comment-body')
        field?.focus()
        field?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }}
      className="text-foreground-subtle hover:text-primary inline-flex items-center gap-1 text-xs font-medium transition-colors"
    >
      <CornerDownRight className="size-3" aria-hidden="true" />
      Reply
    </button>
  )
}

type Status = 'idle' | 'submitting' | 'approved' | 'pending' | 'error'

export function CommentForm({ slug }: { slug: string }) {
  const { replyTo, setReplyTo } = useComments()
  const [status, setStatus] = React.useState<Status>('idle')
  const [message, setMessage] = React.useState('')

  /*
   * Sign-in is resolved here, in the browser, after the thread is already in
   * the HTML. Reading the auth cookie during render would make this article
   * page dynamic for everyone, so the form starts in its guest shape and
   * tightens up once the session answers. `null` means "not yet known".
   */
  const [user, setUser] = React.useState<{ name: string } | null>(null)
  React.useEffect(() => {
    const controller = new AbortController()
    void getSession(controller.signal).then((session) => {
      if (session) setUser({ name: session.name })
    })
    return () => controller.abort()
  }, [])

  const signedIn = user !== null

  // Timestamped in an effect: Date.now() during render is impure, and the
  // value must be stable across re-renders for the timing check to mean
  // anything. 0 tells the server to skip that check rather than guess.
  const mountedAt = React.useRef(0)
  React.useEffect(() => {
    mountedAt.current = Date.now()
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)

    // Honeypot. Pretend it worked rather than teaching a bot what tripped it.
    if (data.get('website')) {
      setStatus('pending')
      setMessage('Thanks — your comment is awaiting moderation.')
      form.reset()
      return
    }

    const body = String(data.get('body') ?? '').trim()
    if (body.length < 2) {
      setStatus('error')
      setMessage('Write something first.')
      return
    }

    setStatus('submitting')

    try {
      const result = await postComment(slug, {
        body,
        parentId: replyTo?.id,
        guestName: signedIn ? undefined : String(data.get('guestName') ?? '').trim(),
        guestEmail: signedIn
          ? undefined
          : String(data.get('guestEmail') ?? '').trim() || undefined,
        elapsedMs: mountedAt.current ? Date.now() - mountedAt.current : 0,
      })

      setStatus(result.status === 'approved' ? 'approved' : 'pending')
      setMessage(result.message)
      form.reset()
      setReplyTo(null)

      /*
       * An approved comment is already in the database and the API has purged
       * this thread's cache tag. Reloading is how it appears — and it appears
       * in the SERVER-RENDERED HTML, so what the author sees after posting is
       * exactly what a crawler sees, with no optimistic client-only copy that
       * could disagree with the stored thread.
       */
      if (result.status === 'approved') {
        setTimeout(() => window.location.reload(), 900)
      }
    } catch (error) {
      setStatus('error')
      setMessage(
        error instanceof PublicApiError
          ? error.message
          : 'Could not post that. Please try again.'
      )
    }
  }

  const busy = status === 'submitting'
  const settled = status === 'approved' || status === 'pending'

  return (
    <form
      onSubmit={handleSubmit}
      className="border-border bg-surface-2 rounded-2xl border p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-h4 flex items-center gap-2 font-semibold">
          <MessageCircle className="text-primary size-4" aria-hidden="true" />
          {replyTo ? `Replying to ${replyTo.author}` : 'Join the discussion'}
        </h3>

        {replyTo ? (
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="text-foreground-subtle hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
          >
            <X className="size-3" aria-hidden="true" />
            Cancel reply
          </button>
        ) : null}
      </div>

      <p className="text-foreground-muted mt-1.5 text-sm">
        {user
          ? `Posting as ${user.name}. Comments with links are reviewed before they appear.`
          : 'Comments are reviewed before they appear. Markdown is not supported; links are allowed but held for review.'}
      </p>

      <label htmlFor="comment-body" className="sr-only">
        Your comment
      </label>
      <textarea
        id="comment-body"
        name="body"
        rows={4}
        required
        minLength={2}
        maxLength={5000}
        disabled={busy}
        aria-describedby="comment-status"
        className={cn(
          'border-border bg-surface mt-4 w-full resize-y rounded-xl border px-3.5 py-3',
          'text-foreground placeholder:text-foreground-subtle text-[0.9375rem] leading-relaxed',
          'focus-visible:border-primary transition-colors focus-visible:outline-none',
          'focus-visible:ring-primary/25 focus-visible:ring-2 disabled:opacity-60'
        )}
        placeholder="Add to the discussion…"
      />

      {!signedIn ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input label="Your name" name="guestName" required maxLength={80} />
          <Input
            label="Email (never published)"
            name="guestEmail"
            type="email"
            maxLength={254}
            hint="Only used to notify you of replies."
          />
        </div>
      ) : null}

      {/* Honeypot. `sr-only` rather than `display:none` — a bot reading the
          DOM still sees the field, while it clips to a pixel for everyone
          else and, unlike a negative offset, cannot create page overflow. */}
      <div aria-hidden="true" className="sr-only">
        <label htmlFor="comment-website">Website</label>
        <input
          id="comment-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? (
            <>
              <Loader className="animate-spin" aria-hidden="true" />
              Posting…
            </>
          ) : replyTo ? (
            'Post reply'
          ) : (
            'Post comment'
          )}
        </Button>

        <p
          id="comment-status"
          role="status"
          aria-live="polite"
          className={cn(
            'text-sm',
            status === 'error'
              ? 'text-danger-700 dark:text-danger-500'
              : 'text-foreground-muted',
            settled && 'text-success-700 dark:text-success-500 font-medium'
          )}
        >
          {message}
        </p>
      </div>
    </form>
  )
}
