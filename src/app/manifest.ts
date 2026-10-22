import type { MetadataRoute } from 'next'

import { siteConfig } from '@/config/site'

/**
 * Web app manifest — served at /manifest.webmanifest
 *
 * Phase 6 adds the service worker for offline reading; the manifest is here
 * from Phase 1 so the install metadata and theme colours are correct from the
 * first deploy (and so Lighthouse PWA checks do not regress later).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    // Matches --background in each theme so the splash screen never flashes.
    background_color: '#fdfdff',
    theme_color: '#1b1a2e',
    categories: ['education', 'news', 'developer', 'technology'],
    lang: siteConfig.lang,
    dir: 'ltr',
    // SVG icons with sizes:"any" are valid and installable, and unlike the
    // icon.tsx file convention their URLs are stable (Next appends a content
    // hash to generated icon routes, so those cannot be hardcoded here).
    icons: [
      { src: '/brand/mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      {
        src: '/brand/maskable.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
