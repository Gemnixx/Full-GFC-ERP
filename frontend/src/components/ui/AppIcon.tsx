import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

export const AppIcon = ({ icon: Icon, size = 16, filled, className }: { icon: LucideIcon; size?: number; filled?: boolean; className?: string }) => (
  <Icon size={size} strokeWidth={filled ? 0 : 1.75} fill={filled ? 'currentColor' : 'none'} className={cn('transition-all', className)} />
);