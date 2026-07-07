-- AlterTable (idempotent - check if column exists first)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'isAttachable'
  ) THEN
    ALTER TABLE "products" ADD COLUMN "isAttachable" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Update existing supplements and sauces to be attachable
UPDATE "products" 
SET "isAttachable" = true 
WHERE "categoryId" IN (
  SELECT "id" FROM "categories" 
  WHERE LOWER("name") IN ('suppléments', 'supplements', 'sauces', 'sauce')
);
