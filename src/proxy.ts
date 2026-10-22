import { NextResponse, type NextRequest } from 'next/server'

import { DEFAULT_LOCALE, isLocale, splitLocale } from '@/i18n/config'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PROXY (formerly middleware.ts)
 * ─────────────────────────────────────────────────────────────────────────────
 * Next 16 renamed the `middleware` convention to `proxy`. The runtime is always
 * nodejs and cannot be configured.
 *
 * Responsibilities, in order:
 *  1. Canonical host — one hostname serves the site.
 *  2. Redirects and 410s — a real 301/410 before rendering starts.
 *  3. Existence check — a real 404 for content that does not exist.
 *  4. X-Robots-Tag — defence in depth on never-index routes.
 *
 * ── Why 2 and 3 live here ───────────────────────────────────────────────────
 * Under Cache Components a page flushes its static shell with a 200 BEFORE the
 * dynamic part runs, so a `redirect()` or `notFound()` reached after that point
 * cannot change the status line. Next documents this and compensates for the
 * 404 case by injecting `noindex` — but a 200 where a 301 belongs still loses
 * the ranking signal, and a soft 404 still wastes crawl budget.
 *
 * The proxy runs before rendering, so it is the only place that can set the
 * right status. Both lookups are served from an in-memory cache refreshed once
 * a minute, so the common path costs no extra network call at all.
 */

const CANONICAL_HOST = process.env.CANONICAL_HOST

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1'
).replace(/\/$/, '')

/**
 * Route trees that are NOT under `[locale]` and must never be rewritten into
 * it.
 *
 * `/api/og` became `/en/api/og` and 404ed the moment locale rewriting landed,
 * taking every Open Graph image and the revalidation webhook with it — a
 * failure that is invisible on the site itself and only shows up when
 * something tries to share a link or publish a post.
 *
 * The admin is here for the same reason: it has its own root layout outside
 * `(public)`, so `/en/admin` is not a route.
 */
const NON_LOCALISED = ['/api', '/admin']

/** Mirrors NOINDEX_PATHS in lib/seo.ts and the disallow list in robots.ts. */
const NOINDEX_PREFIXES = [
  '/admin',
  '/api',
  '/search',
  '/login',
  '/register',
  '/reset-password',
  '/verify-email',
  '/account',
  '/design-system',
  '/preview',
]

/**
 * Content URL shapes, mapped to the manifest key that lists their valid slugs.
 * Anything not listed here skips both the redirect and existence lookups.
 */
const CONTENT_ROUTES: { prefix: string; key: ManifestKey }[] = [
  { prefix: '/blog/', key: 'posts' },
  { prefix: '/category/', key: 'categories' },
  { prefix: '/tag/', key: 'tags' },
  { prefix: '/author/', key: 'authors' },
  { prefix: '/series/', key: 'series' },
]

/**
 * Every valid SINGLE-SEGMENT path on the site.
 *
 * `/[page]` renders the twelve static pages, and a dynamic segment matches
 * anything — so `/not-a-real-page` reaches it, finds no page and calls
 * `notFound()`. Under Cache Components that is a SOFT 404: the prerendered
 * shell has already been streamed with a 200 by the time the dynamic part
 * resolves, so `notFound()` renders the right page with the wrong status.
 *
 * `dynamicParams = false` would normally fix this at the routing layer, but
 * Cache Components rejects route segment config. So the check moves here,
 * exactly as it already does for post and category slugs below.
 *
 * Only single-segment paths are checked. Anything deeper either starts with a
 * known content prefix or belongs to a nested route, and 404ing a path this
 * list simply forgot would be far worse than a soft 404.
 */
const KNOWN_TOP_LEVEL = new Set([
  // Route files.
  'blog',
  'topics',
  'series',
  'authors',
  'search',
  'login',
  'saved',
  'design-system',
  // The static page set, which must stay in step with content/pages.ts.
  'about',
  'contact',
  'resources',
  'advertise',
  'newsletter',
  'editorial-policy',
  'privacy-policy',
  'terms',
  'cookie-policy',
  'affiliate-disclosure',
  'disclaimer',
  'dmca',
])

type ManifestKey = 'posts' | 'categories' | 'tags' | 'authors' | 'series'
type RedirectRow = { from: string; to: string; statusCode: number }

type Snapshot = {
  redirects: Map<string, RedirectRow>
  slugs: Record<ManifestKey, Set<string>>
}

const TTL_MS = 60_000
const MAX_ROWS = 20_000

