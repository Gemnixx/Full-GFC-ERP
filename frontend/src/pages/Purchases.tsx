import { useEffect, useState, useMemo, useRef } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  UserPlus,
  X,
  Package,
  CheckCircle2,
  Banknote,
  Building2,
  CreditCard,
} from "lucide-react";
import { api, unwrap } from "../api/client";
import { PageHeader } from "../components/layout/PageHeader";
import {
  Button,
  Card,
  Input,
  Select,
  Modal,
  Empty,
} from "../components/ui";
import { useToast } from "../components/ui/Toast";
import { formatMoney, formatDate } from "../lib/format";
import { cn } from "../lib/cn";
import type { Column } from "../components/ui";
import { Table } from "../components/ui";

export default function Purchases() {
  const toast = useToast();
  const [data, setData] = useState<any>({ items: [], total: 0 });
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get("/purchases", { params: { search, page, pageSize: 20 } })
      .then((r) => setData(unwrap(r)))
      .finally(() => setLoading(false));
  };

  const loadMeta = () => {
    api.get("/suppliers", { params: { pageSize: 500 } }).then((r) => setSuppliers(unwrap(r).items));
    api.get("/products", { params: { pageSize: 500 } }).then((r) => setProducts(unwrap(r).items));
  };

  useEffect(() => {
    load();
    loadMeta();
    // eslint-disable-next-line
  }, [search, page]);

  const columns: Column<any>[] = [
    {
      key: "purchaseNumber",
      header: "Purchase #",
      render: (r) => <span className="font-mono text-xs font-medium">{r.purchaseNumber}</span>,
    },
    {
      key: "supplier",
      header: "Supplier",
      render: (r) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-primary truncate">{r.supplier?.name || "—"}</p>
          {r.supplier?.company && <p className="text-xs text-ink-secondary truncate">{r.supplier.company}</p>}
        </div>
      ),
    },
    {
      key: "items",
      header: "Items",
      render: (r) => {
        const vs = r.items || [];
        if (vs.length === 0) return <span className="text-xs text-ink-muted italic">—</span>;
        return (
          <div className="space-y-1">
            {vs.slice(0, 3).map((it: any, idx: number) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs">
                <span className="text-ink-primary font-medium truncate max-w-[120px]">{it.product?.name}</span>
                {it.variant && (
                  <span className="text-brand-600">
                    · {it.variant.size || ""} {it.variant.color || ""}
                  </span>
                )}
                <span className="text-ink-muted">×{it.quantity}</span>
              </div>
            ))}
            {vs.length > 3 && <div className="text-xs text-ink-muted">+{vs.length - 3} more</div>}
          </div>
        );
      },
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      render: (r) => <span className="font-semibold">Rs {formatMoney(r.total)}</span>,
    },
    {
      key: "paid",
      header: "Paid",
      align: "right",
      render: (r) => <span className="text-emerald-600 font-medium">Rs {formatMoney(r.paid)}</span>,
    },
    {
      key: "due",
      header: "Due",
      align: "right",
      render: (r) =>
        r.due > 0 ? (
          <span className="text-amber-600 font-medium">Rs {formatMoney(r.due)}</span>
        ) : (
          <span className="text-ink-muted">—</span>
        ),
    },
    {
      key: "date",
      header: "Date",
      render: (r) => <span className="text-xs text-ink-secondary">{formatDate(r.purchaseDate)}</span>,
    },
  ];

  return (
    <div className="p-6 max-w-[1800px] mx-auto">
      <PageHeader
        title="Purchases"
        subtitle={`${data.total} purchase${data.total !== 1 ? "s" : ""} recorded`}
        actions={
          <Button icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowNew(true)}>
            New Purchase
          </Button>
        }
      />

      <Card padding="none" className="mb-4">
        <div className="p-4">
          <Input
            placeholder="Search by purchase number or supplier…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
      </Card>

      <Card padding="none">
        <Table
          columns={columns}
          data={data.items}
          loading={loading}
          empty={
            <Empty
              title="No purchases yet"
              description="Click New Purchase to record one"
              icon={<ShoppingBag className="w-8 h-8" />}
            />
          }
        />
      </Card>

      {showNew && (
        <PurchaseForm
          suppliers={suppliers}
          products={products}
          onClose={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false);
            load();
            toast.success("Purchase recorded");
          }}
          onRefreshMeta={loadMeta}
        />
      )}
    </div>
  );
}

