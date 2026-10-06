import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { ok } from '../../utils/response';
import { AppError } from '../../utils/errors';
import { authenticate, requirePermission } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

const variantSchema = z.object({
  id: z.string().optional(),
  size: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  stock: z.number().int().nonnegative().default(0),
  purchasePrice: z.number().nonnegative().default(0),
  salePrice: z.number().nonnegative().default(0),
  active: z.boolean().default(true),
});

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
  variants: z.array(variantSchema).optional().default([]),
});

// ===== Meta endpoints =====
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

// ===== Size master =====
router.get('/meta/sizes', async (_req, res, next) => {
  try { return ok(res, await prisma.sizeMaster.findMany({ orderBy: { name: 'asc' } })); }
  catch (e) { next(e); }
});
router.post('/meta/sizes', requirePermission('PRODUCTS_CREATE'), async (req, res, next) => {
  try {
    const { name } = z.object({ name: z.string().min(1) }).parse(req.body);
    const existing = await prisma.sizeMaster.findUnique({ where: { name: name.trim() } });
    if (existing) return ok(res, existing, 'Size already exists');
    const size = await prisma.sizeMaster.create({ data: { name: name.trim() } });
    return ok(res, size, 'Size created', 201);
  } catch (e) { next(e); }
});

// ===== Color master =====
router.get('/meta/colors', async (_req, res, next) => {
  try { return ok(res, await prisma.colorMaster.findMany({ orderBy: { name: 'asc' } })); }
  catch (e) { next(e); }
});
router.post('/meta/colors', requirePermission('PRODUCTS_CREATE'), async (req, res, next) => {
  try {
    const { name, hex } = z.object({
      name: z.string().min(1),
      hex: z.string().optional().nullable(),
    }).parse(req.body);
    const existing = await prisma.colorMaster.findUnique({ where: { name: name.trim() } });
    if (existing) return ok(res, existing, 'Color already exists');
    const color = await prisma.colorMaster.create({
      data: { name: name.trim(), hex: hex || null },
    });
    return ok(res, color, 'Color created', 201);
  } catch (e) { next(e); }
});

// ===== List products =====
router.get('/', async (req, res, next) => {
  try {
    const { search, categoryId, brandId, model, size, color, page = '1', pageSize = '20' } = req.query as any;
    const where: any = { active: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { variants: { some: { size: { contains: search, mode: 'insensitive' } } } },
        { variants: { some: { color: { contains: search, mode: 'insensitive' } } } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (model) where.model = model;

    if (size || color) {
      where.variants = {
        some: {
          ...(size ? { size } : {}),
          ...(color ? { color } : {}),
          active: true,
        },
      };
    }

    const take = Math.min(parseInt(pageSize), 500);
    const skip = (parseInt(page) - 1) * take;

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, brand: true, inventory: true, variants: true },
        orderBy: { createdAt: 'desc' },
        take, skip,
      }),
      prisma.product.count({ where }),
    ]);
    return ok(res, { items, total, page: parseInt(page), pageSize: take });
  } catch (e) { next(e); }
});

// ===== Single =====
router.get('/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: true, brand: true, unit: true, inventory: true,
        variants: { orderBy: [{ size: 'asc' }, { color: 'asc' }] },
        stockMovements: { orderBy: { createdAt: 'desc' }, take: 100 },
      },
    });
    if (!product) throw new AppError('Product not found', 404);
    return ok(res, product);
  } catch (e) { next(e); }
});

// ===== Create =====
router.post('/', requirePermission('PRODUCTS_CREATE'), async (req, res, next) => {
  try {
    const data = productSchema.parse(req.body);
    const { openingStock, variants, ...rest } = data;

    const product = await prisma.$transaction(async (tx) => {
      const totalStock = variants.length > 0
        ? variants.reduce((s, v) => s + (v.stock || 0), 0)
        : openingStock;

      const created = await tx.product.create({
        data: {
          ...rest,
          weightedAvgCost: rest.purchasePrice,
          totalStockValue: totalStock * rest.purchasePrice,
          inventory: { create: { quantity: totalStock } },
          variants: variants.length > 0
            ? {
                create: variants.map((v) => ({
                  size: v.size,
                  color: v.color,
                  sku: v.sku,
                  barcode: v.barcode,
                  stock: v.stock || 0,
                  purchasePrice: v.purchasePrice || rest.purchasePrice,
                  salePrice: v.salePrice || rest.salePrice,
                  active: v.active ?? true,
                })),
              }
            : undefined,
        },
        include: { variants: true },
      });

      if (totalStock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: created.id, type: 'ADJUSTMENT',
            quantity: totalStock, balance: totalStock,
            reason: 'Opening stock',
            unitCost: rest.purchasePrice,
            totalCost: totalStock * rest.purchasePrice,
            runningWac: rest.purchasePrice,
          },
        });
      }
      return created;
    });
    return ok(res, product, 'Product created', 201);
  } catch (e) { next(e); }
});

// ===== Update =====
router.put('/:id', requirePermission('PRODUCTS_UPDATE'), async (req, res, next) => {
  try {
    const data = productSchema.partial().parse(req.body);
    const { openingStock, variants, ...rest } = data as any;

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: req.params.id },
        data: rest,
      });

      if (Array.isArray(variants)) {
        const existing = await tx.productVariant.findMany({
          where: { productId: req.params.id },
        });
        const incomingIds = new Set(variants.filter((v: any) => v.id).map((v: any) => v.id));

        for (const ev of existing) {
          if (!incomingIds.has(ev.id)) {
            await tx.productVariant.delete({ where: { id: ev.id } });
          }
        }

        for (const v of variants as any[]) {
          if (v.id) {
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                size: v.size, color: v.color, sku: v.sku, barcode: v.barcode,
                stock: v.stock || 0,
                purchasePrice: v.purchasePrice || 0,
                salePrice: v.salePrice || 0,
                active: v.active ?? true,
              },
            });
          } else {
            await tx.productVariant.create({
              data: {
                productId: req.params.id,
                size: v.size, color: v.color, sku: v.sku, barcode: v.barcode,
                stock: v.stock || 0,
                purchasePrice: v.purchasePrice || 0,
                salePrice: v.salePrice || 0,
                active: v.active ?? true,
              },
            });
          }
        }

        const variantSum = await tx.productVariant.aggregate({
          where: { productId: req.params.id, active: true },
          _sum: { stock: true },
        });
        await tx.inventory.upsert({
          where: { productId: req.params.id },
          create: { productId: req.params.id, quantity: variantSum._sum.stock || 0 },
          update: { quantity: variantSum._sum.stock || 0 },
        });
      }

      return updated;
    });
    return ok(res, product, 'Product updated');
  } catch (e) { next(e); }
});

router.delete('/:id', requirePermission('PRODUCTS_DELETE'), async (req, res, next) => {
  try {
    await prisma.product.update({ where: { id: req.params.id }, data: { active: false } });
    return ok(res, {}, 'Product deactivated');
  } catch (e) { next(e); }
});

// ===== Categories/Brands/Units create =====
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