import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { ok } from '../../utils/response';
import { authenticate, requirePermission } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

/**
 * Full JSON backup of critical tables.
 */
router.get('/export', requirePermission('SETTINGS_UPDATE'), async (_req, res, next) => {
  try {
    const [
      settings, categories, brands, units, products, inventory,
      customers, suppliers, sales, saleItems, purchases, purchaseItems,
      salesReturns, salesReturnItems, purchaseReturns, purchaseReturnItems,
      payments, customerPayments, supplierPayments, stockMovements,
      expenses, expenseCategories, accounts, accountTransactions,
      cashFlowTransactions, numberSequences,
    ] = await Promise.all([
      prisma.settings.findMany(),
      prisma.category.findMany(),
      prisma.brand.findMany(),
      prisma.unit.findMany(),
      prisma.product.findMany(),
      prisma.inventory.findMany(),
      prisma.customer.findMany(),
      prisma.supplier.findMany(),
      prisma.sale.findMany(),
      prisma.saleItem.findMany(),
      prisma.purchase.findMany(),
      prisma.purchaseItem.findMany(),
      prisma.salesReturn.findMany(),
      prisma.salesReturnItem.findMany(),
      prisma.purchaseReturn.findMany(),
      prisma.purchaseReturnItem.findMany(),
      prisma.payment.findMany(),
      prisma.customerPayment.findMany(),
      prisma.supplierPayment.findMany(),
      prisma.stockMovement.findMany(),
      prisma.expense.findMany(),
      prisma.expenseCategory.findMany(),
      prisma.account.findMany(),
      prisma.accountTransaction.findMany(),
      prisma.cashFlowTransaction.findMany(),
      prisma.numberSequence.findMany(),
    ]);

    return ok(res, {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      data: {
        settings, categories, brands, units, products, inventory,
        customers, suppliers, sales, saleItems, purchases, purchaseItems,
        salesReturns, salesReturnItems, purchaseReturns, purchaseReturnItems,
        payments, customerPayments, supplierPayments, stockMovements,
        expenses, expenseCategories, accounts, accountTransactions,
        cashFlowTransactions, numberSequences,
      },
    }, 'Backup exported');
  } catch (e) { next(e); }
});

export default router;