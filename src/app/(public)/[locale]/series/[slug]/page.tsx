import type { Metadata } from 'next'
import { Clock } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ArchiveHeader } from '@/components/content/post-grid'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { JsonLd } from '@/components/seo/json-ld'
import { Container } from '@/components/ui/container'
import { getAllSeries, getSeries } from '@/lib/api'
import { collectionPageSchema, graph } from '@/lib/jsonld'
import { buildMetadata } from '@/lib/seo'
import { formatDate, isoDate } from '@/lib/utils'
import type { Locale } from '@/i18n/config'

/**
 * SERIES DETAIL.
 *
 * Rendered as an ordered list rather than a card grid: the reading order is
 * the whole point of a series, and a numbered list communicates that to both
 * readers and crawlers far better than a grid does.
 */

type Props = { params: Promise<{ locale: Locale; slug: string }> }

export async function generateStaticParams() {
  const series = await getAllSeries()
  return series.map((item) => ({ slug: item.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params
  const data = await getSeries(slug)
  if (!data) return { title: 'Series not found', robots: { index: false, follow: true } }

  return buildMetadata({
    title: data.series.metaTitle ?? data.series.title,
    description:
      data.series.metaDescription ??
      data.series.description ??
      `A ${data.series.postCount}-part series on ${data.series.title}.`,
    path: `/series/${data.series.slug}`,
    image: data.series.ogImage ?? undefined,
    locale,
  })
}

export default async function SeriesPage({ params }: Props) {
  const { slug } = await params
  const data = await getSeries(slug)
  if (!data) notFound()

  const { series, posts } = data

  return (
    <Container width="content" className="pb-16 pt-8 sm:pt-10">
      <JsonLd
        id="ld-series"
        data={graph(
          collectionPageSchema({
            name: series.title,
            description: series.description ?? '',
            path: `/series/${series.slug}`,
            items: posts.map((post) => ({ title: post.title, slug: post.slug })),
          })
        )}
      />

      <Breadcrumbs
        items={[
          { name: 'Series', href: '/series' },
          { name: series.title, href: `/series/${series.slug}` },
        ]}
        path={`/series/${series.slug}`}
      />

      <ArchiveHeader
        eyebrow={`${series.postCount}-part series`}
        title={series.title}
        intro={series.description}
      />

      {posts.length === 0 ? (
        <p className="text-foreground-muted mt-12">
          The first part of this series is being written.
        </p>
      ) : (
        <ol className="mt-12 flex flex-col gap-3">
          {posts.map((post, i) => (
            <li key={post.id}>
              <Link
                href={`/blog/${post.slug}`}
                className="border-border bg-surface hover:border-border-strong group flex items-start gap-4 rounded-xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-sm"
              >
                <span
                  aria-hidden="true"
                  className="bg-primary-soft font-display tabular text-primary grid size-9 shrink-0 place-items-center rounded-lg text-sm font-semibold"
                >
                  {post.seriesPosition ?? i + 1}
                </span>

                <span className="min-w-0 flex-1">
                  <h2 className="font-display text-h4 text-foreground group-hover:text-primary font-semibold tracking-tight">
                    {post.title}
                  </h2>
                  {post.excerpt ? (
                    <span className="text-foreground-muted mt-1.5 block text-sm leading-relaxed">
                      {post.excerpt}
                    </span>
                  ) : null}
                  <span className="text-meta text-foreground-subtle mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {post.publishedAt ? (
                      <time dateTime={isoDate(post.publishedAt)}>
                        {formatDate(post.publishedAt)}
                      </time>
                    ) : null}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" aria-hidden="true" />
                      {post.readingMinutes} min
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Container>
  )
}
