import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { ok } from '../../utils/response';
import { AppError } from '../../utils/errors';
import { authenticate, requirePermission } from '../../middleware/auth';
import { postAccountTransaction, recordCashFlow } from '../../utils/accounts';
import { validateCustomerPayment } from '../../utils/validations';

const router = Router();
router.use(authenticate);

const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  openingBalance: z.number().default(0),
  creditLimit: z.number().default(0),
  notes: z.string().optional().nullable(),
  active: z.boolean().default(true),
});

// ============================================================
// LIST CUSTOMERS
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
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: { sales: true, openingEntries: true },
        orderBy: { createdAt: 'desc' },
        take, skip,
      }),
      prisma.customer.count({ where }),
    ]);

    const items = customers.map((c) => {
      // Sales calculation
      const totalSales = c.sales.reduce((s, x) => s + x.total, 0);
      const salesDue = c.sales.reduce((s, x) => s + x.due, 0);
      const salesReceived = totalSales - salesDue;

      // Opening balance calculation
      const openingTotal = c.openingEntries.reduce((s, x) => s + x.amount, 0);
      const openingPaid = c.openingEntries.reduce((s, x) => s + x.paid, 0);
      const openingDue = openingTotal - openingPaid;

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        active: c.active,
        totalSales,
        received: salesReceived + openingPaid,
        salesDue,
        openingDue,
        openingBalance: openingTotal,
        balance: salesDue + openingDue,
      };
    });

    const totalReceivable = items.reduce((s, i) => s + Math.max(i.balance, 0), 0);
    const activeCount = await prisma.customer.count({ where: { active: true } });

    return ok(res, {
      items, total,
      summary: { totalCustomers: total, activeCustomers: activeCount, totalReceivable },
    });
  } catch (e) { next(e); }
});

// ============================================================
// CUSTOMER DETAIL
// ============================================================
router.get('/:id', async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        sales: { orderBy: { saleDate: 'desc' }, take: 100, include: { items: true } },
        payments: { orderBy: { paymentDate: 'desc' }, take: 100 },
        openingEntries: true,
      },
    });
    if (!customer) throw new AppError('Customer not found', 404);

    // Sales
    const totalSales = customer.sales.reduce((s, x) => s + x.total, 0);
    const salesDue = customer.sales.reduce((s, x) => s + x.due, 0);
    const salesReceived = totalSales - salesDue;

    // Opening
    const openingTotal = customer.openingEntries.reduce((s, x) => s + x.amount, 0);
    const openingPaid = customer.openingEntries.reduce((s, x) => s + x.paid, 0);
    const openingDue = openingTotal - openingPaid;

    const outstanding = salesDue + openingDue;

    // Statement: opening entries first, then sales
    const statement: any[] = [
      ...customer.openingEntries.map((o) => ({
        date: o.entryDate,
        description: o.description || 'Opening Balance',
        reference: null,
        debit: o.amount,
        credit: o.paid,
        type: 'OPENING',
      })),
      ...customer.sales.map((s) => ({
        date: s.saleDate,
        description: `Sale ${s.invoiceNumber}`,
        reference: s.invoiceNumber,
        debit: s.total,
        credit: s.total - s.due,
        type: 'SALE',
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let balance = 0;
    const statementWithBalance = statement.map((s) => {
      balance += s.debit - s.credit;
      return { ...s, balance };
    });

    return ok(res, {
      ...customer,
      summary: {
        totalSales,
        salesReceived,
        openingBalance: openingTotal,
        openingPaid,
        received: salesReceived + openingPaid,
        outstanding,
      },
      statement: statementWithBalance,
    });
  } catch (e) { next(e); }
});

// ============================================================
// CREATE (with opening balance → OpeningBalanceEntry)
// ============================================================
router.post('/', requirePermission('CUSTOMERS_CREATE'), async (req, res, next) => {
  try {
    const data = customerSchema.parse(req.body);

    const customer = await prisma.$transaction(async (tx) => {
      // 1. Create customer with openingBalance = 0
      const created = await tx.customer.create({
        data: { ...data, openingBalance: 0 },
      });

      // 2. If openingBalance > 0, create OpeningBalanceEntry + accounting entry
      if (data.openingBalance && data.openingBalance > 0) {
        await tx.openingBalanceEntry.create({
          data: {
            customerId: created.id,
            amount: data.openingBalance,
            paid: 0,
            description: 'Opening balance from previous system',
          },
        });

        await postAccountTransaction(tx, [
          { code: '1100', debit: data.openingBalance, description: `Opening balance - ${created.name}` },
          { code: '3900', credit: data.openingBalance, description: `Opening balance - ${created.name}` },
        ]);
      }

      return created;
    });

    return ok(res, customer, 'Customer created', 201);
  } catch (e) { next(e); }
});

// ============================================================
// UPDATE (prevent changing openingBalance directly)
// ============================================================
router.put('/:id', requirePermission('CUSTOMERS_UPDATE'), async (req, res, next) => {
  try {
    const data = customerSchema.partial().parse(req.body);
    const updateData: any = { ...data };
    delete updateData.openingBalance;   // ← Prevent direct change

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: updateData,
    });
    return ok(res, customer, 'Customer updated');
  } catch (e) { next(e); }
});

