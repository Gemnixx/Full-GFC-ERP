import { Prisma } from '@prisma/client';
import { AppError } from './errors';

/**
 * Validates that a customer payment doesn't exceed outstanding balance.
 * Outstanding = sum(opening entries due) + sum(sale.due)
 */
export async function validateCustomerPayment(
  tx: Prisma.TransactionClient,
  customerId: string,
  amount: number
): Promise<number> {
  const customer = await tx.customer.findUnique({
    where: { id: customerId },
    include: {
      sales: true,
      openingEntries: true,
    },
  });
  if (!customer) throw new AppError('Customer not found', 404);

  const salesDue = customer.sales.reduce((s, x) => s + x.due, 0);
  const openingDue = customer.openingEntries.reduce(
    (s, x) => s + (x.amount - x.paid),
    0
  );
  const outstanding = salesDue + openingDue;

  if (amount > outstanding + 0.01) {
    throw new AppError(
      `Payment exceeds outstanding balance (Rs ${outstanding.toFixed(2)})`,
      422
    );
  }
  return outstanding;
}

/**
 * Validates supplier payment against payable.
 * Uses: payable = openingBalance + sum(purchase.due)
 */
export async function validateSupplierPayment(
  tx: Prisma.TransactionClient,
  supplierId: string,
  amount: number
): Promise<number> {
  const supplier = await tx.supplier.findUnique({
    where: { id: supplierId },
    include: { purchases: true },
  });
  if (!supplier) throw new AppError('Supplier not found', 404);

  const totalDue = supplier.purchases.reduce((s, x) => s + x.due, 0);
  const payable = supplier.openingBalance + totalDue;

  if (amount > payable + 0.01) {
    throw new AppError(
      `Payment exceeds payable amount (Rs ${payable.toFixed(2)})`,
      422
    );
  }
  return payable;
}