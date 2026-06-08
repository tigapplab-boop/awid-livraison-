-- ========================================
-- AWID / BURGER MINUTE - Add Orders Indexes
-- Optimize queries filtering by status and assignedLivreurId
-- ========================================

-- CreateIndex
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "orders_assignedLivreurId_idx" ON "orders"("assignedLivreurId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "orders_status_assignedLivreurId_idx" ON "orders"("status", "assignedLivreurId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "orders_createdAt_idx" ON "orders"("createdAt");
