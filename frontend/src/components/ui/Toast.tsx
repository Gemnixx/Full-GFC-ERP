import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../../lib/cn';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface Ctx {
  toast: (t: Omit<Toast, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastCtx = createContext<Ctx>({} as Ctx);

const config: Record<ToastType, { icon: any; border: string; text: string }> = {
  success: { icon: CheckCircle2, border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-600' },
  error: { icon: AlertCircle, border: 'border-red-200 dark:border-red-800', text: 'text-red-600' },
  warning: { icon: AlertTriangle, border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-600' },
  info: { icon: Info, border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-600' },
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { ...t, id }]);
      setTimeout(() => remove(id), t.duration || 4000);
    },
    [remove]
  );

  const api: Ctx = {
    toast,
    success: (title, description) => toast({ type: 'success', title, description }),
    error: (title, description) => toast({ type: 'error', title, description, duration: 6000 }),
    warning: (title, description) => toast({ type: 'warning', title, description }),
    info: (title, description) => toast({ type: 'info', title, description }),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[1080] space-y-2 max-w-sm no-print">
        {toasts.map((t) => {
          const c = config[t.type];
          const Icon = c.icon;
          return (
            <div
              key={t.id}
              className={cn(
                'flex items-start gap-3 p-3.5 rounded-lg border shadow-lg bg-surface-card animate-slide-in-right',
                c.border
              )}
            >
              <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', c.text)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-primary">{t.title}</p>
                {t.description && <p className="text-xs text-ink-secondary mt-0.5">{t.description}</p>}
              </div>
              <button onClick={() => remove(t.id)} className="text-ink-muted hover:text-ink-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
};

export const useToast = () => useContext(ToastCtx);