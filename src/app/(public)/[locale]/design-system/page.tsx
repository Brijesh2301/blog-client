import type { Metadata } from 'next'
import { ArrowRight, Check, Info, Lightbulb, TriangleAlert } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { PostCardSkeleton, Skeleton } from '@/components/ui/skeleton'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * /design-system — the living reference for the token set and component
 * library. NOINDEX: it is an internal tool, and letting it into the index
 * would put a page of component names into search results for brand queries.
 *
 * Review this page at mobile, tablet and desktop widths in BOTH themes before
 * signing off a phase; that is the design gate.
 */
export const metadata: Metadata = {
  title: 'Design system',
  description: 'Internal reference for Devlume design tokens and components.',
  robots: { index: false, follow: false, nocache: true },
}

const SCALE = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950',
] as const

/**
 * Literal class names on purpose. Tailwind scans source text for candidates,
 * so `bg-brand-${stop}` would generate nothing at all.
 */
const PALETTES = [
  {
    label: 'Brand — Iris',
    swatches: [
      'bg-brand-50',
      'bg-brand-100',
      'bg-brand-200',
      'bg-brand-300',
      'bg-brand-400',
      'bg-brand-500',
      'bg-brand-600',
      'bg-brand-700',
      'bg-brand-800',
      'bg-brand-900',
      'bg-brand-950',
    ],
  },
  {
    label: 'Accent — Signal',
    swatches: [
      'bg-accent-50',
      'bg-accent-100',
      'bg-accent-200',
      'bg-accent-300',
      'bg-accent-400',
      'bg-accent-500',
      'bg-accent-600',
      'bg-accent-700',
      'bg-accent-800',
      'bg-accent-900',
      'bg-accent-950',
    ],
  },
  {
    label: 'Warm — Ember',
    swatches: [
      'bg-warm-50',
      'bg-warm-100',
      'bg-warm-200',
      'bg-warm-300',
      'bg-warm-400',
      'bg-warm-500',
      'bg-warm-600',
      'bg-warm-700',
      'bg-warm-800',
      'bg-warm-900',
      'bg-warm-950',
    ],
  },
  {
    label: 'Neutral — Ink',
    swatches: [
      'bg-ink-50',
      'bg-ink-100',
      'bg-ink-200',
      'bg-ink-300',
      'bg-ink-400',
      'bg-ink-500',
      'bg-ink-600',
      'bg-ink-700',
      'bg-ink-800',
      'bg-ink-900',
      'bg-ink-950',
    ],
  },
] as const

const SEMANTIC = [
  { token: 'background', cls: 'bg-background' },
  { token: 'background-subtle', cls: 'bg-background-subtle' },
  { token: 'surface', cls: 'bg-surface' },
  { token: 'surface-2', cls: 'bg-surface-2' },
  { token: 'surface-raised', cls: 'bg-surface-raised' },
  { token: 'primary', cls: 'bg-primary' },
  { token: 'secondary', cls: 'bg-secondary' },
  { token: 'highlight', cls: 'bg-highlight' },
  { token: 'border', cls: 'bg-border' },
] as const

const TYPE = [
  { cls: 'text-display-1', label: 'display-1', note: '44 → 88px, -0.035em' },
  { cls: 'text-display-2', label: 'display-2', note: '36 → 64px' },
  { cls: 'text-h1', label: 'h1', note: '32 → 52px' },
  { cls: 'text-h2', label: 'h2', note: '26 → 36px' },
  { cls: 'text-h3', label: 'h3', note: '21 → 26px' },
  { cls: 'text-h4', label: 'h4', note: '18 → 20px' },
  { cls: 'text-lead', label: 'lead', note: '19 → 23px, 1.58' },
  { cls: 'text-body font-serif', label: 'body (serif)', note: '18 → 20px, 1.7' },
  { cls: 'text-meta', label: 'meta', note: '13px' },
  { cls: 'text-eyebrow uppercase', label: 'eyebrow', note: '11px, 0.14em' },
] as const

const RADII = [
  ['xs', 'rounded-xs'],
  ['sm', 'rounded-sm'],
  ['md', 'rounded-md'],
  ['lg', 'rounded-lg'],
  ['xl', 'rounded-xl'],
  ['2xl', 'rounded-2xl'],
  ['3xl', 'rounded-3xl'],
] as const

const ELEVATION = [
  ['xs', 'shadow-xs'],
  ['sm', 'shadow-sm'],
  ['md', 'shadow-md'],
  ['lg', 'shadow-lg'],
  ['xl', 'shadow-xl'],
  ['glow', 'shadow-glow'],
] as const

