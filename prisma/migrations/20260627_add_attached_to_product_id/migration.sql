-- AlterTable
ALTER TABLE "order_items" ADD COLUMN "attachedToProductId" TEXT;

-- CreateIndex
CREATE INDEX "order_items_attachedToProductId_idx" ON "order_items"("attachedToProductId");
