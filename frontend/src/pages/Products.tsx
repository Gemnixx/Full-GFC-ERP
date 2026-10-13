import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Edit, MoreVertical, Package, Download, X, Trash2,
  Layers, AlertTriangle, CheckCircle2, ShoppingCart, DollarSign
} from 'lucide-react';
import { api, unwrap } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Button, Card, Input, Select, Table, Badge, Pagination, Empty,
  Dropdown, Modal, ConfirmDialog
} from '../components/ui';
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
  const [productNames, setProductNames] = useState<any[]>([]);   // 👈 NAYA
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'sold' | 'stock'>('newest');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get('/products', { params: { search, categoryId, page, pageSize: 20 } })
      .then((r) => setData(unwrap(r)))
      .finally(() => setLoading(false));
  };

  const loadMeta = () => {
    api.get('/products/meta/categories').then((r) => setCategories(unwrap(r)));
    api.get('/products/meta/brands').then((r) => setBrands(unwrap(r)));
    api.get('/products/meta/sizes').then((r) => setSizes(unwrap(r)));
    api.get('/products/meta/colors').then((r) => setColors(unwrap(r)));
    api.get('/products/meta/product-names').then((r) => setProductNames(unwrap(r)));   // 👈 NAYA
  };

  useEffect(() => {
    load();
    loadMeta();
    // eslint-disable-next-line
  }, [search, categoryId, page]);

  // ============================================
  // HELPERS
  // ============================================
  const variantSold = (v: any) => {
    return (v.saleItems || []).reduce(
      (s: number, si: any) => s + (si.quantity || 0),
      0,
    );
  };

  const productSold = (p: any) => {
    if ((p.variants || []).length === 0) {
      return (p.saleItems || []).reduce(
        (s: number, si: any) => s + (si.quantity || 0),
        0,
      );
    }
    return (p.variants || []).reduce(
      (s: number, v: any) => s + variantSold(v),
      0,
    );
  };

  const productStock = (p: any) => {
    const vs = (p.variants || []).filter((v: any) => v.active !== false);
    if (vs.length > 0) {
      return vs.reduce((s: number, v: any) => s + (v.stock || 0), 0);
    }
    return p.inventory?.quantity ?? 0;
  };

  // Color swatch
  const colorSwatch = (color: string) => {
    const c = (color || '').toLowerCase();
    if (c.includes('black')) return 'bg-black';
    if (c.includes('off') && c.includes('white')) return 'bg-stone-100';
    if (c.includes('white')) return 'bg-white';
    if (c.includes('gold')) return 'bg-yellow-400';
    if (c.includes('silver')) return 'bg-gray-300';
    if (c.includes('blue')) return 'bg-blue-500';
    if (c.includes('red')) return 'bg-red-500';
    if (c.includes('green')) return 'bg-green-500';
    if (c.includes('gray') || c.includes('grey')) return 'bg-gray-400';
    if (c.includes('brown')) return 'bg-amber-800';
    return 'bg-slate-300';
  };

  // Sort
  const sortedItems = (() => {
    const items = [...(data.items || [])];
    if (sortBy === 'sold') {
      items.sort((a, b) => productSold(b) - productSold(a));
    } else if (sortBy === 'stock') {
      items.sort((a, b) => productStock(b) - productStock(a));
    }
    return items;
  })();

  // Stats
  const stats = {
    total: data.total,
    inStock: data.items.filter(
      (r: any) => productStock(r) > r.minStockLevel,
    ).length,
    lowStock: data.items.filter((r: any) => {
      const s = productStock(r);
      return s > 0 && s <= r.minStockLevel;
    }).length,
    totalSold: data.items.reduce((s: number, r: any) => s + productSold(r), 0),
  };

  const handleExport = () => {
    exportCSV(
      data.items,
      [
        { key: 'name', header: 'Product' },
        { key: 'model', header: 'Model' },
        { key: 'brand', header: 'Brand', value: (r: any) => r.brand?.name || '' },
        { key: 'category', header: 'Category', value: (r: any) => r.category?.name || '' },
        {
          key: 'variants',
          header: 'Variants',
          value: (r: any) =>
            (r.variants || [])
              .map(
                (v: any) =>
                  `${v.size || '-'}/${v.color || '-'}: stock=${v.stock} sold=${variantSold(v)}`,
              )
              .join(' | '),
        },
        {
          key: 'stock',
          header: 'Available Stock',
          value: (r: any) => productStock(r),
        },
        {
          key: 'sold',
          header: 'Total Sold',
          value: (r: any) => productSold(r),
        },
      ],
      csvFilename('products'),
    );
    toast.success('Exported');
  };

  // ============================================
  // TABLE COLUMNS
  // ============================================
  const columns: Column<any>[] = [
    // Product
    {
      key: 'product',
      header: 'Product',
      render: (r) => (
        <Link
          to={`/products/${r.id}`}
          className="flex items-center gap-3 hover:opacity-80 group"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Package className="w-5 h-5 text-white" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-primary truncate group-hover:text-brand-600 transition-colors">
              {r.name}
            </p>
            <p className="text-xs text-ink-secondary mt-0.5">
              {r.model || '—'}
              {r.sku ? ` · ${r.sku}` : ''}
            </p>
          </div>
        </Link>
      ),
    },

    // Category
    {
      key: 'category',
      header: 'Category',
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          {r.category?.name ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 w-fit">
              {r.category.name}
            </span>
          ) : (
            <span className="text-xs text-ink-muted italic">—</span>
          )}
          {r.brand?.name && (
            <span className="text-xs text-ink-secondary">{r.brand.name}</span>
          )}
        </div>
      ),
    },

    // Variants
    {
      key: 'variants',
      header: 'Variants · Stock · Sold',
      render: (r) => {
        const vs = r.variants || [];
        if (vs.length === 0) {
          return (
            <span className="text-xs text-ink-muted italic">No variants</span>
          );
        }

        const bySize: Record<string, any[]> = {};
        vs.forEach((v: any) => {
          const sz = v.size || '—';
          if (!bySize[sz]) bySize[sz] = [];
          bySize[sz].push(v);
        });

        const sortedSizes = Object.keys(bySize).sort((a, b) => {
          const na = parseFloat(a);
          const nb = parseFloat(b);
          if (!isNaN(na) && !isNaN(nb)) return na - nb;
          return a.localeCompare(b);
        });

        return (
          <div className="space-y-2">
            {sortedSizes.slice(0, 3).map((sz) => {
              const items = bySize[sz];
              return (
                <div key={sz} className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-bold text-ink-primary whitespace-nowrap min-w-[50px]">
                    Size {sz}
                  </span>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {items.slice(0, 5).map((v: any, idx: number) => {
                      const sold = variantSold(v);
                      return (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border bg-surface-hover border-edge-base whitespace-nowrap"
                        >
                          <span
                            className={`w-2.5 h-2.5 rounded-full border border-edge-base flex-shrink-0 ${colorSwatch(v.color)}`}
                          />
                          <span className="font-medium text-ink-primary">
                            {v.color || '—'}
                          </span>
                          <span className="text-emerald-600 font-semibold">
                            {v.stock}
                          </span>
                          {sold > 0 && (
                            <>
                              <span className="text-ink-muted">/</span>
                              <span className="text-amber-600 font-semibold">
                                {sold}
                              </span>
                            </>
                          )}
                        </span>
                      );
                    })}
                    {items.length > 5 && (
                      <span className="text-[11px] text-ink-muted font-medium">
                        +{items.length - 5}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {sortedSizes.length > 3 && (
              <div className="text-[11px] text-ink-muted pl-[62px]">
                +{sortedSizes.length - 3} more size(s)
              </div>
            )}
          </div>
        );
      },
    },

    // Price range
    {
      key: 'price',
      header: 'Price Range',
      align: 'right',
      render: (r) => {
        const vs = r.variants || [];
        const prices = vs
          .map((v: any) => v.salePrice || 0)
          .filter((p: number) => p > 0);

        if (prices.length === 0) {
          return <span className="text-xs text-ink-muted">—</span>;
        }

        const min = Math.min(...prices);
        const max = Math.max(...prices);

        return (
          <div className="text-right">
            <p className="text-sm font-semibold text-ink-primary">
              Rs {formatMoney(min)}
            </p>
            {min !== max && (
              <p className="text-xs text-ink-secondary">
                up to Rs {formatMoney(max)}
              </p>
            )}
          </div>
        );
      },
    },

    // Available
    {
      key: 'stock',
      header: 'Available',
      align: 'center',
      render: (r) => {
        const stock = productStock(r);
        const status =
          stock <= 0
            ? { color: 'red', icon: AlertTriangle }
            : stock <= r.minStockLevel
              ? { color: 'amber', icon: AlertTriangle }
              : { color: 'green', icon: CheckCircle2 };
        const Icon = status.icon;

        return (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5">
              <Icon
                className={`w-3.5 h-3.5 text-${status.color}-600`}
                strokeWidth={2}
              />
              <span className="text-sm font-bold text-ink-primary">
                {stock}
              </span>
            </div>
            <span className="text-[10px] text-ink-muted">
              {(r.variants || []).length > 0
                ? `${(r.variants || []).length} variant${
                    (r.variants || []).length !== 1 ? 's' : ''
                  }`
                : 'No variants'}
            </span>
          </div>
        );
      },
    },

    // Sold
    {
      key: 'sold',
      header: 'Total Sold',
      align: 'center',
      render: (r) => {
        const sold = productSold(r);
        return (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5">
              <ShoppingCart
                className="w-3.5 h-3.5 text-blue-600"
                strokeWidth={2}
              />
              <span className="text-sm font-bold text-ink-primary">
                {sold}
              </span>
            </div>
            <span className="text-[10px] text-ink-muted">pieces</span>
          </div>
        );
      },
    },

    // Status
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <Badge variant={r.active ? 'green' : 'gray'} dot>
          {r.active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },

    // Actions
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <Dropdown
          trigger={
            <button className="p-1.5 text-ink-muted hover:text-ink-primary rounded-md hover:bg-surface-hover transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          }
        >
          <Dropdown.Item
            icon={<Edit className="w-3.5 h-3.5" />}
            onClick={() => {
              setEditing(r);
              setShowForm(true);
            }}
          >
            Edit
          </Dropdown.Item>
          <Dropdown.Item danger onClick={() => setDeleting(r)}>
            Deactivate
          </Dropdown.Item>
        </Dropdown>
      ),
    },
  ];

  const handleDelete = async () => {
    try {
      await api.delete(`/products/${deleting.id}`);
      toast.success('Product deactivated');
      setDeleting(null);
      load();
    } catch (e: any) {
      toast.error('Failed', e.response?.data?.message);
    }
  };

  return (
    <div className="p-6 max-w-[1800px] mx-auto">
      <PageHeader
        title="Product Catalogue"
        subtitle={`${data.total} product${data.total !== 1 ? 's' : ''} · GFC Fans Outlet`}
        actions={
          <>
            <Button
              variant="outline"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={handleExport}
            >
              Export
            </Button>
            <Button
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
            >
              Add Product
            </Button>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
              <Package
                className="w-5 h-5 text-blue-600 dark:text-blue-400"
                strokeWidth={1.75}
              />
            </div>
            <div>
              <p className="text-xs text-ink-muted uppercase tracking-wider font-medium">
                Total Products
              </p>
              <p className="text-2xl font-bold text-ink-primary mt-0.5">
                {stats.total}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0">
              <CheckCircle2
                className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
                strokeWidth={1.75}
              />
            </div>
            <div>
              <p className="text-xs text-ink-muted uppercase tracking-wider font-medium">
                In Stock
              </p>
              <p className="text-2xl font-bold text-ink-primary mt-0.5">
                {stats.inStock}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center flex-shrink-0">
              <AlertTriangle
                className="w-5 h-5 text-amber-600 dark:text-amber-400"
                strokeWidth={1.75}
              />
            </div>
            <div>
              <p className="text-xs text-ink-muted uppercase tracking-wider font-medium">
                Low Stock
              </p>
              <p className="text-2xl font-bold text-ink-primary mt-0.5">
                {stats.lowStock}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center flex-shrink-0">
              <DollarSign
                className="w-5 h-5 text-brand-600 dark:text-brand-400"
                strokeWidth={1.75}
              />
            </div>
            <div>
              <p className="text-xs text-ink-muted uppercase tracking-wider font-medium">
                Total Sold
              </p>
              <p className="text-2xl font-bold text-ink-primary mt-0.5">
                {stats.totalSold}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card padding="none" className="mb-4">
        <div className="p-4 flex flex-col lg:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by product name, SKU or barcode…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="lg:w-56">
            <Select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="lg:w-56">
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="newest">Sort: Newest First</option>
              <option value="sold">Sort: Most Sold</option>
              <option value="stock">Sort: Highest Stock</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 px-1 mb-3 text-xs text-ink-secondary">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          Available Stock
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          Sold Pieces
        </span>
      </div>

      {/* Products Table */}
      <Card padding="none">
        <Table
          columns={columns}
          data={sortedItems}
          loading={loading}
          empty={
            <Empty
              title="No products found"
              description="Try adjusting your search or add a new product"
              icon={<Package className="w-8 h-8" />}
            />
          }
        />
        {data.total > 20 && (
          <Pagination
            page={page}
            total={data.total}
            pageSize={20}
            onChange={setPage}
          />
        )}
      </Card>

      <ProductForm
        open={showForm}
        onClose={() => setShowForm(false)}
        product={editing}
        categories={categories}
        brands={brands}
        sizes={sizes}
        colors={colors}
        productNames={productNames}          // 👈 NAYA
        onRefreshMeta={loadMeta}
        onSaved={() => {
          setShowForm(false);
          load();
          toast.success(editing ? 'Product updated' : 'Product created');
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Deactivate product?"
        message={`Are you sure you want to deactivate "${deleting?.name}"? This will hide it from POS.`}
        confirmLabel="Deactivate"
        danger
      />
    </div>
  );
}

// ================= PRODUCT FORM =================
function ProductForm({
  open, onClose, product, categories, brands, sizes, colors, productNames: initialProductNames, onRefreshMeta, onSaved,
}: any) {
  const [form, setForm] = useState<any>({});
  const [variants, setVariants] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [productNames, setProductNames] = useState<any[]>(initialProductNames || []);   // 👈 NAYA
  const toast = useToast();

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [showNewSize, setShowNewSize] = useState(false);
  const [showNewColor, setShowNewColor] = useState(false);
  const [showNewProductName, setShowNewProductName] = useState(false);   // 👈 NAYA
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [newSizeName, setNewSizeName] = useState('');
  const [newColorName, setNewColorName] = useState('');
  const [newProductName, setNewProductName] = useState('');   // 👈 NAYA

  const [bulkSize, setBulkSize] = useState('');
  const [bulkColors, setBulkColors] = useState<string[]>([]);
  const [bulkStock, setBulkStock] = useState<number | ''>('');
  const [bulkPurchase, setBulkPurchase] = useState<number | ''>('');
  const [bulkSale, setBulkSale] = useState<number | ''>('');

  useEffect(() => {
    if (open) {
      setForm(product || {
        name: '', model: '', productMasterId: null,
        sku: '', barcode: '',
        minStockLevel: 5, warranty: '', description: '', active: true,
      });

      if (product?.variants && product.variants.length > 0) {
        setVariants(product.variants.map((v: any) => ({
          id: v.id,
          size: v.size || '',
          color: v.color || '',
          sku: v.sku || '',
          stock: v.stock || 0,
          purchasePrice: v.purchasePrice || 0,
          salePrice: v.salePrice || 0,
          active: v.active ?? true,
        })));
      } else {
        setVariants([]);
      }

      // Fetch product names
      api.get('/products/meta/product-names').then((r) => setProductNames(unwrap(r)));

      setShowNewCategory(false);
      setShowNewBrand(false);
      setShowNewSize(false);
      setShowNewColor(false);
      setShowNewProductName(false);
      setNewCategoryName('');
      setNewBrandName('');
      setNewSizeName('');
      setNewColorName('');
      setNewProductName('');
      setBulkSize('');
      setBulkColors([]);
      setBulkStock('');
      setBulkPurchase('');
      setBulkSale('');
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

  // 👇 NAYA: Create product name
  const createProductName = async () => {
    if (!newProductName.trim()) return;
    try {
      const res = await api.post('/products/meta/product-names', {
        name: newProductName.trim(),
      });
      const pm = unwrap(res);
      // Refresh local product names
      const r = await api.get('/products/meta/product-names');
      setProductNames(unwrap(r));
      onRefreshMeta();
      setForm({
        ...form,
        productMasterId: pm.id,
        name: pm.name,
      });
      setShowNewProductName(false);
      setNewProductName('');
      toast.success('Product name added');
    } catch (e: any) { toast.error('Failed', e.response?.data?.message); }
  };

  const addBulkVariants = () => {
    if (!bulkSize) return toast.warning('Select a size');
    if (bulkColors.length === 0) return toast.warning('Tick at least one color');

    const pp = typeof bulkPurchase === 'number' ? bulkPurchase : 0;
    const sp = typeof bulkSale === 'number' ? bulkSale : 0;
    const st = typeof bulkStock === 'number' ? bulkStock : 0;

    const newOnes: any[] = [];
    for (const color of bulkColors) {
      const exists = variants.some((v) => v.size === bulkSize && v.color === color);
      if (exists) continue;
      newOnes.push({
        size: bulkSize,
        color,
        sku: '',
        stock: st,
        purchasePrice: pp,
        salePrice: sp,
        active: true,
      });
    }

    if (newOnes.length === 0) {
      return toast.warning('All selected combinations already exist');
    }

    setVariants([...variants, ...newOnes]);
    setBulkSize('');
    setBulkColors([]);
    setBulkStock('');
    setBulkPurchase('');
    setBulkSale('');
    toast.success(`${newOnes.length} variant(s) added`);
  };

  const updateVariant = (idx: number, field: string, value: any) => {
    setVariants(variants.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
  };

  const removeVariant = (idx: number) => {
    setVariants(variants.filter((_, i) => i !== idx));
  };

  const toggleBulkColor = (name: string) => {
    setBulkColors((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name],
    );
  };

  const applyBulkPrice = () => {
    const pp = typeof bulkPurchase === 'number' ? bulkPurchase : 0;
    const sp = typeof bulkSale === 'number' ? bulkSale : 0;

    if (pp <= 0 && sp <= 0) {
      return toast.warning('Enter purchase or sale price');
    }
    setVariants(variants.map((v) => ({
      ...v,
      purchasePrice: pp > 0 ? pp : v.purchasePrice,
      salePrice: sp > 0 ? sp : v.salePrice,
    })));
    setBulkPurchase('');
    setBulkSale('');
    toast.success('Prices applied to all variants');
  };

  const submit = async () => {
    if (!form.name) return toast.warning('Product name required');
    if (variants.length === 0) return toast.warning('Add at least one variant');

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
        productMasterId: form.productMasterId || null,   // 👈 NAYA
        minStockLevel: Number(form.minStockLevel) || 5,
        openingStock: 0,
        purchasePrice: 0,
        salePrice: 0,
        minSalePrice: 0,
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
    } finally {
      setSaving(false);
    }
  };

  const totalVariantStock = variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? 'Edit Product' : 'Add New Product'}
      size="2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving} disabled={!form.name}>
            {product ? 'Update Product' : 'Create Product'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* BASIC INFO */}
        <div>
          <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">
            Basic Information
          </h4>
          <div className="grid grid-cols-2 gap-5">

            {/* 👇 PRODUCT NAME — DROPDOWN + PLUS BUTTON */}
            <div className="w-full">
              <label className="block text-sm font-medium text-ink-secondary mb-2">
                Product Name *
              </label>
              <div className="flex gap-2">
                <select
                  value={form.productMasterId || ''}
                  onChange={(e) => {
                    const pm = productNames.find((p: any) => p.id === e.target.value);
                    setForm({
                      ...form,
                      productMasterId: e.target.value || null,
                      name: pm ? pm.name : form.name,
                    });
                  }}
                  className="flex-1 px-4 py-3 bg-surface-input border border-edge-base rounded-md text-base text-ink-primary cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select product name</option>
                  {productNames.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewProductName(!showNewProductName)}
                  className="px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-md"
                  title="Add new product name"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {showNewProductName && (
                <div className="mt-2 flex gap-2 items-center p-3 border border-edge-base rounded-md bg-surface-hover">
                  <input
                    type="text"
                    placeholder="New product name (e.g. Ceiling Fan Nabeel)"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createProductName()}
                    className="flex-1 px-3 py-2 bg-surface-input border border-edge-base rounded-md text-sm"
                    autoFocus
                  />
                  <Button size="sm" onClick={createProductName} disabled={!newProductName.trim()}>Add</Button>
                  <button onClick={() => { setShowNewProductName(false); setNewProductName(''); }} className="p-2 text-ink-muted hover:text-danger">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <Input
              label="Model"
              value={form.model || ''}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              placeholder="e.g. Nabeel"
            />

            <div className="w-full">
              <label className="block text-sm font-medium text-ink-secondary mb-2">Category</label>
              <div className="flex gap-2">
                <select
                  value={form.categoryId || ''}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value || null })}
                  className="flex-1 px-4 py-3 bg-surface-input border border-edge-base rounded-md text-base text-ink-primary cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select category</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewCategory(!showNewCategory)}
                  className="px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-md"
                >
                  <Plus className="w-5 h-5" />
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

            <div className="w-full">
              <label className="block text-sm font-medium text-ink-secondary mb-2">Brand</label>
              <div className="flex gap-2">
                <select
                  value={form.brandId || ''}
                  onChange={(e) => setForm({ ...form, brandId: e.target.value || null })}
                  className="flex-1 px-4 py-3 bg-surface-input border border-edge-base rounded-md text-base text-ink-primary cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select brand</option>
                  {brands.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewBrand(!showNewBrand)}
                  className="px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-md"
                >
                  <Plus className="w-5 h-5" />
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

            <Input
              label="SKU / Product Code"
              value={form.sku || ''}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
            <Input
              label="Barcode"
              value={form.barcode || ''}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            />
          </div>
        </div>

        {/* VARIANTS */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-semibold text-ink-primary flex items-center gap-2">
                <Layers className="w-4 h-4" /> Variants (Size × Color × Stock × Price)
              </h4>
              <p className="text-sm text-ink-secondary mt-1">
                {variants.length} variant(s) · Total stock:{' '}
                <span className="font-semibold text-ink-primary">{totalVariantStock}</span>
              </p>
            </div>
          </div>

          <div className="border border-edge-base rounded-lg p-4 bg-surface-hover space-y-4">
            <p className="text-sm font-medium text-ink-primary">
              Quick Add — Select size, tick colors, set prices, add all
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-2">Size</label>
                <div className="flex gap-1">
                  <select
                    value={bulkSize}
                    onChange={(e) => setBulkSize(e.target.value)}
                    className="flex-1 px-3 py-2.5 bg-surface-card border border-edge-base rounded-md text-sm cursor-pointer"
                  >
                    <option value="">Select size</option>
                    {sizes.map((s: any) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewSize(!showNewSize)}
                    className="px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-md flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-2">Purchase Price</label>
                <input
                  type="number"
                  value={bulkPurchase}
                  onChange={(e) => setBulkPurchase(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2.5 bg-surface-card border border-edge-base rounded-md text-sm text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-2">Sale Price</label>
                <input
                  type="number"
                  value={bulkSale}
                  onChange={(e) => setBulkSale(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2.5 bg-surface-card border border-edge-base rounded-md text-sm text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-2">Stock per Color</label>
                <input
                  type="number"
                  value={bulkStock}
                  onChange={(e) => setBulkStock(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  onKeyDown={(e) => e.key === 'Enter' && addBulkVariants()}
                  className="w-full px-3 py-2.5 bg-surface-card border border-edge-base rounded-md text-sm text-right"
                />
              </div>
            </div>

            {showNewSize && (
              <div className="flex gap-2 items-center p-3 border border-edge-base rounded-md bg-surface-card">
                <input
                  type="text"
                  placeholder="New size (e.g. 36, 48, 56)"
                  value={newSizeName}
                  onChange={(e) => setNewSizeName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createSize()}
                  className="flex-1 px-3 py-2 bg-surface-input border border-edge-base rounded-md text-sm"
                  autoFocus
                />
                <Button size="sm" onClick={createSize} disabled={!newSizeName.trim()}>Add</Button>
                <button onClick={() => { setShowNewSize(false); setNewSizeName(''); }} className="p-2 text-ink-muted hover:text-danger">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-ink-secondary">
                  Colors (multi-select)
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewColor(!showNewColor)}
                  className="text-xs text-brand-600 hover:underline flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> Add new color
                </button>
              </div>
              {showNewColor && (
                <div className="flex gap-2 items-center p-3 border border-edge-base rounded-md bg-surface-card mb-3">
                  <input
                    type="text"
                    placeholder="New color (e.g. Black, Off White)"
                    value={newColorName}
                    onChange={(e) => setNewColorName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createColor()}
                    className="flex-1 px-3 py-2 bg-surface-input border border-edge-base rounded-md text-sm"
                    autoFocus
                  />
                  <Button size="sm" onClick={createColor} disabled={!newColorName.trim()}>Add</Button>
                  <button onClick={() => { setShowNewColor(false); setNewColorName(''); }} className="p-2 text-ink-muted hover:text-danger">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {colors.length === 0 && (
                  <span className="text-sm text-ink-muted italic">No colors yet — click "Add new color"</span>
                )}
                {colors.map((c: any) => {
                  const selected = bulkColors.includes(c.name);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleBulkColor(c.name)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors flex items-center gap-1.5 ${
                        selected
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-surface-card text-ink-secondary border-edge-base hover:border-brand-500'
                      }`}
                    >
                      {c.hex && (
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/30"
                          style={{ backgroundColor: c.hex }}
                        />
                      )}
                      {c.name}
                      {selected && <X className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                size="md"
                onClick={addBulkVariants}
                disabled={!bulkSize || bulkColors.length === 0}
                icon={<Plus className="w-4 h-4" />}
              >
                Add {bulkColors.length > 0 ? `${bulkColors.length} variant(s)` : 'variants'}
              </Button>
            </div>
          </div>

          {variants.length > 0 && (
            <div className="mt-4 p-4 border border-edge-base rounded-lg bg-surface-hover">
              <p className="text-sm font-semibold text-ink-primary mb-3">
                Apply same price to all variants
              </p>
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-2">Purchase</label>
                  <input
                    type="number"
                    value={bulkPurchase}
                    onChange={(e) => setBulkPurchase(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="—"
                    className="w-32 px-3 py-2 bg-surface-card border border-edge-base rounded-md text-sm text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-2">Sale</label>
                  <input
                    type="number"
                    value={bulkSale}
                    onChange={(e) => setBulkSale(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="—"
                    className="w-32 px-3 py-2 bg-surface-card border border-edge-base rounded-md text-sm text-right"
                  />
                </div>
                <Button onClick={applyBulkPrice}>Apply to All</Button>
              </div>
            </div>
          )}

          <div className="mt-5">
            {variants.length === 0 ? (
              <div className="border border-dashed border-edge-base rounded-lg p-8 text-center">
                <Package className="w-10 h-10 text-ink-muted mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-base text-ink-secondary font-medium">No variants yet</p>
                <p className="text-sm text-ink-muted mt-1">
                  Use Quick Add above to create size + color combinations
                </p>
              </div>
            ) : (
              <div className="border border-edge-base rounded-lg overflow-x-auto">
                <table className="w-full text-base min-w-[800px]">
                  <thead className="bg-surface-hover">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-ink-secondary">Size</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-ink-secondary">Color</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-ink-secondary">Purchase Price</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-ink-secondary">Sale Price</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-ink-secondary">Stock</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-edge-light">
                    {variants.map((v, idx) => (
                      <tr key={idx} className="hover:bg-surface-hover/50">
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={v.size || ''}
                            onChange={(e) => updateVariant(idx, 'size', e.target.value)}
                            list="size-options"
                            className="w-24 px-3 py-2 bg-surface-input border border-edge-base rounded-md text-base font-medium"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={v.color || ''}
                            onChange={(e) => updateVariant(idx, 'color', e.target.value)}
                            list="color-options"
                            className="w-32 px-3 py-2 bg-surface-input border border-edge-base rounded-md text-base font-medium"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={v.purchasePrice ?? 0}
                            onChange={(e) => updateVariant(idx, 'purchasePrice', e.target.value)}
                            className="w-32 px-3 py-2 bg-surface-input border border-edge-base rounded-md text-base text-right ml-auto block"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={v.salePrice ?? 0}
                            onChange={(e) => updateVariant(idx, 'salePrice', e.target.value)}
                            className="w-32 px-3 py-2 bg-surface-input border border-edge-base rounded-md text-base text-right font-semibold ml-auto block"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={v.stock ?? 0}
                            onChange={(e) => updateVariant(idx, 'stock', e.target.value)}
                            className="w-24 px-3 py-2 bg-surface-input border border-edge-base rounded-md text-base text-right ml-auto block"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => removeVariant(idx)}
                            className="text-ink-muted hover:text-danger p-2 rounded hover:bg-danger/10"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* ADDITIONAL */}
        <div>
          <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-4">
            Additional Information
          </h4>
          <div className="grid grid-cols-2 gap-5">
            <Input
              label="Minimum Stock Alert"
              type="number"
              value={form.minStockLevel ?? 5}
              onChange={(e) => setForm({ ...form, minStockLevel: e.target.value })}
            />
            <Input
              label="Warranty"
              value={form.warranty || ''}
              onChange={(e) => setForm({ ...form, warranty: e.target.value })}
              placeholder="e.g. 6 months"
            />
          </div>
          <div className="mt-5">
            <Input
              label="Description"
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="mt-5">
            <label className="block text-sm font-medium text-ink-secondary mb-2">Status</label>
            <select
              value={form.active ? '1' : '0'}
              onChange={(e) => setForm({ ...form, active: e.target.value === '1' })}
              className="w-full px-4 py-3 bg-surface-input border border-edge-base rounded-md text-base text-ink-primary cursor-pointer"
            >
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </div>
        </div>
      </div>
    </Modal>
  );
}