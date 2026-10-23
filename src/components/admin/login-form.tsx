'use client'

import { ArrowRight, Loader, TriangleAlert } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AdminApiError, adminRequest } from '@/lib/admin-api'
import Link from 'next/link'

/**
 * Sign-in form.
 *
 * Tokens never touch JavaScript: the API sets httpOnly cookies, and this just
 * posts credentials and navigates. There is nothing to store client-side.
 *
 * The `next` parameter is validated before use — an open redirect here would
 * let an attacker send a signed-in editor to an external page that looks like
 * part of the admin.
 */
export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  function safeNext(): string {
    const raw = searchParams.get('next') ?? '/admin'
    // Must be a site-relative path. `//evil.com` is protocol-relative and would
    // leave the site, so a second leading slash is rejected too.
    if (!raw.startsWith('/') || raw.startsWith('//')) return '/admin'
    return raw
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const data = new FormData(event.currentTarget)

    try {
      await adminRequest('/auth/login', {
        method: 'POST',
        body: {
          email: String(data.get('email') ?? ''),
          password: String(data.get('password') ?? ''),
        },
      })
      router.replace(safeNext())
      router.refresh()
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : 'Could not sign in. Check your connection.'
      )
      setPending(false)
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      noValidate
      className="border-border bg-surface flex flex-col gap-4 rounded-2xl border p-6"
    >
      {error ? (
        <p
          role="alert"
          className="border-danger-500/30 bg-danger-100/60 text-danger-700 dark:bg-danger-500/10 flex items-start gap-2 rounded-lg border p-3 text-sm"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}

      <Input
        name="email"
        type="email"
        label="Email address"
        autoComplete="username"
        required
        disabled={pending}
      />

      <Input
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        required
        disabled={pending}
      />

 <Link href="/forgot-password" className="text-primary -mt-2 self-end text-sm hover:underline">
  Forgot password?
</Link>

      <Button type="submit" size="lg" disabled={pending} className="mt-1">
        {pending ? (
          <>
            <Loader className="animate-spin" aria-hidden="true" />
            Signing in
          </>
        ) : (
          <>
            Sign in
            <ArrowRight aria-hidden="true" />
          </>
        )}
      </Button>
    </form>
  )
}
