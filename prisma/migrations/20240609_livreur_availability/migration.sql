-- ========================================
-- AWID / BURGER MINUTE - Livreur Availability
-- Add availability schedule and last seen tracking
-- ========================================

-- Add availability schedule (JSON format)
ALTER TABLE "users" ADD COLUMN "availabilitySchedule" TEXT;

-- Add last seen timestamp for real-time online status
ALTER TABLE "users" ADD COLUMN "lastSeenAt" TIMESTAMP(3);

-- Create index for faster online status queries
CREATE INDEX "users_lastSeenAt_idx" ON "users"("lastSeenAt");
CREATE INDEX "users_isAvailable_idx" ON "users"("isAvailable");
