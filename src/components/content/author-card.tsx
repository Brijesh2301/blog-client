import Image from 'next/image'
import Link from 'next/link'

import { GitHubIcon, LinkedInIcon, XIcon } from '@/components/brand/brand-icons'
import { cn } from '@/lib/utils'

/**
 * Author byline card.
 *
 * This is an E-E-A-T surface, not decoration: the name, role, credentials and
 * verifiable social profiles are the signals that distinguish a real
 * practitioner from anonymous content. The same fields feed Person JSON-LD.
 */
export function AuthorCard({
  author,
  className,
}: {
  author: {
    name: string
    slug: string | null
    avatarUrl: string | null
    jobTitle: string | null
    bio: string | null
    credentials?: string | null
    socials?: Record<string, string> | null
  }
  className?: string
}) {
  const href = author.slug ? `/author/${author.slug}` : null

  const socialLinks = [
    { key: 'x', label: `${author.name} on X`, Icon: XIcon },
    { key: 'github', label: `${author.name} on GitHub`, Icon: GitHubIcon },
    { key: 'linkedin', label: `${author.name} on LinkedIn`, Icon: LinkedInIcon },
  ].filter((item) => Boolean(author.socials?.[item.key]))

  return (
    <aside
      className={cn(
        'border-border bg-surface-2 flex flex-col gap-4 rounded-2xl border p-6 sm:flex-row sm:gap-5',
        className
      )}
    >
      <div className="bg-surface relative size-16 shrink-0 overflow-hidden rounded-full">
        {author.avatarUrl ? (
          <Image
            src={author.avatarUrl}
            alt=""
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="bg-primary-soft font-display text-primary grid size-full place-items-center text-xl font-semibold"
          >
            {author.name.charAt(0)}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-eyebrow text-foreground-subtle font-sans uppercase">
          Written by
        </p>
        <h2 className="font-display text-h4 mt-1 font-semibold tracking-tight">
          {href ? (
            <Link href={href} className="hover:text-primary">
              {author.name}
            </Link>
          ) : (
            author.name
          )}
        </h2>

        {author.jobTitle ? (
          <p className="text-foreground-muted mt-0.5 text-sm">{author.jobTitle}</p>
        ) : null}

        {author.bio ? (
          <p className="text-foreground-muted mt-3 text-sm leading-relaxed">
            {author.bio}
          </p>
        ) : null}

        {author.credentials ? (
          <p className="text-meta text-foreground-subtle mt-2 leading-relaxed">
            {author.credentials}
          </p>
        ) : null}

        {socialLinks.length > 0 ? (
          <ul className="mt-4 flex items-center gap-2">
            {socialLinks.map(({ key, label, Icon }) => (
              <li key={key}>
                <a
                  href={author.socials![key]}
                  target="_blank"
                  rel="noopener noreferrer me"
                  aria-label={label}
                  className="border-border bg-surface text-foreground-muted hover:text-foreground grid size-8 place-items-center rounded-lg border transition-colors"
                >
                  <Icon className="size-3.5" />
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </aside>
  )
}
