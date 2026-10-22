'use client'

import { RefreshCw, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'

/**
 * Route-level error boundary (500-class failures inside a page).
 *
 * Must be a Client Component: `reset` re-renders the segment in place, which
 * needs client state. The digest is surfaced because it is the only handle a
 * reader can give support — the message itself is intentionally generic, since
 * production error messages are minified and can leak internals.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    // Phase 8 forwards this to the logging pipeline. Until then the browser
    // console is the record, and next dev mirrors it into the terminal.
    console.error('[route-error]', error)
  }, [error])

  return (
    <Container width="content" className="py-20 sm:py-28">
      <div className="flex flex-col items-center text-center">
        <span className="bg-danger-100 text-danger-700 dark:bg-danger-500/15 grid size-14 place-items-center rounded-2xl">
          <TriangleAlert className="size-7" aria-hidden="true" />
        </span>

        <h1 className="text-h1 mt-6 font-bold">Something broke on our side</h1>

        <p className="text-foreground-muted mt-4 max-w-md text-base leading-relaxed">
          This is our bug, not yours. Retrying usually works — the page failed while
          rendering, not while saving anything.
        </p>

        {error.digest ? (
          <p className="font-mono-ui text-meta text-foreground-subtle mt-5">
            Reference: {error.digest}
          </p>
        ) : null}

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onClick={reset}>
            <RefreshCw aria-hidden="true" />
            Try again
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/">Back home</Link>
          </Button>
        </div>
      </div>
    </Container>
  )
}
