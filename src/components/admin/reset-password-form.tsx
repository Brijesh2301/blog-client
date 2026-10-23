'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AdminApiError, adminRequest } from '@/lib/admin-api'

export function ResetPasswordForm() {
  const router = useRouter()
  const token = useSearchParams().get('token') ?? ''
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const password = String(data.get('password') ?? '')
    if (password !== String(data.get('confirm') ?? '')) {
      setError('Passwords do not match.')
      return
    }
    setPending(true)
    setError(null)
    try {
      await adminRequest('/auth/reset-password', { method: 'POST', body: { token, password } })
      router.replace('/login')
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not reset password.')
      setPending(false)
    }
  }

  if (!token) return <p className="text-sm">This reset link is missing its token.</p>

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      noValidate
      className="border-border bg-surface flex flex-col gap-4 rounded-2xl border p-6"
    >
      {error ? <p role="alert" className="text-danger-700 text-sm">{error}</p> : null}
      <Input name="password" type="password" label="New password (min 10 characters)" autoComplete="new-password" required disabled={pending} />
      <Input name="confirm" type="password" label="Confirm password" autoComplete="new-password" required disabled={pending} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Saving…' : 'Set new password'}
      </Button>
    </form>
  )
}
