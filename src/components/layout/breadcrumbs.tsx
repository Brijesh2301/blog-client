import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

import { breadcrumbSchema, type Crumb } from '@/lib/jsonld'
import { cn } from '@/lib/utils'
import { JsonLd } from '@/components/seo/json-ld'

/**
 * Breadcrumb trail. Server component, so the links and the matching
 * BreadcrumbList JSON-LD are both in the initial HTML.
 *
 * The visible trail and the structured data are generated from ONE array,
 * which is what stops them drifting apart (a common Rich Results failure).
 *
 * The final crumb is the current page: it is rendered as text with
 * aria-current, not as a link, and its JSON-LD item is omitted accordingly.
 */
export function Breadcrumbs({
  items,
  className,
  path = '/',
  withSchema = true,
}: {
  items: Crumb[]
  className?: string
  /** Path used to build a stable @id for the schema node. */
  path?: string
  withSchema?: boolean
}) {
  if (items.length === 0) return null
  const trail: Crumb[] = [{ name: 'Home', href: '/' }, ...items]

  return (
    <>
      {withSchema ? (
        <JsonLd id="ld-breadcrumb" data={breadcrumbSchema(trail, path)} />
      ) : null}
      <nav aria-label="Breadcrumb" className={cn('w-full', className)}>
        <ol className="text-meta text-foreground-subtle flex flex-wrap items-center gap-x-1.5 gap-y-1">
          {trail.map((crumb, i) => {
            const isLast = i === trail.length - 1
            return (
              <li key={crumb.href} className="flex items-center gap-1.5">
                {i > 0 ? (
                  <ChevronRight
                    aria-hidden="true"
                    className="text-foreground-subtle/60 size-3.5 shrink-0"
                  />
                ) : null}
                {isLast ? (
                  <span aria-current="page" className="text-foreground-muted font-medium">
                    {crumb.name}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="hover:text-foreground rounded transition-colors"
                  >
                    {crumb.name}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
