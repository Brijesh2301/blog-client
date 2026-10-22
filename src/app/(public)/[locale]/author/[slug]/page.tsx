

import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { GitHubIcon, LinkedInIcon, XIcon } from '@/components/brand/brand-icons'
import { PostGrid } from '@/components/content/post-grid'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { JsonLd } from '@/components/seo/json-ld'
import { Container } from '@/components/ui/container'
import { PostCardSkeleton } from '@/components/ui/skeleton'
import { siteConfig } from '@/config/site'
import { getAuthor, getAuthors, getPosts } from '@/lib/api'
import { graph, personSchema } from '@/lib/jsonld'
import { toPage } from '@/lib/query'
import { paginatedMetadata } from '@/lib/seo'
import { truncate } from '@/lib/utils'
import type { Locale } from '@/i18n/config'

/**
 * AUTHOR PAGE — a primary E-E-A-T surface.
 *
 * The bio, role, credentials and verified social profiles are exactly the
 * signals Google uses to judge whether content comes from a real practitioner,
 * and the same fields are emitted as Person JSON-LD linked to every article
 * they wrote.
 *
 * The API only returns authors with at least one published post, so an empty
 * author page can never exist to be indexed as thin content.
 */

type Props = {
  params: Promise<{ locale: Locale; slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateStaticParams() {
  const authors = await getAuthors()
  if (!authors.length) return [{ slug: '_placeholder' }]

  return authors.map((author) => ({ slug: author.slug }))
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
 const { slug } = await params
const author = await getAuthor(slug)
if (!author)
  return { title: 'Author not found', robots: { index: false, follow: true } }
const query = await searchParams

  const description = author.bio
    ? truncate(author.bio, 160)
    : `${author.name} writes for ${siteConfig.name}. ${author.postCount} published guides.`

  return paginatedMetadata(
    {
      title: `${author.name} — ${author.jobTitle ?? 'Author'}`,
      description,
      path: `/author/${author.slug}`,
      type: 'profile',
      image: author.avatarUrl ?? undefined,
    },
    toPage(query.page)
  )
}

export default async function AuthorPage({ params, searchParams }: Props) {
  const { slug, locale } = await params
  const author = await getAuthor(slug)
  if (!author) notFound()

  const socials = [
    { key: 'x', label: `${author.name} on X`, Icon: XIcon },
    { key: 'github', label: `${author.name} on GitHub`, Icon: GitHubIcon },
    { key: 'linkedin', label: `${author.name} on LinkedIn`, Icon: LinkedInIcon },
  ].filter((item) => Boolean(author.socials?.[item.key]))

  return (
    <>
      <JsonLd
        id="ld-author"
        data={graph(
          personSchema({
            name: author.name,
            slug: author.slug,
            bio: author.bio ?? undefined,
            avatar: author.avatarUrl ?? undefined,
            jobTitle: author.jobTitle ?? undefined,
            sameAs: Object.values(author.socials ?? {}),
            knowsAbout: author.knowsAbout ?? undefined,
          })
        )}
      />

      <Container width="content" className="pt-8 sm:pt-10">
        <Breadcrumbs
          items={[
            { name: 'Authors', href: '/authors' },
            { name: author.name, href: `/author/${author.slug}` },
          ]}
          path={`/author/${author.slug}`}
        />

        <header className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
          <div className="bg-surface-2 relative size-24 shrink-0 overflow-hidden rounded-2xl">
            {author.avatarUrl ? (
              <Image
                src={author.avatarUrl}
                alt=""
                fill
                sizes="96px"
                className="object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="bg-primary-soft font-display text-primary grid size-full place-items-center text-3xl font-semibold"
              >
                {author.name.charAt(0)}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-eyebrow text-primary font-sans uppercase">Author</p>
            <h1 className="text-h1 mt-2 font-bold">{author.name}</h1>
            {author.jobTitle ? (
              <p className="text-lead text-foreground-muted mt-2">{author.jobTitle}</p>
            ) : null}
            {author.bio ? (
              <p className="text-foreground-muted mt-4 max-w-2xl leading-relaxed">
                {author.bio}
              </p>
            ) : null}
            {author.credentials ? (
              <p className="text-meta text-foreground-subtle mt-3 max-w-2xl leading-relaxed">
                {author.credentials}
              </p>
            ) : null}

            {author.knowsAbout?.length ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {author.knowsAbout.map((topic) => (
                  <li
                    key={topic}
                    className="bg-surface-2 text-foreground-muted inline-flex h-6 items-center rounded-full px-2.5 text-xs"
                  >
                    {topic}
                  </li>
                ))}
              </ul>
            ) : null}

            {socials.length > 0 ? (
              <ul className="mt-5 flex items-center gap-2">
                {socials.map(({ key, label, Icon }) => (
                  <li key={key}>
                    <a
                      href={author.socials![key]}
                      target="_blank"
                      rel="noopener noreferrer me"
                      aria-label={label}
                      className="border-border bg-surface text-foreground-muted hover:text-foreground grid size-9 place-items-center rounded-lg border transition-colors"
                    >
                      <Icon className="size-4" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </header>
      </Container>

      <Suspense fallback={<GridFallback />}>
        <AuthorPosts
          slug={author.slug}
          name={author.name}
          search={searchParams}
          locale={locale}
        />
      </Suspense>
    </>
  )
}

async function AuthorPosts({
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
  const data = await getPosts({
    author: slug,
    page: toPage(query.page),
    limit: siteConfig.postsPerPage,
    locale,
  })

  return (
    <PostGrid
      data={data}
      basePath={`/author/${slug}`}
      collection={{
        name: `Articles by ${name}`,
        description: `Everything ${name} has published.`,
      }}
      emptyTitle={`${name} has not published yet`}
    />
  )
}

function GridFallback() {
  return (
    <Container className="py-12">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    </Container>
  )
}