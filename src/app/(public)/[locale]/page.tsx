import type { Metadata } from 'next'
import { ArrowRight, BookOpen, Check, Gauge, Rss, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

import { PostCard } from '@/components/content/post-card'
import { NewsletterForm } from '@/components/layout/newsletter-form'
import { Magnetic } from '@/components/motion/magnetic'
import { Reveal, Stagger, StaggerItem } from '@/components/motion/reveal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { PostCardSkeleton } from '@/components/ui/skeleton'
import { categories } from '@/config/navigation'
import { siteConfig } from '@/config/site'
import { getPosts } from '@/lib/api'
import { buildMetadata } from '@/lib/seo'
import { cn } from '@/lib/utils'
import type { Locale } from '@/i18n/config'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * HOMEPAGE
 * ═════════════════════════════════════════════════════════════════════════════
 * The hero, topic bento and editorial standards are fully prerendered static
 * content. The post rails read from the API, which is cached (`use cache` +
 * `cacheTag('posts')`), so they end up in the prerendered shell too and
 * revalidate when something publishes.
 *
 * Each rail sits behind its own Suspense boundary, so a slow or failing rail
 * degrades to a skeleton rather than blocking the document — the hero, the H1
 * and every topic link always paint.
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
    title: siteConfig.title,
    description: siteConfig.description,
    path: '/',
    // Homepage owns the full title; the `%s · Devlume` template is skipped.
    absoluteTitle: true,
    locale,
  })
}

