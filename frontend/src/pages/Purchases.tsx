import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Download, Trash2, Package, AlertTriangle } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, Card, Input, Table, Badge, Pagination, Empty, Modal, Select } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { formatMoney, formatDate } from '../lib/format';
import { exportCSV, csvFilename } from '../lib/csv';
import type { Column } from '../components/ui';

export default function Purchases() {
  const nav = useNavigate();
  const toast = useToast();
  const [data, setData] = useState<any>({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/purchases', { params: { search, page, pageSize: 20 } })
      .then((r) => setData(unwrap(r)))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search, page]);

  const handleExport = () => {
    exportCSV(data.items, [
      { key: 'purchaseNumber', header: 'Purchase #' },
      { key: 'supplier', header: 'Supplier', value: (r: any) => r.supplier.name },
      { key: 'purchaseDate', header: 'Date', value: (r: any) => formatDate(r.purchaseDate) },
      { key: 'items', header: 'Items', value: (r: any) => r.items.length },
      { key: 'total', header: 'Total' },
      { key: 'paid', header: 'Paid' },
      { key: 'due', header: 'Due' },
      { key: 'paymentMethod', header: 'Method' },
    ], csvFilename('purchases'));
    toast.success('Exported');
  };

  const columns: Column<any>[] = [
    { key: 'pn', header: 'Purchase #', render: (r) => <span className="font-mono text-xs">{r.purchaseNumber}</span> },
    { key: 'supplier', header: 'Supplier', render: (r) => r.supplier.name },
    { key: 'date', header: 'Date', render: (r) => <span className="text-xs text-ink-secondary">{formatDate(r.purchaseDate)}</span> },
    { key: 'items', header: 'Items', align: 'center', render: (r) => r.items.length },
    { key: 'total', header: 'Total', align: 'right', render: (r) => <span className="font-medium">Rs {formatMoney(r.total)}</span> },
    { key: 'paid', header: 'Paid', align: 'right', render: (r) => <span className="text-emerald-600">Rs {formatMoney(r.paid)}</span> },
    { key: 'due', header: 'Due', align: 'right', render: (r) => <span className={r.due > 0 ? 'text-amber-600' : 'text-ink-muted'}>Rs {formatMoney(r.due)}</span> },
    { key: 'method', header: 'Method', render: (r) => <Badge variant="blue">{r.paymentMethod}</Badge> },
    { key: 'status', header: 'Status', render: (r) => <Badge variant="green" dot>{r.status}</Badge> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <button
          onClick={() => nav(`/purchases/${r.id}`)}
          className="p-1.5 text-ink-muted hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 rounded transition-colors"
          title="View Purchase"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Purchases" subtitle={`${data.total} purchase orders`}
        actions={<>
          <Button variant="outline" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExport}>Export</Button>
          <Button icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowForm(true)}>New Purchase</Button>
        </>} />

      <Card padding="none" className="mb-4">
        <div className="p-4">
          <Input placeholder="Search purchase # or supplier…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            leftIcon={<Search className="w-3.5 h-3.5" />} />
        </div>
      </Card>

      <Card padding="none">
        <Table columns={columns} data={data.items} loading={loading} empty={<Empty title="No purchases yet" />} />
        {data.total > 20 && <Pagination page={page} total={data.total} pageSize={20} onChange={setPage} />}
      </Card>

      <NewPurchaseModal open={showForm} onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); load(); toast.success('Purchase created'); }} />
    </div>
  );
}

