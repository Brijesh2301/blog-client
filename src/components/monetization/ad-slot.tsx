'use client'

import * as React from 'react'

import { useConsent } from '@/components/consent/consent-provider'
import { siteConfig } from '@/config/site'
import { cn } from '@/lib/utils'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * AD SLOT
 * ═════════════════════════════════════════════════════════════════════════════
 * The place where revenue and Core Web Vitals meet, so the rules are strict.
 *
 * 1. SPACE IS RESERVED, ALWAYS.
 *    The outer box has a fixed height from the moment it renders — before
 *    consent is known, before the script loads, and even when no ad will ever
 *    appear. An ad that arrives into unreserved space is the single largest
 *    source of CLS on ad-funded sites, and CLS is a ranking signal on every
 *    page it happens on. The slot occupying blank space is the cost of that
 *    guarantee, and it is worth paying.
 *
 * 2. NOTHING LOADS WITHOUT CONSENT.
 *    No script, no pixel, no network request until `advertising` is granted.
 *    The slot still reserves its space when consent is refused, so turning
 *    consent on or off never moves the article.
 *
 * 3. NOTHING LOADS UNTIL IT IS NEARLY VISIBLE.
 *    An IntersectionObserver with a generous root margin means an ad in the
 *    footer costs a reader who never scrolls precisely nothing.
 *
 * 4. NEVER ABOVE THE FOLD ON AN ARTICLE.
 *    `placement="leaderboard"` is refused on article pages by convention —
 *    see the `placement` docs below. Google's page-experience and
 *    helpful-content guidance both single out ads that displace the content
 *    someone arrived for.
 *
 * 5. IT IS LABELLED.
 *    "Advertisement" above every slot. Required by the FTC for anything a
 *    reader could mistake for editorial, and it is also simply honest.
 *
 * 6. IT IS NOT IN THE INDEXABLE TEXT.
 *    The container is `aria-hidden` for the label only; the ad iframe is
 *    third-party and cross-origin, so nothing inside it is ever part of this
 *    page's content. No ad markup is server-rendered.
 */

/**
 * Where the slot sits, which determines its reserved size.
 *
 * Sizes are fixed per breakpoint rather than fluid, because a responsive ad
 * unit that picks its own height is the thing that causes the shift. Each
 * entry is [mobile height, desktop height] in pixels.
 */
const PLACEMENTS = {
  /** Between article sections. The only in-article placement. */
  'in-article': { mobile: 280, desktop: 280 },
  /** Sticky sidebar unit. `mobile: 0` means it is not rendered below lg. */
  sidebar: { mobile: 0, desktop: 600 },
  /** Below the article, above related posts. */
  'below-article': { mobile: 280, desktop: 280 },
  /**
   * Top-of-page banner. Allowed on LISTING pages only, never on an article —
   * pushing an article's own headline below an ad is the pattern that
   * page-experience guidance calls out by name.
   */
  leaderboard: { mobile: 100, desktop: 90 },
} as const

export type AdPlacement = keyof typeof PLACEMENTS

