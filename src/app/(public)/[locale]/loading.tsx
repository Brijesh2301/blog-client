import { Container } from '@/components/ui/container'
import { PostCardSkeleton, Skeleton } from '@/components/ui/skeleton'

/**
 * Default route-loading fallback.
 *
 * The skeleton mirrors the real page geometry (hero block, then a three-up
 * card grid) so the swap to real content does not move anything. A generic
 * spinner would be cheaper to write and would cost CLS on every navigation.
 */
export default function Loading() {
  return (
    <Container className="py-16 sm:py-20">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5">
        <Skeleton className="h-6 w-40 rounded-full" />
        <Skeleton className="h-14 w-full max-w-2xl" />
        <Skeleton className="h-14 w-3/4" />
        <Skeleton className="mt-2 h-5 w-full max-w-xl" />
        <Skeleton className="h-5 w-2/3" />
      </div>

      <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>

      <span className="sr-only" role="status">
        Loading page
      </span>
    </Container>
  )
}
