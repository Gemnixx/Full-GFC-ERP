import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, Card, Select, Table, Badge, Pagination, Empty } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { formatMoney, formatDateTime } from '../lib/format';
import { exportCSV, csvFilename } from '../lib/csv';
import type { Column } from '../components/ui';

export default function StockMovements() {
  const toast = useToast();
  const [data, setData] = useState<any>({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/inventory/movements', { params: { type, page, pageSize: 50 } })
      .then((r) => setData(unwrap(r))).finally(() => setLoading(false));
  }, [type, page]);

  const handleExport = () => {
    exportCSV(data.items, [
      { key: 'date', header: 'Date', value: (r: any) => formatDateTime(r.createdAt) },
      { key: 'product', header: 'Product', value: (r: any) => r.product.name },
      { key: 'type', header: 'Type' },
      { key: 'reference', header: 'Reference' },
      { key: 'quantity', header: 'Quantity' },
      { key: 'balance', header: 'Balance' },
    ], csvFilename('stock-movements'));
    toast.success('Exported');
  };

  const columns: Column<any>[] = [
    { key: 'date', header: 'Date', render: (r) => <span className="text-xs text-ink-secondary">{formatDateTime(r.createdAt)}</span> },
    { key: 'product', header: 'Product', render: (r) => (
      <Link to={`/products/${r.productId}`} className="hover:text-brand-600">
        <p className="font-medium text-sm">{r.product.name}</p>
        <p className="text-xs text-ink-secondary">{r.product.model || '—'}</p>
      </Link>
    )},
    { key: 'type', header: 'Type', render: (r) => <Badge variant={
      r.type === 'PURCHASE' ? 'blue' : r.type === 'SALE' ? 'green' :
      r.type === 'ADJUSTMENT' ? 'amber' : r.type === 'SALES_RETURN' ? 'purple' : 'red'
    }>{r.type}</Badge> },
    { key: 'ref', header: 'Reference', render: (r) => <span className="font-mono text-xs">{r.reference || '—'}</span> },
    { key: 'qty', header: 'Quantity', align: 'right', render: (r) => (
      <span className={r.quantity > 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
        {r.quantity > 0 ? '+' : ''}{r.quantity}
      </span>
    )},
    { key: 'balance', header: 'Balance', align: 'right', render: (r) => r.balance },
    { key: 'cost', header: 'Unit Cost', align: 'right', render: (r) => r.unitCost ? `Rs ${formatMoney(r.unitCost)}` : '—' },
    { key: 'wac', header: 'WAC', align: 'right', render: (r) => r.runningWac ? `Rs ${formatMoney(r.runningWac)}` : '—' },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Stock Movements" subtitle="Complete audit trail of all stock changes"
        actions={<Button variant="outline" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExport}>Export</Button>} />

      <Card padding="none" className="mb-4">
        <div className="p-4">
          <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            <option value="">All Movement Types</option>
            <option value="PURCHASE">Purchase</option>
            <option value="SALE">Sale</option>
            <option value="SALES_RETURN">Sales Return</option>
            <option value="PURCHASE_RETURN">Purchase Return</option>
            <option value="ADJUSTMENT">Adjustment</option>
          </Select>
        </div>
      </Card>

      <Card padding="none">
        <Table columns={columns} data={data.items} loading={loading} empty={<Empty title="No stock movements yet" />} />
        {data.total > 50 && <Pagination page={page} total={data.total} pageSize={50} onChange={setPage} />}
      </Card>
    </div>
  );
}