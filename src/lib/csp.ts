/**
 * ═════════════════════════════════════════════════════════════════════════════
 * CONTENT SECURITY POLICY
 * ═════════════════════════════════════════════════════════════════════════════
 * Built from one allowlist so every host this site may talk to is visible in a
 * single file, and so the policy narrows automatically when a feature is
 * switched off — a policy that allowlists AdSense on a site with ads disabled
 * is wider than it needs to be for no benefit.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THERE IS NO NONCE, STATED PLAINLY
 * ─────────────────────────────────────────────────────────────────────────────
 * The obvious strict CSP is `script-src 'self' 'nonce-...' 'strict-dynamic'`.
 * It is not used here, and the reason is structural rather than laziness:
 *
 *  1. A nonce must be unique per RESPONSE. Next can only do that by rendering
 *     the page per request, so every route that carries a nonce opts out of
 *     static prerendering. This site's entire SEO architecture is prerendered
 *     HTML with `use cache` — trading that for a nonce would mean every
 *     article is generated on demand, which costs far more than the CSP buys.
 *
 *  2. Hashes are not an escape hatch either. The App Router streams its RSC
 *     payload through a series of inline `self.__next_f.push(...)` scripts
 *     whose contents differ per page and per build, so there is no fixed set
 *     of hashes to enumerate.
 *
 * So `script-src` carries `'unsafe-inline'`, and this file does not pretend
 * otherwise. What makes that an acceptable risk HERE, specifically:
 *
 *  - The only attacker-influenced HTML on the site is article bodies and
 *    comment bodies. Both are sanitised server-side against a tag allowlist
 *    with no script, no iframe, no event handlers and no `javascript:` URLs,
 *    and both have regression tests pinning exactly that.
 *  - `script-src` is still an allowlist. An injected `<script src>` pointing
 *    at an attacker's host is blocked; `'unsafe-inline'` only relaxes inline
 *    script, not arbitrary origins.
 *  - Every OTHER directive is strict, and several of them block real attacks
 *    that nonces do nothing about: `base-uri` stops a `<base>` tag rewriting
 *    every relative URL on the page, `form-action` stops a form being
 *    repointed at an attacker, `connect-src` stops exfiltration to an
 *    arbitrary host, and `frame-ancestors` stops clickjacking.
 *
 * If the prerendering constraint ever changes, the nonce version is a small
 * edit: add the nonce in `proxy.ts`, swap `'unsafe-inline'` for the nonce and
 * `'strict-dynamic'` here, and accept dynamic rendering.
 */

const isProduction = process.env.NODE_ENV === 'production'

/**
 * The API's own origin, when it is not already covered by `https:`.
 *
 * Uploaded media is served by the API, so its origin has to appear in
 * `img-src`. In production that is an https host and the blanket `https:`
 * already covers it; in local development it is `http://localhost:5000`, which
 * `https:` does NOT cover — so every uploaded image would be blocked by the
 * CSP on exactly the machine where someone is testing uploads.
 */
function apiOrigin(): string[] {
  const api = process.env.NEXT_PUBLIC_API_URL
  if (!api) return []
  try {
    const { origin, protocol } = new URL(api)
    return protocol === 'https:' ? [] : [origin]
  } catch {
    return []
  }
}

/** Where the browser is allowed to send XHR/fetch/beacon traffic. */
function connectHosts(): string[] {
  const hosts = new Set<string>(["'self'"])

  // The API. Same-origin in a single-origin deploy, cross-origin in dev and
  // in a split deploy — either way it has to be explicit.
  const api = process.env.NEXT_PUBLIC_API_URL
  if (api) {
    try {
      hosts.add(new URL(api).origin)
    } catch {
      // A malformed API URL is a config error, not a reason to emit a broken
      // directive — leaving it out fails closed.
    }
  }

  if (process.env.NEXT_PUBLIC_GA_ID) {
    hosts.add('https://www.google-analytics.com')
    hosts.add('https://*.google-analytics.com')
    hosts.add('https://www.googletagmanager.com')
  }
  if (process.env.NEXT_PUBLIC_CLARITY_ID) {
    hosts.add('https://*.clarity.ms')
  }
  if (process.env.NEXT_PUBLIC_ADSENSE_CLIENT) {
    hosts.add('https://pagead2.googlesyndication.com')
    hosts.add('https://*.googlesyndication.com')
    hosts.add('https://*.doubleclick.net')
  }

  return [...hosts]
}

