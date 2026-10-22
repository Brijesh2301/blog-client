import type { Metadata } from 'next'
import { Suspense } from 'react'

import { LoginForm } from '@/components/admin/login-form'
import { Logo } from '@/components/brand/logo'
import { Container } from '@/components/ui/container'

/**
 * Sign in.
 *
 * NOINDEX: a login page in the index is a phishing target and ranks for brand
 * queries ahead of real content. Also blocked in robots.ts and by the
 * X-Robots-Tag in proxy.ts.
 */
export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to the Devlume editorial dashboard.',
  robots: { index: false, follow: false, nocache: true },
}

export default function LoginPage() {
  return (
    <Container width="content" className="grid min-h-[70dvh] place-items-center py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Logo href="/" />
          <div>
            <h1 className="font-display text-h2 font-semibold tracking-tight">Sign in</h1>
            <p className="text-foreground-muted mt-2 text-sm">Editorial access only.</p>
          </div>
        </div>

        {/* useSearchParams reads the ?next= target, which is request-time data. */}
        <Suspense fallback={<div className="bg-surface-2 h-64 rounded-xl" />}>
          <LoginForm />
        </Suspense>
      </div>
    </Container>
  )
}
