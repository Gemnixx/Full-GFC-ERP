import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { CHART_OF_ACCOUNTS } from './utils/accounts';
import { ensureSequence } from './utils/numbering';
import bcrypt from 'bcryptjs';

// ============================================================
// ALL PERMISSIONS
// ============================================================
const ALL_PERMISSIONS = [
  { code: 'DASHBOARD_VIEW', name: 'View Dashboard' },
  { code: 'POS_USE', name: 'Use POS / Create Sale' },
  { code: 'SALES_VIEW', name: 'View Sales' },
  { code: 'SALES_CREATE', name: 'Create Sale' },
  { code: 'SALES_DELETE', name: 'Delete Sale' },
  { code: 'PURCHASES_VIEW', name: 'View Purchases' },
  { code: 'PURCHASES_CREATE', name: 'Create Purchase' },
  { code: 'PRODUCTS_VIEW', name: 'View Products' },
  { code: 'PRODUCTS_CREATE', name: 'Create Product' },
  { code: 'PRODUCTS_UPDATE', name: 'Edit Product' },
  { code: 'PRODUCTS_DELETE', name: 'Delete Product' },
  { code: 'INVENTORY_VIEW', name: 'View Inventory' },
  { code: 'INVENTORY_ADJUST', name: 'Adjust Stock' },
  { code: 'CUSTOMERS_VIEW', name: 'View Customers' },
  { code: 'CUSTOMERS_CREATE', name: 'Create Customer' },
  { code: 'CUSTOMERS_UPDATE', name: 'Edit Customer' },
  { code: 'CUSTOMERS_PAYMENT', name: 'Receive Customer Payment' },
  { code: 'SUPPLIERS_VIEW', name: 'View Suppliers' },
  { code: 'SUPPLIERS_CREATE', name: 'Create Supplier' },
  { code: 'SUPPLIERS_UPDATE', name: 'Edit Supplier' },
  { code: 'SUPPLIERS_PAYMENT', name: 'Pay Supplier' },
  { code: 'RETURNS_VIEW', name: 'View Returns' },
  { code: 'RETURNS_CREATE', name: 'Create Return' },
  { code: 'ACCOUNTS_VIEW', name: 'View Accounts' },
  { code: 'CASHFLOW_VIEW', name: 'View Cash Flow' },
  { code: 'EXPENSES_VIEW', name: 'View Expenses' },
  { code: 'EXPENSES_CREATE', name: 'Create Expense' },
  { code: 'EXPENSES_DELETE', name: 'Delete Expense' },
  { code: 'REPORTS_VIEW', name: 'View Reports' },
  { code: 'USERS_VIEW', name: 'View Users' },
  { code: 'USERS_CREATE', name: 'Create User' },
  { code: 'USERS_UPDATE', name: 'Edit User' },
  { code: 'SETTINGS_VIEW', name: 'View Settings' },
  { code: 'SETTINGS_UPDATE', name: 'Update Settings' },
];

