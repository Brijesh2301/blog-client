import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Button — the base interactive primitive.
 *
 * Deliberately NOT a client component: it ships no JS of its own, so it can be
 * rendered inside Server Components (links, form submits) with zero bundle
 * cost. The "magnetic" hover treatment lives in a separate client wrapper
 * (components/motion/magnetic.tsx) and is opt-in.
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-sans font-medium select-none',
    'transition-[transform,background-color,border-color,color,box-shadow]',
    'duration-200 ease-out-expo',
    // Press feedback that costs no layout work.
    'active:scale-[0.985]',
    'disabled:pointer-events-none disabled:opacity-50',
    // Icons inherit size and never shrink the label.
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-primary text-foreground-onbrand',
          'shadow-sm hover:bg-primary-hover',
          'hover:shadow-glow hover:-translate-y-px',
        ],
        secondary: [
          'bg-surface text-foreground border border-border',
          'shadow-xs hover:border-border-strong hover:bg-surface-2',
          'hover:-translate-y-px hover:shadow-sm',
        ],
        ghost: 'text-foreground-muted hover:bg-surface-2 hover:text-foreground',
        outline: [
          'border border-primary/35 text-primary',
          'hover:border-primary/70 hover:bg-primary-soft',
        ],
        subtle: 'bg-primary-soft text-primary hover:bg-primary-soft/70',
        link: [
          'text-primary underline decoration-primary/40 underline-offset-4',
          'hover:decoration-primary',
        ],
        danger:
          'bg-danger-500 text-white shadow-sm hover:bg-danger-700 hover:-translate-y-px',
      },
      size: {
        xs: 'h-7 rounded-sm px-2.5 text-xs [&_svg]:size-3.5',
        sm: 'h-9 rounded-md px-3.5 text-sm [&_svg]:size-4',
        md: 'h-11 rounded-lg px-5 text-[0.9375rem] [&_svg]:size-4',
        lg: 'h-12 rounded-xl px-6 text-base [&_svg]:size-[1.125rem]',
        // Square icon buttons: width is locked to height to stay perfectly round.
        icon: 'size-9 rounded-md [&_svg]:size-4',
        'icon-lg': 'size-11 rounded-lg [&_svg]:size-5',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

export type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Render as the child element (e.g. a <Link>) instead of a <button>. */
    asChild?: boolean
  }

export function Button({
  className,
  variant,
  size,
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      // An explicit type prevents accidental form submits from icon buttons.
      {...(asChild ? {} : { type: type ?? 'button' })}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { buttonVariants }
