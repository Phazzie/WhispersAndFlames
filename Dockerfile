# ============================================
# Stage 1: Dependencies
# Install all dependencies (including dev)
# ============================================
FROM node:20-alpine AS deps

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (includes devDependencies for build)
RUN npm ci

# ============================================
# Stage 2: Builder
# Build the Next.js application
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set environment variables for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build-time environment variables.
#
# `next build` collects page data, which loads modules that import
# src/lib/env.ts — and that validates the required keys at module load. So the
# build FAILS without them present, even though the build itself never calls
# Clerk or xAI.
#
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be the REAL value: Next inlines
# NEXT_PUBLIC_* into the client bundle at build time, so a placeholder here
# ships a broken Clerk client to the browser. It is publishable by design.
#
# CLERK_SECRET_KEY and XAI_API_KEY only need to satisfy validation during the
# build, so they default to placeholders and are overridden with real values at
# runtime. Do not pass real secrets as build args — they persist in image
# layer history.
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
ENV CLERK_SECRET_KEY=sk_build_time_placeholder
ENV XAI_API_KEY=xai_build_time_placeholder

# Build Next.js app
# This needs devDependencies (TypeScript, Tailwind, etc.)
RUN npm run build

# Now prune devDependencies AFTER build completes
RUN npm prune --production

# ============================================
# Stage 3: Runner
# Production image - only what's needed to run
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Don't run as root for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy necessary files from builder
COPY --from=builder /app/package.json ./package.json

# Copy the standalone build output
# Next.js automatically creates this in .next/standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy public files if they exist
# Note: standalone output includes necessary public files
RUN mkdir -p ./public

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set port environment variable
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check - check if server responds
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

# Start the app
CMD ["node", "server.js"]
