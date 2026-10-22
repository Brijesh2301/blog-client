'use client'

import { ImagePlus, Loader, Trash2, Upload, X } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { AdminApiError, adminRequest, uploadMedia, type MediaItem } from '@/lib/admin-api'
import { cn } from '@/lib/utils'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * IMAGE UPLOADER + MEDIA LIBRARY
 * ═════════════════════════════════════════════════════════════════════════════
 * Replaces the raw "paste a URL" text input the editor had, which required an
 * editor to upload the image somewhere else first and gave no guarantee about
 * format, dimensions or whether the URL would still resolve next year.
 *
 * Everything that arrives here is converted to WebP server-side before it is
 * stored — see `server/src/services/media.service.ts` for why that happens at
 * upload rather than being left to `next/image`.
 *
 * Two things in this component are about the publish gate rather than
 * convenience:
 *
 *  - ALT TEXT IS ASKED FOR AT UPLOAD. A cover image without alt text cannot be
 *    published (the API refuses, and the SEO panel flags it as blocking). The
 *    moment someone has the image in front of them is the only moment they can
 *    easily describe it; a field on a different screen gets left empty.
 *  - DIMENSIONS COME BACK AND ARE SHOWN. `next/image` needs them to reserve
 *    space, and a reader seeing the real numbers is how a 400px image used as
 *    a cover gets caught before publication rather than after.
 */

export function ImageUploader({
  value,
  alt,
  onChange,
  label = 'Cover image',
}: {
  /** Current image URL, or empty. */
  value: string
  alt: string
  onChange: (next: { url: string; alt: string; width?: number; height?: number }) => void
  label?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [dragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  async function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('That is not an image.')
      return
    }

    setUploading(true)
    setError(null)
    try {
      const media = await uploadMedia(file, alt)
      onChange({
        url: media.url,
        // Keep whatever alt text was already written rather than clobbering it
        // with the server's echo of the same value.
        alt: alt || media.alt || '',
        width: media.width,
        height: media.height,
      })
    } catch (err) {
      setError(
        err instanceof AdminApiError ? err.message : 'Upload failed. Please try again.'
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-eyebrow text-foreground-subtle font-sans uppercase">
        {label}
        <span className="text-danger-500 ml-1">*</span>
      </span>

      {value ? (
        <div className="border-border bg-surface-2 group relative overflow-hidden rounded-xl border">
          {/*
            A plain <img>, not next/image. This is the admin: the URL changes
            on every upload, the optimiser would be a round trip for a preview
            nobody indexes, and `next/image` on an arbitrary runtime URL needs
            the host allowlisted anyway.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={alt || 'Cover preview'}
            className="aspect-[16/9] w-full object-cover"
          />

          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <Button
              type="button"
              size="xs"
              variant="secondary"
              onClick={() => setOpen(true)}
            >
              Replace
            </Button>
            <Button
              type="button"
              size="xs"
              variant="secondary"
              onClick={() => onChange({ url: '', alt })}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : (
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
            'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors',
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
              <p className="text-foreground-muted text-sm">Drop an image here, or</p>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={() => inputRef.current?.click()}>
                  <Upload aria-hidden="true" />
                  Choose a file
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setOpen(true)}
                >
                  Media library
                </Button>
              </div>
              <p className="text-foreground-subtle text-xs">
                JPEG, PNG, WebP, AVIF, GIF or TIFF, up to 15 MB. Converted to WebP and
                capped at 1920px automatically.
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/tiff"
        className="sr-only"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {/*
        Alt text sits with the image, not in a separate field elsewhere on the
        form. It is a blocking publish check, and the only moment it is easy to
        write is while looking at the picture.
      */}
      <label className="flex flex-col gap-1.5">
        <span className="text-eyebrow text-foreground-subtle font-sans uppercase">
          Alt text <span className="text-danger-500">*</span>
        </span>
        <input
          value={alt}
          onChange={(e) => onChange({ url: value, alt: e.target.value })}
          maxLength={300}
          placeholder="Describe the image for a reader who cannot see it"
          className={inputClass}
        />
        <span className="text-foreground-subtle text-xs">
          Required before publishing — for accessibility and for image search.
        </span>
      </label>

      {error ? (
        <p role="alert" className="text-danger-700 dark:text-danger-500 text-xs">
          {error}
        </p>
      ) : null}

      {open ? (
        <MediaLibrary
          onClose={() => setOpen(false)}
          onPick={(media) => {
            onChange({
              url: media.url,
              alt: alt || media.alt || '',
              width: media.width,
              height: media.height,
            })
            setOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MEDIA LIBRARY
   ═══════════════════════════════════════════════════════════════════════════ */

export function MediaLibrary({
  onClose,
  onPick,
}: {
  onClose: () => void
  onPick: (media: MediaItem) => void
}) {
  const [items, setItems] = React.useState<MediaItem[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [reload, setReload] = React.useState(0)
  const [busy, setBusy] = React.useState<string | null>(null)

  const fetchItems = React.useCallback(
    () => adminRequest<{ media: MediaItem[] }>('/admin/media?limit=60'),
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

  // Escape closes, which is the expected way out of anything overlaid.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Media library"
      className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="border-border bg-surface flex max-h-[85vh] w-full max-w-4xl flex-col rounded-2xl border shadow-2xl">
        <header className="border-border flex items-center justify-between border-b px-5 py-3.5">
          <h2 className="font-display text-h4 font-semibold">Media library</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-foreground-subtle hover:bg-surface-2 hover:text-foreground grid size-8 place-items-center rounded-lg transition-colors"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {error ? (
            <p role="alert" className="text-danger-700 dark:text-danger-500 text-sm">
              {error}
            </p>
          ) : items === null ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <div
                  key={i}
                  className="bg-surface-2 aspect-[4/3] animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-foreground-muted py-12 text-center text-sm">
              Nothing uploaded yet.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {items.map((item) => (
                <li key={item.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onPick(item)}
                    className={cn(
                      'border-border block w-full overflow-hidden rounded-lg border transition-all',
                      'hover:border-primary hover:shadow-md',
                      'focus-visible:ring-primary/40 focus-visible:outline-none focus-visible:ring-2',
                      busy === item.id && 'pointer-events-none opacity-40'
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.thumbUrl}
                      alt={item.alt ?? ''}
                      loading="lazy"
                      className="bg-surface-2 aspect-[4/3] w-full object-cover"
                    />
                    <span className="text-foreground-subtle block px-2 py-1.5 text-left text-[0.6875rem]">
                      {item.width}×{item.height} · {Math.round((item.bytes ?? 0) / 1024)}{' '}
                      KB
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-label="Delete this image"
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
                    className="bg-surface/90 text-foreground-subtle hover:text-danger-700 dark:hover:text-danger-500 absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-md opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
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
