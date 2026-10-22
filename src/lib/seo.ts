import type { Metadata } from 'next'

import { absoluteUrl, siteConfig } from '@/config/site'
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_META,
  localePath,
  type Locale,
} from '@/i18n/config'
import { truncate } from '@/lib/utils'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SEO METADATA FACTORY
 * ─────────────────────────────────────────────────────────────────────────────
 * Every indexable page builds its metadata through `buildMetadata` so that
 * canonical URLs, OG/Twitter cards and robots directives can never be
 * forgotten on a page-by-page basis. The SEO rules live here, once.
 */

/** Title budget Google renders before truncating (~60 chars incl. brand). */
export const TITLE_MAX = 60
/** Description budget (~160 chars). */
export const DESCRIPTION_MAX = 160
export const DESCRIPTION_MIN = 140

export type BuildMetadataInput = {
  /** Page title WITHOUT the brand suffix — the template appends it. */
  title: string
  description: string
  /** Site-root-relative path, e.g. `/blog/my-post`. Becomes the canonical. */
  path: string
  /** Absolute or root-relative OG image. Defaults to the dynamic OG route. */
  image?: string
  imageAlt?: string
  /** `article` for posts, `profile` for author pages, else `website`. */
  type?: 'website' | 'article' | 'profile'
  /** Keep out of the index (search pages, admin, thin tag pages, previews). */
  noIndex?: boolean
  /** Let the page override the canonical (syndicated / cross-posted content). */
  canonical?: string
  publishedTime?: string
  modifiedTime?: string
  authors?: { name: string; url?: string }[]
  section?: string
  tags?: string[]
  /** Suppress the `· Devlume` suffix (used by the homepage). */
  absoluteTitle?: boolean
  /**
   * The language this page is in.
   *
   * Drives the canonical, the `hreflang` set and `og:locale`. Defaults to
   * English so existing callers keep working unchanged.
   */
  locale?: Locale
  /**
   * Which languages this specific page actually EXISTS in.
   *
   * Defaults to every locale, which is right for pages that are rendered in
   * both (listings, legal pages, the homepage). An ARTICLE must pass the real
   * set: advertising `hreflang="hi"` for a post with no Hindi translation
   * points Google at a 404, which Search Console reports as an hreflang error
   * and which can invalidate the annotation for the pair.
   */
  availableLocales?: readonly Locale[]
}

