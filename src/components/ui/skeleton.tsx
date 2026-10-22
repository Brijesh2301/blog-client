import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Skeleton — shimmer placeholder.
 *
 * Callers MUST give it the same box size as the content it stands in for,
 * otherwise swapping in real content shifts the layout and costs CLS.
 * The shimmer is a background-position animation (compositor-friendly) and is
 * disabled automatically by the global reduced-motion rule in globals.css.
 */
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'bg-surface-2 relative overflow-hidden rounded-md',
        'bg-[linear-gradient(90deg,transparent_0%,var(--surface-raised)_50%,transparent_100%)]',
        'animate-shimmer bg-[length:180%_100%] bg-no-repeat',
        className
      )}
      {...props}
    />
  )
}

/** Matches the geometry of a PostCard so listings never jump. */
export function PostCardSkeleton() {
  return (
    <div className="border-border bg-surface flex flex-col gap-4 rounded-xl border p-5">
      <Skeleton className="aspect-[16/9] w-full rounded-lg" />
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-4 w-24 rounded-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="mt-1 h-3.5 w-32" />
      </div>
    </div>
  )
}
