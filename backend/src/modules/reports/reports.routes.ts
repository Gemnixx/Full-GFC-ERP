import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { ok } from '../../utils/response';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

const range = (from?: string, to?: string) => {
  const r: any = {};
  if (from) r.gte = new Date(from);
  if (to) r.lte = new Date(to);
  return r;
};

router.get('/trend', async (req, res, next) => {
  try {
    const days = Math.min(parseInt((req.query.days as string) || '30', 10), 365);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const sales = await prisma.sale.findMany({
      where: { saleDate: { gte: start } },
      select: { saleDate: true, total: true, items: { select: { quantity: true, lineTotal: true, costAtSale: true } } },
    });
    const purchases = await prisma.purchase.findMany({
      where: { purchaseDate: { gte: start } },
      select: { purchaseDate: true, total: true },
    });

    const bucket = new Map<string, { sales: number; purchases: number; profit: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      bucket.set(d.toISOString().slice(0, 10), { sales: 0, purchases: 0, profit: 0 });
    }

    for (const s of sales) {
      const key = new Date(s.saleDate).toISOString().slice(0, 10);
      const b = bucket.get(key);
      if (!b) continue;
      b.sales += s.total;
      const revenue = s.items.reduce((a, i) => a + i.lineTotal, 0);
      const cogs = s.items.reduce((a, i) => a + i.quantity * i.costAtSale, 0);
      b.profit += revenue - cogs;
    }
    for (const p of purchases) {
      const key = new Date(p.purchaseDate).toISOString().slice(0, 10);
      const b = bucket.get(key);
      if (b) b.purchases += p.total;
    }

    const data = Array.from(bucket.entries()).map(([date, v]) => ({
      date,
      label: new Date(date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' }),
      sales: Math.round(v.sales),
      purchases: Math.round(v.purchases),
      profit: Math.round(v.profit),
    }));

    return ok(res, data);
  } catch (e) { next(e); }
});

router.get('/sales', async (req, res, next) => {
  try {
    const { from, to } = req.query as any;
    const sales = await prisma.sale.findMany({
      where: { saleDate: range(from, to) },
      include: { customer: true, items: true },
      orderBy: { saleDate: 'desc' },
    });
    return ok(res, sales);
  } catch (e) { next(e); }
});

router.get('/purchases', async (req, res, next) => {
  try {
    const { from, to } = req.query as any;
    const purchases = await prisma.purchase.findMany({
      where: { purchaseDate: range(from, to) },
      include: { supplier: true, items: true },
      orderBy: { purchaseDate: 'desc' },
    });
    return ok(res, purchases);
  } catch (e) { next(e); }
});

router.get('/sales-by-product', async (req, res, next) => {
  try {
    const { from, to } = req.query as any;
    const result = await prisma.saleItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, lineTotal: true },
      where: { sale: { saleDate: range(from, to) } },
    });
    const products = await prisma.product.findMany({ where: { id: { in: result.map((r) => r.productId) } } });
    const items = result.map((r) => ({
      productId: r.productId,
      product: products.find((p) => p.id === r.productId)?.name || 'Unknown',
      quantity: r._sum.quantity || 0,
      revenue: r._sum.lineTotal || 0,
    }));
    return ok(res, items);
  } catch (e) { next(e); }
});

router.get('/sales-by-customer', async (req, res, next) => {
  try {
    const { from, to } = req.query as any;
    const result = await prisma.sale.groupBy({
      by: ['customerId'],
      _sum: { total: true },
      _count: { _all: true },
      where: { saleDate: range(from, to) },
    });
    const customers = await prisma.customer.findMany({
      where: { id: { in: result.map((r) => r.customerId).filter(Boolean) as string[] } },
    });
    const items = result.map((r) => ({
      customerId: r.customerId,
      customer: customers.find((c) => c.id === r.customerId)?.name || 'Walk-in',
      sales: r._sum.total || 0,
      count: r._count._all,
    }));
    return ok(res, items);
  } catch (e) { next(e); }
});

router.get('/sales-by-payment', async (req, res, next) => {
  try {
    const { from, to } = req.query as any;
    const result = await prisma.sale.groupBy({
      by: ['paymentMethod'],
      _sum: { total: true },
      _count: { _all: true },
      where: { saleDate: range(from, to) },
    });
    return ok(res, result.map((r) => ({
      method: r.paymentMethod, total: r._sum.total || 0, count: r._count._all,
    })));
  } catch (e) { next(e); }
});

