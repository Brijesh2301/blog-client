'use client'

import { AlertCircle, Check, Loader } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { PublicApiError, confirmSubscription } from '@/lib/public-api'

/**
 * Redeems a confirmation token.
 *
 * A client component for one specific reason: the token must be redeemed
 * EXACTLY ONCE, by the person who opened the link. Doing it in a Server
 * Component would mean any prefetch, link preview, or corporate mail scanner
 * that touches the URL burns the token before the subscriber ever clicks —
 * a well-known way to make double opt-in fail silently for whole domains.
 *
 * `useSearchParams` makes this component request-time, which is why the page
 * wraps it in Suspense rather than reading the token itself.
 */
export function ConfirmSubscription() {
  const token = useSearchParams().get('token')

  // A link with no token is knowable during render, so it is the initial
  // state rather than something an effect discovers and corrects.
  const [state, setState] = React.useState<'working' | 'done' | 'failed'>(
    token ? 'working' : 'failed'
  )
  const [message, setMessage] = React.useState(
    token ? '' : 'That link is missing its confirmation code.'
  )

  // A ref, not state: React mounts effects twice in development, and this
  // token is single-use — the second attempt would report failure for a
  // confirmation that had actually succeeded.
  const attempted = React.useRef(false)

  React.useEffect(() => {
    if (!token || attempted.current) return
    attempted.current = true

    void confirmSubscription(token)
      .then(() => setState('done'))
      .catch((error: unknown) => {
        setState('failed')
        setMessage(
          error instanceof PublicApiError
            ? error.message
            : 'We could not confirm that link. Please try subscribing again.'
        )
      })
  }, [token])

  if (state === 'working') {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
        <Loader className="text-primary size-8 animate-spin" aria-hidden="true" />
        <p role="status" className="text-foreground-muted text-sm">
          Confirming your subscription…
        </p>
      </div>
    )
  }

  if (state === 'failed') {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
        <span className="bg-danger-500/10 grid size-12 place-items-center rounded-full">
          <AlertCircle
            className="text-danger-700 dark:text-danger-500 size-6"
            aria-hidden="true"
          />
        </span>
        <h1 className="text-h3 font-semibold tracking-tight">That link did not work</h1>
        <p className="text-foreground-muted max-w-prose text-sm leading-relaxed">
          {message} Confirmation links can only be used once, and they expire if a newer
          one has been sent.
        </p>
        <Button asChild variant="secondary" size="sm">
          <Link href="/">Back to the homepage</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
      <span className="bg-success-500 grid size-12 place-items-center rounded-full text-white">
        <Check className="size-6" strokeWidth={3} aria-hidden="true" />
      </span>
      <h1 className="text-h3 font-semibold tracking-tight">You are subscribed</h1>
      <p className="text-foreground-muted max-w-prose text-sm leading-relaxed">
        One deeply researched engineering essay a week. Every issue has a one-click
        unsubscribe link in the footer — no form, no questions.
      </p>
      <Button asChild size="sm">
        <Link href="/blog">Start reading</Link>
      </Button>
    </div>
  )
}
