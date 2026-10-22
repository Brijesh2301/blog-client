import { absoluteUrl, siteConfig } from '@/config/site'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * STRUCTURED DATA (JSON-LD)
 * ─────────────────────────────────────────────────────────────────────────────
 * Builders return plain objects; the <JsonLd> component serialises them.
 *
 * Every entity uses a stable `@id` so the graph can cross-reference instead of
 * duplicating nodes — that is what lets Google connect a BlogPosting to its
 * Person author, its Organization publisher and its AudioObject.
 *
 * ID convention:  <site>/#organization, <site>/#website,
 *                 <site>/blog/slug#article, <site>/author/x#person
 */

export const ORG_ID = absoluteUrl('/#organization')
export const WEBSITE_ID = absoluteUrl('/#website')

type Json = Record<string, unknown>

/** Organization — the publisher node referenced by every article. */
export function organizationSchema(): Json {
  const sameAs = [
    siteConfig.social.x,
    siteConfig.social.github,
    siteConfig.social.linkedin,
    siteConfig.social.youtube,
  ].filter(Boolean)

  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: siteConfig.name,
    legalName: siteConfig.organization.legalName,
    url: absoluteUrl('/'),
    description: siteConfig.description,
    foundingDate: siteConfig.organization.foundingDate,
    logo: {
      '@type': 'ImageObject',
      '@id': absoluteUrl('/#logo'),
      url: absoluteUrl(siteConfig.assets.logo),
      contentUrl: absoluteUrl(siteConfig.assets.logo),
      width: 512,
      height: 512,
      caption: siteConfig.name,
    },
    image: { '@id': absoluteUrl('/#logo') },
    ...(sameAs.length && { sameAs }),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'editorial',
      email: siteConfig.organization.editorialEmail,
      availableLanguage: ['English'],
    },
  }
}

/**
 * WebSite + SearchAction — enables the sitelinks search box.
 * `query-input` must name a real query param that returns results.
 */
export function websiteSchema(): Json {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: absoluteUrl('/'),
    name: siteConfig.name,
    description: siteConfig.description,
    publisher: { '@id': ORG_ID },
    inLanguage: siteConfig.lang,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: absoluteUrl('/search?q={search_term_string}'),
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export type Crumb = { name: string; href: string }

/**
 * BreadcrumbList. Pass the trail WITHOUT the current page as a link target —
 * the last item should still be listed (Google wants the full trail) but its
 * `item` is omitted, which is the documented way to mark the current page.
 */
export function breadcrumbSchema(crumbs: Crumb[], pathForId = '/'): Json {
  return {
    '@type': 'BreadcrumbList',
    '@id': absoluteUrl(`${pathForId}#breadcrumb`),
    itemListElement: crumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      ...(i < crumbs.length - 1 && { item: absoluteUrl(crumb.href) }),
    })),
  }
}

export type PersonInput = {
  name: string
  slug: string
  bio?: string
  avatar?: string
  jobTitle?: string
  sameAs?: string[]
  /** Credentials / expertise — a direct E-E-A-T signal. */
  knowsAbout?: string[]
}

export function personSchema(author: PersonInput): Json {
  return {
    '@type': 'Person',
    '@id': absoluteUrl(`/author/${author.slug}#person`),
    name: author.name,
    url: absoluteUrl(`/author/${author.slug}`),
    ...(author.bio && { description: author.bio }),
    ...(author.jobTitle && { jobTitle: author.jobTitle }),
    ...(author.avatar && {
      image: {
        '@type': 'ImageObject',
        url: author.avatar.startsWith('http')
          ? author.avatar
          : absoluteUrl(author.avatar),
      },
    }),
    ...(author.sameAs?.length && { sameAs: author.sameAs }),
    ...(author.knowsAbout?.length && { knowsAbout: author.knowsAbout }),
    worksFor: { '@id': ORG_ID },
  }
}

export type ArticleInput = {
  title: string
  description: string
  slug: string
  image: string
  imageAlt?: string
  publishedAt: string
  updatedAt?: string
  author: PersonInput
  category?: { name: string; slug: string }
  tags?: string[]
  wordCount?: number
  /** Minutes, rendered as an ISO-8601 duration. */
  readingMinutes?: number
  /** Present only when the Listen feature has generated audio (Phase 6). */
  audio?: AudioInput
}

