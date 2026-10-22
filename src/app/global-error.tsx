'use client'

import * as React from 'react'

import './globals.css'

/**
 * Root error boundary — catches failures in the root layout itself.
 *
 * It REPLACES the root layout when it renders, so it must supply its own
 * <html> and <body>. That also means none of the app providers, fonts or
 * theme classes are available here, so the styling is deliberately
 * self-contained and uses the raw design tokens from globals.css plus a
 * system font stack.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error('[global-error]', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          padding: '2rem 1rem',
          background: 'var(--background)',
          color: 'var(--foreground)',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <main style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.6875rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              fontWeight: 650,
              color: 'var(--foreground-subtle)',
            }}
          >
            Devlume
          </p>

          <h1
            style={{
              margin: '0.75rem 0 0',
              fontSize: 'clamp(1.75rem, 1.4rem + 1.8vw, 2.5rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.028em',
              fontWeight: 700,
            }}
          >
            The site failed to load
          </h1>

          <p
            style={{
              margin: '1rem 0 0',
              fontSize: '1rem',
              lineHeight: 1.65,
              color: 'var(--foreground-muted)',
            }}
          >
            A problem in the application shell stopped the page from rendering. Reloading
            usually clears it.
          </p>

          {error.digest ? (
            <p
              style={{
                margin: '1.25rem 0 0',
                fontFamily: 'ui-monospace, Menlo, monospace',
                fontSize: '0.8125rem',
                color: 'var(--foreground-subtle)',
              }}
            >
              Reference: {error.digest}
            </p>
          ) : null}

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '2rem',
              height: '2.75rem',
              padding: '0 1.5rem',
              borderRadius: '0.75rem',
              border: 'none',
              cursor: 'pointer',
              background: 'var(--primary)',
              color: 'var(--foreground-onbrand)',
              fontSize: '0.9375rem',
              fontWeight: 500,
              fontFamily: 'inherit',
            }}
          >
            Reload the page
          </button>
        </main>
      </body>
    </html>
  )
}
