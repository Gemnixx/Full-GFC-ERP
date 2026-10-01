import { Prisma } from '@prisma/client';

export const CHART_OF_ACCOUNTS = [
  { code: '1000', name: 'Cash', type: 'ASSET' },
  { code: '1010', name: 'Bank', type: 'ASSET' },
  { code: '1020', name: 'Card Clearing', type: 'ASSET' },
  { code: '1100', name: 'Accounts Receivable', type: 'ASSET' },
  { code: '1200', name: 'Inventory', type: 'ASSET' },
  { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
  { code: '3000', name: 'Owner Equity', type: 'EQUITY' },
  { code: '3900', name: 'Opening Balance Equity', type: 'EQUITY' },
  { code: '4000', name: 'Sales Revenue', type: 'REVENUE' },
  { code: '4100', name: 'Sales Returns', type: 'REVENUE' },
  { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' },
  { code: '6000', name: 'Operating Expenses', type: 'EXPENSE' },
];

export const postAccountTransaction = async (
  tx: Prisma.TransactionClient,
  entries: { code: string; debit?: number; credit?: number; description: string; reference?: string }[],
  date: Date = new Date()
) => {
  for (const e of entries) {
    const account = await tx.account.findUnique({ where: { code: e.code } });
    if (!account) throw new Error(`Account ${e.code} not found`);
    await tx.accountTransaction.create({
      data: {
        accountId: account.id,
        debit: e.debit || 0,
        credit: e.credit || 0,
        description: e.description,
        reference: e.reference,
        date,
      },
    });
  }
};

export const recordCashFlow = async (
  tx: Prisma.TransactionClient,
  entry: { type: 'IN' | 'OUT'; amount: number; method: string; description: string; reference?: string },
  date: Date = new Date()
) => {
  if (entry.method === 'CREDIT') return;
  await tx.cashFlowTransaction.create({
    data: {
      type: entry.type,
      amount: entry.amount,
      method: entry.method,
      description: entry.description,
      reference: entry.reference,
      date,
    },
  });
};