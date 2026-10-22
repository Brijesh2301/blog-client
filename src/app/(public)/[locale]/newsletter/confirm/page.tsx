import type { Metadata } from 'next'
import { Suspense } from 'react'

import { ConfirmSubscription } from '@/components/layout/confirm-subscription'
import { Container } from '@/components/ui/container'
import { buildMetadata } from '@/lib/seo'
import type { Locale } from '@/i18n/config'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * NEWSLETTER CONFIRMATION — /newsletter/confirm?token=…
 * ═════════════════════════════════════════════════════════════════════════════
 * The second half of double opt-in. Without this page the subscribe form
 * issues tokens nobody can ever redeem, so no address would ever reach
 * `confirmed` — the list would fill with permanently pending rows.
 *
 * `noIndex` is not optional here. The URL carries a single-use secret in its
 * query string: indexing it would publish live confirmation tokens, and every
 * variant of the token is a separate near-duplicate URL. Nothing about this
 * page belongs in a search result.
 */

/**
 * Metadata is a FUNCTION, not a constant, because the canonical and the
 * `og:locale` depend on which language this page is being rendered in.
 * A constant would hardcode the English canonical onto the Hindi page,
 * which tells Google to drop the Hindi version entirely.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  return buildMetadata({
    title: 'Confirm your subscription',
    description:
      'Confirm your email address to start receiving the Devlume dispatch — one deeply researched engineering essay a week.',
    path: '/newsletter/confirm',
    noIndex: true,
    locale,
  })
}

export default function ConfirmPage() {
  return (
    <Container width="prose" className="py-20 sm:py-28">
      {/*
        The token lives in the query string, which is request-time data — so
        the component that reads it sits behind Suspense and the shell around
        it still prerenders. The fallback is the same size as the result, so
        the swap shifts nothing.
      */}
      <Suspense fallback={<ConfirmSkeleton />}>
        <ConfirmSubscription />
      </Suspense>
    </Container>
  )
}

function ConfirmSkeleton() {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
      <div className="bg-surface-2 size-12 animate-pulse rounded-full" />
      <div className="bg-surface-2 h-7 w-56 animate-pulse rounded-md" />
      <div className="bg-surface-2 h-5 w-72 animate-pulse rounded-md" />
    </div>
  )
}
