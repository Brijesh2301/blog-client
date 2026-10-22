import { cacheLife } from 'next/cache'

import { absoluteUrl } from '@/config/site'
import { getPosts } from '@/lib/api'
import { SITEMAP_HEADERS, buildSitemap, type SitemapEntry } from '@/lib/sitemap'

/**
 * POSTS — /sitemap-posts.xml
 *
 * Carries real per-post `lastmod` (the row's updatedAt, not the build time)
 * and an `<image:image>` entry for each cover, which is what gets covers into
 * image search and Discover.
 */
/*
 * `use cache` wraps the STRING builder, not the handler: a cached function
 * must return something serialisable, and a `Response` is not.
 */
async function buildBody(): Promise<string> {
  'use cache'
  cacheLife('hours')

  const { items } = await getPosts({ limit: 100 })

  const entries: SitemapEntry[] = items.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: post.updatedAt,
    changeFrequency: 'monthly',
    // Featured and editor-picked posts are the ones we most want recrawled.
    priority: post.featured || post.editorsPick ? 0.9 : 0.8,
    images: post.coverImageUrl
      ? [
          {
            url: post.coverImageUrl,
            title: post.title,
            caption: post.coverImageAlt ?? undefined,
          },
        ]
      : undefined,
  }))

  return buildSitemap(entries)
}

export async function GET() {
  return new Response(await buildBody(), { headers: SITEMAP_HEADERS })
}
