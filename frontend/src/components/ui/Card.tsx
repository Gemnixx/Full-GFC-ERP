import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface Props {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = ({ children, className, padding = 'md' }: Props) => {
  const pad = { none: '', sm: 'p-3', md: 'p-5', lg: 'p-6' }[padding];
  return (
    <div className={cn('bg-surface-card border border-edge-base rounded-lg shadow-xs', pad, className)}>
      {children}
    </div>
  );
};

Card.Header = ({ title, subtitle, action, icon }: { title: string; subtitle?: string; action?: ReactNode; icon?: ReactNode }) => (
  <div className="flex items-start justify-between mb-4">
    <div className="flex items-start gap-2.5">
      {icon && <span className="text-ink-muted mt-0.5">{icon}</span>}
      <div>
        <h3 className="text-sm font-semibold text-ink-primary">{title}</h3>
        {subtitle && <p className="text-xs text-ink-secondary mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);