// ================== PURCHASE FORM ==================
function PurchaseForm({ suppliers, products, onClose, onSaved, onRefreshMeta }: any) {
  const toast = useToast();
  const [supplierId, setSupplierId] = useState("");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [discount, setDiscount] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [paymentCash, setPaymentCash] = useState(0);
  const [paymentBank, setPaymentBank] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Product search (in picker)
  const [productSearch, setProductSearch] = useState("");

  // Variant picker
  const [variantProduct, setVariantProduct] = useState<any | null>(null);
  const [pickerSize, setPickerSize] = useState("");

  // Supplier creation
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: "", phone: "", city: "" });

  const createSupplier = async () => {
    if (!newSupplier.name.trim()) return;
    try {
      const res = await api.post("/suppliers", newSupplier);
      const s = unwrap(res);
      onRefreshMeta();
      setSupplierId(s.id);
      setShowNewSupplier(false);
      setNewSupplier({ name: "", phone: "", city: "" });
      toast.success("Supplier added");
    } catch (e: any) {
      toast.error("Failed", e.response?.data?.message);
    }
  };

  // Compute totals
  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (s, i) => s + i.quantity * i.purchasePrice - i.discount,
      0,
    );
    const grand = Math.max(subtotal - discount + otherCharges, 0);
    const paid = paymentCash + paymentBank;
    const due = Math.max(grand - paid, 0);
    return { subtotal, grand, paid, due };
  }, [items, discount, otherCharges, paymentCash, paymentBank]);

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter((p: any) => {
      return (
        p.name?.toLowerCase().includes(q) ||
        p.model?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.category?.name?.toLowerCase().includes(q) ||
        p.brand?.name?.toLowerCase().includes(q)
      );
    });
  }, [products, productSearch]);

  // Add item
  const handleProductClick = (p: any) => {
    const av = (p.variants || []).filter((v: any) => v.active !== false);
    if (av.length > 0) {
      setPickerSize("");
      setVariantProduct(p);
    } else {
      addItem(p, null);
    }
  };

  const addItem = (p: any, variant: any | null) => {
    const key = variant ? `${p.id}::${variant.id}` : p.id;
    setItems((prev) => {
      const ex = prev.find((i: any) => i.key === key);
      if (ex) {
        return prev.map((i: any) =>
          i.key === key ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          key,
          productId: p.id,
          variantId: variant?.id || null,
          productName: p.name,
          model: p.model,
          size: variant?.size || null,
          color: variant?.color || null,
          quantity: 1,
          purchasePrice: variant?.purchasePrice || p.purchasePrice || 0,
          discount: 0,
        },
      ];
    });
    setVariantProduct(null);
    setPickerSize("");
  };

  const updateItem = (key: string, field: string, value: any) => {
    setItems(items.map((i) => (i.key === key ? { ...i, [field]: value } : i)));
  };

  const updateQty = (key: string, qty: number) => {
    if (qty < 1) qty = 1;
    setItems(items.map((i) => (i.key === key ? { ...i, quantity: qty } : i)));
  };

  const removeItem = (key: string) => setItems(items.filter((i) => i.key !== key));

  // Variant picker helpers
  const pickerSizes = useMemo(() => {
    if (!variantProduct) return [];
    const set = new Set<string>();
    (variantProduct.variants || []).forEach((v: any) => {
      if (v.active !== false && v.size) set.add(v.size);
    });
    return Array.from(set).sort();
  }, [variantProduct]);

  const pickerColors = useMemo(() => {
    if (!variantProduct || !pickerSize) return [];
    return (variantProduct.variants || []).filter(
      (v: any) => v.active !== false && v.size === pickerSize,
    );
  }, [variantProduct, pickerSize]);

  const colorSwatch = (color: string) => {
    const c = (color || "").toLowerCase();
    if (c.includes("black")) return "bg-black";
    if (c.includes("off") && c.includes("white")) return "bg-stone-100";
    if (c.includes("white")) return "bg-white";
    if (c.includes("gold")) return "bg-yellow-400";
    if (c.includes("silver")) return "bg-gray-300";
    if (c.includes("blue")) return "bg-blue-500";
    if (c.includes("red")) return "bg-red-500";
    if (c.includes("green")) return "bg-green-500";
    if (c.includes("gray") || c.includes("grey")) return "bg-gray-400";
    if (c.includes("brown")) return "bg-amber-800";
    return "bg-slate-300";
  };

  const submit = async () => {
    if (!supplierId) return toast.warning("Select supplier");
    if (items.length === 0) return toast.warning("Add at least one product");

    const payments: any[] = [];
    if (paymentCash > 0) payments.push({ method: "CASH", amount: paymentCash });
    if (paymentBank > 0) payments.push({ method: "BANK", amount: paymentBank });
    if (totals.due > 0) payments.push({ method: "CREDIT", amount: totals.due });
    if (payments.length === 0) payments.push({ method: "CREDIT", amount: totals.grand });

    setSaving(true);
    try {
      await api.post("/purchases", {
        supplierId,
        supplierInvoiceNo: supplierInvoiceNo || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId || null,
          quantity: i.quantity,
          purchasePrice: i.purchasePrice,
          discount: i.discount || 0,
        })),
        discount,
        otherCharges,
        payments,
        notes: notes || undefined,
      });
      onSaved();
    } catch (e: any) {
      toast.error("Save failed", e.response?.data?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title="New Purchase"
        size="2xl"
        footer={
          <>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} loading={saving} disabled={!supplierId || items.length === 0}>
              Record Purchase
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {/* SUPPLIER INFO */}
          <div>
            <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">
              Supplier
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="w-full">
                <label className="block text-sm font-medium text-ink-secondary mb-2">
                  Supplier *
                </label>
                <div className="flex gap-2">
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="flex-1 px-4 py-3 bg-surface-input border border-edge-base rounded-md text-base text-ink-primary cursor-pointer"
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.company ? ` — ${s.company}` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewSupplier(!showNewSupplier)}
                    className="px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-md"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                {showNewSupplier && (
                  <div className="mt-2 p-3 border border-edge-base rounded-md bg-surface-hover space-y-2">
                    <input
                      type="text"
                      placeholder="Supplier name *"
                      value={newSupplier.name}
                      onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                      className="w-full px-3 py-2 bg-surface-input border border-edge-base rounded-md text-sm"
                      autoFocus
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Phone"
                        value={newSupplier.phone}
                        onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-surface-input border border-edge-base rounded-md text-sm"
                      />
                      <input
                        type="text"
                        placeholder="City"
                        value={newSupplier.city}
                        onChange={(e) => setNewSupplier({ ...newSupplier, city: e.target.value })}
                        className="w-full px-3 py-2 bg-surface-input border border-edge-base rounded-md text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={createSupplier} disabled={!newSupplier.name.trim()}>
                        Add Supplier
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowNewSupplier(false);
                          setNewSupplier({ name: "", phone: "", city: "" });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Input
                label="Supplier Invoice #"
                value={supplierInvoiceNo}
                onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          {/* PRODUCTS */}
          <div>
            <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">
              Products
            </h4>

            {/* Product picker with search */}
            <div className="border border-edge-base rounded-lg p-3 bg-surface-hover">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-ink-secondary">
                  Click a product to add
                </label>
                <span className="text-xs text-ink-muted">
                  {filteredProducts.length} product
                  {filteredProducts.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Search */}
              <Input
                placeholder="Search products by name, model or SKU…"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-56 overflow-y-auto mt-3">
                {filteredProducts.map((p: any) => {
                  const variants = (p.variants || []).filter(
                    (v: any) => v.active !== false,
                  );
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleProductClick(p)}
                      className="text-left p-2 rounded-md border border-edge-base bg-surface-card hover:border-brand-500 hover:bg-surface-hover transition-colors"
                    >
                      <p className="text-sm font-medium text-ink-primary truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-ink-secondary truncate">
                        {p.model || "—"}
                        {p.brand?.name ? ` · ${p.brand.name}` : ""}
                      </p>
                      <p className="text-xs text-ink-muted mt-0.5">
                        {variants.length > 0
                          ? `${variants.length} variants`
                          : "No variants"}
                      </p>
                    </button>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <div className="col-span-full text-center text-sm text-ink-muted py-4">
                    {productSearch
                      ? `No products match "${productSearch}"`
                      : "No products available"}
                  </div>
                )}
              </div>
            </div>

            {/* Selected items table */}
            <div className="mt-4">
              {items.length === 0 ? (
                <div className="border border-dashed border-edge-base rounded-lg p-6 text-center">
                  <Package className="w-8 h-8 text-ink-muted mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-sm text-ink-secondary">No items added</p>
                  <p className="text-xs text-ink-muted mt-1">Click products above to add</p>
                </div>
              ) : (
                <div className="border border-edge-base rounded-lg overflow-x-auto">
                  <table className="w-full text-sm min-w-[800px]">
                    <thead className="bg-surface-hover">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-ink-secondary">
                          Product
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-ink-secondary w-24">
                          Qty
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-ink-secondary w-32">
                          Cost
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-ink-secondary w-32">
                          Total
                        </th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-edge-light">
                      {items.map((it) => {
                        const lineTotal = it.quantity * it.purchasePrice - (it.discount || 0);
                        return (
                          <tr key={it.key} className="hover:bg-surface-hover/30">
                            <td className="px-3 py-2">
                              <p className="font-medium text-ink-primary">{it.productName}</p>
                              <p className="text-xs text-ink-secondary">
                                {it.model || "—"}
                                {it.size ? ` · ${it.size}` : ""}
                                {it.color ? ` / ${it.color}` : ""}
                              </p>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => updateQty(it.key, it.quantity - 1)}
                                  className="w-6 h-6 rounded hover:bg-surface-card flex items-center justify-center"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input
                                  type="number"
                                  value={it.quantity}
                                  onChange={(e) => updateQty(it.key, parseInt(e.target.value) || 1)}
                                  className="w-14 text-center bg-surface-input border border-edge-base rounded text-sm"
                                />
                                <button
                                  onClick={() => updateQty(it.key, it.quantity + 1)}
                                  className="w-6 h-6 rounded hover:bg-surface-card flex items-center justify-center"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={it.purchasePrice}
                                onChange={(e) => updateItem(it.key, "purchasePrice", parseFloat(e.target.value) || 0)}
                                className="w-full bg-surface-input border border-edge-base rounded px-2 py-1 text-sm text-right"
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-ink-primary">
                              Rs {formatMoney(lineTotal)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => removeItem(it.key)}
                                className="text-ink-muted hover:text-danger p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* TOTALS */}
          {items.length > 0 && (
            <div className="border border-edge-base rounded-lg p-4 bg-surface-hover space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-ink-secondary">Subtotal</span>
                <span className="font-medium">Rs {formatMoney(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-ink-secondary">Discount</span>
                <input
                  type="number"
                  value={discount || ""}
                  placeholder="0"
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-28 bg-surface-input border border-edge-base rounded px-2 py-1 text-right text-sm"
                />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-ink-secondary">Other Charges</span>
                <input
                  type="number"
                  value={otherCharges || ""}
                  placeholder="0"
                  onChange={(e) => setOtherCharges(parseFloat(e.target.value) || 0)}
                  className="w-28 bg-surface-input border border-edge-base rounded px-2 py-1 text-right text-sm"
                />
              </div>
              <div className="flex justify-between pt-3 border-t border-edge-base text-lg font-bold">
                <span className="text-ink-primary">Total</span>
                <span className="text-brand-600">Rs {formatMoney(totals.grand)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-edge-base">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-ink-secondary">
                    <Banknote className="w-4 h-4" /> Cash
                  </span>
                  <input
                    type="number"
                    value={paymentCash || ""}
                    placeholder="0"
                    onChange={(e) => setPaymentCash(parseFloat(e.target.value) || 0)}
                    className="w-28 bg-surface-input border border-edge-base rounded px-2 py-1 text-right text-sm"
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-ink-secondary">
                    <Building2 className="w-4 h-4" /> Bank
                  </span>
                  <input
                    type="number"
                    value={paymentBank || ""}
                    placeholder="0"
                    onChange={(e) => setPaymentBank(parseFloat(e.target.value) || 0)}
                    className="w-28 bg-surface-input border border-edge-base rounded px-2 py-1 text-right text-sm"
                  />
                </div>
              </div>

              {totals.due > 0 && (
                <div className="flex justify-between items-center text-sm pt-3 border-t border-edge-base">
                  <span className="text-amber-600 font-medium">Credit (Due)</span>
                  <span className="text-amber-600 font-semibold">Rs {formatMoney(totals.due)}</span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-ink-secondary mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-surface-input border border-edge-base rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
      </Modal>

      {/* VARIANT PICKER MODAL */}
      <Modal
        open={!!variantProduct}
        onClose={() => {
          setVariantProduct(null);
          setPickerSize("");
        }}
        title={variantProduct?.name || "Select Size & Color"}
        size="md"
      >
        {variantProduct && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-ink-secondary uppercase tracking-wider mb-3">
                Select Size
              </label>
              <div className="flex flex-wrap gap-2">
                {pickerSizes.map((s: any) => (
                  <button
                    key={s}
                    onClick={() => setPickerSize(s)}
                    className={cn(
                      "px-4 py-2 rounded-md text-sm font-medium border transition-colors",
                      pickerSize === s
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-surface-card text-ink-secondary border-edge-base hover:border-emerald-500",
                    )}
                  >
                    Size {s}
                  </button>
                ))}
              </div>
            </div>

            {pickerSize && (
              <div>
                <label className="block text-sm font-semibold text-ink-secondary uppercase tracking-wider mb-3">
                  Select Color
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {pickerColors.map((v: any) => (
                    <button
                      key={v.id}
                      onClick={() => addItem(variantProduct, v)}
                      className="text-left rounded-lg border-2 border-edge-base hover:border-brand-500 hover:shadow-md bg-surface-card p-3 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "w-5 h-5 rounded-full border border-edge-base flex-shrink-0",
                            colorSwatch(v.color),
                          )}
                        />
                        <span className="font-medium text-ink-primary">{v.color || "—"}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-ink-muted">Stock: {v.stock || 0}</span>
                        <span className="font-semibold text-brand-600">
                          Rs {formatMoney(v.purchasePrice || 0)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}