import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Sales from './pages/Sales';
import SaleDetail from './pages/SaleDetail';
import Purchases from './pages/Purchases';
import PurchaseDetail from './pages/PurchaseDetail';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Inventory from './pages/Inventory';
import StockMovements from './pages/StockMovements';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Suppliers from './pages/Suppliers';
import SupplierDetail from './pages/SupplierDetail';
import Returns from './pages/Returns';
import Accounts from './pages/Accounts';
import CashFlow from './pages/CashFlow';
import Expenses from './pages/Expenses';
import ProfitLoss from './pages/ProfitLoss';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';
import AuditLog from './pages/AuditLog';

const Protected = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-gray-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><AppLayout /></Protected>}>
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="dashboard" element={
          <ProtectedRoute permission="DASHBOARD_VIEW"><Dashboard /></ProtectedRoute>
        } />

        <Route path="pos" element={
          <ProtectedRoute permission="POS_USE"><POS /></ProtectedRoute>
        } />

        <Route path="sales" element={
          <ProtectedRoute permission="SALES_VIEW"><Sales /></ProtectedRoute>
        } />
        <Route path="sales/:id" element={
          <ProtectedRoute permission="SALES_VIEW"><SaleDetail /></ProtectedRoute>
        } />

        <Route path="purchases" element={
          <ProtectedRoute permission="PURCHASES_VIEW"><Purchases /></ProtectedRoute>
        } />
        <Route path="purchases/:id" element={
          <ProtectedRoute permission="PURCHASES_VIEW"><PurchaseDetail /></ProtectedRoute>
        } />

        <Route path="products" element={
          <ProtectedRoute permission="PRODUCTS_VIEW"><Products /></ProtectedRoute>
        } />
        <Route path="products/:id" element={
          <ProtectedRoute permission="PRODUCTS_VIEW"><ProductDetail /></ProtectedRoute>
        } />

        <Route path="inventory" element={
          <ProtectedRoute permission="INVENTORY_VIEW"><Inventory /></ProtectedRoute>
        } />
        <Route path="inventory/movements" element={
          <ProtectedRoute permission="INVENTORY_VIEW"><StockMovements /></ProtectedRoute>
        } />

        <Route path="customers" element={
          <ProtectedRoute permission="CUSTOMERS_VIEW"><Customers /></ProtectedRoute>
        } />
        <Route path="customers/:id" element={
          <ProtectedRoute permission="CUSTOMERS_VIEW"><CustomerDetail /></ProtectedRoute>
        } />

        <Route path="suppliers" element={
          <ProtectedRoute permission="SUPPLIERS_VIEW"><Suppliers /></ProtectedRoute>
        } />
        <Route path="suppliers/:id" element={
          <ProtectedRoute permission="SUPPLIERS_VIEW"><SupplierDetail /></ProtectedRoute>
        } />

        <Route path="returns" element={
          <ProtectedRoute permission="RETURNS_VIEW"><Returns /></ProtectedRoute>
        } />

        <Route path="accounts" element={
          <ProtectedRoute permission="ACCOUNTS_VIEW"><Accounts /></ProtectedRoute>
        } />
        <Route path="cashflow" element={
          <ProtectedRoute permission="CASHFLOW_VIEW"><CashFlow /></ProtectedRoute>
        } />

        <Route path="expenses" element={
          <ProtectedRoute permission="EXPENSES_VIEW"><Expenses /></ProtectedRoute>
        } />

        <Route path="profit-loss" element={
          <ProtectedRoute permission="REPORTS_VIEW"><ProfitLoss /></ProtectedRoute>
        } />
        <Route path="reports" element={
          <ProtectedRoute permission="REPORTS_VIEW"><Reports /></ProtectedRoute>
        } />

        <Route path="users" element={
          <ProtectedRoute permission="USERS_VIEW"><Users /></ProtectedRoute>
        } />

        <Route path="settings" element={
          <ProtectedRoute permission="SETTINGS_VIEW"><Settings /></ProtectedRoute>
        } />

        <Route path="audit" element={
          <ProtectedRoute permission="USERS_VIEW"><AuditLog /></ProtectedRoute>
        } />
      </Route>
    </Routes>
  );
}