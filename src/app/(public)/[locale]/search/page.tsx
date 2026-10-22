import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PostCard } from '@/components/content/post-card'
import { Pagination } from '@/components/content/pagination'
import { SearchForm } from '@/components/content/search-form'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { Container } from '@/components/ui/container'
import { PostCardSkeleton } from '@/components/ui/skeleton'
import { siteConfig } from '@/config/site'
import { getPosts } from '@/lib/api'
import { toPage, toSearchTerm } from '@/lib/query'
import { buildMetadata } from '@/lib/seo'
import type { Locale } from '@/i18n/config'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * SEARCH — NOINDEX by design
 * ═════════════════════════════════════════════════════════════════════════════
 * Search result pages are the textbook example of what not to let into an
 * index: they are infinite (one URL per query), thin, and duplicate content
 * that already exists on the pages they link to. Google's own guidance is to
 * keep them out. So this page is `noindex, follow` — crawlers may follow the
 * links to real articles, but the result page itself never gets indexed.
 * `robots.ts` and `proxy.ts` block it as well, as defence in depth.
 *
 * It still renders results SERVER-SIDE from `?q=`. That means search works
 * with JavaScript disabled, is linkable and shareable, and the command palette
 * has a no-JS equivalent.
 */

type Props = {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams
  const term = toSearchTerm(params.q)

  return buildMetadata({
    title: term ? `Search: ${term}` : 'Search',
    description: `Search every ${siteConfig.name} article by keyword, topic or author.`,
    path: '/search',
    noIndex: true,
  })
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params
  return (
    <>
      <Container width="content" className="pt-8 sm:pt-10">
        <Breadcrumbs items={[{ name: 'Search', href: '/search' }]} path="/search" />

        <header className="mt-6 flex flex-col gap-4">
          <p className="text-eyebrow text-primary font-sans uppercase">Search</p>
          <h1 className="text-h1 font-bold">Search the archive</h1>
          <p className="text-lead text-foreground-muted max-w-2xl">
            Full-text search across every published guide — titles, summaries and body
            copy.
          </p>
        </header>

        <Suspense fallback={<div className="bg-surface-2 mt-8 h-14 rounded-lg" />}>
          <SearchFormWrapper searchParams={searchParams} />
        </Suspense>
      </Container>

      <Suspense fallback={<ResultsSkeleton />}>
        <SearchResults searchParams={searchParams} locale={locale} />
      </Suspense>
    </>
  )
}

async function SearchFormWrapper({
  searchParams,
}: {
  searchParams: Props['searchParams']
}) {
  const params = await searchParams
  return <SearchForm defaultValue={toSearchTerm(params.q)} className="mt-8" />
}

async function SearchResults({
  searchParams,
  locale,
}: {
  searchParams: Props['searchParams']
  locale: Locale
}) {
  const params = await searchParams
  const term = toSearchTerm(params.q)
  const page = toPage(params.page)

  if (!term) {
    return (
      <Container className="py-16">
        <p className="text-foreground-muted text-center">
          Type a query above to search {siteConfig.name}.
        </p>
      </Container>
    )
  }

  const { items, pagination } = await getPosts({
    q: term,
    page,
    limit: siteConfig.postsPerPage,
    sort: 'relevance',
    locale,
  })

  if (items.length === 0) {
    return (
      <Container className="py-16">
        <div className="mx-auto max-w-md text-center">
          <h2 className="font-display text-h3 font-semibold">
            No matches for &ldquo;{term}&rdquo;
          </h2>
          <p className="text-foreground-muted mt-3 text-sm leading-relaxed">
            Try a broader term, or browse by topic. Search matches whole words, so a
            partial word will not match.
          </p>
        </div>
      </Container>
    )
  }

  return (
    <Container className="py-12">
      <p className="text-meta text-foreground-subtle mb-6">
        {pagination.total} result{pagination.total === 1 ? '' : 's'} for{' '}
        <strong className="text-foreground-muted font-semibold">{term}</strong>
        {pagination.totalPages > 1
          ? ` · page ${pagination.page} of ${pagination.totalPages}`
          : ''}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((post) => (
          <PostCard key={post.id} post={post} headingLevel="h2" />
        ))}
      </div>

      <Pagination
        pagination={pagination}
        basePath="/search"
        searchParams={{ q: term }}
        className="mt-12"
      />
    </Container>
  )
}

function ResultsSkeleton() {
  return (
    <Container className="py-12">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    </Container>
  )
}
