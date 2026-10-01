import { useEffect, useState } from 'react';
import { Wallet, Building2, TrendingUp, TrendingDown } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, Table, StatCard, Badge, Loader } from '../components/ui';
import { formatMoney, formatDate } from '../lib/format';
import { cn } from '../lib/cn';
import type { Column } from '../components/ui';

export default function Accounts() {
  const [summary, setSummary] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    api.get('/accounts/summary').then((r) => {
      const d = unwrap(r);
      setSummary(d);
      if (d.accounts?.length) setSelected(d.accounts[0]);
    });
  }, []);

  useEffect(() => {
    if (selected) {
      api.get(`/accounts/${selected.id}/transactions`, { params: { pageSize: 200 } })
        .then((r) => setTransactions(unwrap(r).items));
    }
  }, [selected]);

  if (!summary) return <div className="p-6"><Loader /></div>;

  const columns: Column<any>[] = [
    { key: 'date', header: 'Date', render: (r) => <span className="text-xs text-ink-secondary">{formatDate(r.date)}</span> },
    { key: 'desc', header: 'Description', render: (r) => r.description },
    { key: 'ref', header: 'Reference', render: (r) => <span className="font-mono text-xs">{r.reference || '—'}</span> },
    { key: 'debit', header: 'Debit', align: 'right', render: (r) => r.debit > 0 ? <span className="text-emerald-600 font-medium">Rs {formatMoney(r.debit)}</span> : <span className="text-ink-muted">—</span> },
    { key: 'credit', header: 'Credit', align: 'right', render: (r) => r.credit > 0 ? <span className="text-red-600 font-medium">Rs {formatMoney(r.credit)}</span> : <span className="text-ink-muted">—</span> },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Accounts" subtitle="Chart of accounts and financial position" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Cash Balance" value={`Rs ${formatMoney(summary.cashBalance)}`} accent="success" icon={<Wallet className="w-4 h-4" />} />
        <StatCard label="Bank Balance" value={`Rs ${formatMoney(summary.bankBalance)}`} accent="brand" icon={<Building2 className="w-4 h-4" />} />
        <StatCard label="Receivables" value={`Rs ${formatMoney(summary.receivables)}`} accent="warning" icon={<TrendingUp className="w-4 h-4" />} />
        <StatCard label="Payables" value={`Rs ${formatMoney(summary.payables)}`} accent="danger" icon={<TrendingDown className="w-4 h-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card padding="sm" className="lg:col-span-1">
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider px-2 py-2">Chart of Accounts</p>
          <div className="space-y-0.5">
            {summary.accounts.map((acc: any) => (
              <button key={acc.id} onClick={() => setSelected(acc)}
                className={cn('w-full text-left px-3 py-2 rounded-md transition-colors', selected?.id === acc.id ? 'bg-brand-50 dark:bg-brand-950/40' : 'hover:bg-surface-hover')}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className={cn('text-sm font-medium truncate', selected?.id === acc.id ? 'text-brand-700 dark:text-brand-300' : 'text-ink-primary')}>{acc.name}</p>
                    <p className="text-xs text-ink-secondary font-mono">{acc.code}</p>
                  </div>
                  <Badge variant={
                    acc.type === 'ASSET' ? 'blue' : acc.type === 'LIABILITY' ? 'red' :
                    acc.type === 'REVENUE' ? 'green' : acc.type === 'EQUITY' ? 'purple' : 'amber'
                  }>{acc.type}</Badge>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <div className="lg:col-span-3">
          {selected && (
            <Card padding="none">
              <div className="p-4 border-b border-edge-base flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-semibold text-ink-primary">{selected.name}</h3>
                  <p className="text-xs text-ink-secondary">Account {selected.code} · {selected.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-ink-secondary">Current Balance</p>
                  <p className="text-lg font-bold text-brand-600 dark:text-brand-400">Rs {formatMoney(selected.balance)}</p>
                </div>
              </div>
              <Table columns={columns} data={transactions} empty={<div className="py-12 text-center text-sm text-ink-muted">No transactions in this account</div>} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}