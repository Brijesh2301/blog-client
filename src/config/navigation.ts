/**
 * NAVIGATION — drives the header mega-menu, mobile nav, footer link groups
 * and the flat-architecture guarantee (every page ≤ 3 clicks from home).
 *
 * In Phase 3 the category entries are hydrated from the API; the shape stays
 * identical so nothing downstream changes.
 */

import type { LucideIcon } from 'lucide-react'
import {
  Bot,
  Code,
  Cpu,
  Gauge,
  Layers,
  ShieldCheck,
  Sparkles,
  Terminal,
} from 'lucide-react'

export type NavCategory = {
  title: string
  slug: string
  href: string
  description: string
  icon: LucideIcon
  /** Tailwind class pair for the category colour tag (light + dark tuned). */
  tone: string
  featured?: boolean
}

/**
 * The category navigation.
 *
 * Every `slug` here MUST match a category slug in the database. This array is
 * rendered in the footer of every page — it is the crawl backbone — so a slug
 * that drifts from the data is not a cosmetic bug: it is a dead link on every
 * page of the site, bleeding internal PageRank into a 404.
 *
 * It is hardcoded rather than fetched because the header and mobile navs are
 * client components that cannot await, and because the icons and tones are
 * presentation that does not belong in the database. The Phase 7 gate crawls
 * every internal link on the homepage, which is what catches a drift.
 *
 * Two slugs were wrong when that check was first run: `backend` and `tooling`,
 * against `backend-infra` and `developer-tooling` in the data.
 */
export const categories: NavCategory[] = [
  {
    title: 'Web Development',
    slug: 'web-development',
    href: '/category/web-development',
    description: 'Next.js, React, routing, rendering and the modern browser.',
    icon: Code,
    tone: 'text-brand-700 bg-brand-100 dark:text-brand-200 dark:bg-brand-500/15',
    featured: true,
  },
  {
    title: 'AI Engineering',
    slug: 'ai-engineering',
    href: '/category/ai-engineering',
    description: 'LLM apps, RAG pipelines, evals and agent architecture.',
    icon: Bot,
    tone: 'text-accent-800 bg-accent-100 dark:text-accent-200 dark:bg-accent-500/15',
    featured: true,
  },
  {
    title: 'TypeScript',
    slug: 'typescript',
    href: '/category/typescript',
    description: 'Types that catch real bugs, and the patterns behind them.',
    icon: Layers,
    tone: 'text-brand-700 bg-brand-100 dark:text-brand-200 dark:bg-brand-500/15',
  },
  {
    title: 'Performance',
    slug: 'performance',
    href: '/category/performance',
    description: 'Core Web Vitals, bundle budgets and render profiling.',
    icon: Gauge,
    tone: 'text-warm-800 bg-warm-100 dark:text-warm-200 dark:bg-warm-500/15',
    featured: true,
  },
  {
    title: 'Backend & Infra',
    // Must match the category slug in the database, not a shortened version
    // of it — this nav is rendered in the footer of every page, so a slug
    // that drifts is a dead link site-wide. See the note at the top of the
    // array.
    slug: 'backend-infra',
    href: '/category/backend-infra',
    description: 'Node, Postgres, queues, caching and deployment.',
    icon: Terminal,
    tone: 'text-accent-800 bg-accent-100 dark:text-accent-200 dark:bg-accent-500/15',
  },
  {
    title: 'Systems Design',
    slug: 'systems-design',
    href: '/category/systems-design',
    description: 'Trade-offs, scaling patterns and architecture reviews.',
    icon: Cpu,
    tone: 'text-brand-700 bg-brand-100 dark:text-brand-200 dark:bg-brand-500/15',
  },
  {
    title: 'Security',
    slug: 'security',
    href: '/category/security',
    description: 'Auth, secrets, supply chain and practical hardening.',
    icon: ShieldCheck,
    tone: 'text-warm-800 bg-warm-100 dark:text-warm-200 dark:bg-warm-500/15',
  },
  {
    title: 'Developer Tooling',
    slug: 'developer-tooling',
    href: '/category/developer-tooling',
    description: 'Editors, CLIs, CI and the loop you live in all day.',
    icon: Sparkles,
    tone: 'text-accent-800 bg-accent-100 dark:text-accent-200 dark:bg-accent-500/15',
  },
]

export type NavItem = { title: string; href: string; external?: boolean }

/** Primary header nav. Kept to 5 items — more than that reads as a template. */
/**
 * The primary navigation.
 *
 * `titleKey` names an entry in the `nav` dictionary; `title` is the English
 * fallback so anything still reading it keeps working. Hardcoding the label
 * here is what left the header in English on the Hindi site — the chrome was
 * translated but the four most prominent words on the page were not.
 */
export const mainNav: (NavItem & { titleKey: keyof NavDictionary })[] = [
  { title: 'Articles', titleKey: 'articles', href: '/blog' },
  { title: 'Series', titleKey: 'series', href: '/series' },
  { title: 'Resources', titleKey: 'resources', href: '/resources' },
  { title: 'About', titleKey: 'about', href: '/about' },
]

/** The slice of the dictionary nav labels come from. */
type NavDictionary = import('@/i18n/dictionaries').Dictionary['nav']

export const footerNav: { title: string; items: NavItem[] }[] = [
  {
    title: 'Read',
    items: [
      { title: 'All articles', href: '/blog' },
      { title: 'Series', href: '/series' },
      { title: 'Topics', href: '/topics' },
      { title: 'Authors', href: '/authors' },
      /*
       * `/archive` was listed here and 404ed — a dead link in the footer of
       * every page on the site, which bleeds internal PageRank into nothing
       * and gives a crawler a broken URL on every crawl.
       *
       * Removed rather than built: `/blog` is already paginated with
       * self-referencing canonicals on every page, so a year-by-year archive
       * would be a second set of near-duplicate listings competing with it
       * for the same queries.
       */
    ],
  },
  {
    title: 'Topics',
    // ALL categories, not a slice: the footer is what guarantees every
    // category page is reachable in one click from any page, which keeps
    // them crawlable even though the header mega-menu mounts on demand.
    items: categories.map((c) => ({ title: c.title, href: c.href })),
  },
  {
    title: 'Devlume',
    items: [
      { title: 'About', href: '/about' },
      { title: 'Contact', href: '/contact' },
      { title: 'Advertise', href: '/advertise' },
      { title: 'Newsletter', href: '/newsletter' },
      { title: 'Resources', href: '/resources' },
    ],
  },
  {
    title: 'Legal',
    items: [
      { title: 'Editorial policy', href: '/editorial-policy' },
      { title: 'Privacy policy', href: '/privacy-policy' },
      { title: 'Terms of service', href: '/terms' },
      { title: 'Cookie policy', href: '/cookie-policy' },
      { title: 'Affiliate disclosure', href: '/affiliate-disclosure' },
      { title: 'Disclaimer', href: '/disclaimer' },
      { title: 'DMCA', href: '/dmca' },
    ],
  },
]

/** Feeds + machine-readable endpoints, surfaced in the footer. */
export const feedNav: NavItem[] = [
  { title: 'RSS', href: '/rss.xml' },
  { title: 'Atom', href: '/atom.xml' },
  { title: 'Podcast', href: '/podcast.xml' },
  { title: 'Sitemap', href: '/sitemap.xml' },
]
