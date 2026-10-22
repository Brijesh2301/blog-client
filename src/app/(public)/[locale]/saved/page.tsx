import type { Metadata } from 'next'

import { SavedArticles } from '@/components/content/saved-articles'
import { Container } from '@/components/ui/container'
import { buildMetadata } from '@/lib/seo'
import type { Locale } from '@/i18n/config'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * SAVED ARTICLES — /saved
 * ═════════════════════════════════════════════════════════════════════════════
 * `noindex`, and not reluctantly.
 *
 * Every article on this page is already indexed at its own canonical URL. A
 * crawlable /saved would be a page of duplicate titles and excerpts whose
 * content differs per reader — thin, duplicative, and impossible for a crawler
 * to see the real version of, since it has no account. robots.txt also
 * disallows it, so the URL is never fetched in the first place.
 *
 * The shell here is static; only the list inside is client-rendered, so the
 * page still paints instantly and the reader sees chrome rather than a blank
 * screen while their list loads.
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
    title: 'Saved articles',
    description: 'Articles you have saved to read later on Devlume.',
    path: '/saved',
    noIndex: true,
    locale,
  })
}

export default function SavedPage() {
  return (
    <Container className="py-14 sm:py-20">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-h2 font-semibold tracking-tight">Saved</h1>
        <p className="text-foreground-muted max-w-prose text-sm leading-relaxed">
          Articles you saved to come back to. Saving is tied to your account, so the list
          is the same on every device you sign in on.
        </p>
      </header>

      <SavedArticles />
    </Container>
  )
}
