import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export const Pagination = ({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) => {
  const pages = Math.max(Math.ceil(total / pageSize), 1);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-edge-base">
      <span className="text-xs text-ink-secondary">Showing <strong className="text-ink-primary">{from}–{to}</strong> of <strong className="text-ink-primary">{total}</strong></span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)} icon={<ChevronLeft className="w-3.5 h-3.5" />}>Previous</Button>
        <span className="px-3 text-xs text-ink-secondary">Page {page} of {pages}</span>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)} iconRight={<ChevronRight className="w-3.5 h-3.5" />}>Next</Button>
      </div>
    </div>
  );
};