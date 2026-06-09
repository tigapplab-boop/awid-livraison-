-- AlterTable: Add isNew and sortOrder fields to products
ALTER TABLE "products" ADD COLUMN "isNew" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
