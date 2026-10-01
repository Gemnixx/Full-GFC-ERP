import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Accent = 'brand' | 'success' | 'warning' | 'danger' | 'gray';

const accents: Record<Accent, string> = {
  brand: 'text-brand-600 dark:text-brand-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
  gray: 'text-ink-primary',
};

export const StatCard = ({ label, value, hint, accent = 'brand', icon, trend, className }: {
  label: string; value: string | number; hint?: string; accent?: Accent;
  icon?: ReactNode; trend?: { value: string; up?: boolean }; className?: string;
}) => (
  <div className={cn('bg-surface-card border border-edge-base rounded-lg p-5 shadow-xs transition-shadow hover:shadow-sm', className)}>
    <div className="flex items-start justify-between mb-2">
      <p className="text-xs font-medium text-ink-secondary">{label}</p>
      {icon && <span className="text-ink-muted">{icon}</span>}
    </div>
    <div className="flex items-baseline gap-2">
      <p className={cn('text-2xl font-bold tracking-tight', accents[accent])}>{value}</p>
      {trend && <span className={cn('text-xs font-medium', trend.up ? 'text-emerald-600' : 'text-red-600')}>{trend.up ? '↑' : '↓'} {trend.value}</span>}
    </div>
    {hint && <p className="text-xs text-ink-muted mt-1.5">{hint}</p>}
  </div>
);