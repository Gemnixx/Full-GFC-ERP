import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { ok } from '../../utils/response';
import { AppError } from '../../utils/errors';
import { authenticate, requirePermission } from '../../middleware/auth';
import { postAccountTransaction, recordCashFlow } from '../../utils/accounts';
import { validateSupplierPayment } from '../../utils/validations';

const router = Router();
router.use(authenticate);

const supplierSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  taxNumber: z.string().optional().nullable(),
  openingBalance: z.number().default(0),
  creditTerms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  active: z.boolean().default(true),
});

// ============================================================
// LIST SUPPLIERS
// ✅ FIX: Payable calculation ab sirf purchase.due use karta hai
// (double counting khatam — SupplierPayment ko ignore karo)
// ============================================================
router.get('/', async (req, res, next) => {
  try {
    const { search, page = '1', pageSize = '20' } = req.query as any;
    const take = Math.min(parseInt(pageSize), 100);
    const skip = (parseInt(page) - 1) * take;
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        include: {
          purchases: true,
          purchaseReturns: true,
          // ❌ payments include nahi karenge — double counting avoid karne ke liye
        },
        orderBy: { createdAt: 'desc' },
        take, skip,
      }),
      prisma.supplier.count({ where }),
    ]);

    const items = suppliers.map((s) => {
      const purchases = s.purchases.reduce((sum, p) => sum + p.total, 0);
      const purchaseDue = s.purchases.reduce((sum, p) => sum + p.due, 0);
      const purchasePaid = purchases - purchaseDue;   // Actual paid = total - due
      const purchaseReturns = s.purchaseReturns.reduce((sum, r) => sum + r.total, 0);

      // ✅ Payable = Opening + Sales Due - Returns
      const payable = s.openingBalance + purchaseDue - purchaseReturns;

      return {
        id: s.id,
        name: s.name,
        company: s.company,
        phone: s.phone,
        active: s.active,
        purchases,
        returns: purchaseReturns,
        paid: purchasePaid,       // ← Sirf purchase.paid (from sales logic)
        payable,
      };
    });

    const activeCount = await prisma.supplier.count({ where: { active: true } });
    const totalPayable = items.reduce((s, i) => s + Math.max(i.payable, 0), 0);

    return ok(res, {
      items, total,
      summary: { totalSuppliers: total, activeSuppliers: activeCount, totalPayable },
    });
  } catch (e) { next(e); }
});

