import type { Metadata } from 'next'

import { AdminRedirects } from '@/components/admin/admin-redirects'

export const metadata: Metadata = { title: 'Redirects' }

export default function AdminRedirectsPage() {
  return <AdminRedirects />
}
