-- Migration: Add Sauces & Inventory System
-- Date: 2026-06-11
-- Description: Complete implementation of sauces management and inventory tracking

-- ============================================
-- 1. SAUCES
-- ============================================

CREATE TABLE IF NOT EXISTS "sauces" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "order_item_sauces" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderItemId" TEXT NOT NULL,
    "sauceId" TEXT NOT NULL,
    CONSTRAINT "order_item_sauces_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_item_sauces_sauceId_fkey" FOREIGN KEY ("sauceId") REFERENCES "sauces" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ============================================
-- 2. PRODUCT - Add Stock Management Fields
-- ============================================

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stockQuantity" INTEGER DEFAULT 0;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "minStockAlert" INTEGER DEFAULT 10;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "trackStock" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "unit" TEXT DEFAULT 'unité';

-- ============================================
-- 3. INVENTORY PRODUCTS
-- ============================================

CREATE TABLE IF NOT EXISTS "inventory_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "supplier" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "purchasePrice" INTEGER NOT NULL,
    "sellingPrice" INTEGER NOT NULL,
    "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "linkedProductId" TEXT UNIQUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_products_linkedProductId_fkey" FOREIGN KEY ("linkedProductId") REFERENCES "products" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "inventory_products_category_idx" ON "inventory_products"("category");
CREATE INDEX IF NOT EXISTS "inventory_products_supplier_idx" ON "inventory_products"("supplier");

-- ============================================
-- 4. PURCHASES
-- ============================================

CREATE TABLE IF NOT EXISTS "purchases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseNumber" TEXT NOT NULL UNIQUE,
    "productId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "supplier" TEXT NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "notes" TEXT,
    "invoiceNumber" TEXT,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "purchases_productId_fkey" FOREIGN KEY ("productId") REFERENCES "inventory_products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "purchases_isPaid_idx" ON "purchases"("isPaid");
CREATE INDEX IF NOT EXISTS "purchases_supplier_idx" ON "purchases"("supplier");
CREATE INDEX IF NOT EXISTS "purchases_purchaseDate_idx" ON "purchases"("purchaseDate");

-- ============================================
-- SEED DEFAULT SAUCES (optional - run separately)
-- ============================================

-- INSERT INTO "sauces" ("id", "name", "nameAr", "isAvailable", "sortOrder", "createdAt") VALUES
-- (gen_random_uuid()::text, 'Sauce Algérienne', 'صلصة جزائرية', true, 1, CURRENT_TIMESTAMP),
-- (gen_random_uuid()::text, 'Harissa', 'هريسة', true, 2, CURRENT_TIMESTAMP),
-- (gen_random_uuid()::text, 'Mayonnaise', 'مايونيز', true, 3, CURRENT_TIMESTAMP),
-- (gen_random_uuid()::text, 'Ketchup', 'كاتشب', true, 4, CURRENT_TIMESTAMP),
-- (gen_random_uuid()::text, 'Moutarde', 'خردل', true, 5, CURRENT_TIMESTAMP),
-- (gen_random_uuid()::text, 'Sauce Blanche', 'صلصة بيضاء', true, 6, CURRENT_TIMESTAMP);

-- ============================================
-- END OF MIGRATION
-- ============================================
