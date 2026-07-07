-- AlterTable (idempotent - check if column exists first)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'attachedToProductId'
  ) THEN
    ALTER TABLE "order_items" ADD COLUMN "attachedToProductId" TEXT;
  END IF;
END $$;

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "order_items_attachedToProductId_idx" ON "order_items"("attachedToProductId");
