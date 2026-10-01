import { useEffect, useState } from 'react';
import { Plus, Search, Trash2, TrendingDown, Download } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, Card, Input, Select, Table, Badge, Pagination, Empty, Modal, StatCard } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { formatMoney, formatDate } from '../lib/format';
import { exportCSV, csvFilename } from '../lib/csv';
import type { Column } from '../components/ui';

export default function Expenses() {
  const toast = useToast();
  const [data, setData] = useState<any>({ items: [], total: 0 });
  const [categories, setCategories] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/expenses', { params: { search, categoryId, page, pageSize: 20 } })
      .then((r) => setData(unwrap(r))).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get('/expenses/categories').then((r) => setCategories(unwrap(r)));
    // eslint-disable-next-line
  }, [search, categoryId, page]);

  const totalAmount = data.items.reduce((s: number, e: any) => s + e.amount, 0);

  const handleExport = () => {
    exportCSV(data.items, [
      { key: 'date', header: 'Date', value: (r: any) => formatDate(r.expenseDate) },
      { key: 'category', header: 'Category', value: (r: any) => r.category.name },
      { key: 'description', header: 'Description' },
      { key: 'amount', header: 'Amount' },
      { key: 'method', header: 'Payment Method' },
      { key: 'reference', header: 'Reference' },
    ], csvFilename('expenses'));
    toast.success('Exported');
  };

  const handleDelete = async (r: any) => {
    if (!confirm(`Delete expense "${r.description || r.category.name}"?`)) return;
    try {
      await api.delete(`/expenses/${r.id}`);
      toast.success('Expense deleted');
      load();
    } catch (e: any) { toast.error('Failed', e.response?.data?.message); }
  };

  const columns: Column<any>[] = [
    { key: 'date', header: 'Date', render: (r) => formatDate(r.expenseDate) },
    { key: 'cat', header: 'Category', render: (r) => <Badge variant="purple">{r.category.name}</Badge> },
    { key: 'desc', header: 'Description', render: (r) => r.description || '—' },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className="font-medium text-danger">Rs {formatMoney(r.amount)}</span> },
    { key: 'method', header: 'Method', render: (r) => <Badge variant="blue">{r.method}</Badge> },
    { key: 'ref', header: 'Reference', render: (r) => <span className="text-xs text-ink-secondary">{r.reference || '—'}</span> },
    { key: 'actions', header: '', align: 'right', render: (r) => (
      <button onClick={() => handleDelete(r)} className="p-1 text-ink-muted hover:text-danger rounded hover:bg-surface-hover">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    )},
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Expenses" subtitle={`${data.total} expenses`}
        actions={<>
          <Button variant="outline" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExport}>Export</Button>
          <Button icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowForm(true)}>Add Expense</Button>
        </>} />

      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatCard label="Total Expenses" value={data.total} icon={<TrendingDown className="w-4 h-4" />} />
        <StatCard label="Page Total" value={`Rs ${formatMoney(totalAmount)}`} accent="danger" />
        <StatCard label="Categories" value={categories.length} accent="gray" />
      </div>

      <Card padding="none" className="mb-4">
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input placeholder="Search description…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            leftIcon={<Search className="w-3.5 h-3.5" />} />
          <Select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}>
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
      </Card>

      <Card padding="none">
        <Table columns={columns} data={data.items} loading={loading} empty={<Empty title="No expenses recorded" />} />
        {data.total > 20 && <Pagination page={page} total={data.total} pageSize={20} onChange={setPage} />}
      </Card>

      <ExpenseForm open={showForm} onClose={() => setShowForm(false)} categories={categories}
        onSaved={() => { setShowForm(false); load(); toast.success('Expense added'); }} />
    </div>
  );
}

function ExpenseForm({ open, onClose, categories, onSaved }: any) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (open) setForm({
      categoryId: '', amount: 0, method: 'CASH', description: '',
      reference: '', expenseDate: new Date().toISOString().slice(0, 10),
    });
  }, [open]);

  const submit = async () => {
    setSaving(true);
    try {
      await api.post('/expenses', { ...form, amount: Number(form.amount) || 0 });
      onSaved();
    } catch (e: any) { toast.error('Failed', e.response?.data?.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Expense" size="md"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving} disabled={!form.categoryId || !form.amount}>Save</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select label="Category *" value={form.categoryId || ''} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">Select category</option>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input label="Amount *" type="number" value={form.amount ?? 0} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Select label="Payment Method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            <option value="CASH">Cash</option>
            <option value="BANK">Bank</option>
            <option value="CARD">Card</option>
          </Select>
          <Input label="Date" type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} />
        </div>
        <Input label="Description" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Input label="Reference" value={form.reference || ''} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
      </div>
    </Modal>
  );
}