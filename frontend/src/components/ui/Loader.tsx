import { Loader2 } from 'lucide-react';

export const Loader = ({ label = 'Loading…' }: { label?: string }) => (
  <div className="flex flex-col items-center justify-center py-16">
    <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
    <p className="text-xs text-ink-secondary mt-3">{label}</p>
  </div>
);