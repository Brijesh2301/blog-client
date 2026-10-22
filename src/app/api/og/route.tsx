import { readFile } from 'node:fs/promises'

import { ImageResponse } from 'next/og'

import { siteConfig } from '@/config/site'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DYNAMIC OPEN GRAPH IMAGE  —  /api/og?title=…&category=…&author=…&date=…
 * ─────────────────────────────────────────────────────────────────────────────
 * One branded 1200x630 template for every shareable URL, so no page can ever
 * ship without a social card.
 *
 * Fonts come from src/assets/fonts -- the same files next/font uses, so there
 * is one copy in the repo -- and are read from disk at request time.
 * Satori supports ttf/otf/woff but NOT woff2, which is why these are plain
 * WOFF rather than the woff2 next/font normally emits.
 *
 * Layout uses flexbox only — satori implements no CSS grid.
 */

export const alt = 'Devlume article cover'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const BRAND = {
  bg: '#1b1a2e',
  surface: '#232245',
  text: '#f4f3fb',
  muted: '#a9a6c9',
  iris: '#8b5cf6',
  irisLight: '#a78bfa',
  cyan: '#22d3ee',
  amber: '#f5a524',
}

/**
 * Fonts are read with the `new URL(...)` written INLINE at each call site.
 *
 * Two separate constraints force this exact shape:
 *  - `fs.readFile`, not `fetch`: Node's fetch has no file: protocol handler
 *    and throws "not implemented... yet..." on a file: URL.
 *  - the URL literal must appear inside the readFile call, not in a shared
 *    constant. Turbopack statically analyses the argument to decide what to
 *    trace into the build output; given anything it cannot resolve it falls
 *    back to tracing the ENTIRE project (every source file and all of
 *    public/) into the server bundle, which it warns about at build time.
 */

export async function GET(request: Request) {
  // Reading the URL makes this a request-time route under Cache Components,
  // which is correct: the image is a pure function of its query string and is
  // cached downstream by CDN headers rather than prerendered.
  const { searchParams } = new URL(request.url)

  const rawTitle = searchParams.get('title')?.trim()
  const title = clamp(rawTitle || siteConfig.title, 110)
  const category = clamp(searchParams.get('category')?.trim() ?? '', 34)
  const author = clamp(searchParams.get('author')?.trim() ?? '', 42)
  const date = clamp(searchParams.get('date')?.trim() ?? '', 24)
  const readTime = clamp(searchParams.get('read')?.trim() ?? '', 16)

  // Long headlines get a smaller size so they never overflow the canvas.
  const titleSize = title.length > 78 ? 60 : title.length > 52 ? 70 : 82

  const [bold, semibold, regular] = await Promise.all([
    readFile(
      new URL('../../../assets/fonts/inter-latin-700-normal.woff', import.meta.url)
    ),
    readFile(
      new URL('../../../assets/fonts/inter-latin-600-normal.woff', import.meta.url)
    ),
    readFile(
      new URL('../../../assets/fonts/inter-latin-400-normal.woff', import.meta.url)
    ),
  ])

  const meta = [author, date, readTime].filter(Boolean)

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: BRAND.bg,
        // Aurora mesh, matching the on-site hero treatment.
        backgroundImage: [
          `radial-gradient(900px 520px at 8% -12%, ${BRAND.iris}66, transparent 60%)`,
          `radial-gradient(760px 460px at 96% 4%, ${BRAND.cyan}40, transparent 58%)`,
          `radial-gradient(620px 420px at 58% 112%, ${BRAND.amber}26, transparent 62%)`,
        ].join(','),
        padding: '64px 72px',
        fontFamily: 'Inter',
        position: 'relative',
      }}
    >
      {/* Top accent rule */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          display: 'flex',
          backgroundImage: `linear-gradient(90deg, ${BRAND.iris}, ${BRAND.irisLight} 46%, ${BRAND.cyan})`,
        }}
      />

      {/* ── Header: mark + wordmark, category chip ───────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundImage: `linear-gradient(135deg, ${BRAND.iris}, ${BRAND.cyan})`,
              color: '#ffffff',
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            D
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: BRAND.text,
              letterSpacing: '-0.02em',
            }}
          >
            {siteConfig.name}
          </div>
        </div>

        {category ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              height: 44,
              padding: '0 22px',
              borderRadius: 999,
              backgroundColor: `${BRAND.irisLight}24`,
              border: `1px solid ${BRAND.irisLight}59`,
              color: BRAND.irisLight,
              fontSize: 21,
              fontWeight: 600,
              letterSpacing: '0.02em',
            }}
          >
            {category}
          </div>
        ) : null}
      </div>

      {/* ── Headline ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        <div
          style={{
            display: 'flex',
            fontSize: titleSize,
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: '-0.035em',
            color: BRAND.text,
            // Keeps a very long headline from colliding with the footer row.
            maxWidth: 1010,
          }}
        >
          {title}
        </div>

        {!rawTitle ? (
          <div
            style={{
              display: 'flex',
              fontSize: 28,
              color: BRAND.muted,
              maxWidth: 880,
              lineHeight: 1.45,
            }}
          >
            {siteConfig.tagline}
          </div>
        ) : null}
      </div>

      {/* ── Footer: byline + domain ──────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: `1px solid ${BRAND.surface}`,
          paddingTop: 26,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 24,
            color: BRAND.muted,
          }}
        >
          {meta.length > 0 ? (
            meta.map((part, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {i > 0 ? (
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 999,
                      backgroundColor: BRAND.muted,
                      display: 'flex',
                    }}
                  />
                ) : null}
                <div style={{ display: 'flex' }}>{part}</div>
              </div>
            ))
          ) : (
            <div style={{ display: 'flex' }}>Engineering guides for people who ship</div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 24,
            fontWeight: 600,
            color: BRAND.irisLight,
          }}
        >
          {siteConfig.domain}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Inter', data: bold, weight: 700, style: 'normal' },
        { name: 'Inter', data: semibold, weight: 600, style: 'normal' },
        { name: 'Inter', data: regular, weight: 400, style: 'normal' },
      ],
      headers: {
        // Social scrapers re-fetch often; let the CDN absorb it.
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, immutable',
      },
    }
  )
}

/** Trim to a budget on a word boundary so the card never shows a cut word. */
function clamp(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}