let snapshot: Snapshot | null = null
let fetchedAt = 0
let inflight: Promise<Snapshot> | null = null

function emptySnapshot(): Snapshot {
  return {
    redirects: new Map(),
    slugs: {
      posts: new Set(),
      categories: new Set(),
      tags: new Set(),
      authors: new Set(),
      series: new Set(),
    },
  }
}

/**
 * Fetches the redirect table and slug manifest together, once per TTL.
 *
 * Concurrent requests during a refresh share one in-flight promise, so a burst
 * of traffic after expiry produces a single upstream request rather than one
 * per connection.
 */
async function getSnapshot(): Promise<Snapshot> {
  const now = Date.now()
  if (snapshot && now - fetchedAt < TTL_MS) return snapshot
  if (inflight) return inflight

  inflight = (async () => {
    try {
      const [redirectRes, slugRes] = await Promise.all([
        fetch(`${API_URL}/redirects/resolve-all`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        }),
        fetch(`${API_URL}/slugs`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        }),
      ])

      if (!redirectRes.ok || !slugRes.ok) throw new Error('manifest fetch failed')

      const redirectBody = (await redirectRes.json()) as { redirects?: RedirectRow[] }
      const slugBody = (await slugRes.json()) as Partial<Record<ManifestKey, string[]>>

      const next = emptySnapshot()
      for (const row of (redirectBody.redirects ?? []).slice(0, MAX_ROWS)) {
        next.redirects.set(row.from, row)
      }
      for (const key of Object.keys(next.slugs) as ManifestKey[]) {
        next.slugs[key] = new Set((slugBody[key] ?? []).slice(0, MAX_ROWS))
      }

      snapshot = next
      fetchedAt = Date.now()
      return next
    } catch {
      // The API being unreachable must never take the site down. Keep the
      // previous snapshot if we have one; otherwise fall back to empty, which
      // disables both checks and lets every page render as it would have.
      snapshot ??= emptySnapshot()
      fetchedAt = Date.now()
      return snapshot
    } finally {
      inflight = null
    }
  })()

  return inflight
}

/**
 * Second-chance check for a slug missing from the cached manifest.
 *
 * Without this, a post published seconds ago would 404 until the cache expired.
 * It costs one request, and only on a miss — so valid content never pays for
 * it, and the cost is bounded to genuine 404s plus a one-minute window after
 * each publish.
 */
