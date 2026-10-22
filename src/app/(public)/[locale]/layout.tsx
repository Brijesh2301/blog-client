import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'

import { ConsentBanner } from '@/components/consent/consent-banner'
import { RootDocument } from '@/components/layout/root-document'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteShell } from '@/components/layout/site-shell'
import { SkipLink } from '@/components/layout/skip-link'
import { absoluteUrl, siteConfig } from '@/config/site'
import { LOCALES, LOCALE_META, isLocale, type Locale } from '@/i18n/config'

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  generator: 'Next.js',
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.name,
  publisher: siteConfig.organization.legalName,

  alternates: {
    canonical: '/',
    types: {
      'application/rss+xml': absoluteUrl('/rss.xml'),
      'application/atom+xml': absoluteUrl('/atom.xml'),
    },
  },

  openGraph: {
    type: 'website',
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    url: siteConfig.url,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} — ${siteConfig.tagline}`,
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    site: `@${siteConfig.xHandle}`,
    creator: `@${siteConfig.xHandle}`,
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },

  // Search Console / Bing verification. Phase 4 moves these into site settings;
  // env vars keep them out of the repo in the meantime.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: {
      ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION && {
        'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION,
      }),
    },
  },

  formatDetection: { telephone: false, address: false, email: false },
  category: 'technology',
}

/**
 * Viewport + theme colour.
 * The two theme-color entries let the browser chrome match whichever theme is
 * active, which is the difference between "installed app" and "website".
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Never block zoom: pinch-zoom is an accessibility requirement (WCAG 1.4.4).
  maximumScale: 5,
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fdfdff' },
    { media: '(prefers-color-scheme: dark)', color: '#1b1a2e' },
  ],
}

/**
 * ROOT LAYOUT — document shell only.
 *
 * The public header, footer and skip link live in `app/(site)/layout.tsx`, not
 * here, because /admin must NOT render them. Route groups do not affect URLs,
 * so `(site)` is invisible in the routing while letting the two areas have
 * genuinely different chrome.
 */

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * PUBLIC ROOT LAYOUT
 * ═════════════════════════════════════════════════════════════════════════════
 * A ROOT layout — it renders `<html>` — that lives inside `[locale]`.
 *
 * That is the only way to get `lang` right. Only a root layout may render
 * `<html>`, and a root layout cannot read a param from a segment below it, so
 * the segment has to be above the layout. Next supports this through top-level
 * route groups: `(public)` has this root, `(admin)` has its own.
 *
 * It matters because a Hindi page declaring `lang="en"` is read aloud by a
 * screen reader with English phonemes — unintelligible — and it contradicts
 * the `hreflang` annotations pointing at it. Setting it from a client effect
 * would leave the prerendered HTML wrong, which is what a crawler reads.
 *
 * `generateStaticParams` returning both locales is what makes the whole site
 * prerender in both languages rather than rendering Hindi on demand.
 */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default async function PublicRootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  /*
   * An unknown locale is a 404, not a fallback to English.
   *
   * `/fr/blog/x` must not quietly serve the English article at a French URL —
   * that is a duplicate of `/blog/x` under a second address, with no hreflang
   * relationship. The proxy rewrites unprefixed paths to `/en`, so anything
   * reaching here with an unknown first segment genuinely is not a locale.
   */
  if (!isLocale(locale)) notFound()

  const typed = locale as Locale
  const meta = LOCALE_META[typed]

  return (
    <RootDocument lang={meta.bcp47} dir={meta.dir}>
      {/* Must be the first focusable element in the document. */}
      <SkipLink locale={typed} />

      <SiteShell locale={typed} />

      {/* The single H1-bearing landmark, and the skip-link target. */}
      <main id="main" className="flex-1">
        {children}
      </main>

      <SiteFooter locale={typed} />

      {/*
        Last in the document, and `fixed` in its own stylesheet, so a banner
        appearing on a cold visit cannot shift the page.
      */}
      <ConsentBanner locale={typed} />
    </RootDocument>
  )
}
