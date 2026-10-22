import type { Metadata } from 'next'

import { AdminPostList } from '@/components/admin/admin-post-list'

export const metadata: Metadata = { title: 'Posts' }

export default function AdminPostsPage() {
  return <AdminPostList />
}
