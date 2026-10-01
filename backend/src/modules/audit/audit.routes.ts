import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { ok } from '../../utils/response';
import { authenticate, requirePermission } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', requirePermission('USERS_VIEW'), async (req, res, next) => {
  try {
    const { entity, userId, page = '1', pageSize = '50' } = req.query as any;
    const take = Math.min(parseInt(pageSize), 200);
    const skip = (parseInt(page) - 1) * take;
    const where: any = {};
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { fullName: true, username: true } } },
        orderBy: { createdAt: 'desc' },
        take, skip,
      }),
      prisma.auditLog.count({ where }),
    ]);
    return ok(res, { items, total });
  } catch (e) { next(e); }
});

export default router;