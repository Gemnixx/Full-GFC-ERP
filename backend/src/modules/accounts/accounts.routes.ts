import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { ok } from '../../utils/response';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/summary', async (_req, res, next) => {
  try {
    const accounts = await prisma.account.findMany({ include: { transactions: true } });
    const balanceOf = (code: string) => {
      const acc = accounts.find((a) => a.code === code);
      if (!acc) return 0;
      const debits = acc.transactions.reduce((s, t) => s + t.debit, 0);
      const credits = acc.transactions.reduce((s, t) => s + t.credit, 0);
      const isDebitAccount = ['ASSET', 'EXPENSE'].includes(acc.type);
      return isDebitAccount ? debits - credits : credits - debits;
    };

    const totalSales = await prisma.sale.aggregate({ _sum: { total: true } });
    const totalPurchases = await prisma.purchase.aggregate({ _sum: { total: true } });
    const totalReceivables = await prisma.sale.aggregate({ _sum: { due: true } });
    const totalPayables = await prisma.purchase.aggregate({ _sum: { due: true } });

    return ok(res, {
      cashBalance: balanceOf('1000'),
      bankBalance: balanceOf('1010') + balanceOf('1020'),
      receivables: totalReceivables._sum.due || 0,
      payables: totalPayables._sum.due || 0,
      totalSales: totalSales._sum.total || 0,
      totalPurchases: totalPurchases._sum.total || 0,
      accounts: accounts.map((a) => ({
        id: a.id, code: a.code, name: a.name, type: a.type,
        balance: balanceOf(a.code),
      })),
    });
  } catch (e) { next(e); }
});

router.get('/:id/transactions', async (req, res, next) => {
  try {
    const { from, to, page = '1', pageSize = '50' } = req.query as any;
    const take = Math.min(parseInt(pageSize), 200);
    const skip = (parseInt(page) - 1) * take;
    const where: any = { accountId: req.params.id };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    const [transactions, total] = await Promise.all([
      prisma.accountTransaction.findMany({ where, orderBy: { date: 'desc' }, take, skip }),
      prisma.accountTransaction.count({ where }),
    ]);
    return ok(res, { items: transactions, total });
  } catch (e) { next(e); }
});

export default router;