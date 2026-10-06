import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MoreVertical, Eye, Printer, Undo2, Download } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, Card, Input, Select, Table, Badge, Pagination, Empty, Dropdown } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { formatMoney, formatDateTime } from '../lib/format';
import { exportCSV, csvFilename } from '../lib/csv';
import type { Column } from '../components/ui';

export default function Sales() {
  const nav = useNavigate();
  const toast = useToast();
  const [data, setData] = useState<any>({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/sales', { params: { search, paymentMethod: method, page, pageSize: 20 } })
      .then((r) => setData(unwrap(r)))
      .finally(() => setLoading(false));
  }, [page, search, method]);

  const handleExport = () => {
    exportCSV(data.items, [
      { key: 'invoiceNumber', header: 'Invoice #' },
      { key: 'customer', header: 'Customer', value: (r: any) => r.customer?.name || 'Walk-in' },
      { key: 'saleDate', header: 'Date & Time', value: (r: any) => formatDateTime(r.saleDate) },
      { key: 'items', header: 'Items', value: (r: any) => r.items.length },
      { key: 'subtotal', header: 'Subtotal', value: (r: any) => r.subtotal ?? 0 },
      { key: 'discount', header: 'Discount', value: (r: any) => r.discount ?? 0 },
      { key: 'total', header: 'Total' },
      { key: 'paid', header: 'Paid' },
      { key: 'due', header: 'Due' },
      { key: 'paymentMethod', header: 'Method' },
    ], csvFilename('sales'));
    toast.success('Exported');
  };

  const columns: Column<any>[] = [
    { key: 'inv', header: 'Invoice #', render: (r) => <span className="font-mono text-xs">{r.invoiceNumber}</span> },
    { key: 'customer', header: 'Customer', render: (r) => r.customer?.name || 'Walk-in' },
    { key: 'date', header: 'Date & Time', render: (r) => <span className="text-xs text-ink-secondary">{formatDateTime(r.saleDate)}</span> },
    { key: 'items', header: 'Items', align: 'center', render: (r) => r.items.length },

    // Subtotal column
    { key: 'subtotal', header: 'Subtotal', align: 'right', render: (r) => (
      <span className="text-ink-secondary">Rs {formatMoney(r.subtotal ?? 0)}</span>
    )},

    // Discount column
    { key: 'discount', header: 'Discount', align: 'right', render: (r) => (
      Number(r.discount) > 0
        ? <span className="text-rose-600 font-medium">− Rs {formatMoney(r.discount)}</span>
        : <span className="text-ink-muted">—</span>
    )},

    { key: 'total', header: 'Total', align: 'right', render: (r) => <span className="font-medium">Rs {formatMoney(r.total)}</span> },
    { key: 'paid', header: 'Paid', align: 'right', render: (r) => <span className="text-emerald-600">Rs {formatMoney(r.paid)}</span> },
    { key: 'due', header: 'Due', align: 'right', render: (r) => <span className={r.due > 0 ? 'text-amber-600 font-medium' : 'text-ink-muted'}>Rs {formatMoney(r.due)}</span> },
    { key: 'method', header: 'Method', render: (r) => <Badge variant="blue">{r.paymentMethod}</Badge> },
    { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'COMPLETED' ? 'green' : 'gray'} dot>{r.status}</Badge> },
    { key: 'actions', header: '', align: 'right', render: (r) => (
      <Dropdown trigger={<button className="p-1 text-ink-muted hover:text-ink-primary rounded hover:bg-surface-hover"><MoreVertical className="w-4 h-4" /></button>}>
        <Dropdown.Item icon={<Eye className="w-3.5 h-3.5" />} onClick={() => nav(`/sales/${r.id}`)}>View</Dropdown.Item>
        <Dropdown.Item icon={<Printer className="w-3.5 h-3.5" />} onClick={() => nav(`/sales/${r.id}?print=1`)}>Print</Dropdown.Item>
        <Dropdown.Item icon={<Undo2 className="w-3.5 h-3.5" />} onClick={() => nav(`/returns?type=SALES&saleId=${r.id}`)}>Return</Dropdown.Item>
      </Dropdown>
    )},
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Sales" subtitle={`${data.total} invoices`}
        actions={<>
          <Button variant="outline" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExport}>Export CSV</Button>
          <Button icon={<Plus className="w-3.5 h-3.5" />} onClick={() => nav('/pos')}>New Sale</Button>
        </>} />

      <Card padding="none" className="mb-4">
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="Search invoice, customer…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} leftIcon={<Search className="w-3.5 h-3.5" />} />
          <Select value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }}>
            <option value="">All Payment Methods</option>
            <option value="CASH">Cash</option>
            <option value="BANK">Bank</option>
            <option value="CARD">Card</option>
            <option value="CREDIT">Credit</option>
            <option value="MIXED">Mixed</option>
          </Select>
        </div>
      </Card>

      <Card padding="none">
        <Table columns={columns} data={data.items} loading={loading} empty={<Empty title="No sales yet" />} />
        {data.total > 20 && <Pagination page={page} total={data.total} pageSize={20} onChange={setPage} />}
      </Card>
    </div>
  );
}