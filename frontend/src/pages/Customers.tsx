import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MoreVertical, Edit, Phone, DollarSign, Users as UsersIcon, Download, Info } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, Card, Input, Table, Badge, Pagination, Empty, Dropdown, Modal, StatCard, Select } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { formatMoney } from '../lib/format';
import { exportCSV, csvFilename } from '../lib/csv';
import type { Column } from '../components/ui';

export default function Customers() {
  const nav = useNavigate();
  const toast = useToast();
  const [data, setData] = useState<any>({ items: [], total: 0, summary: {} });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState<any>(null);
  const [showForm, setShowForm] = useState<any>(null);

  const load = () => {
    setLoading(true);
    api.get('/customers', { params: { search, page, pageSize: 20 } })
      .then((r) => setData(unwrap(r))).finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search, page]);

  const handleExport = () => {
    exportCSV(data.items, [
      { key: 'name', header: 'Customer' },
      { key: 'phone', header: 'Phone' },
      { key: 'email', header: 'Email' },
      { key: 'totalSales', header: 'Total Sales' },
      { key: 'received', header: 'Received' },
      { key: 'balance', header: 'Balance' },
    ], csvFilename('customers'));
    toast.success('Exported');
  };

  const columns: Column<any>[] = [
    { key: 'name', header: 'Customer', render: (r) => (
      <button onClick={() => nav(`/customers/${r.id}`)} className="flex items-center gap-3 hover:opacity-80 text-left">
        <div className="w-9 h-9 rounded-full bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center text-brand-600 dark:text-brand-400 font-semibold text-sm">
          {r.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium text-ink-primary">{r.name}</p>
          {r.phone && <p className="text-xs text-ink-secondary flex items-center gap-1"><Phone className="w-3 h-3" /> {r.phone}</p>}
        </div>
      </button>
    )},
    { key: 'sales', header: 'Total Sales', align: 'right', render: (r) => `Rs ${formatMoney(r.totalSales)}` },
    { key: 'received', header: 'Received', align: 'right', render: (r) => <span className="text-emerald-600">Rs {formatMoney(r.received)}</span> },
    { key: 'balance', header: 'Balance', align: 'right', render: (r) => (
      <span className={r.balance > 0 ? 'text-amber-600 font-medium' : 'text-ink-primary'}>Rs {formatMoney(r.balance)}</span>
    )},
    { key: 'status', header: 'Status', render: (r) => <Badge variant={r.active ? 'green' : 'gray'} dot>{r.active ? 'Active' : 'Inactive'}</Badge> },
    { key: 'actions', header: '', align: 'right', render: (r) => (
      <Dropdown trigger={<button className="p-1 text-ink-muted hover:text-ink-primary rounded hover:bg-surface-hover"><MoreVertical className="w-4 h-4" /></button>}>
        <Dropdown.Item icon={<Edit className="w-3.5 h-3.5" />} onClick={() => setShowForm(r)}>Edit</Dropdown.Item>
        <Dropdown.Item icon={<DollarSign className="w-3.5 h-3.5" />} onClick={() => setShowPayment(r)}>Receive Payment</Dropdown.Item>
      </Dropdown>
    )},
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Customers" subtitle="Customer list and receivables"
        actions={<>
          <Button variant="outline" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExport}>Export</Button>
          <Button icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowForm({})}>Add Customer</Button>
        </>} />

      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatCard label="Total Customers" value={data.summary?.totalCustomers || 0} icon={<UsersIcon className="w-4 h-4" />} />
        <StatCard label="Active Customers" value={data.summary?.activeCustomers || 0} accent="success" />
        <StatCard label="Total Receivable" value={`Rs ${formatMoney(data.summary?.totalReceivable || 0)}`} accent="warning" />
      </div>

      <Card padding="none" className="mb-4">
        <div className="p-4">
          <Input placeholder="Search customer by name or phone…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            leftIcon={<Search className="w-3.5 h-3.5" />} />
        </div>
      </Card>

      <Card padding="none">
        <Table columns={columns} data={data.items} loading={loading} empty={<Empty title="No customers yet" />} />
        {data.total > 20 && <Pagination page={page} total={data.total} pageSize={20} onChange={setPage} />}
      </Card>

      <CustomerForm customer={showForm} onClose={() => setShowForm(null)} onSaved={() => { setShowForm(null); load(); }} />
      <ReceivePaymentModal customer={showPayment} onClose={() => setShowPayment(null)} onSaved={() => { setShowPayment(null); load(); }} />
    </div>
  );
}

