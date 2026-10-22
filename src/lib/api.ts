import { cacheLife, cacheTag } from 'next/cache'

import type {
  Author,
  Category,
  CommentThread,
  Paginated,
  PostCard,
  PostDetail,
  PostQuery,
  PostTranslation,
  Series,
  Tag,
} from '@/types/content'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * API CLIENT
 * ═════════════════════════════════════════════════════════════════════════════
 * Every read is wrapped in `use cache` with an explicit `cacheLife` and
 * `cacheTag`. That combination is what gives the SSG/ISR behaviour the SEO
 * plan needs under Cache Components:
 *
 *  - the result is baked into the prerendered shell, so the full article text
 *    is in the initial HTML with no client fetch;
 *  - `cacheLife` bounds how stale it can get;
 *  - `cacheTag` lets the API invalidate exactly the affected pages on publish
 *    (Phase 5 wires the webhook that calls `revalidateTag`).
 *
 * Note on Next 16: `revalidateTag(tag)` now requires a cacheLife profile as a
 * second argument — `revalidateTag('posts', 'max')`.
 */

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1'
).replace(/\/$/, '')

/** Cache tags. Centralised so the revalidation webhook cannot typo one. */
export const tags = {
  posts: 'posts',
  post: (slug: string) => `post:${slug}`,
  categories: 'categories',
  category: (slug: string) => `category:${slug}`,
  tags: 'tags',
  tag: (slug: string) => `tag:${slug}`,
  authors: 'authors',
  author: (slug: string) => `author:${slug}`,
  series: 'series',
  comments: (slug: string) => `comments:${slug}`,
} as const

class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Thin fetch wrapper.
 *
 * A 404 returns null rather than throwing, because "this post does not exist"
 * is a normal outcome that pages handle with `notFound()`. Anything else
 * throws, so a genuinely broken API surfaces as an error boundary instead of
 * silently rendering an empty page — which would get indexed as thin content.
 */
async function request<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Accept: 'application/json' },
  })

  if (res.status === 404) return null
  if (!res.ok) {
    throw new ApiError(res.status, `GET ${path} failed with ${res.status}`)
  }

  return (await res.json()) as T
}

function toQueryString(query: Record<string, unknown>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

// ─────────────────────────────────────────────────────────────────────────────
// Posts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Post listings.
 *
 * `hours` rather than `max`: a listing changes whenever anything publishes, and
 * the on-publish webhook may not fire (a failed deploy, a network blip), so a
 * bounded lifetime is the safety net.
 */
export async function getPosts(query: PostQuery = {}): Promise<Paginated<PostCard>> {
  'use cache'
  cacheLife('hours')
  cacheTag(tags.posts)

  const data = await request<Paginated<PostCard>>(`/posts${toQueryString(query)}`)
  return data ?? emptyPage(query)
}

/** A single article. Tagged per-slug so publishing one post invalidates one page. */
/**
 * A single article, in a specific language.
 *
 * The locale is part of the LOOKUP and part of the CACHE TAG. Slugs are
 * unique per (slug, locale), so a request without one resolves to whichever
 * row the database reaches first — and a cache key without one would serve
 * the English article from a Hindi URL after the first warm hit.
 */
export async function getPost(
  slug: string,
  locale = 'en'
): Promise<{ post: PostDetail; translations: PostTranslation[] } | null> {
  'use cache'
  cacheLife('days')
  cacheTag(tags.post(slug), tags.posts)

  const data = await request<{ post: PostDetail; translations: PostTranslation[] }>(
    `/posts/${encodeURIComponent(slug)}?locale=${locale}`
  )
  return data ? { post: data.post, translations: data.translations ?? [] } : null
}

/**
 * Related posts, ranked by the API.
 *
 * The blend — shared tags, same category, same series, popularity — is scored
 * in one SQL query server-side rather than assembled here from several
 * listings. Doing it in the API means the ranking is identical everywhere it
 * appears and costs one request instead of three.
 *
 * These links are the site's internal crawl graph, so the endpoint always
 * returns something: a post with no tags and no category still gets recent
 * articles rather than an empty section that strands it.
 */
export async function getRelatedPosts(
  post: Pick<PostDetail, 'slug'>,
  limit = 3
): Promise<PostCard[]> {
  'use cache'
  cacheLife('hours')
  cacheTag(tags.post(post.slug), tags.posts)

  const data = await request<{ items: PostCard[] }>(
    `/posts/${encodeURIComponent(post.slug)}/related${toQueryString({ limit })}`
  )

  return data?.items ?? []
}

/**
 * The approved comment thread for a post.
 *
 * Cached and server-rendered, which is the whole point: the thread is in the
 * initial HTML, so it is crawlable and readable with JavaScript disabled.
 *
 * `hours`, NOT `minutes` — and this is a load-bearing choice.
 *
 * Under Cache Components the shortest lifetime anywhere in a page's tree sets
 * the lifetime of the whole prerender. `minutes` here quietly dragged every
 * article page down from a one-day revalidate to a one-minute one: the thread
 * was fresher, and the article it hangs off regenerated sixty times as often
 * for no reason.
 *
 * Freshness does not come from the lifetime anyway. Posting or approving a
 * comment calls `revalidateTag` on this exact tag (see the API's
 * `publishThreadChange`), so an approved comment appears within seconds. The
 * lifetime is purely the fallback for a webhook that failed to fire.
 *
 * A failure returns an empty, closed thread rather than throwing. A comment
 * API outage must not take down the article it is attached to.
 */
export async function getComments(slug: string): Promise<CommentThread> {
  'use cache'
  cacheLife('hours')
  cacheTag(tags.comments(slug), tags.post(slug))

  try {
    const data = await request<CommentThread>(
      `/posts/${encodeURIComponent(slug)}/comments`
    )
    return data ?? { comments: [], allowComments: false }
  } catch {
    return { comments: [], allowComments: false }
  }
}

/**
 * Every published slug, for `generateStaticParams`.
 *
 * Paginates rather than asking for everything at once: the API caps `limit` at
 * 100, and an uncapped request would be a denial-of-service vector against our
 * own build. The cap here stops a very large archive from making builds
 * unbounded — posts beyond it still render on demand via ISR, they simply are
 * not prerendered at build time.
 */
export async function getAllPostSlugs(
  max = 1000
): Promise<{ slug: string; locale: string }[]> {
  'use cache'
  cacheLife('hours')
  cacheTag(tags.posts)

  const entries: { slug: string; locale: string }[] = []
  let page = 1

  while (entries.length < max) {
    const data = await request<Paginated<PostCard>>(
      `/posts${toQueryString({ page, limit: 100 })}`
    )
    if (!data || data.items.length === 0) break

    entries.push(...data.items.map((item) => ({ slug: item.slug, locale: item.locale })))
    if (!data.pagination.hasNext) break
    page++
  }

  return entries.slice(0, max)
}

// ─────────────────────────────────────────────────────────────────────────────
// Taxonomy
// ─────────────────────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  'use cache'
  cacheLife('days')
  cacheTag(tags.categories)

  const data = await request<{ categories: Category[] }>('/categories')
  return data?.categories ?? []
}

