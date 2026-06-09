-- Add promo banner fields to products
ALTER TABLE "products" ADD COLUMN "hasPromo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN "promoText" TEXT;
ALTER TABLE "products" ADD COLUMN "promoTextAr" TEXT;
ALTER TABLE "products" ADD COLUMN "promoBgColor" TEXT DEFAULT '#FF6B00';
