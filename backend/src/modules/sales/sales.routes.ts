import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { ok } from '../../utils/response';
import { AppError } from '../../utils/errors';
import { authenticate, requirePermission } from '../../middleware/auth';
import { nextInvoiceNumber } from '../../utils/numbering';
import { postAccountTransaction, recordCashFlow } from '../../utils/accounts';
import { applySaleToWac } from '../../utils/wac';
import { auditLog } from '../../utils/audit';

const router = Router();
router.use(authenticate);

const saleItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
});

const saleSchema = z.object({
  customerId: z.string().optional().nullable(),
  items: z.array(saleItemSchema).min(1),
  discount: z.number().nonnegative().default(0),
  otherCharges: z.number().nonnegative().default(0),
  payments: z.array(z.object({
    method: z.enum(['CASH', 'BANK', 'CARD', 'CREDIT']),
    amount: z.number().nonnegative(),
  })).min(1),
  notes: z.string().optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const { search, from, to, paymentMethod, status, page = '1', pageSize = '20' } = req.query as any;
    const take = Math.min(parseInt(pageSize), 100);
    const skip = (parseInt(page) - 1) * take;
    const where: any = {};
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (from || to) {
      where.saleDate = {};
      if (from) where.saleDate.gte = new Date(from);
      if (to) where.saleDate.lte = new Date(to);
    }
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: { customer: true, items: true, user: { select: { fullName: true } } },
        orderBy: { saleDate: 'desc' },
        take, skip,
      }),
      prisma.sale.count({ where }),
    ]);
    return ok(res, { items, total });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        items: { include: { product: true } },
        payments: true,
        salesReturns: { include: { items: true } },
        user: { select: { fullName: true } },
      },
    });
    if (!sale) throw new AppError('Sale not found', 404);
    return ok(res, sale);
  } catch (e) { next(e); }
});

router.post('/', requirePermission('SALES_CREATE'), async (req, res, next) => {
  try {
    const data = saleSchema.parse(req.body);

    const hasCredit = data.payments.some((p) => p.method === 'CREDIT');
    if (hasCredit && !data.customerId) {
      throw new AppError('Credit sale requires a customer', 422);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Load & validate products
      const products = await tx.product.findMany({
        where: { id: { in: data.items.map((i) => i.productId) } },
        include: { inventory: true },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));
      for (const item of data.items) {
        const p = productMap.get(item.productId);
        if (!p) throw new AppError(`Product not found: ${item.productId}`, 422);
        const available = p.inventory?.quantity ?? 0;
        if (available < item.quantity) {
          throw new AppError(`Insufficient stock for ${p.name}. Available: ${available}`, 422);
        }
        if (item.unitPrice < p.minSalePrice) {
          throw new AppError(`Price below minimum for ${p.name} (min ${p.minSalePrice})`, 422);
        }
      }

      const lineTotals = data.items.map((i) => i.quantity * i.unitPrice - i.discount);
      const subtotal = lineTotals.reduce((a, b) => a + b, 0);
      const total = subtotal - data.discount + data.otherCharges;
      const totalPaid = data.payments.filter((p) => p.method !== 'CREDIT').reduce((s, p) => s + p.amount, 0);
      const due = Math.max(total - totalPaid, 0);

      if (totalPaid > total + 0.01) throw new AppError('Paid amount exceeds total', 422);

      const invoiceNumber = await nextInvoiceNumber(tx);

      const methods = data.payments.filter((p) => p.method !== 'CREDIT').map((p) => p.method);
      const paymentMethod = methods.length === 0 ? 'CREDIT' : methods.length === 1 ? methods[0] : 'MIXED';

      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          customerId: data.customerId || null,
          userId: req.user!.id,
          subtotal, discount: data.discount, otherCharges: data.otherCharges,
          total, paid: totalPaid, due, paymentMethod,
          notes: data.notes, status: 'COMPLETED',
        },
      });

      let totalCogs = 0;

      for (const item of data.items) {
        const p = productMap.get(item.productId)!;
        const lineTotal = item.quantity * item.unitPrice - item.discount;

        const wacResult = await applySaleToWac(tx, item.productId, item.quantity);
        const wacAtSale = wacResult.wacAtSale;
        totalCogs += wacAtSale * item.quantity;

        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            lineTotal,
            costAtSale: wacAtSale,
            wacAtSale,
          },
        });

        const inv = await tx.inventory.update({
          where: { productId: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            userId: req.user!.id,
            type: 'SALE',
            quantity: -item.quantity,
            balance: inv.quantity,
            reference: invoiceNumber,
            unitCost: wacAtSale,
            totalCost: wacAtSale * item.quantity,
            runningWac: wacAtSale,
          },
        });
      }

      // Non-credit payments
      for (const p of data.payments) {
        if (p.method === 'CREDIT' || p.amount <= 0) continue;
        await tx.payment.create({ data: { saleId: sale.id, amount: p.amount, method: p.method } });
        const cashCode = p.method === 'CASH' ? '1000' : p.method === 'BANK' ? '1010' : '1020';
        await postAccountTransaction(tx, [
          { code: cashCode, debit: p.amount, description: `Sale ${invoiceNumber}` },
          { code: '4000', credit: p.amount, description: `Sale ${invoiceNumber}` },
        ]);
        await recordCashFlow(tx, {
          type: 'IN', amount: p.amount, method: p.method,
          description: `Sale ${invoiceNumber}`, reference: invoiceNumber,
        });
      }

      if (due > 0) {
        await postAccountTransaction(tx, [
          { code: '1100', debit: due, description: `Credit sale ${invoiceNumber}` },
          { code: '4000', credit: due, description: `Credit sale ${invoiceNumber}` },
        ]);
      }

      if (totalCogs > 0) {
        await postAccountTransaction(tx, [
          { code: '5000', debit: totalCogs, description: `COGS ${invoiceNumber}` },
          { code: '1200', credit: totalCogs, description: `COGS ${invoiceNumber}` },
        ]);
      }

      return sale;
    });

    await auditLog({
      userId: req.user!.id, action: 'CREATE', entity: 'Sale',
      entityId: result.id, changes: { invoiceNumber: result.invoiceNumber, total: result.total },
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    return ok(res, result, 'Sale completed', 201);
  } catch (e) { next(e); }
});

export default router;