router.get('/purchases-by-supplier', async (req, res, next) => {
  try {
    const { from, to } = req.query as any;
    const result = await prisma.purchase.groupBy({
      by: ['supplierId'],
      _sum: { total: true },
      _count: { _all: true },
      where: { purchaseDate: range(from, to) },
    });
    const suppliers = await prisma.supplier.findMany({ where: { id: { in: result.map((r) => r.supplierId) } } });
    return ok(res, result.map((r) => ({
      supplier: suppliers.find((s) => s.id === r.supplierId)?.name || 'Unknown',
      total: r._sum.total || 0, count: r._count._all,
    })));
  } catch (e) { next(e); }
});

router.get('/purchases-by-product', async (req, res, next) => {
  try {
    const { from, to } = req.query as any;
    const result = await prisma.purchaseItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, lineTotal: true },
      where: { purchase: { purchaseDate: range(from, to) } },
    });
    const products = await prisma.product.findMany({ where: { id: { in: result.map((r) => r.productId) } } });
    return ok(res, result.map((r) => ({
      product: products.find((p) => p.id === r.productId)?.name || 'Unknown',
      quantity: r._sum.quantity || 0, cost: r._sum.lineTotal || 0,
    })));
  } catch (e) { next(e); }
});

router.get('/stock', async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      include: { inventory: true, brand: true, category: true },
    });
    return ok(res, products.map((p) => ({
      id: p.id,
      product: p.name, model: p.model,
      brand: p.brand?.name, category: p.category?.name,
      stock: p.inventory?.quantity || 0,
      purchasePrice: p.purchasePrice,
      wac: p.weightedAvgCost,
      salePrice: p.salePrice,
      value: (p.inventory?.quantity || 0) * (p.weightedAvgCost || p.purchasePrice),
    })));
  } catch (e) { next(e); }
});

router.get('/stock-valuation', async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      include: { inventory: true, brand: true },
    });
    const items = products.map((p) => ({
      product: p.name, model: p.model, brand: p.brand?.name,
      quantity: p.inventory?.quantity || 0,
      wac: p.weightedAvgCost || p.purchasePrice,
      value: (p.inventory?.quantity || 0) * (p.weightedAvgCost || p.purchasePrice),
    }));
    const totalValue = items.reduce((s, i) => s + i.value, 0);
    return ok(res, { items, totalValue });
  } catch (e) { next(e); }
});

router.get('/profit-loss', async (req, res, next) => {
  try {
    const { from, to } = req.query as any;
    const dateRange = range(from, to);

    const saleItems = await prisma.saleItem.findMany({ where: { sale: { saleDate: dateRange } } });
    const totalRevenue = saleItems.reduce((s, i) => s + i.lineTotal, 0);
    const totalCogs = saleItems.reduce((s, i) => s + i.quantity * i.costAtSale, 0);

    const salesReturns = await prisma.salesReturn.aggregate({ _sum: { total: true }, where: { returnDate: dateRange } });
    const purchaseReturns = await prisma.purchaseReturn.aggregate({ _sum: { total: true }, where: { returnDate: dateRange } });

    const expenses = await prisma.expense.groupBy({
      by: ['categoryId'],
      _sum: { amount: true },
      where: { expenseDate: dateRange },
    });
    const categories = await prisma.expenseCategory.findMany();
    const expenseBreakdown = expenses.map((e) => ({
      category: categories.find((c) => c.id === e.categoryId)?.name || 'Other',
      amount: e._sum.amount || 0,
    }));
    const totalExpenses = expenseBreakdown.reduce((s, e) => s + e.amount, 0);

    const returnsAmount = salesReturns._sum.total || 0;
    const purchaseReturnsAmount = purchaseReturns._sum.total || 0;
    const netRevenue = totalRevenue - returnsAmount;
    const netCogs = totalCogs - purchaseReturnsAmount;
    const grossProfit = netRevenue - netCogs;
    const netProfit = grossProfit - totalExpenses;

    return ok(res, {
      revenue: { salesRevenue: totalRevenue, lessSalesReturns: returnsAmount, netRevenue },
      cost: { costOfGoodsSold: totalCogs, lessPurchaseReturns: purchaseReturnsAmount, netCogs },
      grossProfit,
      operatingExpenses: expenseBreakdown,
      totalOperatingExpenses: totalExpenses,
      netProfit,
    });
  } catch (e) { next(e); }
});

