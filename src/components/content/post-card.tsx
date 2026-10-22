import { Clock, Headphones } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn, formatDate, isoDate } from '@/lib/utils'
import type { PostCard as PostCardType } from '@/types/content'

/**
 * Post card.
 *
 * CLS: the cover sits in a fixed `aspect-[16/9]` box with `fill`, so the space
 * is reserved before the image loads and the card never changes height. The
 * `sizes` attribute matches the real grid breakpoints — getting it wrong makes
 * the browser download a far larger image than it renders, which is one of the
 * most common LCP regressions on a card grid.
 *
 * The whole card is a single <a>: a nested link inside a linked card is both a
 * keyboard-navigation annoyance and an accessibility failure.
 */

type Variant = 'default' | 'featured' | 'compact' | 'horizontal'

const SIZES: Record<Variant, string> = {
  // 1 col below sm, 2 up to lg, 3 above — matches the listing grid.
  default: '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
  featured: '(min-width: 1024px) 66vw, 100vw',
  compact: '(min-width: 640px) 25vw, 40vw',
  horizontal: '(min-width: 640px) 33vw, 100vw',
}

export function PostCard({
  post,
  variant = 'default',
  priority = false,
  headingLevel: Heading = 'h3',
  className,
}: {
  post: PostCardType
  variant?: Variant
  /**
   * Set on the single LCP candidate above the fold — never more than one per
   * page. Marking several `priority` makes them compete and helps none.
   */
  priority?: boolean
  headingLevel?: 'h2' | 'h3'
  className?: string
}) {
  const href = `/blog/${post.slug}`
  const isHorizontal = variant === 'horizontal'
  const isFeatured = variant === 'featured'

  return (
    <Card
      interactive
      variant={isFeatured ? 'raised' : 'surface'}
      className={cn('h-full overflow-hidden', className)}
    >
      <Link
        href={href}
        className={cn(
          'flex h-full',
          isHorizontal ? 'flex-row items-stretch gap-4 p-3' : 'flex-col'
        )}
      >
        {post.coverImageUrl ? (
          <div
            className={cn(
              'bg-surface-2 relative shrink-0 overflow-hidden',
              isHorizontal
                ? 'aspect-square w-28 rounded-lg sm:w-32'
                : 'aspect-[16/9] w-full'
            )}
          >
            <Image
              src={post.coverImageUrl}
              // Empty alt is correct here: the card's heading already names the
              // article, so describing the decorative cover again is noise for
              // a screen reader.
              alt={post.coverImageAlt ?? ''}
              fill
              priority={priority}
              sizes={SIZES[variant]}
              quality={75}
              className="ease-out-expo object-cover transition-transform duration-500 group-hover/card:scale-[1.04]"
            />
          </div>
        ) : null}

        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col gap-2.5',
            isHorizontal ? 'py-0.5' : isFeatured ? 'p-6' : 'p-5'
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            {post.category ? (
              <span
                className={cn(
                  'inline-flex h-5 items-center rounded-full px-2 text-[0.6875rem] font-medium',
                  post.category.tone ?? 'bg-surface-2 text-foreground-muted'
                )}
              >
                {post.category.name}
              </span>
            ) : null}
            {post.editorsPick ? (
              <Badge variant="pick" size="sm">
                Editor&apos;s Pick
              </Badge>
            ) : null}
          </div>

          <Heading
            className={cn(
              'font-display text-foreground font-semibold tracking-tight',
              isFeatured ? 'text-h3' : isHorizontal ? 'text-[0.9375rem]' : 'text-h4'
            )}
          >
            {post.title}
          </Heading>

          {post.excerpt && !isHorizontal ? (
            <p
              className={cn(
                'text-foreground-muted text-sm leading-relaxed',
                isFeatured ? 'line-clamp-3' : 'line-clamp-2'
              )}
            >
              {post.excerpt}
            </p>
          ) : null}

          <div className="text-meta text-foreground-subtle mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2">
            {post.author ? <span>{post.author.name}</span> : null}
            {post.publishedAt ? (
              <>
                <Dot />
                <time dateTime={isoDate(post.publishedAt)}>
                  {formatDate(post.publishedAt)}
                </time>
              </>
            ) : null}
            <Dot />
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" aria-hidden="true" />
              {post.readingMinutes} min
            </span>
            {post.audioStatus === 'ready' ? (
              <>
                <Dot />
                <span
                  className="text-primary inline-flex items-center gap-1"
                  title="Available to listen"
                >
                  <Headphones className="size-3" aria-hidden="true" />
                  Listen
                </span>
              </>
            ) : null}
          </div>
        </div>
      </Link>
    </Card>
  )
}

function Dot() {
  return (
    <span aria-hidden="true" className="text-foreground-subtle/40">
      ·
    </span>
  )
}
