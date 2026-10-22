# ═════════════════════════════════════════════════════════════════════════════
# DEVLUME WEB — production image
# ═════════════════════════════════════════════════════════════════════════════
# Built on Next's `output: 'standalone'`, which traces the exact module graph
# the server needs. The runtime stage copies that and nothing else.
#
# IMPORTANT: NEXT_PUBLIC_* variables are inlined into the client bundle at
# BUILD time, not read at runtime. They are build args here for that reason —
# setting them only in the runtime environment would leave the browser bundle
# with the values from whenever the image was built, which is the single most
# common way a containerised Next app ends up pointing at the wrong API.

# ── Stage 1: dependencies ───────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Everything the browser bundle needs baked in.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_CLARITY_ID
ARG NEXT_PUBLIC_ADSENSE_CLIENT
ARG NEXT_PUBLIC_ADS_ENABLED
ARG NEXT_PUBLIC_AUDIO_ENABLED
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID \
    NEXT_PUBLIC_CLARITY_ID=$NEXT_PUBLIC_CLARITY_ID \
    NEXT_PUBLIC_ADSENSE_CLIENT=$NEXT_PUBLIC_ADSENSE_CLIENT \
    NEXT_PUBLIC_ADS_ENABLED=$NEXT_PUBLIC_ADS_ENABLED \
    NEXT_PUBLIC_AUDIO_ENABLED=$NEXT_PUBLIC_AUDIO_ENABLED \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

# `generateStaticParams` calls the API during the build, so the API must be
# reachable from the builder. In CI that means the compose network or a
# reachable staging API — see docs/DEPLOYMENT.md.
RUN npm run build

# ── Stage 3: runtime ────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 -G nodejs

# `public` and `.next/static` are NOT inside standalone — Next expects them to
# be copied alongside it. Missing either means a site that renders with no CSS
# and no images, which looks like a build failure but is a Dockerfile bug.
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
