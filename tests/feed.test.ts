import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { buildAtom, buildPodcastRss, buildRss, escapeXml } from '@/lib/feed'
import { buildSitemap, buildSitemapIndex } from '@/lib/sitemap'
import type { PostCard } from '@/types/content'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * FEEDS AND SITEMAPS
 * ═════════════════════════════════════════════════════════════════════════════
 * XML is unforgiving in a way HTML is not: a single unescaped `&` in one
 * post's title makes the ENTIRE feed unparseable, and a reader or a search
 * engine drops all of it rather than skipping the bad entry. The same is true
 * of a sitemap — one bad character and Search Console rejects the file, not
 * the URL.
 *
 * So these tests are mostly about hostile-but-ordinary content: ampersands in
 * titles, angle brackets in excerpts, and the `]]>` sequence that terminates a
 * CDATA section early.
 */

/** Matches `FeedPost`: a PostCard subset plus the audio URL. */
const post = (
  overrides: Partial<PostCard & { audioUrl: string | null }> = {}
): PostCard & { audioUrl: string | null } =>
  ({
    id: '1',
    slug: 'a-post',
    title: 'A post',
    subtitle: null,
    excerpt: 'An excerpt.',
    coverImageUrl: null,
    coverImageAlt: null,
    status: 'published',
    featured: false,
    editorsPick: false,
    readingMinutes: 5,
    wordCount: 1200,
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    publishedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    audioStatus: 'none',
    audioDuration: null,
    author: null,
    category: null,
    audioUrl: null,
    ...overrides,
  }) as PostCard & { audioUrl: string | null }

/**
 * A small but CORRECT XML scanner.
 *
 * The first version of this helper matched tags with a regex and reported
 * every feed as unbalanced — including an empty one. Regexes cannot tokenise
 * XML: attribute values contain `/` and `>`, and CDATA, comments and
 * processing instructions all have to be skipped wholesale. A test helper
 * that is wrong is worse than no helper, because it buries the real
 * assertions under its own noise.
 *
 * So this walks the string once, tracks quoting inside tags, and keeps an
 * element stack. Full schema validation still belongs to the HTTP gate
 * script, which parses the live response with a real parser; this exists so
 * the pure builders can be tested without a running server.
 */
