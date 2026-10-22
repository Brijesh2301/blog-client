import { PostCard } from '@/components/content/post-card'
import { Pagination } from '@/components/content/pagination'
import { JsonLd } from '@/components/seo/json-ld'
import { Container } from '@/components/ui/container'
import { collectionPageSchema, graph } from '@/lib/jsonld'
import type { Paginated, PostCard as PostCardType } from '@/types/content'

/**
 * Shared archive grid: the body of every listing page (blog, category, tag,
 * author, series).
 *
 * Centralised so the crawlable-pagination guarantee, the CollectionPage
 * JSON-LD and the "first card is the only priority image" rule are implemented
 * once and cannot drift between archives.
 */
export function PostGrid({
  data,
  basePath,
  searchParams = {},
  collection,
  emptyTitle = 'Nothing here yet',
  emptyBody,
}: {
  data: Paginated<PostCardType>
  basePath: string
  searchParams?: Record<string, string | undefined>
  /** Omit to skip CollectionPage schema (e.g. on a noindex archive). */
  collection?: { name: string; description: string }
  emptyTitle?: string
  emptyBody?: string
}) {
  const { items, pagination } = data

  if (items.length === 0) {
    return (
      <Container className="py-20">
        <div className="mx-auto max-w-md text-center">
          <h2 className="font-display text-h3 font-semibold">{emptyTitle}</h2>
          <p className="text-foreground-muted mt-3 text-sm leading-relaxed">
            {emptyBody ??
              (pagination.page > 1
                ? 'That page is past the end of this archive.'
                : 'No articles have been published here yet.')}
          </p>
        </div>
      </Container>
    )
  }

  const path = pagination.page > 1 ? `${basePath}?page=${pagination.page}` : basePath

  return (
    <Container className="py-12">
      {collection ? (
        <JsonLd
          id="ld-collection"
          data={graph(
            collectionPageSchema({
              name: collection.name,
              description: collection.description,
              path,
              items: items.map((item) => ({ title: item.title, slug: item.slug })),
            })
          )}
        />
      ) : null}

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
            priority={i === 0 && pagination.page === 1}
          />
        ))}
      </div>

      <Pagination
        pagination={pagination}
        basePath={basePath}
        searchParams={searchParams}
        className="mt-12"
      />
    </Container>
  )
}

/** Shared header for archive pages, so the hierarchy is identical everywhere. */
export function ArchiveHeader({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string
  title: string
  intro?: string | null
  children?: React.ReactNode
}) {
  return (
    <header className="mt-6 flex flex-col gap-4">
      <p className="text-eyebrow text-primary font-sans uppercase">{eyebrow}</p>
      {/* The single H1 for the route. */}
      <h1 className="text-h1 text-balance font-bold">{title}</h1>
      {intro ? (
        <p className="text-lead text-foreground-muted max-w-2xl">{intro}</p>
      ) : null}
      {children}
    </header>
  )
}
