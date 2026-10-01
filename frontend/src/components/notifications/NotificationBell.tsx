import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Check, CheckCheck, Trash2, X,
  ShoppingCart, Package, AlertTriangle, DollarSign,
  Undo2, UserPlus, TrendingDown, TrendingUp, Clock,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { Badge } from '../ui/Badge';

export interface Notification {
  id: string;
  type: 'SALE' | 'PURCHASE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'PAYMENT_IN' | 'PAYMENT_OUT' | 'EXPENSE' | 'RETURN' | 'CUSTOMER' | 'SYSTEM';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  createdAt: string;
}

// ============================================================
// MOCK DATA — backend ready hone pe API se aayega
// ============================================================
const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'OUT_OF_STOCK', title: 'Out of Stock', message: 'Ceiling Fan 56" Deluxe is completely out of stock', link: '/inventory', isRead: false, priority: 'URGENT', createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
  { id: '2', type: 'SALE', title: 'New Sale', message: 'Invoice INV-000015 — Rs 7,000 (Ahmed Ali)', link: '/sales', isRead: false, priority: 'NORMAL', createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString() },
  { id: '3', type: 'LOW_STOCK', title: 'Low Stock Alert', message: 'Bracket Fan 24" is running low — only 3 left', link: '/inventory', isRead: false, priority: 'HIGH', createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString() },
  { id: '4', type: 'PAYMENT_IN', title: 'Payment Received', message: 'Rs 5,000 received from Bilal Ahmed (Cash)', link: '/customers', isRead: true, priority: 'NORMAL', createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
  { id: '5', type: 'PURCHASE', title: 'New Purchase', message: 'Purchase PUR-000008 — Rs 50,000 (Fan House Lahore)', link: '/purchases', isRead: true, priority: 'NORMAL', createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: '6', type: 'RETURN', title: 'Sales Return', message: 'Return SR-000003 — Rs 7,000 refunded', link: '/returns', isRead: true, priority: 'HIGH', createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
  { id: '7', type: 'EXPENSE', title: 'Expense Added', message: 'Electricity bill — Rs 5,000 (Cash)', link: '/expenses', isRead: true, priority: 'LOW', createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
  { id: '8', type: 'CUSTOMER', title: 'New Customer', message: 'Sadia Khan was added to customers', link: '/customers', isRead: true, priority: 'LOW', createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
];

const notifConfig: Record<Notification['type'], { icon: any; color: string; bg: string }> = {
  SALE:          { icon: ShoppingCart,  color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  PURCHASE:      { icon: Package,       color: 'text-blue-600 dark:text-blue-400',       bg: 'bg-blue-50 dark:bg-blue-950/40' },
  LOW_STOCK:     { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-950/40' },
  OUT_OF_STOCK:  { icon: AlertTriangle, color: 'text-red-600 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-950/40' },
  PAYMENT_IN:    { icon: TrendingUp,    color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  PAYMENT_OUT:   { icon: TrendingDown,  color: 'text-red-600 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-950/40' },
  EXPENSE:       { icon: DollarSign,    color: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-950/40' },
  RETURN:        { icon: Undo2,         color: 'text-purple-600 dark:text-purple-400',   bg: 'bg-purple-50 dark:bg-purple-950/40' },
  CUSTOMER:      { icon: UserPlus,      color: 'text-indigo-600 dark:text-indigo-400',   bg: 'bg-indigo-50 dark:bg-indigo-950/40' },
  SYSTEM:        { icon: Bell,          color: 'text-ink-secondary',                     bg: 'bg-surface-hover' },
};

const timeAgo = (dateStr: string) => {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' });
};

export const NotificationBell = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const filtered = filter === 'all' ? notifications : notifications.filter((n) => !n.isRead);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Close on Escape
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    if (open) document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open]);

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => setNotifications([]);

  const handleClick = (n: Notification) => {
    markAsRead(n.id);
    if (n.link) {
      navigate(n.link);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'relative p-2 rounded-md transition-colors',
          open
            ? 'text-brand-600 bg-brand-50 dark:bg-brand-950/40'
            : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-hover'
        )}
        title="Notifications"
      >
        <Bell className="w-4 h-4" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-full right-0 mt-2 w-[420px] bg-surface-card border border-edge-base rounded-xl shadow-2xl z-[1050] animate-scale-in overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-edge-base bg-surface-cardAlt">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-ink-primary">Notifications</h3>
                {unreadCount > 0 && <Badge variant="red">{unreadCount} new</Badge>}
              </div>
              {notifications.length > 0 && (
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1 px-2 py-1 rounded hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-3 h-3" /> Mark all read
                    </button>
                  )}
                  <button
                    onClick={clearAll}
                    className="text-xs text-ink-muted hover:text-danger px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    title="Clear all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilter('all')}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded transition-colors',
                  filter === 'all' ? 'bg-brand-600 text-white' : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-hover'
                )}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded transition-colors',
                  filter === 'unread' ? 'bg-brand-600 text-white' : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-hover'
                )}
              >
                Unread ({unreadCount})
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[480px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-14 h-14 rounded-full bg-surface-hover flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6 text-ink-muted" />
                </div>
                <p className="text-sm font-medium text-ink-primary">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                </p>
                <p className="text-xs text-ink-muted mt-1">
                  {filter === 'unread' ? "You're all caught up!" : 'Notifications will appear here'}
                </p>
              </div>
            ) : (
              filtered.map((n) => {
                const cfg = notifConfig[n.type] || notifConfig.SYSTEM;
                const Icon = cfg.icon;
                return (
                  <div
                    key={n.id}
                    className={cn(
                      'group relative px-4 py-3 border-b border-edge-light hover:bg-surface-hover transition-colors cursor-pointer',
                      !n.isRead && 'bg-blue-50/40 dark:bg-blue-950/20'
                    )}
                    onClick={() => handleClick(n)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', cfg.bg)}>
                        <Icon className={cn('w-4 h-4', cfg.color)} strokeWidth={2} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className={cn('text-sm truncate text-ink-primary', n.isRead ? 'font-medium' : 'font-bold')}>
                            {n.title}
                          </p>
                          {!n.isRead && <span className="w-2 h-2 rounded-full bg-brand-600 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-ink-secondary line-clamp-2 mb-1">{n.message}</p>
                        <div className="flex items-center gap-2 text-[10px] text-ink-muted">
                          <Clock className="w-3 h-3" />
                          <span>{timeAgo(n.createdAt)}</span>
                          {n.priority === 'URGENT' && (
                            <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded font-semibold">URGENT</span>
                          )}
                          {n.priority === 'HIGH' && (
                            <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded font-semibold">HIGH</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!n.isRead && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                            className="p-1 text-ink-muted hover:text-brand-600 rounded hover:bg-brand-50 dark:hover:bg-brand-950/40"
                            title="Mark as read"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                          className="p-1 text-ink-muted hover:text-danger rounded hover:bg-red-50 dark:hover:bg-red-950/40"
                          title="Delete"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-edge-base bg-surface-cardAlt text-center">
              <p className="text-[10px] text-ink-muted">
                {notifications.length} total · {unreadCount} unread
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};