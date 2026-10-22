import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind classes with conflict resolution.
 * Later classes win, so component consumers can always override defaults.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Clamp a number into a range. */
export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

/**
 * Slugify a title the same way the backend does.
 * Phase 2 reuses this exact implementation server-side so a slug generated in
 * the editor preview always matches the slug that gets persisted.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')
}

/** Average adult reading speed, words per minute. */
const WORDS_PER_MINUTE = 225

export function readingTime(text: string): { minutes: number; words: number } {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return { minutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)), words }
}

/**
 * Format a date for display. Fixed locale + UTC time zone so the server and
 * client render identical strings (a mismatch is a hydration error).
 */
export function formatDate(
  input: string | number | Date,
  opts: Intl.DateTimeFormatOptions = {}
): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
    ...opts,
  }).format(new Date(input))
}

/** Machine-readable date for <time dateTime> and JSON-LD. */
export function isoDate(input: string | number | Date): string {
  return new Date(input).toISOString()
}

/**
 * Truncate to a character budget without cutting mid-word.
 * Used to keep meta descriptions inside the 140-160 char window.
 */
export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

/** True when a href points off-site, so rel/target can be set correctly. */
export function isExternalHref(href: string): boolean {
  return /^(https?:)?\/\//i.test(href) || href.startsWith('mailto:')
}
