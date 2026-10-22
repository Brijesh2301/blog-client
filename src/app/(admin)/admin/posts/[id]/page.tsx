import type { Metadata } from 'next'

import { AdminPostEditorRoute } from '@/components/admin/admin-post-editor-route'

export const metadata: Metadata = { title: 'Edit post' }

/**
 * `id` is either a post UUID or the literal `new`.
 *
 * Data is loaded on the CLIENT, not here: the admin authenticates with
 * httpOnly cookies set by the API on another origin, which a Server Component
 * cannot read.
 */
export default async function AdminPostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <AdminPostEditorRoute id={id} />
}