async function existsUpstream(key: ManifestKey, slug: string): Promise<boolean> {
  const path =
    key === 'posts'
      ? `/posts/${encodeURIComponent(slug)}`
      : key === 'categories'
        ? `/categories/${encodeURIComponent(slug)}`
        : key === 'tags'
          ? `/tags/${encodeURIComponent(slug)}`
          : key === 'series'
            ? `/series/${encodeURIComponent(slug)}`
            : null

  // Authors come only from the manifest: the API has no single-author route.
  if (!path) return false

  try {
    const res = await fetch(`${API_URL}${path}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    return res.ok
  } catch {
    // Unreachable API: assume it exists rather than 404ing real content.
    return true
  }
}

/** One leading slash, no trailing slash, lower-cased. Matches the API. */
function normalisePath(pathname: string): string {
  const lower = pathname.trim().toLowerCase()
  if (!lower || lower === '/') return '/'
  return lower.replace(/\/+$/, '') || '/'
}

export async function proxy(request: NextRequest) {
  const { nextUrl } = request
  const host = request.headers.get('host') ?? ''
  const rawPath = nextUrl.pathname

  /*
   * ── 0. Locale ───────────────────────────────────────────────────────────
   * The URL strategy is "English unprefixed, Hindi at /hi" — see
   * i18n/config.ts for why. The ROUTE tree is always `[locale]/...`, so an
   * unprefixed path has to be rewritten to `/en/...` internally.
   *
   * Everything downstream then works on `pathname` with the locale REMOVED,
   * so the redirect table, the slug manifest and the 404 check all stay
   * language-agnostic: one `/blog/a-post` entry covers both languages instead
   * of needing a duplicate row per locale.
   */
  const { locale, path: pathname } = splitLocale(rawPath)

  // `/en/...` is never a valid public URL — English lives at the root. Redirect
  // rather than serve it, or the same page exists at two addresses.
  const firstSegment = rawPath.split('/').filter(Boolean)[0]
  if (firstSegment === DEFAULT_LOCALE) {
    const url = new URL(nextUrl.toString())
    url.pathname = pathname
    return NextResponse.redirect(url, 308)
  }

  // ── 1. Canonical host + protocol ────────────────────────────────────────
  if (CANONICAL_HOST && host && host !== CANONICAL_HOST) {
    // Only redirect hosts that are this site under another spelling. A preview
    // URL or a domain mid-migration is left alone.
    const bare = host.replace(/^www\./, '').split(':')[0]
    const canonicalBare = CANONICAL_HOST.replace(/^www\./, '')

    if (bare === canonicalBare) {
      const url = new URL(nextUrl.toString())
      url.host = CANONICAL_HOST
      url.protocol = 'https:'
      url.port = ''
      return NextResponse.redirect(url, 308)
    }
  }

  const route = CONTENT_ROUTES.find((entry) => pathname.startsWith(entry.prefix))

  if (route) {
    const normalised = normalisePath(pathname)
    const { redirects, slugs } = await getSnapshot()

    // ── 2. Redirects and 410s ─────────────────────────────────────────────
    const hit = redirects.get(normalised)
    if (hit) {
      if (hit.statusCode === 410) {
        // 410 Gone, not 404: it tells Google the removal was intentional and
        // drops the URL from the index faster.
        return new NextResponse(null, {
          status: 410,
          headers: { 'X-Robots-Tag': 'noindex' },
        })
      }
      if (hit.to !== normalised) {
        const url = new URL(nextUrl.toString())
        url.pathname = hit.to
        return NextResponse.redirect(url, hit.statusCode === 302 ? 302 : 301)
      }
    }

    // ── 3. Existence check ────────────────────────────────────────────────
    const slug = normalised.slice(route.prefix.length)
    const known = slugs[route.key]

    // An empty manifest means the API was unreachable: skip the check rather
    // than 404 the entire site.
    if (slug && known.size > 0 && !known.has(slug)) {
      const exists = await existsUpstream(route.key, slug)
      if (!exists) {
        // Rewrite to the same URL with a 404 status: the app still renders the
        // styled not-found page, but the response carries the correct code
        // instead of a soft 404.
        return NextResponse.rewrite(nextUrl, {
          status: 404,
          headers: { 'X-Robots-Tag': 'noindex' },
        })
      }
    }
  }

  /*
   * ── 3b. Unknown single-segment paths ───────────────────────────────────
   * Same treatment as an unknown post slug: rewrite to the same URL with a
   * 404 status, so the styled not-found page still renders but the response
   * carries the right code. A soft 404 keeps the URL in the index and burns
   * crawl budget re-fetching it.
   */
  const segments = pathname.split('/').filter(Boolean)
  if (
    segments.length === 1 &&
    !KNOWN_TOP_LEVEL.has(segments[0]!) &&
    // Anything with a dot is a file (feeds, manifests, well-known files).
    !segments[0]!.includes('.') &&
    /*
     * Never 404 a path this file already knows about for another reason.
     *
     * `/admin` is a single segment, and leaving it out of the allowlist took
     * the entire admin offline — the deeper routes still worked, so it was
     * invisible until a gate hit the root. Deriving the exclusion from
     * NOINDEX_PREFIXES rather than re-typing those paths means the two lists
     * cannot disagree again.
     */
    !NOINDEX_PREFIXES.some((prefix) => prefix === `/${segments[0]}`)
  ) {
    return NextResponse.rewrite(nextUrl, {
      status: 404,
      headers: { 'X-Robots-Tag': 'noindex' },
    })
  }

  // ── 4. Rewrite into the locale segment ──────────────────────────────────
  /*
   * The route tree is `app/(site)/[locale]/...`, so EVERY request has to carry
   * a locale segment internally — including the unprefixed English ones the
   * reader actually sees. Rewriting (not redirecting) keeps the URL in the
   * address bar exactly as it was.
   *
   * Hindi paths already have their prefix and are passed through untouched.
   */
  const target = new URL(nextUrl.toString())
  if (!isLocale(firstSegment) && !NON_LOCALISED.some((p) => pathname.startsWith(p))) {
    target.pathname = `/${DEFAULT_LOCALE}${pathname === '/' ? '' : pathname}`
  }

  const response = NextResponse.rewrite(target)

  if (NOINDEX_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
  }

  // Lets a Server Component read the active locale without re-parsing the URL.
  response.headers.set('x-locale', locale)

  return response
}

export const config = {
  /**
   * Skip everything that is not a page request. Running the proxy on static
   * assets, image optimisation and metadata routes would add latency to every
   * byte the site serves for no benefit.
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon|robots.txt|manifest.webmanifest|brand/|sitemap|rss.xml|atom.xml|podcast.xml|ads.txt).*)',
  ],
}
