'use client'

import * as React from 'react'

import {
  ACCEPT_ALL,
  DEFAULT_CONSENT,
  clearConsent,
  getConsentServerSnapshot,
  getConsentSnapshot,
  parseConsent,
  subscribeConsent,
  writeConsent,
  type ConsentState,
} from '@/lib/consent'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * CONSENT PROVIDER
 * ═════════════════════════════════════════════════════════════════════════════
 * One source of truth for "what is this reader willing to be tracked with",
 * shared by the banner, the preferences dialog and every ad slot.
 *
 * The important behaviour is what happens BEFORE a decision is known. The
 * server cannot read a cookie during a static render, so the server snapshot
 * is "no decision", which parses to the denied default — both hydration-safe
 * and legally correct, since consent is opt-in.
 *
 * Everything downstream is written so that resolving the real answer changes
 * colours and content but never SIZES: an ad slot reserves its space whether
 * or not it will ever be filled, so accepting or declining cannot move the
 * article.
 */

type ConsentContextValue = {
  consent: ConsentState
  /** False until the stored decision has been read in the browser. */
  resolved: boolean
  /** True when the banner should be shown: resolved, and no decision found. */
  needsDecision: boolean
  acceptAll: () => void
  rejectAll: () => void
  save: (choice: { analytics: boolean; advertising: boolean }) => void
  reopen: () => void
}

const ConsentContext = React.createContext<ConsentContextValue | null>(null)

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [reopened, setReopened] = React.useState(false)

  /*
   * Consent is read through `useSyncExternalStore`, not an effect.
   *
   * It genuinely IS an external store — a cookie plus localStorage, written
   * from outside React — and that is what this hook is for. Loading it in an
   * effect and calling setState would be a cascading render on every page,
   * and it would also be wrong in the multi-tab case.
   *
   * The snapshot is the raw serialised STRING, deliberately. `getSnapshot`
   * must be referentially stable between changes; returning a freshly parsed
   * object would differ by identity on every call and loop forever.
   *
   * The server snapshot is `null`, which parses to the denied default. That
   * is both the hydration-safe answer and the legally correct one: until a
   * decision is read, there is no consent.
   */
  const raw = React.useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getConsentServerSnapshot
  )

  const consent = React.useMemo(() => parseConsent(raw) ?? DEFAULT_CONSENT, [raw])

  /*
   * Whether we are past hydration.
   *
   * Distinct from `raw === null`, which means "no decision". This means "we
   * have actually looked", and it is what keeps ad slots from flashing
   * through a state before the stored answer is known.
   */
  const resolved = React.useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false
  )

  const commit = React.useCallback(
    (choice: { analytics: boolean; advertising: boolean }) => {
      writeConsent({ necessary: true, ...choice })
      setReopened(false)
    },
    []
  )

  const value = React.useMemo<ConsentContextValue>(
    () => ({
      consent,
      resolved,
      needsDecision: (resolved && consent.decidedAt === null) || reopened,
      acceptAll: () => commit({ analytics: true, advertising: true }),
      rejectAll: () => commit({ analytics: false, advertising: false }),
      save: commit,
      reopen: () => {
        // Clearing first means closing the reopened banner without choosing
        // leaves no stale decision standing.
        clearConsent()
        setReopened(true)
      },
    }),
    [consent, resolved, reopened, commit]
  )

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
}

/** Mount state never changes within a page's life, so nothing to subscribe to. */
function subscribeNothing(): () => void {
  return () => {}
}

/**
 * Reads consent.
 *
 * Returns the denied default rather than throwing when there is no provider —
 * a missing provider must fail CLOSED (no ads, no analytics), never open.
 */
export function useConsent(): ConsentContextValue {
  return (
    React.useContext(ConsentContext) ?? {
      consent: DEFAULT_CONSENT,
      resolved: false,
      needsDecision: false,
      acceptAll: () => {},
      rejectAll: () => {},
      save: () => {},
      reopen: () => {},
    }
  )
}

/** Convenience for the common question: may we load an ad at all? */
export function useAdvertisingConsent(): { granted: boolean; resolved: boolean } {
  const { consent, resolved } = useConsent()
  return { granted: consent.advertising, resolved }
}

export { ACCEPT_ALL }
