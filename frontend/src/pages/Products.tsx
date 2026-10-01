import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, MoreVertical, Package, Download, X } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, Card, Input, Select, Table, Badge, Pagination, Empty, Dropdown, Modal, ConfirmDialog } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { formatMoney } from '../lib/format';
import { exportCSV, csvFilename } from '../lib/csv';
import type { Column } from '../components/ui';

export default function Products() {
  const toast = useToast();
  const [data, setData] = useState<any>({ items: [], total: 0 });
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/products', { params: { search, categoryId, page, pageSize: 20 } })
      .then((r) => setData(unwrap(r))).finally(() => setLoading(false));
  };

  const loadMeta = () => {
    api.get('/products/meta/categories').then((r) => setCategories(unwrap(r)));
    api.get('/products/meta/brands').then((r) => setBrands(unwrap(r)));
  };

  useEffect(() => {
    load();
    loadMeta();
    // eslint-disable-next-line
  }, [search, categoryId, page]);

  const handleExport = () => {
    exportCSV(data.items, [
      { key: 'name', header: 'Product' },
      { key: 'model', header: 'Model' },
      { key: 'sku', header: 'SKU' },
      { key: 'brand', header: 'Brand', value: (r: any) => r.brand?.name || '' },
      { key: 'category', header: 'Category', value: (r: any) => r.category?.name || '' },
      { key: 'purchasePrice', header: 'Purchase Price' },
      { key: 'salePrice', header: 'Sale Price' },
      { key: 'stock', header: 'Stock', value: (r: any) => r.inventory?.quantity || 0 },
    ], csvFilename('products'));
    toast.success('Exported');
  };

  const columns: Column<any>[] = [
    { key: 'product', header: 'Product', render: (r) => (
      <Link to={`/products/${r.id}`} className="flex items-center gap-3 hover:opacity-80">
        <div className="w-9 h-9 rounded-md bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center flex-shrink-0">
          <Package className="w-4 h-4 text-brand-600 dark:text-brand-400" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-primary truncate">{r.name}</p>
          <p className="text-xs text-ink-secondary">{r.model || '—'}</p>
        </div>
      </Link>
    )},
    { key: 'brand', header: 'Brand', render: (r) => r.brand?.name || '—' },
    { key: 'category', header: 'Category', render: (r) => r.category?.name || '—' },
    { key: 'price', header: 'Sale Price', align: 'right', render: (r) => <span className="font-medium">Rs {formatMoney(r.salePrice)}</span> },
    { key: 'stock', header: 'Stock', align: 'center', render: (r) => {
      const stock = r.inventory?.quantity ?? 0;
      const variant = stock <= 0 ? 'red' : stock <= r.minStockLevel ? 'amber' : 'green';
      return <Badge variant={variant} dot>{stock}</Badge>;
    }},
    { key: 'status', header: 'Status', render: (r) => <Badge variant={r.active ? 'green' : 'gray'} dot>{r.active ? 'Active' : 'Inactive'}</Badge> },
    { key: 'actions', header: '', align: 'right', render: (r) => (
      <Dropdown trigger={<button className="p-1 text-ink-muted hover:text-ink-primary rounded hover:bg-surface-hover"><MoreVertical className="w-4 h-4" /></button>}>
        <Dropdown.Item icon={<Edit className="w-3.5 h-3.5" />} onClick={() => { setEditing(r); setShowForm(true); }}>Edit</Dropdown.Item>
        <Dropdown.Item danger onClick={() => setDeleting(r)}>Deactivate</Dropdown.Item>
      </Dropdown>
    )},
  ];

  const handleDelete = async () => {
    try {
      await api.delete(`/products/${deleting.id}`);
      toast.success('Product deactivated');
      setDeleting(null); load();
    } catch (e: any) { toast.error('Failed', e.response?.data?.message); }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Products" subtitle={`${data.total} products in catalogue`}
        actions={<>
          <Button variant="outline" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExport}>Export</Button>
          <Button icon={<Plus className="w-3.5 h-3.5" />} onClick={() => { setEditing(null); setShowForm(true); }}>Add Product</Button>
        </>} />

      <Card padding="none" className="mb-4">
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="Search name, SKU, barcode…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            leftIcon={<Search className="w-3.5 h-3.5" />} />
          <Select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}>
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
      </Card>

      <Card padding="none">
        <Table columns={columns} data={data.items} loading={loading} empty={<Empty title="No products yet" />} />
        {data.total > 20 && <Pagination page={page} total={data.total} pageSize={20} onChange={setPage} />}
      </Card>

      <ProductForm
        open={showForm}
        onClose={() => setShowForm(false)}
        product={editing}
        categories={categories}
        brands={brands}
        onRefreshMeta={loadMeta}
        onSaved={() => { setShowForm(false); load(); toast.success(editing ? 'Product updated' : 'Product created'); }}
      />

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete}
        title="Deactivate product?" message={`Are you sure you want to deactivate "${deleting?.name}"?`}
        confirmLabel="Deactivate" danger />
    </div>
  );
}