const PILLARS = [
  {
    Icon: Gauge,
    title: 'Measured, not asserted',
    body: 'Every performance claim ships with the profile, the flamegraph or the benchmark that produced it. If we cannot reproduce it, we do not publish it.',
  },
  {
    Icon: BookOpen,
    title: 'Written by practitioners',
    body: 'Each author has shipped the thing they are writing about. Bylines carry real credentials, and sources are cited inline rather than gestured at.',
  },
  {
    Icon: Sparkles,
    title: 'Updated, not abandoned',
    body: 'Articles carry a visible last-reviewed date. When a framework moves, the guide moves with it — or gets a banner saying it has not.',
  },
] as const

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params

  return (
    <>
      {/* ═══════════════════════════ HERO ═══════════════════════════════ */}
      <section className="relative isolate overflow-hidden">
        {/* Aurora mesh. Decorative, aria-hidden, pointer-events-none, and it
            animates transform/opacity only so it cannot cause layout shift. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[46rem] opacity-70 dark:opacity-55"
        >
          <div className="mesh-aurora animate-aurora absolute inset-0 blur-3xl" />
        </div>
        <div
          aria-hidden="true"
          className="grain pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[46rem]"
        />

        <Container className="pb-16 pt-16 sm:pt-24 lg:pt-28">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <Reveal>
              <Badge variant="brand" size="lg" className="gap-2">
                <span className="relative grid size-1.5 place-items-center">
                  <span className="bg-primary absolute inline-flex size-1.5 rounded-full" />
                </span>
                Now publishing weekly
              </Badge>
            </Reveal>

            {/* The single H1 on this page. */}
            <Reveal>
              <h1 className="text-display-1 mt-6 text-balance font-bold">
                <span className="gradient-text">Engineering guides</span> for people who
                ship
              </h1>
            </Reveal>

            <Reveal>
              <p className="text-lead text-foreground-muted mx-auto mt-6 max-w-2xl">
                Long-form, reproducible writing on {siteConfig.niche} — Next.js internals,
                type systems that catch real bugs, LLM apps that survive production, and
                the performance work that moves Core Web Vitals.
              </p>
            </Reveal>

            <Reveal className="mt-9">
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <Magnetic strength={0.18}>
                  <Button asChild size="lg">
                    <Link href="/blog">
                      Read the latest
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                </Magnetic>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/topics">Browse topics</Link>
                </Button>
              </div>
            </Reveal>

            <Reveal>
              <p className="text-meta text-foreground-subtle mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                <span className="inline-flex items-center gap-1.5">
                  <kbd className="border-border bg-surface-2 font-mono-ui rounded border px-1.5 py-0.5 text-[0.6875rem]">
                    ⌘K
                  </kbd>
                  to search
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Rss className="size-3.5" aria-hidden="true" />
                  <a
                    href="/rss.xml"
                    className="decoration-border-strong hover:text-foreground underline underline-offset-2 transition-colors"
                  >
                    RSS
                  </a>
                </span>
                <span>No paywall, ever</span>
              </p>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ═════════════════════════ FEATURED BENTO ═══════════════════════ */}
      <Suspense fallback={<FeaturedSkeleton />}>
        <FeaturedRail locale={locale} />
      </Suspense>

      {/* ═══════════════════════════ LATEST ═════════════════════════════ */}
      <Suspense fallback={<LatestSkeleton />}>
        <LatestRail locale={locale} />
      </Suspense>

      {/* ═════════════════════════ TOPIC BENTO ══════════════════════════ */}
      <section aria-labelledby="topics-heading" className="relative">
        <Container className="py-16 sm:py-20">
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-eyebrow text-primary font-sans uppercase">
                What we cover
              </p>
              <h2
                id="topics-heading"
                className="text-h2 mt-2.5 font-semibold tracking-tight"
              >
                Eight topics, covered properly
              </h2>
            </div>
            <Link
              href="/topics"
              className="text-primary group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium"
            >
              All topics
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </Link>
          </div>

          <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {categories.map((category, i) => {
              // Bento rhythm: 3+3, then 2+2+2 twice. That fills the 6-column
              // track exactly, so there is never a ragged gap on the last row.
              const lead = i < 2
              return (
                <StaggerItem
                  key={category.slug}
                  className={cn(lead ? 'lg:col-span-3' : 'lg:col-span-2')}
                >
                  <Card
                    interactive
                    padding={lead ? 'lg' : 'md'}
                    className="h-full overflow-hidden"
                    variant={lead ? 'raised' : 'surface'}
                  >
                    <Link href={category.href} className="flex h-full flex-col gap-4">
                      <span
                        className={cn(
                          'ease-spring grid size-11 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover/card:scale-110',
                          category.tone
                        )}
                      >
                        <category.icon className="size-5" aria-hidden="true" />
                      </span>

                      <span className="flex flex-col gap-2">
                        <span className="flex items-center gap-2">
                          <h3 className="font-display text-h4 text-foreground font-semibold tracking-tight">
                            {category.title}
                          </h3>
                          {lead ? (
                            <Badge variant="pick" size="sm">
                              Core
                            </Badge>
                          ) : null}
                        </span>
                        <span className="text-foreground-muted text-sm leading-relaxed">
                          {category.description}
                        </span>
                      </span>

                      <span className="text-primary mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-medium">
                        Explore
                        <ArrowRight
                          aria-hidden="true"
                          className="size-3.5 transition-transform duration-300 group-hover/card:translate-x-1"
                        />
                      </span>
                    </Link>
                  </Card>
                </StaggerItem>
              )
            })}
          </Stagger>
        </Container>
      </section>

      {/* ══════════════════════ EDITORIAL STANDARDS ═════════════════════ */}
      <section aria-labelledby="standards-heading" className="relative">
        <Container className="py-16 sm:py-20">
          <div className="border-border bg-surface rounded-3xl border p-8 shadow-sm sm:p-12">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-eyebrow text-primary font-sans uppercase">
                Editorial standards
              </p>
              <h2
                id="standards-heading"
                className="text-h2 mt-2.5 font-semibold tracking-tight"
              >
                Why you can trust what you read here
              </h2>
              <p className="text-foreground-muted mt-4 text-base leading-relaxed">
                Three commitments, published so you can hold us to them. The full version
                lives in our{' '}
                <Link
                  href="/editorial-policy"
                  className="text-primary decoration-primary/40 hover:decoration-primary underline underline-offset-2"
                >
                  editorial policy
                </Link>
                .
              </p>
            </div>

            <Stagger className="mt-12 grid gap-8 sm:grid-cols-3">
              {PILLARS.map(({ Icon, title, body }) => (
                <StaggerItem key={title} className="flex flex-col gap-3.5">
                  <span className="bg-primary-soft text-primary grid size-10 place-items-center rounded-xl">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="font-display text-h4 font-semibold tracking-tight">
                    {title}
                  </h3>
                  <p className="text-foreground-muted text-sm leading-relaxed">{body}</p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </Container>
      </section>

      {/* ════════════════════════ NEWSLETTER CTA ════════════════════════ */}
      <section aria-labelledby="newsletter-heading" className="relative">
        <Container width="content" className="pb-8">
          <div className="border-border bg-surface-2 relative isolate overflow-hidden rounded-3xl border px-6 py-12 sm:px-12 sm:py-16">
            <div
              aria-hidden="true"
              className="mesh-aurora pointer-events-none absolute inset-0 -z-10 opacity-45 blur-2xl dark:opacity-30"
            />

            <div className="mx-auto max-w-xl text-center">
              <h2
                id="newsletter-heading"
                className="text-h2 font-semibold tracking-tight"
              >
                One essay. Every Tuesday.
              </h2>
              <p className="text-foreground-muted mt-4 text-base leading-relaxed">
                The week&apos;s article, plus the three links that actually taught us
                something. No digests, no sponsors in the body copy.
              </p>
            </div>

            <div className="mx-auto mt-8 max-w-md">
              <NewsletterForm variant="inline" showHeading={false} />
            </div>

            <ul className="mx-auto mt-8 flex max-w-lg flex-wrap items-center justify-center gap-x-6 gap-y-2.5">
              {['Double opt-in', 'One click to leave', 'Never sold'].map((item) => (
                <li
                  key={item}
                  className="text-meta text-foreground-subtle inline-flex items-center gap-1.5"
                >
                  <Check className="text-success-700 size-3.5" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>
    </>
  )
}

/**
 * Featured rail: one large lead article beside two secondary ones.
 *
 * Falls back to the newest posts when fewer than three are flagged featured, so
 * the homepage is never empty merely because an editor has not curated it.
 */
async function FeaturedRail({ locale }: { locale: Locale }) {
  const featured = await getPosts({ featured: true, limit: 3, locale })
  const posts =
    featured.items.length >= 3 ? featured.items : (await getPosts({ limit: 3, locale })).items

  if (posts.length === 0) return null

  const [lead, ...rest] = posts

  return (
    <section aria-labelledby="featured-heading" className="relative">
      <Container className="pb-4">
        <h2 id="featured-heading" className="sr-only">
          Featured articles
        </h2>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {lead ? (
              <PostCard post={lead} variant="featured" priority headingLevel="h3" />
            ) : null}
          </div>
          <div className="flex flex-col gap-4">
            {rest.map((post) => (
              <PostCard key={post.id} post={post} headingLevel="h3" />
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}

/** The six newest guides. */
async function LatestRail({ locale }: { locale: Locale }) {
  const { items } = await getPosts({ limit: 6, locale })
  if (items.length === 0) return null

  return (
    <section aria-labelledby="latest-heading" className="relative">
      <Container className="py-16 sm:py-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 id="latest-heading" className="text-h2 font-semibold tracking-tight">
            Latest guides
          </h2>
          <Link
            href="/blog"
            className="text-primary group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium"
          >
            All articles
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((post) => (
            <PostCard key={post.id} post={post} headingLevel="h3" />
          ))}
        </div>
      </Container>
    </section>
  )
}

function FeaturedSkeleton() {
  return (
    <Container className="pb-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PostCardSkeleton />
        </div>
        <div className="flex flex-col gap-4">
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      </div>
    </Container>
  )
}

function LatestSkeleton() {
  return (
    <Container className="py-16 sm:py-20">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    </Container>
  )
}
