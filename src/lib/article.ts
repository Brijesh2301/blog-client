import { parse } from 'node-html-parser'
import sanitizeHtml from 'sanitize-html'

import { slugify } from '@/lib/utils'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * ARTICLE HTML PIPELINE
 * ═════════════════════════════════════════════════════════════════════════════
 * Runs once, server-side, inside the cached render — so the cost is paid at
 * build/revalidate time, never per request, and the output is part of the
 * prerendered HTML.
 *
 * Four jobs, in order:
 *  1. SANITISE. The stored HTML is authored content. Even though the editor
 *     will sanitise on write (Phase 4), rendering it unsanitised would make a
 *     single compromised author account a stored-XSS vector for every reader.
 *     Sanitising on read as well is cheap defence in depth.
 *  2. ADD HEADING IDs so the table of contents can link to them.
 *  3. HARDEN EXTERNAL LINKS with rel="noopener noreferrer", and mark
 *     affiliate/sponsored links appropriately.
 *  4. EXTRACT the heading tree for the TOC, from the SAME parse, so the TOC
 *     can never drift from the rendered document.
 */

export type TocEntry = {
  id: string
  text: string
  level: 2 | 3
}

export type ProcessedArticle = {
  html: string
  toc: TocEntry[]
  /** True when the body contains at least one code block. */
  hasCode: boolean
}

/**
 * Allowlist, not a blocklist.
 *
 * Everything not named here is stripped. `script`, `style`, `iframe` and event
 * handlers are absent by design — an article body has no legitimate need for
 * them, and allowing any one of them reopens XSS.
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'h2',
    'h3',
    'h4',
    'p',
    'blockquote',
    'ul',
    'ol',
    'li',
    'strong',
    'em',
    'del',
    'code',
    'pre',
    'a',
    'img',
    'figure',
    'figcaption',
    'hr',
    'br',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'sup',
    'sub',
    'mark',
    'span',
    'div',
    'kbd',
    'abbr',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'rel', 'target', 'data-affiliate'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
    code: ['class'],
    pre: ['class'],
    span: ['class'],
    div: ['class', 'data-tone'],
    th: ['scope', 'colspan', 'rowspan'],
    td: ['colspan', 'rowspan'],
    abbr: ['title'],
    '*': ['id'],
  },
  // Only these schemes may appear in href/src. Blocks javascript: and data:
  // URLs, both of which are script-execution vectors.
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  // Drop the contents of disallowed tags too, so a stripped <script> does not
  // leave its source code as visible text.
  nonTextTags: ['style', 'script', 'textarea', 'option', 'noscript'],
  transformTags: {
    // Belt and braces: the parse pass below sets rel precisely, but if that
    // ever regresses, every link still leaves here with noopener.
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true),
  },
}

export function processArticle(rawHtml: string | null | undefined): ProcessedArticle {
  if (!rawHtml) return { html: '', toc: [], hasCode: false }

  const clean = sanitizeHtml(rawHtml, SANITIZE_OPTIONS)
  const root = parse(clean)

  // ── Headings: stable ids + TOC, from one traversal ──────────────────────
  const toc: TocEntry[] = []
  const seen = new Map<string, number>()

  for (const heading of root.querySelectorAll('h2, h3')) {
    const text = heading.textContent.trim()
    if (!text) continue

    let id = heading.getAttribute('id') ?? slugify(text)
    if (!id) id = 'section'

    // Two headings with the same text would otherwise produce duplicate ids,
    // which makes the anchor ambiguous and is an HTML validity error.
    const count = seen.get(id) ?? 0
    seen.set(id, count + 1)
    if (count > 0) id = `${id}-${count + 1}`

    heading.setAttribute('id', id)
    toc.push({ id, text, level: heading.rawTagName === 'h2' ? 2 : 3 })
  }

  // ── Links ────────────────────────────────────────────────────────────────
  for (const anchor of root.querySelectorAll('a')) {
    const href = anchor.getAttribute('href') ?? ''
    const isExternal = /^https?:\/\//i.test(href)

    if (!isExternal) {
      /*
       * Clear the blanket rel the sanitiser stamped on EVERY anchor.
       *
       * That transform is a deliberate fallback for external links, but it
       * overshoots onto internal ones, and `noreferrer` there is actively
       * harmful: it strips the Referer on same-site navigation, so
       * article-to-article flow disappears from analytics — the one number
       * that tells you whether internal linking is working. `noopener` buys
       * nothing either, since internal links never get target="_blank".
       *
       * Removing it here rather than narrowing the transform keeps the
       * fallback intact: if this pass ever regresses, external links still
       * leave the sanitiser hardened.
       */
      anchor.removeAttribute('rel')
      anchor.removeAttribute('target')
      continue
    }

    anchor.setAttribute('target', '_blank')

    // An affiliate or sponsored link must be disclosed to crawlers, or the
    // site is passing paid link equity — a manual-action risk.
    const rel = anchor.hasAttribute('data-affiliate')
      ? 'noopener noreferrer sponsored nofollow'
      : 'noopener noreferrer'
    anchor.setAttribute('rel', rel)
  }

  // ── Images: never let a late-loading body image shift the article ───────
  for (const img of root.querySelectorAll('img')) {
    if (!img.getAttribute('loading')) img.setAttribute('loading', 'lazy')
    if (!img.getAttribute('decoding')) img.setAttribute('decoding', 'async')
  }

  return {
    html: root.toString(),
    toc,
    hasCode: root.querySelectorAll('pre').length > 0,
  }
}

/**
 * Plain text for TTS and word counts, with code blocks removed.
 *
 * Reading a code block aloud is unusable, so Phase 6 feeds this to the TTS
 * engine rather than the full body.
 */
export function toSpeechText(rawHtml: string | null | undefined): string {
  if (!rawHtml) return ''
  const root = parse(sanitizeHtml(rawHtml, SANITIZE_OPTIONS))
  for (const block of root.querySelectorAll('pre, code, table')) block.remove()
  return root.textContent.replace(/\s+/g, ' ').trim()
}
