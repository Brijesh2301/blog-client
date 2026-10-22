import type { Metadata } from 'next'

import { AdminMedia } from '@/components/admin/admin-media'

export const metadata: Metadata = { title: 'Media' }

export default function AdminMediaPage() {
  return <AdminMedia />
}
