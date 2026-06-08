# ========================================
# AWID / BURGER MINUTE - Socket.IO Service
# Bun-based Docker image
# ========================================

FROM oven/bun:1-alpine

WORKDIR /app

# Copy dependency files first for caching
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Cache bust to prevent Docker overlay2 bug
ENV BUST_CACHE=1

# Copy application source
COPY . .

# Install pm2
RUN bun install -g pm2

# Expose Socket.IO port (3003) and internal emit API port (3004)
EXPOSE 3003 3004

# Start the service with pm2
CMD ["pm2-runtime", "start", "index.ts", "--interpreter", "bun"]