export function buildMetadata(input: BuildMetadataInput): Metadata {
  const {
    title,
    description,
    path,
    image,
    imageAlt,
    type = 'website',
    noIndex = false,
    canonical,
    publishedTime,
    modifiedTime,
    authors,
    section,
    tags,
    absoluteTitle = false,
    locale = DEFAULT_LOCALE,
    availableLocales,
  } = input

  /*
   * `path` is always the LOCALE-FREE path — `/blog/x`, never `/hi/blog/x`.
   *
   * Callers pass the canonical shape and the locale separately, so the
   * canonical and the hreflang set are both derived here from one source. A
   * caller that built the prefixed path itself would produce a Hindi page
   * whose canonical points at the English URL, which tells Google to drop the
   * Hindi version entirely.
   */
  const url = absoluteUrl(localePath(path, locale))
  const canonicalUrl = canonical ?? url
  const description160 = truncate(description, DESCRIPTION_MAX)
  const ogImage = image
    ? image.startsWith('http')
      ? image
      : absoluteUrl(image)
    : absoluteUrl(`/api/og?title=${encodeURIComponent(title)}`)

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: description160,

    alternates: {
      canonical: canonicalUrl,

      /*
       * hreflang.
       *
       * Without this, `/blog/x` and `/hi/blog/x` look to Google like two
       * pages competing for the same queries, and it picks one — usually not
       * the one a given searcher wanted. With it, they are declared as
       * translations of each other and each is served to the right audience.
       *
       * Three rules this implementation follows, all of which are easy to get
       * wrong:
       *
       *  1. The set is RECIPROCAL and includes the page itself. A page must
       *     list its own language alongside the others, or Google ignores the
       *     whole annotation.
       *  2. Every URL is ABSOLUTE. Relative hreflang values are silently
       *     dropped.
       *  3. `x-default` points at the English version — the one to serve when
       *     no listed language matches the searcher.
       */
      languages: hreflangFor(path, availableLocales),

      types: {
        'application/rss+xml': absoluteUrl('/rss.xml'),
        'application/atom+xml': absoluteUrl('/atom.xml'),
      },
    },

    robots: noIndex
      ? {
          index: false,
          follow: true,
          // Explicit bot-level directives: some crawlers ignore the generic tag.
          googleBot: { index: false, follow: true },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            // Allow full rich previews; the default caps snippet length.
            'max-snippet': -1,
            'max-image-preview': 'large',
            'max-video-preview': -1,
          },
        },

    openGraph: {
      type: type === 'profile' ? 'profile' : type,
      url: canonicalUrl,
      siteName: siteConfig.name,
      // The page's actual language, not the site's default — og:locale is what
      // a social preview uses to decide how to render the text.
      locale: LOCALE_META[locale].ogLocale,
      alternateLocale: LOCALES.filter((l) => l !== locale).map(
        (l) => LOCALE_META[l].ogLocale
      ),
      title,
      description: description160,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: imageAlt ?? title,
        },
      ],
      ...(type === 'article' && {
        publishedTime,
        modifiedTime,
        authors: authors?.map((a) => a.name),
        section,
        tags,
      }),
    },

    twitter: {
      card: 'summary_large_image',
      site: `@${siteConfig.xHandle}`,
      creator: `@${siteConfig.xHandle}`,
      title,
      description: description160,
      images: [ogImage],
    },

    ...(authors?.length && {
      authors: authors.map((a) => ({ name: a.name, url: a.url })),
    }),
  }
}

/**
 * Pagination metadata for crawlable `?page=N` listings.
 *
 * Rules applied (current Google guidance):
 *  - every page gets a SELF-referencing canonical, never one pointing at page 1
 *    (canonicalising page 2+ to page 1 hides those links from the crawler);
 *  - page 2+ keeps `index,follow` so deep posts stay discoverable, but the
 *    title carries a page number to avoid duplicate-title warnings.
 */
export function paginatedMetadata(base: BuildMetadataInput, page: number): Metadata {
  if (page <= 1) return buildMetadata(base)
  return buildMetadata({
    ...base,
    title: `${base.title} — Page ${page}`,
    description: `${truncate(base.description, DESCRIPTION_MAX - 20)} Page ${page}.`,
    path: `${base.path}?page=${page}`,
  })
}

/** Routes that must never be indexed. Mirrored in `robots.ts` and `proxy.ts`. */
export const NOINDEX_PATHS = [
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
] as const

export function isNoIndexPath(pathname: string): boolean {
  return NOINDEX_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/**
 * The `hreflang` map for a locale-free path.
 *
 * `x-default` is not a language — it is the fallback for a searcher whose
 * language matches none of the listed ones, and omitting it means Google
 * guesses. English is the right default here because it is the language the
 * archive is written in.
 */
export function hreflangFor(
  path: string,
  available: readonly Locale[] = LOCALES
): Record<string, string> {
  const languages: Record<string, string> = {}

  for (const locale of available) {
    languages[LOCALE_META[locale].bcp47] = absoluteUrl(localePath(path, locale))
  }

  /*
   * `x-default` only when English is genuinely one of the options.
   *
   * On a Hindi-only article, pointing x-default at an English URL that does
   * not exist is worse than omitting it.
   */
  if (available.includes(DEFAULT_LOCALE)) {
    languages['x-default'] = absoluteUrl(localePath(path, DEFAULT_LOCALE))
  }

  return languages
}
