-- AlterTable
ALTER TABLE "PurchaseReturnItem" ADD COLUMN     "variantId" TEXT;

-- AlterTable
ALTER TABLE "SalesReturnItem" ADD COLUMN     "variantId" TEXT;

-- CreateIndex
CREATE INDEX "PurchaseItem_variantId_idx" ON "PurchaseItem"("variantId");

-- CreateIndex
CREATE INDEX "PurchaseReturnItem_variantId_idx" ON "PurchaseReturnItem"("variantId");

-- CreateIndex
CREATE INDEX "SalesReturnItem_variantId_idx" ON "SalesReturnItem"("variantId");

-- AddForeignKey
ALTER TABLE "SalesReturnItem" ADD CONSTRAINT "SalesReturnItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