export async function getCategory(slug: string): Promise<Category | null> {
  'use cache'
  cacheLife('days')
  cacheTag(tags.category(slug), tags.categories)

  const data = await request<{ category: Category }>(
    `/categories/${encodeURIComponent(slug)}`
  )
  return data?.category ?? null
}

export async function getTags(): Promise<Tag[]> {
  'use cache'
  cacheLife('days')
  cacheTag(tags.tags)

  const data = await request<{ tags: Tag[] }>('/tags')
  return data?.tags ?? []
}

export async function getTag(slug: string): Promise<Tag | null> {
  'use cache'
  cacheLife('days')
  cacheTag(tags.tag(slug), tags.tags)

  const data = await request<{ tag: Tag }>(`/tags/${encodeURIComponent(slug)}`)
  return data?.tag ?? null
}

export async function getAuthors(): Promise<Author[]> {
  'use cache'
  cacheLife('days')
  cacheTag(tags.authors)

  const data = await request<{ authors: Author[] }>('/authors')
  return data?.authors ?? []
}

export async function getAuthor(slug: string): Promise<Author | null> {
  'use cache'
  cacheLife('days')
  cacheTag(tags.author(slug), tags.authors)

  const authors = await getAuthors()
  return authors.find((author) => author.slug === slug) ?? null
}

export async function getAllSeries(): Promise<Series[]> {
  'use cache'
  cacheLife('days')
  cacheTag(tags.series)

  const data = await request<{ series: Series[] }>('/series')
  return data?.series ?? []
}

export async function getSeries(
  slug: string
): Promise<{ series: Series; posts: PostCard[] } | null> {
  'use cache'
  cacheLife('days')
  cacheTag(tags.series)

  const data = await request<{ series: Series; posts: PostCard[] }>(
    `/series/${encodeURIComponent(slug)}`
  )
  return data ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// Redirects
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deliberately NOT cached.
 *
 * This runs on the 404 path, where correctness beats speed: a stale answer
 * would 404 a URL that was just redirected, or redirect one that was just
 * restored. It is also only reached for URLs that already missed.
 */
export async function resolveRedirect(
  path: string
): Promise<{ to: string; statusCode: number } | null> {
  try {
    const res = await fetch(
      `${API_URL}/redirects/resolve?path=${encodeURIComponent(path)}`,
      { cache: 'no-store', headers: { Accept: 'application/json' } }
    )
    if (!res.ok) return null
    return (await res.json()) as { to: string; statusCode: number }
  } catch {
    // The API being down must not turn a 404 into a 500.
    return null
  }
}

function emptyPage<T>(query: PostQuery): Paginated<T> {
  const limit = query.limit ?? 12
  return {
    items: [],
    pagination: {
      page: query.page ?? 1,
      limit,
      total: 0,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  }
}

export { ApiError }
