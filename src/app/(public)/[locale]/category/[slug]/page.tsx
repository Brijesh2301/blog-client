import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { ArchiveHeader, PostGrid } from '@/components/content/post-grid'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { Container } from '@/components/ui/container'
import { PostCardSkeleton } from '@/components/ui/skeleton'
import { siteConfig } from '@/config/site'
import { getCategories, getCategory, getPosts } from '@/lib/api'
import { paginatedMetadata } from '@/lib/seo'
import { toPage } from '@/lib/query'
import type { Locale } from '@/i18n/config'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * CATEGORY ARCHIVE
 * ═════════════════════════════════════════════════════════════════════════════
 * Indexability is conditional, not automatic. A category page with no unique
 * `introText` is a bare list of links — thin content — so it is served
 * `noindex`. The API computes `shouldIndex`; the rule lives in one place and
 * the admin can see why a page is excluded.
 */

type Props = {
  params: Promise<{ locale: Locale; slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateStaticParams() {
  const categories = await getCategories()
  return categories.map((category) => ({ slug: category.slug }))
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const category = await getCategory(slug)

  if (!category) {
    return { title: 'Topic not found', robots: { index: false, follow: true } }
  }

  const description =
    category.metaDescription ??
    category.description ??
    `Every ${category.name} guide on ${siteConfig.name}.`

  return paginatedMetadata(
    {
      title: category.metaTitle ?? `${category.name} guides`,
      description,
      path: `/category/${category.slug}`,
      canonical: category.canonicalUrl ?? undefined,
      image: category.ogImage ?? undefined,
      // Thin archives stay out of the index but keep `follow`, so the posts
      // they link to are still discovered.
      noIndex: category.noIndex || category.shouldIndex === false,
    },
    toPage(query.page)
  )
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug, locale } = await params
  const category = await getCategory(slug)
  if (!category) notFound()

  return (
    <>
      <Container width="content" className="pt-8 sm:pt-10">
        <Breadcrumbs
          items={[
            { name: 'Articles', href: '/blog' },
            { name: category.name, href: `/category/${category.slug}` },
          ]}
          path={`/category/${category.slug}`}
        />
        <ArchiveHeader
          eyebrow="Topic"
          title={category.name}
          intro={category.introText ?? category.description}
        />
      </Container>

      <Suspense fallback={<GridFallback />}>
        <CategoryPosts
          slug={category.slug}
          name={category.name}
          search={searchParams}
          locale={locale}
        />
      </Suspense>
    </>
  )
}

async function CategoryPosts({
  slug,
  name,
  search,
  locale,
}: {
  slug: string
  name: string
  search: Props['searchParams']
  locale: Locale
}) {
  const query = await search
  const page = toPage(query.page)
  const data = await getPosts({ category: slug, page, limit: siteConfig.postsPerPage, locale })

  return (
    <PostGrid
      data={data}
      basePath={`/category/${slug}`}
      collection={{
        name: `${name} guides`,
        description: `Articles filed under ${name}.`,
      }}
      emptyTitle={`No ${name} articles yet`}
      emptyBody="This topic is on the editorial calendar. Subscribe and you will get the first one."
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
