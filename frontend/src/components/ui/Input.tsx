import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, hint, leftIcon, className, ...rest }, ref) => (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-ink-secondary mb-1.5">{label}</label>}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-3 py-2 bg-surface-input border rounded-md text-sm text-ink-primary',
            'placeholder:text-ink-muted',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500',
            error ? 'border-danger' : 'border-edge-base',
            leftIcon && 'pl-9',
            className
          )}
          {...rest}
        />
      </div>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
      {hint && !error && <p className="text-xs text-ink-muted mt-1">{hint}</p>}
    </div>
  )
);
Input.displayName = 'Input';