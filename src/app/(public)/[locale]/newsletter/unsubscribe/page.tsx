import type { Metadata } from 'next'
import { Suspense } from 'react'

import { UnsubscribeForm } from '@/components/layout/unsubscribe-form'
import { Container } from '@/components/ui/container'
import { buildMetadata } from '@/lib/seo'
import type { Locale } from '@/i18n/config'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * UNSUBSCRIBE — /newsletter/unsubscribe?email=…
 * ═════════════════════════════════════════════════════════════════════════════
 * One click, one button, no survey, no "are you sure". Every email we send
 * links here with the address prefilled.
 *
 * `noIndex`, for the same reason as the confirmation page: the URL carries a
 * subscriber's email address in its query string, and an indexed version of
 * it would publish that address.
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
    title: 'Unsubscribe',
    description: 'Stop receiving the Devlume dispatch. One click, no questions.',
    path: '/newsletter/unsubscribe',
    noIndex: true,
    locale,
  })
}

export default function UnsubscribePage() {
  return (
    <Container width="prose" className="py-20 sm:py-28">
      <Suspense
        fallback={<div className="bg-surface-2 min-h-56 animate-pulse rounded-2xl" />}
      >
        <UnsubscribeForm />
      </Suspense>
    </Container>
  )
}
