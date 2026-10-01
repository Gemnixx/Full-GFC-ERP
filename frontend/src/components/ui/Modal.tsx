import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const sizes = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-5xl', '2xl': 'max-w-6xl' };

export const Modal = ({ open, onClose, title, subtitle, children, footer, size = 'md' }: Props) => {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[1050] no-print animate-fade-in" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={cn('bg-surface-card rounded-xl w-full max-h-[92vh] flex flex-col shadow-xl border border-edge-base animate-scale-in', sizes[size])}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-edge-base">
          <div>
            <h2 className="text-base font-semibold text-ink-primary">{title}</h2>
            {subtitle && <p className="text-xs text-ink-secondary mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink-primary p-1 -m-1 rounded hover:bg-surface-hover transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-edge-base bg-surface-cardAlt rounded-b-xl flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};