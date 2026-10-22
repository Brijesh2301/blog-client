'use client'

import { ArrowLeft, Eye, Loader, Save, Send, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { ImageUploader } from '@/components/admin/image-uploader'
import { RichEditor } from '@/components/admin/rich-editor'
import { SeoPanel } from '@/components/admin/seo-panel'
import { SerpPreview } from '@/components/admin/serp-preview'
import { Button } from '@/components/ui/button'
import { siteConfig } from '@/config/site'
import { AdminApiError, adminRequest, scoreDraft } from '@/lib/admin-api'
import { cn, slugify } from '@/lib/utils'
import type { SeoReport } from '@/types/admin'
import type { Category, PostDetail } from '@/types/content'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * POST EDITOR
 * ═════════════════════════════════════════════════════════════════════════════
 * Behaviours worth knowing:
 *
 *  - The SEO score is computed by the SERVER as you type (debounced), using the
 *    same function the publish endpoint enforces. The panel can therefore never
 *    tell you a post is ready when the API would reject it.
 *
 *  - Publish is DISABLED while blocking checks fail, and the API rejects it
 *    anyway. The button state is a convenience, not the control.
 *
 *  - The slug follows the title only until you touch it. After that it is
 *    yours, because changing a published slug costs a redirect and should
 *    never happen by accident.
 *
 *  - Autosave runs for drafts only. Silently autosaving a PUBLISHED post would
 *    push half-finished edits live.
 */

type Draft = {
  title: string
  slug: string
  subtitle: string
  excerpt: string
  contentHtml: string
  coverImageUrl: string
  coverImageAlt: string
  metaTitle: string
  metaDescription: string
  focusKeyword: string
  categoryId: string
  status: PostDetail['status']
  /** Listen + discussion, toggled per post. */
  audioEnabled: boolean
  audioVoice: string
  allowComments: boolean
}

const EMPTY: Draft = {
  title: '',
  slug: '',
  subtitle: '',
  excerpt: '',
  contentHtml: '',
  coverImageUrl: '',
  coverImageAlt: '',
  metaTitle: '',
  metaDescription: '',
  focusKeyword: '',
  categoryId: '',
  status: 'draft',
  // Both default ON for a new post. Listen costs nothing on the free tier and
  // an article with the discussion closed by default never grows one.
  audioEnabled: true,
  audioVoice: '',
  allowComments: true,
}

export function PostEditor({
  post,
  categories,
}: {
  /** Null when creating. */
  post: PostDetail | null
  categories: Category[]
}) {
  const router = useRouter()

  const [draft, setDraft] = React.useState<Draft>(() =>
    post
      ? {
          title: post.title,
          slug: post.slug,
          subtitle: post.subtitle ?? '',
          excerpt: post.excerpt ?? '',
          contentHtml: post.contentHtml ?? '',
          coverImageUrl: post.coverImageUrl ?? '',
          coverImageAlt: post.coverImageAlt ?? '',
          metaTitle: post.metaTitle ?? '',
          metaDescription: post.metaDescription ?? '',
          focusKeyword: post.focusKeyword ?? '',
          categoryId: post.category?.id ?? '',
          status: post.status,
          audioEnabled: post.audioEnabled,
          audioVoice: post.audioVoice ?? '',
          allowComments: post.allowComments,
        }
      : EMPTY
  )

  const [slugTouched, setSlugTouched] = React.useState(Boolean(post))
  /**
   * The report is stored WITH the draft it describes, so "is it still
   * scoring?" is derived rather than tracked. A separate boolean would have to
   * be set synchronously inside the effect — which causes a cascading render —
   * and could go stale if a request failed.
   */
  const [result, setResult] = React.useState<{ key: string; report: SeoReport } | null>(
    null
  )
  const [saving, setSaving] = React.useState<false | 'draft' | 'publish'>(false)
  const [error, setError] = React.useState<string | null>(null)
  const [savedAt, setSavedAt] = React.useState<string | null>(null)
  const [tab, setTab] = React.useState<'write' | 'html' | 'preview'>('write')

  const postId = post?.id ?? null

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((previous) => {
      const next = { ...previous, [key]: value }
      // The slug tracks the title until the writer edits it themselves.
      if (key === 'title' && !slugTouched) next.slug = slugify(String(value))
      return next
    })
  }

  // ── Live scoring, debounced ─────────────────────────────────────────────
  const scoreInput = React.useMemo(
    () => ({
      title: draft.title,
      metaTitle: draft.metaTitle,
      metaDescription: draft.metaDescription,
      slug: draft.slug,
      excerpt: draft.excerpt,
      focusKeyword: draft.focusKeyword,
      contentHtml: draft.contentHtml,
      coverImageUrl: draft.coverImageUrl,
      coverImageAlt: draft.coverImageAlt,
      categoryId: draft.categoryId,
      tagCount: post?.tags.length ?? 0,
    }),
    [draft, post?.tags.length]
  )
  const draftKey = JSON.stringify(scoreInput)

  React.useEffect(() => {
    const controller = new AbortController()

    const timer = setTimeout(() => {
      scoreDraft(scoreInput, controller.signal)
        .then((next) => setResult({ key: draftKey, report: next }))
        .catch(() => {
          // An aborted request is the normal case while typing; nothing to do.
        })
    }, 500)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [draftKey, scoreInput])

  const report = result?.report ?? null
  const scoring = result === null || result.key !== draftKey
  const blocked = (report?.blockers.length ?? 0) > 0

  async function save(target: 'draft' | 'publish') {
    setSaving(target)
    setError(null)

    const payload = {
      ...draft,
      status: target === 'publish' ? ('published' as const) : draft.status,
      // Empty strings would fail url()/uuid() validation; omit instead.
      coverImageUrl: draft.coverImageUrl || undefined,
      categoryId: draft.categoryId || undefined,
      subtitle: draft.subtitle || undefined,
      metaTitle: draft.metaTitle || undefined,
      focusKeyword: draft.focusKeyword || undefined,
      // Empty means "the provider's default voice", which the API expresses
      // as absent rather than as an empty string.
      audioVoice: draft.audioVoice || undefined,
      contentText: stripHtml(draft.contentHtml),
    }

    try {
      if (postId) {
        await adminRequest(`/posts/${postId}`, { method: 'PATCH', body: payload })
      } else {
        const created = await adminRequest<{ post: { id: string } }>('/posts', {
          method: 'POST',
          body: payload,
        })
        router.replace(`/admin/posts/${created.post.id}`)
      }
      setSavedAt(new Date().toLocaleTimeString())
      if (target === 'publish') router.refresh()
    } catch (err) {
      if (err instanceof AdminApiError) {
        const detail = extractFieldErrors(err.details)
        setError(detail ? `${err.message} ${detail}` : err.message)
      } else {
        setError('Could not save. Check your connection and try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  // ── Autosave: drafts only ───────────────────────────────────────────────
  React.useEffect(() => {
    if (!postId || draft.status === 'published' || draft.status === 'scheduled') return
    if (!draft.title.trim()) return

    const timer = setTimeout(() => {
      void adminRequest(`/posts/${postId}`, {
        method: 'PATCH',
        body: {
          title: draft.title,
          contentHtml: draft.contentHtml,
          contentText: stripHtml(draft.contentHtml),
          excerpt: draft.excerpt || undefined,
        },
      })
        .then(() => setSavedAt(`${new Date().toLocaleTimeString()} (autosaved)`))
        .catch(() => undefined)
    }, 8000)

    return () => clearTimeout(timer)
  }, [draft, postId])

  return (
    <div className="flex min-h-dvh flex-col">
      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      {/* Every page needs exactly one H1 for the document outline, including
          admin screens. The visible "title" here is a form field, not a
          heading, so the H1 is visually hidden. */}
      <h1 className="sr-only">{post ? `Editing: ${post.title}` : 'New post'}</h1>

      <header className="border-border bg-surface/95 sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b px-5 py-3 backdrop-blur">
        <Link
          href="/admin/posts"
          className="text-foreground-muted hover:text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Posts
        </Link>

        <span className="bg-surface-2 text-foreground-muted rounded-full px-2.5 py-1 text-[0.6875rem] font-medium capitalize">
          {draft.status.replace('_', ' ')}
        </span>

        {savedAt ? (
          <span className="text-meta text-foreground-subtle">Saved {savedAt}</span>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {post ? (
            <Button asChild size="sm" variant="ghost">
              <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                <Eye aria-hidden="true" />
                View
              </a>
            </Button>
          ) : null}

          <Button
            size="sm"
            variant="secondary"
            onClick={() => void save('draft')}
            disabled={saving !== false || !draft.title.trim()}
          >
            {saving === 'draft' ? (
              <Loader className="animate-spin" aria-hidden="true" />
            ) : (
              <Save aria-hidden="true" />
            )}
            Save draft
          </Button>

          <Button
            size="sm"
            onClick={() => void save('publish')}
            disabled={saving !== false || blocked}
            title={
              blocked
                ? `${report?.blockers.length} checklist item(s) must pass before publishing`
                : undefined
            }
          >
            {saving === 'publish' ? (
              <Loader className="animate-spin" aria-hidden="true" />
            ) : (
              <Send aria-hidden="true" />
            )}
            Publish
          </Button>
        </div>
      </header>

      {error ? (
        <p
          role="alert"
          className="border-danger-500/30 bg-danger-100/60 text-danger-700 dark:bg-danger-500/10 flex items-start gap-2 border-b px-5 py-3 text-sm"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}

      <div className="grid flex-1 gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ── Main column ──────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-col gap-5">
          <Field label="Title" required>
            <input
              value={draft.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Why Server Components changed where the work happens"
              className={inputClass + ' font-display text-h3 font-semibold'}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Slug" hint="Changing a published slug creates a 301.">
              <input
                value={draft.slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  update('slug', slugify(e.target.value))
                }}
                placeholder="why-server-components-changed"
                className={inputClass + ' font-mono-ui text-sm'}
              />
            </Field>

            <Field label="Focus keyword" required>
              <input
                value={draft.focusKeyword}
                onChange={(e) => update('focusKeyword', e.target.value)}
                placeholder="react server components"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Subtitle">
            <input
              value={draft.subtitle}
              onChange={(e) => update('subtitle', e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field
            label="Excerpt"
            required
            hint="Card copy and the fallback description. 50+ characters."
          >
            <textarea
              value={draft.excerpt}
              onChange={(e) => update('excerpt', e.target.value)}
              rows={2}
              className={inputClass + ' resize-y'}
            />
          </Field>

          {/* ── Body ───────────────────────────────────────────────────── */}
          <div className="flex flex-col">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-eyebrow text-foreground-subtle font-sans uppercase">
                Body
              </span>
              <div
                role="tablist"
                aria-label="Editor mode"
                className="border-border bg-surface-2 inline-flex gap-0.5 rounded-full border p-0.5"
              >
                {(['write', 'html', 'preview'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={tab === value}
                    onClick={() => setTab(value)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
                      tab === value
                        ? 'bg-surface text-foreground shadow-xs'
                        : 'text-foreground-subtle hover:text-foreground'
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            {tab === 'write' ? (
              <RichEditor
                value={draft.contentHtml}
                onChange={(html) => update('contentHtml', html)}
              />
            ) : tab === 'html' ? (
              /* Source view, for pasting migrated markup or fixing something
                 the toolbar cannot express. */
              <textarea
                value={draft.contentHtml}
                onChange={(e) => update('contentHtml', e.target.value)}
                rows={22}
                spellCheck={false}
                aria-label="Article HTML source"
                className={cn(
                  inputClass,
                  'font-mono-ui resize-y text-[0.8125rem] leading-relaxed'
                )}
              />
            ) : (
              <div className="border-border bg-surface rounded-lg border p-6">
                {/*
                  Preview only. Not sanitised here: this is the author's own
                  unsaved draft rendered back to them. The public article page
                  sanitises on render, and so does the API on save.
                */}
                <div
                  className="prose"
                  dangerouslySetInnerHTML={{ __html: draft.contentHtml }}
                />
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/*
              Upload, not a pasted URL.

              This was two text inputs, which meant an editor had to host the
              image somewhere else first and gave no guarantee about format,
              dimensions, or whether the URL would still resolve next year.
              Uploads are converted to WebP server-side and capped at 1920px.

              Alt text moved INSIDE the uploader on purpose: it is a blocking
              publish check, and the only moment it is easy to write is while
              looking at the picture.
            */}
            <ImageUploader
              value={draft.coverImageUrl}
              alt={draft.coverImageAlt}
              onChange={(next) => {
                update('coverImageUrl', next.url)
                update('coverImageAlt', next.alt)
              }}
            />
          </div>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside className="flex flex-col gap-4">
          <div className="sticky top-20 flex flex-col gap-4">
            <SeoPanel report={report} pending={scoring} />

            <SerpPreview
              title={draft.metaTitle || draft.title}
              description={draft.metaDescription}
              slug={draft.slug}
              siteUrl={siteConfig.url}
              breadcrumb={
                categories.find((c) => c.id === draft.categoryId)?.name ?? undefined
              }
            />

            <section className="border-border bg-surface flex flex-col gap-4 rounded-xl border p-4">
              <h3 className="text-eyebrow text-foreground-subtle font-sans uppercase">
                Metadata
              </h3>

              <Field label="Category" required>
                <select
                  value={draft.categoryId}
                  onChange={(e) => update('categoryId', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Choose a category…</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Meta title" hint="Defaults to the post title.">
                <input
                  value={draft.metaTitle}
                  onChange={(e) => update('metaTitle', e.target.value)}
                  maxLength={70}
                  className={inputClass}
                />
              </Field>

              <Field label="Meta description" required hint="140–160 characters.">
                <textarea
                  value={draft.metaDescription}
                  onChange={(e) => update('metaDescription', e.target.value)}
                  rows={3}
                  maxLength={160}
                  className={inputClass + ' resize-y'}
                />
              </Field>
            </section>

            {/* ── Listen + discussion ──────────────────────────────────── */}
            <section className="border-border bg-surface flex flex-col gap-4 rounded-xl border p-4">
              <h3 className="text-eyebrow text-foreground-subtle font-sans uppercase">
                Listen &amp; discussion
              </h3>

              <Toggle
                label="Listen to this article"
                hint="Readers can have the browser read the article aloud. Free, and no audio file is generated."
                checked={draft.audioEnabled}
                onChange={(value) => update('audioEnabled', value)}
              />

              {draft.audioEnabled ? (
                <Field
                  label="Narration voice"
                  hint="Only used if a narrated MP3 is generated. Blank means the provider default."
                >
                  <input
                    value={draft.audioVoice}
                    onChange={(e) => update('audioVoice', e.target.value)}
                    maxLength={60}
                    className={inputClass}
                  />
                </Field>
              ) : null}

              <Toggle
                label="Comments open"
                hint="Guest comments and anything containing a link are held for moderation either way."
                checked={draft.allowComments}
                onChange={(value) => update('allowComments', value)}
              />

              {post?.audioStatus === 'ready' ? (
                <p className="text-foreground-subtle text-xs">
                  A narrated MP3 exists for this post
                  {post.audioDuration
                    ? ` (${Math.round(post.audioDuration / 60)} min)`
                    : ''}
                  . It is linked from the article&apos;s JSON-LD as an AudioObject.
                </p>
              ) : null}
            </section>
          </div>
        </aside>
      </div>
    </div>
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

/**
 * A labelled switch.
 *
 * A real `<input type="checkbox">` under the hood rather than a div with
 * `role="switch"`: it is focusable, toggles with Space, is announced
 * correctly, and participates in the form — all of which a hand-rolled
 * version has to reimplement and usually gets partly wrong. Only the visual
 * track is custom.
 */
function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors',
          'peer-focus-visible:ring-primary/35 peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2',
          'peer-focus-visible:ring-offset-surface',
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
        {hint ? (
          <span className="text-foreground-subtle text-xs leading-relaxed">{hint}</span>
        ) : null}
      </span>
    </label>
  )
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  const id = React.useId()
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-eyebrow text-foreground-subtle font-sans uppercase">
        {label}
        {required ? <span className="text-danger-500 ml-1">*</span> : null}
      </span>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<{ id?: string }>, { id })
        : children}
      {hint ? <span className="text-meta text-foreground-subtle">{hint}</span> : null}
    </label>
  )
}

/** Rough text extraction for word count and the search index. */
function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Pulls field-level messages out of a validation or blocker response. */
function extractFieldErrors(details: unknown): string | null {
  if (!details || typeof details !== 'object') return null

  if ('fields' in details && Array.isArray((details as { fields: unknown }).fields)) {
    const fields = (details as { fields: { path: string; message: string }[] }).fields
    return fields.map((f) => `${f.path}: ${f.message}`).join(' · ')
  }

  if ('details' in details) {
    const inner = (details as { details: unknown }).details
    if (inner && typeof inner === 'object' && 'blockers' in inner) {
      const blockers = (inner as { blockers: { label: string }[] }).blockers
      return blockers.map((b) => b.label).join(' · ')
    }
  }

  return null
}
