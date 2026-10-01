import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { ok } from '../../utils/response';
import { AppError } from '../../utils/errors';
import { authenticate } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimit';
import { auditLog } from '../../utils/audit';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { username },
      include: { role: { include: { permissions: true } } },
    });
    if (!user || !user.active) throw new AppError('Invalid credentials', 401);
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError('Invalid credentials', 401);

    const token = jwt.sign({ userId: user.id }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn as any,
    });
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.nodeEnv === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await auditLog({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return ok(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role.name,
        permissions: user.role.permissions.map((p) => p.code),
      },
    }, 'Logged in');
  } catch (e) { next(e); }
});

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    if (req.user) {
      await auditLog({ userId: req.user.id, action: 'LOGOUT', entity: 'User', entityId: req.user.id });
    }
    res.clearCookie('token');
    return ok(res, {}, 'Logged out');
  } catch (e) { next(e); }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { role: { include: { permissions: true } } },
    });
    if (!user) throw new AppError('User not found', 404);
    return ok(res, {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role.name,
      permissions: user.role.permissions.map((p) => p.code),
    });
  } catch (e) { next(e); }
});

export default router;