// ============================================================
// SUPPLIER DETAIL
// ✅ FIX: Same calculation, statement mein payments/returns/opening sab include
// ============================================================
router.get('/:id', async (req, res, next) => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: req.params.id },
      include: {
        purchases: { orderBy: { purchaseDate: 'desc' }, take: 100, include: { items: true } },
        payments: { orderBy: { paymentDate: 'desc' }, take: 100 },
        purchaseReturns: { orderBy: { returnDate: 'desc' }, take: 100 },
      },
    });
    if (!supplier) throw new AppError('Supplier not found', 404);

    const purchases = supplier.purchases.reduce((s, x) => s + x.total, 0);
    const purchaseDue = supplier.purchases.reduce((s, x) => s + x.due, 0);
    const purchasePaid = purchases - purchaseDue;
    const purchaseReturns = supplier.purchaseReturns.reduce((s, x) => s + x.total, 0);

    // ✅ Outstanding = Opening + Purchase Due - Returns
    const outstanding = supplier.openingBalance + purchaseDue - purchaseReturns;

    // Statement: purchases (debit), returns + payments (credit)
    const statement: any[] = [
      ...supplier.purchases.map((p) => ({
        date: p.purchaseDate,
        description: `Purchase ${p.purchaseNumber}`,
        reference: p.purchaseNumber,
        debit: p.total,
        credit: p.paid,
        type: 'PURCHASE',
      })),
      ...supplier.purchaseReturns.map((r) => ({
        date: r.returnDate,
        description: `Return ${r.returnNumber}`,
        reference: r.returnNumber,
        debit: 0,
        credit: r.total,
        type: 'RETURN',
      })),
      ...supplier.payments.map((p) => ({
        date: p.paymentDate,
        description: `Payment ${p.method}`,
        reference: p.reference,
        debit: 0,
        credit: p.amount,
        type: 'PAYMENT',
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let balance = supplier.openingBalance;
    const statementWithBalance = statement.map((s) => {
      balance += s.debit - s.credit;
      return { ...s, balance };
    });

    return ok(res, {
      ...supplier,
      summary: {
        totalPurchases: purchases,
        totalReturns: purchaseReturns,
        totalPaid: purchasePaid,
        outstanding,
      },
      statement: statementWithBalance,
    });
  } catch (e) { next(e); }
});

// ============================================================
// CREATE
// ============================================================
router.post('/', requirePermission('SUPPLIERS_CREATE'), async (req, res, next) => {
  try {
    const data = supplierSchema.parse(req.body);
    const supplier = await prisma.supplier.create({ data });
    return ok(res, supplier, 'Supplier created', 201);
  } catch (e) { next(e); }
});

// ============================================================
// UPDATE
// ============================================================
router.put('/:id', requirePermission('SUPPLIERS_UPDATE'), async (req, res, next) => {
  try {
    const data = supplierSchema.partial().parse(req.body);
    const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data });
    return ok(res, supplier, 'Supplier updated');
  } catch (e) { next(e); }
});

// ============================================================
// PAYMENT
// ✅ FIFO apply karta hai — purchase.due kam hota hai
// ✅ Accounting + cashflow safe
// ============================================================
const paymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['CASH', 'BANK', 'CARD']),
  reference: z.string().optional(),
  note: z.string().optional(),
});

router.post('/:id/payments', requirePermission('SUPPLIERS_PAYMENT'), async (req, res, next) => {
  try {
    const data = paymentSchema.parse(req.body);
    const supplierId = req.params.id;

    const result = await prisma.$transaction(
      async (tx) => {
        await validateSupplierPayment(tx, supplierId, data.amount);

        const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
        if (!supplier) throw new Error('Supplier not found');

        // 1. Create SupplierPayment record (audit trail)
        const payment = await tx.supplierPayment.create({
          data: {
            supplierId,
            userId: req.user!.id,
            amount: data.amount,
            method: data.method,
            reference: data.reference,
            note: data.note,
          },
        });

        // 2. FIFO: Apply payment to oldest unpaid purchases first
        let remaining = data.amount;
        const unpaidPurchases = await tx.purchase.findMany({
          where: { supplierId, due: { gt: 0 } },
          orderBy: { purchaseDate: 'asc' },
        });

        for (const purchase of unpaidPurchases) {
          if (remaining <= 0) break;
          const applyAmount = Math.min(remaining, purchase.due);

          await tx.purchase.update({
            where: { id: purchase.id },
            data: {
              paid: { increment: applyAmount },
              due: { decrement: applyAmount },
            },
          });

          remaining -= applyAmount;
        }

        // 3. Accounting entries
        const cashCode = data.method === 'CASH' ? '1000' : data.method === 'BANK' ? '1010' : '1020';
        await postAccountTransaction(tx, [
          { code: '2000', debit: data.amount, description: `Supplier payment - ${supplier.name}` },
          { code: cashCode, credit: data.amount, description: `Supplier payment - ${supplier.name}` },
        ]);
        await recordCashFlow(tx, {
          type: 'OUT', amount: data.amount, method: data.method,
          description: `Supplier payment - ${supplier.name}`,
          reference: payment.id,
        });

        return payment;
      },
      { timeout: 30000, maxWait: 10000 }
    );

    return ok(res, result, 'Payment recorded', 201);
  } catch (e) { next(e); }
});

export default router;