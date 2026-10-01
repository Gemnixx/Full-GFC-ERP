import { PackageOpen } from 'lucide-react';
import { ReactNode } from 'react';

export const Empty = ({ title = 'No records found', description, action, icon }: { title?: string; description?: string; action?: ReactNode; icon?: ReactNode }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4">
    <div className="w-14 h-14 rounded-full bg-surface-hover flex items-center justify-center mb-3">
      {icon || <PackageOpen className="w-6 h-6 text-ink-muted" />}
    </div>
    <p className="text-sm font-medium text-ink-primary">{title}</p>
    {description && <p className="text-xs text-ink-secondary mt-1 text-center max-w-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);