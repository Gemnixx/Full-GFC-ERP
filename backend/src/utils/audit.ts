import { prisma } from '../config/prisma';

export async function auditLog(entry: {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId || null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId || null,
        changes: entry.changes || undefined,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  } catch (e) {
    // Audit failures shouldn't break business flow
    console.error('[AUDIT]', e);
  }
}