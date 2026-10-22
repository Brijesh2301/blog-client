import { getDictionary } from '@/i18n/dictionaries'
import type { Locale } from '@/i18n/config'

/**
 * Skip-to-content link (WCAG 2.4.1).
 *
 * It must be the first focusable element in the DOM, so it is rendered as the
 * very first child of <body>. It is visually hidden until focused, at which
 * point it becomes a fully styled, high-contrast pill.
 */
export function SkipLink({ locale }: { locale: Locale }) {
  const t = getDictionary(locale)

  return (
    <a
      href="#main"
      className="sr-only-focusable bg-primary text-foreground-onbrand fixed left-4 top-4 z-[100] rounded-lg px-4 py-2.5 font-sans text-sm font-semibold shadow-lg"
    >
      {t.nav.skipToContent}
    </a>
  )
}
