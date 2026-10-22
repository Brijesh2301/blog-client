import { cacheLife } from 'next/cache'

import { absoluteUrl } from '@/config/site'
import { getPosts } from '@/lib/api'
import { SITEMAP_HEADERS, buildSitemapIndex } from '@/lib/sitemap'

/**
 * SITEMAP INDEX — /sitemap.xml
 *
 * Points at one sitemap per entity type. Splitting this way keeps each file
 * well under Google's 50,000-URL cap and, more usefully, makes Search Console
 * report indexing coverage separately for posts, taxonomy and static pages —
 * which is how you notice that one whole class of page is being dropped.
 */
/*
 * `use cache` wraps the STRING builder, not the handler: a cached function
 * must return something serialisable, and a `Response` is not.
 */
async function buildBody(): Promise<string> {
  'use cache'
  cacheLife('hours')

  // The newest post timestamp stands in for "when did content last change",
  // so a crawler can skip the child sitemaps when nothing has.
  const { items } = await getPosts({ limit: 1 })
  const newest = items[0]?.updatedAt ?? new Date().toISOString()

  const body = buildSitemapIndex([
    { url: absoluteUrl('/sitemap-posts.xml'), lastModified: newest },
    { url: absoluteUrl('/sitemap-taxonomy.xml'), lastModified: newest },
    { url: absoluteUrl('/sitemap-pages.xml'), lastModified: newest },
  ])

  return body
}

export async function GET() {
  return new Response(await buildBody(), { headers: SITEMAP_HEADERS })
}
