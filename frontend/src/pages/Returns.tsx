import { useEffect, useState, useMemo } from 'react';
import { Plus, Undo2, Download } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Button, Card, Table, Badge, Pagination, Empty, Modal, Input, Select, Tabs,
} from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { formatMoney, formatDate } from '../lib/format';
import { exportCSV, csvFilename } from '../lib/csv';
import { cn } from '../lib/cn';
import type { Column } from '../components/ui';

type ReturnFilter = 'all' | 'SALES' | 'PURCHASE';

export default function Returns() {
  const toast = useToast();
  const [data, setData] = useState<any>({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ReturnFilter>('all');
  const [showNew, setShowNew] = useState<'SALES' | 'PURCHASE' | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const params: any = { page, pageSize: 20 };
    if (filter !== 'all') params.type = filter;
    api.get('/returns', { params })
      .then((r) => setData(unwrap(r)))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter, page]);

  const handleExport = () => {
    // Flatten: har return ka har item alag row
    const rows: any[] = [];
    data.items.forEach((r: any) => {
      if (!r.items || r.items.length === 0) {
        rows.push({
          returnNumber: r.returnNumber,
          reference: r.reference,
          party: r.party,
          type: r.type,
          productName: '—',
          model: '—',
          size: '—',
          color: '—',
          quantity: 0,
          unitPrice: 0,
          lineTotal: r.amount,
          date: formatDate(r.date),
        });
      } else {
        r.items.forEach((it: any) => {
          rows.push({
            returnNumber: r.returnNumber,
            reference: r.reference,
            party: r.party,
            type: r.type,
            productName: it.productName || '—',
            model: it.model || '—',
            size: it.size || '—',
            color: it.color || '—',
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            lineTotal: it.lineTotal,
            date: formatDate(r.date),
          });
        });
      }
    });

    exportCSV(rows, [
      { key: 'returnNumber', header: 'Return #' },
      { key: 'reference', header: 'Reference' },
      { key: 'party', header: 'Party' },
      { key: 'type', header: 'Type' },
      { key: 'productName', header: 'Product' },
      { key: 'model', header: 'Model' },
      { key: 'size', header: 'Size' },
      { key: 'color', header: 'Color' },
      { key: 'quantity', header: 'Qty' },
      { key: 'unitPrice', header: 'Unit Price' },
      { key: 'lineTotal', header: 'Line Total' },
      { key: 'date', header: 'Date' },
    ], csvFilename('returns'));
    toast.success('Exported');
  };

  // ============ Color swatch helper ============
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

  // ============ COLUMNS ============
  const columns: Column<any>[] = [
    // Return #
    {
      key: 'rn',
      header: 'Return #',
      render: (r) => (
        <span className="font-mono text-xs font-medium text-ink-primary whitespace-nowrap">
          {r.returnNumber}
        </span>
      ),
    },

    // Reference (Invoice/Purchase #)
    {
      key: 'ref',
      header: 'Reference',
      render: (r) => (
        <span className="font-mono text-xs text-ink-secondary whitespace-nowrap">
          {r.reference}
        </span>
      ),
    },

    // Party (Customer/Supplier)
    {
      key: 'party',
      header: 'Party',
      render: (r) => (
        <span className="text-sm text-ink-primary whitespace-nowrap">
          {r.party}
        </span>
      ),
    },

    // Type
    {
      key: 'type',
      header: 'Type',
      render: (r) => (
        <Badge variant={r.type === 'SALES' ? 'amber' : 'blue'}>
          <span className="whitespace-nowrap">{r.type}</span>
        </Badge>
      ),
    },

    // ============ ITEMS BREAKDOWN 👈 NAYA ============
    {
      key: 'items',
      header: 'Returned Items · Model · Size · Color · Qty',
      render: (r) => {
        const items = r.items || [];
        if (items.length === 0) {
          return <span className="text-xs text-ink-muted italic">No items</span>;
        }
        return (
          <div className="space-y-1.5 min-w-[280px]">
            {items.map((it: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-xs whitespace-nowrap"
              >
                {/* Product Name */}
                <span className="font-medium text-ink-primary max-w-[140px] truncate">
                  {it.productName || '—'}
                </span>

                {/* Model */}
                {it.model && (
                  <span className="text-ink-secondary">· {it.model}</span>
                )}

                {/* Size */}
                {it.size && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 font-medium">
                    Size {it.size}
                  </span>
                )}

                {/* Color */}
                {it.color && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border bg-surface-hover border-edge-base">
                    <span
                      className={cn(
                        'w-2.5 h-2.5 rounded-full border border-edge-base flex-shrink-0',
                        colorSwatch(it.color),
                      )}
                    />
                    {it.color}
                  </span>
                )}

                {/* Quantity — bold */}
                <span className="font-bold text-rose-600">
                  × {it.quantity}
                </span>

                {/* Line total */}
                <span className="text-ink-muted ml-auto">
                  Rs {formatMoney(it.lineTotal)}
                </span>
              </div>
            ))}
          </div>
        );
      },
    },

    // Total Amount
    {
      key: 'amount',
      header: 'Total',
      align: 'right',
      render: (r) => (
        <span className="font-semibold text-rose-600 whitespace-nowrap">
          Rs {formatMoney(r.amount)}
        </span>
      ),
    },

    // Refund Method
    {
      key: 'refund',
      header: 'Refund',
      render: (r) => (
        <Badge variant={
          r.refundMethod === 'CREDIT' ? 'amber' :
          r.refundMethod === 'CASH' ? 'green' :
          r.refundMethod === 'BANK' ? 'blue' : 'gray'
        }>
          <span className="whitespace-nowrap">{r.refundMethod}</span>
        </Badge>
      ),
    },

    // Status
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <Badge variant="green" dot>
          <span className="whitespace-nowrap">{r.status}</span>
        </Badge>
      ),
    },

    // Date
    {
      key: 'date',
      header: 'Date',
      render: (r) => (
        <span className="text-xs text-ink-secondary whitespace-nowrap">
          {formatDate(r.date)}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-[1800px] mx-auto">
      <PageHeader
        title="Returns"
        subtitle="Sales and purchase returns with item details"
        actions={
          <>
            <Button variant="outline" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExport}>
              Export
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowNew('PURCHASE')}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Purchase Return
            </Button>
            <Button onClick={() => setShowNew('SALES')} icon={<Undo2 className="w-3.5 h-3.5" />}>
              Sales Return
            </Button>
          </>
        }
      />

      <Card padding="none" className="mb-4">
        <div className="p-4">
          <Tabs
            value={filter}
            onChange={(v) => { setFilter(v as ReturnFilter); setPage(1); }}
            options={[
              { value: 'all', label: 'All Returns' },
              { value: 'SALES', label: 'Sales Returns' },
              { value: 'PURCHASE', label: 'Purchase Returns' },
            ]}
          />
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table
            columns={columns}
            data={data.items}
            loading={loading}
            empty={<Empty title="No returns yet" />}
          />
        </div>
        {data.total > 20 && (
          <Pagination page={page} total={data.total} pageSize={20} onChange={setPage} />
        )}
      </Card>

      {showNew === 'SALES' && (
        <SalesReturnModal
          onClose={() => setShowNew(null)}
          onSaved={() => { setShowNew(null); load(); toast.success('Sales return created'); }}
        />
      )}
      {showNew === 'PURCHASE' && (
        <PurchaseReturnModal
          onClose={() => setShowNew(null)}
          onSaved={() => { setShowNew(null); load(); toast.success('Purchase return created'); }}
        />
      )}
    </div>
  );
}

