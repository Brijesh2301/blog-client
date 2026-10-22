import { absoluteUrl, siteConfig } from '@/config/site'
import type { PostCard } from '@/types/content'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * FEED BUILDERS — RSS 2.0, Atom 1.0, podcast RSS
 * ═════════════════════════════════════════════════════════════════════════════
 * Hand-built rather than pulled from a library: the output is a few hundred
 * bytes of XML, the specs are stable, and a dependency here would be larger
 * than the code it replaced.
 *
 * The one thing that genuinely matters is ESCAPING. A single unescaped `&` in
 * a title makes the whole document malformed, and most readers reject a
 * malformed feed outright rather than degrading — so every interpolated value
 * goes through `escapeXml` or a CDATA section.
 */

/**
 * Escapes the five XML predefined entities.
 *
 * Order matters: `&` must be replaced first, or the ampersands introduced by
 * the later replacements would be double-escaped.
 */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Wraps HTML in CDATA for feed readers that render it.
 *
 * `]]>` inside the payload would close the section early, so it is split
 * across two CDATA sections — the standard trick, and the only correct one.
 */
function cdata(value: string): string {
  return `<![CDATA[${value.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`
}

/** RFC 822 date, required by RSS 2.0. Atom uses ISO 8601 instead. */
function rfc822(date: string | Date): string {
  return new Date(date).toUTCString()
}

function iso(date: string | Date): string {
  return new Date(date).toISOString()
}

type FeedPost = Pick<
  PostCard,
  | 'slug'
  | 'title'
  | 'excerpt'
  | 'publishedAt'
  | 'updatedAt'
  | 'coverImageUrl'
  | 'author'
  | 'category'
  | 'audioStatus'
  | 'audioDuration'
> & { audioUrl?: string | null; contentHtml?: string | null }

// ─────────────────────────────────────────────────────────────────────────────
// RSS 2.0
// ─────────────────────────────────────────────────────────────────────────────

