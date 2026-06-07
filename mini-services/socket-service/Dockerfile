# ========================================
# AWID / BURGER MINUTE - Socket.IO Service
# Bun-based Docker image
# ========================================

FROM bun:1-alpine

WORKDIR /app

# Copy dependency files first for caching
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy application source
COPY . .

# Expose Socket.IO port (3003) and internal emit API port (3004)
EXPOSE 3003 3004

# Start the service
CMD ["bun", "index.ts"]
