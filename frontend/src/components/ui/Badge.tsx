import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'gray' | 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'indigo';

const variants: Record<Variant, string> = {
  gray: 'bg-surface-hover text-ink-secondary',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  red: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  purple: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
};

export const Badge = ({ children, variant = 'gray', dot, className }: { children: ReactNode; variant?: Variant; dot?: boolean; className?: string }) => (
  <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
    {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
    {children}
  </span>
);