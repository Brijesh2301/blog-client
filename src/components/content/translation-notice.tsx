import { Languages } from 'lucide-react'
import Link from 'next/link'

import {
  LOCALES,
  LOCALE_META,
  localePath,
  type Locale,
} from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import type { PostTranslation } from '@/types/content'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * TRANSLATION NOTICE
 * ═════════════════════════════════════════════════════════════════════════════
 * Tells a reader, on the article itself, which other languages it exists in —
 * and, when it exists in none, says so instead of leaving the language
 * switcher looking broken.
 *
 * That second case is the one that matters. The switcher in the header always
 * offers both languages, because it has to: it is a site-wide control and it
 * cannot know whether THIS article is translated. Without this notice, a
 * reader on a Hindi-less article clicks हिन्दी, lands on a 404, and reasonably
 * concludes the Hindi site is broken.
 *
 * It is a Server Component and the links are plain anchors, so the
 * relationship is visible to a crawler as well as to a reader — the same
 * reasoning as the switcher itself.
 */
export function TranslationNotice({
  locale,
  slug,
  translations,
  className,
}: {
  locale: Locale
  slug: string
  translations: PostTranslation[]
  className?: string
}) {
  const t = getDictionary(locale)

  const others = LOCALES.filter(
    (candidate) =>
      candidate !== locale && translations.some((tr) => tr.locale === candidate)
  )

  // Nothing to say when this article exists only in the language being read.
  // A notice that says "not available in Hindi" to an English reader on an
  // English article is noise; the case that actually needs handling — someone
  // clicking हिन्दी on an untranslated article — is handled at the route,
  // which redirects to the version that exists.
  if (others.length === 0) return null

  return (
    <aside
      className={
        className ??
        'border-border bg-surface-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border px-4 py-2.5 text-sm'
      }
    >
      <Languages
        aria-hidden="true"
        className="text-foreground-subtle size-4 shrink-0"
      />

      <span className="text-foreground-muted">{t.language.availableIn}:</span>
      {others.map((other) => (
        <Link
          key={other}
          href={localePath(`/blog/${slug}`, other)}
          hrefLang={LOCALE_META[other].bcp47}
          lang={LOCALE_META[other].bcp47}
          className="decoration-border hover:decoration-primary hover:text-primary font-medium underline underline-offset-2 transition-colors"
        >
          {LOCALE_META[other].label}
        </Link>
      ))}
    </aside>
  )
}