router.get('/receivables', async (_req, res, next) => {
  try {
    const sales = await prisma.sale.findMany({
      where: { due: { gt: 0 } },
      include: { customer: true },
      orderBy: { saleDate: 'desc' },
    });
    return ok(res, sales.map((s) => ({
      invoice: s.invoiceNumber,
      customer: s.customer?.name || 'Walk-in',
      phone: s.customer?.phone,
      date: s.saleDate, total: s.total, paid: s.paid, due: s.due,
    })));
  } catch (e) { next(e); }
});

router.get('/payables', async (_req, res, next) => {
  try {
    const purchases = await prisma.purchase.findMany({
      where: { due: { gt: 0 } },
      include: { supplier: true },
      orderBy: { purchaseDate: 'desc' },
    });
    return ok(res, purchases.map((p) => ({
      purchase: p.purchaseNumber,
      supplier: p.supplier.name,
      phone: p.supplier.phone,
      date: p.purchaseDate, total: p.total, paid: p.paid, due: p.due,
    })));
  } catch (e) { next(e); }
});

router.get('/returns', async (req, res, next) => {
  try {
    const { from, to } = req.query as any;
    const [salesReturns, purchaseReturns] = await Promise.all([
      prisma.salesReturn.findMany({
        where: { returnDate: range(from, to) },
        include: { sale: true, customer: true },
      }),
      prisma.purchaseReturn.findMany({
        where: { returnDate: range(from, to) },
        include: { purchase: true, supplier: true },
      }),
    ]);
    const items = [
      ...salesReturns.map((r) => ({
        returnNumber: r.returnNumber, reference: r.sale.invoiceNumber,
        party: r.customer?.name || 'Walk-in', type: 'SALES',
        amount: r.total, date: r.returnDate,
      })),
      ...purchaseReturns.map((r) => ({
        returnNumber: r.returnNumber, reference: r.purchase.purchaseNumber,
        party: r.supplier.name, type: 'PURCHASE',
        amount: r.total, date: r.returnDate,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return ok(res, items);
  } catch (e) { next(e); }
});

router.get('/daily-business', async (req, res, next) => {
  try {
    const { date } = req.query as any;
    const day = date ? new Date(date) : new Date();
    day.setHours(0, 0, 0, 0);
    const end = new Date(day);
    end.setHours(23, 59, 59, 999);

    const [sales, purchases, expenses, returns, paymentsIn, paymentsOut] = await Promise.all([
      prisma.sale.aggregate({ _sum: { total: true, paid: true, due: true }, _count: { _all: true }, where: { saleDate: { gte: day, lte: end } } }),
      prisma.purchase.aggregate({ _sum: { total: true, paid: true, due: true }, _count: { _all: true }, where: { purchaseDate: { gte: day, lte: end } } }),
      prisma.expense.aggregate({ _sum: { amount: true }, _count: { _all: true }, where: { expenseDate: { gte: day, lte: end } } }),
      prisma.salesReturn.aggregate({ _sum: { total: true }, _count: { _all: true }, where: { returnDate: { gte: day, lte: end } } }),
      prisma.cashFlowTransaction.aggregate({ _sum: { amount: true }, where: { date: { gte: day, lte: end }, type: 'IN' } }),
      prisma.cashFlowTransaction.aggregate({ _sum: { amount: true }, where: { date: { gte: day, lte: end }, type: 'OUT' } }),
    ]);

    return ok(res, {
      date: day.toISOString().slice(0, 10),
      sales: { total: sales._sum.total || 0, paid: sales._sum.paid || 0, due: sales._sum.due || 0, count: sales._count._all },
      purchases: { total: purchases._sum.total || 0, paid: purchases._sum.paid || 0, due: purchases._sum.due || 0, count: purchases._count._all },
      expenses: { total: expenses._sum.amount || 0, count: expenses._count._all },
      salesReturns: { total: returns._sum.total || 0, count: returns._count._all },
      cashIn: paymentsIn._sum.amount || 0,
      cashOut: paymentsOut._sum.amount || 0,
    });
  } catch (e) { next(e); }
});

export default router;