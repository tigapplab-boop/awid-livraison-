# Changelog

## [1.1.0] - 2026-06-08

### 🔒 Security
- JWT secret validation enforced (≥32 chars, no fallback)
- Protected GET /api/orders/[id] with authentication
- Added JWT authentication to Socket.IO connections
- Secured internal emit endpoint with EMIT_SECRET
- Server-side price validation (no client trust)
- Restricted CORS origins for Socket.IO
- Removed public PostgreSQL port exposure

### 🐛 Bug Fixes
- Fixed race condition on order acceptance
- Fixed race condition on order number generation
- Fixed memory leak in waiting page polling
- Fixed order source enum inconsistency

### ✨ Features
- Added Redis support for temporary order storage
- Added Redis to Docker Compose
- Added socket-service to Docker Compose
- Added /api/health monitoring endpoint
- Added database indexes for performance
- Added pagination to order listings
- Added livreur availability persistence
- Added structured JSON logging
- Added notification sound for new orders
- Added ISR cache for products API

### 🧪 Testing
- Added Jest tests for order-temp critical flows

### 🏗 Infrastructure
- Added Redis service (docker-compose)
- Added Redis adapter for Socket.IO
- Added rate limiting to all public endpoints
- Added Content-Security-Policy headers

### ⚠️ Breaking Changes
- Requires Redis service running
- Requires EMIT_SECRET environment variable
- Requires VAPID keys configuration
- Admin password must be changed on first login
