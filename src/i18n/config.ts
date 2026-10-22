/**
 * ═════════════════════════════════════════════════════════════════════════════
 * LOCALES
 * ═════════════════════════════════════════════════════════════════════════════
 * English and Hindi, with English as the default.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY LANGUAGE LIVES IN THE URL
 * ─────────────────────────────────────────────────────────────────────────────
 * The obvious implementation is a toggle that writes a cookie and re-renders.
 * It is also the one Google explicitly warns against, and it would undo the
 * whole point of this codebase:
 *
 *  - A crawler has no cookie. It would only ever see one language, so the
 *    other would never be indexed at all.
 *  - There would be no URL to put in `hreflang`, no URL to link to, and no URL
 *    for a reader to share. "Read this in Hindi" would not be a link.
 *  - The same URL would serve different content to different people, which is
 *    cloaking as far as a crawler is concerned.
 *
 * So each language is a real URL, and the two are cross-linked with
 * `hreflang` so Google knows they are translations rather than duplicates.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY ENGLISH HAS NO PREFIX
 * ─────────────────────────────────────────────────────────────────────────────
 * `/blog/a-post` stays exactly where it is; Hindi lives at `/hi/blog/a-post`.
 *
 * Prefixing both would mean `/blog/a-post` → `/en/blog/a-post`, a 301 on every
 * URL the site has ever published. Redirects leak a little ranking signal and,
 * more importantly, invalidate every existing link and sitemap entry for a
 * purely cosmetic gain.
 *
 * The cost is that the routing has to add the prefix internally — the proxy
 * rewrites an unprefixed path to `/en/...` so there is exactly one route tree.
 * That complexity is paid once, in `proxy.ts`, rather than by every URL.
 */

export const LOCALES = ['en', 'hi'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

/** Everything a page needs to describe a language to a browser or a crawler. */
export const LOCALE_META: Record<
  Locale,
  {
    /** Native name — a language picker must be readable to the speaker. */
    label: string
    /** English name, for aria-labels aimed at the current UI language. */
    englishLabel: string
    /** BCP 47, for `<html lang>` and `hreflang`. */
    bcp47: string
    /** Open Graph locale. */
    ogLocale: string
    dir: 'ltr' | 'rtl'
  }
> = {
  en: {
    label: 'English',
    englishLabel: 'English',
    bcp47: 'en',
    ogLocale: 'en_US',
    dir: 'ltr',
  },
  hi: {
    // Devanagari, not "Hindi". Someone who reads only Hindi cannot find
    // their language in a list written in English.
    label: 'हिन्दी',
    englishLabel: 'Hindi',
    bcp47: 'hi',
    ogLocale: 'hi_IN',
    dir: 'ltr',
  },
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/**
 * Prefixes a site-root-relative path with a locale.
 *
 * The default locale gets no prefix, which is the whole URL strategy above.
 * Everything that builds a link must go through this — a hardcoded `/blog`
 * inside a Hindi page silently sends the reader back to English.
 */
export function localePath(path: string, locale: Locale): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  if (locale === DEFAULT_LOCALE) return clean
  // `/` must become `/hi`, not `/hi/`.
  return clean === '/' ? `/${locale}` : `/${locale}${clean}`
}

/**
 * Splits a pathname into its locale and the rest.
 *
 * Returns the DEFAULT locale for an unprefixed path, so callers never have to
 * special-case "no prefix means English".
 */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const segments = pathname.split('/').filter(Boolean)
  const first = segments[0]

  if (isLocale(first) && first !== DEFAULT_LOCALE) {
    const rest = `/${segments.slice(1).join('/')}`
    return { locale: first, path: rest === '/' ? '/' : rest.replace(/\/$/, '') }
  }

  return { locale: DEFAULT_LOCALE, path: pathname === '' ? '/' : pathname }
}

/**
 * Picks a locale from an `Accept-Language` header.
 *
 * Used ONLY to suggest, never to redirect automatically. Auto-redirecting on
 * Accept-Language is a well-known way to make a site unusable: a Hindi speaker
 * who deliberately opens the English URL gets bounced to Hindi every time, and
 * Googlebot — which crawls from the US with no language preference — would
 * only ever reach one version.
 */
export function preferredLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE

  const ranked = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=')
      return { tag: (tag ?? '').toLowerCase(), q: q ? Number(q) : 1 }
    })
    .sort((a, b) => b.q - a.q)

  for (const { tag } of ranked) {
    const base = tag.split('-')[0]
    if (isLocale(base)) return base
  }

  return DEFAULT_LOCALE
}
