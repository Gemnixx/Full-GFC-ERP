import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Package, TrendingUp, TrendingDown, Warehouse } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, StatCard, Table, Badge, Button, Loader, Tabs } from '../components/ui';
import { formatMoney, formatDateTime } from '../lib/format';
import type { Column } from '../components/ui';

type Tab = 'movements' | 'sales' | 'purchases';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('movements');

  useEffect(() => { api.get(`/products/${id}`).then((r) => setProduct(unwrap(r))); }, [id]);

  if (!product) return <div className="p-6"><Loader /></div>;

  const stock = product.inventory?.quantity ?? 0;
  const stockValue = stock * (product.weightedAvgCost || product.purchasePrice || 0);

  const movementColumns: Column<any>[] = [
    { key: 'date', header: 'Date', render: (r) => <span className="text-xs text-ink-secondary">{formatDateTime(r.createdAt)}</span> },
    { key: 'type', header: 'Type', render: (r) => <Badge variant={
      r.type === 'PURCHASE' ? 'blue' : r.type === 'SALE' ? 'green' :
      r.type === 'ADJUSTMENT' ? 'amber' : r.type === 'SALES_RETURN' ? 'purple' : 'red'
    }>{r.type}</Badge> },
    { key: 'ref', header: 'Reference', render: (r) => <span className="font-mono text-xs">{r.reference || '—'}</span> },
    { key: 'qty', header: 'Qty', align: 'right', render: (r) => (
      <span className={r.quantity > 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
        {r.quantity > 0 ? '+' : ''}{r.quantity}
      </span>
    )},
    { key: 'balance', header: 'Balance', align: 'right', render: (r) => r.balance },
    { key: 'cost', header: 'Unit Cost', align: 'right', render: (r) => r.unitCost ? `Rs ${formatMoney(r.unitCost)}` : '—' },
    { key: 'wac', header: 'WAC', align: 'right', render: (r) => r.runningWac ? `Rs ${formatMoney(r.runningWac)}` : '—' },
  ];

  const salesColumns: Column<any>[] = [
    { key: 'invoice', header: 'Invoice', render: (r) => <Link to={`/sales/${r.sale.id}`} className="font-mono text-xs text-brand-600 hover:underline">{r.sale.invoiceNumber}</Link> },
    { key: 'date', header: 'Date', render: (r) => <span className="text-xs text-ink-secondary">{formatDateTime(r.sale.saleDate)}</span> },
    { key: 'customer', header: 'Customer', render: (r) => r.sale.customer?.name || 'Walk-in' },
    { key: 'qty', header: 'Qty', align: 'center', render: (r) => r.quantity },
    { key: 'price', header: 'Unit Price', align: 'right', render: (r) => `Rs ${formatMoney(r.unitPrice)}` },
    { key: 'total', header: 'Total', align: 'right', render: (r) => <span className="font-medium">Rs {formatMoney(r.lineTotal)}</span> },
  ];

  const purchaseColumns: Column<any>[] = [
    { key: 'purchase', header: 'Purchase', render: (r) => <Link to={`/purchases/${r.purchase.id}`} className="font-mono text-xs text-brand-600 hover:underline">{r.purchase.purchaseNumber}</Link> },
    { key: 'date', header: 'Date', render: (r) => <span className="text-xs text-ink-secondary">{formatDateTime(r.purchase.purchaseDate)}</span> },
    { key: 'supplier', header: 'Supplier', render: (r) => r.purchase.supplier.name },
    { key: 'qty', header: 'Qty', align: 'center', render: (r) => r.quantity },
    { key: 'price', header: 'Unit Cost', align: 'right', render: (r) => `Rs ${formatMoney(r.purchasePrice)}` },
    { key: 'total', header: 'Total', align: 'right', render: (r) => <span className="font-medium">Rs {formatMoney(r.lineTotal)}</span> },
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader title={product.name} subtitle={`${product.model || '—'} · ${product.sku || 'No SKU'}`}
        actions={<Link to="/products"><Button variant="outline" icon={<ArrowLeft className="w-3.5 h-3.5" />}>Back</Button></Link>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Current Stock" value={stock} accent={stock <= 0 ? 'danger' : stock <= product.minStockLevel ? 'warning' : 'success'} icon={<Warehouse className="w-4 h-4" />} />
        <StatCard label="Stock Value" value={`Rs ${formatMoney(stockValue)}`} accent="brand" icon={<Package className="w-4 h-4" />} />
        <StatCard label="Sale Price" value={`Rs ${formatMoney(product.salePrice)}`} accent="success" icon={<TrendingUp className="w-4 h-4" />} />
        <StatCard label="WAC" value={`Rs ${formatMoney(product.weightedAvgCost)}`} accent="gray" icon={<TrendingDown className="w-4 h-4" />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card>
          <Card.Header title="Basic Information" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-ink-secondary">Category</span><span>{product.category?.name || '—'}</span></div>
            <div className="flex justify-between"><span className="text-ink-secondary">Brand</span><span>{product.brand?.name || '—'}</span></div>
            <div className="flex justify-between"><span className="text-ink-secondary">SKU</span><span className="font-mono text-xs">{product.sku || '—'}</span></div>
            <div className="flex justify-between"><span className="text-ink-secondary">Barcode</span><span className="font-mono text-xs">{product.barcode || '—'}</span></div>
            <div className="flex justify-between"><span className="text-ink-secondary">Warranty</span><span>{product.warranty || '—'}</span></div>
          </div>
        </Card>
        <Card>
          <Card.Header title="Pricing" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-ink-secondary">Purchase Price</span><span>Rs {formatMoney(product.purchasePrice)}</span></div>
            <div className="flex justify-between"><span className="text-ink-secondary">Sale Price</span><span className="font-medium">Rs {formatMoney(product.salePrice)}</span></div>
            <div className="flex justify-between"><span className="text-ink-secondary">Min Sale Price</span><span>Rs {formatMoney(product.minSalePrice)}</span></div>
            <div className="flex justify-between"><span className="text-ink-secondary">Weighted Avg Cost</span><span>Rs {formatMoney(product.weightedAvgCost)}</span></div>
          </div>
        </Card>
        <Card>
          <Card.Header title="Inventory" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-ink-secondary">In Stock</span><span className="font-medium">{stock}</span></div>
            <div className="flex justify-between"><span className="text-ink-secondary">Min Stock Level</span><span>{product.minStockLevel}</span></div>
            <div className="flex justify-between"><span className="text-ink-secondary">Stock Value</span><span>Rs {formatMoney(stockValue)}</span></div>
            <div className="flex justify-between"><span className="text-ink-secondary">Status</span>
              <Badge variant={stock <= 0 ? 'red' : stock <= product.minStockLevel ? 'amber' : 'green'} dot>
                {stock <= 0 ? 'Out of Stock' : stock <= product.minStockLevel ? 'Low Stock' : 'In Stock'}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-edge-base">
          <Tabs value={tab} onChange={(v) => setTab(v as Tab)}
            options={[
              { value: 'movements', label: `Stock Movements (${product.stockMovements?.length || 0})` },
              { value: 'sales', label: `Sales (${product.saleItems?.length || 0})` },
              { value: 'purchases', label: `Purchases (${product.purchaseItems?.length || 0})` },
            ]} />
        </div>
        {tab === 'movements' && <Table columns={movementColumns} data={product.stockMovements || []} empty={<div className="py-12 text-center text-sm text-ink-muted">No stock movements</div>} />}
        {tab === 'sales' && <Table columns={salesColumns} data={product.saleItems || []} empty={<div className="py-12 text-center text-sm text-ink-muted">No sales yet</div>} />}
        {tab === 'purchases' && <Table columns={purchaseColumns} data={product.purchaseItems || []} empty={<div className="py-12 text-center text-sm text-ink-muted">No purchases yet</div>} />}
      </Card>
    </div>
  );
}