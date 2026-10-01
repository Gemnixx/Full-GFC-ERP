import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/cn';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, Props>(
  ({ label, error, className, children, ...rest }, ref) => (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-ink-secondary mb-1.5">{label}</label>}
      <select
        ref={ref}
        className={cn(
          'w-full px-3 py-2 bg-surface-input border rounded-md text-sm text-ink-primary',
          'appearance-none cursor-pointer',
          "bg-[url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2364748B' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E\")] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-9",
          'transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500',
          error ? 'border-danger' : 'border-edge-base',
          className
        )}
        {...rest}
      >
        {children}
      </select>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  )
);
Select.displayName = 'Select';
