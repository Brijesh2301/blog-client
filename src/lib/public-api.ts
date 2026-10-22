/**
 * ═════════════════════════════════════════════════════════════════════════════
 * PUBLIC BROWSER API CLIENT
 * ═════════════════════════════════════════════════════════════════════════════
 * For the handful of things a READER does rather than reads: posting a comment,
 * toggling a like or bookmark, subscribing, fetching the Listen payload.
 *
 * Separate from lib/api.ts because the constraints are opposite. lib/api.ts is
 * cached and runs on the server so article text lands in the prerendered HTML.
 * Nothing here may ever be cached or server-rendered — these are per-reader
 * mutations, and a cached POST response or a user-specific reaction state baked
 * into a shared HTML page would be a correctness bug and a privacy leak.
 *
 * Deliberately NOT routed through a Next route handler. The Express API is the
 * single place where validation, rate limiting and moderation live; proxying
 * through Next would add a hop that can only lose information (the real status
 * code, the field-level validation errors) without adding a check.
 */

import type { PostCard } from '@/types/content'

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1'
).replace(/\/$/, '')

export class PublicApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
    this.name = 'PublicApiError'
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    // Reactions and auto-approved comments need the reader's session.
    credentials: 'include',
    cache: 'no-store',
    signal: options.signal,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })

  const payload: unknown = await res.json().catch(() => null)

  if (!res.ok) {
    // Surface the API's own message: it is the one that says *which* field is
    // wrong, which is the difference between a usable form and a dead end.
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : `Request failed with ${res.status}`
    throw new PublicApiError(res.status, message)
  }

  return payload as T
}

// ── Comments ────────────────────────────────────────────────────────────────

export type PostCommentInput = {
  body: string
  parentId?: string
  guestName?: string
  guestEmail?: string
  /** Honeypot. Always empty for a real reader. */
  website?: string
  elapsedMs?: number
}

export function postComment(slug: string, input: PostCommentInput) {
  return request<{ status: 'approved' | 'pending'; message: string }>(
    `/posts/${encodeURIComponent(slug)}/comments`,
    { method: 'POST', body: input }
  )
}

// ── Reactions ───────────────────────────────────────────────────────────────

export type ReactionType = 'like' | 'bookmark'

export function getMyReactions(slug: string, signal?: AbortSignal) {
  return request<{ liked: boolean; bookmarked: boolean }>(
    `/posts/${encodeURIComponent(slug)}/reactions`,
    { signal }
  )
}

export function toggleReaction(slug: string, type: ReactionType) {
  return request<{ active: boolean; likeCount: number }>(
    `/posts/${encodeURIComponent(slug)}/reactions`,
    { method: 'POST', body: { type } }
  )
}

// ── Newsletter ──────────────────────────────────────────────────────────────

export function subscribe(input: {
  email: string
  source?: string
  company?: string
  elapsedMs?: number
}) {
  return request<{ status: 'pending_confirmation' }>('/newsletter/subscribe', {
    method: 'POST',
    body: input,
  })
}

export function confirmSubscription(token: string) {
  return request<{ status: 'confirmed'; email: string }>(
    `/newsletter/confirm?token=${encodeURIComponent(token)}`
  )
}

export function unsubscribe(email: string) {
  return request<{ status: 'unsubscribed' }>('/newsletter/unsubscribe', {
    method: 'POST',
    body: { email },
  })
}

// ── Listen ──────────────────────────────────────────────────────────────────

export type SpeechPayload = {
  /** A pre-generated MP3 when the premium tier produced one, else null. */
  audioUrl: string | null
  /** The text the browser reads when there is no MP3. */
  text: string
  estimatedSeconds: number
}

/**
 * Fetched on demand, when the reader presses Listen.
 *
 * Not embedded in the page: the speech text is the whole article again, and
 * doubling every article's HTML to pre-arm a feature most readers never use
 * would be a straight LCP regression.
 */
export function getSpeechPayload(slug: string, signal?: AbortSignal) {
  return request<SpeechPayload>(`/posts/${encodeURIComponent(slug)}/audio`, {
    signal,
  })
}

// ── Session ─────────────────────────────────────────────────────────────────

export type PublicUser = { id: string; name: string; role: string }

/**
 * Who, if anyone, is signed in.
 *
 * Resolved in the BROWSER, never on the server during render. Reading the auth
 * cookie in a Server Component would make the article page dynamic and knock
 * the whole thing out of the prerender — one personalised byline is not worth
 * losing static HTML for every reader and every crawler.
 *
 * Returns null rather than throwing on 401, because "signed out" is the normal
 * case for a public blog.
 */
export async function getSession(signal?: AbortSignal): Promise<PublicUser | null> {
  try {
    const data = await request<{ user: PublicUser }>('/auth/me', { signal })
    return data.user
  } catch {
    return null
  }
}

// ── Saved articles ──────────────────────────────────────────────────────────

/**
 * The signed-in reader's saved articles.
 *
 * Same card shape as every public listing, plus `savedAt`, so the normal
 * PostCard renders them with no special case.
 */
export function getBookmarks(signal?: AbortSignal) {
  return request<{ bookmarks: (PostCard & { savedAt: string })[] }>('/me/bookmarks', {
    signal,
  })
}
