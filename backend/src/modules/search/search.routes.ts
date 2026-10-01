import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { ok } from '../../utils/response';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

/**
 * Global search across products, customers, suppliers, sales, purchases.
 * GET /api/search?q=ceiling
 */
router.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(parseInt(String(req.query.limit || '5')), 10);

    if (q.length < 2) {
      return ok(res, { products: [], customers: [], suppliers: [], sales: [], purchases: [] });
    }

    const [products, customers, suppliers, sales, purchases] = await Promise.all([
      prisma.product.findMany({
        where: {
          active: true,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { model: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
            { barcode: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          model: true,
          salePrice: true,
          inventory: { select: { quantity: true } },
        },
        take: limit,
      }),

      prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, phone: true },
        take: limit,
      }),

      prisma.supplier.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { company: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, company: true, phone: true },
        take: limit,
      }),

      prisma.sale.findMany({
        where: {
          OR: [
            { invoiceNumber: { contains: q, mode: 'insensitive' } },
            { customer: { name: { contains: q, mode: 'insensitive' } } },
          ],
        },
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          saleDate: true,
          customer: { select: { name: true } },
        },
        orderBy: { saleDate: 'desc' },
        take: limit,
      }),

      prisma.purchase.findMany({
        where: {
          OR: [
            { purchaseNumber: { contains: q, mode: 'insensitive' } },
            { supplier: { name: { contains: q, mode: 'insensitive' } } },
          ],
        },
        select: {
          id: true,
          purchaseNumber: true,
          total: true,
          purchaseDate: true,
          supplier: { select: { name: true } },
        },
        orderBy: { purchaseDate: 'desc' },
        take: limit,
      }),
    ]);

    return ok(res, {
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        model: p.model,
        salePrice: p.salePrice,
        stock: p.inventory?.quantity ?? 0,
      })),
      customers,
      suppliers,
      sales,
      purchases,
    });
  } catch (e) { next(e); }
});

export default router;