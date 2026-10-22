import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { JsonLd } from '@/components/seo/json-ld'
import { Container } from '@/components/ui/container'
import { STATIC_PAGE_SLUGS, getStaticPage } from '@/content/pages'
import { breadcrumbSchema, graph } from '@/lib/jsonld'
import { buildMetadata } from '@/lib/seo'
import { formatDate, isoDate } from '@/lib/utils'
import type { Locale } from '@/i18n/config'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * STATIC PAGES — /about, /privacy-policy, /terms, and nine more
 * ═════════════════════════════════════════════════════════════════════════════
 * One route for all twelve. They share a heading hierarchy, a revision date, a
 * breadcrumb trail and a metadata shape, so twelve page.tsx files would be
 * twelve chances for those to drift apart.
 *
 * `generateStaticParams` returns the same list the sitemap builds from, which
 * is the point: before this route existed the sitemap advertised all twelve
 * URLs and every one returned 404. Now one array drives both, so a page can no
 * longer be in the sitemap without existing.
 *
 * `[page]` is a single segment, not a catch-all, so it cannot swallow nested
 * URLs. An unknown slug is not in `generateStaticParams`, renders on demand,
 * finds no page and calls `notFound()` — a real 404, not a soft one.
 *
 * (`dynamicParams = false` would be the more direct way to say that, but
 * Cache Components rejects route segment config entirely. The `notFound()`
 * below is the equivalent, and it is enforced at render rather than routing.)
 */

type Props = { params: Promise<{ locale: Locale; page: string }> }

export function generateStaticParams() {
  return STATIC_PAGE_SLUGS.map((page) => ({ page }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page: slug, locale } = await params
  const page = getStaticPage(slug)

  if (!page) {
    return { title: 'Page not found', robots: { index: false, follow: true } }
  }

  return buildMetadata({
    title: page.title,
    description: page.description,
    path: `/${page.slug}`,
    modifiedTime: isoDate(page.lastUpdated),
    locale,
  })
}

export default async function StaticPageRoute({ params }: Props) {
  const { page: slug } = await params
  const page = getStaticPage(slug)
  if (!page) notFound()

  const crumbs = [{ name: page.title, href: `/${page.slug}` }]

  return (
    <>
      <JsonLd
        id={`ld-${page.slug}`}
        data={graph(
          breadcrumbSchema([{ name: 'Home', href: '/' }, ...crumbs], `/${page.slug}`)
        )}
      />

      <Container width="prose" className="py-12 sm:py-16">
        <Breadcrumbs items={crumbs} path={`/${page.slug}`} withSchema={false} />

        <header className="mt-6 flex flex-col gap-3">
          <h1 className="text-h1 text-balance font-bold">{page.title}</h1>
          <p className="text-lead text-foreground-muted">{page.intro}</p>

          {/*
            The revision date, machine-readable.

            On a legal page this is the first thing anyone checks, and a policy
            with no date reads as abandoned — which is also how a reviewer
            reads it.
          */}
          <p className="text-meta text-foreground-subtle">
            Last updated{' '}
            <time dateTime={isoDate(page.lastUpdated)}>
              {formatDate(page.lastUpdated)}
            </time>
          </p>
        </header>

        {/*
          `.prose` gives these the same typography as an article, but the
          headings are real h2s in document order rather than HTML from the
          editor — so the outline is correct by construction.
        */}
        <div className="prose mt-10">
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph.slice(0, 48)}>{paragraph}</p>
              ))}
              {section.list ? (
                <ul>
                  {section.list.map((item) => (
                    <li key={item.slice(0, 48)}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </Container>
    </>
  )
}
