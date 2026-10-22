/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SITE CONFIG — the single source of brand truth.
 * ─────────────────────────────────────────────────────────────────────────────
 * Every brand string, URL, keyword and nav entry used across metadata,
 * JSON-LD, sitemap, robots, RSS, OG images and the manifest is derived from
 * this file. Rebrand = edit this file only.
 *
 * NOTE (documented assumption): the original brief left BRAND NAME, DOMAIN and
 * PRIMARY KEYWORDS as placeholders. Industry-standard defaults were chosen so
 * the build is runnable end-to-end. Change `name`, `domain` and `keywords`
 * below and the whole app follows.
 */

export const siteConfig = {
  // ── Identity ──────────────────────────────────────────────────────────────
  name: 'Devlume',
  /** Used in <title> templates: "Post title · Devlume" */
  shortName: 'Devlume',
  /** 50–60 chars — this is the homepage <title>. */
  title: 'Devlume — Engineering Guides for Modern Web & AI',
  /** 140–160 chars — the homepage meta description. */
  description:
    'In-depth, practical engineering guides on Next.js, TypeScript, AI and systems design — written by people who ship. No fluff, no filler, no AI slop.',
  tagline: 'Engineering guides for people who ship.',

  // ── Location ──────────────────────────────────────────────────────────────
  /** No trailing slash. Overridden by NEXT_PUBLIC_SITE_URL in deployment. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://devlume.dev',
  domain: 'devlume.dev',
  locale: 'en_US',
  lang: 'en',

  // ── Niche + target keywords (used for homepage metadata + topic clusters) ──
  niche: 'Tech, Programming, AI and Web Development',
  keywords: [
    'next.js tutorial',
    'react server components',
    'typescript best practices',
    'web performance optimization',
    'core web vitals',
    'ai coding assistant',
    'llm application development',
    'rag architecture',
    'node.js backend',
    'system design interview',
    'tailwind css',
    'frontend architecture',
    'postgresql performance',
    'docker for developers',
    'ci cd pipeline',
    'technical seo for developers',
    'api design rest',
    'javascript interview questions',
  ],

  // ── Organisation / E-E-A-T ────────────────────────────────────────────────
  organization: {
    legalName: 'Devlume Media',
    foundingDate: '2026-01-01',
    email: 'hello@devlume.dev',
    /** Shown on /contact and used in Organization JSON-LD. */
    contactEmail: 'hello@devlume.dev',
    editorialEmail: 'editorial@devlume.dev',
  },

  // ── Social profiles (drive Organization `sameAs` in JSON-LD) ──────────────
  social: {
    x: 'https://x.com/devlume',
    github: 'https://github.com/devlume',
    linkedin: 'https://www.linkedin.com/company/devlume',
    youtube: '',
    rss: '/rss.xml',
  },
  /** Handle without the @, for twitter:site / twitter:creator. */
  xHandle: 'devlume',

  // ── Brand assets ──────────────────────────────────────────────────────────
  assets: {
    logo: '/brand/logo.svg',
    logoMark: '/brand/mark.svg',
    ogImage: '/opengraph-image',
    appleTouchIcon: '/apple-icon',
  },

  // ── Feature flags (env-driven; ads OFF until AdSense approval) ────────────
  features: {
    ads: process.env.NEXT_PUBLIC_ADS_ENABLED === 'true',
    audio: process.env.NEXT_PUBLIC_AUDIO_ENABLED !== 'false',
    comments: true,
    newsletter: true,
    search: true,
  },

  /** Posts per page — must match the sitemap + crawlable pagination logic. */
  postsPerPage: 12,
} as const

export type SiteConfig = typeof siteConfig

/** Absolute URL helper. Always use this instead of string-concatenating. */
export function absoluteUrl(path = '/'): string {
  const base = siteConfig.url.replace(/\/$/, '')
  if (!path || path === '/') return base
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}
