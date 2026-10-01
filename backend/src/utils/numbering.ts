import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

/**
 * Atomically fetches and increments the next number for a given sequence key.
 * Safe under concurrent access via UPDATE...RETURNING.
 */
export async function nextNumber(
  key: string,
  tx?: Prisma.TransactionClient
): Promise<string> {
  const client = tx || prisma;

  // Ensure exists first (idempotent)
  await client.numberSequence.upsert({
    where: { key },
    create: { key, prefix: '', nextNum: 1, padding: 6 },
    update: {},
  });

  // Atomic increment with row lock
  const rows = await client.$queryRaw<{ nextNum: number; prefix: string; padding: number }[]>`
    UPDATE "NumberSequence"
       SET "nextNum" = "nextNum" + 1,
           "updatedAt" = NOW()
     WHERE "key" = ${key}
     RETURNING "nextNum" - 1 AS "nextNum", "prefix", "padding"
  `;

  const { nextNum, prefix, padding } = rows[0];
  return `${prefix}${String(nextNum).padStart(padding, '0')}`;
}

export async function ensureSequence(key: string, prefix: string, padding = 6) {
  await prisma.numberSequence.upsert({
    where: { key },
    create: { key, prefix, padding, nextNum: 1 },
    update: { prefix, padding },
  });
}

export const nextInvoiceNumber = (tx?: Prisma.TransactionClient) => nextNumber('INVOICE', tx);
export const nextPurchaseNumber = (tx?: Prisma.TransactionClient) => nextNumber('PURCHASE', tx);
export const nextSalesReturnNumber = (tx?: Prisma.TransactionClient) => nextNumber('SALES_RETURN', tx);
export const nextPurchaseReturnNumber = (tx?: Prisma.TransactionClient) => nextNumber('PURCHASE_RETURN', tx);