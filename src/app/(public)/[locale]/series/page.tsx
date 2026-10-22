import type { Metadata } from 'next'
import { ArrowRight, Layers } from 'lucide-react'
import Link from 'next/link'

import { ArchiveHeader } from '@/components/content/post-grid'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { Card } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { getAllSeries } from '@/lib/api'
import { buildMetadata } from '@/lib/seo'
import type { Locale } from '@/i18n/config'

/**
 * SERIES INDEX.
 *
 * Series are the topic-cluster surface: a pillar subject broken into ordered
 * parts that link to each other. For SEO this is what turns a pile of related
 * posts into a structure Google can read as topical depth.
 */
/**
 * Metadata is a FUNCTION, not a constant, because the canonical and the
 * `og:locale` depend on which language this page is being rendered in.
 * A constant would hardcode the English canonical onto the Hindi page,
 * which tells Google to drop the Hindi version entirely.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  return buildMetadata({
    title: 'Series',
    description:
      'Multi-part Devlume guides that build on each other — rendering end to end, shipping LLM features, and more. Read them in order or dip in.',
    path: '/series',
    locale,
  })
}

export default async function SeriesIndexPage() {
  const series = await getAllSeries()

  return (
    <Container className="pb-16 pt-8 sm:pt-10">
      <Breadcrumbs items={[{ name: 'Series', href: '/series' }]} path="/series" />
      <ArchiveHeader
        eyebrow="Collections"
        title="Series"
        intro="Subjects too big for one article, broken into ordered parts that build on each other."
      />

      {series.length === 0 ? (
        <p className="text-foreground-muted mt-12">No series have been published yet.</p>
      ) : (
        <ul className="mt-12 grid gap-4 sm:grid-cols-2">
          {series.map((item) => (
            <li key={item.id}>
              <Card interactive padding="lg" className="h-full">
                <Link
                  href={`/series/${item.slug}`}
                  className="flex h-full flex-col gap-4"
                >
                  <span className="bg-primary-soft text-primary grid size-11 place-items-center rounded-xl">
                    <Layers className="size-5" aria-hidden="true" />
                  </span>

                  <span className="flex flex-col gap-2">
                    <h2 className="font-display text-h3 font-semibold tracking-tight">
                      {item.title}
                    </h2>
                    {item.description ? (
                      <span className="text-foreground-muted text-sm leading-relaxed">
                        {item.description}
                      </span>
                    ) : null}
                  </span>

                  <span className="text-meta text-foreground-subtle mt-auto flex items-center justify-between pt-2">
                    <span>
                      {item.postCount} part{item.postCount === 1 ? '' : 's'}
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      className="text-primary size-4 transition-transform group-hover/card:translate-x-1"
                    />
                  </span>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </Container>
  )
}
