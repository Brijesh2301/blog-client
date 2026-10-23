'use client'

import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AdminApiError, adminRequest } from '@/lib/admin-api'

export function ForgotPasswordForm() {
  const [pending, setPending] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const data = new FormData(event.currentTarget)
    try {
      await adminRequest('/auth/forgot-password', {
        method: 'POST',
        body: { email: String(data.get('email') ?? '') },
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Something went wrong. Try again.')
    } finally {
      setPending(false)
    }
  }

  if (done) {
    return (
      <p className="border-border bg-surface rounded-2xl border p-6 text-sm">
        If that email is registered, a reset link is on its way. It expires in 30 minutes.
      </p>
    )
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      noValidate
      className="border-border bg-surface flex flex-col gap-4 rounded-2xl border p-6"
    >
      {error ? <p role="alert" className="text-danger-700 text-sm">{error}</p> : null}
      <Input name="email" type="email" label="Email address" autoComplete="username" required disabled={pending} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Sending…' : 'Send reset link'}
      </Button>
    </form>
  )
}
