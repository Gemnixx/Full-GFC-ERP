import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { ok } from '../../utils/response';
import { authenticate, requirePermission } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { search, status, page = '1', pageSize = '20' } = req.query as any;
    const take = Math.min(parseInt(pageSize), 100);
    const skip = (parseInt(page) - 1) * take;

    const products = await prisma.product.findMany({
      where: {
        active: true,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { model: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: { inventory: true, brand: true, category: true },
      orderBy: { name: 'asc' },
    });

    let filtered = products.map((p) => {
      const qty = p.inventory?.quantity ?? 0;
      const stockStatus = qty <= 0 ? 'OUT_OF_STOCK' : qty <= p.minStockLevel ? 'LOW_STOCK' : 'IN_STOCK';
      return { ...p, stockStatus };
    });
    if (status) filtered = filtered.filter((p) => p.stockStatus === status);

    const total = filtered.length;
    const items = filtered.slice(skip, skip + take);

    const summary = {
      totalProducts: products.length,
      totalStock: products.reduce((s, p) => s + (p.inventory?.quantity ?? 0), 0),
      lowStock: products.filter((p) => (p.inventory?.quantity ?? 0) > 0 && (p.inventory?.quantity ?? 0) <= p.minStockLevel).length,
      outOfStock: products.filter((p) => (p.inventory?.quantity ?? 0) <= 0).length,
      totalValue: products.reduce((s, p) => s + (p.inventory?.quantity ?? 0) * (p.weightedAvgCost || p.purchasePrice), 0),
    };
    return ok(res, { items, total, summary });
  } catch (e) { next(e); }
});

router.get('/movements/:productId', async (req, res, next) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      where: { productId: req.params.productId },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return ok(res, movements);
  } catch (e) { next(e); }
});

router.get('/movements', async (req, res, next) => {
  try {
    const { productId, type, from, to, page = '1', pageSize = '50' } = req.query as any;
    const take = Math.min(parseInt(pageSize), 200);
    const skip = (parseInt(page) - 1) * take;
    const where: any = {};
    if (productId) where.productId = productId;
    if (type) where.type = type;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [items, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: { product: { select: { name: true, model: true } }, user: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
        take, skip,
      }),
      prisma.stockMovement.count({ where }),
    ]);
    return ok(res, { items, total });
  } catch (e) { next(e); }
});

const adjustSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  type: z.enum(['INCREASE', 'DECREASE']),
  reason: z.string().optional(),
});

router.post('/adjust', requirePermission('INVENTORY_ADJUST'), async (req, res, next) => {
  try {
    const data = adjustSchema.parse(req.body);
    const delta = data.type === 'INCREASE' ? data.quantity : -data.quantity;

    const result = await prisma.$transaction(
      async (tx) => {
        const inv = await tx.inventory.findUnique({ where: { productId: data.productId } });
        const product = await tx.product.findUnique({ where: { id: data.productId } });
        if (!inv || !product) throw new Error('Inventory record not found');
        const newQty = inv.quantity + delta;
        if (newQty < 0) throw new Error('Adjustment would result in negative stock');

        const wac = product.weightedAvgCost || product.purchasePrice || 0;

        const updated = await tx.inventory.update({
          where: { productId: data.productId },
          data: { quantity: newQty },
        });

        await tx.product.update({
          where: { id: data.productId },
          data: { totalStockValue: newQty * wac },
        });

        await tx.stockMovement.create({
          data: {
            productId: data.productId,
            userId: req.user!.id,
            type: 'ADJUSTMENT',
            quantity: delta,
            balance: newQty,
            reason: data.reason,
            unitCost: wac,
            totalCost: wac * Math.abs(delta),
            runningWac: wac,
          },
        });
        return updated;
      },
      {
        timeout: 30000,
        maxWait: 10000,
      }
    );
    return ok(res, result, 'Stock adjusted');
  } catch (e) { next(e); }
});

export default router;