import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T, index: number) => ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: keyof T | ((row: T) => string);
  empty?: ReactNode;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
  stickyHeader?: boolean;
}

export function Table<T extends Record<string, any>>({
  columns, data, keyField = 'id', empty, loading, onRowClick, rowClassName, stickyHeader,
}: Props<T>) {
  const getKey = (row: T, i: number) =>
    typeof keyField === 'function' ? keyField(row) : String(row[keyField] ?? i);

  if (loading) return <div className="py-16 text-center text-sm text-ink-muted">Loading…</div>;
  if (data.length === 0) return <>{empty ?? <div className="py-16 text-center text-sm text-ink-muted">No records found</div>}</>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className={cn('border-b border-edge-base bg-surface-cardAlt', stickyHeader && 'sticky top-0 z-10')}>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width }} className={cn('px-4 py-3 text-xs font-semibold text-ink-secondary uppercase tracking-wider', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', (!c.align || c.align === 'left') && 'text-left')}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-edge-light">
          {data.map((row, i) => (
            <tr key={getKey(row, i)} onClick={() => onRowClick?.(row)} className={cn('transition-colors hover:bg-surface-hover', onRowClick && 'cursor-pointer', rowClassName?.(row))}>
              {columns.map((c) => (
                <td key={c.key} className={cn('px-4 py-3 text-ink-primary', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center')}>
                  {c.render(row, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}