import type { Metadata } from 'next'

import { AdminComments } from '@/components/admin/admin-comments'

export const metadata: Metadata = { title: 'Comments' }

export default function AdminCommentsPage() {
  return <AdminComments />
}
