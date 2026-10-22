import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Badge — category tags, "New" / "Trending" / "Editor's Pick" labels.
 * The gradient variants are reserved for editorial labels so they keep their
 * signal value; plain category tags use `tone`.
 */
const badgeVariants = cva(
  [
    'inline-flex items-center gap-1.5 whitespace-nowrap',
    'font-sans font-medium rounded-full border',
    'transition-colors duration-150',
    '[&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        neutral: 'border-border bg-surface-2 text-foreground-muted',
        brand: 'border-transparent bg-primary-soft text-primary',
        accent: 'border-transparent bg-secondary-soft text-secondary',
        warm: 'border-transparent bg-highlight-soft text-highlight',
        outline: 'border-border-strong bg-transparent text-foreground-muted',
        // Editorial labels: gradient fill, white text, subtle glow.
        trending:
          'border-transparent bg-gradient-to-r from-warm-500 to-warm-600 text-warm-950 shadow-xs',
        new: 'border-transparent bg-gradient-to-r from-brand-500 to-accent-500 text-white shadow-xs',
        pick: 'border-transparent bg-gradient-to-r from-brand-600 to-brand-400 text-white shadow-xs',
      },
      size: {
        sm: 'h-5 px-2 text-[0.6875rem] [&_svg]:size-3',
        md: 'h-6 px-2.5 text-xs [&_svg]:size-3.5',
        lg: 'h-7 px-3 text-[0.8125rem] [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'neutral', size: 'md' },
  }
)

export type BadgeProps = React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export { badgeVariants }
