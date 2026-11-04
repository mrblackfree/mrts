# syntax=docker/dockerfile:1
# TradeScope AI — production image (Next.js standalone, non-root, runs on 2 vCPU / 4 GB VMs)

# Pinned by tag AND digest for reproducible builds. To bump deliberately:
#   docker pull node:<new-tag> && docker image inspect node:<new-tag> --format '{{index .RepoDigests 0}}'
ARG NODE_VERSION=22.23.4-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914

# ---------- 1) dependencies ----------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- 2) build ----------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* values are inlined into the client bundle at build time. `.env*` files are excluded from the
# build context (.dockerignore keeps secrets out of image layers), so pass public values as build args:
#   docker compose build --build-arg NEXT_PUBLIC_DATA_FEEDBACK_URL=... (or set them in the shell for compose)
ARG NEXT_PUBLIC_DATA_FEEDBACK_URL=
ARG NEXT_PUBLIC_OVERRIDES_EDIT_URL=
ENV NEXT_PUBLIC_DATA_FEEDBACK_URL=${NEXT_PUBLIC_DATA_FEEDBACK_URL} \
    NEXT_PUBLIC_OVERRIDES_EDIT_URL=${NEXT_PUBLIC_OVERRIDES_EDIT_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- 3) runtime ----------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# settings saved on /admin (AES-GCM encrypted, mode 0600) — mount a volume so they survive container rebuilds
RUN mkdir -p /app/.data && chown nextjs:nodejs /app/.data && chmod 700 /app/.data
# mount a named volume here (compose does: tradescope_data) — plain `docker run` needs `-v tradescope_data:/app/.data`,
# otherwise each new container gets a fresh anonymous volume and the saved settings are gone
VOLUME ["/app/.data"]

USER nextjs
EXPOSE 3000

# AI_* variables are read at request time, so keys can be added/rotated without rebuilding the image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
