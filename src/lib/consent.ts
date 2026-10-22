/**
 * ═════════════════════════════════════════════════════════════════════════════
 * CONSENT
 * ═════════════════════════════════════════════════════════════════════════════
 * The storage and signalling layer for the cookie banner. Deliberately a plain
 * module with no React in it, because three different things need to read
 * consent and only one of them is a component:
 *
 *   - the banner and the preferences dialog (React);
 *   - `AdSlot`, which must refuse to render an ad without advertising consent;
 *   - the analytics and ad scripts, which read it through Google Consent Mode
 *     before React has hydrated.
 *
 * WHY A COOKIE AND NOT JUST localStorage
 * The value is mirrored into a cookie so the SERVER can see it. Without that,
 * the first paint of every page would have to assume no consent and then
 * correct itself after hydration — which is both a flash of changing UI and,
 * for ad slots, a layout shift. The cookie is not httpOnly on purpose: the
 * client is the thing that writes it.
 *
 * WHAT IS NOT HERE
 * This is a first-party consent store, not an IAB TCF vendor framework. A real
 * TCF v2.2 string requires a registered CMP and a vendor list; if the site
 * later joins an ad network that demands TCF, this module becomes the adapter
 * in front of it rather than being replaced.
 */

/**
 * The categories, deliberately coarse.
 *
 * A banner with eleven toggles is a dark pattern by exhaustion — people click
 * "accept all" to make it go away, which is not consent in any meaningful
 * sense. Three categories map onto the three things that actually happen.
 */
export type ConsentCategory = 'necessary' | 'analytics' | 'advertising'

export type ConsentState = {
  necessary: true
  analytics: boolean
  advertising: boolean
  /** ISO timestamp of the decision. Consent has to be re-asked eventually. */
  decidedAt: string | null
  /** Bumped when the categories change meaning, forcing a re-ask. */
  version: number
}

/** Raise this when what a category COVERS changes, not for copy edits. */
export const CONSENT_VERSION = 1

/**
 * How long a decision stands.
 *
 * The CNIL guidance is 6-13 months; 12 is the common reading, and re-asking
 * sooner trains people to dismiss the banner without reading it.
 */
const CONSENT_MAX_AGE_DAYS = 365

export const CONSENT_COOKIE = 'devlume-consent'
const CONSENT_STORAGE_KEY = 'devlume-consent'

/** No decision yet: everything optional is OFF. Opt-IN, never opt-out. */
export const DEFAULT_CONSENT: ConsentState = {
  necessary: true,
  analytics: false,
  advertising: false,
  decidedAt: null,
  version: CONSENT_VERSION,
}

export const ACCEPT_ALL: ConsentState = {
  necessary: true,
  analytics: true,
  advertising: true,
  decidedAt: null,
  version: CONSENT_VERSION,
}

export function parseConsent(raw: string | null | undefined): ConsentState | null {
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw))
    if (typeof parsed !== 'object' || parsed === null) return null

    const value = parsed as Partial<ConsentState>

    // A decision made against an older category set is not a decision about
    // the current one, so it is discarded and the banner shows again.
    if (value.version !== CONSENT_VERSION) return null
    if (typeof value.decidedAt !== 'string') return null

    const age = Date.now() - new Date(value.decidedAt).getTime()
    if (!Number.isFinite(age) || age > CONSENT_MAX_AGE_DAYS * 86_400_000) return null

    return {
      necessary: true,
      analytics: value.analytics === true,
      advertising: value.advertising === true,
      decidedAt: value.decidedAt,
      version: CONSENT_VERSION,
    }
  } catch {
    return null
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUBSCRIPTION
   ═══════════════════════════════════════════════════════════════════════════
   Consent lives in a cookie and in localStorage — an external store, not React
   state. React reads it through `useSyncExternalStore`, which needs two things
   this section provides:

     - a way to be told when it changes, and
     - a snapshot that is REFERENTIALLY STABLE between changes. Returning a
       freshly parsed object from `getSnapshot` would make React re-render
       forever, because every snapshot would differ from the last one by
       identity. So the snapshot is the raw serialised STRING, a primitive,
       and parsing happens in a memo downstream.
   ═══════════════════════════════════════════════════════════════════════════ */

const listeners = new Set<() => void>()

export function subscribeConsent(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

function emitConsentChange(): void {
  for (const listener of listeners) listener()
}

/** The raw stored value: a stable primitive, or null when undecided. */
export function getConsentSnapshot(): string | null {
  if (typeof document === 'undefined') return null

  const fromCookie = readCookie(CONSENT_COOKIE)
  if (fromCookie && parseConsent(fromCookie)) return fromCookie

  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY)
    return stored && parseConsent(stored) ? stored : null
  } catch {
    return null
  }
}

/** The server knows nothing, and "nothing" must mean denied. */
export function getConsentServerSnapshot(): string | null {
  return null
}