export function buildRss(posts: FeedPost[]): string {
  const updated = posts[0]?.publishedAt ?? new Date().toISOString()

  const items = posts
    .map((post) => {
      const url = absoluteUrl(`/blog/${post.slug}`)
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(url)}</link>
      <!-- A permanent, never-reused id. isPermaLink=false because the URL may
           change; the guid must not. -->
      <guid isPermaLink="false">${escapeXml(url)}</guid>
      <pubDate>${rfc822(post.publishedAt ?? post.updatedAt)}</pubDate>
      ${post.author?.name ? `<dc:creator>${cdata(post.author.name)}</dc:creator>` : ''}
      ${post.category ? `<category>${escapeXml(post.category.name)}</category>` : ''}
      <description>${cdata(post.excerpt ?? '')}</description>
      ${post.contentHtml ? `<content:encoded>${cdata(post.contentHtml)}</content:encoded>` : ''}
      ${
        post.coverImageUrl
          ? `<enclosure url="${escapeXml(post.coverImageUrl)}" type="image/jpeg" length="0"/>`
          : ''
      }
    </item>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(siteConfig.name)}</title>
    <link>${escapeXml(absoluteUrl('/'))}</link>
    <description>${escapeXml(siteConfig.description)}</description>
    <language>${siteConfig.lang}</language>
    <lastBuildDate>${rfc822(updated)}</lastBuildDate>
    <!-- Self-reference: lets a reader rediscover the feed if it is copied. -->
    <atom:link href="${escapeXml(absoluteUrl('/rss.xml'))}" rel="self" type="application/rss+xml"/>
    <generator>${escapeXml(siteConfig.name)}</generator>
${items}
  </channel>
</rss>
`
}

// ─────────────────────────────────────────────────────────────────────────────
// Atom 1.0
// ─────────────────────────────────────────────────────────────────────────────

export function buildAtom(posts: FeedPost[]): string {
  const updated = posts[0]?.updatedAt ?? new Date().toISOString()

  const entries = posts
    .map((post) => {
      const url = absoluteUrl(`/blog/${post.slug}`)
      return `  <entry>
    <title type="text">${escapeXml(post.title)}</title>
    <link rel="alternate" type="text/html" href="${escapeXml(url)}"/>
    <id>${escapeXml(url)}</id>
    <published>${iso(post.publishedAt ?? post.updatedAt)}</published>
    <updated>${iso(post.updatedAt)}</updated>
    ${post.author?.name ? `<author><name>${escapeXml(post.author.name)}</name></author>` : ''}
    ${post.category ? `<category term="${escapeXml(post.category.slug)}" label="${escapeXml(post.category.name)}"/>` : ''}
    <summary type="text">${escapeXml(post.excerpt ?? '')}</summary>
    ${post.contentHtml ? `<content type="html">${cdata(post.contentHtml)}</content>` : ''}
  </entry>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${siteConfig.lang}">
  <title>${escapeXml(siteConfig.name)}</title>
  <subtitle>${escapeXml(siteConfig.description)}</subtitle>
  <link rel="alternate" type="text/html" href="${escapeXml(absoluteUrl('/'))}"/>
  <link rel="self" type="application/atom+xml" href="${escapeXml(absoluteUrl('/atom.xml'))}"/>
  <id>${escapeXml(absoluteUrl('/'))}</id>
  <updated>${iso(updated)}</updated>
  <author><name>${escapeXml(siteConfig.name)}</name></author>
${entries}
</feed>
`
}

// ─────────────────────────────────────────────────────────────────────────────
// Podcast RSS (iTunes / Spotify)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Podcast feed for the Listen feature.
 *
 * Only posts with READY audio appear. Apple and Spotify both reject a feed
 * whose items lack a valid `<enclosure>`, so including a post whose audio is
 * still generating would break the whole feed, not just that episode.
 *
 * Phase 6 populates `audioUrl`; until then this correctly renders an empty
 * channel, which is a valid feed.
 */
export function buildPodcastRss(posts: FeedPost[]): string {
  const episodes = posts.filter(
    (post) => post.audioStatus === 'ready' && Boolean(post.audioUrl)
  )

  const items = episodes
    .map((post) => {
      const url = absoluteUrl(`/blog/${post.slug}`)
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="false">${escapeXml(`${url}#audio`)}</guid>
      <pubDate>${rfc822(post.publishedAt ?? post.updatedAt)}</pubDate>
      <description>${cdata(post.excerpt ?? '')}</description>
      <itunes:summary>${cdata(post.excerpt ?? '')}</itunes:summary>
      ${post.author?.name ? `<itunes:author>${escapeXml(post.author.name)}</itunes:author>` : ''}
      ${post.audioDuration ? `<itunes:duration>${formatDuration(post.audioDuration)}</itunes:duration>` : ''}
      <itunes:explicit>false</itunes:explicit>
      <enclosure url="${escapeXml(post.audioUrl!)}" type="audio/mpeg" length="0"/>
    </item>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(siteConfig.name)}</title>
    <link>${escapeXml(absoluteUrl('/'))}</link>
    <description>${escapeXml(siteConfig.description)}</description>
    <language>${siteConfig.lang}</language>
    <atom:link href="${escapeXml(absoluteUrl('/podcast.xml'))}" rel="self" type="application/rss+xml"/>
    <itunes:author>${escapeXml(siteConfig.name)}</itunes:author>
    <itunes:summary>${escapeXml(siteConfig.description)}</itunes:summary>
    <itunes:type>episodic</itunes:type>
    <itunes:explicit>false</itunes:explicit>
    <itunes:owner>
      <itunes:name>${escapeXml(siteConfig.name)}</itunes:name>
      <itunes:email>${escapeXml(siteConfig.organization.editorialEmail)}</itunes:email>
    </itunes:owner>
    <itunes:image href="${escapeXml(absoluteUrl(siteConfig.assets.logo))}"/>
    <itunes:category text="Technology"/>
${items}
  </channel>
</rss>
`
}

/** HH:MM:SS, the only duration format iTunes reliably accepts. */
function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const hh = String(Math.floor(s / 3600)).padStart(2, '0')
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}
