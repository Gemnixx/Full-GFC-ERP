import { useEffect, useState, useMemo, useRef } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  UserPlus,
  Printer,
  CheckCircle2,
  CreditCard,
  Banknote,
  Building2,
  User,
  X,
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
import { formatMoney } from "../lib/format";
import { cn } from "../lib/cn";
import { ReceiptPrint } from "../components/print/ReceiptPrint";
import { printElement } from "../lib/print";
import type { Product, CartItem } from "../types";

export default function POS() {
  const toast = useToast();

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [colorFilter, setColorFilter] = useState("");

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  // Variant picker
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [pickerSize, setPickerSize] = useState("");

  // Customer
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustSug, setShowCustSug] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const customerBoxRef = useRef<HTMLDivElement>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", city: "" });

  // Payment
  const [discountPercent, setDiscountPercent] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [paymentCash, setPaymentCash] = useState(0);
  const [paymentBank, setPaymentBank] = useState(0);
  const [paymentCard, setPaymentCard] = useState(0);
  const [notes, setNotes] = useState("");

  // UI
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  // ===== Load products =====
  const loadProducts = async () => {
    const params: any = { pageSize: 500 };
    if (search) params.search = search;
    if (categoryId) params.categoryId = categoryId;
    const res = await api.get("/products", { params });
    setProducts(unwrap(res).items);
  };

  useEffect(() => {
    loadProducts(); /* eslint-disable-next-line */
  }, [search, categoryId]);

  useEffect(() => {
    api.get("/products/meta/categories").then((r) => setCategories(unwrap(r)));
    api.get("/settings").then((r) => setSettings(unwrap(r)));
  }, []);

  // ===== Models (category ke andar) =====
  const models = useMemo(() => {
    if (!categoryId) return [];
    const set = new Set<string>();
    products.forEach((p: any) => {
      if (p.model) set.add(p.model);
    });
    return Array.from(set).sort();
  }, [products, categoryId]);

  // ===== Sizes (model ke andar) =====
  const sizes = useMemo(() => {
    if (!modelFilter) return [];
    const set = new Set<string>();
    products.forEach((p: any) => {
      if (p.model !== modelFilter) return;
      (p.variants || []).forEach((v: any) => {
        if (v.active !== false && v.size) set.add(v.size);
      });
    });
    return Array.from(set).sort();
  }, [products, modelFilter]);

  // ===== Colors (size ke andar) =====
  const colors = useMemo(() => {
    if (!sizeFilter) return [];
    const set = new Set<string>();
    products.forEach((p: any) => {
      if (p.model !== modelFilter) return;
      (p.variants || []).forEach((v: any) => {
        if (v.active === false) return;
        if (v.size !== sizeFilter) return;
        if (v.color) set.add(v.color);
      });
    });
    return Array.from(set).sort();
  }, [products, modelFilter, sizeFilter]);

  // ===== Filtered products =====
  const visibleProducts = useMemo(() => {
    return products.filter((p: any) => {
      if (modelFilter && p.model !== modelFilter) return false;
      if (sizeFilter || colorFilter) {
        const vs = (p.variants || []).filter((v: any) => v.active !== false);
        const hasMatch = vs.some((v: any) => {
          if (sizeFilter && v.size !== sizeFilter) return false;
          if (colorFilter && v.color !== colorFilter) return false;
          return true;
        });
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [products, modelFilter, sizeFilter, colorFilter]);

  // ===== Customer search =====
  useEffect(() => {
    const t = setTimeout(() => {
      api
        .get("/customers", { params: { search: customerSearch, pageSize: 8 } })
        .then((r) => setCustomers(unwrap(r).items))
        .catch(() => setCustomers([]));
    }, 200);
    return () => clearTimeout(t);
  }, [customerSearch]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (customerBoxRef.current && !customerBoxRef.current.contains(e.target as Node)) {
        setShowCustSug(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // ===== Stock =====
  const productStock = (p: any) => {
    const av = (p.variants || []).filter((v: any) => v.active !== false);
    if (av.length > 0) return av.reduce((s: number, v: any) => s + (v.stock || 0), 0);
    return p.inventory?.quantity ?? 0;
  };

  // ===== Product click =====
  const handleProductClick = (p: any) => {
    const av = (p.variants || []).filter((v: any) => v.active !== false);
    if (av.length > 0) {
      setPickerSize("");
      setVariantProduct(p);
    } else {
      addToCart(p, null, p.inventory?.quantity ?? 0, p.salePrice);
    }
  };

  // ===== Add to cart =====
  const addToCart = (p: any, variant: any | null, stock: number, price: number) => {
    if (stock <= 0) return toast.warning("Out of stock");
    const cartKey = variant ? `${p.id}::${variant.id}` : p.id;

    setCart((prev) => {
      const ex = prev.find((i: any) => i.cartKey === cartKey);
      if (ex) {
        if (ex.quantity + 1 > stock) {
          toast.warning("Stock limit", `Only ${stock} available`);
          return prev;
        }
        return prev.map((i: any) =>
          i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          cartKey,
          productId: p.id,
          variantId: variant?.id || null,
          name: p.name,
          model: p.model,
          size: variant?.size || null,
          color: variant?.color || null,
          quantity: 1,
          unitPrice: price ?? p.salePrice,
          discount: 0,
          discountPercent: 0,
          availableStock: stock,
        } as any,
      ];
    });

    setVariantProduct(null);
    setPickerSize("");
    toast.success("Added", `${p.name}${variant ? ` · ${variant.size || ''} ${variant.color || ''}` : ''}`);
  };

  const updateQty = (cartKey: string, qty: number) => {
    setCart((prev) =>
      prev.map((i: any) => {
        if (i.cartKey !== cartKey) return i;
        if (qty < 1) qty = 1;
        if (qty > i.availableStock) {
          toast.warning("Stock limit", `Only ${i.availableStock} available`);
          qty = i.availableStock;
        }
        return { ...i, quantity: qty };
      }),
    );
  };

  const updateItemDiscount = (cartKey: string, percent: number) => {
    setCart((prev) =>
      prev.map((i: any) => {
        if (i.cartKey !== cartKey) return i;
        if (isNaN(percent) || percent < 0) percent = 0;
        if (percent > 100) percent = 100;
        return { ...i, discountPercent: percent };
      }),
    );
  };

  const removeItem = (cartKey: string) =>
    setCart((prev) => prev.filter((i: any) => i.cartKey !== cartKey));

  // ===== Totals =====
  const totals = useMemo(() => {
    const subtotal = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const itemDiscount = cart.reduce(
      (s, i) => s + (i.quantity * i.unitPrice * (i.discountPercent || 0)) / 100,
      0,
    );
    const afterItem = subtotal - itemDiscount;
    const summaryDiscount = (afterItem * (discountPercent || 0)) / 100;
    const grand = Math.max(afterItem - summaryDiscount + otherCharges, 0);
    const paid = paymentCash + paymentBank + paymentCard;
    const due = Math.max(grand - paid, 0);
    return { subtotal, itemDiscount, summaryDiscount, grand, paid, due };
  }, [cart, discountPercent, otherCharges, paymentCash, paymentBank, paymentCard]);

  // ===== Customer =====
  const selectCustomer = (c: any) => {
    setSelectedCustomer(c);
    setCustomerId(c.id);
    setCustomerSearch("");
    setShowCustSug(false);
  };
  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerId("");
    setCustomerSearch("");
    setShowCustSug(false);
  };

  // ===== Complete sale =====
  const completeSale = async () => {
    if (cart.length === 0) return toast.warning("Cart is empty");
    if (totals.grand <= 0) return toast.warning("Invalid total");
    if (totals.paid > totals.grand + 0.01) return toast.error("Payment exceeds total");
    if (totals.due > 0 && !customerId) return toast.warning("Credit sale needs customer");

    setSaving(true);
    try {
      const payments: any[] = [];
      if (paymentCash > 0) payments.push({ method: "CASH", amount: paymentCash });
      if (paymentBank > 0) payments.push({ method: "BANK", amount: paymentBank });
      if (paymentCard > 0) payments.push({ method: "CARD", amount: paymentCard });
      if (totals.due > 0) payments.push({ method: "CREDIT", amount: totals.due });
      if (payments.length === 0) payments.push({ method: "CASH", amount: 0 });

      const res = await api.post("/sales", {
        customerId: customerId || null,
        items: cart.map((i: any) => ({
          productId: i.productId,
          variantId: i.variantId || null,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: 0,
          discountPercent: i.discountPercent || 0,
        })),
        discount: 0,
        discountPercent: discountPercent || 0,
        otherCharges,
        payments,
        notes,
      });
      const sale = unwrap(res);
      setReceipt(sale);
      toast.success("Sale done", `Invoice ${sale.invoiceNumber}`);
      setCart([]);
      setDiscountPercent(0);
      setOtherCharges(0);
      setPaymentCash(0);
      setPaymentBank(0);
      setPaymentCard(0);
      setNotes("");
      loadProducts();
    } catch (err: any) {
      toast.error("Sale failed", err.response?.data?.message);
    } finally {
      setSaving(false);
    }
  };

  const closeReceipt = () => {
    setReceipt(null);
    clearCustomer();
  };

  const createCustomer = async () => {
    try {
      const res = await api.post("/customers", newCustomer);
      const c = unwrap(res);
      selectCustomer({ ...c, totalSales: 0, received: 0, balance: 0 });
      setShowNewCustomer(false);
      setNewCustomer({ name: "", phone: "", city: "" });
      toast.success("Customer added");
    } catch (err: any) {
      toast.error("Failed", err.response?.data?.message);
    }
  };

  // ===== Variant picker data =====
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

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader title="POS / New Sale" subtitle="Quick counter sales" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ============ LEFT: PRODUCTS ============ */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters — Search + 4 cascade dropdowns */}
          <Card>
            {/* Search */}
            <div className="mb-3">
              <Input
                placeholder="Search product name, model, SKU…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5" />}
              />
            </div>

            {/* 4 Cascade dropdowns — 2x2 grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5">
                  Category
                </label>
                <Select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setModelFilter("");
                    setSizeFilter("");
                    setColorFilter("");
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

              {/* Model */}
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5">
                  Model
                  {!categoryId && (
                    <span className="text-ink-muted font-normal ml-1">
                      (select category)
                    </span>
                  )}
                </label>
                <Select
                  value={modelFilter}
                  disabled={!categoryId || models.length === 0}
                  onChange={(e) => {
                    setModelFilter(e.target.value);
                    setSizeFilter("");
                    setColorFilter("");
                  }}
                >
                  <option value="">
                    {!categoryId
                      ? "—"
                      : models.length === 0
                        ? "No models"
                        : "All Models"}
                  </option>
                  {models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Size */}
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5">
                  Size
                  {!modelFilter && (
                    <span className="text-ink-muted font-normal ml-1">
                      (select model)
                    </span>
                  )}
                </label>
                <Select
                  value={sizeFilter}
                  disabled={!modelFilter || sizes.length === 0}
                  onChange={(e) => {
                    setSizeFilter(e.target.value);
                    setColorFilter("");
                  }}
                >
                  <option value="">
                    {!modelFilter
                      ? "—"
                      : sizes.length === 0
                        ? "No sizes"
                        : "All Sizes"}
                  </option>
                  {sizes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5">
                  Color
                  {!sizeFilter && (
                    <span className="text-ink-muted font-normal ml-1">
                      (select size)
                    </span>
                  )}
                </label>
                <Select
                  value={colorFilter}
                  disabled={!sizeFilter || colors.length === 0}
                  onChange={(e) => setColorFilter(e.target.value)}
                >
                  <option value="">
                    {!sizeFilter
                      ? "—"
                      : colors.length === 0
                        ? "No colors"
                        : "All Colors"}
                  </option>
                  {colors.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Clear filters if any active */}
            {(modelFilter || sizeFilter || colorFilter || categoryId) && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => {
                    setCategoryId("");
                    setModelFilter("");
                    setSizeFilter("");
                    setColorFilter("");
                  }}
                  className="text-xs text-danger hover:underline flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear all filters
                </button>
              </div>
            )}
          </Card>

          {/* Products grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {visibleProducts.map((p: any) => {
              const stock = productStock(p);
              const disabled = stock <= 0;
              const variants = (p.variants || []).filter(
                (v: any) => v.active !== false,
              );

              return (
                <button
                  key={p.id}
                  disabled={disabled}
                  onClick={() => handleProductClick(p)}
                  className={cn(
                    "text-left bg-surface-card border rounded-lg p-3 transition-all relative flex flex-col",
                    disabled
                      ? "opacity-50 cursor-not-allowed border-edge-base"
                      : "border-edge-base hover:border-brand-500 hover:shadow-md active:scale-[0.98]",
                  )}
                >
                  {variants.length > 0 && (
                    <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 bg-brand-600 text-white rounded font-medium">
                      {variants.length}
                    </span>
                  )}
                  <p className="font-semibold text-sm text-ink-primary leading-tight line-clamp-2 pr-8">
                    {p.name}
                  </p>
                  <p className="text-xs text-ink-secondary mt-0.5 truncate">
                    {p.model || "—"}
                  </p>
                  <div className="mt-auto pt-2 flex justify-between items-end">
                    <span className="text-brand-600 dark:text-brand-400 font-bold text-sm">
                      Rs {formatMoney(p.salePrice)}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-medium px-1.5 py-0.5 rounded",
                        stock > 5
                          ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : stock > 0
                            ? "text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400"
                            : "text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-400",
                      )}
                    >
                      {stock}
                    </span>
                  </div>
                </button>
              );
            })}

            {visibleProducts.length === 0 && (
              <div className="col-span-full">
                <Empty
                  title="No products found"
                  description="Try a different filter or search"
                  icon={<ShoppingCart className="w-6 h-6" />}
                />
              </div>
            )}
          </div>
        </div>

        {/* ============ RIGHT: CART + PAYMENT ============ */}
        <div className="space-y-4">
          {/* Customer */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">
                Customer
              </span>
              {selectedCustomer ? (
                <button
                  onClick={clearCustomer}
                  className="text-xs text-danger hover:underline"
                >
                  Change
                </button>
              ) : (
                <button
                  onClick={() => setShowNewCustomer(true)}
                  className="text-xs text-brand-600 hover:underline flex items-center gap-1"
                >
                  <UserPlus className="w-3 h-3" /> New
                </button>
              )}
            </div>

            {selectedCustomer ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center font-semibold text-xs flex-shrink-0">
                  {selectedCustomer.name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-primary truncate">
                    {selectedCustomer.name}
                  </p>
                  {selectedCustomer.phone && (
                    <p className="text-xs text-ink-secondary">
                      {selectedCustomer.phone}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative" ref={customerBoxRef}>
                <Input
                  placeholder="Search customer…"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustSug(true);
                  }}
                  onFocus={() => setShowCustSug(true)}
                  leftIcon={<Search className="w-3.5 h-3.5" />}
                />
                {showCustSug && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-surface-card border border-edge-base rounded-md shadow-lg z-30 max-h-64 overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedCustomer({ id: "", name: "Walk-in", phone: null });
                        setCustomerId("");
                        setShowCustSug(false);
                        setCustomerSearch("");
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-surface-hover border-b border-edge-light text-sm"
                    >
                      🚶 Walk-in Customer
                    </button>
                    {customers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => selectCustomer(c)}
                        className="w-full text-left px-3 py-2 hover:bg-surface-hover border-b border-edge-light text-sm"
                      >
                        <span className="font-medium">{c.name}</span>
                        {c.phone && (
                          <span className="text-xs text-ink-secondary ml-2">
                            {c.phone}
                          </span>
                        )}
                      </button>
                    ))}
                    {customers.length === 0 && customerSearch && (
                      <div className="px-3 py-3 text-center text-xs text-ink-muted">
                        No customer found
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Cart */}
          <Card padding="none">
            <div className="flex items-center justify-between p-3 border-b border-edge-base">
              <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" strokeWidth={1.75} />
                Cart
                {cart.length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 bg-brand-600 text-white rounded-full">
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </h3>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-xs text-danger hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="p-6 text-center">
                <ShoppingCart className="w-8 h-8 text-ink-muted mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-ink-secondary">Cart is empty</p>
                <p className="text-xs text-ink-muted mt-1">
                  Click products to add
                </p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-edge-light">
                {cart.map((i: any) => {
                  const lineGross = i.quantity * i.unitPrice;
                  const lineDiscount = (lineGross * (i.discountPercent || 0)) / 100;
                  const lineNet = lineGross - lineDiscount;
                  const label = [i.size, i.color].filter(Boolean).join(" / ");
                  return (
                    <div key={i.cartKey} className="p-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-ink-primary truncate">
                            {i.name}
                            {label && (
                              <span className="text-xs text-brand-600 font-normal ml-1">
                                ({label})
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-ink-secondary">
                            Rs {formatMoney(i.unitPrice)} × {i.quantity}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(i.cartKey)}
                          className="text-ink-muted hover:text-danger p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-2">
                        <div className="flex items-center bg-surface-hover rounded-md">
                          <button
                            onClick={() => updateQty(i.cartKey, i.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-surface-card rounded-l-md"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">
                            {i.quantity}
                          </span>
                          <button
                            onClick={() => updateQty(i.cartKey, i.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-surface-card rounded-r-md"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={i.discountPercent || ""}
                            placeholder="0"
                            onChange={(e) =>
                              updateItemDiscount(
                                i.cartKey,
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-12 bg-surface-input border border-edge-base rounded px-1.5 py-1 text-right text-xs"
                          />
                          <span className="text-xs text-ink-muted">%</span>
                        </div>

                        <span className="font-semibold text-sm text-ink-primary min-w-[70px] text-right">
                          Rs {formatMoney(lineNet)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Payment */}
          <Card>
            <h3 className="text-sm font-semibold text-ink-primary mb-3">
              Payment
            </h3>

            <div className="space-y-1.5 text-sm mb-3">
              <div className="flex justify-between">
                <span className="text-ink-secondary">Subtotal</span>
                <span className="text-ink-primary">
                  Rs {formatMoney(totals.subtotal)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-ink-secondary">Discount %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={discountPercent || ""}
                  placeholder="0"
                  onChange={(e) => {
                    let v = parseFloat(e.target.value) || 0;
                    if (v < 0) v = 0;
                    if (v > 100) v = 100;
                    setDiscountPercent(v);
                  }}
                  className="w-16 bg-surface-input border border-edge-base rounded px-2 py-1 text-right text-xs"
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-ink-secondary">Other Charges</span>
                <input
                  type="number"
                  value={otherCharges || ""}
                  placeholder="0"
                  onChange={(e) =>
                    setOtherCharges(parseFloat(e.target.value) || 0)
                  }
                  className="w-24 bg-surface-input border border-edge-base rounded px-2 py-1 text-right text-xs"
                />
              </div>

              <div className="flex justify-between pt-2 border-t border-edge-base text-base font-bold">
                <span className="text-ink-primary">Total</span>
                <span className="text-brand-600 dark:text-brand-400">
                  Rs {formatMoney(totals.grand)}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-edge-base">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-ink-secondary">
                  <Banknote className="w-3.5 h-3.5" /> Cash
                </span>
                <input
                  type="number"
                  value={paymentCash || ""}
                  placeholder="0"
                  onChange={(e) => setPaymentCash(parseFloat(e.target.value) || 0)}
                  className="w-28 bg-surface-input border border-edge-base rounded px-2 py-1.5 text-right text-sm"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-ink-secondary">
                  <Building2 className="w-3.5 h-3.5" /> Bank
                </span>
                <input
                  type="number"
                  value={paymentBank || ""}
                  placeholder="0"
                  onChange={(e) => setPaymentBank(parseFloat(e.target.value) || 0)}
                  className="w-28 bg-surface-input border border-edge-base rounded px-2 py-1.5 text-right text-sm"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-ink-secondary">
                  <CreditCard className="w-3.5 h-3.5" /> Card
                </span>
                <input
                  type="number"
                  value={paymentCard || ""}
                  placeholder="0"
                  onChange={(e) => setPaymentCard(parseFloat(e.target.value) || 0)}
                  className="w-28 bg-surface-input border border-edge-base rounded px-2 py-1.5 text-right text-sm"
                />
              </div>

              {totals.due > 0 && (
                <div className="flex justify-between items-center text-sm pt-2 border-t border-edge-base">
                  <span className="text-amber-600 font-medium">Due (Credit)</span>
                  <span className="text-amber-600 font-semibold">
                    Rs {formatMoney(totals.due)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center text-sm pt-2 border-t border-edge-base">
                <span className="text-ink-secondary">Paid</span>
                <span className="text-ink-primary font-medium">
                  Rs {formatMoney(totals.paid)}
                </span>
              </div>
            </div>

            <Button
              className="w-full mt-3"
              size="lg"
              onClick={completeSale}
              loading={saving}
              disabled={cart.length === 0}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Complete Sale
            </Button>
          </Card>
        </div>
      </div>

      {/* ============ VARIANT PICKER ============ */}
      <Modal
        open={!!variantProduct}
        onClose={() => {
          setVariantProduct(null);
          setPickerSize("");
        }}
        title={variantProduct?.name || "Select Size & Color"}
        size="sm"
      >
        {variantProduct && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-2">
                Size
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
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {pickerSize && (
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {pickerColors.map((v: any) => (
                    <button                      key={v.id}
                      disabled={v.stock <= 0}
                      onClick={() =>
                        addToCart(
                          variantProduct,
                          v,
                          v.stock,
                          v.salePrice || variantProduct.salePrice,
                        )
                      }
                      className={cn(
                        "px-4 py-2 rounded-md text-sm font-medium border transition-colors",
                        v.stock <= 0
                          ? "opacity-40 cursor-not-allowed border-edge-base"
                          : "bg-surface-card text-ink-primary border-edge-base hover:border-brand-500 hover:bg-surface-hover",
                      )}
                    >
                      {v.color || "—"}
                      <span
                        className={cn(
                          "ml-2 text-xs",
                          v.stock > 5
                            ? "text-emerald-600"
                            : v.stock > 0
                              ? "text-amber-600"
                              : "text-red-600",
                        )}
                      >
                        ({v.stock})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!pickerSize && (
              <div className="text-center text-xs text-ink-muted py-3">
                Pehle size select karo
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* New Customer Modal */}
      <Modal
        open={showNewCustomer}
        onClose={() => setShowNewCustomer(false)}
        title="Add New Customer"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowNewCustomer(false)}>
              Cancel
            </Button>
            <Button onClick={createCustomer} disabled={!newCustomer.name}>
              Create & Select
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Name *"
            value={newCustomer.name}
            onChange={(e: any) =>
              setNewCustomer({ ...newCustomer, name: e.target.value })
            }
            autoFocus
          />
          <Input
            label="Phone"
            value={newCustomer.phone}
            onChange={(e: any) =>
              setNewCustomer({ ...newCustomer, phone: e.target.value })
            }
          />
          <Input
            label="City"
            value={newCustomer.city}
            onChange={(e: any) =>
              setNewCustomer({ ...newCustomer, city: e.target.value })
            }
          />
        </div>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        open={!!receipt}
        onClose={closeReceipt}
        title="Sale Completed"
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => printElement(receiptRef.current)}
              icon={<Printer className="w-3.5 h-3.5" />}
            >
              Print
            </Button>
            <Button onClick={closeReceipt}>New Sale</Button>
          </>
        }
      >
        {receipt && (
          <div className="space-y-3">
            <div className="text-center py-2">
              <CheckCircle2
                className="w-12 h-12 text-emerald-500 mx-auto mb-2"
                strokeWidth={1.5}
              />
              <p className="text-sm text-ink-secondary">Sale completed</p>
              <p className="font-mono text-lg font-bold text-ink-primary mt-1">
                {receipt.invoiceNumber}
              </p>
            </div>
            <div className="text-sm space-y-1.5 border-t border-edge-base pt-3">
              <div className="flex justify-between">
                <span className="text-ink-secondary">Total</span>
                <span className="font-medium">
                  Rs {formatMoney(receipt.total)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">Paid</span>
                <span className="font-medium text-emerald-600">
                  Rs {formatMoney(receipt.paid)}
                </span>
              </div>
              {receipt.due > 0 && (
                <div className="flex justify-between">
                  <span className="text-ink-secondary">Due</span>
                  <span className="font-medium text-amber-600">
                    Rs {formatMoney(receipt.due)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Hidden Receipt */}
      <div className="fixed -left-[9999px] top-0">
        {receipt && settings && (
          <ReceiptPrint
            ref={receiptRef}
            data={{
              outletName: settings.outletName || "GFC Fans Outlet",
              outletAddress: settings.address,
              outletPhone: settings.phone,
              invoiceNumber: receipt.invoiceNumber,
              saleDate: receipt.saleDate,
              cashier: receipt.user?.fullName,
              customer: receipt.customer?.name || selectedCustomer?.name,
              customerPhone:
                receipt.customer?.phone || selectedCustomer?.phone,
              items: (receipt.items || cart).map((i: any) => ({
                name: i.product?.name || i.name,
                model: i.product?.model || i.model,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                discount: i.discount,
                discountPercent: i.discountPercent,
                lineTotal: i.lineTotal || i.quantity * i.unitPrice - i.discount,
              })),
              subtotal: receipt.subtotal,
              discount: receipt.discount,
              otherCharges: receipt.otherCharges,
              total: receipt.total,
              paid: receipt.paid,
              due: receipt.due,
              paymentMethod: receipt.paymentMethod,
              footer: settings.receiptFooter,
            }}
          />
        )}
      </div>
    </div>
  );
}