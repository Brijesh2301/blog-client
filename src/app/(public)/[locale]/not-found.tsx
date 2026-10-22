import type { Metadata } from 'next'
import { ArrowRight, Compass, Home, Search } from 'lucide-react'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { categories, mainNav } from '@/config/navigation'
import { cn } from '@/lib/utils'

/**
 * Custom 404.
 *
 * Next returns a real 404 status for this route, which is what matters for
 * SEO: a soft-404 (200 status with "not found" copy) gets the URL indexed as
 * thin content. It is also explicitly noindex as a second line of defence.
 *
 * It offers three real recovery paths — search, main nav, and every topic —
 * so a bad link is never a dead end for a visitor or a crawler.
 */
export const metadata: Metadata = {
  title: 'Page not found',
  description:
    'That page does not exist or has moved. Search Devlume or browse our engineering topics to find what you were looking for.',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <Container width="content" className="py-20 sm:py-28">
      <div className="flex flex-col items-center text-center">
        {/* Illustration: concentric rings with a drifting compass needle. */}
        <div
          aria-hidden="true"
          className="relative mb-10 grid size-32 place-items-center"
        >
          <span className="border-border absolute inset-0 rounded-full border" />
          <span className="border-border/70 absolute inset-4 rounded-full border" />
          <span className="border-border/40 absolute inset-8 rounded-full border" />
          <span className="mesh-aurora absolute inset-6 rounded-full opacity-60 blur-xl" />
          <Compass className="animate-float text-primary relative size-10" />
        </div>

        <Badge variant="outline" size="md" className="font-mono-ui">
          404
        </Badge>

        <h1 className="text-h1 mt-5 font-bold">This page does not exist</h1>

        <p className="text-foreground-muted mt-4 max-w-md text-base leading-relaxed">
          The link may be broken, or the article may have moved. Every redirect we know
          about is already in place, so this one is genuinely gone.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/">
              <Home aria-hidden="true" />
              Back home
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/search">
              <Search aria-hidden="true" />
              Search articles
            </Link>
          </Button>
        </div>

        <nav
          aria-label="Suggested pages"
          className="border-hairline mt-14 w-full border-t pt-10"
        >
          <h2 className="text-eyebrow text-foreground-subtle font-sans uppercase">
            Popular destinations
          </h2>

          <ul className="mt-5 flex flex-wrap justify-center gap-2">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="border-border bg-surface text-foreground-muted hover:border-border-strong hover:text-foreground inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-all hover:-translate-y-0.5"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>

          <ul className="mt-8 grid gap-3 text-left sm:grid-cols-2">
            {categories.slice(0, 4).map((category) => (
              <li key={category.slug}>
                <Card interactive padding="sm" className="h-full">
                  <Link href={category.href} className="flex items-center gap-3">
                    <span
                      className={cn(
                        'grid size-9 shrink-0 place-items-center rounded-lg',
                        category.tone
                      )}
                    >
                      <category.icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-foreground block text-sm font-semibold">
                        {category.title}
                      </span>
                      <span className="text-foreground-muted mt-0.5 block truncate text-xs">
                        {category.description}
                      </span>
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      className="text-foreground-subtle size-4 shrink-0 transition-transform group-hover/card:translate-x-0.5"
                    />
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </Container>
  )
}
