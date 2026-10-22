'use client'

import { Check, ImagePlus, Loader, Trash2, Upload } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { AdminApiError, adminRequest, uploadMedia, type MediaItem } from '@/lib/admin-api'
import { cn } from '@/lib/utils'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * MEDIA LIBRARY
 * ═════════════════════════════════════════════════════════════════════════════
 * The standalone view. The same data is reachable from inside the post editor
 * as a picker; this page is for the jobs that are not "pick one now" —
 * uploading a batch ahead of writing, and fixing alt text across everything.
 *
 * The alt-text editing is the point of having it. Alt text is a BLOCKING
 * publish check, so an image uploaded without it will stop a post going live
 * later, somewhere else, with an error that does not obviously point back
 * here. A list that shows which images are missing it turns that into
 * something fixable in one pass.
 */
export function AdminMedia() {
  const [items, setItems] = React.useState<MediaItem[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [reload, setReload] = React.useState(0)
  const [uploading, setUploading] = React.useState(false)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [dragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  const fetchItems = React.useCallback(
    () => adminRequest<{ media: MediaItem[] }>('/admin/media?limit=200'),
    []
  )

  React.useEffect(() => {
    let cancelled = false
    fetchItems()
      .then((d) => !cancelled && setItems(d.media))
      .catch(() => !cancelled && setError('Could not load the media library.'))
    return () => {
      cancelled = true
    }
  }, [fetchItems, reload])

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return

    setUploading(true)
    setError(null)
    try {
      // Sequential, not parallel. Each upload is a full image decode and
      // re-encode on the server; firing twenty at once is how you turn an
      // upload into a denial of service against your own API.
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        await uploadMedia(file)
      }
      setReload((n) => n + 1)
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const missingAlt = (items ?? []).filter((i) => !i.alt?.trim()).length

  return (
    <div className="flex flex-col gap-6 p-5 lg:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-h2 font-semibold tracking-tight">Media</h1>
        <p className="text-foreground-muted max-w-2xl text-sm leading-relaxed">
          Every upload is converted to WebP, capped at 1920px and stripped of EXIF —
          including the GPS coordinates a phone photo carries.
        </p>
      </header>

      {error ? (
        <p
          role="alert"
          className="border-danger-500/30 bg-danger-500/10 text-danger-700 dark:text-danger-500 max-w-4xl rounded-lg border px-4 py-3 text-sm"
        >
          {error}
        </p>
      ) : null}

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void handleFiles(e.dataTransfer.files)
        }}
        className={cn(
          'flex max-w-4xl flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors',
          dragging ? 'border-primary bg-primary-soft' : 'border-border bg-surface-2'
        )}
      >
        {uploading ? (
          <>
            <Loader className="text-primary size-6 animate-spin" aria-hidden="true" />
            <p className="text-foreground-muted text-sm">
              Uploading and converting to WebP…
            </p>
          </>
        ) : (
          <>
            <ImagePlus className="text-foreground-subtle size-6" aria-hidden="true" />
            <p className="text-foreground-muted text-sm">Drop images here, or</p>
            <Button type="button" size="sm" onClick={() => inputRef.current?.click()}>
              <Upload aria-hidden="true" />
              Choose files
            </Button>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/tiff"
        className="sr-only"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {missingAlt > 0 ? (
        <p className="border-highlight/40 bg-highlight-soft max-w-4xl rounded-lg border px-4 py-3 text-sm">
          <strong>{missingAlt}</strong> image{missingAlt === 1 ? ' has' : 's have'} no alt
          text. A post using one as its cover cannot be published until it does.
        </p>
      ) : null}

      {items === null ? (
        <div className="grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="bg-surface-2 aspect-[4/3] animate-pulse rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="border-border bg-surface-2 text-foreground-muted max-w-4xl rounded-xl border px-6 py-12 text-center text-sm">
          Nothing uploaded yet.
        </p>
      ) : (
        <ul className="grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                'border-border bg-surface flex flex-col overflow-hidden rounded-xl border transition-opacity',
                busy === item.id && 'pointer-events-none opacity-50'
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.thumbUrl}
                alt={item.alt ?? ''}
                loading="lazy"
                className="bg-surface-2 aspect-[4/3] w-full object-cover"
              />

              <div className="flex flex-1 flex-col gap-2 p-3">
                <p className="text-meta text-foreground-subtle">
                  {item.width}×{item.height} · {item.format?.toUpperCase()} ·{' '}
                  {Math.round((item.bytes ?? 0) / 1024)} KB
                </p>

                <AltEditor
                  item={item}
                  onSaved={() => setReload((n) => n + 1)}
                  onBusy={setBusy}
                  onError={setError}
                />

                <div className="mt-auto flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard?.writeText(item.url)}
                    className="text-foreground-subtle decoration-border hover:text-primary text-xs underline underline-offset-2 transition-colors"
                  >
                    Copy URL
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        !window.confirm(
                          'Delete this image permanently?\n\nAny post using it as a cover will lose it.'
                        )
                      ) {
                        return
                      }
                      setBusy(item.id)
                      void adminRequest(`/admin/media/${item.id}`, { method: 'DELETE' })
                        .then(() => setReload((n) => n + 1))
                        .catch(() => setError('Could not delete that image.'))
                        .finally(() => setBusy(null))
                    }}
                    className="text-foreground-subtle hover:text-danger-700 dark:hover:text-danger-500 ml-auto inline-flex items-center gap-1 text-xs transition-colors"
                  >
                    <Trash2 className="size-3" aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Inline alt-text editing, saved on blur or Enter. */
function AltEditor({
  item,
  onSaved,
  onBusy,
  onError,
}: {
  item: MediaItem
  onSaved: () => void
  onBusy: (id: string | null) => void
  onError: (message: string | null) => void
}) {
  const [value, setValue] = React.useState(item.alt ?? '')
  const [saved, setSaved] = React.useState(false)

  async function commit() {
    if (value === (item.alt ?? '')) return

    onBusy(item.id)
    onError(null)
    try {
      await adminRequest(`/admin/media/${item.id}`, {
        method: 'PATCH',
        body: { alt: value },
      })
      setSaved(true)
      // The tick is feedback, not state worth keeping; clear it so the next
      // edit gets its own confirmation.
      setTimeout(() => setSaved(false), 1500)
      onSaved()
    } catch {
      onError('Could not save that alt text.')
    } finally {
      onBusy(null)
    }
  }

  return (
    <label className="flex items-center gap-1.5">
      <span className="sr-only">Alt text</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.blur()
          }
        }}
        maxLength={300}
        placeholder="Alt text — required before publishing"
        className={cn(
          'bg-surface w-full rounded-md border px-2 py-1.5 text-xs transition-colors',
          'focus:border-primary focus:ring-primary/20 focus:outline-none focus:ring-2',
          value.trim() ? 'border-border' : 'border-highlight/60 bg-highlight-soft'
        )}
      />
      {saved ? (
        <Check
          className="text-success-700 dark:text-success-500 size-3.5 shrink-0"
          aria-hidden="true"
        />
      ) : null}
    </label>
  )
}
