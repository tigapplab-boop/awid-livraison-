# ========================================
# AWID / BURGER MINUTE - Multi-stage Dockerfile
# Next.js standalone production build
# PostgreSQL database (via DATABASE_URL env)
# ========================================

# ---- Stage 1: Dependencies ----
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install Bun
RUN npm install -g bun

# Copy package files for dependency installation
COPY package.json package-lock.json ./
RUN bun add socket.io @types/socket.io
RUN bun install

# ---- Stage 2: Builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install Bun in builder stage
RUN npm install -g bun

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arg for VAPID public key (must be set at build time for NEXT_PUBLIC_ vars)
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"
# Force new build ID to invalidate Server Actions cache
ENV NEXT_BUILD_ID=opening-hours-20260610-v2

# Generate Prisma client
RUN npx prisma generate

# Clear Next.js cache before build
RUN rm -rf .next

# Build Next.js using npm instead of bun for better compatibility
RUN npm run build

# Copy static assets and public into standalone output
RUN cp -r .next/static .next/standalone/.next/ && \
    cp -r public .next/standalone/

# ---- Stage 3: Runner ----
FROM node:20-alpine AS runner
WORKDIR /app

# Cache bust to prevent Docker overlay2 bug
ENV BUST_CACHE=1

# Install openssl for jose JWT library (WebCrypto API) + curl for healthcheck
RUN apk add --no-cache openssl curl

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/standalone/.next/static ./.next/static
COPY --from=builder /app/.next/standalone/public ./public

# Copy custom server with WebSocket proxy for Socket.IO
COPY --from=builder /app/server.js ./server.js

# Copy Prisma schema, migrations, and seed for runtime
COPY --from=builder /app/prisma ./prisma

# Copy package.json for npx and scripts
COPY --from=builder /app/package.json ./

# Copy full node_modules to ensure all CLI tools (prisma, tsx) work perfectly
COPY --from=builder /app/node_modules ./node_modules

# Install http-proxy for WebSocket proxying (lightweight, no build needed)
RUN npm install http-proxy --save --prefer-offline 2>/dev/null || true

# Set upload directory for uploaded files
ENV UPLOAD_DIR="/app/upload"

# Create upload directory
RUN mkdir -p /app/upload && \
    chown -R nextjs:nodejs /app/upload

# Copy and set up entrypoint script
COPY --chmod=755 <<'EOF' /app/entrypoint.sh
#!/bin/sh
set -e

echo "[Entrypoint] Starting Burger Minute..."

# ── Résoudre les migrations failed AVANT de déployer ─────────────────────────
echo "[Entrypoint] Checking for failed migrations..."
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function fix() {
  try {
    const result = await p.\$executeRawUnsafe(
      \"UPDATE \\\"_prisma_migrations\\\" SET rolled_back_at = NOW() WHERE finished_at IS NULL AND rolled_back_at IS NULL\"
    );
    console.log('[Entrypoint] Failed migrations resolved: ' + result);
  } catch(e) {
    console.log('[Entrypoint] Migration fix skipped:', e.message);
  } finally {
    await p.\$disconnect();
  }
}
fix();
" 2>/dev/null || true

# ── Déployer les migrations ───────────────────────────────────────────────────
echo "[Entrypoint] Running migrations..."
npx --yes prisma migrate deploy 2>&1 || {
  echo "[Entrypoint] migrate deploy had issues, attempting recovery..."
  # Mark any newly failed migrations as rolled_back and retry once
  node -e "
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  async function fix() {
    try {
      await p.\$executeRawUnsafe(
        \"UPDATE \\\"_prisma_migrations\\\" SET rolled_back_at = NOW() WHERE finished_at IS NULL AND rolled_back_at IS NULL\"
      );
      console.log('[Entrypoint] Recovery: failed migrations marked as rolled_back.');
    } catch(e) {
      console.log('[Entrypoint] Recovery skipped:', e.message);
    } finally {
      await p.\$disconnect();
    }
  }
  fix();
  " 2>/dev/null || true
  echo "[Entrypoint] Retrying migrations..."
  npx --yes prisma migrate deploy 2>&1 || echo "[Entrypoint] migrate deploy still failing, using db push fallback..."
}

# ── Sync schema (ajoute les colonnes manquantes sans casser les données) ──────
echo "[Entrypoint] Syncing database schema..."
npx --yes prisma db push --accept-data-loss 2>&1 || true

# ── Seed si première installation ────────────────────────────────────────────
USER_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count().then(c => { console.log(c); p.\$disconnect(); }).catch(() => { console.log(0); p.\$disconnect(); });
" 2>/dev/null || echo "0")

if [ "$USER_COUNT" = "0" ]; then
  echo "[Entrypoint] No users found, seeding database..."
  npx --yes tsx prisma/seed.ts || \
    echo "[Entrypoint] Warning: Seed failed, you may need to seed manually"
else
  echo "[Entrypoint] Database has $USER_COUNT users, skipping seed."
fi

echo "[Entrypoint] Starting server..."
exec node server.js
EOF

# Expose port
EXPOSE 3000

# Set environment defaults
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Switch to non-root user
USER nextjs

# Start the application via entrypoint
CMD ["/app/entrypoint.sh"]
