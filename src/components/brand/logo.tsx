import Link from 'next/link'

import { siteConfig } from '@/config/site'
import { cn } from '@/lib/utils'

/**
 * Logo mark.
 *
 * Rendered as inline SVG rather than next/image so it is part of the HTML
 * payload: no extra request, no decode, and it can neither become the LCP
 * element nor cause a layout shift in the sticky header.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('size-8', className)}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id="dl-mark"
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="var(--color-brand-500)" />
          <stop offset="55%" stopColor="var(--color-brand-400)" />
          <stop offset="100%" stopColor="var(--color-accent-400)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#dl-mark)" />
      <path
        d="M11 9.5h4.6c4.1 0 6.9 2.6 6.9 6.5s-2.8 6.5-6.9 6.5H11V9.5Zm3.1 2.8v7.4h1.4c2.3 0 3.8-1.4 3.8-3.7s-1.5-3.7-3.8-3.7h-1.4Z"
        fill="white"
        fillOpacity="0.95"
      />
    </svg>
  )
}

/**
 * Full lockup used in the header and footer.
 * The Link carries the accessible name, so the mark needs no alt text.
 */
export function Logo({
  className,
  href = '/',
  showWordmark = true,
}: {
  className?: string
  href?: string
  showWordmark?: boolean
}) {
  return (
    <Link
      href={href}
      aria-label={`${siteConfig.name} home`}
      className={cn(
        'group inline-flex items-center gap-2.5 rounded-md',
        'transition-opacity duration-200 hover:opacity-85',
        className
      )}
    >
      <LogoMark className="ease-spring size-8 shrink-0 transition-transform duration-300 group-hover:scale-105" />
      {showWordmark ? (
        <span className="font-display text-foreground text-[1.0625rem] font-bold tracking-[-0.03em]">
          {siteConfig.name}
        </span>
      ) : null}
    </Link>
  )
}