// ============================================================
// ROLE → PERMISSIONS MAPPING
// ============================================================
const ROLE_PERMISSIONS: Record<string, string[]> = {
  Administrator: ['*'], // wildcard = all

  Manager: [
    'DASHBOARD_VIEW', 'POS_USE',
    'SALES_VIEW', 'SALES_CREATE',
    'PURCHASES_VIEW', 'PURCHASES_CREATE',
    'PRODUCTS_VIEW', 'PRODUCTS_CREATE', 'PRODUCTS_UPDATE',
    'INVENTORY_VIEW', 'INVENTORY_ADJUST',
    'CUSTOMERS_VIEW', 'CUSTOMERS_CREATE', 'CUSTOMERS_UPDATE', 'CUSTOMERS_PAYMENT',
    'SUPPLIERS_VIEW', 'SUPPLIERS_CREATE', 'SUPPLIERS_UPDATE', 'SUPPLIERS_PAYMENT',
    'RETURNS_VIEW', 'RETURNS_CREATE',
    'ACCOUNTS_VIEW', 'CASHFLOW_VIEW',
    'EXPENSES_VIEW', 'EXPENSES_CREATE',
    'REPORTS_VIEW',
    'SETTINGS_VIEW',
  ],

  Cashier: [
    'DASHBOARD_VIEW', 'POS_USE',
    'SALES_VIEW', 'SALES_CREATE',
    'PRODUCTS_VIEW',
    'INVENTORY_VIEW',
    'CUSTOMERS_VIEW', 'CUSTOMERS_CREATE',
  ],

  'Sales User': [
    'DASHBOARD_VIEW', 'POS_USE',
    'SALES_VIEW', 'SALES_CREATE',
    'PRODUCTS_VIEW',
    'INVENTORY_VIEW',
    'CUSTOMERS_VIEW', 'CUSTOMERS_CREATE', 'CUSTOMERS_UPDATE',
  ],

  'Accounts User': [
    'DASHBOARD_VIEW',
    'SALES_VIEW',
    'PURCHASES_VIEW',
    'CUSTOMERS_VIEW', 'CUSTOMERS_PAYMENT',
    'SUPPLIERS_VIEW', 'SUPPLIERS_PAYMENT',
    'ACCOUNTS_VIEW', 'CASHFLOW_VIEW',
    'EXPENSES_VIEW', 'EXPENSES_CREATE',
    'REPORTS_VIEW',
  ],
};

// ============================================================
// BOOTSTRAP
// ============================================================
const bootstrap = async () => {
  // Chart of accounts
  for (const acc of CHART_OF_ACCOUNTS) {
    await prisma.account.upsert({
      where: { code: acc.code },
      create: acc,
      update: { name: acc.name, type: acc.type },
    });
  }

  // Default expense categories
  const defaultCats = ['Electricity', 'Salaries', 'Transport', 'Rent', 'Maintenance', 'Other'];
  for (const name of defaultCats) {
    await prisma.expenseCategory.upsert({ where: { name }, create: { name }, update: {} });
  }

  // Number sequences
  await ensureSequence('INVOICE', 'INV-', 6);
  await ensureSequence('PURCHASE', 'PUR-', 6);
  await ensureSequence('SALES_RETURN', 'SR-', 6);
  await ensureSequence('PURCHASE_RETURN', 'PR-', 6);

  // Settings
  const settings = await prisma.settings.findFirst();
  if (!settings) await prisma.settings.create({ data: {} });

  // ===== SEED PERMISSIONS =====
  console.log('🔐 Seeding permissions...');
  const permissionMap: Record<string, string> = {};
  for (const perm of ALL_PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { code: perm.code },
      create: perm,
      update: { name: perm.name },
    });
    permissionMap[perm.code] = created.id;
  }

  // ===== SEED ROLES + LINK PERMISSIONS =====
  console.log('🔐 Seeding roles...');
  for (const [roleName, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      create: { name: roleName, description: `${roleName} role` },
      update: {},
    });

    const codes = permCodes.includes('*') ? Object.keys(permissionMap) : permCodes;

    for (const code of codes) {
      const permId = permissionMap[code];
      if (!permId) continue;
      await prisma.role.update({
        where: { id: role.id },
        data: { permissions: { connect: { id: permId } } },
      });
    }
  }

  // ===== SEED ADMIN USER =====
  const usersCount = await prisma.user.count();
  if (usersCount === 0) {
    const adminRole = await prisma.role.findUnique({ where: { name: 'Administrator' } });
    await prisma.user.create({
      data: {
        username: 'admin',
        passwordHash: await bcrypt.hash('admin123', 10),
        fullName: 'Administrator',
        roleId: adminRole!.id,
      },
    });
    console.log('✔ Seeded admin (admin / admin123)');
  }

  app.listen(env.port, () => {
    console.log(`🚀 GFC Fans API running on http://localhost:${env.port}`);
  });
};

bootstrap().catch((e) => {
  console.error(e);
  process.exit(1);
});