function scriptHosts(): string[] {
  const hosts = new Set<string>([
    "'self'",
    // See the note at the top of this file. Not an oversight.
    "'unsafe-inline'",
  ])

  if (process.env.NEXT_PUBLIC_GA_ID) {
    hosts.add('https://www.googletagmanager.com')
    hosts.add('https://www.google-analytics.com')
  }
  if (process.env.NEXT_PUBLIC_CLARITY_ID) {
    hosts.add('https://www.clarity.ms')
    hosts.add('https://*.clarity.ms')
  }
  if (process.env.NEXT_PUBLIC_ADSENSE_CLIENT) {
    hosts.add('https://pagead2.googlesyndication.com')
    hosts.add('https://*.googlesyndication.com')
    hosts.add('https://adservice.google.com')
  }

  return [...hosts]
}

/** Ad and embed iframes. Empty unless ads are actually configured. */
function frameHosts(): string[] {
  if (!process.env.NEXT_PUBLIC_ADSENSE_CLIENT) return ["'none'"]
  return [
    "'self'",
    'https://googleads.g.doubleclick.net',
    'https://tpc.googlesyndication.com',
    'https://*.googlesyndication.com',
  ]
}

export function buildCsp(): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],

    'script-src': scriptHosts(),

    /*
     * `'unsafe-inline'` for styles is unavoidable and far less dangerous.
     *
     * React sets inline `style` attributes for anything computed at render
     * time — the ad slot's reserved height, the player's progress bar — and
     * CSS injection cannot execute code. The worst case is defacement, not
     * data theft, and the sanitiser strips `<style>` from user content.
     */
    'style-src': ["'self'", "'unsafe-inline'"],

    /*
     * `https:` rather than an allowlist, deliberately.
     *
     * Covers are served from Cloudinary, avatars from OAuth providers, and ad
     * creatives from hosts chosen by the ad network at auction time — that
     * last set is unknowable in advance. Images cannot execute, and
     * `dangerouslyAllowSVG` is off in next.config.ts so a remote SVG (which
     * CAN carry script) is never rendered as an image.
     */
    'img-src': ["'self'", 'data:', 'blob:', 'https:', ...apiOrigin()],

    // Fonts are self-hosted via next/font/local. `data:` covers inlined
    // subsets; no external font host is permitted at all.
    'font-src': ["'self'", 'data:'],

    'connect-src': connectHosts(),

    // Generated narration MP3s come from a CDN; `blob:` covers client-side
    // audio the Listen player may construct.
    'media-src': ["'self'", 'https:', 'blob:'],

    'frame-src': frameHosts(),

    // ── The directives that earn their place even without a nonce ─────────

    // Flash/Java applet vectors. Nothing here needs them.
    'object-src': ["'none'"],

    // Stops an injected `<base href>` silently repointing every relative URL
    // on the page — including script and form targets.
    'base-uri': ["'self'"],

    // Stops a form being repointed at an attacker's collector. Relevant here:
    // the comment form, the newsletter form and the login form.
    'form-action': ["'self'"],

    // Clickjacking. Stronger than X-Frame-Options, which is kept alongside it
    // for browsers that only understand the old header.
    'frame-ancestors': ["'none'"],

    // No legacy plugin content of any kind.
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
  }

  const serialised = Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ')

  /*
   * `upgrade-insecure-requests` in production only.
   *
   * It rewrites every http:// subresource request to https. Browsers exempt
   * localhost and 127.0.0.1 — they are already "potentially trustworthy" —
   * so a local `next start` against an http API keeps working, which is why
   * the Phase 8 harness sees no violations. A DEPLOYED build pointing at an
   * http API would break, and that is the intended outcome rather than a
   * limitation: there is no good reason to ship one.
   *
   * `next dev` sets NODE_ENV=development, so the directive is absent there
   * regardless.
   */
  return isProduction ? `${serialised}; upgrade-insecure-requests` : serialised
}

/**
 * The header name.
 *
 * `Content-Security-Policy-Report-Only` lets a new policy run against real
 * traffic without breaking anything — violations are reported, nothing is
 * blocked. Flip `CSP_REPORT_ONLY=true` for a release or two after changing
 * the policy, read the reports, then flip it back.
 */
export function cspHeaderName(): string {
  return process.env.CSP_REPORT_ONLY === 'true'
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy'
}