export default function DesignSystemPage() {
  return (
    <Container className="py-14">
      <header className="mb-14 max-w-2xl">
        <Badge variant="outline">Internal · noindex</Badge>
        <h1 className="text-h1 mt-4 font-bold">Design system</h1>
        <p className="text-lead text-foreground-muted mt-4">
          Every token and component in one place. Check this page at 360px, 768px and
          1440px in both themes before signing off a phase.
        </p>
      </header>

      {/* ── Palettes ───────────────────────────────────────────────────── */}
      <Section title="Colour scales" id="palettes">
        <div className="flex flex-col gap-7">
          {PALETTES.map((palette) => (
            <div key={palette.label}>
              <h3 className="text-eyebrow text-foreground-subtle mb-2.5 font-sans uppercase">
                {palette.label}
              </h3>
              <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
                {palette.swatches.map((swatch, i) => (
                  <div key={swatch} className="flex flex-col gap-1.5">
                    <div
                      className={cn('border-hairline h-14 rounded-md border', swatch)}
                    />
                    <span className="font-mono-ui text-foreground-subtle text-center text-[0.625rem]">
                      {SCALE[i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Semantic tokens ────────────────────────────────────────────── */}
      <Section
        title="Semantic tokens"
        id="semantic"
        description="These swap with the theme. Components reference only these, never a raw scale stop — that is what makes both themes work from one component set."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SEMANTIC.map(({ token, cls }) => (
            <div key={token} className="flex flex-col gap-2">
              <div className={cn('border-border h-16 rounded-lg border', cls)} />
              <code className="font-mono-ui text-foreground-muted text-[0.6875rem]">
                {token}
              </code>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Typography ─────────────────────────────────────────────────── */}
      <Section
        title="Type scale"
        id="type"
        description="Fluid via clamp(). Resize the window to see each step interpolate."
      >
        <div className="flex flex-col gap-6">
          {TYPE.map(({ cls, label, note }) => (
            <div key={label} className="flex flex-col gap-1.5">
              <div className="flex items-baseline gap-3">
                <code className="font-mono-ui text-foreground-subtle shrink-0 text-[0.6875rem]">
                  {label}
                </code>
                <span className="text-foreground-subtle/70 text-[0.6875rem]">{note}</span>
              </div>
              <p className={cn('text-foreground', cls)}>
                Engineering guides for people who ship
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Buttons ────────────────────────────────────────────────────── */}
      <Section title="Buttons" id="buttons">
        <div className="flex flex-col gap-6">
          <Row label="Variants">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="subtle">Subtle</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button variant="danger">Danger</Button>
          </Row>
          <Row label="Sizes">
            <Button size="xs">Extra small</Button>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="Continue">
              <ArrowRight />
            </Button>
          </Row>
          <Row label="States">
            <Button>
              Default <ArrowRight />
            </Button>
            <Button disabled>Disabled</Button>
            <Tooltip content="Tooltips are keyboard-reachable">
              <Button variant="secondary">Hover or focus me</Button>
            </Tooltip>
          </Row>
        </div>
      </Section>

      {/* ── Badges ─────────────────────────────────────────────────────── */}
      <Section title="Badges" id="badges">
        <div className="flex flex-col gap-6">
          <Row label="Tones">
            <Badge variant="neutral">Neutral</Badge>
            <Badge variant="brand">Brand</Badge>
            <Badge variant="accent">Accent</Badge>
            <Badge variant="warm">Warm</Badge>
            <Badge variant="outline">Outline</Badge>
          </Row>
          <Row label="Editorial labels">
            <Badge variant="new">New</Badge>
            <Badge variant="trending">Trending</Badge>
            <Badge variant="pick">Editor&apos;s Pick</Badge>
          </Row>
          <Row label="Sizes">
            <Badge size="sm">Small</Badge>
            <Badge size="md">Medium</Badge>
            <Badge size="lg">Large</Badge>
          </Row>
        </div>
      </Section>

      {/* ── Cards ──────────────────────────────────────────────────────── */}
      <Section title="Cards" id="cards">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(['surface', 'raised', 'glass', 'outline'] as const).map((variant) => (
            <Card key={variant} variant={variant} interactive padding="md">
              <CardHeader>
                <CardTitle>{variant}</CardTitle>
                <CardDescription>
                  Hover lifts with transform only, so neighbours never shift.
                </CardDescription>
              </CardHeader>
              <CardFooter className="mt-4">
                <Button size="sm" variant="ghost">
                  Action <ArrowRight />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </Section>

      {/* ── Radius + elevation ─────────────────────────────────────────── */}
      <Section title="Radius and elevation" id="surfaces">
        <div className="flex flex-col gap-8">
          <div>
            <h3 className="text-eyebrow text-foreground-subtle mb-3 font-sans uppercase">
              Radius
            </h3>
            <div className="flex flex-wrap gap-3">
              {RADII.map(([name, cls]) => (
                <div key={name} className="flex flex-col items-center gap-2">
                  <div className={cn('border-border bg-surface-2 size-20 border', cls)} />
                  <code className="font-mono-ui text-foreground-subtle text-[0.625rem]">
                    {name}
                  </code>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-eyebrow text-foreground-subtle mb-3 font-sans uppercase">
              Elevation
            </h3>
            <div className="flex flex-wrap gap-5">
              {ELEVATION.map(([name, cls]) => (
                <div key={name} className="flex flex-col items-center gap-2.5">
                  <div
                    className={cn(
                      'border-border bg-surface size-20 rounded-xl border',
                      cls
                    )}
                  />
                  <code className="font-mono-ui text-foreground-subtle text-[0.625rem]">
                    {name}
                  </code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Forms ──────────────────────────────────────────────────────── */}
      <Section title="Forms" id="forms">
        <div className="grid max-w-3xl gap-5 sm:grid-cols-2">
          <Input label="Full name" name="ds-name" autoComplete="off" />
          <Input
            label="Email address"
            name="ds-email"
            type="email"
            required
            hint="We use double opt-in."
            autoComplete="off"
          />
          <Input
            label="Slug"
            name="ds-slug"
            defaultValue="not a valid slug!"
            error="Slugs may only contain lowercase letters, numbers and hyphens."
            autoComplete="off"
          />
          <Input label="Disabled" name="ds-disabled" disabled autoComplete="off" />
        </div>
      </Section>

      {/* ── Callouts ───────────────────────────────────────────────────── */}
      <Section title="Callouts" id="callouts">
        <div className="flex max-w-2xl flex-col gap-3">
          <div className="callout" data-tone="info">
            <Info className="text-secondary mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <strong className="font-semibold">Note.</strong> Used for context a reader
              can safely skip.
            </div>
          </div>
          <div className="callout" data-tone="tip">
            <Lightbulb
              className="text-primary mt-0.5 size-5 shrink-0"
              aria-hidden="true"
            />
            <div>
              <strong className="font-semibold">Tip.</strong> A shortcut that saves real
              time.
            </div>
          </div>
          <div className="callout" data-tone="warn">
            <TriangleAlert
              className="text-highlight mt-0.5 size-5 shrink-0"
              aria-hidden="true"
            />
            <div>
              <strong className="font-semibold">Careful.</strong> Something that will bite
              in production.
            </div>
          </div>
        </div>
      </Section>

      {/* ── Article typography ─────────────────────────────────────────── */}
      <Section
        title="Article typography"
        id="prose"
        description="The .prose class. Serif body at 18–20px / 1.7, capped at a 68ch measure."
      >
        <article className="prose" data-dropcap>
          <p>
            Server Components changed where the work happens, not how much of it there is.
            The render still costs the same; it just moved to a machine you control, where
            a 400ms database round trip is a server problem instead of a spinner.
          </p>
          <h2>Where the budget actually goes</h2>
          <p>
            Most pages that fail Core Web Vitals do not fail on bundle size. They fail
            because a single uncached read sits between the request and the first byte.
            Use <code>use cache</code> and the read leaves the critical path entirely.
          </p>
          <blockquote>
            <p>A cached read is not a faster read. It is a read that already happened.</p>
          </blockquote>
          <h3>Measuring it</h3>
          <ul>
            <li>Record a trace before changing anything.</li>
            <li>Change exactly one thing.</li>
            <li>Record the trace again and compare the same percentile.</li>
          </ul>
          <pre>
            <code>{`export async function getPost(slug: string) {
  'use cache'
  cacheLife('hours')
  return db.posts.findUnique({ where: { slug } })
}`}</code>
          </pre>
          <p className="pull-quote">
            Ship the measurement with the claim, or the claim is just a vibe.
          </p>
          <p>
            That is the whole method. Everything else is picking the right thing to
            measure.
          </p>
        </article>
      </Section>

      {/* ── Loading states ─────────────────────────────────────────────── */}
      <Section
        title="Loading states"
        id="loading"
        description="Skeletons mirror final geometry so swapping in content costs no CLS."
      >
        <div className="flex flex-col gap-6">
          <Row label="Primitives">
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-56" />
          </Row>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
          </div>
        </div>
      </Section>

      {/* ── Empty state ────────────────────────────────────────────────── */}
      <Section title="Empty state" id="empty">
        <Card variant="outline" padding="lg" className="max-w-xl border-dashed">
          <div className="flex flex-col items-center text-center">
            <span className="bg-surface-2 text-foreground-subtle grid size-12 place-items-center rounded-2xl">
              <Check className="size-6" aria-hidden="true" />
            </span>
            <h3 className="font-display text-h4 mt-4 font-semibold">Nothing here yet</h3>
            <p className="text-foreground-muted mt-2 max-w-sm text-sm leading-relaxed">
              Empty states always name the next action rather than just reporting the
              absence.
            </p>
            <Button size="sm" className="mt-5">
              Write the first article
            </Button>
          </div>
        </Card>
      </Section>
    </Container>
  )
}

function Section({
  title,
  id,
  description,
  children,
}: {
  title: string
  id: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={`${id}-h`} className="mb-16">
      <div className="mb-6">
        <h2 id={`${id}-h`} className="text-h3 font-semibold tracking-tight">
          {title}
        </h2>
        {description ? (
          <p className="text-foreground-muted mt-2 max-w-2xl text-sm leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      <Separator className="mb-7" />
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-eyebrow text-foreground-subtle font-sans uppercase">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}
