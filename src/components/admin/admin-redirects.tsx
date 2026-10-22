'use client'

import { ArrowRight, Plus, Trash2 } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { AdminApiError, adminRequest } from '@/lib/admin-api'
import { cn } from '@/lib/utils'

type Row = { from: string; to: string; statusCode: number }

/**
 * Redirect manager.
 *
 * Most rows appear here automatically — renaming a published post records its
 * own 301, and deleting one records a 410. This screen exists for the cases
 * the system cannot infer: a migration from an old URL scheme, a merged pair
 * of posts, a deliberate retirement.
 *
 * The API flattens chains and refuses loops, so a row added here is safe
 * regardless of what already exists.
 */
export function AdminRedirects() {
  const [rows, setRows] = React.useState<Row[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [from, setFrom] = React.useState('')
  const [to, setTo] = React.useState('')
  const [statusCode, setStatusCode] = React.useState(301)
  const [busy, setBusy] = React.useState(false)

  /**
   * Returns the data rather than setting state, so the effect below only ever
   * calls setState from a resolved promise. Calling it synchronously inside
   * the effect body triggers a cascading render.
   */
  const fetchRows = React.useCallback(
    () => adminRequest<{ redirects: Row[] }>('/redirects'),
    []
  )

  const [reloadToken, setReloadToken] = React.useState(0)
  const reload = React.useCallback(() => setReloadToken((n) => n + 1), [])

  React.useEffect(() => {
    let cancelled = false
    fetchRows()
      .then((data) => !cancelled && setRows(data.redirects))
      .catch(() => !cancelled && setError('Could not load redirects.'))
    return () => {
      cancelled = true
    }
  }, [fetchRows, reloadToken])

  async function add(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await adminRequest('/redirects', {
        method: 'POST',
        body: { from, to, statusCode },
      })
      setFrom('')
      setTo('')
      reload()
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not add the redirect.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(path: string) {
    setBusy(true)
    try {
      await adminRequest(`/redirects?from=${encodeURIComponent(path)}`, {
        method: 'DELETE',
      })
      reload()
    } catch {
      setError('Could not delete that redirect.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-5 lg:p-8">
      <header className="mb-6">
        <h1 className="font-display text-h2 font-semibold tracking-tight">Redirects</h1>
        <p className="text-foreground-muted mt-1 max-w-2xl text-sm">
          Slug changes on published posts add their own 301 automatically, and deletions
          add a 410. Add rows here for migrations and merges.
        </p>
      </header>

      <form
        onSubmit={(e) => void add(e)}
        className="border-border bg-surface mb-6 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-end"
      >
        <label className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-eyebrow text-foreground-subtle font-sans uppercase">
            From
          </span>
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            required
            placeholder="/blog/old-slug"
            className={inputClass}
          />
        </label>

        <ArrowRight
          aria-hidden="true"
          className="text-foreground-subtle mb-2.5 hidden size-4 shrink-0 sm:block"
        />

        <label className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-eyebrow text-foreground-subtle font-sans uppercase">
            To
          </span>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            required
            placeholder="/blog/new-slug"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-eyebrow text-foreground-subtle font-sans uppercase">
            Status
          </span>
          <select
            value={statusCode}
            onChange={(e) => setStatusCode(Number(e.target.value))}
            className={inputClass}
          >
            <option value={301}>301 permanent</option>
            <option value={302}>302 temporary</option>
            <option value={410}>410 gone</option>
          </select>
        </label>

        <Button type="submit" size="md" disabled={busy || !from || !to}>
          <Plus aria-hidden="true" />
          Add
        </Button>
      </form>

      {error ? (
        <p role="alert" className="text-danger-700 mb-4 text-sm">
          {error}
        </p>
      ) : null}

      {!rows ? (
        <div className="border-border bg-surface h-32 rounded-xl border" />
      ) : rows.length === 0 ? (
        <p className="text-foreground-subtle py-16 text-center text-sm">
          No redirects yet. That is a good sign.
        </p>
      ) : (
        <div className="border-border bg-surface overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-hairline border-b text-left">
                <th className="text-eyebrow text-foreground-subtle px-4 py-2.5 font-sans uppercase">
                  From
                </th>
                <th className="text-eyebrow text-foreground-subtle px-4 py-2.5 font-sans uppercase">
                  To
                </th>
                <th className="text-eyebrow text-foreground-subtle px-4 py-2.5 font-sans uppercase">
                  Status
                </th>
                <th className="px-4 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.from} className="border-hairline border-b last:border-0">
                  <td className="font-mono-ui px-4 py-3 text-[0.8125rem]">{row.from}</td>
                  <td className="font-mono-ui text-foreground-muted px-4 py-3 text-[0.8125rem]">
                    {row.statusCode === 410 ? '—' : row.to}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'tabular rounded px-1.5 py-0.5 text-[0.6875rem] font-semibold',
                        row.statusCode === 410
                          ? 'bg-danger-100 text-danger-700 dark:bg-danger-500/15'
                          : 'bg-surface-2 text-foreground-muted'
                      )}
                    >
                      {row.statusCode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void remove(row.from)}
                      disabled={busy}
                      aria-label={`Delete redirect from ${row.from}`}
                      className="text-foreground-subtle hover:bg-danger-100 hover:text-danger-700 dark:hover:bg-danger-500/15 inline-grid size-8 place-items-center rounded-lg transition-colors"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const inputClass = cn(
  'w-full rounded-lg border border-border bg-surface px-3 py-2',
  'font-sans text-sm text-foreground',
  'placeholder:text-foreground-subtle',
  'hover:border-border-strong',
  'focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15'
)