// ============================================================
// RECEIVE PAYMENT — Apply to Opening Balance first, then FIFO Sales
// ============================================================
const paymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['CASH', 'BANK', 'CARD']),
  reference: z.string().optional(),
  note: z.string().optional(),
});

router.post('/:id/payments', requirePermission('CUSTOMERS_PAYMENT'), async (req, res, next) => {
  try {
    const data = paymentSchema.parse(req.body);
    const customerId = req.params.id;

    const result = await prisma.$transaction(
      async (tx) => {
        await validateCustomerPayment(tx, customerId, data.amount);

        const customer = await tx.customer.findUnique({ where: { id: customerId } });
        if (!customer) throw new Error('Customer not found');

        // 1. Create CustomerPayment record (for audit trail)
        const payment = await tx.customerPayment.create({
          data: {
            customerId,
            userId: req.user!.id,
            amount: data.amount,
            method: data.method,
            reference: data.reference,
            note: data.note,
          },
        });

        let remaining = data.amount;

        // 2. Apply to Opening Balance entries first (oldest first)
        const openingEntries = await tx.openingBalanceEntry.findMany({
          where: { customerId },
          orderBy: { entryDate: 'asc' },
        });

        for (const entry of openingEntries) {
          if (remaining <= 0) break;
          const entryDue = entry.amount - entry.paid;
          if (entryDue <= 0) continue;

          const applyAmount = Math.min(remaining, entryDue);
          await tx.openingBalanceEntry.update({
            where: { id: entry.id },
            data: { paid: { increment: applyAmount } },
          });
          remaining -= applyAmount;
        }

        // 3. Apply remaining to unpaid sales (FIFO)
        if (remaining > 0) {
          const unpaidSales = await tx.sale.findMany({
            where: { customerId, due: { gt: 0 } },
            orderBy: { saleDate: 'asc' },
          });

          for (const sale of unpaidSales) {
            if (remaining <= 0) break;
            const applyAmount = Math.min(remaining, sale.due);

            await tx.sale.update({
              where: { id: sale.id },
              data: {
                paid: { increment: applyAmount },
                due: { decrement: applyAmount },
              },
            });

            remaining -= applyAmount;
          }
        }

        // 4. Accounting entries
        const cashCode = data.method === 'CASH' ? '1000' : data.method === 'BANK' ? '1010' : '1020';
        await postAccountTransaction(tx, [
          { code: cashCode, debit: data.amount, description: `Customer payment - ${customer.name}` },
          { code: '1100', credit: data.amount, description: `Customer payment - ${customer.name}` },
        ]);
        await recordCashFlow(tx, {
          type: 'IN', amount: data.amount, method: data.method,
          description: `Customer payment - ${customer.name}`,
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