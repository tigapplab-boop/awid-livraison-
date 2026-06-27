-- Migration: Add attachedToProductId to order_items
-- Date: 2026-06-27
-- Purpose: Support supplements/sauces attachment to specific burgers in POS and Phone orders

-- Add the new column (nullable to support existing data)
ALTER TABLE "order_items" ADD COLUMN "attachedToProductId" TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS "order_items_attachedToProductId_idx" ON "order_items"("attachedToProductId");

-- Comment explaining the field
COMMENT ON COLUMN "order_items"."attachedToProductId" IS 'ID du produit auquel ce supplément/sauce est attaché (NULL si standalone)';
