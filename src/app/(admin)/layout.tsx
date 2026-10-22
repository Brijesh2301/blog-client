import type { Metadata, Viewport } from 'next'

import { RootDocument } from '@/components/layout/root-document'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * ADMIN ROOT LAYOUT
 * ═════════════════════════════════════════════════════════════════════════════
 * The second root layout. It exists because the public site's root lives
 * inside `[locale]`, and the admin must NOT be under a locale segment —
 * `/en/admin` would be a worse URL for no benefit, and the admin is a single
 * internal tool rather than translated content.
 *
 * So it is always English, and it is `noindex` at the document level as well
 * as in robots.txt and the proxy's X-Robots-Tag — three independent layers,
 * because an indexed admin is the kind of mistake that is embarrassing in a
 * search result for months.
 */
export const metadata: Metadata = {
  title: { default: 'Admin · Devlume', template: '%s · Admin · Devlume' },
  robots: { index: false, follow: false, nocache: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light dark',
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <RootDocument lang="en">{children}</RootDocument>
}
