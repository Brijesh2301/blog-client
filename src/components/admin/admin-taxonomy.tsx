'use client'

import { Check, Pencil, Plus, Tag as TagIcon, Trash2, X } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { AdminApiError, adminRequest } from '@/lib/admin-api'
import { cn } from '@/lib/utils'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * CATEGORIES AND TAGS
 * ═════════════════════════════════════════════════════════════════════════════
 * Until now these could only be CREATED — through the API, with no UI at all.
 * A category typed wrong could never be corrected and one added by mistake
 * could never be removed except in psql.
 *
 * The thing that makes this screen more than a CRUD table is that a slug here
 * is a PUBLIC URL. Renaming `backend` to `backend-infra` moves a page that may
 * have inbound links and rankings, so the API records a 301, and deleting one
 * records a 410 — the same machinery a post slug change uses. The UI's job is
 * to say that out loud before the editor commits, not after.
 */

type Category = {
  id: string
  name: string
  slug: string
  description: string | null
  postCount?: number
}

type Tag = {
  id: string
  name: string
  slug: string
  postCount?: number
}

type Kind = 'categories' | 'tags'

export function AdminTaxonomy() {
  const [tab, setTab] = React.useState<Kind>('categories')

  return (
    <div className="flex flex-col gap-6 p-5 lg:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-h2 font-semibold tracking-tight">Taxonomy</h1>
        <p className="text-foreground-muted max-w-2xl text-sm leading-relaxed">
          Categories and tags. Each slug is a live URL — renaming one records a 301 and
          deleting one records a 410, so existing links keep working instead of turning
          into 404s.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Taxonomy type"
        className="border-border bg-surface-2 flex w-fit gap-1 rounded-lg border p-1"
      >
        {(['categories', 'tags'] as const).map((value) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              'rounded-md px-3.5 py-1.5 text-sm font-medium capitalize transition-colors',
              tab === value
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-foreground-muted hover:text-foreground'
            )}
          >
            {value}
          </button>
        ))}
      </div>

      {tab === 'categories' ? <CategoryPanel /> : <TagPanel />}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   CATEGORIES
   ═══════════════════════════════════════════════════════════════════════════ */

