import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Receipt, Package, Box, Layers,
  Users, Factory, Undo2, Wallet, TrendingUp, TrendingDown,
  BarChart3, FileText, Shield, Settings as SettingsIcon,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { AppIcon } from '../ui/AppIcon';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: any;
  permission?: string;
  section?: string;
}

const navItems: NavItem[] = [
  { section: 'MAIN', to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'DASHBOARD_VIEW' },
  { to: '/pos', label: 'POS / New Sale', icon: ShoppingCart, permission: 'POS_USE' },

  { section: 'OPERATIONS', to: '/sales', label: 'Sales', icon: Receipt, permission: 'SALES_VIEW' },
  { to: '/purchases', label: 'Purchases', icon: Package, permission: 'PURCHASES_VIEW' },
  { to: '/products', label: 'Products', icon: Box, permission: 'PRODUCTS_VIEW' },
  { to: '/inventory', label: 'Inventory', icon: Layers, permission: 'INVENTORY_VIEW' },
  { to: '/customers', label: 'Customers', icon: Users, permission: 'CUSTOMERS_VIEW' },
  { to: '/suppliers', label: 'Suppliers', icon: Factory, permission: 'SUPPLIERS_VIEW' },
  { to: '/returns', label: 'Returns', icon: Undo2, permission: 'RETURNS_VIEW' },

  { section: 'FINANCE', to: '/accounts', label: 'Accounts', icon: Wallet, permission: 'ACCOUNTS_VIEW' },
  { to: '/cashflow', label: 'Cash Flow', icon: TrendingUp, permission: 'CASHFLOW_VIEW' },
  { to: '/expenses', label: 'Expenses', icon: TrendingDown, permission: 'EXPENSES_VIEW' },
  { to: '/profit-loss', label: 'Profit & Loss', icon: BarChart3, permission: 'REPORTS_VIEW' },
  { to: '/reports', label: 'Reports', icon: FileText, permission: 'REPORTS_VIEW' },

  { section: 'ADMIN', to: '/users', label: 'Users & Roles', icon: Shield, permission: 'USERS_VIEW' },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, permission: 'SETTINGS_VIEW' },
];

export const Sidebar = () => {
  const { hasPermission } = useAuth();
  let lastSection = '';

  const visibleItems = navItems.filter((item) => !item.permission || hasPermission(item.permission));

  return (
    <aside className="w-60 bg-sidebar-bg flex flex-col h-screen overflow-y-auto no-print">
      <div className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
            <img
              src="/logo.svg"
              alt="GFC"
              className="w-full h-full object-contain"
              onError={(e: any) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<span class="text-brand-600 font-bold text-sm">G</span>';
              }}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">GFC Fans Outlet</p>
            <p className="text-[10px] text-sidebar-textMuted">Management System</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {visibleItems.map((item) => {
          const showSection = item.section && item.section !== lastSection;
          if (item.section) lastSection = item.section;
          return (
            <div key={item.to}>
              {showSection && (
                <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold text-sidebar-textMuted tracking-wider uppercase">
                  {item.section}
                </p>
              )}
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all',
                    isActive
                      ? 'bg-sidebar-activeBg text-sidebar-textActive shadow-sm'
                      : 'text-sidebar-text hover:bg-sidebar-bgHover hover:text-white'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <AppIcon icon={item.icon} size={16} filled={isActive} />
                    {item.label}
                  </>
                )}
              </NavLink>
            </div>
          );
        })}
      </nav>
    </aside>
  );
};