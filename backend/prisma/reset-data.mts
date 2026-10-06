import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Deleting all business data...\n');

  // ====== 1. RETURN ITEMS (sab se pehle) ======
  await prisma.salesReturnItem.deleteMany();
  await prisma.purchaseReturnItem.deleteMany();

  // ====== 2. RETURNS (parent records) ======
  await prisma.salesReturn.deleteMany();
  await prisma.purchaseReturn.deleteMany();

  // ====== 3. SALE ITEMS & PURCHASE ITEMS ======
  await prisma.saleItem.deleteMany();
  await prisma.purchaseItem.deleteMany();

  // ====== 4. PAYMENTS ======
  await prisma.payment.deleteMany();
  await prisma.customerPayment.deleteMany();
  await prisma.supplierPayment.deleteMany();

  // ====== 5. SALES & PURCHASES ======
  await prisma.sale.deleteMany();
  await prisma.purchase.deleteMany();

  // ====== 6. STOCK ======
  await prisma.stockMovement.deleteMany();
  await prisma.inventory.deleteMany();

  // ====== 7. PRODUCT VARIANTS & PRODUCTS ======
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();

  // ====== 8. MASTERS ======
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.sizeMaster.deleteMany();
  await prisma.colorMaster.deleteMany();

  // ====== 9. CUSTOMERS & SUPPLIERS ======
  await prisma.openingBalanceEntry.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();

  // ====== 10. ACCOUNTING ======
  await prisma.accountTransaction.deleteMany();
  await prisma.cashFlowTransaction.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.expenseCategory.deleteMany();

  // ====== 11. MISC ======
  await prisma.auditLog.deleteMany();
  await prisma.numberSequence.deleteMany();
  await prisma.outlet.deleteMany();

  console.log('All business data deleted.');
  console.log('Users and Settings are still intact.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });