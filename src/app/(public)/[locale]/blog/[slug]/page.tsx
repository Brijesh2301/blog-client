import type { Metadata } from 'next'
import { Clock, Eye } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { AuthorCard } from '@/components/content/author-card'
import { Comments } from '@/components/content/comments'
import { ListenButton } from '@/components/content/listen-button'
import { PostCard } from '@/components/content/post-card'
import { ReactionButtons } from '@/components/content/reaction-buttons'
import { AdSlot } from '@/components/monetization/ad-slot'
import {
  AffiliateDisclosure,
  hasAffiliateLinks,
} from '@/components/monetization/affiliate-disclosure'
import { ShareButtons } from '@/components/content/share-buttons'
import { TranslationNotice } from '@/components/content/translation-notice'
import { TableOfContents } from '@/components/content/table-of-contents'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { NewsletterForm } from '@/components/layout/newsletter-form'
import { ReadingProgress } from '@/components/motion/reading-progress'
import { JsonLd } from '@/components/seo/json-ld'
import { Container } from '@/components/ui/container'
import { getAllPostSlugs, getPost, getRelatedPosts } from '@/lib/api'
import { processArticle } from '@/lib/article'
import {
  blogPostingSchema,
  breadcrumbSchema,
  faqSchema,
  graph,
  personSchema,
} from '@/lib/jsonld'
import { DEFAULT_LOCALE, isLocale, localePath } from '@/i18n/config'
import { buildMetadata } from '@/lib/seo'
import { absoluteUrl, siteConfig } from '@/config/site'
import { cn, formatDate, isoDate, truncate } from '@/lib/utils'
import type { Locale } from '@/i18n/config'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * ARTICLE PAGE
 * ═════════════════════════════════════════════════════════════════════════════
 * A Server Component with no request-time data access, so the whole article —
 * body text, metadata and JSON-LD — is in the prerendered HTML. `getPost` is
 * cached and tagged per slug, so publishing one post revalidates one page.
 *
 * `generateMetadata` and the page body both call `getPost`. Under Cache
 * Components the second call is served from the same cache entry, so the
 * article is fetched once per revalidation, not twice per request.
 */

type Props = { params: Promise<{ locale: Locale; slug: string }> }

/** Spoken words per minute. Matches the API's estimate and lib/speech.ts. */
const SPOKEN_WPM = 150

/**
 * Estimated listen time, computed on the SERVER.
 *
 * So the duration is in the HTML before any JavaScript runs: the Listen
 * button can state how long the article takes to hear without first fetching
 * anything, which is what lets it render at its final width and avoid a shift.
 *
 * A generated narration reports its real duration; otherwise this is derived
 * from the word count at speaking pace — slower than the 225wpm reading
 * estimate, because speech is slower than reading.
 */
function listenSeconds(post: {
  audioDuration: number | null
  wordCount: number
}): number {
  if (post.audioDuration) return post.audioDuration
  return Math.max(60, Math.round((post.wordCount / SPOKEN_WPM) * 60))
}

/**
 * Prerender every published article at build time.
 *
 * Posts published afterwards are not in this list; they render on demand on
 * first request and are then cached, which is the ISR half of the model. The
 * build therefore stays bounded no matter how large the archive gets.
 */
/**
 * Prerender every published article, in every language it exists in.
 *
 * The locale has to be part of the returned params: without it Next
 * prerenders each slug once and the Hindi URL falls through to on-demand
 * rendering, which is the ISR path rather than the static one.
 */
export async function generateStaticParams() {
  const entries = await getAllPostSlugs()
  return entries.map(({ slug, locale }) => ({ slug, locale }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params
  const result = await getPost(slug, locale)
  const post = result?.post ?? null

  /*
   * Only the languages this article ACTUALLY exists in.
   *
   * Emitting hreflang="hi" for a post with no Hindi translation points Google
   * at a 404 and gets reported as an hreflang error, so the set comes from
   * the database rather than from the list of locales the site supports.
   */
  const availableLocales = (result?.translations ?? [])
    .map((t) => t.locale)
    .filter(isLocale)

  if (!post) {
    // A 404 must not inherit the site's default title, or the not-found page
    // competes for brand queries.
    return { title: 'Article not found', robots: { index: false, follow: true } }
  }

  const description =
    post.metaDescription ?? post.excerpt ?? truncate(post.contentText ?? '', 160)

  return buildMetadata({
    title: post.metaTitle ?? post.title,
    description,
    path: `/blog/${post.slug}`,
    type: 'article',
    // An explicit canonical means the post is syndicated from elsewhere.
    canonical: post.canonicalUrl ?? undefined,
    noIndex: post.noIndex,
    image:
      post.ogImage ??
      `/api/og?title=${encodeURIComponent(post.title)}` +
        `&category=${encodeURIComponent(post.category?.name ?? '')}` +
        `&author=${encodeURIComponent(post.author?.name ?? '')}` +
        `&date=${encodeURIComponent(post.publishedAt ? formatDate(post.publishedAt) : '')}` +
        `&read=${post.readingMinutes}+min`,
    imageAlt: post.coverImageAlt ?? post.title,
    publishedTime: post.publishedAt ? isoDate(post.publishedAt) : undefined,
    modifiedTime: isoDate(post.updatedAt),
    authors: post.author
      ? [
          {
            name: post.author.name,
            url: post.author.slug
              ? absoluteUrl(`/author/${post.author.slug}`)
              : undefined,
          },
        ]
      : undefined,
    section: post.category?.name,
    tags: post.tags.map((tag) => tag.name),
    locale,
    availableLocales: availableLocales.length > 0 ? availableLocales : [locale],
  })
}

export default async function ArticlePage({ params }: Props) {
  const { slug, locale } = await params
  const result = await getPost(slug, locale)

  /*
   * This article does not exist in THIS language.
   *
   * Before 404ing, check whether it exists in another. Someone who clicked
   * हिन्दी in the header on an untranslated article should land on the
   * version that exists, not on a dead end — the header switcher is a
   * site-wide control and cannot know which articles are translated.
   *
   * A 307 rather than a 301: the translation may be written tomorrow, and a
   * permanent redirect would be cached by browsers long after that.
   */
  if (!result) {
    const fallbackLocale = locale === DEFAULT_LOCALE ? 'hi' : DEFAULT_LOCALE
    const fallback = await getPost(slug, fallbackLocale)
    if (fallback) redirect(localePath(`/blog/${slug}`, fallbackLocale))
    notFound()
  }

  const post = result.post
  const translations = result.translations

  // Moved and removed URLs never reach this component: the proxy resolves them
  // to a real 301 or 410 before rendering starts (see src/proxy.ts). Anything
  // arriving here genuinely does not exist.
  if (!post) notFound()

  const { html, toc } = processArticle(post.contentHtml)
  const related = await getRelatedPosts(post, 3)

  const url = absoluteUrl(`/blog/${post.slug}`)
  const published = post.publishedAt ?? post.createdAt
  const wasUpdated =
    new Date(post.updatedAt).getTime() - new Date(published).getTime() >
    1000 * 60 * 60 * 24

  const crumbs = [
    ...(post.category
      ? [{ name: post.category.name, href: `/category/${post.category.slug}` }]
      : [{ name: 'Articles', href: '/blog' }]),
    { name: post.title, href: `/blog/${post.slug}` },
  ]

  const author = post.author
  const personInput = {
    name: author?.name ?? siteConfig.name,
    slug: author?.slug ?? 'devlume',
    bio: post.authorBio ?? undefined,
    avatar: author?.avatarUrl ?? undefined,
    jobTitle: author?.jobTitle ?? undefined,
    sameAs: Object.values(post.authorSocials ?? {}),
  }

  return (
    <>
      <ReadingProgress />

      {/* One @graph: BlogPosting, its Person author, the breadcrumb trail and
          the FAQ block, cross-referenced by @id rather than duplicated. */}
      <JsonLd
        id="ld-article"
        data={graph(
          blogPostingSchema({
            title: post.title,
            description: post.metaDescription ?? post.excerpt ?? '',
            slug: post.slug,
            image:
              post.coverImageUrl ?? `/api/og?title=${encodeURIComponent(post.title)}`,
            imageAlt: post.coverImageAlt ?? undefined,
            publishedAt: isoDate(published),
            updatedAt: isoDate(post.updatedAt),
            author: personInput,
            category: post.category
              ? { name: post.category.name, slug: post.category.slug }
              : undefined,
            tags: post.tags.map((tag) => tag.name),
            wordCount: post.wordCount,
            readingMinutes: post.readingMinutes,
            /*
               AudioObject, but ONLY for a real pre-generated narration.

               Nested inside the BlogPosting rather than added as a sibling
               node, because the audio IS a property of the article, not an
               independent resource — and a second top-level node would reuse
               the same @id and contradict itself.

               Browser speech synthesis is deliberately excluded: it produces
               no file at any URL, so claiming AudioObject for it would
               describe a resource that does not exist. That is exactly the
               kind of structured-data overclaim that earns a manual action.
            */
            ...(post.audioStatus === 'ready' && post.audioUrl
              ? {
                  audio: {
                    title: `${post.title} — narrated`,
                    contentUrl: post.audioUrl,
                    duration: post.audioDuration ?? listenSeconds(post),
                    uploadDate: isoDate(post.updatedAt),
                  },
                }
              : {}),
          }),
          personSchema(personInput),
          breadcrumbSchema(
            [{ name: 'Home', href: '/' }, ...crumbs],
            `/blog/${post.slug}`
          ),
          ...(post.faq.length > 0 ? [faqSchema(post.faq, `/blog/${post.slug}`)] : [])
        )}
      />

      <article>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <Container width="content" className="pt-8 sm:pt-10">
          <Breadcrumbs items={crumbs} path={`/blog/${post.slug}`} withSchema={false} />

          <header className="mt-6 flex flex-col gap-5">
            {post.category ? (
              <Link href={`/category/${post.category.slug}`} className="w-fit">
                <span
                  className={cn(
                    'inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium transition-opacity hover:opacity-80',
                    post.category.tone ?? 'bg-surface-2 text-foreground-muted'
                  )}
                >
                  {post.category.name}
                </span>
              </Link>
            ) : null}

            {/* The single H1. */}
            <h1 className="text-h1 text-balance font-bold">{post.title}</h1>

            {post.subtitle ? (
              <p className="text-lead text-foreground-muted">{post.subtitle}</p>
            ) : null}

            <div className="text-meta text-foreground-subtle flex flex-wrap items-center gap-x-4 gap-y-2">
              {author ? (
                <span className="text-foreground-muted font-medium">
                  {author.slug ? (
                    <Link href={`/author/${author.slug}`} className="hover:text-primary">
                      {author.name}
                    </Link>
                  ) : (
                    author.name
                  )}
                </span>
              ) : null}

              <time dateTime={isoDate(published)}>{formatDate(published)}</time>

              {wasUpdated ? (
                <span className="inline-flex items-center gap-1">
                  Updated{' '}
                  <time dateTime={isoDate(post.updatedAt)}>
                    {formatDate(post.updatedAt)}
                  </time>
                </span>
              ) : null}

              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden="true" />
                {post.readingMinutes} min read
              </span>

              {post.viewCount > 100 ? (
                <span className="inline-flex items-center gap-1">
                  <Eye className="size-3.5" aria-hidden="true" />
                  {post.viewCount.toLocaleString('en-US')}
                </span>
              ) : null}
            </div>

            {/*
              Listen + reactions.
              
              Both sit in a `.reserve` row with a fixed height, so the slot is
              the same size before hydration, after hydration, and whether or
              not the player is open. Neither can shift the article — which is
              what keeps CLS at zero with two client islands this high up the
              page.
            */}
            <div
              className="reserve flex flex-wrap items-center gap-x-4 gap-y-3"
              style={{ ['--reserve-h' as string]: '2.5rem' }}
            >
              {post.audioEnabled ? (
                <ListenButton
                  slug={post.slug}
                  title={post.title}
                  estimatedSeconds={listenSeconds(post)}
                  hasGeneratedAudio={
                    post.audioStatus === 'ready' && Boolean(post.audioUrl)
                  }
                />
              ) : null}

              <ReactionButtons slug={post.slug} initialLikeCount={post.likeCount} />
            </div>

            {/* Only rendered when a translation actually exists. */}
            <TranslationNotice
              locale={locale}
              slug={post.slug}
              translations={translations}
            />
          </header>
        </Container>

        {/* ── Cover ──────────────────────────────────────────────────────── */}
        {post.coverImageUrl ? (
          <Container width="content" className="mt-8">
            <div className="bg-surface-2 relative aspect-[16/9] w-full overflow-hidden rounded-2xl">
              <Image
                src={post.coverImageUrl}
                alt={post.coverImageAlt ?? ''}
                fill
                // The LCP element on this page: eager, high priority, and the
                // only image on the route marked this way.
                priority
                sizes="(min-width: 1024px) 1024px, 100vw"
                quality={90}
                className="object-cover"
              />
            </div>
          </Container>
        ) : null}

        {/* ── Body + sticky TOC ──────────────────────────────────────────── */}
        <Container className="mt-12">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-14">
            <div className="min-w-0">
              {/*
                ABOVE the body, so it is seen before any affiliate link rather
                than after. The FTC asks for disclosure before the reader
                acts; a footer disclosure fails that for everyone who clicks
                without scrolling to the bottom.

                Rendered only when the body actually contains one, detected
                from the markup rather than a stored flag that could drift.
              */}
              {hasAffiliateLinks(html) ? (
                <AffiliateDisclosure className="measure mb-8" />
              ) : null}

              <div
                className="prose"
                data-dropcap
                // Sanitised and hardened in processArticle(): allowlisted tags
                // only, external links forced to rel="noopener noreferrer".
                dangerouslySetInnerHTML={{ __html: html }}
              />

              {post.faq.length > 0 ? (
                <section aria-labelledby="faq-heading" className="measure mt-16">
                  <h2 id="faq-heading" className="text-h2 font-semibold tracking-tight">
                    Frequently asked questions
                  </h2>
                  <dl className="mt-6 flex flex-col gap-4">
                    {post.faq.map((item) => (
                      <div
                        key={item.question}
                        className="border-border bg-surface rounded-xl border p-5"
                      >
                        <dt className="font-display text-h4 font-semibold">
                          {item.question}
                        </dt>
                        <dd className="text-foreground-muted mt-2 text-sm leading-relaxed">
                          {item.answer}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}

              {post.tags.length > 0 ? (
                <nav aria-label="Tags" className="measure mt-12">
                  <ul className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <li key={tag.id}>
                        <Link
                          href={`/tag/${tag.slug}`}
                          className="border-border bg-surface text-foreground-muted hover:border-border-strong hover:text-foreground inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium transition-colors"
                        >
                          #{tag.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ) : null}

              <div className="measure border-hairline mt-10 border-t pt-6">
                <ShareButtons url={url} title={post.title} />
              </div>

              {/*
                The only display unit on an article, and it is BELOW the text.

                No leaderboard above the headline and nothing injected into
                the middle of the body: both displace the content the reader
                arrived for, which page-experience guidance singles out. One
                unit after the article has been read is the version that does
                not trade the ranking for the impression.
              */}
              <AdSlot placement="below-article" className="measure" />

              {author ? (
                <AuthorCard
                  author={{
                    name: author.name,
                    slug: author.slug,
                    avatarUrl: author.avatarUrl,
                    jobTitle: author.jobTitle,
                    bio: post.authorBio,
                    credentials: post.authorCredentials,
                    socials: post.authorSocials,
                  }}
                  className="measure-wide mt-10"
                />
              ) : null}
            </div>

            {/* Sticky sidebar. Hidden below lg, where it would push the article
                down rather than sit beside it. */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 flex flex-col gap-8">
                <TableOfContents entries={toc} />

                {/* Desktop only — the placement table gives it no mobile
                    size, so it renders nothing below lg rather than
                    squeezing a 600px unit into a phone. */}
                <AdSlot placement="sidebar" />
              </div>
            </aside>
          </div>
        </Container>

        {/* ── Newsletter ─────────────────────────────────────────────────── */}
        <Container width="content" className="mt-20">
          <div className="border-border bg-surface-2 rounded-2xl border p-6 sm:p-10">
            <NewsletterForm variant="inline" />
          </div>
        </Container>

        {/* ── Discussion ─────────────────────────────────────────────────── */}
        {/*
          Server-rendered, so the thread is in the HTML and crawlable. Every
          link a commenter writes carries rel="ugc nofollow", forced in the
          API's sanitiser — see components/content/comments.tsx.
        */}
        <Container width="content">
          <Comments slug={post.slug} />
        </Container>

        {/* ── Related ────────────────────────────────────────────────────── */}
        {related.length > 0 ? (
          <Container className="mt-20">
            <h2 className="text-h3 mb-6 font-semibold tracking-tight">Related reading</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <PostCard key={item.id} post={item} />
              ))}
            </div>
          </Container>
        ) : null}
      </article>
    </>
  )
}
