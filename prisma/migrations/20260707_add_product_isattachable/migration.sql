-- AlterTable
ALTER TABLE "products" ADD COLUMN "isAttachable" BOOLEAN NOT NULL DEFAULT false;

-- Update existing supplements and sauces to be attachable
-- Based on category names that typically contain attachable items
UPDATE "products" 
SET "isAttachable" = true 
WHERE "categoryId" IN (
  SELECT "id" FROM "categories" 
  WHERE LOWER("name") IN ('suppléments', 'supplements', 'sauces', 'sauce')
);
