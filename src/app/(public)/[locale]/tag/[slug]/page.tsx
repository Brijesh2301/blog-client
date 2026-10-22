import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { ArchiveHeader, PostGrid } from '@/components/content/post-grid'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { Container } from '@/components/ui/container'
import { PostCardSkeleton } from '@/components/ui/skeleton'
import { siteConfig } from '@/config/site'
import { getPosts, getTag, getTags } from '@/lib/api'
import { toPage } from '@/lib/query'
import { paginatedMetadata } from '@/lib/seo'
import type { Locale } from '@/i18n/config'

/**
 * TAG ARCHIVE.
 *
 * Tags are the classic thin-content trap: a blog with 200 tags, most carrying
 * one post, adds 200 near-empty pages to the index and dilutes crawl budget.
 * The API marks a tag `shouldIndex: false` below a post-count threshold, and
 * this page honours it — noindex but still `follow`, so the posts remain
 * discoverable through it.
 */

type Props = {
  params: Promise<{ locale: Locale; slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateStaticParams() {
  const tags = await getTags()
  // Only prerender tags that are actually indexable; the rest render on demand.
  return tags.filter((tag) => tag.shouldIndex).map((tag) => ({ slug: tag.slug }))
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const tag = await getTag(slug)
  if (!tag) return { title: 'Tag not found', robots: { index: false, follow: true } }

  return paginatedMetadata(
    {
      title: tag.metaTitle ?? `${tag.name} articles`,
      description:
        tag.metaDescription ??
        tag.description ??
        `Every ${siteConfig.name} article tagged ${tag.name}, newest first.`,
      path: `/tag/${tag.slug}`,
      noIndex: !tag.shouldIndex,
    },
    toPage(query.page)
  )
}

export default async function TagPage({ params, searchParams }: Props) {
  const { slug, locale } = await params
  const tag = await getTag(slug)
  if (!tag) notFound()

  return (
    <>
      <Container width="content" className="pt-8 sm:pt-10">
        <Breadcrumbs
          items={[
            { name: 'Articles', href: '/blog' },
            { name: `#${tag.name}`, href: `/tag/${tag.slug}` },
          ]}
          path={`/tag/${tag.slug}`}
        />
        <ArchiveHeader
          eyebrow="Tag"
          title={`#${tag.name}`}
          intro={tag.description ?? `Everything tagged ${tag.name}.`}
        />
      </Container>

      <Suspense fallback={<GridFallback />}>
        <TagPosts
          slug={tag.slug}
          name={tag.name}
          indexable={tag.shouldIndex}
          search={searchParams}
          locale={locale}
        />
      </Suspense>
    </>
  )
}

async function TagPosts({
  slug,
  name,
  indexable,
  search,
  locale,
}: {
  slug: string
  name: string
  indexable: boolean
  search: Props['searchParams']
  locale: Locale
}) {
  const query = await search
  const data = await getPosts({
    tag: slug,
    page: toPage(query.page),
    limit: siteConfig.postsPerPage,
    locale,
  })

  return (
    <PostGrid
      data={data}
      basePath={`/tag/${slug}`}
      // No CollectionPage schema on a noindex page: marking up a page we are
      // asking Google to ignore is contradictory.
      collection={
        indexable
          ? { name: `${name} articles`, description: `Articles tagged ${name}.` }
          : undefined
      }
      emptyTitle={`Nothing tagged ${name} yet`}
    />
  )
}

function GridFallback() {
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
