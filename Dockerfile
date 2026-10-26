# ── Base image ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
# libc6-compat is commonly required by native Node modules on Alpine.
RUN apk add --no-cache libc6-compat

# ── Dependencies ────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
# Build tools are needed to compile native deps (e.g. node-pty, a transitive
# dependency of @letta-ai/letta-code) on Alpine.
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci

# ── Builder ─────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Build the standalone server (output: "standalone") -> /app/.next/standalone
RUN npm run build

# ── Runner ──────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy the minimal standalone server, then the static assets and public files
# that Next.js does NOT include in the standalone output.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