/** Reads the stored decision, or null if there is not a current one. */
export function readConsent(): ConsentState | null {
  if (typeof document === 'undefined') return null

  // The cookie is authoritative — it is what the server sees — and
  // localStorage is the fallback for the case where a cookie was dropped.
  const fromCookie = parseConsent(readCookie(CONSENT_COOKIE))
  if (fromCookie) return fromCookie

  try {
    return parseConsent(localStorage.getItem(CONSENT_STORAGE_KEY))
  } catch {
    return null
  }
}

export function writeConsent(
  state: Omit<ConsentState, 'decidedAt' | 'version'>
): ConsentState {
  const decided: ConsentState = {
    ...state,
    necessary: true,
    decidedAt: new Date().toISOString(),
    version: CONSENT_VERSION,
  }

  const serialised = encodeURIComponent(JSON.stringify(decided))

  if (typeof document !== 'undefined') {
    // `SameSite=Lax` not `None`: this cookie is never needed in a
    // cross-site request, and `None` would require `Secure` and leak it to
    // every embedded third party.
    document.cookie =
      `${CONSENT_COOKIE}=${serialised}; path=/; max-age=${CONSENT_MAX_AGE_DAYS * 86_400}; ` +
      `SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
  }

  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(decided))
  } catch {
    // Private mode. The cookie above is still the source of truth.
  }

  pushConsentMode(decided)
  emitConsentChange()
  return decided
}

/** Clears the decision entirely, so the banner asks again. */
export function clearConsent(): void {
  if (typeof document !== 'undefined') {
    document.cookie = `${CONSENT_COOKIE}=; path=/; max-age=0; SameSite=Lax`
  }
  try {
    localStorage.removeItem(CONSENT_STORAGE_KEY)
  } catch {
    /* nothing to do */
  }

  emitConsentChange()
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null

  for (const part of document.cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }
  return null
}

/* ═══════════════════════════════════════════════════════════════════════════
   GOOGLE CONSENT MODE v2
   ═══════════════════════════════════════════════════════════════════════════ */

type ConsentSignal = 'granted' | 'denied'

/**
 * Pushes the decision to Google Consent Mode v2.
 *
 * Required since March 2024 for anyone serving Google ads or using GA4 in the
 * EEA — without these signals Google stops modelling conversions entirely and
 * ad personalisation is disabled regardless of what the user chose.
 *
 * The four v2 signals are not interchangeable: `ad_user_data` governs sending
 * identifiers to Google, `ad_personalization` governs remarketing, and both
 * are separate from `ad_storage`, which is only about cookies. Collapsing them
 * into one flag is the most common way to get this wrong.
 */
export function pushConsentMode(state: ConsentState): void {
  if (typeof window === 'undefined') return

  const ads: ConsentSignal = state.advertising ? 'granted' : 'denied'
  const analytics: ConsentSignal = state.analytics ? 'granted' : 'denied'

  gtag('consent', 'update', {
    ad_storage: ads,
    ad_user_data: ads,
    ad_personalization: ads,
    analytics_storage: analytics,
  })
}

type GtagWindow = Window & { dataLayer?: unknown[] }

/**
 * Minimal `gtag` shim.
 *
 * Writes into `dataLayer` directly rather than depending on gtag.js being
 * loaded. The queue is replayed when (and if) the tag arrives, so a consent
 * decision made before the script loads is never lost — which is the normal
 * case, since the banner appears long before any ad script.
 */
function gtag(...args: unknown[]): void {
  const w = window as GtagWindow
  w.dataLayer = w.dataLayer ?? []
  w.dataLayer.push(args)
}

/**
 * The inline script that sets DENIED defaults before anything else runs.
 *
 * This must execute in `<head>`, before any tag, or there is a window in which
 * Google's scripts assume consent. It also re-reads the stored cookie and
 * immediately upgrades the defaults for a returning visitor, so an accepted
 * decision applies on the very first request rather than after hydration.
 *
 * Kept as a string because it has to be inlined — a separate file would be a
 * blocking request in the critical path.
 */
export const CONSENT_BOOTSTRAP = `
(function(){
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  gtag('consent','default',{
    ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied',
    analytics_storage:'denied', wait_for_update: 500
  });
  try {
    var m = document.cookie.match(/(?:^|; )${CONSENT_COOKIE}=([^;]*)/);
    if (m) {
      var c = JSON.parse(decodeURIComponent(m[1]));
      if (c && c.version === ${CONSENT_VERSION}) {
        gtag('consent','update',{
          ad_storage: c.advertising ? 'granted' : 'denied',
          ad_user_data: c.advertising ? 'granted' : 'denied',
          ad_personalization: c.advertising ? 'granted' : 'denied',
          analytics_storage: c.analytics ? 'granted' : 'denied'
        });
        document.documentElement.dataset.consent =
          (c.advertising ? 'ads' : 'no-ads') + ' ' + (c.analytics ? 'analytics' : 'no-analytics');
      }
    }
  } catch (e) {}
})();
`.trim()
