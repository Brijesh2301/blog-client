'use client'

import * as React from 'react'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared client hooks.
 * ─────────────────────────────────────────────────────────────────────────────
 * Both hooks here use `useSyncExternalStore` rather than the more familiar
 * `useEffect(() => setState(...), [])`. That is deliberate: React's
 * compiler-aware lint rules flag a synchronous setState inside an effect
 * because it causes a second render pass on every mount.
 * `useSyncExternalStore` expresses the same intent — read a value that only
 * exists on the client, and subscribe to its changes — in one pass, with an
 * explicit server snapshot so SSR and hydration agree.
 */

const noopSubscribe = () => () => {}
const getTrue = () => true
const getFalse = () => false

/**
 * False during SSR and the hydration render, true afterwards.
 *
 * Use it to gate UI that depends on client-only state (the resolved theme,
 * `localStorage`, `matchMedia`) WITHOUT changing the markup's box size —
 * render the same layout either way and only swap the detail, or hydration
 * will shift the page.
 */
export function useIsHydrated(): boolean {
  return React.useSyncExternalStore(noopSubscribe, getTrue, getFalse)
}

/**
 * True once the page has scrolled past `threshold` pixels.
 *
 * The scroll listener is passive and the snapshot is a boolean, so React bails
 * out of re-rendering for every scroll event that does not cross the
 * threshold — a long scroll costs two renders, not one per frame.
 */
export function useScrolledPast(threshold = 12): boolean {
  // Memoised per threshold: a new function identity each render would make
  // React resubscribe on every pass.
  const subscribe = React.useCallback((onStoreChange: () => void) => {
    window.addEventListener('scroll', onStoreChange, { passive: true })
    return () => window.removeEventListener('scroll', onStoreChange)
  }, [])

  const getSnapshot = React.useCallback(() => window.scrollY > threshold, [threshold])

  // Server snapshot is false: the page always starts at the top.
  return React.useSyncExternalStore(subscribe, getSnapshot, getFalse)
}

/**
 * True when the browser exposes the native share sheet.
 *
 * A capability check is client-only state, so it follows the same
 * `useSyncExternalStore` pattern as `useIsHydrated`: the server snapshot is
 * false, which means the share button is simply absent from the prerendered
 * HTML rather than rendered and then removed.
 */
export function useHasNativeShare(): boolean {
  return React.useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator !== 'undefined' && 'share' in navigator,
    getFalse
  )
}
