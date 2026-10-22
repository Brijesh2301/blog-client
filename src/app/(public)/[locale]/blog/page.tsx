import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PostCard } from '@/components/content/post-card'
import { Pagination } from '@/components/content/pagination'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { JsonLd } from '@/components/seo/json-ld'
import { Container } from '@/components/ui/container'
import { PostCardSkeleton } from '@/components/ui/skeleton'
import { getPosts } from '@/lib/api'
import { collectionPageSchema, graph } from '@/lib/jsonld'
import { paginatedMetadata } from '@/lib/seo'
import { siteConfig } from '@/config/site'
import type { Locale } from '@/i18n/config'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * ARTICLE INDEX
 * ═════════════════════════════════════════════════════════════════════════════
 * Rendering: the page shell (H1, intro, breadcrumb) is prerendered; the grid
 * depends on `searchParams`, which is a request-time API under Cache
 * Components, so it sits behind `<Suspense>`.
 *
 * That is still SEO-correct. Streaming delivers the grid inside the SAME HTML
 * response — it is not a client fetch — so a crawler reading the response body
 * sees every post and every link. What it buys is a fast first byte for the
 * shell instead of blocking the whole document on the query.
 *
 * Pagination is crawlable `?page=N` with self-referencing canonicals; see
 * `paginatedMetadata`.
 */

const PER_PAGE = siteConfig.postsPerPage

type Props = {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const BASE = {
  title: 'All articles',
  description:
    'Every Devlume guide in one place — Next.js, TypeScript, AI engineering, performance and systems design, newest first. Filter by topic or search.',
  path: '/blog',
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams
  const page = toPage(params.page)
  return paginatedMetadata(BASE, page)
}

export default async function BlogIndexPage({ params, searchParams }: Props) {
  const { locale } = await params
  return (
    <>
      <Container width="content" className="pt-8 sm:pt-10">
        <Breadcrumbs items={[{ name: 'Articles', href: '/blog' }]} path="/blog" />

        <header className="mt-6 flex flex-col gap-4">
          <p className="text-eyebrow text-primary font-sans uppercase">The archive</p>
          <h1 className="text-h1 text-balance font-bold">All articles</h1>
          <p className="text-lead text-foreground-muted max-w-2xl">
            Long-form engineering guides on {siteConfig.niche}. Every claim is measured,
            every author has shipped the thing they are writing about.
          </p>
        </header>
      </Container>

      <Suspense fallback={<GridSkeleton />}>
        <PostGrid searchParams={searchParams} locale={locale} />
      </Suspense>
    </>
  )
}

async function PostGrid({
  searchParams,
  locale,
}: {
  searchParams: Props['searchParams']
  locale: Locale
}) {
  const params = await searchParams
  const page = toPage(params.page)
  const sort = toSort(params.sort)

  const { items, pagination } = await getPosts({ page, limit: PER_PAGE, sort, locale })

  if (items.length === 0) {
    return (
      <Container className="py-20">
        <div className="mx-auto max-w-md text-center">
          <h2 className="font-display text-h3 font-semibold">Nothing here yet</h2>
          <p className="text-foreground-muted mt-3 text-sm leading-relaxed">
            {page > 1
              ? 'That page is past the end of the archive.'
              : 'The first guides are being written now. Subscribe and you will get the first one.'}
          </p>
        </div>
      </Container>
    )
  }

  return (
    <Container className="py-12">
      {/* CollectionPage + ItemList: tells Google this is a list of articles and
          names each one, rather than leaving it to infer from the markup. */}
      <JsonLd
        id="ld-collection"
        data={graph(
          collectionPageSchema({
            name: BASE.title,
            description: BASE.description,
            path: page > 1 ? `/blog?page=${page}` : '/blog',
            items: items.map((item) => ({ title: item.title, slug: item.slug })),
          })
        )}
      />

      <p className="text-meta text-foreground-subtle mb-6">
        {pagination.total} article{pagination.total === 1 ? '' : 's'}
        {pagination.totalPages > 1
          ? ` · page ${pagination.page} of ${pagination.totalPages}`
          : ''}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((post, i) => (
          <PostCard
            key={post.id}
            post={post}
            headingLevel="h2"
            // Only the first card is a plausible LCP element.
            priority={i === 0 && pagination.page === 1}
          />
        ))}
      </div>

      <Pagination
        pagination={pagination}
        basePath="/blog"
        searchParams={{ sort: sort === 'newest' ? undefined : sort }}
        className="mt-12"
      />
    </Container>
  )
}

function GridSkeleton() {
  return (
    <Container className="py-12">
      <div className="bg-surface-2 mb-6 h-4 w-32 rounded" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: PER_PAGE }, (_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    </Container>
  )
}

function toPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number.parseInt(raw ?? '1', 10)
  // Clamp rather than trust: `?page=-5` or `?page=abc` must not reach the API.
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 10_000) : 1
}

function toSort(value: string | string[] | undefined): 'newest' | 'oldest' | 'popular' {
  const raw = Array.isArray(value) ? value[0] : value
  return raw === 'oldest' || raw === 'popular' ? raw : 'newest'
}