export function blogPostingSchema(post: ArticleInput): Json {
  const url = absoluteUrl(`/blog/${post.slug}`)
  return {
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    isPartOf: { '@id': WEBSITE_ID },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: { '@id': absoluteUrl(`/author/${post.author.slug}#person`) },
    publisher: { '@id': ORG_ID },
    image: {
      '@type': 'ImageObject',
      url: post.image.startsWith('http') ? post.image : absoluteUrl(post.image),
      width: 1200,
      height: 630,
      ...(post.imageAlt && { caption: post.imageAlt }),
    },
    inLanguage: siteConfig.lang,
    ...(post.category && { articleSection: post.category.name }),
    ...(post.tags?.length && { keywords: post.tags.join(', ') }),
    ...(post.wordCount && { wordCount: post.wordCount }),
    ...(post.readingMinutes && { timeRequired: `PT${post.readingMinutes}M` }),
    // Links the Listen feature's audio to the article (Phase 6 SEO gate).
    ...(post.audio && { audio: audioObjectSchema(post.audio, post.slug) }),
  }
}

export type AudioInput = {
  title: string
  contentUrl: string
  /** Seconds. Converted to an ISO-8601 duration. */
  duration?: number
  uploadDate?: string
  transcriptUrl?: string
  encodingFormat?: string
}

export function audioObjectSchema(audio: AudioInput, slug: string): Json {
  return {
    '@type': 'AudioObject',
    '@id': absoluteUrl(`/blog/${slug}#audio`),
    name: audio.title,
    contentUrl: audio.contentUrl,
    encodingFormat: audio.encodingFormat ?? 'audio/mpeg',
    ...(audio.duration && { duration: secondsToIsoDuration(audio.duration) }),
    ...(audio.uploadDate && { uploadDate: audio.uploadDate }),
    ...(audio.transcriptUrl && { transcript: audio.transcriptUrl }),
    potentialAction: { '@type': 'ListenAction' },
  }
}

export type FaqItem = { question: string; answer: string }

export function faqSchema(items: FaqItem[], pathForId: string): Json {
  return {
    '@type': 'FAQPage',
    '@id': absoluteUrl(`${pathForId}#faq`),
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}

/** Collection pages (category, tag, author, archive). */
export function collectionPageSchema(input: {
  name: string
  description: string
  path: string
  items: { title: string; slug: string }[]
}): Json {
  const url = absoluteUrl(input.path)
  return {
    '@type': 'CollectionPage',
    '@id': `${url}#collection`,
    url,
    name: input.name,
    description: input.description,
    isPartOf: { '@id': WEBSITE_ID },
    inLanguage: siteConfig.lang,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: input.items.length,
      itemListElement: input.items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: absoluteUrl(`/blog/${item.slug}`),
        name: item.title,
      })),
    },
  }
}

export type HowToStep = { name: string; text: string; url?: string; image?: string }

/**
 * HowTo — for step-by-step guides.
 *
 * Only emit this when the article genuinely IS a sequence of steps. Marking a
 * discursive essay as a HowTo is structured-data spam, and Google issues
 * manual actions for it.
 */
export function howToSchema(input: {
  name: string
  description: string
  slug: string
  steps: HowToStep[]
  totalMinutes?: number
  image?: string
}): Json {
  const url = absoluteUrl(`/blog/${input.slug}`)
  return {
    '@type': 'HowTo',
    '@id': `${url}#howto`,
    name: input.name,
    description: input.description,
    ...(input.image && {
      image: {
        '@type': 'ImageObject',
        url: input.image.startsWith('http') ? input.image : absoluteUrl(input.image),
      },
    }),
    ...(input.totalMinutes && { totalTime: `PT${input.totalMinutes}M` }),
    step: input.steps.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: step.name,
      text: step.text,
      url: step.url ?? `${url}#step-${i + 1}`,
      ...(step.image && {
        image: {
          '@type': 'ImageObject',
          url: step.image.startsWith('http') ? step.image : absoluteUrl(step.image),
        },
      }),
    })),
  }
}

export type VideoInput = {
  name: string
  description: string
  thumbnailUrl: string
  uploadDate: string
  /** Seconds. */
  duration?: number
  contentUrl?: string
  embedUrl?: string
}

/**
 * VideoObject, for articles that embed a video.
 *
 * `thumbnailUrl` and `uploadDate` are required by Google; a VideoObject
 * missing either is dropped silently rather than erroring, which is why they
 * are non-optional in the input type.
 */
export function videoObjectSchema(video: VideoInput, slug: string): Json {
  return {
    '@type': 'VideoObject',
    '@id': absoluteUrl(`/blog/${slug}#video`),
    name: video.name,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl,
    uploadDate: video.uploadDate,
    ...(video.duration && { duration: secondsToIsoDuration(video.duration) }),
    ...(video.contentUrl && { contentUrl: video.contentUrl }),
    ...(video.embedUrl && { embedUrl: video.embedUrl }),
  }
}

/**
 * Wrap nodes in a single `@graph`. One script tag per page, cross-referenced
 * by `@id`, is preferred over several disconnected blocks.
 */
export function graph(...nodes: Json[]): Json {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes,
  }
}

/** PT1H2M3S from a second count. */
export function secondsToIsoDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}${sec || (!h && !m) ? `${sec}S` : ''}`
}
