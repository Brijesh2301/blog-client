/** Shapes returned by the admin API. Mirrors server/src/services + routes. */

export type CheckStatus = 'pass' | 'warn' | 'fail'

export type SeoCheck = {
  id: string
  label: string
  status: CheckStatus
  hint: string
  weight: number
  blocking: boolean
}

export type SeoReport = {
  score: number
  checks: SeoCheck[]
  blockers: SeoCheck[]
  wordCount: number
  readingMinutes: number
  keywordDensity: number
}

export type AdminPostRow = {
  id: string
  slug: string
  title: string
  status: 'draft' | 'in_review' | 'scheduled' | 'published' | 'archived'
  seoScore: number | null
  wordCount: number
  viewCount: number
  publishedAt: string | null
  scheduledFor: string | null
  updatedAt: string
  authorName: string | null
  categoryName: string | null
}

export type AdminStats = {
  posts: {
    total: number
    published: number
    draft: number
    scheduled: number
    inReview: number
    staleCount: number
  }
  views: { total: number; since: string }
  subscribers: { total: number; confirmed: number; pending: number }
  comments: { pending: number }
  topPosts: {
    id: string
    slug: string
    title: string
    viewCount: number
    publishedAt: string | null
    seoScore: number | null
  }[]
  recentPosts: {
    id: string
    slug: string
    title: string
    status: AdminPostRow['status']
    updatedAt: string
    seoScore: number | null
  }[]
  categories: { name: string; slug: string; n: number }[]
}

export type ContentHealth = {
  duplicateTitles: { value: string | null; n: number }[]
  duplicateDescriptions: { value: string | null; n: number }[]
  missingMeta: { id: string; slug: string; title: string }[]
  stale: { id: string; slug: string; title: string; reviewedAt: string | null }[]
  lowScore: { id: string; slug: string; title: string; seoScore: number | null }[]
}

export type AuthUser = {
  id: string
  email: string
  name: string
  slug: string | null
  role: 'admin' | 'editor' | 'author' | 'reader'
  avatarUrl: string | null
  bio: string | null
  emailVerified: boolean
}
