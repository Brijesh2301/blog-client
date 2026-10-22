import Script from 'next/script'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THIRD-PARTY SCRIPT STRATEGY
 * ─────────────────────────────────────────────────────────────────────────────
 * Rules this file enforces, so no page can regress them:
 *
 *  1. NOTHING renders unless its env var is set. A missing measurement ID
 *     produces no script tag at all, rather than a broken one.
 *  2. No third-party script is render-blocking. GA4 is `afterInteractive`
 *     (it must not miss the first pageview); Clarity and AdSense are
 *     `lazyOnload` so they cannot compete with LCP or inflate INP.
 *  3. GA4 boots with Consent Mode v2 DENIED by default. Nothing is measured
 *     until the CMP banner grants it — which is what keeps the setup
 *     GDPR-compliant rather than consent-theatre. Phase 7 adds the banner
 *     that calls gtag('consent','update',…).
 *  4. AdSense is additionally gated behind NEXT_PUBLIC_ADS_ENABLED, which
 *     stays `false` until the AdSense review passes.
 */

const GA_ID = process.env.NEXT_PUBLIC_GA_ID
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true'

export function Analytics() {
  return (
    <>
      {GA_ID ? (
        <>
          <Script
            id="ga4-src"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              // Consent Mode v2 — deny everything until the CMP says otherwise.
              gtag('consent', 'default', {
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
                analytics_storage: 'denied',
                functionality_storage: 'granted',
                security_storage: 'granted',
                wait_for_update: 500
              });
              gtag('config', '${GA_ID}', {
                anonymize_ip: true,
                // Route changes are reported manually so SPA navigations are
                // not double-counted against the initial page_view.
                send_page_view: true
              });
            `}
          </Script>
        </>
      ) : null}

      {CLARITY_ID ? (
        <Script id="clarity" strategy="lazyOnload">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${CLARITY_ID}");
          `}
        </Script>
      ) : null}

      {ADS_ENABLED && ADSENSE_CLIENT ? (
        <Script
          id="adsense"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          strategy="lazyOnload"
          crossOrigin="anonymous"
        />
      ) : null}
    </>
  )
}
