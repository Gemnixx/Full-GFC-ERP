import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Download } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, StatCard, Table, Badge, Button, Loader, Tabs } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { formatMoney, formatDate, formatDateTime } from '../lib/format';
import { exportCSV, csvFilename } from '../lib/csv';
import type { Column } from '../components/ui';

type Tab = 'purchases' | 'payments' | 'statement';

export default function SupplierDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [supplier, setSupplier] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('purchases');

  useEffect(() => { api.get(`/suppliers/${id}`).then((r) => setSupplier(unwrap(r))); }, [id]);

  if (!supplier) return <div className="p-6"><Loader /></div>;

  const handleExport = () => {
    exportCSV(supplier.statement || [], [
      { key: 'date', header: 'Date', value: (r: any) => formatDate(r.date) },
      { key: 'description', header: 'Description' },
      { key: 'reference', header: 'Reference' },
      { key: 'debit', header: 'Debit' },
      { key: 'credit', header: 'Credit' },
      { key: 'balance', header: 'Balance' },
    ], csvFilename(`supplier-${supplier.name}-statement`));
    toast.success('Exported');
  };

  const purchaseColumns: Column<any>[] = [
    { key: 'purchase', header: 'Purchase #', render: (r) => <Link to={`/purchases/${r.id}`} className="font-mono text-xs text-brand-600 hover:underline">{r.purchaseNumber}</Link> },
    { key: 'date', header: 'Date', render: (r) => formatDateTime(r.purchaseDate) },
    { key: 'items', header: 'Items', align: 'center', render: (r) => r.items?.length || 0 },
    { key: 'total', header: 'Total', align: 'right', render: (r) => `Rs ${formatMoney(r.total)}` },
    { key: 'paid', header: 'Paid', align: 'right', render: (r) => <span className="text-emerald-600">Rs {formatMoney(r.paid)}</span> },
    { key: 'due', header: 'Due', align: 'right', render: (r) => <span className={r.due > 0 ? 'text-amber-600 font-medium' : 'text-ink-muted'}>Rs {formatMoney(r.due)}</span> },
  ];

  const paymentColumns: Column<any>[] = [
    { key: 'date', header: 'Date', render: (r) => formatDate(r.paymentDate) },
    { key: 'method', header: 'Method', render: (r) => <Badge variant="blue">{r.method}</Badge> },
    { key: 'ref', header: 'Reference', render: (r) => r.reference || '—' },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className="text-emerald-600 font-medium">Rs {formatMoney(r.amount)}</span> },
    { key: 'note', header: 'Note', render: (r) => <span className="text-xs text-ink-secondary">{r.note || '—'}</span> },
  ];

  const statementColumns: Column<any>[] = [
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
    { key: 'desc', header: 'Description', render: (r) => r.description },
    { key: 'ref', header: 'Reference', render: (r) => <span className="font-mono text-xs">{r.reference || '—'}</span> },
    { key: 'debit', header: 'Debit', align: 'right', render: (r) => r.debit > 0 ? `Rs ${formatMoney(r.debit)}` : '—' },
    { key: 'credit', header: 'Credit', align: 'right', render: (r) => r.credit > 0 ? <span className="text-emerald-600">Rs {formatMoney(r.credit)}</span> : '—' },
    { key: 'bal', header: 'Balance', align: 'right', render: (r) => <span className="font-medium">Rs {formatMoney(r.balance)}</span> },
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader title={supplier.name} subtitle={supplier.company || supplier.phone || 'No info'}
        actions={<>
          <Link to="/suppliers"><Button variant="outline" icon={<ArrowLeft className="w-3.5 h-3.5" />}>Back</Button></Link>
          <Button variant="outline" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExport}>Export Statement</Button>
        </>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Purchases" value={`Rs ${formatMoney(supplier.summary?.totalPurchases || 0)}`} accent="brand" />
        <StatCard label="Total Paid" value={`Rs ${formatMoney(supplier.summary?.totalPaid || 0)}`} accent="success" />
        <StatCard label="Outstanding" value={`Rs ${formatMoney(supplier.summary?.outstanding || 0)}`} accent={(supplier.summary?.outstanding || 0) > 0 ? 'danger' : 'gray'} />
        <StatCard label="Credit Terms" value={supplier.creditTerms || '—'} accent="gray" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card className="md:col-span-1">
          <Card.Header title="Contact Information" />
          <div className="space-y-3 text-sm">
            {supplier.phone && <div className="flex items-center gap-2.5"><Phone className="w-3.5 h-3.5 text-ink-muted" /><span>{supplier.phone}</span></div>}
            {supplier.email && <div className="flex items-center gap-2.5"><Mail className="w-3.5 h-3.5 text-ink-muted" /><span>{supplier.email}</span></div>}
            {supplier.address && <div className="flex items-center gap-2.5"><MapPin className="w-3.5 h-3.5 text-ink-muted" /><span>{supplier.address}, {supplier.city}</span></div>}
            {supplier.taxNumber && <div className="flex items-center gap-2.5"><span className="text-xs text-ink-secondary">NTN:</span><span>{supplier.taxNumber}</span></div>}
          </div>
        </Card>

        <Card className="md:col-span-2">
          <Card.Header title="Account Summary" />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between"><span className="text-ink-secondary">Opening Balance</span><span>Rs {formatMoney(supplier.openingBalance)}</span></div>
            <div className="flex justify-between"><span className="text-ink-secondary">Total Purchases</span><span>Rs {formatMoney(supplier.summary?.totalPurchases || 0)}</span></div>
            <div className="flex justify-between"><span className="text-ink-secondary">Paid</span><span className="text-emerald-600">Rs {formatMoney(supplier.summary?.totalPaid || 0)}</span></div>
            <div className="flex justify-between font-semibold"><span>Outstanding</span><span className="text-amber-600">Rs {formatMoney(supplier.summary?.outstanding || 0)}</span></div>
            <div className="flex justify-between"><span className="text-ink-secondary">Status</span>
              <Badge variant={supplier.active ? 'green' : 'gray'} dot>{supplier.active ? 'Active' : 'Inactive'}</Badge>
            </div>
          </div>
        </Card>
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-edge-base">
          <Tabs value={tab} onChange={(v) => setTab(v as Tab)}
            options={[
              { value: 'purchases', label: `Purchases (${supplier.purchases?.length || 0})` },
              { value: 'payments', label: `Payments (${supplier.payments?.length || 0})` },
              { value: 'statement', label: 'Account Statement' },
            ]} />
        </div>
        {tab === 'purchases' && <Table columns={purchaseColumns} data={supplier.purchases || []} empty={<div className="py-12 text-center text-sm text-ink-muted">No purchases yet</div>} />}
        {tab === 'payments' && <Table columns={paymentColumns} data={supplier.payments || []} empty={<div className="py-12 text-center text-sm text-ink-muted">No payments yet</div>} />}
        {tab === 'statement' && <Table columns={statementColumns} data={supplier.statement || []} empty={<div className="py-12 text-center text-sm text-ink-muted">No transactions</div>} />}
      </Card>
    </div>
  );
}