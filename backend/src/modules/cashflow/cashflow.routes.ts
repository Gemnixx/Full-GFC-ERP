import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { ok } from '../../utils/response';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { from, to, method, page = '1', pageSize = '50' } = req.query as any;
    const take = Math.min(parseInt(pageSize), 200);
    const skip = (parseInt(page) - 1) * take;

    const where: any = {};
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    if (method) where.method = method;

    const [transactions, total, allIn, allOut, openingIn, openingOut] = await Promise.all([
      prisma.cashFlowTransaction.findMany({ where, orderBy: { date: 'asc' } }),
      prisma.cashFlowTransaction.count({ where }),
      prisma.cashFlowTransaction.aggregate({ _sum: { amount: true }, where: { ...where, type: 'IN' } }),
      prisma.cashFlowTransaction.aggregate({ _sum: { amount: true }, where: { ...where, type: 'OUT' } }),
      prisma.cashFlowTransaction.aggregate({
        _sum: { amount: true },
        where: { ...(from ? { date: { lt: new Date(from) } } : {}), type: 'IN' },
      }),
      prisma.cashFlowTransaction.aggregate({
        _sum: { amount: true },
        where: { ...(from ? { date: { lt: new Date(from) } } : {}), type: 'OUT' },
      }),
    ]);

    const opening = (openingIn._sum.amount || 0) - (openingOut._sum.amount || 0);
    const moneyIn = allIn._sum.amount || 0;
    const moneyOut = allOut._sum.amount || 0;

    let balance = opening;
    const withBalance = transactions.map((t) => {
      balance += t.type === 'IN' ? t.amount : -t.amount;
      return { ...t, balance };
    });

    return ok(res, {
      items: withBalance.reverse().slice(skip, skip + take),
      total,
      summary: { openingBalance: opening, moneyIn, moneyOut, closingBalance: opening + moneyIn - moneyOut },
    });
  } catch (e) { next(e); }
});

export default router;