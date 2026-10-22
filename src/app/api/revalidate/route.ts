import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'

import { tags } from '@/lib/api'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * ON-DEMAND REVALIDATION — POST /api/revalidate
 * ═════════════════════════════════════════════════════════════════════════════
 * Called by the API whenever content changes, so a published post appears
 * immediately instead of waiting for its `cacheLife` to expire.
 *
 * Without this, `cacheLife('days')` on an article would mean an edit could sit
 * invisible for a day. With it, the cacheLife becomes a safety net for the
 * case where this webhook fails rather than the primary freshness mechanism.
 *
 * Note for Next 16: `revalidateTag` now takes a cacheLife profile as its
 * second argument. `'max'` means "serve stale while revalidating", which is
 * the right trade for content — readers never wait on a regeneration.
 */

const SECRET = process.env.REVALIDATE_SECRET

type Body = {
  /** Which entity changed, so only the affected tags are invalidated. */
  type?: 'post' | 'comments' | 'category' | 'tag' | 'author' | 'series' | 'all'
  slug?: string
}

/**
 * Constant-time secret comparison.
 *
 * A plain `===` leaks the shared secret one character at a time to an attacker
 * who can measure response timing — the same reasoning that applies to
 * password and token checks.
 */
function secretMatches(provided: string | null): boolean {
  if (!SECRET || !provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(SECRET)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  if (!SECRET) {
    // Refuse rather than allowing unauthenticated cache purges, which would
    // be a cheap denial-of-service against our own origin.
    return NextResponse.json(
      { error: 'Revalidation is not configured.' },
      { status: 503 }
    )
  }

  const provided =
    request.headers.get('x-revalidate-secret') ??
    new URL(request.url).searchParams.get('secret')

  if (!secretMatches(provided)) {
    return NextResponse.json({ error: 'Invalid secret.' }, { status: 401 })
  }

  let body: Body = {}
  try {
    body = (await request.json()) as Body
  } catch {
    // An empty body is valid and means "revalidate everything".
  }

  const purged: string[] = []
  const purge = (tag: string) => {
    revalidateTag(tag, 'max')
    purged.push(tag)
  }

  switch (body.type) {
    case 'post':
      // The post itself AND every listing it appears in.
      if (body.slug) purge(tags.post(body.slug))
      purge(tags.posts)
      break
    case 'comments':
      /*
       * A new comment changes the thread and the post's comment count, but
       * not any listing — so this purges two tags rather than every listing
       * on the site. Comment volume is far higher than publish volume, and
       * purging `posts` on every approved comment would keep the whole
       * archive permanently cold.
       */
      if (body.slug) {
        purge(tags.comments(body.slug))
        purge(tags.post(body.slug))
      }
      break
    case 'category':
      if (body.slug) purge(tags.category(body.slug))
      purge(tags.categories)
      purge(tags.posts)
      break
    case 'tag':
      if (body.slug) purge(tags.tag(body.slug))
      purge(tags.tags)
      break
    case 'author':
      if (body.slug) purge(tags.author(body.slug))
      purge(tags.authors)
      break
    case 'series':
      purge(tags.series)
      purge(tags.posts)
      break
    default:
      for (const tag of [
        tags.posts,
        tags.categories,
        tags.tags,
        tags.authors,
        tags.series,
      ]) {
        purge(tag)
      }
  }

  return NextResponse.json({ revalidated: purged, at: new Date().toISOString() })
}

/** GET is never valid here; say so rather than 404ing. */
export function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 })
}
