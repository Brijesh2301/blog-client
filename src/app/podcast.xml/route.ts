import { cacheLife } from 'next/cache'

import { buildPodcastRss } from '@/lib/feed'
import { getPosts } from '@/lib/api'

/**
 * Served at /podcast.xml
 *
 * A GET route handler, cached like any other read under Cache Components, so
 * the feed is prerendered and revalidates on the same schedule as the posts
 * it contains.
 *
 * Feed readers poll aggressively, so the Cache-Control header lets the CDN
 * absorb that rather than passing every poll through to the origin.
 */
/*
 * `use cache` wraps the STRING builder, not the handler.
 *
 * A cached function's return value has to be serialisable, and a `Response`
 * is not — caching the handler itself fails the build with "Only plain
 * objects can be passed to Client Components". Caching the XML and
 * constructing the Response outside the boundary is both correct and cheaper:
 * the expensive part (fetching and rendering) is what gets reused.
 */
async function buildBody(): Promise<string> {
  'use cache'
  cacheLife('hours')

  const { items } = await getPosts({ limit: 50 })
  return buildPodcastRss(items)
}

export async function GET() {
  return new Response(await buildBody(), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
