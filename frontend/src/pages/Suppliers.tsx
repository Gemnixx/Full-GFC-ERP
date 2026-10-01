import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MoreVertical, Edit, DollarSign, Factory, Download } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, Card, Input, Table, Badge, Pagination, Empty, Dropdown, Modal, StatCard, Select } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { formatMoney } from '../lib/format';
import { exportCSV, csvFilename } from '../lib/csv';
import type { Column } from '../components/ui';

export default function Suppliers() {
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
    api.get('/suppliers', { params: { search, page, pageSize: 20 } })
      .then((r) => setData(unwrap(r))).finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search, page]);

  const handleExport = () => {
    exportCSV(data.items, [
      { key: 'name', header: 'Supplier' },
      { key: 'company', header: 'Company' },
      { key: 'phone', header: 'Phone' },
      { key: 'purchases', header: 'Purchases' },
      { key: 'paid', header: 'Paid' },
      { key: 'payable', header: 'Payable' },
    ], csvFilename('suppliers'));
    toast.success('Exported');
  };

  const columns: Column<any>[] = [
    { key: 'name', header: 'Supplier', render: (r) => (
      <button onClick={() => nav(`/suppliers/${r.id}`)} className="flex items-center gap-3 hover:opacity-80 text-left">
        <div className="w-9 h-9 rounded-full bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center text-brand-600 dark:text-brand-400 font-semibold text-sm">
          {r.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium text-ink-primary">{r.name}</p>
          {r.company && <p className="text-xs text-ink-secondary">{r.company}</p>}
        </div>
      </button>
    )},
    { key: 'phone', header: 'Phone', render: (r) => r.phone || '—' },
    { key: 'purchases', header: 'Purchases', align: 'right', render: (r) => `Rs ${formatMoney(r.purchases)}` },
    { key: 'paid', header: 'Paid', align: 'right', render: (r) => <span className="text-emerald-600">Rs {formatMoney(r.paid)}</span> },
    { key: 'payable', header: 'Payable', align: 'right', render: (r) => (
      <span className={r.payable > 0 ? 'text-amber-600 font-medium' : ''}>Rs {formatMoney(r.payable)}</span>
    )},
    { key: 'status', header: 'Status', render: (r) => <Badge variant={r.active ? 'green' : 'gray'} dot>{r.active ? 'Active' : 'Inactive'}</Badge> },
    { key: 'actions', header: '', align: 'right', render: (r) => (
      <Dropdown trigger={<button className="p-1 text-ink-muted hover:text-ink-primary rounded hover:bg-surface-hover"><MoreVertical className="w-4 h-4" /></button>}>
        <Dropdown.Item icon={<Edit className="w-3.5 h-3.5" />} onClick={() => setShowForm(r)}>Edit</Dropdown.Item>
        <Dropdown.Item icon={<DollarSign className="w-3.5 h-3.5" />} onClick={() => setShowPayment(r)}>Make Payment</Dropdown.Item>
      </Dropdown>
    )},
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Suppliers" subtitle="Vendors and payables"
        actions={<>
          <Button variant="outline" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExport}>Export</Button>
          <Button icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowForm({})}>Add Supplier</Button>
        </>} />

      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatCard label="Total Suppliers" value={data.summary?.totalSuppliers || 0} icon={<Factory className="w-4 h-4" />} />
        <StatCard label="Active" value={data.summary?.activeSuppliers || 0} accent="success" />
        <StatCard label="Total Payable" value={`Rs ${formatMoney(data.summary?.totalPayable || 0)}`} accent="danger" />
      </div>

      <Card padding="none" className="mb-4">
        <div className="p-4">
          <Input placeholder="Search supplier, company, phone…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            leftIcon={<Search className="w-3.5 h-3.5" />} />
        </div>
      </Card>

      <Card padding="none">
        <Table columns={columns} data={data.items} loading={loading} empty={<Empty title="No suppliers yet" />} />
        {data.total > 20 && <Pagination page={page} total={data.total} pageSize={20} onChange={setPage} />}
      </Card>

      <SupplierForm supplier={showForm} onClose={() => setShowForm(null)} onSaved={() => { setShowForm(null); load(); }} />
      <SupplierPaymentModal supplier={showPayment} onClose={() => setShowPayment(null)} onSaved={() => { setShowPayment(null); load(); }} />
    </div>
  );
}

function SupplierForm({ supplier, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (supplier) {
      setForm(supplier.id ? supplier : {
        name: '', company: '', phone: '', email: '', address: '', city: '',
        taxNumber: '', openingBalance: 0, creditTerms: '', notes: '', active: true,
      });
    }
  }, [supplier]);

  const submit = async () => {
    setSaving(true);
    try {
      const payload = { ...form, openingBalance: Number(form.openingBalance) || 0 };
      if (form.id) await api.put(`/suppliers/${form.id}`, payload);
      else await api.post('/suppliers', payload);
      toast.success(form.id ? 'Supplier updated' : 'Supplier created');
      onSaved();
    } catch (e: any) { toast.error('Failed', e.response?.data?.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={!!supplier} onClose={onClose} title={form.id ? 'Edit Supplier' : 'Add Supplier'} size="md"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving} disabled={!form.name}>{form.id ? 'Update' : 'Create'}</Button></>}>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Name *" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Company" value={form.company || ''} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        <Input label="Phone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input label="Email" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="City" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <Input label="Tax / NTN" value={form.taxNumber || ''} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} />
        <Input label="Opening Balance" type="number" value={form.openingBalance ?? 0} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} />
        <Input label="Credit Terms" value={form.creditTerms || ''} onChange={(e) => setForm({ ...form, creditTerms: e.target.value })} />
        <div className="col-span-2">
          <Input label="Address" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}

function SupplierPaymentModal({ supplier, onClose, onSaved }: any) {
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (supplier) { setAmount(supplier.payable > 0 ? supplier.payable : 0); setMethod('CASH'); setReference(''); }
  }, [supplier]);

  const submit = async () => {
    if (!amount || amount <= 0) return toast.warning('Enter valid amount');
    setSaving(true);
    try {
      await api.post(`/suppliers/${supplier.id}/payments`, { amount, method, reference });
      toast.success('Payment recorded');
      onSaved();
    } catch (e: any) { toast.error('Failed', e.response?.data?.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={!!supplier} onClose={onClose} title="Supplier Payment" size="sm"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving}>Pay</Button></>}>
      {supplier && (
        <div className="space-y-3">
          <div className="p-3 bg-surface-hover rounded-md">
            <p className="text-xs text-ink-secondary">Supplier</p>
            <p className="font-medium text-ink-primary">{supplier.name}</p>
            <p className="text-xs text-amber-600 mt-1">Payable: Rs {formatMoney(supplier.payable)}</p>
          </div>
          <Input label="Amount" type="number" value={amount || ''} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} />
          <Select label="Method" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="CASH">Cash</option>
            <option value="BANK">Bank</option>
            <option value="CARD">Card</option>
          </Select>
          <Input label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
      )}
    </Modal>
  );
}