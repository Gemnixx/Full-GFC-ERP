import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, MoreVertical, Package, Download, X, Trash2, Layers } from 'lucide-react';
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
  const [sizes, setSizes] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
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
    api.get('/products/meta/sizes').then((r) => setSizes(unwrap(r)));
    api.get('/products/meta/colors').then((r) => setColors(unwrap(r)));
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
      { key: 'brand', header: 'Brand', value: (r: any) => r.brand?.name || '' },
      { key: 'category', header: 'Category', value: (r: any) => r.category?.name || '' },
      {
        key: 'variants', header: 'Variants',
        value: (r: any) => (r.variants || [])
          .map((v: any) => `${v.size || '-'}/${v.color || '-'}: ${v.stock}`)
          .join(' | '),
      },
      { key: 'stock', header: 'Total Stock', value: (r: any) => (r.variants || []).reduce((s: number, v: any) => s + (v.stock || 0), 0) },
      { key: 'salePrice', header: 'Sale Price' },
    ], csvFilename('products'));
    toast.success('Exported');
  };

  const columns: Column<any>[] = [
    {
      key: 'product', header: 'Product', render: (r) => (
        <Link to={`/products/${r.id}`} className="flex items-center gap-3 hover:opacity-80">
          <div className="w-9 h-9 rounded-md bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center flex-shrink-0">
            <Package className="w-4 h-4 text-brand-600 dark:text-brand-400" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-primary truncate">{r.name}</p>
            <p className="text-xs text-ink-secondary">{r.model || '—'}</p>
          </div>
        </Link>
      ),
    },
    {
      key: 'variants', header: 'Variants', render: (r) => {
        const vs = r.variants || [];
        if (vs.length === 0) return <span className="text-xs text-ink-muted italic">None</span>;
        return (
          <div className="flex flex-wrap gap-1 max-w-xs">
            {vs.slice(0, 4).map((v: any, idx: number) => (
              <span key={idx} className="text-[11px] px-1.5 py-0.5 bg-surface-hover border border-edge-base rounded">
                {v.size || '-'}/{v.color || '-'}
                <span className="text-ink-muted ml-1">×{v.stock}</span>
              </span>
            ))}
            {vs.length > 4 && (
              <span className="text-[11px] text-ink-muted px-1.5 py-0.5">+{vs.length - 4} more</span>
            )}
          </div>
        );
      },
    },
    { key: 'brand', header: 'Brand', render: (r) => r.brand?.name || '—' },
    { key: 'category', header: 'Category', render: (r) => r.category?.name || '—' },
    {
      key: 'price', header: 'Sale Price', align: 'right',
      render: (r) => <span className="font-medium">Rs {formatMoney(r.salePrice)}</span>,
    },
    {
      key: 'stock', header: 'Stock', align: 'center', render: (r) => {
        const variantTotal = (r.variants || []).reduce((s: number, v: any) => s + (v.stock || 0), 0);
        const stock = (r.variants || []).length > 0 ? variantTotal : (r.inventory?.quantity ?? 0);
        const variant = stock <= 0 ? 'red' : stock <= r.minStockLevel ? 'amber' : 'green';
        return <Badge variant={variant} dot>{stock}</Badge>;
      },
    },
    {
      key: 'status', header: 'Status',
      render: (r) => <Badge variant={r.active ? 'green' : 'gray'} dot>{r.active ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions', header: '', align: 'right', render: (r) => (
        <Dropdown trigger={<button className="p-1 text-ink-muted hover:text-ink-primary rounded hover:bg-surface-hover"><MoreVertical className="w-4 h-4" /></button>}>
          <Dropdown.Item icon={<Edit className="w-3.5 h-3.5" />} onClick={() => { setEditing(r); setShowForm(true); }}>Edit</Dropdown.Item>
          <Dropdown.Item danger onClick={() => setDeleting(r)}>Deactivate</Dropdown.Item>
        </Dropdown>
      ),
    },
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
        sizes={sizes}
        colors={colors}
        onRefreshMeta={loadMeta}
        onSaved={() => {
          setShowForm(false);
          load();
          toast.success(editing ? 'Product updated' : 'Product created');
        }}
      />

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete}
        title="Deactivate product?" message={`Are you sure you want to deactivate "${deleting?.name}"?`}
        confirmLabel="Deactivate" danger />
    </div>
  );
}

