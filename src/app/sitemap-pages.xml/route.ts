import { cacheLife } from 'next/cache'

import { absoluteUrl } from '@/config/site'
import { STATIC_PAGES } from '@/content/pages'
import { SITEMAP_HEADERS, buildSitemap, type SitemapEntry } from '@/lib/sitemap'

/**
 * STATIC PAGES — /sitemap-pages.xml
 *
 * Listings, company pages and the trust pages.
 *
 * The trust pages carry low priority but MUST be present: their existence and
 * discoverability is part of the AdSense review, and a reviewer who cannot
 * find a privacy policy fails the application.
 *
 * /search, /login, /admin and /design-system are deliberately absent — all
 * four are noindex.
 */
/*
 * `use cache` wraps the STRING builder, not the handler: a cached function
 * must return something serialisable, and a `Response` is not.
 */
async function buildBody(): Promise<string> {
  'use cache'
  cacheLife('days')

  const now = new Date()

  /*
   * Listing routes, which are real route files with their own components.
   *
   * These are hand-listed because each one is its own page.tsx; the page set
   * below is not.
   */
  const listings: [string, number, SitemapEntry['changeFrequency']][] = [
    ['/', 1.0, 'daily'],
    ['/blog', 0.9, 'daily'],
    ['/topics', 0.7, 'weekly'],
    ['/series', 0.7, 'weekly'],
    ['/authors', 0.6, 'monthly'],
  ]

  /*
   * The static pages come from the SAME array the route renders from.
   *
   * They used to be two hand-maintained lists, and they disagreed: the
   * sitemap advertised twelve URLs that had no route and returned 404.
   * Search Console reports that as a failing sitemap, and the crawler spends
   * budget fetching nothing. Deriving both from `STATIC_PAGES` makes the
   * disagreement impossible rather than merely fixed — a page cannot be in
   * the sitemap unless it is also in the route's `generateStaticParams`.
   */
  const pages: SitemapEntry[] = STATIC_PAGES.map((page) => ({
    url: absoluteUrl(`/${page.slug}`),
    lastModified: new Date(page.lastUpdated),
    changeFrequency: page.group === 'legal' ? ('yearly' as const) : ('monthly' as const),
    // Trust pages must be PRESENT for the AdSense review, but they are not
    // what the site is for, so they rank below the listings.
    priority: page.group === 'legal' ? 0.3 : 0.5,
  }))

  const entries: SitemapEntry[] = [
    ...listings.map(([path, priority, changeFrequency]) => ({
      url: absoluteUrl(path),
      lastModified: now,
      changeFrequency,
      priority,
    })),
    ...pages,
  ]

  return buildSitemap(entries)
}

export async function GET() {
  return new Response(await buildBody(), { headers: SITEMAP_HEADERS })
}
