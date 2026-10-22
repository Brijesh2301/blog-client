'use client'

import dynamic from 'next/dynamic'
import { Headphones, Loader } from 'lucide-react'
import * as React from 'react'

import { PublicApiError, getSpeechPayload, type SpeechPayload } from '@/lib/public-api'
import { speechSupported } from '@/lib/speech'
import { cn } from '@/lib/utils'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * "LISTEN TO THIS ARTICLE" — the trigger
 * ═════════════════════════════════════════════════════════════════════════════
 * Small on purpose. This component is the only Listen code in the article
 * bundle; the player itself — two transports, voice handling, Media Session —
 * is behind a `dynamic()` import and is fetched when the reader presses the
 * button, never before.
 *
 * Why that matters for the performance gate: the player and its speech
 * controller are dead weight for the large majority of readers who never press
 * Listen. Shipping them on every article would spend part of every reader's
 * interaction budget on a feature most of them do not use.
 *
 * The button is rendered server-side as markup inside a fixed-height row
 * (`.reserve`), so the slot it occupies is identical before and after
 * hydration and whether or not the player is open. Nothing here can shift the
 * article — which is the CLS half of the same gate.
 */

const ListenPlayer = dynamic(
  () => import('@/components/content/listen-player').then((mod) => mod.ListenPlayer),
  {
    // No skeleton: the player is `fixed` and overlays the page, so there is
    // nothing to reserve space for. The button's own spinner is the feedback.
    ssr: false,
  }
)

export function ListenButton({
  slug,
  title,
  estimatedSeconds,
  hasGeneratedAudio,
  className,
}: {
  slug: string
  title: string
  /** Server-computed, so the duration is in the HTML before any JS runs. */
  estimatedSeconds: number
  /** True when a pre-generated MP3 exists for this post. */
  hasGeneratedAudio: boolean
  className?: string
}) {
  const [payload, setPayload] = React.useState<SpeechPayload | null>(null)
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  /*
   * Capability, read through `useSyncExternalStore`.
   *
   * `speechSupported()` touches `window`, so it cannot be called during
   * render — but it is also not state, and setting it from an effect would
   * mean rendering one thing and immediately replacing it. This reads the
   * browser as the external store it is: the server snapshot is `true`, so
   * the server HTML matches hydration, and the value only ever retracts on a
   * browser with no synthesiser.
   */
  const canSpeak = React.useSyncExternalStore(
    subscribeNothing,
    speechSupported,
    () => true
  )

  async function handleClick() {
    if (open) {
      setOpen(false)
      return
    }

    // Already fetched: reopening is instant and costs no request.
    if (payload) {
      setOpen(true)
      return
    }

    setLoading(true)
    setError('')

    try {
      setPayload(await getSpeechPayload(slug))
      setOpen(true)
    } catch (err) {
      setError(
        err instanceof PublicApiError && err.status === 400
          ? 'Audio is not available for this article.'
          : 'Could not load the audio. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  // Neither tier is available: say nothing rather than offering a button that
  // cannot work.
  if (!canSpeak && !hasGeneratedAudio) return null

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleClick}
          aria-expanded={open}
          aria-label={
            open
              ? 'Close the audio player'
              : `Listen to this article, about ${Math.round(estimatedSeconds / 60)} minutes`
          }
          className={cn(
            'group inline-flex h-10 items-center gap-2.5 rounded-full px-4',
            'bg-primary-soft text-primary border text-sm font-medium',
            'transition-all hover:shadow-sm',
            // Only the BORDER changes with state. Colour cannot re-wrap a row;
            // a different label can — see the note below.
            open ? 'border-primary/70' : 'border-primary/30 hover:border-primary/60',
            'focus-visible:ring-primary/35 focus-visible:outline-none focus-visible:ring-2'
          )}
        >
          {loading ? (
            <Loader className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Headphones
              className="size-4 transition-transform group-hover:scale-110"
              aria-hidden="true"
            />
          )}
          {/*
            ONE label, never swapped.

            A toggle that changed this to "Hide player" measurably shifted the
            page: the shorter label let the reaction buttons beside it stop
            wrapping, that row lost a line, and the whole article moved up
            52px — a CLS of 0.10 from one click at phone width. State is
            carried by `aria-expanded` and the aria-label for assistive tech,
            and visually by the player being on screen and the border
            brightening. A constant label cannot re-wrap anything.
          */}
          <span>Listen to this article</span>
          <span className="tabular text-primary/70 text-xs" aria-hidden="true">
            {formatListenTime(estimatedSeconds)}
          </span>
        </button>

        {hasGeneratedAudio ? (
          <span className="text-foreground-subtle text-xs">Narrated audio</span>
        ) : null}
      </div>

      {/*
        The status line is ALWAYS in the flow at a fixed height, on its own
        row below the button. A failed fetch then fills reserved space instead
        of appearing beside the button and re-wrapping it.
      */}
      <p role="alert" className="text-danger-700 dark:text-danger-500 min-h-4 text-xs">
        {error}
      </p>

      {open && payload ? (
        <ListenPlayer
          slug={slug}
          title={title}
          payload={payload}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  )
}

function formatListenTime(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60))
  return `${minutes} min`
}

/** Capability cannot change within a page's life, so there is nothing to subscribe to. */
function subscribeNothing(): () => void {
  return () => {}
}
