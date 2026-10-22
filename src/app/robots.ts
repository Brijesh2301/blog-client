import type { MetadataRoute } from 'next'

import { absoluteUrl, siteConfig } from '@/config/site'

/**
 * robots.txt — served at /robots.txt
 *
 * Policy:
 *  - /admin, /api and the account pages are crawl-blocked outright.
 *  - /search is blocked because search result pages are thin, infinite and
 *    generate duplicate content; the sitemap is the discovery path instead.
 *  - Faceted/tracking query strings are blocked so crawl budget is not spent
 *    on permutations of the same page.
 *  - AI training crawlers are allowed by default. Flip DISALLOW_AI_CRAWLERS
 *    to opt out without touching anything else.
 */
const DISALLOW_AI_CRAWLERS = false

const BLOCKED_PATHS = [
  '/admin',
  '/admin/',
  '/api/',
  '/account',
  '/login',
  '/register',
  '/reset-password',
  '/verify-email',
  '/preview',
  '/design-system',
  '/search',
  // Per-reader pages. Every article on /saved is already indexed at its own
  // canonical URL, and the page's content differs per signed-in reader, so a
  // crawler could only ever see an empty version of it.
  '/saved',
  '/newsletter/confirm',
  '/newsletter/unsubscribe',
]

/** Query strings that create crawlable duplicates of an existing page. */
const BLOCKED_PARAMS = ['/*?*q=', '/*?*utm_', '/*?*ref=', '/*?*sort=', '/*?*replytocom=']

export default function robots(): MetadataRoute.Robots {
  const rules: MetadataRoute.Robots['rules'] = [
    {
      userAgent: '*',
      allow: '/',
      disallow: [...BLOCKED_PATHS, ...BLOCKED_PARAMS],
    },
    // Googlebot must be able to fetch CSS/JS to render the page for
    // mobile-first indexing, so _next/static is explicitly allowed.
    {
      userAgent: ['Googlebot', 'Bingbot'],
      allow: ['/', '/_next/static/', '/_next/image'],
      disallow: [...BLOCKED_PATHS, ...BLOCKED_PARAMS],
    },
  ]

  if (DISALLOW_AI_CRAWLERS) {
    rules.push({
      userAgent: ['GPTBot', 'ClaudeBot', 'CCBot', 'Google-Extended', 'Applebot-Extended'],
      disallow: '/',
    })
  }

  return {
    rules,
    // The index first, then each child. Listing the children as well is
    // belt-and-braces: a crawler that does not follow sitemap indexes still
    // finds every URL.
    sitemap: [
      absoluteUrl('/sitemap.xml'),
      absoluteUrl('/sitemap-posts.xml'),
      absoluteUrl('/sitemap-taxonomy.xml'),
      absoluteUrl('/sitemap-pages.xml'),
    ],
    host: siteConfig.url,
  }
}
