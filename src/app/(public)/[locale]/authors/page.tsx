import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { ArchiveHeader } from '@/components/content/post-grid'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { Card } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { siteConfig } from '@/config/site'
import { getAuthors } from '@/lib/api'
import { buildMetadata } from '@/lib/seo'
import type { Locale } from '@/i18n/config'

/**
 * AUTHOR INDEX.
 *
 * Part of the E-E-A-T story: a site that names its writers, with real roles and
 * credentials, reads very differently to a search quality rater than one that
 * does not. The API only returns authors with published work, so this page can
 * never list an empty profile.
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
    title: 'Authors',
    description: `The engineers writing for ${siteConfig.name}. Every author has shipped the systems they write about — real names, real credentials, no ghostwriting.`,
    path: '/authors',
    locale,
  })
}

export default async function AuthorsPage() {
  const authors = await getAuthors()

  return (
    <Container className="pb-16 pt-8 sm:pt-10">
      <Breadcrumbs items={[{ name: 'Authors', href: '/authors' }]} path="/authors" />
      <ArchiveHeader
        eyebrow="The team"
        title="Authors"
        intro="Every author here has shipped the thing they are writing about. Bylines carry real credentials and sources are cited inline."
      />

      {authors.length === 0 ? (
        <p className="text-foreground-muted mt-12">No authors have published yet.</p>
      ) : (
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {authors.map((author) => (
            <li key={author.id}>
              <Card interactive padding="md" className="h-full">
                <Link
                  href={`/author/${author.slug}`}
                  className="flex h-full flex-col gap-4"
                >
                  <span className="flex items-center gap-3">
                    <span className="bg-surface-2 relative size-12 shrink-0 overflow-hidden rounded-full">
                      {author.avatarUrl ? (
                        <Image
                          src={author.avatarUrl}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="bg-primary-soft font-display text-primary grid size-full place-items-center font-semibold"
                        >
                          {author.name.charAt(0)}
                        </span>
                      )}
                    </span>

                    <span className="min-w-0">
                      <h2 className="font-display text-h4 font-semibold tracking-tight">
                        {author.name}
                      </h2>
                      {author.jobTitle ? (
                        <span className="text-meta text-foreground-muted block truncate">
                          {author.jobTitle}
                        </span>
                      ) : null}
                    </span>
                  </span>

                  {author.bio ? (
                    <p className="text-foreground-muted line-clamp-3 text-sm leading-relaxed">
                      {author.bio}
                    </p>
                  ) : null}

                  <span className="text-meta text-foreground-subtle mt-auto pt-1">
                    {author.postCount} article{author.postCount === 1 ? '' : 's'}
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
