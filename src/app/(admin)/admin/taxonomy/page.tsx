import type { Metadata } from 'next'

import { AdminTaxonomy } from '@/components/admin/admin-taxonomy'

export const metadata: Metadata = { title: 'Taxonomy' }

export default function AdminTaxonomyPage() {
  return <AdminTaxonomy />
}
