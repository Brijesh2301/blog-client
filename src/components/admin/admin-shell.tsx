'use client'

import {
  ArrowLeftRight,
  ChartNoAxesColumn,
  FileText,
  Gauge,
  LogOut,
  FolderTree,
  Images,
  MessageSquare,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import * as React from 'react'

import { Logo } from '@/components/brand/logo'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { adminRequest } from '@/lib/admin-api'
import { cn } from '@/lib/utils'
import type { AuthUser } from '@/types/admin'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * ADMIN SHELL
 * ═════════════════════════════════════════════════════════════════════════════
 * A client component on purpose. The admin is behind httpOnly cookies set by
 * the API on a different origin, so a Server Component here could not read
 * them — the browser can, and does, because every admin request is sent with
 * `credentials: 'include'`.
 *
 * SECURITY: this guard is for UX only. It decides what to *show*; it does not
 * decide what the user may *do*. Every admin endpoint independently enforces
 * `requireAuth` + `requireRole` on the server, so bypassing this component in
 * devtools reveals an empty shell and nothing else.
 */

const NAV = [
  { href: '/admin', label: 'Dashboard', Icon: ChartNoAxesColumn, exact: true },
  { href: '/admin/posts', label: 'Posts', Icon: FileText },
  { href: '/admin/taxonomy', label: 'Taxonomy', Icon: FolderTree },
  { href: '/admin/media', label: 'Media', Icon: Images },
  { href: '/admin/comments', label: 'Comments', Icon: MessageSquare },
  { href: '/admin/seo', label: 'SEO health', Icon: Gauge },
  { href: '/admin/redirects', label: 'Redirects', Icon: ArrowLeftRight },
  { href: '/admin/users', label: 'People', Icon: Users, roles: ['admin'] },
] as const

type State =
  | { phase: 'loading' }
  | { phase: 'authed'; user: AuthUser }
  | { phase: 'denied'; reason: string }

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [state, setState] = React.useState<State>({ phase: 'loading' })

  React.useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const { user } = await adminRequest<{ user: AuthUser }>('/auth/me')
        if (cancelled) return

        if (user.role === 'reader') {
          setState({
            phase: 'denied',
            reason: 'This account does not have access to the admin area.',
          })
          return
        }
        setState({ phase: 'authed', user })
      } catch {
        if (cancelled) return
        // Send them to sign in, remembering where they were heading.
        router.replace(`/login?next=${encodeURIComponent(pathname)}`)
        setState({ phase: 'denied', reason: 'Sign in to continue.' })
      }
    }

    void check()
    return () => {
      cancelled = true
    }
  }, [router, pathname])

  async function signOut() {
    await adminRequest('/auth/logout', { method: 'POST' }).catch(() => undefined)
    router.replace('/login')
  }

  if (state.phase === 'loading') {
    return (
      <div className="grid min-h-dvh place-items-center">
        <p className="text-foreground-muted text-sm" role="status">
          Checking your session…
        </p>
      </div>
    )
  }

  if (state.phase === 'denied') {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <div className="max-w-sm text-center">
          <h1 className="font-display text-h3 font-semibold">Not available</h1>
          <p className="text-foreground-muted mt-3 text-sm">{state.reason}</p>
          <Link
            href="/login"
            className="bg-primary text-foreground-onbrand mt-6 inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium"
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  const { user } = state
  const visible = NAV.filter(
    (item) => !('roles' in item) || item.roles.includes(user.role as 'admin')
  )

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside className="border-border bg-surface shrink-0 border-b lg:w-60 lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between px-5 lg:justify-start">
          <Logo href="/admin" />
          <span className="bg-primary-soft text-primary rounded-full px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide">
            Admin
          </span>
        </div>

        <nav aria-label="Admin" className="px-3 pb-4 lg:pb-0">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {visible.map(({ href, label, Icon, ...rest }) => {
              const exact = 'exact' in rest && rest.exact
              const active = exact ? pathname === href : pathname.startsWith(href)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2',
                      'text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary-soft text-primary'
                        : 'text-foreground-muted hover:bg-surface-2 hover:text-foreground'
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="border-hairline mt-auto hidden border-t p-4 lg:block">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="text-meta text-foreground-subtle truncate capitalize">
                {user.role}
              </p>
            </div>
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="border-border text-foreground-muted hover:text-foreground mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border text-sm transition-colors"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="bg-background-subtle min-w-0 flex-1">{children}</main>
    </div>
  )
}
