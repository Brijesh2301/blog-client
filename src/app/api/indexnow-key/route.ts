/**
 * INDEXNOW KEY FILE
 *
 * IndexNow verifies domain ownership by fetching `https://<host>/<key>.txt`
 * and checking it contains exactly the key. The file therefore has to sit at
 * the domain ROOT, which a Next route cannot express directly without a
 * catch-all that would swallow every unknown top-level path.
 *
 * Instead `next.config.ts` rewrites `/<key>.txt` to this route, with the key
 * baked in at build time. The rewrite only exists when INDEXNOW_KEY is set, so
 * there is no endpoint to probe when the feature is off.
 */
export function GET() {
  const key = process.env.INDEXNOW_KEY

  if (!key) {
    return new Response('Not found', { status: 404 })
  }

  return new Response(key, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // The key is static for the life of the domain.
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
    },
  })
}
