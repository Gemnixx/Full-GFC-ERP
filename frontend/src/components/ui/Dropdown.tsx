import { ReactNode, useEffect, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';

export const Dropdown = ({ trigger, children, align = 'right' }: { trigger: ReactNode; children: ReactNode; align?: 'left' | 'right' }) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; right: number; openUp: boolean }>({
    top: 0, left: 0, right: 0, openUp: false,
  });
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
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

  // Calculate position when opening
  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const menuHeight = 240; // approx
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight && rect.top > menuHeight;

    setPosition({
      top: openUp ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      right: window.innerWidth - rect.right,
      openUp,
    });
  }, [open]);

  return (
    <>
      <div className="relative inline-block" ref={ref}>
        <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      </div>

      {open && typeof window !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className="fixed min-w-[180px] bg-surface-card border border-edge-base rounded-md shadow-lg py-1 z-[9999] animate-scale-in"
          style={{
            top: position.openUp ? 'auto' : position.top,
            bottom: position.openUp ? window.innerHeight - position.top : 'auto',
            left: align === 'left' ? position.left : 'auto',
            right: align === 'right' ? position.right : 'auto',
          }}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>,
        document.body
      )}
    </>
  );
};

Dropdown.Item = ({ children, onClick, danger, icon }: { children: ReactNode; onClick?: () => void; danger?: boolean; icon?: ReactNode }) => (
  <button onClick={onClick} className={cn('w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2.5', danger ? 'text-danger hover:bg-red-50 dark:hover:bg-red-950/40' : 'text-ink-primary hover:bg-surface-hover')}>
    {icon}
    {children}
  </button>
);