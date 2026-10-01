import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Package, AlertTriangle, XCircle, DollarSign, ArrowRightLeft, Download } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, Card, Input, Select, Table, Badge, Pagination, Empty, StatCard, Modal } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { formatMoney } from '../lib/format';
import { exportCSV, csvFilename } from '../lib/csv';
import type { Column } from '../components/ui';

export default function Inventory() {
  const toast = useToast();
  const [data, setData] = useState<any>({ items: [], total: 0, summary: {} });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<any>(null);

  const load = () => {
    setLoading(true);
    api.get('/inventory', { params: { search, status, page, pageSize: 20 } })
      .then((r) => setData(unwrap(r))).finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search, status, page]);

  const handleExport = () => {
    exportCSV(data.items, [
      { key: 'name', header: 'Product' },
      { key: 'model', header: 'Model' },
      { key: 'brand', header: 'Brand', value: (r: any) => r.brand?.name || '' },
      { key: 'stock', header: 'In Stock', value: (r: any) => r.inventory?.quantity || 0 },
      { key: 'minStock', header: 'Min Stock', value: (r: any) => r.minStockLevel },
      { key: 'status', header: 'Status', value: (r: any) => r.stockStatus },
      { key: 'wac', header: 'WAC', value: (r: any) => r.weightedAvgCost },
    ], csvFilename('inventory'));
    toast.success('Exported');
  };

  const columns: Column<any>[] = [
    { key: 'product', header: 'Product', render: (r) => (
      <Link to={`/products/${r.id}`} className="flex items-center gap-3 hover:opacity-80">
        <div className="w-9 h-9 rounded-md bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center flex-shrink-0">
          <Package className="w-4 h-4 text-brand-600 dark:text-brand-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-primary truncate">{r.name}</p>
          <p className="text-xs text-ink-secondary">{r.model || '—'}</p>
        </div>
      </Link>
    )},
    { key: 'brand', header: 'Brand', render: (r) => r.brand?.name || '—' },
    { key: 'stock', header: 'In Stock', align: 'center', render: (r) => <span className="font-medium">{r.inventory?.quantity ?? 0}</span> },
    { key: 'min', header: 'Min Stock', align: 'center', render: (r) => r.minStockLevel },
    { key: 'wac', header: 'WAC', align: 'right', render: (r) => `Rs ${formatMoney(r.weightedAvgCost)}` },
    { key: 'value', header: 'Value', align: 'right', render: (r) => <span className="font-medium">Rs {formatMoney((r.inventory?.quantity ?? 0) * r.weightedAvgCost)}</span> },
    { key: 'status', header: 'Status', render: (r) => {
      const v = r.stockStatus === 'OUT_OF_STOCK' ? 'red' : r.stockStatus === 'LOW_STOCK' ? 'amber' : 'green';
      const label = r.stockStatus === 'OUT_OF_STOCK' ? 'Out of Stock' : r.stockStatus === 'LOW_STOCK' ? 'Low Stock' : 'In Stock';
      return <Badge variant={v} dot>{label}</Badge>;
    }},
    { key: 'actions', header: '', align: 'right', render: (r) => (
      <Button size="sm" variant="outline" icon={<ArrowRightLeft className="w-3.5 h-3.5" />} onClick={() => setAdjustProduct(r)}>Adjust</Button>
    )},
  ];

  const s = data.summary;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Inventory" subtitle="Stock levels, movements, and adjustments"
        actions={<>
          <Button variant="outline" onClick={() => (window.location.href = '/inventory/movements')}>View Movements</Button>
          <Button variant="outline" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExport}>Export</Button>
        </>} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total Products" value={s.totalProducts || 0} icon={<Package className="w-4 h-4" />} />
        <StatCard label="Total Stock" value={s.totalStock || 0} accent="brand" />
        <StatCard label="Low Stock" value={s.lowStock || 0} accent="warning" icon={<AlertTriangle className="w-4 h-4" />} />
        <StatCard label="Out of Stock" value={s.outOfStock || 0} accent="danger" icon={<XCircle className="w-4 h-4" />} />
        <StatCard label="Stock Value" value={`Rs ${formatMoney(s.totalValue || 0)}`} accent="success" icon={<DollarSign className="w-4 h-4" />} />
      </div>

      <Card padding="none" className="mb-4">
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="Search product…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            leftIcon={<Search className="w-3.5 h-3.5" />} />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </Select>
        </div>
      </Card>

      <Card padding="none">
        <Table columns={columns} data={data.items} loading={loading} empty={<Empty title="No products found" />} />
        {data.total > 20 && <Pagination page={page} total={data.total} pageSize={20} onChange={setPage} />}
      </Card>

      <AdjustModal product={adjustProduct} onClose={() => setAdjustProduct(null)}
        onSaved={() => { setAdjustProduct(null); load(); toast.success('Stock adjusted'); }} />
    </div>
  );
}

function AdjustModal({ product, onClose, onSaved }: any) {
  const [type, setType] = useState<'INCREASE' | 'DECREASE'>('INCREASE');
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (product) { setType('INCREASE'); setQuantity(0); setReason(''); }
  }, [product]);

  const submit = async () => {
    if (!quantity || quantity <= 0) return toast.warning('Enter valid quantity');
    setSaving(true);
    try {
      await api.post('/inventory/adjust', { productId: product.id, type, quantity, reason });
      onSaved();
    } catch (e: any) { toast.error('Failed', e.response?.data?.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={!!product} onClose={onClose} title="Stock Adjustment" size="sm"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving}>Adjust Stock</Button></>}>
      {product && (
        <div className="space-y-3">
          <div className="p-3 bg-surface-hover rounded-md">
            <p className="text-xs text-ink-secondary">Product</p>
            <p className="font-medium text-ink-primary">{product.name}</p>
            <p className="text-xs text-ink-secondary mt-1">Current Stock: <strong>{product.inventory?.quantity ?? 0}</strong></p>
          </div>
          <Select label="Adjustment Type" value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="INCREASE">Increase Stock</option>
            <option value="DECREASE">Decrease Stock</option>
          </Select>
          <Input label="Quantity" type="number" value={quantity || ''} onChange={(e) => setQuantity(parseInt(e.target.value) || 0)} />
          <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Damaged goods" />
        </div>
      )}
    </Modal>
  );
}