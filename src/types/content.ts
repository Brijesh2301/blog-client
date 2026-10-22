/**
 * Shared content types.
 *
 * Hand-written to mirror the API response shape rather than imported from the
 * server package: the two deploy independently, so a compile-time import would
 * create a coupling that does not exist at runtime. Phase 8 can generate these
 * from the OpenAPI spec if drift becomes a problem.
 */

export type PostStatus = 'draft' | 'in_review' | 'scheduled' | 'published' | 'archived'

export type AudioStatus = 'none' | 'queued' | 'processing' | 'ready' | 'failed'

export type AuthorSummary = {
  id: string
  name: string
  slug: string | null
  avatarUrl: string | null
  jobTitle: string | null
}

export type CategorySummary = {
  id: string
  name: string
  slug: string
  tone: string | null
}

export type TagSummary = {
  id: string
  name: string
  slug: string
}

/** Shape returned by the listing endpoints. Excludes the article body. */
export type PostCard = {
  id: string
  slug: string
  title: string
  subtitle: string | null
  excerpt: string | null
  coverImageUrl: string | null
  coverImageAlt: string | null
  status: PostStatus
  featured: boolean
  editorsPick: boolean
  readingMinutes: number
  wordCount: number
  viewCount: number
  likeCount: number
  commentCount: number
  publishedAt: string | null
  updatedAt: string
  audioStatus: AudioStatus
  audioDuration: number | null
  /** The language this post is written in. */
  locale: string
  /** The post this one translates, if any. */
  translationOfId: string | null
  author: AuthorSummary | null
  category: CategorySummary | null
  /**
   * Only present on the series endpoint, which returns ordered parts. Optional
   * rather than a separate type: it is the same card everywhere else.
   */
  seriesPosition?: number | null
}

/** Full article, as returned by GET /posts/:slug. */
export type PostDetail = PostCard & {
  content: unknown
  contentHtml: string | null
  contentText: string | null
  metaTitle: string | null
  metaDescription: string | null
  canonicalUrl: string | null
  ogImage: string | null
  focusKeyword: string | null
  secondaryKeywords: string[]
  noIndex: boolean
  faq: { question: string; answer: string }[]
  audioUrl: string | null
  audioVoice: string | null
  audioEnabled: boolean
  /** Whether the thread is open. Editors toggle this per post. */
  allowComments: boolean
  seriesId: string | null
  seriesPosition: number | null
  reviewedAt: string | null
  createdAt: string
  authorBio: string | null
  authorCredentials: string | null
  authorSocials: Record<string, string> | null
  tags: TagSummary[]
}

export type Category = {
  id: string
  name: string
  slug: string
  description: string | null
  introText: string | null
  tone: string | null
  icon: string | null
  coverImageUrl: string | null
  parentId: string | null
  position: number
  featured: boolean
  metaTitle: string | null
  metaDescription: string | null
  canonicalUrl: string | null
  ogImage: string | null
  noIndex: boolean
  postCount: number
  /** Server-computed: false when the category has no unique intro text. */
  shouldIndex?: boolean
}

export type Tag = {
  id: string
  name: string
  slug: string
  description: string | null
  metaTitle: string | null
  metaDescription: string | null
  postCount: number
  noIndex: boolean
  /** Server-computed: false below the thin-content threshold. */
  shouldIndex: boolean
  thinThreshold?: number
}

export type Author = {
  id: string
  name: string
  slug: string
  bio: string | null
  jobTitle: string | null
  credentials: string | null
  avatarUrl: string | null
  socials: Record<string, string> | null
  knowsAbout: string[] | null
  postCount: number
}

export type Series = {
  id: string
  title: string
  slug: string
  description: string | null
  coverImageUrl: string | null
  metaTitle: string | null
  metaDescription: string | null
  ogImage: string | null
  pillarPostId: string | null
  postCount: number
}

export type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export type Paginated<T> = {
  items: T[]
  pagination: Pagination
}

export type PostQuery = {
  page?: number
  limit?: number
  category?: string
  tag?: string
  author?: string
  series?: string
  q?: string
  featured?: boolean
  editorsPick?: boolean
  sort?: 'newest' | 'oldest' | 'popular' | 'relevance'
  /**
   * Which language to list.
   *
   * Every public listing MUST pass this. Omitting it returns every language
   * at once, which is how the Hindi blog ended up showing English articles.
   */
  locale?: string
}

/** One language a post exists in. */
export type PostTranslation = {
  id: string
  slug: string
  locale: string
  title: string
}

/**
 * A comment and its replies.
 *
 * Fetched and rendered on the SERVER so the thread is in the HTML and
 * crawlable — comment threads are genuine long-tail content, and a thread that
 * only exists after hydration is invisible to a crawler and to anyone with JS
 * off.
 */
export type CommentNode = {
  id: string
  bodyHtml: string
  createdAt: string
  parentId: string | null
  author: { name: string; slug: string | null; avatarUrl: string | null } | null
  guestName: string | null
  replies: CommentNode[]
}

export type CommentThread = {
  comments: CommentNode[]
  allowComments: boolean
}
