import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  transactionOptions: {
    timeout: 30000,    // 30 seconds (was 5s)
    maxWait: 10000,    // 10 seconds wait
  },
});