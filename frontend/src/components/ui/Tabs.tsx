import { cn } from '../../lib/cn';

interface Props<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  size?: 'sm' | 'md';
}

export function Tabs<T extends string>({ value, onChange, options, size = 'md' }: Props<T>) {
  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm';
  return (
    <div className="inline-flex items-center gap-1 bg-surface-hover rounded-md p-1">
      {options.map((opt) => (
        <button key={opt.value} onClick={() => onChange(opt.value)} className={cn('rounded font-medium transition-all', pad, value === opt.value ? 'bg-surface-card text-brand-600 dark:text-brand-400 shadow-xs' : 'text-ink-secondary hover:text-ink-primary')}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}