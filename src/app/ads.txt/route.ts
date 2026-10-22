import { cacheLife } from 'next/cache'

import { siteConfig } from '@/config/site'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * /ads.txt — Authorized Digital Sellers (IAB)
 * ═════════════════════════════════════════════════════════════════════════════
 * A plain-text list of who is allowed to sell this domain's inventory. Buyers
 * crawl it and refuse bids from anyone not listed, which is what makes domain
 * spoofing unprofitable — someone claiming to sell devlume.dev impressions
 * through an unlisted seller gets no bids.
 *
 * It must be served from the ROOT of the domain as `text/plain`. Serving it
 * from a subdirectory, or as HTML, means crawlers treat the domain as having
 * no ads.txt at all — which is not neutral: many buyers now treat "no ads.txt"
 * as a reason to bid lower or not at all.
 *
 * Generated rather than a static file in /public so the publisher ID comes
 * from one place and cannot drift from the AdSense client the ad slots use.
 *
 * Line format, per the IAB spec:
 *   <exchange domain>, <publisher id>, <DIRECT|RESELLER>, <certification id>
 */

/** Google's TAG certification authority ID. Constant for every publisher. */
const GOOGLE_TAG_ID = 'f08c47fec0942fa0'

/*
 * `use cache` on the STRING builder, not on the handler.
 *
 * Under Cache Components a route cannot declare `dynamic = 'force-static'`,
 * and a cached function must return something serialisable — a `Response` is
 * not. Same split as every feed and sitemap route here.
 */
async function buildAdsTxt(): Promise<string> {
  'use cache'
  cacheLife('days')

  const publisherId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

  const lines = [
    `# ads.txt for ${siteConfig.domain}`,
    `# Contact: ${siteConfig.organization.email}`,
    '',
  ]

  if (publisherId) {
    // DIRECT: we have the account relationship ourselves, rather than a
    // reseller selling on our behalf. Claiming DIRECT when it is a reseller
    // relationship is the misconfiguration that gets inventory blocked.
    lines.push(`google.com, ${publisherId.replace(/^ca-/, '')}, DIRECT, ${GOOGLE_TAG_ID}`)
  } else {
    lines.push(
      '# No ad network is configured yet.',
      '# Set NEXT_PUBLIC_ADSENSE_CLIENT and redeploy to publish the seller line.'
    )
  }

  return `${lines.join('\n')}\n`
}

export async function GET() {
  return new Response(await buildAdsTxt(), {
    headers: {
      // `text/plain` is mandated by the spec; crawlers ignore anything else.
      'Content-Type': 'text/plain; charset=utf-8',
      // Buyers re-crawl this file regularly, but it changes almost never.
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