export function AdSlot({
  placement,
  className,
  /** Overrides the feature flag, for previewing in the admin. */
  force = false,
}: {
  placement: AdPlacement
  className?: string
  force?: boolean
}) {
  const { consent, resolved } = useConsent()
  const ref = React.useRef<HTMLDivElement | null>(null)
  const [inView, setInView] = React.useState(false)

  /*
   * Capability, read as the external value it is.
   *
   * The server snapshot is `true` so the server-rendered markup matches an
   * ordinary browser's and there is no hydration mismatch. The only engines
   * that report false are old enough that loading the ad immediately is the
   * right fallback anyway.
   */
  const observerSupported = React.useSyncExternalStore(
    subscribeNothing,
    () => typeof IntersectionObserver !== 'undefined',
    () => true
  )

  const size = PLACEMENTS[placement]
  const enabled = siteConfig.features.ads || force

  /*
   * Near-viewport detection.
   *
   * 400px of root margin means the ad has started loading by the time it is
   * actually seen, without loading anything for a reader who stops at the
   * third paragraph. `once: true` semantics — the observer disconnects on the
   * first hit, because an ad that reloads on every scroll past is both a
   * wasted impression and an invalid one.
   */
  React.useEffect(() => {
    const node = ref.current
    if (!node || !enabled || !observerSupported) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '400px 0px' }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled, observerSupported])

  /*
   * Without an observer there is no viewport gate, so the slot loads as soon
   * as consent allows.
   *
   * Expressed as a CONDITION rather than by setting `inView` from the effect:
   * a synchronous setState inside an effect body is a cascading render, and
   * the capability is not state — it never changes for the life of the page.
   */
  const shouldLoad =
    enabled && resolved && consent.advertising && (inView || !observerSupported)

  return (
    <aside
      ref={ref}
      // Not part of the article's content, and never part of its outline.
      aria-label="Advertisement"
      data-ad-placement={placement}
      className={cn(
        'my-8 flex flex-col items-center gap-1.5',
        // The sidebar unit has no mobile size, so it is hidden below lg.
        size.mobile === 0 && 'hidden lg:flex',
        className
      )}
    >
      <span className="text-foreground-subtle font-sans text-[0.625rem] uppercase tracking-[0.12em]">
        Advertisement
      </span>

      {/*
        The reserved box.

        Its height is set from a CSS custom property rather than a Tailwind
        class so the two breakpoints are a single declaration and cannot drift
        apart. This element's size NEVER changes — not when consent resolves,
        not when the ad loads, not when it fails to.
      */}
      <div
        style={
          {
            '--ad-h': `${size.mobile}px`,
            '--ad-h-lg': `${size.desktop}px`,
          } as React.CSSProperties
        }
        className={cn(
          'ad-reserve w-full max-w-full overflow-hidden rounded-xl',
          'border-hairline bg-surface-2/40 border border-dashed'
        )}
      >
        {shouldLoad ? (
          <AdUnit placement={placement} />
        ) : (
          <Placeholder
            reason={
              !enabled
                ? 'disabled'
                : !resolved
                  ? 'pending'
                  : !consent.advertising
                    ? 'declined'
                    : 'offscreen'
            }
          />
        )}
      </div>
    </aside>
  )
}

/**
 * The actual ad unit.
 *
 * Isolated so that swapping networks touches one component. The AdSense
 * script tag itself belongs in the layout (loaded once, `afterInteractive`,
 * and only with consent) rather than here, where N slots would request it N
 * times.
 *
 * PHASE 8 wires the real `adsbygoogle.push({})` call behind the publisher ID,
 * once AdSense approval exists. Everything that governs it — the consent gate,
 * the reserved box, the viewport gate, the labelling and the density cap — is
 * in place and tested, so that push is genuinely the only missing line.
 */
/**
 * Slot IDs, written out one by one.
 *
 * NOT `process.env[\`..._${placement}\`]`. Next inlines environment variables
 * by STATIC text substitution at build time, so a computed key is never
 * replaced and evaluates to undefined in the browser — an ad unit with no slot
 * id, which fails silently and serves nothing. Every reference has to be a
 * literal.
 */
const SLOT_IDS: Record<AdPlacement, string | undefined> = {
  'in-article': process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE,
  sidebar: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR,
  'below-article': process.env.NEXT_PUBLIC_ADSENSE_SLOT_BELOW_ARTICLE,
  leaderboard: process.env.NEXT_PUBLIC_ADSENSE_SLOT_LEADERBOARD,
}

function AdUnit({ placement }: { placement: AdPlacement }) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
  const slot = SLOT_IDS[placement]

  // A unit with no client or no slot id requests nothing and earns nothing;
  // better to show the reserved box than to emit a broken <ins>.
  if (!client || !slot) {
    return <Placeholder reason="unconfigured" />
  }

  return (
    <ins
      className="adsbygoogle block size-full"
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"
      // Explicitly OFF: full-width-responsive lets the unit choose its own
      // height, which is precisely the behaviour the reserved box exists to
      // prevent.
      data-full-width-responsive="false"
    />
  )
}

/**
 * What fills the reserved box when there is no ad.
 *
 * Intentionally quiet. A loud "enable ads to support us" message in a slot the
 * reader declined is nagging, and nagging in a space they cannot remove is
 * worse. In production this is simply empty; the reason is exposed as a data
 * attribute so the design-gate harness can assert which state it is in.
 */
function Placeholder({
  reason,
}: {
  reason: 'disabled' | 'pending' | 'declined' | 'offscreen' | 'unconfigured'
}) {
  return (
    <div
      data-ad-state={reason}
      aria-hidden="true"
      className="grid size-full place-items-center"
    >
      {reason === 'declined' ? (
        <span className="text-foreground-subtle px-4 text-center text-xs">
          Ads are off because you declined advertising cookies.
        </span>
      ) : null}
    </div>
  )
}

/** The capability cannot change within a page's life, so nothing to subscribe to. */
function subscribeNothing(): () => void {
  return () => {}
}
