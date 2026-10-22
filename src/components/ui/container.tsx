import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Container — the single place the page gutter is defined.
 *
 * Side padding lives here and nowhere else, which is what guarantees the
 * >=16px gutter at every breakpoint required by the design gate. Vertical
 * spacing is intentionally NOT handled here so sections keep their own rhythm.
 */
const widths = {
  /** Article reading column. */
  prose: 'max-w-3xl',
  /** Default content width. */
  content: 'max-w-5xl',
  /** Listing grids + bento. */
  wide: 'max-w-7xl',
  /** Full-bleed sections that still want a gutter. */
  full: 'max-w-none',
} as const

export type ContainerProps = React.ComponentProps<'div'> & {
  width?: keyof typeof widths
  as?: React.ElementType
}

export function Container({
  className,
  width = 'wide',
  as: Comp = 'div',
  ...props
}: ContainerProps) {
  return (
    <Comp
      className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', widths[width], className)}
      {...props}
    />
  )
}
