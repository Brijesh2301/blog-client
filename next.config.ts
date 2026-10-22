import path from 'node:path'

import type { NextConfig } from 'next'

import { buildCsp, cspHeaderName } from './src/lib/csp'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SECURITY HEADERS
 * ─────────────────────────────────────────────────────────────────────────────
 * Static headers live here rather than in proxy.ts: they are identical for
 * every request, so computing them per-request would be wasted work.
 *
 * Content-Security-Policy is built in src/lib/csp.ts, where the full reasoning
 * lives — including why it uses `'unsafe-inline'` for scripts rather than a
 * nonce (a nonce forces per-request rendering, which would end the static
 * prerendering this site's entire SEO strategy rests on) and what makes that
 * acceptable here.
 */
const securityHeaders = [
  // The policy itself is assembled from one allowlist in src/lib/csp.ts and
  // narrows automatically when a third-party feature is not configured.
  { key: cspHeaderName(), value: buildCsp() },
  // Force HTTPS for two years, including subdomains. Safe to preload.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Stop the browser guessing a response type (classic XSS vector on uploads).
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Send the full referrer same-origin, origin only cross-origin: keeps
  // analytics attribution working without leaking paths to third parties.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Clickjacking protection for browsers without frame-ancestors support.
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Deny powerful APIs this site never uses.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  // Isolate the browsing context without breaking third-party embeds.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
]

/** The API origin as a `remotePatterns` entry, so uploads render. */
function apiImagePattern() {
  const api = process.env.NEXT_PUBLIC_API_URL
  if (!api) return []
  try {
    const url = new URL(api)
    return [
      {
        protocol: url.protocol.replace(':', '') as 'http' | 'https',
        hostname: url.hostname,
        ...(url.port ? { port: url.port } : {}),
        pathname: '/uploads/**',
      },
    ]
  } catch {
    return []
  }
}

const nextConfig: NextConfig = {
  // ── Cache Components (Next 16) ──────────────────────────────────────────
  // Enables `use cache` + partial prerendering. This is how posts get the
  // SSG/ISR behaviour the SEO plan requires: cached content is baked into the
  // prerendered shell, so full article text is in the initial HTML.
  cacheComponents: true,
  partialPrefetching: true,

  /*
   * Pin the workspace root. Do not remove this.
   *
   * Next INFERS the root by walking up looking for a lockfile. This repo has
   * three (root, client, server), so the moment a `npm install` is run at the
   * repo root the inferred root jumps from `client/` to the repo, and the
   * standalone output silently moves from `.next/standalone/server.js` to
   * `.next/standalone/client/server.js`.
   *
   * That breaks the Dockerfile, and it breaks it asymmetrically: inside the
   * image the build context is `./client`, so only one lockfile is visible and
   * the path is the short one — meaning a local build and a container build
   * produce different layouts from identical source. Pinning it makes the two
   * agree, and it also stops file tracing from reaching into `../server`.
   */
  outputFileTracingRoot: path.join(__dirname),

  turbopack: {
    root: path.join(__dirname),
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },

  /**
   * Disable streaming metadata entirely.
   *
   * By default Next streams metadata for dynamically-rendered pages: the tags
   * are emitted in the BODY and React relocates them into <head> during
   * hydration. Googlebot renders JS so it generally copes, but a `noindex`
   * that only exists after rendering is a far weaker guarantee than one in the
   * served <head> -- and `noindex` is the directive we least want to be
   * probabilistic (search pages, thin tag archives).
   *
   * `/.*​/` matches every user agent, so metadata is always blocking and always
   * in <head>. The cost is that the document waits for generateMetadata, which
   * here only reads already-cached data.
   */
  htmlLimitedBots: /.*/,

  /*
   * Standalone output, for the container image.
   *
   * Next traces exactly the files the server needs and copies them, plus a
   * minimal node_modules, into .next/standalone. The runtime image is then
   * that directory and nothing else — no devDependencies, no source, no
   * toolchain. It is also what makes the image small enough to cold-start
   * quickly, which matters on a platform that scales to zero.
   */
  output: 'standalone',

  reactStrictMode: true,
  // Do not advertise the framework version.
  poweredByHeader: false,
  compress: true,
  // One canonical URL shape. Combined with the host redirect in proxy.ts this
  // removes every trailing-slash / www duplicate.
  trailingSlash: false,

  // ── Images ──────────────────────────────────────────────────────────────
  images: {
    // AVIF first, WebP fallback. Next negotiates per Accept header.
    formats: ['image/avif', 'image/webp'],
    // Next 16 narrowed the default to [75]; a quality prop outside this list
    // is coerced, and a direct /_next/image request with an unlisted q is a
    // 400. These are the three we actually use.
    qualities: [60, 75, 90],
    // Next 16 default is 4h. Covers are content-addressed by Cloudinary, so a
    // long TTL is safe and cuts optimisation cost.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      /*
       * This app's OWN API, which serves uploaded media from /uploads.
       *
       * Without it, every uploaded cover image throws "hostname is not
       * configured under images" at render time — the upload succeeds, the
       * URL is stored, and the article page then fails to render. Derived
       * from the configured API URL rather than hardcoded so it follows the
       * environment.
       */
      ...apiImagePattern(),
      // Cloudinary — the Phase 2 media pipeline.
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
      // S3 / CloudFront alternative.
      { protocol: 'https', hostname: '*.amazonaws.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.cloudfront.net', pathname: '/**' },
      // Author avatars from OAuth providers.
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
    // SVG from remote hosts stays blocked: it can carry script.
    dangerouslyAllowSVG: false,
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      // NOTE: no custom Cache-Control for /_next/static. Next already serves
      // those content-hashed assets as immutable, and overriding the header
      // makes it warn that development behaviour can break.
      {
        // Feeds change often but are cheap; let the CDN serve them stale.
        source: '/:feed(rss.xml|atom.xml|podcast.xml)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ]
  },

  async rewrites() {
    const indexNowKey = process.env.INDEXNOW_KEY
    return [
      // IndexNow verifies ownership by fetching /<key>.txt from the domain
      // root. Only mounted when a key is configured, so there is nothing to
      // probe when the feature is off.
      ...(indexNowKey
        ? [{ source: `/${indexNowKey}.txt`, destination: '/api/indexnow-key' }]
        : []),
    ]
  },

  async redirects() {
    return [
      // Common feed aliases, so a reader pasting any of these lands correctly.
      { source: '/feed', destination: '/rss.xml', permanent: true },
      { source: '/feed.xml', destination: '/rss.xml', permanent: true },
      { source: '/rss', destination: '/rss.xml', permanent: true },
      // Legacy/alternate spellings of the trust pages.
      { source: '/privacy', destination: '/privacy-policy', permanent: true },
      { source: '/terms-of-service', destination: '/terms', permanent: true },
      // Phase 4 adds the database-backed redirect manager for slug changes.
    ]
  },

  // NOTE: Next 16 removed the `eslint` config key along with `next lint`.
  // Linting is a separate step: `npm run lint` locally and in CI (Phase 8).
  typescript: {
    // Type errors MUST fail the build. This is the main guard against a
    // refactor silently breaking a page.
    ignoreBuildErrors: false,
  },
}

export default nextConfig
