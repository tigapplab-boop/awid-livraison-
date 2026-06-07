# ========================================
# AWID / BURGER MINUTE - Multi-stage Dockerfile
# Next.js standalone production build
# PostgreSQL database (via DATABASE_URL env)
# ========================================

# ---- Stage 1: Dependencies ----
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# ---- Stage 2: Builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build Next.js
RUN npm run build

# Copy static assets and public into standalone output
RUN cp -r .next/static .next/standalone/.next/ && \
    cp -r public .next/standalone/

# ---- Stage 3: Runner ----
FROM node:20-alpine AS runner
WORKDIR /app

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

# Copy Prisma schema, migrations, and seed for runtime
COPY --from=builder /app/prisma ./prisma

# Copy node_modules with prisma and seed dependencies for runtime
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/bcrypt ./node_modules/bcrypt
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm 2>/dev/null || true

# Copy package.json for npx prisma
COPY --from=builder /app/package.json ./

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

# Run database migrations
echo "[Entrypoint] Running migrations..."
npx prisma migrate deploy 2>&1 || {
  echo "[Entrypoint] Migration failed, trying prisma db push..."
  npx prisma db push --accept-data-loss 2>&1 || true
}

# Seed if no users exist (first deploy)
USER_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count().then(c => { console.log(c); p.\$disconnect(); }).catch(() => { console.log(0); p.\$disconnect(); });
" 2>/dev/null || echo "0")

if [ "$USER_COUNT" = "0" ]; then
  echo "[Entrypoint] No users found, seeding database..."
  npx tsx prisma/seed.ts 2>/dev/null || \
    node -e "import('./prisma/seed.ts').catch(() => {})" 2>/dev/null || \
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
