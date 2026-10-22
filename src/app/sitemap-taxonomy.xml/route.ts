import { cacheLife } from 'next/cache'

import { absoluteUrl } from '@/config/site'
import { getAllSeries, getAuthors, getCategories, getTags } from '@/lib/api'
import { SITEMAP_HEADERS, buildSitemap, type SitemapEntry } from '@/lib/sitemap'

/**
 * TAXONOMY — /sitemap-taxonomy.xml
 *
 * Categories, tags, series and authors.
 *
 * The filters here MUST mirror each page's own robots directive. A category
 * without intro text and a tag below the thin-content threshold are served
 * noindex, so listing them would tell Google two contradictory things about
 * the same URL.
 */
/*
 * `use cache` wraps the STRING builder, not the handler: a cached function
 * must return something serialisable, and a `Response` is not.
 */
async function buildBody(): Promise<string> {
  'use cache'
  cacheLife('hours')

  const [categories, tags, authors, series] = await Promise.all([
    getCategories(),
    getTags(),
    getAuthors(),
    getAllSeries(),
  ])

  const now = new Date()

  const entries: SitemapEntry[] = [
    ...categories
      .filter((category) => !category.noIndex && Boolean(category.introText))
      .map((category) => ({
        url: absoluteUrl(`/category/${category.slug}`),
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: category.featured ? 0.8 : 0.7,
      })),

    ...series.map((item) => ({
      url: absoluteUrl(`/series/${item.slug}`),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),

    ...authors.map((author) => ({
      url: absoluteUrl(`/author/${author.slug}`),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),

    ...tags
      .filter((tag) => tag.shouldIndex)
      .map((tag) => ({
        url: absoluteUrl(`/tag/${tag.slug}`),
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      })),
  ]

  return buildSitemap(entries)
}

export async function GET() {
  return new Response(await buildBody(), { headers: SITEMAP_HEADERS })
}
