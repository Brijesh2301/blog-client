'use client'

import { Cookie, X } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { useConsent } from '@/components/consent/consent-provider'
import { Button } from '@/components/ui/button'
import { localePath, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { cn } from '@/lib/utils'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * CONSENT BANNER
 * ═════════════════════════════════════════════════════════════════════════════
 * Three design decisions here are legal requirements, not taste:
 *
 *  1. "Reject all" is the SAME visual weight as "Accept all". A reject button
 *     hidden behind a "manage preferences" link, or styled as a grey
 *     afterthought next to a bright accept, is the dark pattern that EU
 *     regulators have specifically fined people for. Refusing must be exactly
 *     as cheap as accepting.
 *  2. Nothing optional loads before a decision. The defaults in
 *     CONSENT_BOOTSTRAP are all `denied`, so the window between first paint
 *     and a click is a refusal, not a provisional yes.
 *  3. There is NO dismiss-without-choosing. Closing a banner is not consent,
 *     so the close affordance is "Reject all" — which is a real choice.
 *
 * And one that is about SEO rather than law:
 *
 *  4. It is `fixed`, so it occupies no space in the document flow and cannot
 *     contribute to CLS. A banner that pushes the article down on arrival is
 *     a Core Web Vitals failure on literally every page of the site, and this
 *     is the single most common way sites fail CLS in the field.
 */

export function ConsentBanner({ locale }: { locale: Locale }) {
  const t = getDictionary(locale)

  const { needsDecision, acceptAll, rejectAll, save } = useConsent()
  const [detailed, setDetailed] = React.useState(false)
  const [analytics, setAnalytics] = React.useState(false)
  const [advertising, setAdvertising] = React.useState(false)

  if (!needsDecision) return null

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-heading"
      aria-describedby="consent-body"
      className={cn(
        // `fixed`, so it is outside the flow and contributes nothing to CLS.
        'fixed inset-x-0 bottom-0 z-[60]',
        'border-border bg-surface border-t shadow-2xl',
        'pb-[max(1rem,env(safe-area-inset-bottom))] pt-4',
        'sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[min(28rem,calc(100vw-2.5rem))]',
        'sm:rounded-2xl sm:border sm:pb-4',
        'motion-safe:animate-[fade-up_0.35s_cubic-bezier(0.16,1,0.3,1)_both]'
      )}
    >
      <div className="px-4 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="bg-primary-soft grid size-9 shrink-0 place-items-center rounded-full">
            <Cookie className="text-primary size-4" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <h2 id="consent-heading" className="font-display text-base font-semibold">
              {t.consent.heading}
            </h2>
            <p
              id="consent-body"
              className="text-foreground-muted mt-1 text-sm leading-relaxed"
            >
              {t.consent.body}{' '}
              <Link
                href={localePath('/cookie-policy', locale)}
                className="decoration-border hover:text-primary hover:decoration-primary underline underline-offset-2 transition-colors"
              >
                {t.consent.cookiePolicy}
              </Link>
              .
            </p>
          </div>
        </div>

        {detailed ? (
          <div className="border-border bg-surface-2 mt-4 flex flex-col gap-3 rounded-xl border p-3.5">
            <Row
              label={t.consent.necessary}
              hint={t.consent.necessaryHint}
              checked
              disabled
            />
            <Row
              label={t.consent.analytics}
              hint={t.consent.analyticsHint}
              checked={analytics}
              onChange={setAnalytics}
            />
            <Row
              label={t.consent.advertising}
              hint={t.consent.advertisingHint}
              checked={advertising}
              onChange={setAdvertising}
            />
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-2">
          <div className="flex gap-2">
            {/*
              Equal weight, deliberately. Both are `md`, both full width, and
              the only difference is colour — reject is `secondary`, not a
              de-emphasised link.
            */}
            <Button size="sm" className="flex-1" onClick={acceptAll}>
              {t.consent.acceptAll}
            </Button>
            <Button size="sm" variant="secondary" className="flex-1" onClick={rejectAll}>
              {t.consent.rejectAll}
            </Button>
          </div>

          {detailed ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => save({ analytics, advertising })}
            >
              {t.consent.saveChoices}
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setDetailed(true)}>
              {t.consent.chooseIndividually}
            </Button>
          )}
        </div>
      </div>

      {/*
        The close button rejects rather than dismissing. Letting someone close
        the banner without a decision would mean re-asking on every page view,
        and treating a dismissal as acceptance is exactly what is not allowed.
      */}
      <button
        type="button"
        onClick={rejectAll}
        aria-label={t.consent.closeAndReject}
        className="text-foreground-subtle hover:bg-surface-2 hover:text-foreground absolute right-2 top-2 grid size-8 place-items-center rounded-lg transition-colors"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}

function Row({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  disabled?: boolean
  onChange?: (checked: boolean) => void
}) {
  return (
    <label
      className={cn(
        'flex items-start gap-3',
        disabled ? 'cursor-default opacity-70' : 'cursor-pointer'
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors',
          'peer-focus-visible:ring-primary/35 peer-focus-visible:ring-2',
          'peer-focus-visible:ring-offset-surface-2 peer-focus-visible:ring-offset-2',
          checked ? 'bg-primary' : 'bg-border'
        )}
      >
        <span
          className={cn(
            'bg-surface size-4 rounded-full shadow-sm transition-transform',
            checked && 'translate-x-4'
          )}
        />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-foreground text-sm font-medium">{label}</span>
        <span className="text-foreground-subtle text-xs leading-relaxed">{hint}</span>
      </span>
    </label>
  )
}

/**
 * The permanent way back into this decision.
 *
 * Required: consent must be as easy to withdraw as it was to give. The footer
 * renders this, so there is always a route back regardless of what was chosen.
 */
export function ConsentSettingsButton({ className }: { className?: string }) {
  const { reopen } = useConsent()

  return (
    <button
      type="button"
      onClick={reopen}
      className={cn('hover:text-foreground transition-colors', className)}
    >
      Cookie settings
    </button>
  )
}
