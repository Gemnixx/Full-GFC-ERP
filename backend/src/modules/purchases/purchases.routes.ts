import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { ok } from '../../utils/response';
import { AppError } from '../../utils/errors';
import { authenticate, requirePermission } from '../../middleware/auth';
import { nextPurchaseNumber } from '../../utils/numbering';
import { postAccountTransaction, recordCashFlow } from '../../utils/accounts';
import { applyPurchaseToWac } from '../../utils/wac';
import { auditLog } from '../../utils/audit';

const router = Router();
router.use(authenticate);

const purchaseItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  purchasePrice: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
});

const purchaseSchema = z.object({
  supplierId: z.string(),
  supplierInvoiceNo: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1),
  discount: z.number().nonnegative().default(0),
  otherCharges: z.number().nonnegative().default(0),
  payments: z.array(z.object({
    method: z.enum(['CASH', 'BANK', 'CREDIT']),
    amount: z.number().nonnegative(),
  })).min(1),
  notes: z.string().optional(),
});

// ============================================================
// LIST PURCHASES
// ============================================================
router.get('/', async (req, res, next) => {
  try {
    const { search, from, to, paymentMethod, page = '1', pageSize = '20' } = req.query as any;
    const take = Math.min(parseInt(pageSize), 100);
    const skip = (parseInt(page) - 1) * take;
    const where: any = {};
    if (search) {
      where.OR = [
        { purchaseNumber: { contains: search, mode: 'insensitive' } },
        { supplier: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (from || to) {
      where.purchaseDate = {};
      if (from) where.purchaseDate.gte = new Date(from);
      if (to) where.purchaseDate.lte = new Date(to);
    }
    if (paymentMethod) where.paymentMethod = paymentMethod;

    const [items, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: { supplier: true, items: true, user: { select: { fullName: true } } },
        orderBy: { purchaseDate: 'desc' },
        take, skip,
      }),
      prisma.purchase.count({ where }),
    ]);
    return ok(res, { items, total });
  } catch (e) { next(e); }
});

// ============================================================
// PURCHASE DETAIL
// ============================================================
router.get('/:id', async (req, res, next) => {
  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: req.params.id },
      include: {
        supplier: true,
        items: { include: { product: true } },
        payments: true,
        purchaseReturns: { include: { items: true } },
        user: { select: { fullName: true } },
      },
    });
    if (!purchase) throw new AppError('Purchase not found', 404);
    return ok(res, purchase);
  } catch (e) { next(e); }
});

// ============================================================
// CREATE PURCHASE
// ============================================================
router.post('/', requirePermission('PURCHASES_CREATE'), async (req, res, next) => {
  try {
    const data = purchaseSchema.parse(req.body);

    const result = await prisma.$transaction(
      async (tx) => {
        const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId } });
        if (!supplier) throw new AppError('Supplier not found', 422);

        const lineTotals = data.items.map((i) => i.quantity * i.purchasePrice - i.discount);
        const subtotal = lineTotals.reduce((a, b) => a + b, 0);
        const total = subtotal - data.discount + data.otherCharges;
        const totalPaid = data.payments.filter((p) => p.method !== 'CREDIT').reduce((s, p) => s + p.amount, 0);
        const due = Math.max(total - totalPaid, 0);
        if (totalPaid > total + 0.01) throw new AppError('Paid exceeds total', 422);

        const methods = data.payments.filter((p) => p.method !== 'CREDIT').map((p) => p.method);
        const paymentMethod = methods.length === 0 ? 'CREDIT' : methods.length === 1 ? methods[0] : 'MIXED';

        const purchaseNumber = await nextPurchaseNumber(tx);

        const purchase = await tx.purchase.create({
          data: {
            purchaseNumber,
            supplierId: data.supplierId,
            userId: req.user!.id,
            supplierInvoiceNo: data.supplierInvoiceNo,
            subtotal, discount: data.discount, otherCharges: data.otherCharges,
            total, paid: totalPaid, due, paymentMethod,
            notes: data.notes, status: 'COMPLETED',
          },
        });

        for (const item of data.items) {
          const lineTotal = item.quantity * item.purchasePrice - item.discount;

          await tx.purchaseItem.create({
            data: {
              purchaseId: purchase.id,
              productId: item.productId,
              quantity: item.quantity,
              purchasePrice: item.purchasePrice,
              discount: item.discount,
              lineTotal,
            },
          });

          // Increase inventory
          await tx.inventory.upsert({
            where: { productId: item.productId },
            create: { productId: item.productId, quantity: item.quantity },
            update: { quantity: { increment: item.quantity } },
          });

          // Apply WAC
          const wacResult = await applyPurchaseToWac(tx, item.productId, item.quantity, item.purchasePrice);

          // Movement record
          const inv = await tx.inventory.findUnique({ where: { productId: item.productId } });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              userId: req.user!.id,
              type: 'PURCHASE',
              quantity: item.quantity,
              balance: inv?.quantity ?? item.quantity,
              reference: purchaseNumber,
              unitCost: item.purchasePrice,
              totalCost: item.purchasePrice * item.quantity,
              runningWac: wacResult.newWac,
            },
          });

          // Update latest purchase price on product
          await tx.product.update({
            where: { id: item.productId },
            data: { purchasePrice: item.purchasePrice },
          });
        }

        // Non-credit payments
        for (const p of data.payments) {
          if (p.method === 'CREDIT' || p.amount <= 0) continue;
          await tx.payment.create({ data: { purchaseId: purchase.id, amount: p.amount, method: p.method } });
          const cashCode = p.method === 'CASH' ? '1000' : '1010';
          await postAccountTransaction(tx, [
            { code: '1200', debit: p.amount, description: `Purchase ${purchaseNumber}` },
            { code: cashCode, credit: p.amount, description: `Purchase ${purchaseNumber}` },
          ]);
          await recordCashFlow(tx, {
            type: 'OUT', amount: p.amount, method: p.method,
            description: `Purchase ${purchaseNumber}`, reference: purchaseNumber,
          });
        }

        // Credit portion (AP)
        if (due > 0) {
          await postAccountTransaction(tx, [
            { code: '1200', debit: due, description: `Credit purchase ${purchaseNumber}` },
            { code: '2000', credit: due, description: `Credit purchase ${purchaseNumber}` },
          ]);
        }

        return purchase;
      },
      { timeout: 30000, maxWait: 10000 }
    );

    await auditLog({
      userId: req.user!.id, action: 'CREATE', entity: 'Purchase',
      entityId: result.id, changes: { purchaseNumber: result.purchaseNumber, total: result.total },
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    return ok(res, result, 'Purchase recorded', 201);
  } catch (e) { next(e); }
});

export default router;