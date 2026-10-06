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

// ====== Schemas ======
const saleItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),          // rupees (backend calc karega)
  discountPercent: z.number().min(0).max(100).default(0), // 👈 per-item %
});

const saleSchema = z.object({
  customerId: z.string().optional().nullable(),
  items: z.array(saleItemSchema).min(1),
  discount: z.number().nonnegative().default(0),           // summary discount in Rs (optional)
  discountPercent: z.number().min(0).max(100).default(0),  // 👈 summary %
  otherCharges: z.number().nonnegative().default(0),
  payments: z.array(z.object({
    method: z.enum(['CASH', 'BANK', 'CARD', 'CREDIT']),
    amount: z.number().nonnegative(),
  })).min(1),
  notes: z.string().optional(),
});

// ====== GET list ======
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

// ====== GET single ======
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

// ====== CREATE ======
router.post('/', requirePermission('SALES_CREATE'), async (req, res, next) => {
  try {
    const data = saleSchema.parse(req.body);

    const hasCredit = data.payments.some((p) => p.method === 'CREDIT');
    if (hasCredit && !data.customerId) {
      throw new AppError('Credit sale requires a customer', 422);
    }

    const result = await prisma.$transaction(async (tx) => {
      // ---- Load products ----
      const products = await tx.product.findMany({
        where: { id: { in: data.items.map((i) => i.productId) } },
        include: { inventory: true },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      // ---- Validate + compute per-item discounts ----
      type LineCalc = {
        productId: string;
        quantity: number;
        unitPrice: number;
        discountPercent: number;
        discount: number;      // rupees
        lineGross: number;
        lineTotal: number;
      };

      const lines: LineCalc[] = [];

      for (const item of data.items) {
        const p = productMap.get(item.productId);
        if (!p) throw new AppError(`Product not found: ${item.productId}`, 422);

        const available = p.inventory?.quantity ?? 0;
        if (available < item.quantity) {
          throw new AppError(`Insufficient stock for ${p.name}. Available: ${available}`, 422);
        }

        const lineGross = item.quantity * item.unitPrice;

        // Dono source se discount nikaalo: percent se rupees, ya rupees se percent
        let discountPercent = item.discountPercent || 0;
        let discountRs = item.discount || 0;

        if (discountPercent > 0) {
          discountRs = (lineGross * discountPercent) / 100;
        } else if (discountRs > 0) {
          discountPercent = lineGross > 0 ? (discountRs / lineGross) * 100 : 0;
        }

        const lineTotal = lineGross - discountRs;

        // ---- Min sale price check ----
        const netUnitPrice = lineTotal / item.quantity;
        if (netUnitPrice < p.minSalePrice - 0.001) {
          throw new AppError(
            `Discount too high for ${p.name}. Min unit price: ${p.minSalePrice}, after discount: ${netUnitPrice.toFixed(2)}`,
            422
          );
        }

        lines.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: +discountPercent.toFixed(4),
          discount: +discountRs.toFixed(2),
          lineGross,
          lineTotal: +lineTotal.toFixed(2),
        });
      }

      // ---- Totals ----
      const subtotalGross = lines.reduce((s, l) => s + l.lineGross, 0);       // before any discount
      const itemDiscountSum = lines.reduce((s, l) => s + l.discount, 0);      // sum of item discounts
      const subtotalAfterItem = subtotalGross - itemDiscountSum;              // after item discounts

      // Summary-level discount
      const summaryPercent = data.discountPercent || 0;
      let summaryDiscountRs = data.discount || 0;
      if (summaryPercent > 0) {
        summaryDiscountRs = (subtotalAfterItem * summaryPercent) / 100;
      }

      const totalDiscount = itemDiscountSum + summaryDiscountRs;
      const total = Math.max(subtotalAfterItem - summaryDiscountRs + data.otherCharges, 0);

      const totalPaid = data.payments
        .filter((p) => p.method !== 'CREDIT')
        .reduce((s, p) => s + p.amount, 0);
      const due = Math.max(total - totalPaid, 0);

      if (totalPaid > total + 0.01) throw new AppError('Paid amount exceeds total', 422);

      const invoiceNumber = await nextInvoiceNumber(tx);

      const methods = data.payments.filter((p) => p.method !== 'CREDIT').map((p) => p.method);
      const paymentMethod = methods.length === 0 ? 'CREDIT' : methods.length === 1 ? methods[0] : 'MIXED';

      // ---- Create Sale ----
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          customerId: data.customerId || null,
          userId: req.user!.id,
          subtotal: +subtotalGross.toFixed(2),                   // gross
          itemDiscount: +itemDiscountSum.toFixed(2),
          summaryDiscountPercent: +summaryPercent.toFixed(4),
          summaryDiscount: +summaryDiscountRs.toFixed(2),
          discount: +totalDiscount.toFixed(2),                   // item + summary
          otherCharges: data.otherCharges,
          total: +total.toFixed(2),
          paid: +totalPaid.toFixed(2),
          due: +due.toFixed(2),
          paymentMethod,
          notes: data.notes,
          status: 'COMPLETED',
        },
      });

      let totalCogs = 0;

      // ---- Create SaleItems + stock movement + WAC ----
      for (const line of lines) {
        const wacResult = await applySaleToWac(tx, line.productId, line.quantity);
        const wacAtSale = wacResult.wacAtSale;
        totalCogs += wacAtSale * line.quantity;

        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discount: line.discount,
            discountPercent: line.discountPercent,
            lineTotal: line.lineTotal,
            costAtSale: wacAtSale,
            wacAtSale,
          },
        });

        const inv = await tx.inventory.update({
          where: { productId: line.productId },
          data: { quantity: { decrement: line.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            userId: req.user!.id,
            type: 'SALE',
            quantity: -line.quantity,
            balance: inv.quantity,
            reference: invoiceNumber,
            unitCost: wacAtSale,
            totalCost: wacAtSale * line.quantity,
            runningWac: wacAtSale,
          },
        });
      }

      // ---- Payments ----
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

    // Fresh sale with items return karo
    const fullSale = await prisma.sale.findUnique({
      where: { id: result.id },
      include: {
        customer: true,
        items: { include: { product: true } },
        payments: true,
        user: { select: { fullName: true } },
      },
    });

    return ok(res, fullSale, 'Sale completed', 201);
  } catch (e) { next(e); }
});

export default router;