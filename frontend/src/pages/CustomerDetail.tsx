import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Download, Wallet } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, StatCard, Table, Badge, Button, Loader, Tabs } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { formatMoney, formatDate, formatDateTime } from '../lib/format';
import { exportCSV, csvFilename } from '../lib/csv';
import type { Column } from '../components/ui';

type Tab = 'sales' | 'payments' | 'statement';

export default function CustomerDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [customer, setCustomer] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('sales');

  useEffect(() => { api.get(`/customers/${id}`).then((r) => setCustomer(unwrap(r))); }, [id]);

  if (!customer) return <div className="p-6"><Loader /></div>;

  const handleExport = () => {
    exportCSV(customer.statement || [], [
      { key: 'date', header: 'Date', value: (r: any) => formatDate(r.date) },
      { key: 'description', header: 'Description' },
      { key: 'reference', header: 'Reference' },
      { key: 'debit', header: 'Debit' },
      { key: 'credit', header: 'Credit' },
      { key: 'balance', header: 'Balance' },
    ], csvFilename(`customer-${customer.name}-statement`));
    toast.success('Exported');
  };

  const salesColumns: Column<any>[] = [
    { key: 'invoice', header: 'Invoice', render: (r) => <Link to={`/sales/${r.id}`} className="font-mono text-xs text-brand-600 hover:underline">{r.invoiceNumber}</Link> },
    { key: 'date', header: 'Date', render: (r) => formatDateTime(r.saleDate) },
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
    {
      key: 'desc',
      header: 'Description',
      render: (r) => (
        <div className="flex items-center gap-2">
          <span>{r.description}</span>
          {r.type === 'OPENING' && (
            <Badge variant="purple">Opening</Badge>
          )}
        </div>
      ),
    },
    { key: 'ref', header: 'Reference', render: (r) => <span className="font-mono text-xs">{r.reference || '—'}</span> },
    { key: 'debit', header: 'Debit', align: 'right', render: (r) => r.debit > 0 ? `Rs ${formatMoney(r.debit)}` : '—' },
    { key: 'credit', header: 'Credit', align: 'right', render: (r) => r.credit > 0 ? <span className="text-emerald-600">Rs {formatMoney(r.credit)}</span> : '—' },
    { key: 'bal', header: 'Balance', align: 'right', render: (r) => <span className="font-medium">Rs {formatMoney(r.balance)}</span> },
  ];

  const summary = customer.summary || {};
  const hasOpening = (summary.openingBalance || 0) > 0;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader title={customer.name} subtitle={customer.phone || customer.email || 'No contact info'}
        actions={<>
          <Link to="/customers"><Button variant="outline" icon={<ArrowLeft className="w-3.5 h-3.5" />}>Back</Button></Link>
          <Button variant="outline" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExport}>Export Statement</Button>
        </>} />

      {/* ============ KPI CARDS — Now 5 columns ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          label="Total Sales"
          value={`Rs ${formatMoney(summary.totalSales || 0)}`}
          accent="brand"
        />
        <StatCard
          label="Total Received"
          value={`Rs ${formatMoney(summary.received || 0)}`}
          accent="success"
        />
        <StatCard
          label="Opening Balance"
          value={`Rs ${formatMoney(summary.openingBalance || 0)}`}
          accent={hasOpening ? 'warning' : 'gray'}
          icon={<Wallet className="w-4 h-4" />}
          hint={summary.openingPaid > 0 ? `Paid: Rs ${formatMoney(summary.openingPaid)}` : undefined}
        />
        <StatCard
          label="Outstanding"
          value={`Rs ${formatMoney(summary.outstanding || 0)}`}
          accent={(summary.outstanding || 0) > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label="Credit Limit"
          value={`Rs ${formatMoney(customer.creditLimit)}`}
          accent="gray"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Contact Info */}
        <Card className="md:col-span-1">
          <Card.Header title="Contact Information" />
          <div className="space-y-3 text-sm">
            {customer.phone && <div className="flex items-center gap-2.5"><Phone className="w-3.5 h-3.5 text-ink-muted" /><span>{customer.phone}</span></div>}
            {customer.email && <div className="flex items-center gap-2.5"><Mail className="w-3.5 h-3.5 text-ink-muted" /><span>{customer.email}</span></div>}
            {customer.address && <div className="flex items-center gap-2.5"><MapPin className="w-3.5 h-3.5 text-ink-muted" /><span>{customer.address}, {customer.city}</span></div>}
            {!customer.phone && !customer.email && !customer.address && <p className="text-ink-muted text-xs">No contact info</p>}
          </div>
        </Card>

        {/* Account Summary — Detailed */}
        <Card className="md:col-span-2">
          <Card.Header title="Account Summary" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">

            {/* Opening */}
            {hasOpening && (
              <>
                <div className="flex justify-between">
                  <span className="text-ink-secondary">Opening Balance</span>
                  <span className="font-medium">Rs {formatMoney(summary.openingBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-secondary">Opening Paid</span>
                  <span className="text-emerald-600">Rs {formatMoney(summary.openingPaid || 0)}</span>
                </div>
              </>
            )}

            {/* Sales */}
            <div className="flex justify-between">
              <span className="text-ink-secondary">Sales Total</span>
              <span>Rs {formatMoney(summary.totalSales || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-secondary">Sales Received</span>
              <span className="text-emerald-600">Rs {formatMoney(summary.salesReceived || 0)}</span>
            </div>

            {/* Total */}
            <div className="flex justify-between font-semibold col-span-2 border-t border-edge-base pt-2 mt-1">
              <span>Total Outstanding</span>
              <span className="text-amber-600">Rs {formatMoney(summary.outstanding || 0)}</span>
            </div>

            {/* Status */}
            <div className="flex justify-between col-span-2">
              <span className="text-ink-secondary">Status</span>
              <Badge variant={customer.active ? 'green' : 'gray'} dot>{customer.active ? 'Active' : 'Inactive'}</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Card padding="none">
        <div className="p-4 border-b border-edge-base">
          <Tabs value={tab} onChange={(v) => setTab(v as Tab)}
            options={[
              { value: 'sales', label: `Sales (${customer.sales?.length || 0})` },
              { value: 'payments', label: `Payments (${customer.payments?.length || 0})` },
              { value: 'statement', label: 'Account Statement' },
            ]} />
        </div>
        {tab === 'sales' && <Table columns={salesColumns} data={customer.sales || []} empty={<div className="py-12 text-center text-sm text-ink-muted">No sales yet</div>} />}
        {tab === 'payments' && <Table columns={paymentColumns} data={customer.payments || []} empty={<div className="py-12 text-center text-sm text-ink-muted">No payments yet</div>} />}
        {tab === 'statement' && <Table columns={statementColumns} data={customer.statement || []} empty={<div className="py-12 text-center text-sm text-ink-muted">No transactions</div>} />}
      </Card>
    </div>
  );
}