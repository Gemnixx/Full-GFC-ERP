import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { ok } from '../../utils/response';
import { AppError } from '../../utils/errors';
import { authenticate, requirePermission } from '../../middleware/auth';
import { nextSalesReturnNumber, nextPurchaseReturnNumber } from '../../utils/numbering';
import { postAccountTransaction, recordCashFlow } from '../../utils/accounts';
import { applySalesReturnToWac, applyPurchaseReturnToWac } from '../../utils/wac';

const router = Router();
router.use(authenticate);

// ============================================================
// LIST RETURNS
// ============================================================
router.get('/', async (req, res, next) => {
  try {
    const { type, page = '1', pageSize = '20' } = req.query as any;
    const take = Math.min(parseInt(pageSize), 100);
    const skip = (parseInt(page) - 1) * take;

    const salesReturns = type === 'PURCHASE' ? [] : await prisma.salesReturn.findMany({
      include: { sale: true, customer: true },
      orderBy: { returnDate: 'desc' },
    });
    const purchaseReturns = type === 'SALES' ? [] : await prisma.purchaseReturn.findMany({
      include: { purchase: true, supplier: true },
      orderBy: { returnDate: 'desc' },
    });

    const items = [
      ...salesReturns.map((r) => ({
        id: r.id, returnNumber: r.returnNumber,
        reference: r.sale.invoiceNumber,
        party: r.customer?.name || 'Walk-in',
        amount: r.total, type: 'SALES',
        status: r.status, date: r.returnDate,
      })),
      ...purchaseReturns.map((r) => ({
        id: r.id, returnNumber: r.returnNumber,
        reference: r.purchase.purchaseNumber,
        party: r.supplier.name,
        amount: r.total, type: 'PURCHASE',
        status: r.status, date: r.returnDate,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return ok(res, { items: items.slice(skip, skip + take), total: items.length });
  } catch (e) { next(e); }
});

// ============================================================
// SALES RETURN
// ============================================================
const salesReturnSchema = z.object({
  saleId: z.string(),
  reason: z.string().optional(),
  refundMethod: z.enum(['CASH', 'BANK', 'CARD', 'CREDIT']).default('CASH'),
  items: z.array(z.object({
    saleItemId: z.string(),
    quantity: z.number().int().positive(),
  })).min(1),
});

router.post('/sales', requirePermission('RETURNS_CREATE'), async (req, res, next) => {
  try {
    const data = salesReturnSchema.parse(req.body);

    const result = await prisma.$transaction(
      async (tx) => {
        const sale = await tx.sale.findUnique({
          where: { id: data.saleId },
          include: { items: { include: { product: true } } },
        });
        if (!sale) throw new AppError('Sale not found', 404);

        const itemMap = new Map(sale.items.map((i) => [i.id, i]));
        let total = 0;

        const returnNumber = await nextSalesReturnNumber(tx);

        const salesReturn = await tx.salesReturn.create({
          data: {
            returnNumber, saleId: sale.id,
            customerId: sale.customerId, userId: req.user!.id,
            total: 0, reason: data.reason, refundMethod: data.refundMethod,
          },
        });

        for (const rItem of data.items) {
          const saleItem = itemMap.get(rItem.saleItemId);
          if (!saleItem) throw new AppError('Sale item not found', 404);
          if (rItem.quantity > saleItem.quantity) {
            throw new AppError('Return quantity exceeds sold quantity', 422);
          }
          const lineTotal = rItem.quantity * saleItem.unitPrice;
          total += lineTotal;

          await tx.salesReturnItem.create({
            data: {
              salesReturnId: salesReturn.id,
              productId: saleItem.productId,
              quantity: rItem.quantity,
              unitPrice: saleItem.unitPrice,
              lineTotal,
            },
          });

          // Increase inventory + reverse WAC
          await tx.inventory.update({
            where: { productId: saleItem.productId },
            data: { quantity: { increment: rItem.quantity } },
          });

          const wacResult = await applySalesReturnToWac(tx, saleItem.productId, rItem.quantity, saleItem.costAtSale || saleItem.wacAtSale);

          const inv = await tx.inventory.findUnique({ where: { productId: saleItem.productId } });
          await tx.stockMovement.create({
            data: {
              productId: saleItem.productId,
              userId: req.user!.id,
              type: 'SALES_RETURN',
              quantity: rItem.quantity,
              balance: inv?.quantity ?? 0,
              reference: returnNumber,
              unitCost: saleItem.costAtSale,
              totalCost: (saleItem.costAtSale || 0) * rItem.quantity,
              runningWac: wacResult.newWac,
            },
          });
        }

        await tx.salesReturn.update({ where: { id: salesReturn.id }, data: { total } });

        // Accounting
        if (data.refundMethod === 'CREDIT') {
          await postAccountTransaction(tx, [
            { code: '4100', debit: total, description: `Sales return ${returnNumber}` },
            { code: '1100', credit: total, description: `Sales return ${returnNumber}` },
          ]);
        } else {
          const cashCode = data.refundMethod === 'CASH' ? '1000' : data.refundMethod === 'BANK' ? '1010' : '1020';
          await postAccountTransaction(tx, [
            { code: '4100', debit: total, description: `Sales return ${returnNumber}` },
            { code: cashCode, credit: total, description: `Sales return ${returnNumber}` },
          ]);
          await recordCashFlow(tx, {
            type: 'OUT', amount: total, method: data.refundMethod,
            description: `Sales return ${returnNumber}`, reference: returnNumber,
          });
        }

        return salesReturn;
      },
      { timeout: 30000, maxWait: 10000 }
    );

    return ok(res, result, 'Sales return created', 201);
  } catch (e) { next(e); }
});

// ============================================================
// PURCHASE RETURN
// ============================================================
const purchaseReturnSchema = z.object({
  purchaseId: z.string(),
  reason: z.string().optional(),
  refundMethod: z.enum(['CASH', 'BANK', 'CREDIT']).default('CASH'),
  items: z.array(z.object({
    purchaseItemId: z.string(),
    quantity: z.number().int().positive(),
  })).min(1),
});

router.post('/purchase', requirePermission('RETURNS_CREATE'), async (req, res, next) => {
  try {
    const data = purchaseReturnSchema.parse(req.body);

    const result = await prisma.$transaction(
      async (tx) => {
        const purchase = await tx.purchase.findUnique({
          where: { id: data.purchaseId },
          include: { items: true },
        });
        if (!purchase) throw new AppError('Purchase not found', 404);

        const itemMap = new Map(purchase.items.map((i) => [i.id, i]));
        let total = 0;

        const returnNumber = await nextPurchaseReturnNumber(tx);
        const purchaseReturn = await tx.purchaseReturn.create({
          data: {
            returnNumber, purchaseId: purchase.id,
            supplierId: purchase.supplierId, userId: req.user!.id,
            total: 0, reason: data.reason, refundMethod: data.refundMethod,
          },
        });

        for (const rItem of data.items) {
          const pItem = itemMap.get(rItem.purchaseItemId);
          if (!pItem) throw new AppError('Purchase item not found', 404);
          if (rItem.quantity > pItem.quantity) {
            throw new AppError('Return quantity exceeds purchased quantity', 422);
          }
          const lineTotal = rItem.quantity * pItem.purchasePrice;
          total += lineTotal;

          await tx.purchaseReturnItem.create({
            data: {
              purchaseReturnId: purchaseReturn.id,
              productId: pItem.productId,
              quantity: rItem.quantity,
              purchasePrice: pItem.purchasePrice,
              lineTotal,
            },
          });

          const inv = await tx.inventory.update({
            where: { productId: pItem.productId },
            data: { quantity: { decrement: rItem.quantity } },
          });
          if (inv.quantity < 0) throw new AppError('Return would cause negative stock', 422);

          const wacResult = await applyPurchaseReturnToWac(tx, pItem.productId, rItem.quantity);
          await tx.stockMovement.create({
            data: {
              productId: pItem.productId,
              userId: req.user!.id,
              type: 'PURCHASE_RETURN',
              quantity: -rItem.quantity,
              balance: inv.quantity,
              reference: returnNumber,
              unitCost: wacResult.wacAtReturn,
              totalCost: wacResult.wacAtReturn * rItem.quantity,
              runningWac: wacResult.wacAtReturn,
            },
          });
        }

        await tx.purchaseReturn.update({ where: { id: purchaseReturn.id }, data: { total } });

        // ============================================================
        // NEW: Reduce purchase.due by the return amount (FIFO logic)
        // ============================================================
        // The return reduces what we owe the supplier for that specific purchase.
        // If the return amount exceeds the current due (because we already paid it),
        // then any excess becomes a "credit" — but for simplicity, we cap at purchase.due.
        const purchaseDue = purchase.due;
        const reduceDueBy = Math.min(total, purchaseDue);
        if (reduceDueBy > 0) {
          await tx.purchase.update({
            where: { id: purchase.id },
            data: {
              due: { decrement: reduceDueBy },
            },
          });
        }
        // If total > purchaseDue, the extra amount is treated as a supplier credit
        // (it will show as negative payable / advance in supplier ledger).

        // Accounting
        if (data.refundMethod === 'CREDIT') {
          // Reduce AP (we no longer owe supplier for returned goods)
          await postAccountTransaction(tx, [
            { code: '2000', debit: total, description: `Purchase return ${returnNumber}` },
            { code: '1200', credit: total, description: `Purchase return ${returnNumber}` },
          ]);
        } else {
          // Cash/Bank refund received from supplier
          const cashCode = data.refundMethod === 'CASH' ? '1000' : '1010';
          await postAccountTransaction(tx, [
            { code: cashCode, debit: total, description: `Purchase return ${returnNumber}` },
            { code: '1200', credit: total, description: `Purchase return ${returnNumber}` },
          ]);
          await recordCashFlow(tx, {
            type: 'IN', amount: total, method: data.refundMethod,
            description: `Purchase return ${returnNumber}`, reference: returnNumber,
          });
        }

        return purchaseReturn;
      },
      { timeout: 30000, maxWait: 10000 }
    );

    return ok(res, result, 'Purchase return created', 201);
  } catch (e) { next(e); }
});

export default router;