-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "productMasterId" TEXT;

-- CreateTable
CREATE TABLE "ProductMaster" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductMaster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductMaster_name_key" ON "ProductMaster"("name");

-- CreateIndex
CREATE INDEX "Product_productMasterId_idx" ON "Product"("productMasterId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_productMasterId_fkey" FOREIGN KEY ("productMasterId") REFERENCES "ProductMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