// ================= PRODUCT FORM =================
function ProductForm({
  open, onClose, product, categories, brands, sizes, colors, onRefreshMeta, onSaved,
}: any) {
  const [form, setForm] = useState<any>({});
  const [variants, setVariants] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [showNewSize, setShowNewSize] = useState(false);
  const [showNewColor, setShowNewColor] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [newSizeName, setNewSizeName] = useState('');
  const [newColorName, setNewColorName] = useState('');

  const [bulkSize, setBulkSize] = useState('');
  const [bulkColors, setBulkColors] = useState<string[]>([]);
  const [bulkStock, setBulkStock] = useState(0);

  useEffect(() => {
    if (open) {
      setForm(product || {
        name: '', model: '', sku: '', barcode: '',
        purchasePrice: 0, salePrice: 0, minSalePrice: 0,
        minStockLevel: 5, warranty: '', description: '', active: true,
      });

      if (product?.variants && product.variants.length > 0) {
        setVariants(product.variants.map((v: any) => ({
          id: v.id,
          size: v.size || '',
          color: v.color || '',
          sku: v.sku || '',
          stock: v.stock || 0,
          purchasePrice: v.purchasePrice || product.purchasePrice || 0,
          salePrice: v.salePrice || product.salePrice || 0,
          active: v.active ?? true,
        })));
      } else {
        setVariants([]);
      }

      setShowNewCategory(false);
      setShowNewBrand(false);
      setShowNewSize(false);
      setShowNewColor(false);
      setNewCategoryName('');
      setNewBrandName('');
      setNewSizeName('');
      setNewColorName('');
      setBulkSize('');
      setBulkColors([]);
      setBulkStock(0);
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

  const createSize = async () => {
    if (!newSizeName.trim()) return;
    try {
      const res = await api.post('/products/meta/sizes', { name: newSizeName.trim() });
      const sz = unwrap(res);
      onRefreshMeta();
      setShowNewSize(false);
      setNewSizeName('');
      setBulkSize(sz.name);
      toast.success('Size added');
    } catch (e: any) { toast.error('Failed', e.response?.data?.message); }
  };

  const createColor = async () => {
    if (!newColorName.trim()) return;
    try {
      const res = await api.post('/products/meta/colors', { name: newColorName.trim() });
      unwrap(res);
      onRefreshMeta();
      setShowNewColor(false);
      setNewColorName('');
      toast.success('Color added');
    } catch (e: any) { toast.error('Failed', e.response?.data?.message); }
  };

  const addBulkVariants = () => {
    if (!bulkSize || bulkColors.length === 0) {
      return toast.warning('Select size and at least one color');
    }

    const newOnes: any[] = [];
    for (const color of bulkColors) {
      const exists = variants.some((v) => v.size === bulkSize && v.color === color);
      if (exists) continue;
      newOnes.push({
        size: bulkSize,
        color,
        sku: '',
        stock: Number(bulkStock) || 0,
        purchasePrice: Number(form.purchasePrice) || 0,
        salePrice: Number(form.salePrice) || 0,
        active: true,
      });
    }

    if (newOnes.length === 0) {
      return toast.warning('All selected combinations already exist');
    }

    setVariants([...variants, ...newOnes]);
    setBulkSize('');
    setBulkColors([]);
    setBulkStock(0);
    toast.success(`${newOnes.length} variant(s) added`);
  };

  const updateVariant = (idx: number, field: string, value: any) => {
    setVariants(variants.map((v, i) => i === idx ? { ...v, [field]: value } : v));
  };

  const removeVariant = (idx: number) => {
    setVariants(variants.filter((_, i) => i !== idx));
  };

  const toggleBulkColor = (name: string) => {
    setBulkColors((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name],
    );
  };

  const submit = async () => {
    if (!form.name) return toast.warning('Product name required');

    const seen = new Set<string>();
    for (const v of variants) {
      const key = `${v.size || ''}||${v.color || ''}`;
      if (seen.has(key)) {
        return toast.warning('Duplicate variant', `Size ${v.size} + Color ${v.color} already exists`);
      }
      seen.add(key);
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        purchasePrice: Number(form.purchasePrice) || 0,
        salePrice: Number(form.salePrice) || 0,
        minSalePrice: Number(form.minSalePrice) || 0,
        minStockLevel: Number(form.minStockLevel) || 5,
        openingStock: 0,
        variants: variants.map((v) => ({
          id: v.id,
          size: v.size?.trim() || null,
          color: v.color?.trim() || null,
          sku: v.sku?.trim() || null,
          barcode: v.barcode?.trim() || null,
          stock: Number(v.stock) || 0,
          purchasePrice: Number(v.purchasePrice) || 0,
          salePrice: Number(v.salePrice) || 0,
          active: v.active ?? true,
        })),
      };
      if (product) await api.put(`/products/${product.id}`, payload);
      else await api.post('/products', payload);
      onSaved();
    } catch (e: any) {
      toast.error('Save failed', e.response?.data?.message);
    } finally { setSaving(false); }
  };

  const totalVariantStock = variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);

  return (
    <Modal open={open} onClose={onClose} title={product ? 'Edit Product' : 'Add Product'} size="lg"
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={saving} disabled={!form.name}>
          {product ? 'Update' : 'Create'}
        </Button>
      </>}>
      <div className="space-y-6">

        {/* BASIC INFO */}
        <div>
          <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">
            Basic Information
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Product Name *" value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Ceiling Fan" />
            <Input label="Model" value={form.model || ''}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              placeholder="e.g. Nabeel" />

            <div className="w-full">
              <label className="block text-xs font-medium text-ink-secondary mb-1.5">Category</label>
              <div className="flex gap-2">
                <select value={form.categoryId || ''}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value || null })}
                  className="flex-1 px-3 py-2 bg-surface-input border border-edge-base rounded-md text-sm text-ink-primary cursor-pointer">
                  <option value="">Select category</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="button" onClick={() => setShowNewCategory(!showNewCategory)}
                  className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-md">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {showNewCategory && (
                <div className="mt-2 flex gap-2 items-center p-3 border border-edge-base rounded-md bg-surface-hover">
                  <input type="text" placeholder="New category name" value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createCategory()}
                    className="flex-1 px-3 py-2 bg-surface-input border border-edge-base rounded-md text-sm" autoFocus />
                  <Button size="sm" onClick={createCategory} disabled={!newCategoryName.trim()}>Add</Button>
                  <button onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }} className="p-2 text-ink-muted hover:text-danger">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="w-full">
              <label className="block text-xs font-medium text-ink-secondary mb-1.5">Brand</label>
              <div className="flex gap-2">
                <select value={form.brandId || ''}
                  onChange={(e) => setForm({ ...form, brandId: e.target.value || null })}
                  className="flex-1 px-3 py-2 bg-surface-input border border-edge-base rounded-md text-sm text-ink-primary cursor-pointer">
                  <option value="">Select brand</option>
                  {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <button type="button" onClick={() => setShowNewBrand(!showNewBrand)}
                  className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-md">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {showNewBrand && (
                <div className="mt-2 flex gap-2 items-center p-3 border border-edge-base rounded-md bg-surface-hover">
                  <input type="text" placeholder="New brand name" value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createBrand()}
                    className="flex-1 px-3 py-2 bg-surface-input border border-edge-base rounded-md text-sm" autoFocus />
                  <Button size="sm" onClick={createBrand} disabled={!newBrandName.trim()}>Add</Button>
                  <button onClick={() => { setShowNewBrand(false); setNewBrandName(''); }} className="p-2 text-ink-muted hover:text-danger">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <Input label="SKU / Product Code" value={form.sku || ''}
              onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            <Input label="Barcode" value={form.barcode || ''}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          </div>
        </div>

        {/* VARIANTS */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Variants (Size × Color × Stock)
              </h4>
              <p className="text-xs text-ink-muted mt-0.5">
                {variants.length} variant(s) · Total stock:{' '}
                <span className="font-semibold text-ink-primary">{totalVariantStock}</span>
              </p>
            </div>
          </div>

          <div className="border border-edge-base rounded-md p-3 bg-surface-hover space-y-3">
            <p className="text-xs font-medium text-ink-secondary">
              Bulk add: size select karo, colors tick karo, ek saath add karo
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
              <div>
                <label className="block text-[11px] font-medium text-ink-secondary mb-1">Size</label>
                <div className="flex gap-1">
                  <select value={bulkSize} onChange={(e) => setBulkSize(e.target.value)}
                    className="flex-1 px-2 py-1.5 bg-surface-input border border-edge-base rounded-md text-xs cursor-pointer">
                    <option value="">Select size</option>
                    {sizes.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setShowNewSize(!showNewSize)}
                    className="px-2 bg-brand-600 hover:bg-brand-700 text-white rounded-md"
                    title="Add new size">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ink-secondary mb-1">Stock per color</label>
                <input type="number" value={bulkStock || ''}
                  onChange={(e) => setBulkStock(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-2 py-1.5 bg-surface-input border border-edge-base rounded-md text-xs text-right" />
              </div>

              <div className="md:text-right">
                <Button size="sm" onClick={addBulkVariants}
                  disabled={!bulkSize || bulkColors.length === 0}
                  icon={<Plus className="w-3.5 h-3.5" />}>
                  Add {bulkColors.length > 0 ? `(${bulkColors.length})` : ''}
                </Button>
              </div>
            </div>

            {showNewSize && (
              <div className="flex gap-2 items-center p-2 border border-edge-base rounded-md bg-surface-card">
                <input type="text" placeholder="New size e.g. 36, 48, 56" value={newSizeName}
                  onChange={(e) => setNewSizeName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createSize()}
                  className="flex-1 px-2 py-1.5 bg-surface-input border border-edge-base rounded-md text-xs" autoFocus />
                <Button size="sm" onClick={createSize} disabled={!newSizeName.trim()}>Add</Button>
                <button onClick={() => { setShowNewSize(false); setNewSizeName(''); }} className="p-1.5 text-ink-muted hover:text-danger">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-medium text-ink-secondary">
                  Colors (multi-select)
                </label>
                <button type="button" onClick={() => setShowNewColor(!showNewColor)}
                  className="text-[11px] text-brand-600 hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add color
                </button>
              </div>
              {showNewColor && (
                <div className="flex gap-2 items-center p-2 border border-edge-base rounded-md bg-surface-card mb-2">
                  <input type="text" placeholder="New color e.g. Black, Off White" value={newColorName}
                    onChange={(e) => setNewColorName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createColor()}
                    className="flex-1 px-2 py-1.5 bg-surface-input border border-edge-base rounded-md text-xs" autoFocus />
                  <Button size="sm" onClick={createColor} disabled={!newColorName.trim()}>Add</Button>
                  <button onClick={() => { setShowNewColor(false); setNewColorName(''); }} className="p-1.5 text-ink-muted hover:text-danger">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {colors.length === 0 && (
                  <span className="text-xs text-ink-muted italic">No colors yet — click "Add color"</span>
                )}
                {colors.map((c: any) => {
                  const selected = bulkColors.includes(c.name);
                  return (
                    <button key={c.id} type="button"
                      onClick={() => toggleBulkColor(c.name)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                        selected
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-surface-card text-ink-secondary border-edge-base hover:border-brand-500'
                      }`}>
                      {c.hex && (
                        <span className="w-3 h-3 rounded-full border border-white/30"
                          style={{ backgroundColor: c.hex }} />
                      )}
                      {c.name}
                      {selected && <X className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4">
            {variants.length === 0 ? (
              <div className="border border-dashed border-edge-base rounded-md p-6 text-center">
                <Package className="w-8 h-8 text-ink-muted mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-ink-secondary">No variants yet</p>
                <p className="text-xs text-ink-muted mt-1">
                  Use bulk add above to quickly add size + color combinations
                </p>
              </div>
            ) : (
              <div className="border border-edge-base rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-surface-hover">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-ink-secondary">Size</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-ink-secondary">Color</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-ink-secondary">SKU</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-ink-secondary">Stock</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-edge-light">
                    {variants.map((v, idx) => (
                      <tr key={idx} className="hover:bg-surface-hover/50">
                        <td className="px-3 py-2">
                          <input type="text" value={v.size || ''}
                            onChange={(e) => updateVariant(idx, 'size', e.target.value)}
                            list="size-options"
                            className="w-full px-2 py-1 bg-surface-input border border-edge-base rounded text-xs"
                            placeholder="Size" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="text" value={v.color || ''}
                            onChange={(e) => updateVariant(idx, 'color', e.target.value)}
                            list="color-options"
                            className="w-full px-2 py-1 bg-surface-input border border-edge-base rounded text-xs"
                            placeholder="Color" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="text" value={v.sku || ''}
                            onChange={(e) => updateVariant(idx, 'sku', e.target.value)}
                            placeholder="SKU"
                            className="w-full px-2 py-1 bg-surface-input border border-edge-base rounded text-xs" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" value={v.stock ?? 0}
                            onChange={(e) => updateVariant(idx, 'stock', e.target.value)}
                            className="w-20 px-2 py-1 bg-surface-input border border-edge-base rounded text-xs text-right ml-auto block" />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => removeVariant(idx)} className="text-ink-muted hover:text-danger p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <datalist id="size-options">
              {sizes.map((s: any) => <option key={s.id} value={s.name} />)}
            </datalist>
            <datalist id="color-options">
              {colors.map((c: any) => <option key={c.id} value={c.name} />)}
            </datalist>
          </div>
        </div>

        {/* PRICING */}
        <div>
          <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Pricing</h4>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Purchase Price" type="number" value={form.purchasePrice ?? 0}
              onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} />
            <Input label="Sale Price" type="number" value={form.salePrice ?? 0}
              onChange={(e) => setForm({ ...form, salePrice: e.target.value })} />
            <Input label="Min Sale Price" type="number" value={form.minSalePrice ?? 0}
              onChange={(e) => setForm({ ...form, minSalePrice: e.target.value })} />
          </div>
        </div>

        {/* ADDITIONAL */}
        <div>
          <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Additional</h4>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Minimum Stock Alert" type="number" value={form.minStockLevel ?? 5}
              onChange={(e) => setForm({ ...form, minStockLevel: e.target.value })} />
            <Input label="Warranty" value={form.warranty || ''}
              onChange={(e) => setForm({ ...form, warranty: e.target.value })}
              placeholder="e.g. 6 months" />
          </div>
          <div className="mt-4">
            <Input label="Description" value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="mt-4">
            <Select label="Status" value={form.active ? '1' : '0'}
              onChange={(e) => setForm({ ...form, active: e.target.value === '1' })}>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </Select>
          </div>
        </div>
      </div>
    </Modal>
  );
}