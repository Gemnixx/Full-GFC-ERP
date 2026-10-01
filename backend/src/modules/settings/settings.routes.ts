import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { ok } from '../../utils/response';
import { authenticate, requirePermission } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (_req, res, next) => {
  try {
    let settings = await prisma.settings.findFirst();
    if (!settings) settings = await prisma.settings.create({ data: {} });
    return ok(res, settings);
  } catch (e) { next(e); }
});

const schema = z.object({
  outletName: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  invoicePrefix: z.string().nullable().optional(),
  invoiceNextNum: z.coerce.number().int().nullable().optional(),
  receiptFooter: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  taxEnabled: z.coerce.boolean().nullable().optional(),
  taxPercent: z.coerce.number().nullable().optional(),
  lowStockAlerts: z.coerce.boolean().nullable().optional(),
}).strip();

router.put('/', requirePermission('SETTINGS_UPDATE'), async (req, res, next) => {
  try {
    const data = schema.parse(req.body);

    // Skip null/undefined values so DB doesn't get overwritten with null
    const cleanData: any = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        cleanData[key] = value;
      }
    });

    const existing = await prisma.settings.findFirst();
    const settings = existing
      ? await prisma.settings.update({ where: { id: existing.id }, data: cleanData })
      : await prisma.settings.create({ data: cleanData });

    return ok(res, settings, 'Settings saved');
  } catch (e) { next(e); }
});

export default router;