// ============================================================
// SALES RETURN MODAL (same as before — full version)
// ============================================================
function SalesReturnModal({ onClose, onSaved }: any) {
  const [sales, setSales] = useState<any[]>([]);
  const [saleId, setSaleId] = useState('');
  const [sale, setSale] = useState<any>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'BANK' | 'CARD' | 'CREDIT'>('CREDIT');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get('/sales', { params: { pageSize: 100 } }).then((r) => setSales(unwrap(r).items));
  }, []);

  useEffect(() => {
    if (saleId) api.get(`/sales/${saleId}`).then((r) => { setSale(unwrap(r)); setQty({}); });
  }, [saleId]);

  const returnTotal = useMemo(() => {
    if (!sale) return 0;
    return Object.entries(qty).reduce((sum, [saleItemId, q]) => {
      const item = sale.items.find((it: any) => it.id === saleItemId);
      return sum + (item ? item.unitPrice * (q || 0) : 0);
    }, 0);
  }, [qty, sale]);

  const submit = async () => {
    if (!sale) return;
    const items = Object.entries(qty)
      .filter(([_, q]) => q > 0)
      .map(([saleItemId, quantity]) => ({ saleItemId, quantity }));
    if (items.length === 0) return toast.warning('Select at least one item to return');
    setSaving(true);
    try {
      await api.post('/returns/sales', { saleId: sale.id, reason, refundMethod, items });
      onSaved();
    } catch (e: any) {
      toast.error('Failed', e.response?.data?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Sales Return" size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving}>Create Return</Button></>}>
      <div className="space-y-4">
        <Select label="Original Invoice" value={saleId} onChange={(e) => setSaleId(e.target.value)}>
          <option value="">Select invoice</option>
          {sales.map((s) => (
            <option key={s.id} value={s.id}>
              {s.invoiceNumber} — {s.customer?.name || 'Walk-in'} — Rs {formatMoney(s.total)}
              {s.due > 0 ? ` (Due: Rs ${formatMoney(s.due)})` : ' (Paid)'}
            </option>
          ))}
        </Select>

        {sale && (
          <>
            <div className="border border-edge-base rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-hover">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-ink-secondary">Product</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-ink-secondary w-24">Sold</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-ink-secondary w-24">Return Qty</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-ink-secondary w-28">Unit Price</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((it: any) => (
                    <tr key={it.id} className="border-t border-edge-light">
                      <td className="px-3 py-2">
                        <p className="font-medium">{it.product.name}</p>
                        <p className="text-xs text-ink-secondary">
                          {it.product.model || '—'}
                          {it.variant ? ` · ${it.variant.size || ''} ${it.variant.color || ''}` : ''}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-right">{it.quantity}</td>
                      <td className="px-3 py-2 text-right">
                        <input type="number" max={it.quantity} min={0}
                          value={qty[it.id] || ''}
                          onChange={(e) => setQty({ ...qty, [it.id]: Math.min(parseInt(e.target.value) || 0, it.quantity) })}
                          className="w-20 bg-surface-input border border-edge-base rounded px-2 py-1 text-sm text-right" />
                      </td>
                      <td className="px-3 py-2 text-right">Rs {formatMoney(it.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {returnTotal > 0 && (
              <div className="border border-edge-base rounded-lg p-4 bg-surface-hover space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-secondary">Return Amount</span>
                  <span className="font-bold text-brand-600">Rs {formatMoney(returnTotal)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-edge-base">
                  <span className="text-ink-secondary">Sale Total</span>
                  <span className="font-medium">Rs {formatMoney(sale.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-secondary">Sale Paid</span>
                  <span className="font-medium text-emerald-600">Rs {formatMoney(sale.paid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-secondary">Sale Due</span>
                  <span className="font-medium text-amber-600">Rs {formatMoney(sale.due)}</span>
                </div>
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Select label="Refund Method" value={refundMethod} onChange={(e) => setRefundMethod(e.target.value as any)}>
            <option value="CREDIT">Credit Note (Adjust against due)</option>
            <option value="CASH">Cash Refund</option>
            <option value="BANK">Bank Refund</option>
            <option value="CARD">Card Refund</option>
          </Select>
          <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>

        <p className="text-xs text-ink-muted bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded p-2.5 leading-relaxed">
          💡 <strong>Tip:</strong> Agar customer ne paisa nahi diya, <strong>Credit Note</strong> choose karo — due kam ho jayega. Agar paisa de diya tha, <strong>Cash/Bank Refund</strong> choose karo.
        </p>
      </div>
    </Modal>
  );
}

// ============================================================
// PURCHASE RETURN MODAL (same as before)
// ============================================================
function PurchaseReturnModal({ onClose, onSaved }: any) {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [purchaseId, setPurchaseId] = useState('');
  const [purchase, setPurchase] = useState<any>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'BANK' | 'CREDIT'>('CREDIT');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get('/purchases', { params: { pageSize: 100 } }).then((r) => setPurchases(unwrap(r).items));
  }, []);

  useEffect(() => {
    if (purchaseId) api.get(`/purchases/${purchaseId}`).then((r) => { setPurchase(unwrap(r)); setQty({}); });
  }, [purchaseId]);

  const returnTotal = useMemo(() => {
    if (!purchase) return 0;
    return Object.entries(qty).reduce((sum, [purchaseItemId, q]) => {
      const item = purchase.items.find((it: any) => it.id === purchaseItemId);
      return sum + (item ? item.purchasePrice * (q || 0) : 0);
    }, 0);
  }, [qty, purchase]);

  const submit = async () => {
    if (!purchase) return;
    const items = Object.entries(qty)
      .filter(([_, q]) => q > 0)
      .map(([purchaseItemId, quantity]) => ({ purchaseItemId, quantity }));
    if (items.length === 0) return toast.warning('Select at least one item');
    setSaving(true);
    try {
      await api.post('/returns/purchase', { purchaseId: purchase.id, reason, refundMethod, items });
      onSaved();
    } catch (e: any) {
      toast.error('Failed', e.response?.data?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Purchase Return" size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving}>Create Return</Button></>}>
      <div className="space-y-4">
        <Select label="Original Purchase" value={purchaseId} onChange={(e) => setPurchaseId(e.target.value)}>
          <option value="">Select purchase</option>
          {purchases.map((p) => (
            <option key={p.id} value={p.id}>
              {p.purchaseNumber} — {p.supplier?.name || 'No supplier'} — Rs {formatMoney(p.total)}
              {p.due > 0 ? ` (Due: Rs ${formatMoney(p.due)})` : ''}
            </option>
          ))}
        </Select>

        {purchase && (
          <>
            <div className="border border-edge-base rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-hover">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-ink-secondary">Product</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-ink-secondary w-24">Purchased</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-ink-secondary w-24">Return Qty</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-ink-secondary w-28">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {purchase.items.map((it: any) => (
                    <tr key={it.id} className="border-t border-edge-light">
                      <td className="px-3 py-2">
                        <p className="font-medium">{it.product.name}</p>
                        <p className="text-xs text-ink-secondary">
                          {it.product.model || '—'}
                          {it.variant ? ` · ${it.variant.size || ''} ${it.variant.color || ''}` : ''}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-right">{it.quantity}</td>
                      <td className="px-3 py-2 text-right">
                        <input type="number" max={it.quantity} min={0}
                          value={qty[it.id] || ''}
                          onChange={(e) => setQty({ ...qty, [it.id]: Math.min(parseInt(e.target.value) || 0, it.quantity) })}
                          className="w-20 bg-surface-input border border-edge-base rounded px-2 py-1 text-sm text-right" />
                      </td>
                      <td className="px-3 py-2 text-right">Rs {formatMoney(it.purchasePrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {returnTotal > 0 && (
              <div className="border border-edge-base rounded-lg p-4 bg-surface-hover space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-secondary">Return Amount</span>
                  <span className="font-bold text-brand-600">Rs {formatMoney(returnTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-secondary">Purchase Due</span>
                  <span className="font-medium text-amber-600">Rs {formatMoney(purchase.due)}</span>
                </div>
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Select label="Refund Method" value={refundMethod} onChange={(e) => setRefundMethod(e.target.value as any)}>
            <option value="CREDIT">Credit Note (Adjust against due)</option>
            <option value="CASH">Cash Refund</option>
            <option value="BANK">Bank Refund</option>
          </Select>
          <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}