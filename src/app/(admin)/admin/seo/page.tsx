import type { Metadata } from 'next'

import { AdminSeoHealth } from '@/components/admin/admin-seo-health'

export const metadata: Metadata = { title: 'SEO health' }

export default function AdminSeoPage() {
  return <AdminSeoHealth />
}
