import { escapeXml } from '@/lib/feed'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * SITEMAP BUILDERS
 * ═════════════════════════════════════════════════════════════════════════════
 * Hand-rolled rather than using Next's `sitemap.ts` convention, for two
 * reasons:
 *
 *  1. An INDEX. Google caps a sitemap at 50,000 URLs / 50MB. Splitting by
 *     entity (posts, taxonomy, pages) also makes Search Console report
 *     indexing coverage per type, which is how you find out that, say, tag
 *     pages are being dropped.
 *  2. IMAGE entries. `<image:image>` tells Google which image belongs to which
 *     page, which is what gets covers into image search and Discover.
 *
 * Every URL here must be independently indexable. A sitemap that lists a
 * noindex page sends Google two contradictory instructions and shows up as a
 * warning in Search Console.
 */

export type SitemapEntry = {
  url: string
  lastModified?: Date | string
  changeFrequency?:
    'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
  /** Cover and inline images belonging to this URL. */
  images?: { url: string; title?: string; caption?: string }[]
}

function iso(value: Date | string): string {
  return new Date(value).toISOString()
}

export function buildSitemap(entries: SitemapEntry[]): string {
  const hasImages = entries.some((entry) => entry.images?.length)

  const urls = entries
    .map((entry) => {
      const parts = [`    <loc>${escapeXml(entry.url)}</loc>`]

      if (entry.lastModified) {
        parts.push(`    <lastmod>${iso(entry.lastModified)}</lastmod>`)
      }
      if (entry.changeFrequency) {
        parts.push(`    <changefreq>${entry.changeFrequency}</changefreq>`)
      }
      if (entry.priority !== undefined) {
        // Google wants one decimal place; anything else is ignored.
        parts.push(`    <priority>${entry.priority.toFixed(1)}</priority>`)
      }

      for (const image of entry.images ?? []) {
        parts.push(
          `    <image:image>`,
          `      <image:loc>${escapeXml(image.url)}</image:loc>`,
          ...(image.title
            ? [`      <image:title>${escapeXml(image.title)}</image:title>`]
            : []),
          ...(image.caption
            ? [`      <image:caption>${escapeXml(image.caption)}</image:caption>`]
            : []),
          `    </image:image>`
        )
      }

      return `  <url>\n${parts.join('\n')}\n  </url>`
    })
    .join('\n')

  // The image namespace is declared only when it is used, so a sitemap with no
  // images stays minimal.
  const imageNs = hasImages
    ? '\n        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'
    : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${imageNs}>
${urls}
</urlset>
`
}

export function buildSitemapIndex(
  sitemaps: { url: string; lastModified?: Date | string }[]
): string {
  const entries = sitemaps
    .map(
      (entry) => `  <sitemap>
    <loc>${escapeXml(entry.url)}</loc>${
      entry.lastModified ? `\n    <lastmod>${iso(entry.lastModified)}</lastmod>` : ''
    }
  </sitemap>`
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>
`
}

/** Shared response headers. Sitemaps are polled, so let the CDN absorb it. */
export const SITEMAP_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400',
} as const
