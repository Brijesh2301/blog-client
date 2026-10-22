import { Info } from 'lucide-react'
import Link from 'next/link'

import { cn } from '@/lib/utils'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * AFFILIATE DISCLOSURE
 * ═════════════════════════════════════════════════════════════════════════════
 * A Server Component, rendered in the HTML, placed ABOVE the first affiliate
 * link — all three of those are requirements rather than preferences.
 *
 * The FTC's endorsement guides ask for disclosure that is "clear and
 * conspicuous" and *before* the reader acts on the link. A disclosure that
 * only appears after hydration fails that for anyone on a slow connection; one
 * in the footer fails it for everyone who clicks before scrolling that far.
 *
 * It is also an SEO artefact. Google's spam policies require paid links to
 * carry `rel="sponsored"` — `processArticle` does that automatically for any
 * anchor marked `data-affiliate` — and a visible disclosure is part of what
 * distinguishes a reviewed recommendation from undisclosed paid placement
 * under the helpful-content guidance.
 *
 * Rendered only when a post ACTUALLY contains an affiliate link. A blanket
 * disclosure on every article is noise, and noise is what people learn to skip.
 */
export function AffiliateDisclosure({ className }: { className?: string }) {
  return (
    <aside
      aria-label="Affiliate disclosure"
      className={cn(
        'border-border bg-surface-2 flex items-start gap-3 rounded-xl border px-4 py-3',
        className
      )}
    >
      <Info
        className="text-foreground-subtle mt-0.5 size-4 shrink-0"
        aria-hidden="true"
      />
      <p className="text-foreground-muted text-sm leading-relaxed">
        This article contains affiliate links. If you buy through one we may earn a
        commission, at no extra cost to you. It never changes what we recommend — see our{' '}
        <Link
          href="/affiliate-disclosure"
          className="decoration-border hover:text-primary hover:decoration-primary underline underline-offset-2 transition-colors"
        >
          affiliate disclosure
        </Link>
        .
      </p>
    </aside>
  )
}

/**
 * Whether an article's HTML contains an affiliate link.
 *
 * Detected from the markup rather than stored as a flag on the post, so it
 * cannot drift: an editor who adds an affiliate link to the body gets the
 * disclosure automatically, and one who removes the last link loses it. A
 * manually-maintained boolean is exactly the kind of thing that ends up wrong
 * in the direction that matters legally.
 */
export function hasAffiliateLinks(html: string | null | undefined): boolean {
  return Boolean(html && /<a[^>]*\sdata-affiliate/i.test(html))
}
