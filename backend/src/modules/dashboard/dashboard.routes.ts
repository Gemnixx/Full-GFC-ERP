import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { ok } from '../../utils/response';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const endOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return startOfDay(d); };

router.get('/', async (_req, res, next) => {
  try {
    const todayStart = startOfDay();
    const todayEnd = endOfDay();
    const last7 = daysAgo(6);
    const last30 = daysAgo(29);

    const [
      todaySalesAgg, todayPurchasesAgg, todayExpensesAgg,
      sales7, sales30, cashIn, cashOut,
      receivablesAgg, payablesAgg, lowStock,
      recentSales, recentPurchases, recentExpenses, recentPayments, recentReturns,
    ] = await Promise.all([
      prisma.sale.aggregate({ _sum: { total: true, paid: true, due: true }, where: { saleDate: { gte: todayStart, lte: todayEnd } } }),
      prisma.purchase.aggregate({ _sum: { total: true }, where: { purchaseDate: { gte: todayStart, lte: todayEnd } } }),
      prisma.expense.aggregate({ _sum: { amount: true }, where: { expenseDate: { gte: todayStart, lte: todayEnd } } }),
      prisma.sale.aggregate({ _sum: { total: true }, where: { saleDate: { gte: last7 } } }),
      prisma.sale.aggregate({ _sum: { total: true }, where: { saleDate: { gte: last30 } } }),
      prisma.cashFlowTransaction.aggregate({ _sum: { amount: true }, where: { type: 'IN' } }),
      prisma.cashFlowTransaction.aggregate({ _sum: { amount: true }, where: { type: 'OUT' } }),
      prisma.sale.aggregate({ _sum: { due: true } }),
      prisma.purchase.aggregate({ _sum: { due: true } }),
      prisma.$queryRaw<any[]>`
        SELECT p.id, p.name, p.model, i.quantity, p."minStockLevel"
        FROM "Product" p
        JOIN "Inventory" i ON i."productId" = p.id
        WHERE i.quantity <= p."minStockLevel" AND p.active = true
        ORDER BY i.quantity ASC
        LIMIT 20
      `,
      prisma.sale.findMany({ take: 10, orderBy: { saleDate: 'desc' }, include: { customer: true } }),
      prisma.purchase.findMany({ take: 10, orderBy: { purchaseDate: 'desc' }, include: { supplier: true } }),
      prisma.expense.findMany({ take: 10, orderBy: { expenseDate: 'desc' }, include: { category: true } }),
      prisma.payment.findMany({ take: 10, orderBy: { createdAt: 'desc' } }),
      prisma.salesReturn.findMany({ take: 10, orderBy: { returnDate: 'desc' } }),
    ]);

    // Today's profit
    const todaySaleItems = await prisma.saleItem.findMany({
      where: { sale: { saleDate: { gte: todayStart, lte: todayEnd } } },
      select: { quantity: true, unitPrice: true, discount: true, costAtSale: true },
    });
    const todayRevenue = todaySaleItems.reduce((s, i) => s + (i.quantity * i.unitPrice - i.discount), 0);
    const todayCogs = todaySaleItems.reduce((s, i) => s + i.quantity * i.costAtSale, 0);
    const todayExpenses = todayExpensesAgg._sum.amount || 0;
    const todayGrossProfit = todayRevenue - todayCogs;
    const todayNetProfit = todayGrossProfit - todayExpenses;

    const cashInTotal = cashIn._sum.amount || 0;
    const cashOutTotal = cashOut._sum.amount || 0;

    const recentTransactions = [
      ...recentSales.map((s) => ({ type: 'SALE', reference: s.invoiceNumber, party: s.customer?.name || 'Walk-in', amount: s.total, date: s.saleDate, status: s.status })),
      ...recentPurchases.map((p) => ({ type: 'PURCHASE', reference: p.purchaseNumber, party: p.supplier.name, amount: p.total, date: p.purchaseDate, status: p.status })),
      ...recentExpenses.map((e) => ({ type: 'EXPENSE', reference: e.id.slice(0, 8), party: e.category.name, amount: e.amount, date: e.expenseDate, status: 'COMPLETED' })),
      ...recentPayments.map((p) => ({ type: 'PAYMENT', reference: p.reference || p.id.slice(0, 8), party: p.saleId ? 'Sale Payment' : 'Purchase Payment', amount: p.amount, date: p.createdAt, status: 'COMPLETED' })),
      ...recentReturns.map((r) => ({ type: 'SALES_RETURN', reference: r.returnNumber, party: 'Return', amount: r.total, date: r.returnDate, status: r.status })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 15);

    return ok(res, {
      todaySales: todaySalesAgg._sum.total || 0,
      todayPurchases: todayPurchasesAgg._sum.total || 0,
      todayExpenses,
      todayGrossProfit,
      todayProfit: todayNetProfit,
      cashInHand: cashInTotal - cashOutTotal,
      receivables: receivablesAgg._sum.due || 0,
      payables: payablesAgg._sum.due || 0,
      lowStockCount: lowStock.length,
      lowStock,
      salesOverview: {
        today: todaySalesAgg._sum.total || 0,
        last7Days: sales7._sum.total || 0,
        last30Days: sales30._sum.total || 0,
      },
      recentTransactions,
    });
  } catch (e) { next(e); }
});

export default router;