import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { ok } from '../../utils/response';
import { authenticate, requirePermission } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

// Get all roles — anyone logged in can see (needed for dropdowns)
router.get('/roles', async (_req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      include: { permissions: true },
      orderBy: { name: 'asc' },
    });
    return ok(res, roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      permissions: r.permissions.map((p) => p.code),
    })));
  } catch (e) { next(e); }
});

// List users — requires USERS_VIEW
router.get('/', requirePermission('USERS_VIEW'), async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });
    return ok(res, users.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      active: u.active,
      role: u.role.name,
      roleId: u.roleId,
    })));
  } catch (e) { next(e); }
});

const userSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6).optional(),
  fullName: z.string().min(1),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  roleId: z.string(),
  active: z.boolean().default(true),
});

// Create user — requires USERS_CREATE
router.post('/', requirePermission('USERS_CREATE'), async (req, res, next) => {
  try {
    const data = userSchema.parse(req.body);
    if (!data.password) throw new Error('Password required for new user');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        username: data.username,
        passwordHash,
        fullName: data.fullName,
        email: data.email || null,
        phone: data.phone,
        roleId: data.roleId,
        active: data.active,
      },
      include: { role: true },
    });
    return ok(res, {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role.name,
      active: user.active,
    }, 'User created', 201);
  } catch (e) { next(e); }
});

// Update user — requires USERS_UPDATE
router.put('/:id', requirePermission('USERS_UPDATE'), async (req, res, next) => {
  try {
    const data = userSchema.partial().parse(req.body);
    const updateData: any = { ...data };
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
      delete updateData.password;
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      include: { role: true },
    });
    return ok(res, {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role.name,
      active: user.active,
    }, 'User updated');
  } catch (e) { next(e); }
});

// Toggle active — requires USERS_UPDATE
router.post('/:id/toggle', requirePermission('USERS_UPDATE'), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new Error('User not found');
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { active: !user.active },
    });
    return ok(res, { active: updated.active }, 'User status updated');
  } catch (e) { next(e); }
});

export default router;