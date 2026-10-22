import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Card — the surface primitive behind post cards, bento tiles and panels.
 *
 * `interactive` adds hover lift + border warm-up. The lift uses transform
 * only (never margin/top) so hovering a card in a grid cannot shift its
 * neighbours and cannot contribute to CLS.
 */
const cardVariants = cva(
  ['relative rounded-xl border transition-all duration-300 ease-out-expo'],
  {
    variants: {
      variant: {
        surface: 'border-border bg-surface shadow-xs',
        raised: 'border-border bg-surface-raised shadow-md',
        glass: 'glass border shadow-sm',
        outline: 'border-border bg-transparent',
        ghost: 'border-transparent bg-transparent',
      },
      interactive: {
        true: [
          'group/card cursor-pointer',
          'hover:-translate-y-1 hover:border-border-strong hover:shadow-lg',
          // Keyboard parity: focusing the card reads the same as hovering it.
          'focus-within:-translate-y-1 focus-within:shadow-lg',
        ],
        false: '',
      },
      padding: {
        none: '',
        sm: 'p-4',
        md: 'p-5 sm:p-6',
        lg: 'p-6 sm:p-8',
      },
    },
    defaultVariants: { variant: 'surface', interactive: false, padding: 'none' },
  }
)

export type CardProps = React.ComponentProps<'div'> & VariantProps<typeof cardVariants>

export function Card({ className, variant, interactive, padding, ...props }: CardProps) {
  return (
    <div
      className={cn(cardVariants({ variant, interactive, padding }), className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1.5', className)} {...props} />
}

export function CardTitle({
  className,
  as: Comp = 'h3',
  ...props
}: React.ComponentProps<'h3'> & { as?: React.ElementType }) {
  return (
    <Comp
      className={cn(
        'font-display text-h4 text-foreground font-semibold tracking-tight',
        className
      )}
      {...props}
    />
  )
}

export function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn('text-foreground-muted text-sm leading-relaxed', className)}
      {...props}
    />
  )
}

export function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex items-center gap-3', className)} {...props} />
}

export { cardVariants }
