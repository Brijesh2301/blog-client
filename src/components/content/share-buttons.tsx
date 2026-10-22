'use client'

import { Check, Link2, Share2 } from 'lucide-react'
import * as React from 'react'

import { LinkedInIcon, XIcon } from '@/components/brand/brand-icons'
import { useHasNativeShare } from '@/lib/hooks'
import { cn } from '@/lib/utils'

/**
 * Share controls.
 *
 * The network links are plain anchors with pre-built share URLs, so they work
 * without JavaScript and are indistinguishable from any other outbound link.
 * They carry rel="noopener noreferrer nofollow": share endpoints are not
 * editorial endorsements and should not pass link equity.
 *
 * The native share sheet is offered only where it exists, and the control
 * falls back to copy-to-clipboard everywhere else, so the row never shows a
 * button that does nothing.
 */
export function ShareButtons({
  url,
  title,
  className,
}: {
  url: string
  title: string
  className?: string
}) {
  const [copied, setCopied] = React.useState(false)
  const canNativeShare = useHasNativeShare()

  React.useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // Clipboard access can be denied; say nothing rather than showing a
      // success state that did not happen.
      setCopied(false)
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, url })
    } catch {
      // Includes the user simply dismissing the sheet, which is not an error.
    }
  }

  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const links = [
    {
      label: 'Share on X',
      href: `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      Icon: XIcon,
    },
    {
      label: 'Share on LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      Icon: LinkedInIcon,
    },
  ]

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-eyebrow text-foreground-subtle mr-1 font-sans uppercase">
        Share
      </span>

      {links.map(({ label, href, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          aria-label={label}
          className="border-border bg-surface text-foreground-muted hover:border-border-strong hover:text-foreground grid size-9 place-items-center rounded-lg border transition-all hover:-translate-y-0.5"
        >
          <Icon className="size-4" />
        </a>
      ))}

      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Link copied' : 'Copy link'}
        className="border-border bg-surface text-foreground-muted hover:border-border-strong hover:text-foreground grid size-9 place-items-center rounded-lg border transition-all hover:-translate-y-0.5"
      >
        {copied ? (
          <Check className="text-success-700 size-4" aria-hidden="true" />
        ) : (
          <Link2 className="size-4" aria-hidden="true" />
        )}
      </button>

      {canNativeShare ? (
        <button
          type="button"
          onClick={nativeShare}
          aria-label="Share"
          className="border-border bg-surface text-foreground-muted hover:border-border-strong hover:text-foreground grid size-9 place-items-center rounded-lg border transition-all hover:-translate-y-0.5 sm:hidden"
        >
          <Share2 className="size-4" aria-hidden="true" />
        </button>
      ) : null}

      <span aria-live="polite" className="sr-only">
        {copied ? 'Link copied to clipboard' : ''}
      </span>
    </div>
  )
}
