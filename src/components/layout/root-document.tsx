import localFont from 'next/font/local'

import { Analytics } from '@/components/analytics/analytics'
import { JsonLd } from '@/components/seo/json-ld'
import { Providers } from '@/components/theme/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CONSENT_BOOTSTRAP } from '@/lib/consent'
import { graph, organizationSchema, websiteSchema } from '@/lib/jsonld'

import '@/app/globals.css'

/**
 * -----------------------------------------------------------------------------
 * FONTS
 * -----------------------------------------------------------------------------
 * Three VARIABLE faces, latin subset, self-hosted from src/assets/fonts via
 * next/font/local rather than next/font/google.
 *
 * Why vendored: next/font/google downloads each face from fonts.googleapis.com
 * at BUILD time, so every production build depends on that host being
 * reachable, and fails outright in an offline or egress-restricted CI runner.
 * Vendoring makes builds reproducible and network-free. Runtime behaviour is
 * identical -- next/font self-hosts the bytes either way, so a visitor never
 * contacts Google.
 *
 * Why variable: one file covers the whole 100-900 weight range, so the design
 * system can use any weight (650 for headings, 500 for UI) with no extra
 * request and nothing synthesised by the browser.
 *
 * `display: swap` paints text immediately in the fallback and swaps without
 * blocking render. Only Inter is preloaded: it paints above the fold on every
 * route, whereas the serif is article body copy and the mono is code, so
 * preloading those would spend LCP budget on bytes the homepage never uses.
 *
 * `adjustFontFallback` generates a metric-matched fallback face (ascent,
 * descent and size-adjust overrides) so the swap from fallback to real face
 * does not reflow text -- this is what keeps CLS at zero.
 *
 * The OG image route keeps its own static WOFF copies of Inter: satori
 * supports ttf/otf/woff but NOT woff2, so it cannot read these files.
 */
const inter = localFont({
  src: '../../assets/fonts/inter-latin-wght-normal.woff2',
  variable: '--font-inter',
  display: 'swap',
  preload: true,
  weight: '100 900',
  style: 'normal',
  fallback: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
})

const sourceSerif = localFont({
  src: '../../assets/fonts/source-serif-4-latin-wght-normal.woff2',
  variable: '--font-source-serif',
  display: 'swap',
  preload: false,
  weight: '200 900',
  style: 'normal',
  fallback: ['ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
})

const jetbrainsMono = localFont({
  src: '../../assets/fonts/jetbrains-mono-latin-wght-normal.woff2',
  variable: '--font-jetbrains-mono',
  display: 'swap',
  preload: false,
  weight: '100 800',
  style: 'normal',
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
})

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BASE METADATA
 * ─────────────────────────────────────────────────────────────────────────────
 * `metadataBase` is what lets every page use root-relative paths and still get
 * absolute og:url / canonical values. Without it Next emits relative URLs,
 * which several crawlers and most social scrapers reject.
 *
 * The title template appends the brand to every child page; the homepage
 * overrides it with `title.absolute`.
 */

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * THE DOCUMENT
 * ═════════════════════════════════════════════════════════════════════════════
 * `<html>` and `<body>`, shared by both root layouts.
 *
 * WHY THERE ARE TWO ROOT LAYOUTS
 * `lang` has to be correct per language — a Hindi page that declares
 * `lang="en"` is read aloud by a screen reader with English phonemes, which is
 * unintelligible, and it contradicts the `hreflang` pointing at it.
 *
 * Only a ROOT layout may render `<html>`, and a root layout cannot read a
 * param from a segment below it. So the public site's root layout lives
 * *inside* `[locale]` — which Next supports through top-level route groups,
 * each with its own root layout — and the admin has a second one that is
 * always English.
 *
 * Everything that is genuinely shared lives here so the two roots do not drift:
 * the fonts, the consent bootstrap, the site-wide JSON-LD and the providers.
 */
export function RootDocument({
  lang,
  dir = 'ltr',
  children,
}: {
  lang: string
  dir?: 'ltr' | 'rtl'
  children: React.ReactNode
}) {
  return (
    <html
      lang={lang}
      dir={dir}
      // Next 16 no longer overrides scroll-behavior during navigation unless
      // this attribute is present; without it, our global `scroll-behavior:
      // smooth` would make every route change scroll-animate to the top.
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`}
      // next-themes writes the theme class here before paint; React would
      // otherwise warn that the server and client markup disagree.
      suppressHydrationWarning
    >
      {/*
        eslint-disable-next-line @next/next/no-head-element --
        That rule is a Pages Router rule: `next/head` does not exist in the App
        Router, where a root layout renders `<head>` directly. It only fires
        here because this component lives outside `app/`, which is where the
        rule's exemption is keyed — the markup is identical to what it was as
        `app/layout.tsx`.
      */}
      <head>
        {/*
          Consent defaults, inline and FIRST.

          Google Consent Mode v2 requires `denied` defaults to be set before
          any Google tag runs. A deferred script, or one in <body>, leaves a
          window in which the ad and analytics stack assumes consent.
        */}
        <script
          id="consent-bootstrap"
          // Not user content: a constant defined in lib/consent.ts.
          dangerouslySetInnerHTML={{ __html: CONSENT_BOOTSTRAP }}
        />
      </head>
      <body className="bg-background text-foreground flex min-h-dvh flex-col antialiased">
        {/* Organization + WebSite are site-wide entities, so they are emitted
            once here and referenced by @id from every page's own graph. */}
        <JsonLd id="ld-site" data={graph(organizationSchema(), websiteSchema())} />

        <Providers>
          <TooltipProvider delayDuration={250}>{children}</TooltipProvider>
        </Providers>

        <Analytics />
      </body>
    </html>
  )
}
