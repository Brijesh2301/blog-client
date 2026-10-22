import type { Metadata } from 'next'

import { AdminDashboard } from '@/components/admin/admin-dashboard'

export const metadata: Metadata = { title: 'Dashboard' }

export default function AdminHomePage() {
  return <AdminDashboard />
}