// ============================================================
// NEW PURCHASE MODAL
// ============================================================
function NewPurchaseModal({ open, onClose, onSaved }: any) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [lines, setLines] = useState<any[]>([]);
  const [discount, setDiscount] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [paid, setPaid] = useState(0);
  const [method, setMethod] = useState<'CASH' | 'BANK' | 'CREDIT'>('CASH');
  const [saving, setSaving] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState<{ lineIndex: number } | null>(null);
  const toast = useToast();

  const loadProducts = () => {
    api.get('/products', { params: { pageSize: 500 } }).then((r) => setProducts(unwrap(r).items));
  };

  const loadMeta = () => {
    api.get('/products/meta/categories').then((r) => setCategories(unwrap(r))).catch(() => setCategories([]));
    api.get('/products/meta/brands').then((r) => setBrands(unwrap(r))).catch(() => setBrands([]));
  };

  useEffect(() => {
    if (open) {
      api.get('/suppliers', { params: { pageSize: 200 } }).then((r) => setSuppliers(unwrap(r).items));
      loadProducts();
      loadMeta();
      setLines([]); setSupplierId(''); setSupplierInvoiceNo('');
      setDiscount(0); setOtherCharges(0); setPaid(0); setMethod('CASH');
      setShowNewProduct(null);
    }
  }, [open]);

  const subtotal = lines.reduce((s, l) => s + (l.quantity * l.purchasePrice - l.discount), 0);
  const total = subtotal - discount + otherCharges;
  const remaining = Math.max(total - paid, 0);

  const addLine = () => setLines([...lines, { productId: '', quantity: 1, purchasePrice: 0, discount: 0 }]);
  const updateLine = (i: number, patch: any) => {
    setLines(lines.map((l, idx) => {
      if (idx !== i) return l;
      const updated = { ...l, ...patch };
      if (patch.productId) {
        const p = products.find((x) => x.id === patch.productId);
        if (p) updated.purchasePrice = p.purchasePrice || 0;
      }
      return updated;
    }));
  };
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!supplierId) return toast.warning('Select a supplier');
    if (lines.length === 0) return toast.warning('Add at least one product');
    if (lines.some((l) => !l.productId || l.quantity <= 0)) return toast.warning('Fill all line items');

    setSaving(true);
    try {
      const payments: any[] = [];
      if (paid > 0) payments.push({ method, amount: paid });
      if (remaining > 0) payments.push({ method: 'CREDIT', amount: remaining });
      if (payments.length === 0) payments.push({ method: 'CASH', amount: 0 });

      await api.post('/purchases', {
        supplierId, supplierInvoiceNo,
        items: lines.map((l) => ({
          productId: l.productId, quantity: Number(l.quantity),
          purchasePrice: Number(l.purchasePrice), discount: Number(l.discount) || 0,
        })),
        discount, otherCharges, payments,
      });
      onSaved();
    } catch (e: any) {
      toast.error('Failed', e.response?.data?.message);
    } finally { setSaving(false); }
  };

  // Callback when new product created from mini modal
  const handleProductCreated = (newProduct: any) => {
    if (showNewProduct === null) return;
    const lineIdx = showNewProduct.lineIndex;

    // Add to products list
    setProducts((prev) => [newProduct, ...prev]);

    // Update the specific line: set productId and prefill cost
    setLines((prev) =>
      prev.map((l, idx) => {
        if (idx !== lineIdx) return l;
        return {
          ...l,
          productId: newProduct.id,
          purchasePrice: newProduct.purchasePrice || 0,
        };
      })
    );

    setShowNewProduct(null);
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="New Purchase" size="2xl"
        footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving}>Save Purchase</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Select label="Supplier *" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Select supplier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Input label="Supplier Invoice #" value={supplierInvoiceNo} onChange={(e) => setSupplierInvoiceNo(e.target.value)} />
            <div className="flex items-end"><Button variant="outline" onClick={addLine} icon={<Plus className="w-3.5 h-3.5" />}>Add Line</Button></div>
          </div>

          {/* ============ ITEMS TABLE ============ */}
          <div className="border border-edge-base rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-hover">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-ink-secondary">Product</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-ink-secondary w-24">Qty</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-ink-secondary w-32">Cost</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-ink-secondary w-28">Disc</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-ink-secondary w-32">Total</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-ink-muted text-sm">
                      No items — click "Add Line"
                    </td>
                  </tr>
                )}
                {lines.map((l, i) => (
                  <tr key={i} className="border-t border-edge-light">
                    <td className="px-3 py-1.5">
                      <div className="flex gap-2">
                        <select
                          value={l.productId}
                          onChange={(e) => updateLine(i, { productId: e.target.value })}
                          className="flex-1 bg-surface-input border border-edge-base rounded px-2 py-1 text-sm"
                        >
                          <option value="">Select product</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.model ? `(${p.model})` : ''}
                            </option>
                          ))}
                        </select>
                        {/* + Add New Product Button */}
                        <button
                          type="button"
                          onClick={() => setShowNewProduct({ lineIndex: i })}
                          className="px-2 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded transition-colors flex items-center justify-center flex-shrink-0"
                          title="Add new product"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <input type="number" value={l.quantity} onChange={(e) => updateLine(i, { quantity: parseInt(e.target.value) || 0 })}
                        className="w-full bg-surface-input border border-edge-base rounded px-2 py-1 text-sm text-right" />
                    </td>
                    <td className="px-3 py-1.5">
                      <input type="number" value={l.purchasePrice} onChange={(e) => updateLine(i, { purchasePrice: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-surface-input border border-edge-base rounded px-2 py-1 text-sm text-right" />
                    </td>
                    <td className="px-3 py-1.5">
                      <input type="number" value={l.discount} onChange={(e) => updateLine(i, { discount: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-surface-input border border-edge-base rounded px-2 py-1 text-sm text-right" />
                    </td>
                    <td className="px-3 py-1.5 text-right font-medium">Rs {formatMoney(l.quantity * l.purchasePrice - (l.discount || 0))}</td>
                    <td className="px-3 py-1.5">
                      <button onClick={() => removeLine(i)} className="text-ink-muted hover:text-danger p-1" title="Remove line">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Hint: Add New Product — English */}
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <Package className="w-3.5 h-3.5" />
            <span>Tip: Click the <strong>+</strong> button in any line to add a new product.</span>
          </div>

          {/* ============ TOTALS ============ */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-ink-secondary">Discount</span>
                <input type="number" value={discount || ''} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-28 bg-surface-input border border-edge-base rounded px-2 py-1 text-right" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-secondary">Other Charges</span>
                <input type="number" value={otherCharges || ''} onChange={(e) => setOtherCharges(parseFloat(e.target.value) || 0)}
                  className="w-28 bg-surface-input border border-edge-base rounded px-2 py-1 text-right" />
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-ink-secondary">Subtotal</span><span>Rs {formatMoney(subtotal)}</span></div>
              <div className="flex justify-between font-bold text-base border-t border-edge-base pt-2"><span>Total</span><span className="text-brand-600 dark:text-brand-400">Rs {formatMoney(total)}</span></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Payment Method" value={method} onChange={(e) => setMethod(e.target.value as any)}>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank</option>
              <option value="CREDIT">Credit (full)</option>
            </Select>
            <Input label="Paid Amount" type="number" value={paid || ''} onChange={(e) => setPaid(parseFloat(e.target.value) || 0)} />
          </div>
          {remaining > 0 && (
            <p className="text-sm text-amber-600">
              Remaining payable: <strong>Rs {formatMoney(remaining)}</strong>
            </p>
          )}
        </div>
      </Modal>

      {/* ============ NEW PRODUCT MINI MODAL ============ */}
      {showNewProduct && (
        <NewProductMiniModal
          open={true}
          onClose={() => setShowNewProduct(null)}
          categories={categories}
          brands={brands}
          onCreated={handleProductCreated}
          onRefreshMeta={loadMeta}
        />
      )}
    </>
  );
}

// ============================================================
// NEW PRODUCT MINI MODAL — Minimal Inline Alert (2-Click)
// ============================================================
function NewProductMiniModal({
  open, onClose, categories, brands, onCreated, onRefreshMeta,
}: {
  open: boolean;
  onClose: () => void;
  categories: any[];
  brands: any[];
  onCreated: (product: any) => void;
  onRefreshMeta: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<any>({
    name: '', model: '', categoryId: '', brandId: '',
    salePrice: 0, minSalePrice: 0, minStockLevel: 5,
  });
  const [saving, setSaving] = useState(false);
  const [warnedOnce, setWarnedOnce] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setForm({ name: '', model: '', categoryId: '', brandId: '', salePrice: 0, minSalePrice: 0, minStockLevel: 5 });
      setSaving(false);
      setWarnedOnce(false);
    }
  }, [open]);

  // Hide alert if user types a valid sale price
  useEffect(() => {
    const salePrice = Number(form.salePrice) || 0;
    if (salePrice > 0 && warnedOnce) {
      setWarnedOnce(false);
    }
  }, [form.salePrice, warnedOnce]);

  const doCreate = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        model: form.model || null,
        categoryId: form.categoryId || null,
        brandId: form.brandId || null,
        purchasePrice: 0,
        salePrice: Number(form.salePrice) || 0,
        minSalePrice: Number(form.minSalePrice) || 0,
        minStockLevel: Number(form.minStockLevel) || 5,
        openingStock: 0,
        active: true,
      };

      const res = await api.post('/products', payload);
      const newProduct = unwrap(res);

      toast.success('Product created', `"${newProduct.name}" added`);
      onRefreshMeta();
      onCreated(newProduct);
    } catch (e: any) {
      toast.error('Failed to create product', e.response?.data?.message);
      setSaving(false);
    }
  };

  const submit = () => {
    if (!form.name.trim()) return toast.warning('Product name required');

    const salePrice = Number(form.salePrice) || 0;

    // Sale price is 0 — first click shows alert, second click proceeds
    if (salePrice <= 0 && !warnedOnce) {
      setWarnedOnce(true);
      return;
    }

    doCreate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add New Product"
      subtitle="Product will be created and auto-selected in purchase"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving} disabled={!form.name.trim()}>
            Create & Select
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="p-3 rounded-md bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-900 text-xs text-brand-700 dark:text-brand-300">
          <strong>Note:</strong> Opening stock is 0. Stock will be added through purchase.
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Product Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder='e.g. GFC Ceiling Fan 56"'
            autoFocus
          />
          <Input
            label="Model"
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            placeholder="e.g. CF-56D"
          />

          <Select
            label="Category"
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="">Select category</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>

          <Select
            label="Brand"
            value={form.brandId}
            onChange={(e) => setForm({ ...form, brandId: e.target.value })}
          >
            <option value="">Select brand</option>
            {brands.map((b: any) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>

          <Input
            label="Sale Price"
            type="number"
            value={form.salePrice}
            onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
            placeholder="0"
          />
          <Input
            label="Min Sale Price"
            type="number"
            value={form.minSalePrice}
            onChange={(e) => setForm({ ...form, minSalePrice: e.target.value })}
            placeholder="0"
          />

          <div className="col-span-2">
            <Input
              label="Min Stock Level"
              type="number"
              value={form.minStockLevel}
              onChange={(e) => setForm({ ...form, minStockLevel: e.target.value })}
              placeholder="5"
              hint="Alert when stock drops below this"
            />
          </div>
        </div>

        {/* Minimal inline alert */}
        {warnedOnce && Number(form.salePrice) <= 0 && (
          <div className="p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex items-start gap-2 animate-fade-in">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              Sale price is <strong>0</strong>. This product cannot be sold in POS with 0 price. Click <strong>"Create & Select"</strong> again to proceed anyway.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}