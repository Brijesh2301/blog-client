'use client'

import { Check, Loader } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PublicApiError, unsubscribe } from '@/lib/public-api'

/**
 * One-click unsubscribe.
 *
 * Deliberately a BUTTON the reader presses, not an action that fires on page
 * load. An email client that prefetches links would otherwise unsubscribe
 * people who never opened the message — and the address is prefilled from the
 * query string so pressing it is genuinely one click.
 *
 * The API returns 200 whether or not the address was on the list, so this
 * cannot be used to test whether someone subscribes here.
 */
export function UnsubscribeForm() {
  const prefilled = useSearchParams().get('email') ?? ''
  const [status, setStatus] = React.useState<'idle' | 'working' | 'done' | 'error'>(
    'idle'
  )
  const [message, setMessage] = React.useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim()

    if (!email) {
      setStatus('error')
      setMessage('Enter the address you want removed.')
      return
    }

    setStatus('working')
    try {
      await unsubscribe(email)
      setStatus('done')
    } catch (error) {
      setStatus('error')
      setMessage(
        error instanceof PublicApiError
          ? error.message
          : 'Something went wrong. Please try again.'
      )
    }
  }

  if (status === 'done') {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
        <span className="bg-success-500 grid size-12 place-items-center rounded-full text-white">
          <Check className="size-6" strokeWidth={3} aria-hidden="true" />
        </span>
        <h1 className="text-h3 font-semibold tracking-tight">Done</h1>
        <p className="text-foreground-muted max-w-prose text-sm leading-relaxed">
          That address has been removed. Nothing further will be sent, and the articles
          stay free to read without a subscription.
        </p>
        <Button asChild variant="secondary" size="sm">
          <Link href="/blog">Keep reading</Link>
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-border bg-surface-2 rounded-2xl border p-6 sm:p-8"
    >
      <h1 className="text-h3 font-semibold tracking-tight">Unsubscribe</h1>
      <p className="text-foreground-muted mt-2 text-sm leading-relaxed">
        Confirm the address and it is removed immediately. No survey, no retention offer.
      </p>

      <div className="mt-6">
        <Input
          label="Email address"
          name="email"
          type="email"
          required
          defaultValue={prefilled}
          maxLength={254}
          error={status === 'error' ? message : undefined}
        />
      </div>

      <Button
        type="submit"
        variant="secondary"
        className="mt-5"
        disabled={status === 'working'}
      >
        {status === 'working' ? (
          <>
            <Loader className="animate-spin" aria-hidden="true" />
            Removing…
          </>
        ) : (
          'Unsubscribe'
        )}
      </Button>
    </form>
  )
}
