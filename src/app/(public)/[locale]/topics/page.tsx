import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { ArchiveHeader } from '@/components/content/post-grid'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { getCategories, getTags } from '@/lib/api'
import { buildMetadata } from '@/lib/seo'
import { cn } from '@/lib/utils'
import type { Locale } from '@/i18n/config'

/**
 * TOPIC HUB.
 *
 * This page is what makes the flat-architecture guarantee true: every category
 * and every tag is one click from here, and this page is one click from the
 * header, so no archive is ever more than three clicks from the homepage.
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
    title: 'All topics',
    description:
      'Every subject Devlume covers — web development, AI engineering, TypeScript, performance, backend, systems design, security and developer tooling.',
    path: '/topics',
    locale,
  })
}

export default async function TopicsPage() {
  const [categories, tags] = await Promise.all([getCategories(), getTags()])

  // Noindex tags are still listed here. They are useful navigation, and
  // linking them is how the posts underneath them stay discoverable.
  const sortedTags = [...tags].sort((a, b) => b.postCount - a.postCount)

  return (
    <Container className="pb-16 pt-8 sm:pt-10">
      <Breadcrumbs items={[{ name: 'Topics', href: '/topics' }]} path="/topics" />
      <ArchiveHeader
        eyebrow="Browse"
        title="All topics"
        intro="Eight areas, covered in depth. Pick one, or search the whole archive."
      />

      <section aria-labelledby="categories-heading" className="mt-12">
        <h2 id="categories-heading" className="sr-only">
          Categories
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id} interactive padding="md" className="h-full">
              <Link
                href={`/category/${category.slug}`}
                className="flex h-full flex-col gap-3"
              >
                <span className="flex items-center gap-2">
                  <h3 className="font-display text-h4 font-semibold tracking-tight">
                    {category.name}
                  </h3>
                  {category.featured ? (
                    <Badge variant="pick" size="sm">
                      Core
                    </Badge>
                  ) : null}
                </span>

                {category.description ? (
                  <p className="text-foreground-muted text-sm leading-relaxed">
                    {category.description}
                  </p>
                ) : null}

                <span className="text-meta text-foreground-subtle mt-auto flex items-center justify-between pt-2">
                  <span>
                    {category.postCount} article{category.postCount === 1 ? '' : 's'}
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="text-primary size-4 transition-transform group-hover/card:translate-x-1"
                  />
                </span>
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {sortedTags.length > 0 ? (
        <section aria-labelledby="tags-heading" className="mt-16">
          <h2 id="tags-heading" className="text-h3 font-semibold tracking-tight">
            Tags
          </h2>
          <ul className="mt-6 flex flex-wrap gap-2">
            {sortedTags.map((tag) => (
              <li key={tag.id}>
                <Link
                  href={`/tag/${tag.slug}`}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5',
                    'text-sm transition-all hover:-translate-y-0.5',
                    tag.shouldIndex
                      ? 'border-border bg-surface text-foreground-muted hover:border-border-strong hover:text-foreground'
                      : 'border-border text-foreground-subtle hover:text-foreground-muted border-dashed bg-transparent'
                  )}
                >
                  #{tag.name}
                  <span className="tabular text-foreground-subtle text-[0.6875rem]">
                    {tag.postCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Container>
  )
}
