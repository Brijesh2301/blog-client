import type { Metadata } from 'next'
import { Suspense } from 'react'

import { AdminShell } from '@/components/admin/admin-shell'

/**
 * Admin layout.
 *
 * NOINDEX at four independent levels, because a leaked admin URL in the index
 * is both an information leak and a crawl-budget waste:
 *   1. this metadata block,
 *   2. the X-Robots-Tag header set in proxy.ts,
 *   3. the Disallow rule in robots.ts,
 *   4. the API refusing every request without a valid session anyway.
 */
export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Admin' },
  robots: { index: false, follow: false, nocache: true, noarchive: true },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  /*
   * AdminShell reads usePathname() for nav highlighting and the sign-in
   * redirect. That is request-time data, which blocks dynamic routes such as
   * /admin/posts/[id] from prerendering. Suspense is the right answer here
   * with no downside: the admin is client-authenticated and never indexed, so
   * there is nothing to lose by streaming it — and the shell already renders a
   * session-checking state on first paint.
   */
  return (
    <Suspense
      fallback={
        <div className="grid min-h-dvh place-items-center">
          <p className="text-foreground-muted text-sm" role="status">
            Loading…
          </p>
        </div>
      }
    >
      <AdminShell>{children}</AdminShell>
    </Suspense>
  )
}
