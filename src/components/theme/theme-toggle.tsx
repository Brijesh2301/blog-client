'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { useIsHydrated } from '@/lib/hooks'
import { cn } from '@/lib/utils'

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'dark', label: 'Dark', Icon: Moon },
] as const

/**
 * Three-state theme switch (light / system / dark) as a segmented control.
 *
 * Why a radiogroup and not a button: the three states are mutually exclusive
 * options, and "system" is not reachable by cycling a binary toggle in a way
 * users can predict.
 *
 * Hydration: `theme` is only known on the client, so until mounted we render
 * the same markup with no selection highlighted. Returning different markup
 * (or null) would either mismatch or shift layout, so the box size is fixed
 * from the first paint.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  // The active theme is client-only state, so it is unknown during SSR and
  // the hydration render. The box size does not depend on it, so gating only
  // the selected highlight costs no layout shift.
  const mounted = useIsHydrated()

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(
        'relative inline-flex items-center gap-0.5 rounded-full',
        'border-border bg-surface-2 border p-0.5',
        className
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = mounted && theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${label} theme`}
            onClick={() => setTheme(value)}
            className={cn(
              'relative grid size-7 place-items-center rounded-full',
              'ease-out-expo transition-all duration-300',
              selected
                ? 'bg-surface text-primary shadow-xs'
                : 'text-foreground-subtle hover:text-foreground'
            )}
          >
            <Icon className="size-[0.875rem]" aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}
