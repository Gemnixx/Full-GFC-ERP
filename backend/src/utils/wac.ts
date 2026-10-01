import { Prisma } from '@prisma/client';

/**
 * Weighted Average Cost — Apply a purchase.
 * newWAC = (oldQty * oldWAC + purchasedQty * purchasePrice) / (oldQty + purchasedQty)
 */
export async function applyPurchaseToWac(
  tx: Prisma.TransactionClient,
  productId: string,
  purchasedQty: number,
  purchasePrice: number
) {
  const inv = await tx.inventory.findUnique({ where: { productId } });
  const product = await tx.product.findUnique({ where: { id: productId } });
  if (!inv || !product) throw new Error('Inventory or product not found');

  const oldQty = inv.quantity;
  const oldWac = product.weightedAvgCost || product.purchasePrice || 0;
  const oldValue = oldQty * oldWac;
  const newQty = oldQty + purchasedQty;
  const newValue = oldValue + purchasedQty * purchasePrice;
  const newWac = newQty > 0 ? newValue / newQty : purchasePrice;

  await tx.product.update({
    where: { id: productId },
    data: { weightedAvgCost: newWac, totalStockValue: newValue },
  });

  return { newWac, newQty, newTotalValue: newValue };
}

/**
 * WAC — Apply a sale (reduce value at current WAC, but WAC itself stays).
 */
export async function applySaleToWac(
  tx: Prisma.TransactionClient,
  productId: string,
  soldQty: number
) {
  const product = await tx.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error('Product not found');

  const wacAtSale = product.weightedAvgCost || product.purchasePrice || 0;
  const inv = await tx.inventory.findUnique({ where: { productId } });
  const newQty = Math.max((inv?.quantity || 0) - soldQty, 0);
  const newValue = newQty * wacAtSale;

  await tx.product.update({
    where: { id: productId },
    data: { totalStockValue: newValue },
  });

  return { wacAtSale, newQty, newTotalValue: newValue };
}

/**
 * WAC — Apply a purchase return (reduce qty and value at current WAC).
 */
export async function applyPurchaseReturnToWac(
  tx: Prisma.TransactionClient,
  productId: string,
  returnedQty: number
) {
  const product = await tx.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error('Product not found');

  const wacAtReturn = product.weightedAvgCost || product.purchasePrice || 0;
  const inv = await tx.inventory.findUnique({ where: { productId } });
  const newQty = Math.max((inv?.quantity || 0) - returnedQty, 0);
  const newValue = newQty * wacAtReturn;

  await tx.product.update({
    where: { id: productId },
    data: { totalStockValue: newValue },
  });

  return { wacAtReturn, newQty, newTotalValue: newValue };
}

/**
 * WAC — Apply a sales return (add back at original cost).
 */
export async function applySalesReturnToWac(
  tx: Prisma.TransactionClient,
  productId: string,
  returnedQty: number,
  costAtSale: number
) {
  const product = await tx.product.findUnique({ where: { id: productId } });
  const inv = await tx.inventory.findUnique({ where: { productId } });
  if (!product || !inv) throw new Error('Product or inventory not found');

  const oldQty = inv.quantity;
  const oldWac = product.weightedAvgCost || product.purchasePrice || 0;
  const oldValue = oldQty * oldWac;
  const newQty = oldQty + returnedQty;
  const newValue = oldValue + returnedQty * costAtSale;
  const newWac = newQty > 0 ? newValue / newQty : oldWac;

  await tx.product.update({
    where: { id: productId },
    data: { weightedAvgCost: newWac, totalStockValue: newValue },
  });

  return { newWac, newQty, newTotalValue: newValue };
}