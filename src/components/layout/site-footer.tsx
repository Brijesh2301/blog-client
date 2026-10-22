import { ArrowUpRight, Rss } from 'lucide-react'
import { cacheLife } from 'next/cache'
import Link from 'next/link'

import { GitHubIcon, LinkedInIcon, XIcon } from '@/components/brand/brand-icons'
import { Logo } from '@/components/brand/logo'
import { ConsentSettingsButton } from '@/components/consent/consent-banner'
import { NewsletterForm } from '@/components/layout/newsletter-form'
import { Container } from '@/components/ui/container'
import { feedNav, footerNav } from '@/config/navigation'
import { siteConfig } from '@/config/site'
import { localePath, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'

/**
 * Site footer.
 *
 * SEO role: this is the crawl backbone. Every category, every legal page and
 * every feed is a plain <a href> here, in server-rendered HTML, on every page
 * of the site. That is what satisfies both "reachable within 3 clicks" and the
 * AdSense requirement that the trust pages be linked site-wide.
 *
 * Server component — no interactivity except the newsletter form, which is
 * the only island.
 */

/**
 * The copyright year is read inside a cached function.
 *
 * Under Cache Components, calling `new Date()` straight in a prerendered
 * component is a build error: the value changes between renders, so Next
 * cannot bake it into a static shell. `use cache` gives it an explicit
 * lifetime instead -- revalidated daily, which is ample for a year number and
 * keeps the footer part of the prerendered HTML on every page.
 */
async function getCopyrightYear(): Promise<number> {
  'use cache'
  cacheLife('days')
  return new Date().getUTCFullYear()
}

export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = getDictionary(locale)

  const year = await getCopyrightYear()

  const socials = [
    { href: siteConfig.social.x, label: 'Devlume on X', Icon: XIcon },
    { href: siteConfig.social.github, label: 'Devlume on GitHub', Icon: GitHubIcon },
    {
      href: siteConfig.social.linkedin,
      label: 'Devlume on LinkedIn',
      Icon: LinkedInIcon,
    },
  ].filter((s) => Boolean(s.href))

  return (
    <footer className="border-border bg-background-subtle relative mt-24 overflow-hidden border-t">
      {/* Decorative top glow. aria-hidden and pointer-events-none. */}
      <div
        aria-hidden="true"
        className="via-primary/40 pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent to-transparent"
      />

      <Container className="lg:py-18 py-14">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
          {/* ── Brand + newsletter ───────────────────────────────────────── */}
          <div className="flex flex-col gap-6">
            <Logo />
            <p className="text-foreground-muted max-w-sm text-sm leading-relaxed">
              {siteConfig.tagline} Deep technical writing on {siteConfig.niche} — no
              filler, no AI slop, every claim tested.
            </p>

            <NewsletterForm variant="footer" />

            <ul className="flex items-center gap-2">
              {socials.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer me"
                    aria-label={label}
                    className="border-border bg-surface text-foreground-muted hover:border-border-strong hover:text-foreground grid size-9 place-items-center rounded-lg border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
                  >
                    <Icon className="size-4" />
                  </a>
                </li>
              ))}
              <li>
                <a
                  href={siteConfig.social.rss}
                  aria-label="Devlume RSS feed"
                  className="border-border bg-surface text-foreground-muted hover:border-border-strong hover:text-foreground grid size-9 place-items-center rounded-lg border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <Rss className="size-4" aria-hidden="true" />
                </a>
              </li>
            </ul>
          </div>

          {/* ── Link groups ──────────────────────────────────────────────── */}
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {footerNav.map((group) => (
              <div key={group.title} className="flex flex-col gap-3.5">
                <h2 className="text-eyebrow text-foreground-subtle font-sans uppercase">
                  {group.title}
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={localePath(item.href, locale)}
                        className="text-foreground-muted hover:text-foreground inline-flex items-center gap-1 rounded text-sm transition-colors"
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* ── Bottom bar ─────────────────────────────────────────────────── */}
        <div className="border-hairline mt-14 flex flex-col gap-4 border-t pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-meta text-foreground-subtle">
            © {year} {siteConfig.organization.legalName}. {t.footer.rightsReserved}
          </p>

          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {/*
              Withdrawing consent must be as easy as giving it — that is the
              legal standard, not a courtesy. A link in the footer of every
              page is the simplest way to guarantee it, and it is the first
              place anyone looks.
            */}
            <li>
              <ConsentSettingsButton className="text-meta text-foreground-subtle" />
            </li>

            {feedNav.map((item) => (
              <li key={item.href}>
                <a
                  href={localePath(item.href, locale)}
                  className="text-meta text-foreground-subtle hover:text-foreground inline-flex items-center gap-1 rounded transition-colors"
                >
                  {item.title}
                  <ArrowUpRight className="size-3" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Affiliate disclosure is required site-wide by the FTC and is part of
            the AdSense review checklist, so it lives in the footer, not just
            on the dedicated page. */}
        <p className="text-foreground-subtle mt-6 max-w-3xl text-[0.75rem] leading-relaxed">
          Devlume may earn a commission on some outbound links. Affiliate and sponsored
          links are always labelled and carry{' '}
          <code className="bg-surface-2 font-mono-ui rounded px-1 py-0.5 text-[0.7rem]">
            rel=&quot;sponsored&quot;
          </code>
          . Read the{' '}
          <Link
            href={localePath('/affiliate-disclosure', locale)}
            className="decoration-border-strong hover:text-foreground underline underline-offset-2"
          >
            full affiliate disclosure
          </Link>
          .
        </p>
      </Container>
    </footer>
  )
}
