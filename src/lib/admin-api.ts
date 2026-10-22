import type { SeoReport } from '@/types/admin'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * ADMIN API CLIENT
 * ═════════════════════════════════════════════════════════════════════════════
 * Deliberately NOT cached, unlike lib/api.ts.
 *
 * Admin reads must reflect the database as it is right now: a dashboard
 * showing a cached draft count, or an editor loading a stale body over
 * someone else's edit, is worse than useless. Every call here is
 * `cache: 'no-store'` and `credentials: 'include'` so the httpOnly auth
 * cookies travel with it.
 */

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1'
).replace(/\/$/, '')

export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown
  ) {
    super(message)
    this.name = 'AdminApiError'
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
  signal?: AbortSignal
}

export async function adminRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    cache: 'no-store',
    signal: options.signal,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })

  if (res.status === 204) return undefined as T

  const payload: unknown = await res.json().catch(() => null)

  if (!res.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : `Request failed with ${res.status}`
    throw new AdminApiError(res.status, message, payload)
  }

  return payload as T
}

/** Scores an unsaved draft. The editor calls this as the writer types. */
export function scoreDraft(
  draft: Record<string, unknown>,
  signal?: AbortSignal
): Promise<SeoReport> {
  return adminRequest<SeoReport>('/admin/seo-score', {
    method: 'POST',
    body: draft,
    signal,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Media
// ─────────────────────────────────────────────────────────────────────────────

export type MediaItem = {
  id: string
  url: string
  thumbUrl: string
  width: number
  height: number
  format: string | null
  bytes: number | null
  alt: string | null
}

/**
 * Uploads one image.
 *
 * Deliberately does NOT go through `adminRequest`: that sets
 * `Content-Type: application/json`, and a multipart upload must let the browser
 * set its own `Content-Type` so it can include the MIME boundary. Setting it
 * by hand produces a body the server cannot parse, and the error it returns
 * ("Unexpected end of form") points nowhere near the cause.
 *
 * The server converts whatever arrives to WebP before storing it, so the
 * response describes the CONVERTED file — its width, height and byte size are
 * the ones that will actually be served.
 */
export async function uploadMedia(file: File, alt?: string): Promise<MediaItem> {
  const form = new FormData()
  form.append('file', file)
  if (alt) form.append('alt', alt)

  const res = await fetch(`${API_URL}/admin/media`, {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    body: form,
  })

  const payload: unknown = await res.json().catch(() => null)

  if (!res.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : `Upload failed with ${res.status}`
    throw new AdminApiError(res.status, message, payload)
  }

  return (payload as { media: MediaItem }).media
}
