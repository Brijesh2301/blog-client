# Vendored fonts

Self-hosted rather than fetched by `next/font/google`.

## Why vendored

`next/font/google` downloads each face from `fonts.googleapis.com` **at build
time**, so every production build depends on an external host being reachable.
That fails in an offline or egress-restricted CI runner and is a single point
of failure for deploys. Vendoring removes the dependency: builds are
reproducible and work with no network.

Runtime behaviour is identical either way — `next/font` self-hosts the files it
downloads, so visitors never contacted Google in the first place.

## What is here

| File                                     | Family                            | Role          | Used by                |
| ---------------------------------------- | --------------------------------- | ------------- | ---------------------- |
| `inter-latin-wght-normal.woff2`          | Inter Variable (100–900)          | UI + display  | `app/layout.tsx`       |
| `source-serif-4-latin-wght-normal.woff2` | Source Serif 4 Variable (200–900) | article body  | `app/layout.tsx`       |
| `jetbrains-mono-latin-wght-normal.woff2` | JetBrains Mono Variable (100–800) | code          | `app/layout.tsx`       |
| `inter-latin-{400,600,700}-normal.woff`  | Inter static                      | OG image only | `app/api/og/route.tsx` |

Source: [Fontsource](https://fontsource.org). Inter and Source Serif 4 are
licensed under the SIL Open Font License 1.1; JetBrains Mono under the OFL 1.1.

## Why both woff2 and woff

The page uses **woff2** — one variable file per family covers the whole weight
range, at roughly 30% smaller than the equivalent woff.

The OG image route cannot use them. It renders through satori, which supports
**ttf / otf / woff but not woff2**, so three static Inter weights are kept
alongside purely for `/api/og`. They are never served to a browser.

## Preloading

Only Inter is preloaded. It paints above the fold on every route; the serif is
article body copy and the mono is code, so preloading those would spend LCP
budget on bytes most pages never use. `next/font` also emits a metric-matched
fallback face (ascent / descent / `size-adjust` overrides) for each family, so
the swap from fallback to real face does not reflow text.

## Updating

```bash
npx --yes npm-check-updates   # or check fontsource.org for a new version
curl -sSLO https://cdn.jsdelivr.net/npm/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2
```

No component changes are ever needed: every component reads `font-sans`,
`font-serif`, `font-mono` or `font-display`, never a family name.
