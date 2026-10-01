import { useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Wallet, Download } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, Table, StatCard, Badge, Tabs, Empty, Button, Input, Select } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { formatMoney, formatDate } from '../lib/format';
import { exportCSV, csvFilename } from '../lib/csv';
import type { Column } from '../components/ui';

type Period = 'today' | 'week' | 'month' | 'custom';

export default function CashFlow() {
  const toast = useToast();
  const [data, setData] = useState<any>({ items: [], summary: {}, total: 0 });
  const [period, setPeriod] = useState<Period>('month');
  const [method, setMethod] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);

  const buildParams = () => {
    const p: any = { method };
    const now = new Date();
    if (period === 'today') {
      p.from = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      p.to = now.toISOString();
    } else if (period === 'week') {
      const s = new Date(); s.setDate(s.getDate() - 6); s.setHours(0, 0, 0, 0);
      p.from = s.toISOString(); p.to = now.toISOString();
    } else if (period === 'month') {
      const s = new Date(); s.setDate(1); s.setHours(0, 0, 0, 0);
      p.from = s.toISOString(); p.to = now.toISOString();
    } else {
      if (from) p.from = new Date(from).toISOString();
      if (to) p.to = new Date(to + 'T23:59:59').toISOString();
    }
    return p;
  };

  useEffect(() => {
    setLoading(true);
    api.get('/cashflow', { params: buildParams() })
      .then((r) => setData(unwrap(r))).finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [period, method, from, to]);

  const handleExport = () => {
    exportCSV(data.items, [
      { key: 'date', header: 'Date', value: (r: any) => formatDate(r.date) },
      { key: 'description', header: 'Description' },
      { key: 'reference', header: 'Reference' },
      { key: 'method', header: 'Method' },
      { key: 'in', header: 'In', value: (r: any) => r.type === 'IN' ? r.amount : '' },
      { key: 'out', header: 'Out', value: (r: any) => r.type === 'OUT' ? r.amount : '' },
      { key: 'balance', header: 'Balance' },
    ], csvFilename('cashflow'));
    toast.success('Exported');
  };

  const columns: Column<any>[] = [
    { key: 'date', header: 'Date', render: (r) => <span className="text-xs text-ink-secondary">{formatDate(r.date)}</span> },
    { key: 'desc', header: 'Description', render: (r) => r.description },
    { key: 'ref', header: 'Reference', render: (r) => <span className="font-mono text-xs text-ink-secondary">{r.reference || '—'}</span> },
    { key: 'method', header: 'Method', render: (r) => <Badge variant="blue">{r.method}</Badge> },
    { key: 'in', header: 'In', align: 'right', render: (r) => r.type === 'IN'
      ? <span className="text-emerald-600 font-medium">+ Rs {formatMoney(r.amount)}</span>
      : <span className="text-ink-muted">—</span> },
    { key: 'out', header: 'Out', align: 'right', render: (r) => r.type === 'OUT'
      ? <span className="text-red-600 font-medium">− Rs {formatMoney(r.amount)}</span>
      : <span className="text-ink-muted">—</span> },
    { key: 'balance', header: 'Balance', align: 'right', render: (r) => <span className="font-medium">Rs {formatMoney(r.balance)}</span> },
  ];

  const s = data.summary;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Cash Flow" subtitle="Money in and out of the business"
        actions={<Button variant="outline" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExport}>Export CSV</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Opening Balance" value={`Rs ${formatMoney(s?.openingBalance)}`} accent="gray" icon={<Wallet className="w-4 h-4" />} />
        <StatCard label="Money In" value={`Rs ${formatMoney(s?.moneyIn)}`} accent="success" icon={<ArrowDownCircle className="w-4 h-4" />} />
        <StatCard label="Money Out" value={`Rs ${formatMoney(s?.moneyOut)}`} accent="danger" icon={<ArrowUpCircle className="w-4 h-4" />} />
        <StatCard label="Closing Balance" value={`Rs ${formatMoney(s?.closingBalance)}`} accent="brand" />
      </div>

      <Card padding="none" className="mb-4">
        <div className="p-4 flex flex-wrap gap-3 items-center justify-between">
          <Tabs value={period} onChange={(v) => setPeriod(v as Period)} size="sm"
            options={[
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'This Week' },
              { value: 'month', label: 'This Month' },
              { value: 'custom', label: 'Custom' },
            ]} />
          <div className="flex gap-3">
            {period === 'custom' && (
              <>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
              </>
            )}
            <Select value={method} onChange={(e) => setMethod(e.target.value)} className="w-40">
              <option value="">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank</option>
              <option value="CARD">Card</option>
            </Select>
          </div>
        </div>
      </Card>

      <Card padding="none">
        <Table columns={columns} data={data.items} loading={loading} empty={<Empty title="No cash flow transactions" />} />
      </Card>
    </div>
  );
}