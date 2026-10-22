/**
 * Search-param coercion.
 *
 * Shared so every archive clamps the same way. User-supplied query strings
 * reach the API, so `?page=-5`, `?page=1e9` and `?page=abc` must all be
 * normalised here rather than trusted downstream.
 */

export function toPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number.parseInt(raw ?? '1', 10)
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 10_000) : 1
}

export function toSort(
  value: string | string[] | undefined
): 'newest' | 'oldest' | 'popular' {
  const raw = Array.isArray(value) ? value[0] : value
  return raw === 'oldest' || raw === 'popular' ? raw : 'newest'
}

export function toSearchTerm(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value
  return (raw ?? '').trim().slice(0, 200)
}
