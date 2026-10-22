'use client'

import * as React from 'react'

import { PostEditor } from '@/components/admin/post-editor'
import { adminRequest } from '@/lib/admin-api'
import type { Category, PostDetail } from '@/types/content'

/**
 * Loads the post and the category list, then hands both to the editor.
 *
 * Fetching lives here rather than in the editor so the editor stays a pure
 * controlled form — easy to reason about, and testable without a network.
 */
export function AdminPostEditorRoute({ id }: { id: string }) {
  const isNew = id === 'new'
  const [post, setPost] = React.useState<PostDetail | null>(null)
  const [categories, setCategories] = React.useState<Category[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const categoryData = await adminRequest<{ categories: Category[] }>('/categories')
        if (cancelled) return
        setCategories(categoryData.categories)

        if (isNew) return

        // The admin list is keyed by id; the detail endpoint is addressed by
        // slug, so resolve one to the other before fetching the full record.
        const list = await adminRequest<{ posts: { id: string; slug: string }[] }>(
          '/admin/posts'
        )
        const match = list.posts.find((row) => row.id === id)
        if (!match) {
          if (!cancelled) setError('That post no longer exists.')
          return
        }

        const detail = await adminRequest<{ post: PostDetail }>(`/posts/${match.slug}`)
        if (!cancelled) setPost(detail.post)
      } catch {
        if (!cancelled) setError('Could not load this post.')
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [id, isNew])

  if (error) {
    return (
      <div className="grid min-h-dvh place-items-center p-8">
        <p role="alert" className="text-danger-700 text-sm">
          {error}
        </p>
      </div>
    )
  }

  if (!categories || (!isNew && !post)) {
    return (
      <div className="grid min-h-dvh place-items-center p-8">
        <p role="status" className="text-foreground-muted text-sm">
          Loading editor…
        </p>
      </div>
    )
  }

  return <PostEditor post={post} categories={categories} />
}
