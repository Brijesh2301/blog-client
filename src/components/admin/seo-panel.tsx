'use client'

import { Check, CircleAlert, TriangleAlert } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { SeoCheck, SeoReport } from '@/types/admin'

/**
 * Live SEO score panel.
 *
 * The score and checks come from the SERVER (`POST /admin/seo-score`), which is
 * the same function the publish endpoint enforces. That is the whole point: a
 * panel computed in the browser could disagree with what the API accepts, and
 * the writer would be told they are ready to publish when they are not.
 *
 * Blocking failures are listed first and marked, because they are the only
 * ones that actually prevent publishing — everything else is advice.
 */
export function SeoPanel({
  report,
  pending,
}: {
  report: SeoReport | null
  pending: boolean
}) {
  if (!report) {
    return (
      <section className="border-border bg-surface rounded-xl border p-4">
        <h3 className="text-eyebrow text-foreground-subtle font-sans uppercase">
          SEO score
        </h3>
        <p className="text-foreground-muted mt-3 text-sm">
          {pending ? 'Scoring…' : 'Start writing to see the checklist.'}
        </p>
      </section>
    )
  }

  const { score, checks, blockers } = report
  const tone =
    score >= 85 ? 'success' : score >= 70 ? 'warn' : score >= 50 ? 'low' : 'bad'

  // Blockers first, then failures, then warnings, then passes.
  const order: Record<SeoCheck['status'], number> = { fail: 0, warn: 1, pass: 2 }
  const sorted = [...checks].sort((a, b) => {
    if (a.blocking !== b.blocking && (a.status === 'fail' || b.status === 'fail')) {
      return a.blocking ? -1 : 1
    }
    return order[a.status] - order[b.status] || b.weight - a.weight
  })

  return (
    <section
      aria-labelledby="seo-score-heading"
      className={cn(
        'bg-surface rounded-xl border p-4 transition-opacity',
        pending && 'opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3
            id="seo-score-heading"
            className="text-eyebrow text-foreground-subtle font-sans uppercase"
          >
            SEO score
          </h3>
          <p className="text-meta text-foreground-subtle mt-1">
            {report.wordCount.toLocaleString('en-US')} words · {report.readingMinutes} min
            {report.keywordDensity > 0 ? ` · ${report.keywordDensity}% density` : ''}
          </p>
        </div>

        <ScoreDial score={score} tone={tone} />
      </div>

      {blockers.length > 0 ? (
        <p
          role="status"
          className="border-danger-500/35 bg-danger-100/60 text-danger-700 dark:bg-danger-500/10 mt-4 flex items-start gap-2 rounded-lg border p-3 text-sm"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-semibold">
              {blockers.length} issue{blockers.length === 1 ? '' : 's'} block publishing.
            </strong>{' '}
            Fix them below to enable the publish button.
          </span>
        </p>
      ) : null}

      <ul className="mt-4 flex flex-col gap-1.5">
        {sorted.map((check) => (
          <li key={check.id}>
            <div
              className={cn(
                'flex items-start gap-2.5 rounded-lg px-2.5 py-2',
                check.status === 'fail' &&
                  check.blocking &&
                  'bg-danger-100/50 dark:bg-danger-500/10'
              )}
            >
              <StatusIcon status={check.status} />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'text-sm leading-snug',
                    check.status === 'pass'
                      ? 'text-foreground-muted'
                      : 'text-foreground font-medium'
                  )}
                >
                  {check.label}
                  {check.blocking && check.status === 'fail' ? (
                    <span className="bg-danger-500/15 text-danger-700 ml-1.5 rounded px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide">
                      Blocks publish
                    </span>
                  ) : null}
                </p>
                {check.status !== 'pass' && check.hint ? (
                  <p className="text-meta text-foreground-subtle mt-0.5 leading-snug">
                    {check.hint}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function StatusIcon({ status }: { status: SeoCheck['status'] }) {
  if (status === 'pass') {
    return (
      <span className="bg-success-500 mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-white">
        <Check className="size-2.5" strokeWidth={3} aria-label="Pass" />
      </span>
    )
  }
  if (status === 'warn') {
    return (
      <TriangleAlert
        className="text-highlight mt-0.5 size-4 shrink-0"
        aria-label="Warning"
      />
    )
  }
  return (
    <CircleAlert className="text-danger-500 mt-0.5 size-4 shrink-0" aria-label="Fail" />
  )
}

/**
 * Score dial.
 *
 * An SVG ring rather than a bar: it reads at a glance from across a desk, and
 * `stroke-dashoffset` animates on the compositor so updating it as the writer
 * types costs no layout work.
 */
function ScoreDial({ score, tone }: { score: number; tone: string }) {
  const RADIUS = 26
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const offset = CIRCUMFERENCE * (1 - Math.min(100, Math.max(0, score)) / 100)

  const colour =
    tone === 'success'
      ? 'text-success-500'
      : tone === 'warn'
        ? 'text-highlight'
        : tone === 'low'
          ? 'text-warm-600'
          : 'text-danger-500'

  return (
    <div className="relative grid size-16 shrink-0 place-items-center">
      <svg viewBox="0 0 64 64" className="size-16 -rotate-90" aria-hidden="true">
        <circle
          cx="32"
          cy="32"
          r={RADIUS}
          fill="none"
          strokeWidth="5"
          className="stroke-border"
        />
        <circle
          cx="32"
          cy="32"
          r={RADIUS}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className={cn(
            'stroke-current transition-[stroke-dashoffset] duration-500',
            colour
          )}
        />
      </svg>
      <span className="font-display tabular absolute text-lg font-bold">{score}</span>
      <span className="sr-only">SEO score {score} out of 100</span>
    </div>
  )
}
