import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SCROLL REVEAL
 * ─────────────────────────────────────────────────────────────────────────────
 * Server Components. No 'use client', no framer-motion, no JavaScript at all.
 *
 * These were originally framer-motion `whileInView` wrappers. That approach
 * has to render the element at `opacity: 0` and wait for an
 * IntersectionObserver to reveal it, which means the content is INVISIBLE
 * until the bundle loads and runs. The text is present in the HTML, but
 * anyone (or anything) that does not execute the script sees a blank page.
 * That is a direct violation of the "no content behind JS" rule — and it was
 * caught by screenshotting the built page, not by reading the markup — so the
 * implementation was replaced rather than patched.
 *
 * The CSS in globals.css reverses the default: the element is visible, and the
 * animation is layered on only where `animation-timeline: view()` is
 * supported. Consequences:
 *
 *   - content is never hidden, with or without JS;
 *   - zero client JS ships for reveals, so no INP cost and no bundle weight;
 *   - the animation runs off the main thread;
 *   - only opacity and transform animate, so no layout shift;
 *   - prefers-reduced-motion disables it outright.
 *
 * The motion version's `delay`, `y` and `stagger` props are gone: timing is
 * now a function of scroll position rather than a clock, so they had no
 * meaning. Stagger is expressed by <Stagger> and the `--i` index in CSS.
 */

type RevealElement = 'div' | 'section' | 'li' | 'article' | 'header'

/**
 * The polymorphic `as` prop cannot keep per-tag prop types unified, so the
 * rendered tag is widened to ElementType internally. Call sites stay typed by
 * the exported prop types below.
 */
type PolymorphicProps = React.ComponentPropsWithoutRef<'div'> & {
  as?: RevealElement
}

export type RevealProps = PolymorphicProps

/** A single element that fades and rises as it scrolls into view. */
export function Reveal({ as = 'div', className, children, ...props }: RevealProps) {
  const Tag = as as React.ElementType
  return (
    <Tag className={cn('reveal', className)} {...props}>
      {children}
    </Tag>
  )
}

export type StaggerProps = PolymorphicProps

/**
 * Staggered container. Each direct child animates slightly later in the scroll
 * range than its predecessor, driven by the `--i` index set in globals.css.
 */
export function Stagger({ as = 'div', className, children, ...props }: StaggerProps) {
  const Tag = as as React.ElementType
  return (
    <Tag className={cn('reveal-group', className)} {...props}>
      {children}
    </Tag>
  )
}

/**
 * A single staggered child.
 *
 * It only needs to be a direct element child of <Stagger> — the animation is
 * applied by the parent's `> *` selector — so this is a plain wrapper that
 * exists to keep call sites readable and the markup predictable.
 */
export function StaggerItem({
  as = 'div',
  className,
  children,
  ...props
}: PolymorphicProps) {
  const Tag = as as React.ElementType
  return (
    <Tag className={className} {...props}>
      {children}
    </Tag>
  )
}