function assertWellFormed(xml: string) {
  const stack: string[] = []
  let i = 0

  while (i < xml.length) {
    const lt = xml.indexOf('<', i)
    if (lt === -1) break

    // Blocks whose contents are not markup.
    for (const [open, close] of [
      ['<![CDATA[', ']]>'],
      ['<!--', '-->'],
      ['<?', '?>'],
      ['<!', '>'],
    ] as const) {
      if (xml.startsWith(open, lt)) {
        const end = xml.indexOf(close, lt + open.length)
        assert.notEqual(end, -1, `unterminated ${open}`)
        i = end + close.length
        break
      }
    }
    if (i > lt) continue

    // Walk to the tag's `>`, respecting quoted attribute values.
    let j = lt + 1
    let quote: string | null = null
    while (j < xml.length) {
      const ch = xml[j]!
      if (quote) {
        if (ch === quote) quote = null
      } else if (ch === '"' || ch === "'") {
        quote = ch
      } else if (ch === '>') {
        break
      }
      j++
    }
    assert.ok(j < xml.length, 'unterminated tag')

    const inner = xml.slice(lt + 1, j)
    const selfClosing = inner.endsWith('/')
    const name =
      inner
        .replace(/^\//, '')
        .trim()
        .split(/[\s/>]/)[0] ?? ''

    if (inner.startsWith('/')) {
      assert.equal(stack.pop(), name, `mismatched closing tag </${name}>`)
    } else if (!selfClosing) {
      stack.push(name)
    }

    i = j + 1
  }

  assert.deepEqual(stack, [], `unclosed tag(s): ${stack.join(', ')}`)

  // The part that actually breaks in production: a bare `&` anywhere outside
  // CDATA makes the whole document unparseable.
  const outsideCdata = xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')
  const strays = outsideCdata.match(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/gi)
  assert.equal(strays, null, `unescaped ampersand(s): ${JSON.stringify(strays)}`)
}

describe('escapeXml', () => {
  test('escapes the five XML entities', () => {
    assert.equal(escapeXml('a & b'), 'a &amp; b')
    assert.equal(escapeXml('<tag>'), '&lt;tag&gt;')
    assert.equal(escapeXml(`"q" 'a'`), '&quot;q&quot; &apos;a&apos;')
  })

  test('escapes the ampersand first, so entities are not double-escaped', () => {
    // Getting the order wrong yields `&amp;lt;`, which renders literally.
    assert.equal(escapeXml('<'), '&lt;')
    assert.equal(escapeXml('&lt;'), '&amp;lt;')
  })

  test('is idempotent in the sense that re-escaping is visible, not silent', () => {
    assert.equal(escapeXml(escapeXml('&')), '&amp;amp;')
  })
})

describe('buildRss', () => {
  test('produces a well-formed feed for ordinary posts', () => {
    const xml = buildRss([post(), post({ slug: 'b', title: 'Another' })])
    assert.ok(xml.startsWith('<?xml'))
    assertWellFormed(xml)
  })

  test('survives an ampersand in a title', () => {
    const xml = buildRss([post({ title: 'Caching & invalidation' })])
    assertWellFormed(xml)
  })

  test('survives angle brackets in an excerpt', () => {
    const xml = buildRss([post({ excerpt: 'Use <Suspense> for this.' })])
    assertWellFormed(xml)
  })

  test('splits a "]]>" sequence so it cannot end a CDATA section early', () => {
    // Without this the feed is truncated at that exact byte and every
    // subsequent item vanishes.
    const xml = buildRss([post({ excerpt: 'An array literal ]]> in prose' })])

    const cdataEnds = (xml.match(/\]\]>/g) ?? []).length
    const cdataStarts = (xml.match(/<!\[CDATA\[/g) ?? []).length
    assert.equal(cdataEnds, cdataStarts, 'every ]]> must close a CDATA it opened')
  })

  test('handles an empty post list', () => {
    const xml = buildRss([])
    assert.ok(xml.startsWith('<?xml'))
    assertWellFormed(xml)
  })

  test('emits RFC-822 dates, which RSS requires', () => {
    const xml = buildRss([post()])
    assert.match(xml, /<pubDate>[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4}/)
  })
})

describe('buildAtom', () => {
  test('produces a well-formed feed', () => {
    assertWellFormed(buildAtom([post(), post({ slug: 'b' })]))
  })

  test('emits ISO-8601 dates, which Atom requires', () => {
    const xml = buildAtom([post()])
    assert.match(xml, /<updated>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  test('survives hostile characters', () => {
    assertWellFormed(buildAtom([post({ title: 'A & B <C>', excerpt: '"quoted"' })]))
  })
})

describe('buildPodcastRss', () => {
  test('includes only posts that actually have audio', () => {
    const xml = buildPodcastRss([
      post({
        slug: 'with-audio',
        title: 'Has audio',
        audioStatus: 'ready',
        audioDuration: 300,
        audioUrl: 'https://cdn.example.com/a.mp3',
      }),
      post({ slug: 'no-audio', title: 'No audio' }),
    ])

    assert.ok(xml.includes('Has audio'))
    assert.ok(!xml.includes('No audio'), 'a post with no MP3 has nothing to enclose')
  })

  test('is well-formed', () => {
    assertWellFormed(
      buildPodcastRss([
        post({
          audioStatus: 'ready',
          audioDuration: 300,
          audioUrl: 'https://cdn.example.com/a.mp3',
        }),
      ])
    )
  })
})

describe('buildSitemap', () => {
  const entry = (url: string) => ({ url, lastModified: new Date('2026-01-01') })

  test('produces a well-formed urlset', () => {
    const xml = buildSitemap([
      entry('https://devlume.dev/'),
      entry('https://devlume.dev/blog'),
    ])
    assert.ok(xml.includes('<urlset'))
    assertWellFormed(xml)
  })

  test('escapes a query string ampersand in a URL', () => {
    assertWellFormed(buildSitemap([entry('https://devlume.dev/x?a=1&b=2')]))
  })

  test('handles an empty entry list', () => {
    assertWellFormed(buildSitemap([]))
  })

  test('the index is well-formed', () => {
    assertWellFormed(
      buildSitemapIndex([
        {
          url: 'https://devlume.dev/sitemap-posts.xml',
          lastModified: new Date('2026-01-01'),
        },
        { url: 'https://devlume.dev/sitemap-pages.xml' },
      ])
    )
  })

  test('a podcast feed with no episodes is still well-formed', () => {
    // An empty <channel> must not become malformed, or every podcast client
    // drops the feed rather than showing nothing.
    assertWellFormed(buildPodcastRss([post()]))
  })
})
