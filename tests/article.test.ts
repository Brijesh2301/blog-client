import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { processArticle } from '@/lib/article'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * ARTICLE PIPELINE
 * ═════════════════════════════════════════════════════════════════════════════
 * Everything an article's HTML goes through before it reaches the page:
 * sanitising, heading IDs, link hardening and TOC extraction — all from ONE
 * parse, because parsing the body four times per render is the kind of cost
 * that only shows up under load.
 *
 * The body is inserted with `dangerouslySetInnerHTML`, so sanitisation here is
 * the only thing between a compromised editor account and stored XSS on every
 * reader's browser. That is what most of these tests are about.
 */

describe('sanitisation', () => {
  test('strips script tags', () => {
    const { html } = processArticle('<p>Before</p><script>alert(1)</script><p>After</p>')
    assert.ok(!html.includes('<script'))
    assert.ok(html.includes('Before') && html.includes('After'))
  })

  test('strips inline event handlers', () => {
    const { html } = processArticle('<p onclick="steal()">Text</p>')
    assert.ok(!html.includes('onclick'))
    assert.ok(html.includes('Text'))
  })

  test('strips javascript: hrefs', () => {
    const { html } = processArticle('<a href="javascript:alert(1)">click</a>')
    assert.ok(!html.includes('javascript:'))
  })

  test('strips iframes', () => {
    const { html } = processArticle('<iframe src="https://evil.example"></iframe>')
    assert.ok(!html.includes('<iframe'))
  })

  test('strips style tags, which can exfiltrate via background URLs', () => {
    const { html } = processArticle('<style>body{display:none}</style><p>Hi</p>')
    assert.ok(!html.includes('<style'))
    assert.ok(html.includes('Hi'))
  })

  test('keeps the formatting an article actually needs', () => {
    const { html } = processArticle(
      '<p>A <strong>bold</strong> and <em>italic</em> line with <code>code</code>.</p>' +
        '<blockquote><p>A quote.</p></blockquote><ul><li>An item</li></ul>'
    )

    for (const tag of ['<strong>', '<em>', '<code>', '<blockquote>', '<ul>', '<li>']) {
      assert.ok(html.includes(tag), `${tag} should survive`)
    }
  })

  test('handles null and empty input', () => {
    for (const input of [null, undefined, '']) {
      const result = processArticle(input)
      assert.equal(typeof result.html, 'string')
      assert.deepEqual(result.toc, [])
    }
  })
})

describe('heading IDs and table of contents', () => {
  const sample =
    '<h2>First section</h2><p>Body.</p>' +
    '<h3>A detail</h3><p>Body.</p>' +
    '<h2>Second section</h2><p>Body.</p>'

  test('gives every heading an id so the TOC can link to it', () => {
    const { html } = processArticle(sample)
    assert.equal((html.match(/<h[23] id="/g) ?? []).length, 3)
  })

  test('extracts the TOC in document order with correct depth', () => {
    const { toc } = processArticle(sample)

    assert.deepEqual(
      toc.map((e) => [e.level, e.text]),
      [
        [2, 'First section'],
        [3, 'A detail'],
        [2, 'Second section'],
      ]
    )
  })

  test('TOC ids match the ids actually in the HTML', () => {
    // A mismatch gives a table of contents whose links all go nowhere — and it
    // looks perfectly fine until someone clicks one.
    const { html, toc } = processArticle(sample)
    for (const entry of toc) {
      assert.ok(html.includes(`id="${entry.id}"`), `no heading carries id "${entry.id}"`)
    }
  })

  test('deduplicates ids when two headings share a title', () => {
    const { html, toc } = processArticle('<h2>Setup</h2><h2>Setup</h2>')
    const ids = toc.map((e) => e.id)

    assert.equal(new Set(ids).size, ids.length, 'duplicate ids break anchor links')
    for (const id of ids) assert.ok(html.includes(`id="${id}"`))
  })

  test('produces usable ids from punctuation-heavy headings', () => {
    const { toc } = processArticle('<h2>What about `use cache`, really?</h2>')

    assert.equal(toc.length, 1)
    assert.match(toc[0]!.id, /^[a-z0-9-]+$/, `unusable id: "${toc[0]!.id}"`)
  })

  test('ignores h1, which belongs to the page, not the body', () => {
    const { toc } = processArticle('<h1>Page title</h1><h2>A section</h2>')
    assert.deepEqual(
      toc.map((e) => e.level),
      [2]
    )
  })
})

describe('link hardening', () => {
  test('adds rel="noopener noreferrer" to external links', () => {
    // Without noopener the opened page gets a handle on ours via window.opener.
    const { html } = processArticle('<p><a href="https://example.com">out</a></p>')
    assert.match(html, /rel="[^"]*noopener[^"]*noreferrer[^"]*"/)
  })

  test('leaves internal links alone', () => {
    // The sanitiser stamps a blanket rel on every anchor as a fallback; the
    // parse pass must clear it for internal links. `noreferrer` on same-site
    // navigation hides article-to-article flow from analytics.
    const { html } = processArticle('<p><a href="/blog/other">in</a></p>')

    assert.ok(!html.includes('noreferrer'), 'internal links must keep their Referer')
    assert.ok(!html.includes('target='), 'internal links should not open a new tab')
  })

  test('marks an affiliate link as sponsored and nofollow', () => {
    // Passing paid link equity undisclosed is a manual-action risk.
    const { html } = processArticle(
      '<p><a href="https://shop.example" data-affiliate>buy</a></p>'
    )

    assert.match(html, /rel="[^"]*sponsored[^"]*"/)
    assert.match(html, /rel="[^"]*nofollow[^"]*"/)
  })

  test('lazy-loads body images so a late one cannot shift the article', () => {
    const { html } = processArticle('<p><img src="/a.png" alt="A diagram"></p>')
    assert.ok(html.includes('loading="lazy"'))
    assert.ok(html.includes('decoding="async"'))
  })

  test('does not add nofollow to editorial external links', () => {
    // Editorial citations are a deliberate E-E-A-T signal. `nofollow` belongs
    // on user-generated links (comments), not on sources the author chose.
    const { html } = processArticle('<p><a href="https://example.com">source</a></p>')
    assert.ok(!html.includes('nofollow'))
  })
})

describe('performance contract', () => {
  test('returns html and toc from a single call', () => {
    const result = processArticle('<h2>A</h2><p>B</p>')
    assert.ok('html' in result && 'toc' in result)
  })

  test('is deterministic', () => {
    const input = '<h2>Setup</h2><p>Text <a href="https://x.example">link</a></p>'
    assert.deepEqual(processArticle(input), processArticle(input))
  })
})