// ============================================================
// CUSTOMER FORM
// ============================================================
function CustomerForm({ customer, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const isEdit = !!(customer && customer.id);

  useEffect(() => {
    if (customer) {
      setForm(customer.id ? customer : {
        name: '', phone: '', email: '', address: '', city: '',
        openingBalance: 0, creditLimit: 0, notes: '', active: true,
      });
    }
  }, [customer]);

  const submit = async () => {
    setSaving(true);
    try {
      const payload = { ...form, openingBalance: Number(form.openingBalance) || 0, creditLimit: Number(form.creditLimit) || 0 };
      if (form.id) await api.put(`/customers/${form.id}`, payload);
      else await api.post('/customers', payload);
      toast.success(form.id ? 'Customer updated' : 'Customer created');
      onSaved();
    } catch (e: any) { toast.error('Failed', e.response?.data?.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={!!customer} onClose={onClose} title={form.id ? 'Edit Customer' : 'Add Customer'} size="md"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving} disabled={!form.name}>{form.id ? 'Update' : 'Create'}</Button></>}>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Name *" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Phone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input label="Email" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="City" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />

        {/* Opening Balance — only editable for new customers */}
        <div className="w-full">
          <Input
            label="Opening Balance"
            type="number"
            value={form.openingBalance ?? 0}
            onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
            disabled={isEdit}
            hint={isEdit ? 'Cannot be changed. Use Receive Payment to clear.' : 'Previous pending balance (if any)'}
          />
        </div>

        <Input label="Credit Limit" type="number" value={form.creditLimit ?? 0} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} />

        <div className="col-span-2">
          <Input label="Address" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="col-span-2">
          <Input label="Notes" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// RECEIVE PAYMENT MODAL — with Opening / Sales breakdown
// ============================================================
function ReceivePaymentModal({ customer, onClose, onSaved }: any) {
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (customer) {
      setAmount(customer.balance > 0 ? customer.balance : 0);
      setMethod('CASH');
      setReference('');
    }
  }, [customer]);

  const submit = async () => {
    if (!amount || amount <= 0) return toast.warning('Enter valid amount');
    setSaving(true);
    try {
      await api.post(`/customers/${customer.id}/payments`, { amount, method, reference });
      toast.success('Payment received');
      onSaved();
    } catch (e: any) { toast.error('Failed', e.response?.data?.message); }
    finally { setSaving(false); }
  };

  const openingDue = customer?.openingDue || 0;
  const salesDue = customer?.salesDue || 0;
  const hasBreakdown = openingDue > 0 || salesDue > 0;

  return (
    <Modal open={!!customer} onClose={onClose} title="Receive Payment" size="sm"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving}>Receive</Button></>}>
      {customer && (
        <div className="space-y-3">

          {/* Customer Info + Breakdown */}
          <div className="p-3 bg-surface-hover rounded-md">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-ink-secondary">Customer</p>
                <p className="font-medium text-ink-primary">{customer.name}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center font-semibold text-sm">
                {customer.name.charAt(0).toUpperCase()}
              </div>
            </div>

            {hasBreakdown && (
              <div className="mt-3 pt-3 border-t border-edge-base space-y-1.5 text-xs">
                {openingDue > 0 && (
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">Opening Balance Due:</span>
                    <span className="font-medium">Rs {formatMoney(openingDue)}</span>
                  </div>
                )}
                {salesDue > 0 && (
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">Sales Due:</span>
                    <span className="font-medium">Rs {formatMoney(salesDue)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1.5 border-t border-edge-base">
                  <span className="text-amber-600 font-semibold">Total Outstanding:</span>
                  <span className="text-amber-600 font-semibold">Rs {formatMoney(customer.balance)}</span>
                </div>
              </div>
            )}

            {!hasBreakdown && (
              <p className="text-xs text-emerald-600 mt-2 font-medium">
                ✓ No outstanding balance
              </p>
            )}
          </div>

          {/* Info note: Payment priority */}
          {hasBreakdown && (
            <div className="flex items-start gap-2 p-2.5 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
              <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                Payment will be applied to <strong>Opening Balance first</strong>, then to oldest sales.
              </p>
            </div>
          )}

          {/* Amount */}
          <div>
            <Input
              label="Amount"
              type="number"
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder={`Max: Rs ${formatMoney(customer.balance)}`}
            />
            {customer.balance > 0 && (
              <button
                type="button"
                onClick={() => setAmount(customer.balance)}
                className="text-[11px] text-brand-600 hover:text-brand-700 dark:text-brand-400 mt-1 font-medium"
              >
                Use full amount (Rs {formatMoney(customer.balance)})
              </button>
            )}
          </div>

          {/* Payment Method */}
          <Select label="Payment Method" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="CASH">Cash</option>
            <option value="BANK">Bank</option>
            <option value="CARD">Card</option>
          </Select>

          {/* Reference */}
          <Input label="Reference / Note" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
      )}
    </Modal>
  );
}