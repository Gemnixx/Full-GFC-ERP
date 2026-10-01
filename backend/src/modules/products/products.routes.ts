import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { ok } from '../../utils/response';
import { AppError } from '../../utils/errors';
import { authenticate, requirePermission } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

const productSchema = z.object({
  name: z.string().min(1),
  model: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  brandId: z.string().optional().nullable(),
  unitId: z.string().optional().nullable(),
  purchasePrice: z.number().nonnegative().default(0),
  salePrice: z.number().nonnegative().default(0),
  minSalePrice: z.number().nonnegative().default(0),
  minStockLevel: z.number().int().nonnegative().default(5),
  warranty: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  openingStock: z.number().int().nonnegative().default(0),
  active: z.boolean().default(true),
});

// Meta endpoints (before /:id route)
router.get('/meta/categories', async (_req, res, next) => {
  try { return ok(res, await prisma.category.findMany({ orderBy: { name: 'asc' } })); }
  catch (e) { next(e); }
});
router.get('/meta/brands', async (_req, res, next) => {
  try { return ok(res, await prisma.brand.findMany({ orderBy: { name: 'asc' } })); }
  catch (e) { next(e); }
});
router.get('/meta/units', async (_req, res, next) => {
  try { return ok(res, await prisma.unit.findMany({ orderBy: { name: 'asc' } })); }
  catch (e) { next(e); }
});

router.get('/', async (req, res, next) => {
  try {
    const { search, categoryId, brandId, page = '1', pageSize = '20' } = req.query as any;
    const where: any = { active: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;

    const take = Math.min(parseInt(pageSize), 500);
    const skip = (parseInt(page) - 1) * take;

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, brand: true, inventory: true },
        orderBy: { createdAt: 'desc' },
        take, skip,
      }),
      prisma.product.count({ where }),
    ]);
    return ok(res, { items, total, page: parseInt(page), pageSize: take });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: true, brand: true, unit: true, inventory: true,
        stockMovements: { orderBy: { createdAt: 'desc' }, take: 100 },
        saleItems: { include: { sale: true }, orderBy: { sale: { saleDate: 'desc' } }, take: 50 },
        purchaseItems: { include: { purchase: true }, orderBy: { purchase: { purchaseDate: 'desc' } }, take: 50 },
      },
    });
    if (!product) throw new AppError('Product not found', 404);
    return ok(res, product);
  } catch (e) { next(e); }
});

router.post('/', requirePermission('PRODUCTS_CREATE'), async (req, res, next) => {
  try {
    const data = productSchema.parse(req.body);
    const { openingStock, ...rest } = data;
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: { ...rest, weightedAvgCost: rest.purchasePrice, totalStockValue: openingStock * rest.purchasePrice },
      });
      await tx.inventory.create({ data: { productId: created.id, quantity: openingStock } });
      if (openingStock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: created.id, type: 'ADJUSTMENT',
            quantity: openingStock, balance: openingStock,
            reason: 'Opening stock',
            unitCost: rest.purchasePrice,
            totalCost: openingStock * rest.purchasePrice,
            runningWac: rest.purchasePrice,
          },
        });
      }
      return created;
    });
    return ok(res, product, 'Product created', 201);
  } catch (e) { next(e); }
});

router.put('/:id', requirePermission('PRODUCTS_UPDATE'), async (req, res, next) => {
  try {
    const data = productSchema.partial().parse(req.body);
    const { openingStock, ...rest } = data as any;
    const product = await prisma.product.update({ where: { id: req.params.id }, data: rest });
    return ok(res, product, 'Product updated');
  } catch (e) { next(e); }
});

router.delete('/:id', requirePermission('PRODUCTS_DELETE'), async (req, res, next) => {
  try {
    await prisma.product.update({ where: { id: req.params.id }, data: { active: false } });
    return ok(res, {}, 'Product deactivated');
  } catch (e) { next(e); }
});

// Categories/Brands/Units CRUD
router.post('/meta/categories', requirePermission('PRODUCTS_CREATE'), async (req, res, next) => {
  try {
    const { name } = z.object({ name: z.string().min(1) }).parse(req.body);
    const cat = await prisma.category.create({ data: { name } });
    return ok(res, cat, 'Category created', 201);
  } catch (e) { next(e); }
});
router.post('/meta/brands', requirePermission('PRODUCTS_CREATE'), async (req, res, next) => {
  try {
    const { name } = z.object({ name: z.string().min(1) }).parse(req.body);
    const brand = await prisma.brand.create({ data: { name } });
    return ok(res, brand, 'Brand created', 201);
  } catch (e) { next(e); }
});
router.post('/meta/units', requirePermission('PRODUCTS_CREATE'), async (req, res, next) => {
  try {
    const { name, symbol } = z.object({ name: z.string().min(1), symbol: z.string().optional() }).parse(req.body);
    const unit = await prisma.unit.create({ data: { name, symbol } });
    return ok(res, unit, 'Unit created', 201);
  } catch (e) { next(e); }
});

export default router;