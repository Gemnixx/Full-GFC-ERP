import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimit';

import authRoutes from './modules/auth/auth.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import productRoutes from './modules/products/products.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import customerRoutes from './modules/customers/customers.routes';
import supplierRoutes from './modules/suppliers/suppliers.routes';
import salesRoutes from './modules/sales/sales.routes';
import purchasesRoutes from './modules/purchases/purchases.routes';
import returnsRoutes from './modules/returns/returns.routes';
import expenseRoutes from './modules/expenses/expenses.routes';
import accountsRoutes from './modules/accounts/accounts.routes';
import cashflowRoutes from './modules/cashflow/cashflow.routes';
import reportsRoutes from './modules/reports/reports.routes';
import usersRoutes from './modules/users/users.routes';
import settingsRoutes from './modules/settings/settings.routes';
import searchRoutes from './modules/search/search.routes';
import auditRoutes from './modules/audit/audit.routes';
import backupRoutes from './modules/backup/backup.routes';

export const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use('/api', apiLimiter);

app.get('/api/health', (_req, res) =>
  res.json({ success: true, message: 'GFC Fans API is running' })
);

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/returns', returnsRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/cashflow', cashflowRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/backup', backupRoutes);

app.use(errorHandler);