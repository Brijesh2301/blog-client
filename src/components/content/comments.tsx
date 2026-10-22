import { MessageSquare } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import {
  CommentForm,
  CommentsProvider,
  ReplyButton,
} from '@/components/content/comment-form'
import { getComments } from '@/lib/api'
import { cn, formatDate, isoDate } from '@/lib/utils'
import type { CommentNode } from '@/types/content'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * COMMENT THREAD — server rendered
 * ═════════════════════════════════════════════════════════════════════════════
 * This is a Server Component on purpose, and it is the load-bearing decision
 * of the whole feature.
 *
 * A comment thread is real content: questions readers actually ask, in words
 * they actually use. Rendered client-side it is invisible to crawlers, to
 * anyone with JavaScript off, and to the reader on the slow connection who
 * gave up before hydration. Rendered here it is in the initial HTML, part of
 * the document, and costs the reader nothing.
 *
 * Three things keep it from becoming an SEO liability:
 *
 *  1. `rel="ugc nofollow noopener noreferrer"` is forced onto every link in
 *     every comment body, server-side in comment.service.ts, regardless of
 *     what the commenter wrote. Comment spam exists to borrow a domain's
 *     authority; this is what refuses it.
 *  2. Comment bodies are sanitised to a tiny tag allowlist with NO headings,
 *     so a commenter cannot inject an <h2> into the page's outline and compete
 *     with the article's own structure.
 *  3. The thread is NOT in the article's JSON-LD. Google's Comment schema is
 *     for a page whose subject is the discussion; claiming it on an article
 *     misdescribes the page.
 *
 * The thread is also deliberately NOT paginated into separate URLs. A
 * `?comments=2` URL is a near-duplicate of the article with the same title and
 * description — a thin-content problem dressed as a feature.
 */

export async function Comments({ slug }: { slug: string }) {
  const { comments, allowComments } = await getComments(slug)
  const total = countComments(comments)

  // Nothing to show and nothing to add: render nothing rather than an empty
  // section, which is page weight with no content behind it.
  if (!allowComments && total === 0) return null

  return (
    <section
      id="comments"
      aria-labelledby="comments-heading"
      className="mt-20 scroll-mt-24"
    >
      <h2
        id="comments-heading"
        className="text-h3 flex items-center gap-2.5 font-semibold tracking-tight"
      >
        <MessageSquare className="text-primary size-5" aria-hidden="true" />
        {total === 0 ? 'Discussion' : `${total} ${total === 1 ? 'comment' : 'comments'}`}
      </h2>

      <CommentsProvider>
        {total > 0 ? (
          <CommentList comments={comments} className="mt-8" />
        ) : (
          <p className="text-foreground-muted mt-4 text-sm">
            No comments yet. Yours would be the first.
          </p>
        )}

        {allowComments ? (
          <div className="mt-10">
            <CommentForm slug={slug} />
          </div>
        ) : (
          <p className="border-border bg-surface-2 text-foreground-muted mt-10 rounded-xl border px-4 py-3 text-sm">
            Comments are closed on this article.
          </p>
        )}
      </CommentsProvider>
    </section>
  )
}

/**
 * The thread, as a nested ordered list.
 *
 * `<ol>` rather than `<div>`: a discussion has a meaningful order, and the
 * nesting communicates the reply structure to a screen reader without any
 * ARIA. Depth is capped at render time — see `depth` below.
 */
function CommentList({
  comments,
  depth = 0,
  className,
}: {
  comments: CommentNode[]
  depth?: number
  className?: string
}) {
  return (
    <ol
      className={cn(
        'flex list-none flex-col gap-6',
        // Each level indents and gets a thread line, which is what makes a
        // long discussion legible at a glance.
        depth > 0 && 'border-hairline mt-5 gap-5 border-l pl-4 sm:pl-5',
        className
      )}
    >
      {comments.map((comment) => (
        <li key={comment.id}>
          <Comment comment={comment} depth={depth} />
        </li>
      ))}
    </ol>
  )
}

/**
 * Maximum visual nesting.
 *
 * Beyond three levels the indent eats the text column on a phone, so deeper
 * replies are rendered flat but keep their parent reference. The data stays
 * fully threaded; only the presentation flattens.
 */
const MAX_DEPTH = 3

function Comment({ comment, depth }: { comment: CommentNode; depth: number }) {
  const name = comment.author?.name ?? comment.guestName ?? 'Anonymous'
  const profile = comment.author?.slug ? `/author/${comment.author.slug}` : null

  return (
    <article
      id={`comment-${comment.id}`}
      className="scroll-mt-24"
      aria-label={`Comment by ${name}`}
    >
      <div className="flex items-start gap-3">
        <div className="bg-surface-2 relative size-9 shrink-0 overflow-hidden rounded-full">
          {comment.author?.avatarUrl ? (
            <Image
              src={comment.author.avatarUrl}
              // Decorative: the name is right beside it in text, so alt text
              // here would be read twice.
              alt=""
              fill
              sizes="36px"
              className="object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="bg-primary-soft font-display text-primary grid size-full place-items-center text-sm font-semibold"
            >
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="text-foreground text-sm font-semibold">
              {profile ? (
                <Link href={profile} className="hover:text-primary transition-colors">
                  {name}
                </Link>
              ) : (
                name
              )}
            </span>

            {comment.author ? (
              <span className="bg-primary-soft text-primary rounded-full px-1.5 py-0.5 text-[0.6875rem] font-medium">
                Member
              </span>
            ) : null}

            {/*
              An absolute date, not "3 days ago". A relative label computed
              during render reads the clock, which makes this component
              uncacheable — and a cached "3 days ago" is simply wrong a week
              later. The machine-readable datetime is here for anything that
              wants to localise it.
            */}
            <time
              dateTime={isoDate(comment.createdAt)}
              className="text-meta text-foreground-subtle"
            >
              {formatDate(comment.createdAt)}
            </time>

            <a
              href={`#comment-${comment.id}`}
              className="text-meta text-foreground-subtle hover:text-primary transition-colors"
            >
              #
            </a>
          </div>

          {/*
            Sanitised server-side in comment.service.ts: a ten-tag allowlist,
            no images, no headings, and rel="ugc nofollow noopener noreferrer"
            forced onto every link. `.prose-comment` keeps comment typography
            distinct from the article's own prose scale.
          */}
          <div
            className="prose-comment mt-1.5"
            dangerouslySetInnerHTML={{ __html: comment.bodyHtml }}
          />

          <div className="mt-2">
            <ReplyButton id={comment.id} author={name} />
          </div>
        </div>
      </div>

      {comment.replies.length > 0 ? (
        <CommentList
          comments={comment.replies}
          depth={depth + 1 > MAX_DEPTH ? MAX_DEPTH : depth + 1}
        />
      ) : null}
    </article>
  )
}

function countComments(nodes: CommentNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countComments(node.replies), 0)
}
