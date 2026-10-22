'use client'

import * as React from 'react'

import { LOCALE_META, type Locale } from '@/i18n/config'

/**
 * Sets `lang` and `dir` on the <html> element.
 *
 * WHY THIS IS NOT JUST A PROP ON <html>
 * The root layout owns `<html>`, and it sits ABOVE the `[locale]` segment — so
 * it cannot read the locale param. Next has no supported way to set an
 * attribute on the document element from a nested layout.
 *
 * It matters more than it looks. `lang` is what makes a screen reader switch
 * voice: without it, Hindi is read aloud with English phonemes and is simply
 * unintelligible. It is also what Google reads to confirm the page's language
 * matches the `hreflang` pointing at it.
 *
 * The attribute is ALSO written server-side into the prerendered HTML — see
 * the inline script in the root layout — so a crawler that does not run
 * JavaScript still sees the right value. This component keeps it correct
 * across client-side navigations between languages, which is the one case the
 * server-rendered value cannot cover.
 */
export function LocaleHtmlAttributes({ locale }: { locale: Locale }) {
  React.useEffect(() => {
    const meta = LOCALE_META[locale]
    document.documentElement.lang = meta.bcp47
    document.documentElement.dir = meta.dir
  }, [locale])

  return null
}
