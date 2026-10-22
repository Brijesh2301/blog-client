'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, Loader, Mail } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PublicApiError, subscribe } from '@/lib/public-api'
import { cn } from '@/lib/utils'

type Status = 'idle' | 'submitting' | 'success' | 'error'

/**
 * Newsletter signup.
 *
 * Validation runs on submit (not on every keystroke) so a half-typed address
 * is not flagged as wrong while the user is still typing — the pattern that
 * makes inline validation feel hostile.
 *
 * Spam defences present from Phase 1:
 *  - a honeypot field that real users cannot see or focus;
 *  - a time-to-submit check (bots post instantly);
 *  - server-side validation in the route handler regardless of either.
 * Turnstile is added in Phase 8 alongside the other public forms.
 */
export function NewsletterForm({
  variant = 'inline',
  className,
  showHeading = true,
}: {
  variant?: 'inline' | 'footer' | 'card'
  className?: string
  /**
   * Set false when the surrounding section already has a heading. Two headings
   * describing the same thing is both a hierarchy problem for assistive tech
   * and duplicated copy for the reader.
   */
  showHeading?: boolean
}) {
  const [status, setStatus] = React.useState<Status>('idle')
  const [error, setError] = React.useState<string>()
  // Timestamped in an effect, not during render: Date.now() is impure, and a
  // render-time call makes the value unstable across re-renders. 0 means
  // "unknown", which the route handler treats as "skip the timing check".
  const mountedAt = React.useRef(0)
  React.useEffect(() => {
    mountedAt.current = Date.now()
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const email = String(data.get('email') ?? '').trim()

    // Honeypot: hidden from users, irresistible to bots.
    if (data.get('company')) return

    if (!email) {
      setStatus('error')
      setError('Enter your email address.')
      return
    }
    // Deliberately permissive: the authoritative check is server-side. This
    // only catches obvious typos before costing a round trip.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setStatus('error')
      setError('That does not look like a valid email address.')
      return
    }

    setStatus('submitting')
    setError(undefined)

    try {
      /*
       * The API's response is identical whether or not this address was
       * already on the list — deliberately, so the form cannot be used to
       * check whether a given person reads this site. The success copy below
       * says "check your inbox" rather than "you are subscribed" for the same
       * reason: it is true in both cases.
       */
      await subscribe({
        email,
        source: variant,
        elapsedMs: mountedAt.current ? Date.now() - mountedAt.current : 0,
      })

      setStatus('success')
      form.reset()
    } catch (err) {
      setStatus('error')
      setError(
        err instanceof PublicApiError
          ? err.message
          : 'Something went wrong. Please try again.'
      )
    }
  }

  return (
    <div className={cn('w-full', className)}>
      {variant !== 'footer' && showHeading ? (
        <div className="mb-5 flex flex-col gap-2">
          <h2 className="font-display text-h3 font-semibold tracking-tight">
            The Devlume dispatch
          </h2>
          <p className="text-foreground-muted text-sm leading-relaxed">
            One deeply researched engineering essay a week. No digests, no
            cross-promotion, one click to leave.
          </p>
        </div>
      ) : variant === 'footer' ? (
        <p className="text-eyebrow text-foreground-subtle mb-3 font-sans uppercase">
          Weekly dispatch
        </p>
      ) : null}

      <AnimatePresence mode="wait" initial={false}>
        {status === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            role="status"
            className="border-success-500/30 bg-success-100/60 dark:bg-success-500/10 flex items-start gap-3 rounded-lg border p-4"
          >
            <motion.span
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.08, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              className="bg-success-500 mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-white"
            >
              <Check className="size-3" aria-hidden="true" strokeWidth={3} />
            </motion.span>
            <div className="text-sm">
              <p className="text-foreground font-semibold">Almost there.</p>
              <p className="text-foreground-muted mt-0.5">
                Check your inbox and confirm the subscription — we use double opt-in, so
                nothing is sent until you do.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            noValidate
            initial={false}
            className={cn(
              'flex w-full gap-2.5',
              variant === 'inline' ? 'flex-col sm:flex-row sm:items-start' : 'flex-col'
            )}
          >
            {/* Honeypot. Not type=hidden: bots skip those. */}
            <div
              aria-hidden="true"
              className="absolute left-[-9999px] h-0 w-0 overflow-hidden"
            >
              <label htmlFor="nl-company">Company</label>
              <input
                id="nl-company"
                name="company"
                type="text"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div className="min-w-0 flex-1">
              <Input
                name="email"
                type="email"
                label="Email address"
                autoComplete="email"
                required
                icon={<Mail />}
                error={status === 'error' ? error : undefined}
                disabled={status === 'submitting'}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={status === 'submitting'}
              className={cn('shrink-0', variant === 'inline' ? 'sm:h-14' : 'h-12 w-full')}
            >
              {status === 'submitting' ? (
                <>
                  <Loader className="animate-spin" aria-hidden="true" />
                  Subscribing
                </>
              ) : (
                <>
                  Subscribe
                  <ArrowRight aria-hidden="true" />
                </>
              )}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      {variant !== 'footer' ? (
        <p className="text-meta text-foreground-subtle mt-3">
          Double opt-in. We never sell or share your address.
        </p>
      ) : null}
    </div>
  )
}
