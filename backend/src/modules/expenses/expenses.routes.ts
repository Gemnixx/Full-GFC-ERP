import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { ok } from '../../utils/response';
import { authenticate, requirePermission } from '../../middleware/auth';
import { postAccountTransaction, recordCashFlow } from '../../utils/accounts';

const router = Router();
router.use(authenticate);

router.get('/categories', async (_req, res, next) => {
  try { return ok(res, await prisma.expenseCategory.findMany({ orderBy: { name: 'asc' } })); }
  catch (e) { next(e); }
});

router.post('/categories', requirePermission('EXPENSES_CREATE'), async (req, res, next) => {
  try {
    const { name } = z.object({ name: z.string().min(1) }).parse(req.body);
    const cat = await prisma.expenseCategory.create({ data: { name } });
    return ok(res, cat, 'Category created', 201);
  } catch (e) { next(e); }
});

router.get('/', async (req, res, next) => {
  try {
    const { search, categoryId, from, to, page = '1', pageSize = '20' } = req.query as any;
    const take = Math.min(parseInt(pageSize), 100);
    const skip = (parseInt(page) - 1) * take;
    const where: any = {};
    if (search) where.description = { contains: search, mode: 'insensitive' };
    if (categoryId) where.categoryId = categoryId;
    if (from || to) {
      where.expenseDate = {};
      if (from) where.expenseDate.gte = new Date(from);
      if (to) where.expenseDate.lte = new Date(to);
    }
    const [items, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: { category: true, user: { select: { fullName: true } } },
        orderBy: { expenseDate: 'desc' },
        take, skip,
      }),
      prisma.expense.count({ where }),
    ]);
    return ok(res, { items, total });
  } catch (e) { next(e); }
});

const expenseSchema = z.object({
  categoryId: z.string(),
  amount: z.number().positive(),
  method: z.enum(['CASH', 'BANK', 'CARD']),
  description: z.string().optional(),
  reference: z.string().optional(),
  expenseDate: z.string().optional(),
});

router.post('/', requirePermission('EXPENSES_CREATE'), async (req, res, next) => {
  try {
    const data = expenseSchema.parse(req.body);
    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          categoryId: data.categoryId,
          userId: req.user!.id,
          amount: data.amount,
          method: data.method,
          description: data.description,
          reference: data.reference,
          expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
        },
      });

      const cashCode = data.method === 'CASH' ? '1000' : data.method === 'BANK' ? '1010' : '1020';
      await postAccountTransaction(tx, [
        { code: '6000', debit: data.amount, description: `Expense: ${data.description || 'N/A'}` },
        { code: cashCode, credit: data.amount, description: `Expense: ${data.description || 'N/A'}` },
      ]);
      await recordCashFlow(tx, {
        type: 'OUT', amount: data.amount, method: data.method,
        description: `Expense: ${data.description || 'N/A'}`,
        reference: expense.id,
      });
      return expense;
    });
    return ok(res, result, 'Expense recorded', 201);
  } catch (e) { next(e); }
});

router.delete('/:id', requirePermission('EXPENSES_DELETE'), async (req, res, next) => {
  try {
    await prisma.expense.delete({ where: { id: req.params.id } });
    return ok(res, {}, 'Expense deleted');
  } catch (e) { next(e); }
});

export default router;