function ProductForm({ open, onClose, product, categories, brands, onRefreshMeta, onSaved }: any) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const toast = useToast();

  useEffect(() => {
    if (open) {
      setForm(product || {
        name: '', model: '', sku: '', barcode: '',
        purchasePrice: 0, salePrice: 0, minSalePrice: 0,
        minStockLevel: 5, warranty: '', description: '', openingStock: 0, active: true,
      });
      setShowNewCategory(false);
      setShowNewBrand(false);
      setNewCategoryName('');
      setNewBrandName('');
    }
  }, [open, product]);

  const createCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await api.post('/products/meta/categories', { name: newCategoryName.trim() });
      const cat = unwrap(res);
      onRefreshMeta();
      setForm({ ...form, categoryId: cat.id });
      setShowNewCategory(false);
      setNewCategoryName('');
      toast.success('Category added');
    } catch (e: any) { toast.error('Failed', e.response?.data?.message); }
  };

  const createBrand = async () => {
    if (!newBrandName.trim()) return;
    try {
      const res = await api.post('/products/meta/brands', { name: newBrandName.trim() });
      const brand = unwrap(res);
      onRefreshMeta();
      setForm({ ...form, brandId: brand.id });
      setShowNewBrand(false);
      setNewBrandName('');
      toast.success('Brand added');
    } catch (e: any) { toast.error('Failed', e.response?.data?.message); }
  };

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        purchasePrice: Number(form.purchasePrice) || 0,
        salePrice: Number(form.salePrice) || 0,
        minSalePrice: Number(form.minSalePrice) || 0,
        minStockLevel: Number(form.minStockLevel) || 5,
        openingStock: Number(form.openingStock) || 0,
      };
      if (product) await api.put(`/products/${product.id}`, payload);
      else await api.post('/products', payload);
      onSaved();
    } catch (e: any) {
      toast.error('Save failed', e.response?.data?.message);
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={product ? 'Edit Product' : 'Add Product'} size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving} disabled={!form.name}>{product ? 'Update' : 'Create'}</Button></>}>
      <div className="space-y-6">

        {/* BASIC INFO */}
        <div>
          <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Basic Information</h4>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Product Name *" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Model" value={form.model || ''} onChange={(e) => setForm({ ...form, model: e.target.value })} />

            {/* CATEGORY with + button */}
            <div className="w-full">
              <label className="block text-xs font-medium text-ink-secondary mb-1.5">Category</label>
              <div className="flex gap-2">
                <select
                  value={form.categoryId || ''}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value || null })}
                  className="flex-1 px-3 py-2 bg-surface-input border border-edge-base rounded-md text-sm text-ink-primary cursor-pointer"
                >
                  <option value="">Select category</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewCategory(!showNewCategory)}
                  className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-md transition-colors flex items-center justify-center"
                  title="Add new category"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {showNewCategory && (
                <div className="mt-2 flex gap-2 items-center p-3 border border-edge-base rounded-md bg-surface-hover">
                  <input
                    type="text"
                    placeholder="New category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createCategory()}
                    className="flex-1 px-3 py-2 bg-surface-input border border-edge-base rounded-md text-sm"
                    autoFocus
                  />
                  <Button size="sm" onClick={createCategory} disabled={!newCategoryName.trim()}>Add</Button>
                  <button onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }} className="p-2 text-ink-muted hover:text-danger">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* BRAND with + button */}
            <div className="w-full">
              <label className="block text-xs font-medium text-ink-secondary mb-1.5">Brand</label>
              <div className="flex gap-2">
                <select
                  value={form.brandId || ''}
                  onChange={(e) => setForm({ ...form, brandId: e.target.value || null })}
                  className="flex-1 px-3 py-2 bg-surface-input border border-edge-base rounded-md text-sm text-ink-primary cursor-pointer"
                >
                  <option value="">Select brand</option>
                  {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewBrand(!showNewBrand)}
                  className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-md transition-colors flex items-center justify-center"
                  title="Add new brand"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {showNewBrand && (
                <div className="mt-2 flex gap-2 items-center p-3 border border-edge-base rounded-md bg-surface-hover">
                  <input
                    type="text"
                    placeholder="New brand name"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createBrand()}
                    className="flex-1 px-3 py-2 bg-surface-input border border-edge-base rounded-md text-sm"
                    autoFocus
                  />
                  <Button size="sm" onClick={createBrand} disabled={!newBrandName.trim()}>Add</Button>
                  <button onClick={() => { setShowNewBrand(false); setNewBrandName(''); }} className="p-2 text-ink-muted hover:text-danger">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <Input label="SKU / Product Code" value={form.sku || ''} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            <Input label="Barcode" value={form.barcode || ''} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          </div>
        </div>

        {/* PRICING */}
        <div>
          <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Pricing</h4>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Purchase Price" type="number" value={form.purchasePrice ?? 0} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} />
            <Input label="Sale Price" type="number" value={form.salePrice ?? 0} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} />
            <Input label="Min Sale Price" type="number" value={form.minSalePrice ?? 0} onChange={(e) => setForm({ ...form, minSalePrice: e.target.value })} />
          </div>
        </div>

        {/* INVENTORY */}
        <div>
          <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Inventory</h4>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Minimum Stock" type="number" value={form.minStockLevel ?? 5} onChange={(e) => setForm({ ...form, minStockLevel: e.target.value })} />
            {!product && <Input label="Opening Stock" type="number" value={form.openingStock ?? 0} onChange={(e) => setForm({ ...form, openingStock: e.target.value })} />}
          </div>
        </div>

        {/* ADDITIONAL */}
        <div>
          <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Additional</h4>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Warranty" value={form.warranty || ''} onChange={(e) => setForm({ ...form, warranty: e.target.value })} placeholder="e.g. 6 months" />
            <Select label="Status" value={form.active ? '1' : '0'} onChange={(e) => setForm({ ...form, active: e.target.value === '1' })}>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </Select>
          </div>
          <div className="mt-4">
            <Input label="Description" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
      </div>
    </Modal>
  );
}