function CategoryPanel() {
  const [rows, setRows] = React.useState<Category[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [reload, setReload] = React.useState(0)
  const [editing, setEditing] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState<string | null>(null)

  const fetchRows = React.useCallback(
    () => adminRequest<{ categories: Category[] }>('/categories'),
    []
  )

  React.useEffect(() => {
    let cancelled = false
    fetchRows()
      .then((d) => !cancelled && setRows(d.categories))
      .catch(() => !cancelled && setError('Could not load categories.'))
    return () => {
      cancelled = true
    }
  }, [fetchRows, reload])

  async function create(form: HTMLFormElement) {
    const data = new FormData(form)
    const name = String(data.get('name') ?? '').trim()
    if (!name) return

    setBusy('new')
    setError(null)
    try {
      await adminRequest('/categories', {
        method: 'POST',
        body: {
          name,
          description: String(data.get('description') ?? '').trim() || undefined,
        },
      })
      form.reset()
      setReload((n) => n + 1)
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not create that.')
    } finally {
      setBusy(null)
    }
  }

  async function save(
    id: string,
    patch: { name: string; slug: string; description: string }
  ) {
    setBusy(id)
    setError(null)
    try {
      await adminRequest(`/categories/${id}`, {
        method: 'PATCH',
        body: {
          name: patch.name,
          slug: patch.slug,
          description: patch.description || undefined,
        },
      })
      setEditing(null)
      setReload((n) => n + 1)
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not save that.')
    } finally {
      setBusy(null)
    }
  }

  async function remove(row: Category) {
    const others = (rows ?? []).filter((r) => r.id !== row.id)
    const count = row.postCount ?? 0

    /*
     * Two different confirmations, because they are two different decisions.
     *
     * An empty category is a tidy-up. A category with posts means choosing
     * where those posts go — and the API refuses without that choice rather
     * than silently leaving published posts uncategorised, which would break
     * their breadcrumbs and their JSON-LD.
     */
    let reassignTo: string | undefined
    if (count > 0) {
      const target = window.prompt(
        `"${row.name}" still has ${count} post(s). They must move somewhere.\n\n` +
          `Type the slug of the category to move them to:\n` +
          others.map((o) => `  ${o.slug}`).join('\n')
      )
      if (!target) return
      const match = others.find((o) => o.slug === target.trim())
      if (!match) {
        setError(`No category with the slug "${target.trim()}".`)
        return
      }
      reassignTo = match.id
    } else if (
      !window.confirm(
        `Delete "${row.name}"?\n\n/category/${row.slug} will start returning 410 Gone.`
      )
    ) {
      return
    }

    setBusy(row.id)
    setError(null)
    try {
      await adminRequest(
        `/categories/${row.id}${reassignTo ? `?reassignTo=${reassignTo}` : ''}`,
        { method: 'DELETE' }
      )
      setReload((n) => n + 1)
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not delete that.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <Banner error={error} />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void create(e.currentTarget)
        }}
        className="border-border bg-surface flex flex-col gap-3 rounded-xl border p-4"
      >
        <h2 className="text-eyebrow text-foreground-subtle font-sans uppercase">
          Add a category
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            name="name"
            required
            maxLength={120}
            placeholder="Name"
            className={cn(inputClass, 'sm:w-56')}
          />
          <input
            name="description"
            maxLength={1000}
            placeholder="Short description (optional)"
            className={cn(inputClass, 'flex-1')}
          />
          <Button type="submit" size="sm" disabled={busy === 'new'}>
            <Plus aria-hidden="true" />
            Add
          </Button>
        </div>
        <p className="text-foreground-subtle text-xs">
          The slug is derived from the name and made unique automatically.
        </p>
      </form>

      {rows === null ? (
        <Skeleton />
      ) : rows.length === 0 ? (
        <Empty label="No categories yet." />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) =>
            editing === row.id ? (
              <li key={row.id}>
                <CategoryEditor
                  row={row}
                  busy={busy === row.id}
                  onCancel={() => setEditing(null)}
                  onSave={(patch) => void save(row.id, patch)}
                />
              </li>
            ) : (
              <li
                key={row.id}
                className={cn(
                  'border-border bg-surface flex items-start gap-3 rounded-xl border p-4 transition-opacity',
                  busy === row.id && 'pointer-events-none opacity-50'
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{row.name}</span>
                    <code className="bg-surface-2 font-mono-ui text-foreground-muted rounded px-1.5 py-0.5 text-xs">
                      /category/{row.slug}
                    </code>
                    {typeof row.postCount === 'number' ? (
                      <span className="text-meta text-foreground-subtle">
                        {row.postCount} post{row.postCount === 1 ? '' : 's'}
                      </span>
                    ) : null}
                  </div>
                  {row.description ? (
                    <p className="text-foreground-muted mt-1 text-sm">
                      {row.description}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 gap-1">
                  <Button size="xs" variant="ghost" onClick={() => setEditing(row.id)}>
                    <Pencil aria-hidden="true" />
                    Edit
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => void remove(row)}>
                    <Trash2 aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  )
}

function CategoryEditor({
  row,
  busy,
  onCancel,
  onSave,
}: {
  row: Category
  busy: boolean
  onCancel: () => void
  onSave: (patch: { name: string; slug: string; description: string }) => void
}) {
  const [name, setName] = React.useState(row.name)
  const [slug, setSlug] = React.useState(row.slug)
  const [description, setDescription] = React.useState(row.description ?? '')

  const slugChanged = slug !== row.slug

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ name, slug, description })
      }}
      className={cn(
        'border-primary/40 bg-surface flex flex-col gap-3 rounded-xl border p-4',
        busy && 'pointer-events-none opacity-50'
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={120}
          aria-label="Name"
          className={cn(inputClass, 'sm:w-56')}
        />
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          maxLength={140}
          aria-label="Slug"
          className={cn(inputClass, 'font-mono-ui sm:w-64')}
        />
      </div>

      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={1000}
        placeholder="Description"
        aria-label="Description"
        className={inputClass}
      />

      {/*
        Said BEFORE the save, not after. An editor changing a slug is moving a
        public URL, and the consequence should not be a surprise discovered in
        the redirects table later.
      */}
      {slugChanged ? (
        <p className="border-highlight/40 bg-highlight-soft rounded-lg border px-3 py-2 text-xs leading-relaxed">
          Saving records a <strong>301</strong> from <code>/category/{row.slug}</code> to{' '}
          <code>/category/{slug}</code>, so existing links keep working.
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" size="xs" disabled={busy}>
          <Check aria-hidden="true" />
          Save
        </Button>
        <Button type="button" size="xs" variant="ghost" onClick={onCancel}>
          <X aria-hidden="true" />
          Cancel
        </Button>
      </div>
    </form>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAGS
   ═══════════════════════════════════════════════════════════════════════════ */

function TagPanel() {
  const [rows, setRows] = React.useState<Tag[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [reload, setReload] = React.useState(0)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [editing, setEditing] = React.useState<string | null>(null)

  const fetchRows = React.useCallback(() => adminRequest<{ tags: Tag[] }>('/tags'), [])

  React.useEffect(() => {
    let cancelled = false
    fetchRows()
      .then((d) => !cancelled && setRows(d.tags))
      .catch(() => !cancelled && setError('Could not load tags.'))
    return () => {
      cancelled = true
    }
  }, [fetchRows, reload])

  async function act(id: string, run: () => Promise<unknown>, failure: string) {
    setBusy(id)
    setError(null)
    try {
      await run()
      setEditing(null)
      setReload((n) => n + 1)
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : failure)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <Banner error={error} />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          const form = e.currentTarget
          const name = String(new FormData(form).get('name') ?? '').trim()
          if (!name) return
          void act(
            'new',
            () => adminRequest('/tags', { method: 'POST', body: { name } }),
            'Could not create that tag.'
          ).then(() => form.reset())
        }}
        className="border-border bg-surface flex flex-col gap-3 rounded-xl border p-4"
      >
        <h2 className="text-eyebrow text-foreground-subtle font-sans uppercase">
          Add a tag
        </h2>
        <div className="flex gap-3">
          <input
            name="name"
            required
            maxLength={80}
            placeholder="Tag name"
            className={cn(inputClass, 'flex-1')}
          />
          <Button type="submit" size="sm" disabled={busy === 'new'}>
            <Plus aria-hidden="true" />
            Add
          </Button>
        </div>
      </form>

      {rows === null ? (
        <Skeleton />
      ) : rows.length === 0 ? (
        <Empty label="No tags yet." />
      ) : (
        <ul className="flex flex-wrap gap-2">
          {rows.map((row) => (
            <li key={row.id}>
              {editing === row.id ? (
                <TagEditor
                  row={row}
                  busy={busy === row.id}
                  onCancel={() => setEditing(null)}
                  onSave={(patch) =>
                    void act(
                      row.id,
                      () =>
                        adminRequest(`/tags/${row.id}`, { method: 'PATCH', body: patch }),
                      'Could not rename that tag.'
                    )
                  }
                />
              ) : (
                <div
                  className={cn(
                    'border-border bg-surface flex items-center gap-2 rounded-full border py-1 pl-3 pr-1 text-sm',
                    busy === row.id && 'pointer-events-none opacity-50'
                  )}
                >
                  <TagIcon className="text-foreground-subtle size-3" aria-hidden="true" />
                  <span>{row.name}</span>
                  {typeof row.postCount === 'number' ? (
                    <span className="text-foreground-subtle text-xs">
                      {row.postCount}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setEditing(row.id)}
                    aria-label={`Rename ${row.name}`}
                    className="text-foreground-subtle hover:bg-surface-2 hover:text-foreground grid size-6 place-items-center rounded-full transition-colors"
                  >
                    <Pencil className="size-3" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${row.name}`}
                    onClick={() => {
                      // Tags are a browsing aid, not structural: deleting one
                      // removes the associations and leaves every post intact,
                      // so this needs a confirm rather than a reassignment.
                      if (
                        !window.confirm(
                          `Delete the tag "${row.name}"?\n\nPosts keep their content; they just lose this tag. /tag/${row.slug} will return 410 Gone.`
                        )
                      ) {
                        return
                      }
                      void act(
                        row.id,
                        () => adminRequest(`/tags/${row.id}`, { method: 'DELETE' }),
                        'Could not delete that tag.'
                      )
                    }}
                    className="text-foreground-subtle hover:bg-danger-500/15 hover:text-danger-700 dark:hover:text-danger-500 grid size-6 place-items-center rounded-full transition-colors"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function TagEditor({
  row,
  busy,
  onCancel,
  onSave,
}: {
  row: Tag
  busy: boolean
  onCancel: () => void
  onSave: (patch: { name: string; slug: string }) => void
}) {
  const [name, setName] = React.useState(row.name)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ name, slug: row.slug })
      }}
      className={cn(
        'border-primary/40 bg-surface flex items-center gap-1 rounded-full border py-1 pl-2 pr-1',
        busy && 'pointer-events-none opacity-50'
      )}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label={`Rename ${row.name}`}
        maxLength={80}
        className="w-32 bg-transparent px-1 text-sm outline-none"
      />
      <button
        type="submit"
        aria-label="Save"
        className="text-primary hover:bg-primary-soft grid size-6 place-items-center rounded-full"
      >
        <Check className="size-3" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel"
        className="text-foreground-subtle hover:bg-surface-2 grid size-6 place-items-center rounded-full"
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </form>
  )
}

/* ── shared bits ─────────────────────────────────────────────────────────── */

function Banner({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <p
      role="alert"
      className="border-danger-500/30 bg-danger-500/10 text-danger-700 dark:text-danger-500 rounded-lg border px-4 py-3 text-sm"
    >
      {error}
    </p>
  )
}

function Skeleton() {
  return (
    <ul className="flex flex-col gap-2">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="border-border bg-surface-2 h-16 animate-pulse rounded-xl border"
        />
      ))}
    </ul>
  )
}

function Empty({ label }: { label: string }) {
  return (
    <p className="border-border bg-surface-2 text-foreground-muted rounded-xl border px-6 py-10 text-center text-sm">
      {label}
    </p>
  )
}

const inputClass = cn(
  'w-full rounded-lg border border-border bg-surface px-3 py-2',
  'font-sans text-[0.9375rem] text-foreground',
  'transition-[border-color,box-shadow] duration-150',
  'placeholder:text-foreground-subtle',
  'hover:border-border-strong',
  'focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15'
)
