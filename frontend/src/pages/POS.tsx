import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, UserPlus,
  Printer, CheckCircle2, CreditCard, Banknote, Building2, User,
} from 'lucide-react';
import { api, unwrap } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, Card, Input, Select, Modal, Badge, Empty } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { formatMoney } from '../lib/format';
import { cn } from '../lib/cn';
import { ReceiptPrint } from '../components/print/ReceiptPrint';
import { printElement } from '../lib/print';
import type { Product, CartItem } from '../types';

export default function POS() {
  const toast = useToast();

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  // Customer
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const customerBoxRef = useRef<HTMLDivElement>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', city: '' });

  // Payment
  const [discount, setDiscount] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [paymentCash, setPaymentCash] = useState(0);
  const [paymentBank, setPaymentBank] = useState(0);
  const [paymentCard, setPaymentCard] = useState(0);
  const [notes, setNotes] = useState('');

  // UI
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  // ===== Load Products =====
  const loadProducts = async () => {
    const params: any = { pageSize: 500 };
    if (search) params.search = search;
    if (categoryId) params.categoryId = categoryId;
    if (brandId) params.brandId = brandId;
    const res = await api.get('/products', { params });
    setProducts(unwrap(res).items);
  };

  useEffect(() => { loadProducts(); /* eslint-disable-next-line */ }, [search, categoryId, brandId]);

  useEffect(() => {
    api.get('/products/meta/categories').then((r) => setCategories(unwrap(r)));
    api.get('/products/meta/brands').then((r) => setBrands(unwrap(r)));
    api.get('/settings').then((r) => setSettings(unwrap(r)));
  }, []);

  // ===== Load Customers (with debounce) =====
  useEffect(() => {
    const t = setTimeout(() => {
      api.get('/customers', { params: { search: customerSearch, pageSize: 10 } })
        .then((r) => setCustomers(unwrap(r).items))
        .catch(() => setCustomers([]));
    }, 200);
    return () => clearTimeout(t);
  }, [customerSearch]);

  // ===== Close suggestions on outside click =====
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (customerBoxRef.current && !customerBoxRef.current.contains(e.target as Node)) {
        setShowCustomerSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // ===== Cart operations =====
  const addToCart = (p: Product) => {
    const stock = p.inventory?.quantity ?? 0;
    if (stock <= 0) return toast.warning('Out of stock', `${p.name} is not available`);
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) {
        if (existing.quantity + 1 > stock) {
          toast.warning('Stock limit', `Only ${stock} available for ${p.name}`);
          return prev;
        }
        return prev.map((i) => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        productId: p.id, name: p.name, model: p.model,
        quantity: 1, unitPrice: p.salePrice, discount: 0, availableStock: stock,
      }];
    });
  };

  const updateQty = (id: string, qty: number) => {
    setCart((prev) => prev.map((i) => {
      if (i.productId !== id) return i;
      if (qty < 1) qty = 1;
      if (qty > i.availableStock) {
        toast.warning('Stock limit', `Only ${i.availableStock} available`);
        qty = i.availableStock;
      }
      return { ...i, quantity: qty };
    }));
  };

  const removeItem = (id: string) => setCart((prev) => prev.filter((i) => i.productId !== id));

  // ===== Totals =====
  const totals = useMemo(() => {
    const subtotal = cart.reduce((s, i) => s + i.quantity * i.unitPrice - i.discount, 0);
    const grand = subtotal - discount + otherCharges;
    const paid = paymentCash + paymentBank + paymentCard;
    const due = Math.max(grand - paid, 0);
    return { subtotal, grand, paid, due };
  }, [cart, discount, otherCharges, paymentCash, paymentBank, paymentCard]);

  // ===== Select customer =====
  const selectCustomer = (c: any) => {
    setSelectedCustomer(c);
    setCustomerId(c.id);
    setCustomerSearch('');
    setShowCustomerSuggestions(false);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerId('');
    setCustomerSearch('');
    setShowCustomerSuggestions(false);
  };

  // ===== Complete sale =====
  const completeSale = async () => {
    if (cart.length === 0) return toast.warning('Cart empty');
    if (totals.grand <= 0) return toast.warning('Invalid total');
    if (totals.paid > totals.grand + 0.01) return toast.error('Payment exceeds total');
    if (totals.due > 0 && !customerId) return toast.warning('Credit sale needs customer');

    setSaving(true);
    try {
      const payments: any[] = [];
      if (paymentCash > 0) payments.push({ method: 'CASH', amount: paymentCash });
      if (paymentBank > 0) payments.push({ method: 'BANK', amount: paymentBank });
      if (paymentCard > 0) payments.push({ method: 'CARD', amount: paymentCard });
      if (totals.due > 0) payments.push({ method: 'CREDIT', amount: totals.due });
      if (payments.length === 0) payments.push({ method: 'CASH', amount: 0 });

      const res = await api.post('/sales', {
        customerId: customerId || null,
        items: cart.map((i) => ({
          productId: i.productId, quantity: i.quantity,
          unitPrice: i.unitPrice, discount: i.discount,
        })),
        discount, otherCharges, payments, notes,
      });
      const sale = unwrap(res);
      setReceipt(sale);
      toast.success('Sale completed', `Invoice ${sale.invoiceNumber}`);
      setCart([]); setDiscount(0); setOtherCharges(0);
      setPaymentCash(0); setPaymentBank(0); setPaymentCard(0);
      setNotes('');
      loadProducts();
      // NOTE: Customer not cleared yet — needed for receipt print
    } catch (err: any) {
      toast.error('Sale failed', err.response?.data?.message);
    } finally {
      setSaving(false);
    }
  };

  // ===== Close receipt and reset customer =====
  const closeReceipt = () => {
    setReceipt(null);
    clearCustomer();
  };

  // ===== Create new customer =====
  const createCustomer = async () => {
    try {
      const res = await api.post('/customers', newCustomer);
      const c = unwrap(res);
      selectCustomer({ ...c, totalSales: 0, received: 0, balance: 0 });
      setShowNewCustomer(false);
      setNewCustomer({ name: '', phone: '', city: '' });
      toast.success('Customer added');
    } catch (err: any) {
      toast.error('Failed to add customer', err.response?.data?.message);
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="POS / New Sale" subtitle="Fast counter sales entry" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Products */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input placeholder="Search name, model, SKU…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5" />} />
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                <option value="">All Brands</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </div>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {products.map((p) => {
              const stock = p.inventory?.quantity ?? 0;
              const disabled = stock <= 0;
              return (
                <button key={p.id} disabled={disabled} onClick={() => addToCart(p)}
                  className={cn('group text-left bg-surface-card border rounded-lg p-3 transition-all',
                    disabled ? 'opacity-50 cursor-not-allowed border-edge-base' : 'border-edge-base hover:border-brand-500 hover:shadow-md active:scale-[0.98]')}>
                  <p className="font-semibold text-sm text-ink-primary leading-tight line-clamp-2">{p.name}</p>
                  <p className="text-xs text-ink-secondary mt-0.5">{p.model || '—'}</p>
                  <p className="text-xs text-ink-muted">{p.brand?.name || ''}</p>
                  <div className="mt-2.5 flex justify-between items-center">
                    <span className="text-brand-600 dark:text-brand-400 font-bold text-sm">Rs {formatMoney(p.salePrice)}</span>
                    <span className={cn('text-xs font-medium', stock > 5 ? 'text-emerald-600' : stock > 0 ? 'text-amber-600' : 'text-red-600')}>{stock} left</span>
                  </div>
                </button>
              );
            })}
            {products.length === 0 && <div className="col-span-full"><Empty title="No products found" description="Try adjusting filters" icon={<ShoppingCart className="w-6 h-6" />} /></div>}
          </div>
        </div>

        {/* Cart side */}
        <div className="space-y-4">
          {/* ============ CUSTOMER SELECTOR ============ */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-ink-primary">Customer</h3>
              {selectedCustomer ? (
                <button onClick={clearCustomer} className="text-xs text-danger hover:underline">
                  Change
                </button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setShowNewCustomer(true)} icon={<UserPlus className="w-3.5 h-3.5" />}>
                  New
                </Button>
              )}
            </div>

            {selectedCustomer ? (
              <div className="p-3 rounded-md border bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
                    {selectedCustomer.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 truncate">
                      {selectedCustomer.name}
                    </p>
                    {selectedCustomer.phone && (
                      <p className="text-xs text-blue-700 dark:text-blue-300">{selectedCustomer.phone}</p>
                    )}
                    {selectedCustomer.balance > 0 && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 font-medium">
                        Outstanding: Rs {formatMoney(selectedCustomer.balance)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative" ref={customerBoxRef}>
                <Input
                  placeholder="Search customer by name or phone…"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerSuggestions(true);
                  }}
                  onFocus={() => setShowCustomerSuggestions(true)}
                  leftIcon={<Search className="w-3.5 h-3.5" />}
                />

                {showCustomerSuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-surface-card border border-edge-base rounded-md shadow-lg z-20 max-h-72 overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedCustomer({ id: '', name: 'Walk-in Customer', phone: null });
                        setCustomerId('');
                        setShowCustomerSuggestions(false);
                        setCustomerSearch('');
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-surface-hover border-b border-edge-light flex items-center gap-2.5"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Walk-in Customer</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">No account · Cash sale</p>
                      </div>
                    </button>

                    {customers.length === 0 && customerSearch && (
                      <div className="px-3 py-4 text-center text-xs text-gray-500 dark:text-gray-400">
                        No customer found for "{customerSearch}"
                      </div>
                    )}

                    {customers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => selectCustomer(c)}
                        className="w-full text-left px-3 py-2.5 hover:bg-surface-hover border-b border-edge-light flex items-center gap-2.5"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-semibold text-xs flex-shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {c.phone || 'No phone'}
                            {c.balance > 0 && <span className="text-amber-700 dark:text-amber-400 font-medium"> · Due: Rs {formatMoney(c.balance)}</span>}
                          </p>
                        </div>
                      </button>
                    ))}

                    <button
                      onClick={() => { setShowNewCustomer(true); setShowCustomerSuggestions(false); }}
                      className="w-full text-left px-3 py-2.5 hover:bg-surface-hover flex items-center gap-2.5 text-brand-600 dark:text-brand-400"
                    >
                      <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Add New Customer</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Quick add and continue sale</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* ============ CART ============ */}
          <Card padding="none">
            <div className="flex items-center justify-between p-4 border-b border-edge-base">
              <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" strokeWidth={1.75} />
                Cart
                {cart.length > 0 && <Badge variant="blue">{cart.reduce((s, i) => s + i.quantity, 0)} items</Badge>}
              </h3>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs text-danger hover:underline">Clear</button>
              )}
            </div>
            {cart.length === 0 ? <Empty title="No items in cart" description="Click products to add" /> : (
              <div className="max-h-72 overflow-y-auto divide-y divide-edge-light">
                {cart.map((i) => (
                  <div key={i.productId} className="p-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink-primary truncate">{i.name}</p>
                        <p className="text-xs text-ink-secondary">{i.model || '—'} · Rs {formatMoney(i.unitPrice)}</p>
                      </div>
                      <button onClick={() => removeItem(i.productId)} className="text-ink-muted hover:text-danger p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <div className="flex items-center gap-1 bg-surface-hover rounded-md p-0.5">
                        <button onClick={() => updateQty(i.productId, i.quantity - 1)} className="w-6 h-6 rounded hover:bg-surface-card flex items-center justify-center">
                          <Minus className="w-3 h-3" />
                        </button>
                        <input type="number" value={i.quantity} onChange={(e) => updateQty(i.productId, parseInt(e.target.value) || 1)}
                          className="w-10 text-center bg-transparent text-sm font-medium focus:outline-none" />
                        <button onClick={() => updateQty(i.productId, i.quantity + 1)} className="w-6 h-6 rounded hover:bg-surface-card flex items-center justify-center">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-semibold text-sm text-ink-primary">Rs {formatMoney(i.quantity * i.unitPrice - i.discount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ============ SUMMARY ============ */}
          <Card>
            <h3 className="text-sm font-semibold text-ink-primary mb-3">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-secondary">Subtotal</span>
                <span className="text-ink-primary">Rs {formatMoney(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-secondary">Discount</span>
                <input type="number" value={discount || ''} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-24 bg-surface-input border border-edge-base rounded px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-secondary">Other Charges</span>
                <input type="number" value={otherCharges || ''} onChange={(e) => setOtherCharges(parseFloat(e.target.value) || 0)}
                  className="w-24 bg-surface-input border border-edge-base rounded px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <div className="flex justify-between pt-2 border-t border-edge-base text-base font-bold">
                <span className="text-ink-primary">Grand Total</span>
                <span className="text-brand-600 dark:text-brand-400">Rs {formatMoney(totals.grand)}</span>
              </div>
            </div>
          </Card>

          {/* ============ PAYMENT ============ */}
          <Card>
            <h3 className="text-sm font-semibold text-ink-primary mb-3">Payment</h3>
            <div className="space-y-2">
              {[
                { label: 'Cash', icon: Banknote, value: paymentCash, set: setPaymentCash },
                { label: 'Bank', icon: Building2, value: paymentBank, set: setPaymentBank },
                { label: 'Card', icon: CreditCard, value: paymentCard, set: setPaymentCard },
              ].map(({ label, icon: Icon, value, set }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-ink-secondary">
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </span>
                  <input type="number" value={value || ''} onChange={(e) => set(parseFloat(e.target.value) || 0)}
                    className="w-28 bg-surface-input border border-edge-base rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-brand-500" />
                </div>
              ))}
              {totals.due > 0 && (
                <div className="flex justify-between items-center text-sm pt-2 border-t border-edge-base">
                  <span className="text-amber-600 font-medium">Credit (Due)</span>
                  <span className="text-amber-600 font-semibold">Rs {formatMoney(totals.due)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm pt-2 border-t border-edge-base">
                <span className="text-ink-secondary">Paid</span>
                <span className="text-ink-primary font-medium">Rs {formatMoney(totals.paid)}</span>
              </div>
            </div>
            <textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full mt-3 bg-surface-input border border-edge-base rounded-md px-2.5 py-2 text-xs text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-brand-500"
              rows={2} />
            <Button className="w-full mt-3" size="lg" onClick={completeSale} loading={saving}
              disabled={cart.length === 0} icon={<CheckCircle2 className="w-4 h-4" />}>
              Complete Sale
            </Button>
          </Card>
        </div>
      </div>

      {/* ============ NEW CUSTOMER MODAL ============ */}
      <Modal open={showNewCustomer} onClose={() => setShowNewCustomer(false)}
        title="Add New Customer" size="sm"
        footer={<>
          <Button variant="outline" onClick={() => setShowNewCustomer(false)}>Cancel</Button>
          <Button onClick={createCustomer} disabled={!newCustomer.name}>Create & Select</Button>
        </>}>
        <div className="space-y-3">
          <Input label="Name *" value={newCustomer.name}
            onChange={(e: any) => setNewCustomer({ ...newCustomer, name: e.target.value })}
            autoFocus />
          <Input label="Phone" value={newCustomer.phone}
            onChange={(e: any) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
          <Input label="City" value={newCustomer.city}
            onChange={(e: any) => setNewCustomer({ ...newCustomer, city: e.target.value })} />
        </div>
      </Modal>

      {/* ============ RECEIPT MODAL ============ */}
      <Modal open={!!receipt} onClose={closeReceipt} title="Sale Completed" size="sm"
        footer={<>
          <Button variant="outline" onClick={() => printElement(receiptRef.current)} icon={<Printer className="w-3.5 h-3.5" />}>
            Print Receipt
          </Button>
          <Button onClick={closeReceipt}>New Sale</Button>
        </>}>
        {receipt && (
          <div className="space-y-3">
            <div className="text-center py-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-sm text-ink-secondary">Sale recorded successfully</p>
              <p className="font-mono text-lg font-bold text-ink-primary mt-1">{receipt.invoiceNumber}</p>
            </div>
            <div className="text-sm space-y-1.5 border-t border-edge-base pt-3">
              <div className="flex justify-between"><span className="text-ink-secondary">Total</span><span className="font-medium">Rs {formatMoney(receipt.total)}</span></div>
              <div className="flex justify-between"><span className="text-ink-secondary">Paid</span><span className="font-medium text-emerald-600">Rs {formatMoney(receipt.paid)}</span></div>
              {receipt.due > 0 && <div className="flex justify-between"><span className="text-ink-secondary">Due</span><span className="font-medium text-amber-600">Rs {formatMoney(receipt.due)}</span></div>}
            </div>
          </div>
        )}
      </Modal>

      {/* ============ HIDDEN RECEIPT FOR THERMAL PRINT ============ */}
      <div className="fixed -left-[9999px] top-0">
        {receipt && settings && (
          <ReceiptPrint
            ref={receiptRef}
            data={{
              outletName: settings.outletName || 'GFC Fans Outlet',
              outletAddress: settings.address,
              outletPhone: settings.phone,
              invoiceNumber: receipt.invoiceNumber,
              saleDate: receipt.saleDate,
              cashier: receipt.user?.fullName,
              customer: receipt.customer?.name || selectedCustomer?.name,
              customerPhone: receipt.customer?.phone || selectedCustomer?.phone,
              items: (receipt.items || cart).map((i: any) => ({
                name: i.product?.name || i.name,
                model: i.product?.model || i.model,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                discount: i.discount,
                lineTotal: i.lineTotal || (i.quantity * i.unitPrice - i.discount),
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