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
  X,
  Package,
  Filter,
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
  const [sortBy, setSortBy] = useState<'newest' | 'stock'>('newest');

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

  // ===== Search state =====
  const hasSearch = !!(search.trim() || categoryId || modelFilter);

  // ===== Cart keys set =====
  const cartKeys = useMemo(() => {
    const s = new Set<string>();
    cart.forEach((i: any) => s.add(i.cartKey));
    return s;
  }, [cart]);

  const cartProductIds = useMemo(() => {
    const s = new Set<string>();
    cart.forEach((i: any) => s.add(i.productId));
    return s;
  }, [cart]);

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

  // ===== Models =====
  const models = useMemo(() => {
    if (!categoryId) return [];
    const set = new Set<string>();
    products.forEach((p: any) => {
      if (p.model) set.add(p.model);
    });
    return Array.from(set).sort();
  }, [products, categoryId]);

  // ===== Stock helpers =====
  const productStock = (p: any) => {
    const av = (p.variants || []).filter((v: any) => v.active !== false);
    if (av.length > 0) return av.reduce((s: number, v: any) => s + (v.stock || 0), 0);
    return p.inventory?.quantity ?? 0;
  };

  // ===== Filtered products =====
  const visibleProducts = useMemo(() => {
    if (!search.trim() && !categoryId && !modelFilter) {
      return [];
    }
    let list = products.filter((p: any) => {
      if (modelFilter && p.model !== modelFilter) return false;
      return true;
    });

    // Sort (only 2 options now)
    if (sortBy === 'stock') {
      list = [...list].sort((a, b) => productStock(b) - productStock(a));
    }
    return list;
  }, [products, modelFilter, search, categoryId, sortBy]);

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
    toast.success(
      "Added to cart",
      `${p.name}${variant ? ` · ${variant.size || ""} ${variant.color || ""}` : ""}`,
    );
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
    if (totals.due > 0 && !customerId) return toast.warning("Credit sale requires a customer");

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
      toast.success("Sale completed", `Invoice ${sale.invoiceNumber}`);
      setCart([]);
      setDiscountPercent(0);
      setOtherCharges(0);
      setPaymentCash(0);
      setPaymentBank(0);
      setPaymentCard(0);
      setNotes("");
      setSearch("");
      setCategoryId("");
      setModelFilter("");
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
      toast.error("Failed to add customer", err.response?.data?.message);
    }
  };

  // ===== Variant picker =====
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

  // Color swatch helper
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

  return (
    <div className="p-6 w-full max-w-[2400px] mx-auto">
      <PageHeader
        title="Point of Sale"
        subtitle="GFC Fans Outlet · Counter Sales"
      />

      {/* Main layout: 3 columns — Products 2/3, Checkout 1/3 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* ==================== LEFT: PRODUCT SEARCH ==================== */}
        <div className="xl:col-span-2 space-y-4">
          {/* Filter toolbar */}
          <Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-ink-secondary mb-2">
                  Search Products
                </label>
                <Input
                  placeholder="Name, model or SKU…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-2">
                  Category
                </label>
                <Select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setModelFilter("");
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

              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-2">
                  Model
                </label>
                <Select
                  value={modelFilter}
                  disabled={!categoryId || models.length === 0}
                  onChange={(e) => setModelFilter(e.target.value)}
                >
                  <option value="">
                    {!categoryId
                      ? "Select category first"
                      : models.length === 0
                        ? "No models available"
                        : "All Models"}
                  </option>
                  {models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {hasSearch && (
              <div className="mt-4 pt-4 border-t border-edge-base flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-ink-secondary">
                  <span className="font-semibold text-ink-primary">
                    {visibleProducts.length}
                  </span>{" "}
                  product{visibleProducts.length !== 1 ? "s" : ""} found
                </p>
                <div className="flex items-center gap-3">
                  {/* Sort dropdown — only 2 options now */}
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-ink-muted" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-surface-input border border-edge-base rounded-md px-2 py-1 text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="newest">Newest</option>
                      <option value="stock">Highest Stock</option>
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      setCategoryId("");
                      setModelFilter("");
                      setSearch("");
                    }}
                    className="text-sm text-danger hover:underline flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Clear filters
                  </button>
                </div>
              </div>
            )}
          </Card>

          {/* Products area */}
          {hasSearch ? (
            visibleProducts.length === 0 ? (
              <Card>
                <div className="text-center py-16">
                  <Package
                    className="w-14 h-14 text-ink-muted mx-auto mb-4"
                    strokeWidth={1.2}
                  />
                  <p className="text-lg font-semibold text-ink-primary">
                    No products found
                  </p>
                  <p className="text-sm text-ink-secondary mt-2">
                    Try a different name, model or SKU
                  </p>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {visibleProducts.map((p: any) => {
                  const stock = productStock(p);
                  const disabled = stock <= 0;
                  const variants = (p.variants || []).filter(
                    (v: any) => v.active !== false,
                  );
                  const inCart = cartProductIds.has(p.id);

                  // Group variants by size
                  const sizeBreakdown: Record<
                    string,
                    { color: string; stock: number; price: number; variant: any }[]
                  > = {};
                  variants.forEach((v: any) => {
                    const sz = v.size || "—";
                    if (!sizeBreakdown[sz]) sizeBreakdown[sz] = [];
                    sizeBreakdown[sz].push({
                      color: v.color || "—",
                      stock: v.stock || 0,
                      price: v.salePrice || p.salePrice,
                      variant: v,
                    });
                  });

                  const sortedSizes = Object.keys(sizeBreakdown).sort((a, b) => {
                    const na = parseFloat(a);
                    const nb = parseFloat(b);
                    if (!isNaN(na) && !isNaN(nb)) return na - nb;
                    return a.localeCompare(b);
                  });

                  return (
                    <button
                      key={p.id}
                      disabled={disabled}
                      onClick={() => handleProductClick(p)}
                      className={cn(
                        "text-left bg-surface-card border rounded-lg p-5 transition-all relative flex flex-col w-full",
                        disabled
                          ? "opacity-50 cursor-not-allowed border-edge-base"
                          : "border-edge-base hover:border-brand-500 hover:shadow-lg active:scale-[0.99]",
                        inCart && !disabled && "ring-2 ring-brand-500 ring-offset-1",
                      )}
                    >
                      {/* Header */}
                      <div className="flex justify-between items-start gap-3 mb-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xl text-ink-primary leading-tight truncate flex items-center gap-2">
                            {p.name}
                            {inCart && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-full font-semibold flex items-center gap-0.5 flex-shrink-0">
                                <ShoppingCart className="w-2.5 h-2.5" />
                                In Cart
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-ink-secondary mt-0.5 truncate">
                            {p.model || "—"}
                            {p.brand?.name ? ` · ${p.brand.name}` : ""}
                          </p>
                        </div>
                        {variants.length > 0 && (
                          <span className="text-xs px-2.5 py-1 bg-brand-600 text-white rounded-full font-semibold flex-shrink-0">
                            {variants.length} variants
                          </span>
                        )}
                      </div>

                      {/* Variants — table-style grid: Size | Price | Colors */}
                      {variants.length > 0 ? (
                        <div className="mb-4 flex-1 border border-edge-base rounded-lg overflow-hidden">
                          {/* Header row */}
                          <div className="grid grid-cols-[70px_120px_1fr] gap-3 px-4 py-2.5 bg-surface-hover border-b border-edge-base text-xs font-semibold text-ink-muted uppercase tracking-wider">
                            <div>Size</div>
                            <div>Price</div>
                            <div>Colors · Stock</div>
                          </div>

                          {/* Data rows */}
                          <div className="divide-y divide-edge-light">
                            {sortedSizes.map((sz) => {
                              const items = sizeBreakdown[sz];
                              const sizePrices = items
                                .map((it) => it.price)
                                .filter((pr) => pr > 0);
                              const sizeMin = sizePrices.length > 0 ? Math.min(...sizePrices) : 0;
                              const sizeMax = sizePrices.length > 0 ? Math.max(...sizePrices) : 0;
                              const sizePriceLabel =
                                sizeMin === sizeMax
                                  ? `Rs ${formatMoney(sizeMin)}`
                                  : `Rs ${formatMoney(sizeMin)} – ${formatMoney(sizeMax)}`;

                              return (
                                <div
                                  key={sz}
                                  className="grid grid-cols-[70px_120px_1fr] gap-3 px-4 py-3 items-center hover:bg-surface-hover/30"
                                >
                                  {/* Size column */}
                                  <div className="flex items-center">
                                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 text-sm font-bold border border-brand-200 dark:border-brand-800">
                                      {sz}
                                    </span>
                                  </div>

                                  {/* Price column */}
                                  <div>
                                    <span className="text-sm font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">
                                      {sizePriceLabel}
                                    </span>
                                  </div>

                                  {/* Colors column — sirf stock dikhao */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {items
                                      .sort((a, b) => a.color.localeCompare(b.color))
                                      .map((it, idx) => {
                                        const inCartThis = cartKeys.has(
                                          `${p.id}::${it.variant.id}`,
                                        );
                                        return (
                                          <span
                                            key={idx}
                                            className={cn(
                                              "inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border font-medium whitespace-nowrap",
                                              it.stock > 0
                                                ? inCartThis
                                                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-ink-primary"
                                                  : "bg-surface-card border-edge-base text-ink-primary"
                                                : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400",
                                            )}
                                          >
                                            <span
                                              className={cn(
                                                "w-2.5 h-2.5 rounded-full border border-edge-base flex-shrink-0",
                                                colorSwatch(it.color),
                                              )}
                                            />
                                            <span className={cn(it.stock <= 0 && "line-through")}>
                                              {it.color}
                                            </span>
                                            <span className="text-emerald-600 font-bold">
                                              {it.stock}
                                            </span>
                                          </span>
                                        );
                                      })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-ink-muted italic mb-4 flex-1 border border-dashed border-edge-base rounded-lg py-6 text-center">
                          No variants — click to add directly
                        </div>
                      )}

                      {/* Footer: Available Stock only */}
                      <div className="mt-auto pt-4 border-t border-edge-base flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-ink-muted uppercase tracking-wider font-semibold">
                            Total Stock
                          </span>
                          <span
                            className={cn(
                              "text-lg font-bold",
                              stock > 5
                                ? "text-emerald-600 dark:text-emerald-400"
                                : stock > 0
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-red-600 dark:text-red-400",
                            )}
                          >
                            {stock} pcs
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            /* Empty state — before searching */
            <Card>
              <div className="text-center py-24">
                <div className="w-20 h-20 rounded-full bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center mx-auto mb-6">
                  <Search
                    className="w-10 h-10 text-brand-600 dark:text-brand-400"
                    strokeWidth={1.5}
                  />
                </div>
                <p className="text-2xl font-bold text-ink-primary">
                  Start a new sale
                </p>
                <p className="text-base text-ink-secondary mt-2">
                  Search for a product by name, model or SKU
                </p>
                <p className="text-sm text-ink-muted mt-1">
                  Or filter by category to browse the catalogue
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* ==================== RIGHT: CART + CHECKOUT ==================== */}
        <div className="xl:col-span-1 space-y-4">
          {/* Customer */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-ink-secondary uppercase tracking-wider">
                Customer
              </span>
              {selectedCustomer ? (
                <button
                  onClick={clearCustomer}
                  className="text-sm text-danger hover:underline"
                >
                  Change
                </button>
              ) : (
                <button
                  onClick={() => setShowNewCustomer(true)}
                  className="text-sm text-brand-600 hover:underline flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" /> New Customer
                </button>
              )}
            </div>

            {selectedCustomer ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  {selectedCustomer.name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium text-ink-primary truncate">
                    {selectedCustomer.name}
                  </p>
                  {selectedCustomer.phone && (
                    <p className="text-sm text-ink-secondary truncate">
                      {selectedCustomer.phone}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative" ref={customerBoxRef}>
                <Input
                  placeholder="Search by name or phone…"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustSug(true);
                  }}
                  onFocus={() => setShowCustSug(true)}
                  leftIcon={<Search className="w-4 h-4" />}
                />
                {showCustSug && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-surface-card border border-edge-base rounded-md shadow-lg z-30 max-h-64 overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedCustomer({
                          id: "",
                          name: "Walk-in Customer",
                          phone: null,
                        });
                        setCustomerId("");
                        setShowCustSug(false);
                        setCustomerSearch("");
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-surface-hover border-b border-edge-light text-base"
                    >
                      🚶 Walk-in Customer
                    </button>
                    {customers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => selectCustomer(c)}
                        className="w-full text-left px-4 py-3 hover:bg-surface-hover border-b border-edge-light"
                      >
                        <span className="font-medium text-base">{c.name}</span>
                        {c.phone && (
                          <span className="text-sm text-ink-secondary ml-2">
                            {c.phone}
                          </span>
                        )}
                      </button>
                    ))}
                    {customers.length === 0 && customerSearch && (
                      <div className="px-4 py-3 text-center text-sm text-ink-muted">
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
            <div className="flex items-center justify-between p-4 border-b border-edge-base">
              <h3 className="text-base font-semibold text-ink-primary flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" strokeWidth={1.75} />
                Cart
                {cart.length > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-brand-600 text-white rounded-full">
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </h3>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-sm text-danger hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="p-8 text-center">
                <ShoppingCart
                  className="w-10 h-10 text-ink-muted mx-auto mb-3"
                  strokeWidth={1.5}
                />
                <p className="text-base text-ink-secondary">Cart is empty</p>
                <p className="text-sm text-ink-muted mt-1">
                  Search and add products to begin
                </p>
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto divide-y divide-edge-light">
                {cart.map((i: any) => {
                  const lineGross = i.quantity * i.unitPrice;
                  const lineDiscount =
                    (lineGross * (i.discountPercent || 0)) / 100;
                  const lineNet = lineGross - lineDiscount;
                  const label = [i.size, i.color].filter(Boolean).join(" / ");
                  return (
                    <div key={i.cartKey} className="p-4">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-medium text-ink-primary truncate">
                            {i.name}
                          </p>
                          {label && (
                            <p className="text-sm text-brand-600 truncate">
                              {label}
                            </p>
                          )}
                          <p className="text-sm text-ink-secondary mt-0.5">
                            Rs {formatMoney(i.unitPrice)} × {i.quantity}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(i.cartKey)}
                          className="text-ink-muted hover:text-danger p-1 flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-3">
                        <div className="flex items-center bg-surface-hover rounded-md">
                          <button
                            onClick={() =>
                              updateQty(i.cartKey, i.quantity - 1)
                            }
                            className="w-8 h-8 flex items-center justify-center hover:bg-surface-card rounded-l-md"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-10 text-center text-sm font-medium">
                            {i.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQty(i.cartKey, i.quantity + 1)
                            }
                            className="w-8 h-8 flex items-center justify-center hover:bg-surface-card rounded-r-md"
                          >
                            <Plus className="w-3.5 h-3.5" />
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
                            className="w-14 bg-surface-input border border-edge-base rounded px-2 py-1 text-right text-sm"
                          />
                          <span className="text-sm text-ink-muted">%</span>
                        </div>

                        <span className="font-semibold text-sm text-ink-primary whitespace-nowrap">
                          Rs {formatMoney(lineNet)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Checkout / Payment */}
          <Card>
            <h3 className="text-base font-semibold text-ink-primary mb-4">
              Checkout
            </h3>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-ink-secondary">Subtotal</span>
                <span className="text-ink-primary font-medium">
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
                  className="w-20 bg-surface-input border border-edge-base rounded px-2 py-1 text-right text-sm"
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
                  className="w-28 bg-surface-input border border-edge-base rounded px-2 py-1 text-right text-sm"
                />
              </div>

              <div className="flex justify-between pt-3 border-t border-edge-base text-lg font-bold">
                <span className="text-ink-primary">Total</span>
                <span className="text-brand-600 dark:text-brand-400">
                  Rs {formatMoney(totals.grand)}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-edge-base">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-ink-secondary">
                  <Banknote className="w-4 h-4" /> Cash
                </span>
                <input
                  type="number"
                  value={paymentCash || ""}
                  placeholder="0"
                  onChange={(e) =>
                    setPaymentCash(parseFloat(e.target.value) || 0)
                  }
                  className="w-32 bg-surface-input border border-edge-base rounded px-3 py-1.5 text-right text-sm"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-ink-secondary">
                  <Building2 className="w-4 h-4" /> Bank Transfer
                </span>
                <input
                  type="number"
                  value={paymentBank || ""}
                  placeholder="0"
                  onChange={(e) =>
                    setPaymentBank(parseFloat(e.target.value) || 0)
                  }
                  className="w-32 bg-surface-input border border-edge-base rounded px-3 py-1.5 text-right text-sm"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-ink-secondary">
                  <CreditCard className="w-4 h-4" /> Card
                </span>
                <input
                  type="number"
                  value={paymentCard || ""}
                  placeholder="0"
                  onChange={(e) =>
                    setPaymentCard(parseFloat(e.target.value) || 0)
                  }
                  className="w-32 bg-surface-input border border-edge-base rounded px-3 py-1.5 text-right text-sm"
                />
              </div>

              {totals.due > 0 && (
                <div className="flex justify-between items-center text-sm pt-3 border-t border-edge-base">
                  <span className="text-amber-600 font-medium">
                    Credit (Due)
                  </span>
                  <span className="text-amber-600 font-semibold">
                    Rs {formatMoney(totals.due)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center text-sm pt-3 border-t border-edge-base">
                <span className="text-ink-secondary">Amount Paid</span>
                <span className="text-ink-primary font-medium">
                  Rs {formatMoney(totals.paid)}
                </span>
              </div>
            </div>

            <Button
              className="w-full mt-4"
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

      {/* ==================== VARIANT PICKER MODAL ==================== */}
      <Modal
        open={!!variantProduct}
        onClose={() => {
          setVariantProduct(null);
          setPickerSize("");
        }}
        title={variantProduct?.name || "Select Size & Color"}
        size="lg"
      >
        {variantProduct && (
          <div className="space-y-5">
            {/* Size selection */}
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
                      "px-5 py-2.5 rounded-md text-base font-medium border transition-colors",
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

            {/* Color selection — sirf stock */}
            {pickerSize && (
              <div>
                <label className="block text-sm font-semibold text-ink-secondary uppercase tracking-wider mb-3">
                  Select Color
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pickerColors.map((v: any) => {
                    const price = v.salePrice || variantProduct.salePrice;
                    const disabled = v.stock <= 0;
                    const inCart = cartKeys.has(`${variantProduct.id}::${v.id}`);

                    return (
                      <button
                        key={v.id}
                        disabled={disabled}
                        onClick={() =>
                          addToCart(variantProduct, v, v.stock, price)
                        }
                        className={cn(
                          "text-left rounded-lg border-2 p-4 transition-all",
                          disabled
                            ? "opacity-40 cursor-not-allowed border-edge-base bg-surface-hover"
                            : inCart
                              ? "border-brand-500 bg-brand-50 dark:bg-brand-950/20 shadow-md"
                              : "border-edge-base hover:border-brand-500 hover:shadow-md bg-surface-card active:scale-[0.98]",
                        )}
                      >
                        {/* Color + Price */}
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={cn(
                                "w-6 h-6 rounded-full border-2 border-edge-base flex-shrink-0",
                                colorSwatch(v.color),
                              )}
                            />
                            <span className="text-base font-bold text-ink-primary truncate">
                              {v.color || "—"}
                            </span>
                            {inCart && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-full font-semibold flex items-center gap-0.5 flex-shrink-0">
                                <ShoppingCart className="w-2.5 h-2.5" />
                                In Cart
                              </span>
                            )}
                          </div>
                          <span className="text-lg font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">
                            Rs {formatMoney(price)}
                          </span>
                        </div>

                        {/* Available only */}
                        <div className="pt-3 border-t border-edge-base">
                          <p className="text-[10px] text-ink-muted uppercase tracking-wider font-semibold">
                            Available Stock
                          </p>
                          <p
                            className={cn(
                              "text-lg font-bold mt-0.5",
                              v.stock > 5
                                ? "text-emerald-600 dark:text-emerald-400"
                                : v.stock > 0
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-red-600 dark:text-red-400",
                            )}
                          >
                            {v.stock} pcs
                          </p>
                        </div>

                        {disabled && (
                          <p className="text-xs text-red-600 font-semibold mt-2 text-center">
                            Out of Stock
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!pickerSize && (
              <div className="text-center text-sm text-ink-muted py-4">
                Select a size to see available colors
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ==================== NEW CUSTOMER MODAL ==================== */}
      <Modal
        open={showNewCustomer}
        onClose={() => setShowNewCustomer(false)}
        title="Add New Customer"
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setShowNewCustomer(false)}
            >
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
            label="Customer Name *"
            value={newCustomer.name}
            onChange={(e: any) =>
              setNewCustomer({ ...newCustomer, name: e.target.value })
            }
            autoFocus
          />
          <Input
            label="Phone Number"
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

      {/* ==================== RECEIPT MODAL ==================== */}
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
              Print Receipt
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
              <p className="text-sm text-ink-secondary">
                Sale recorded successfully
              </p>
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

      {/* ==================== HIDDEN RECEIPT FOR PRINTING ==================== */}
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