import { useEffect, useState } from 'react';
import { Plus, Undo2, Download } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, Card, Table, Badge, Pagination, Empty, Modal, Input, Select, Tabs } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { formatMoney, formatDate } from '../lib/format';
import { exportCSV, csvFilename } from '../lib/csv';
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
    api.get('/returns', { params }).then((r) => setData(unwrap(r))).finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter, page]);

  const handleExport = () => {
    exportCSV(data.items, [
      { key: 'returnNumber', header: 'Return #' },
      { key: 'reference', header: 'Reference' },
      { key: 'party', header: 'Party' },
      { key: 'amount', header: 'Amount' },
      { key: 'type', header: 'Type' },
      { key: 'status', header: 'Status' },
      { key: 'date', header: 'Date', value: (r: any) => formatDate(r.date) },
    ], csvFilename('returns'));
    toast.success('Exported');
  };

  const columns: Column<any>[] = [
    { key: 'rn', header: 'Return #', render: (r) => <span className="font-mono text-xs">{r.returnNumber}</span> },
    { key: 'ref', header: 'Reference', render: (r) => <span className="font-mono text-xs text-ink-secondary">{r.reference}</span> },
    { key: 'party', header: 'Party', render: (r) => r.party },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className="font-medium">Rs {formatMoney(r.amount)}</span> },
    { key: 'type', header: 'Type', render: (r) => <Badge variant={r.type === 'SALES' ? 'amber' : 'blue'}>{r.type}</Badge> },
    { key: 'status', header: 'Status', render: (r) => <Badge variant="green" dot>{r.status}</Badge> },
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Returns" subtitle="Sales and purchase returns"
        actions={<>
          <Button variant="outline" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExport}>Export</Button>
          <Button variant="outline" onClick={() => setShowNew('PURCHASE')} icon={<Plus className="w-3.5 h-3.5" />}>Purchase Return</Button>
          <Button onClick={() => setShowNew('SALES')} icon={<Undo2 className="w-3.5 h-3.5" />}>Sales Return</Button>
        </>} />

      <Card padding="none" className="mb-4">
        <div className="p-4">
          <Tabs value={filter} onChange={(v) => { setFilter(v as ReturnFilter); setPage(1); }}
            options={[
              { value: 'all', label: 'All Returns' },
              { value: 'SALES', label: 'Sales Returns' },
              { value: 'PURCHASE', label: 'Purchase Returns' },
            ]} />
        </div>
      </Card>

      <Card padding="none">
        <Table columns={columns} data={data.items} loading={loading} empty={<Empty title="No returns yet" />} />
        {data.total > 20 && <Pagination page={page} total={data.total} pageSize={20} onChange={setPage} />}
      </Card>

      {showNew === 'SALES' && (
        <SalesReturnModal onClose={() => setShowNew(null)} onSaved={() => { setShowNew(null); load(); toast.success('Sales return created'); }} />
      )}
      {showNew === 'PURCHASE' && (
        <PurchaseReturnModal onClose={() => setShowNew(null)} onSaved={() => { setShowNew(null); load(); toast.success('Purchase return created'); }} />
      )}
    </div>
  );
}

function SalesReturnModal({ onClose, onSaved }: any) {
  const [sales, setSales] = useState<any[]>([]);
  const [saleId, setSaleId] = useState('');
  const [sale, setSale] = useState<any>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'BANK' | 'CARD' | 'CREDIT'>('CASH');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get('/sales', { params: { pageSize: 100 } }).then((r) => setSales(unwrap(r).items));
  }, []);

  useEffect(() => {
    if (saleId) api.get(`/sales/${saleId}`).then((r) => { setSale(unwrap(r)); setQty({}); });
  }, [saleId]);

  const submit = async () => {
    if (!sale) return;
    const items = Object.entries(qty).filter(([_, q]) => q > 0).map(([saleItemId, quantity]) => ({ saleItemId, quantity }));
    if (items.length === 0) return toast.warning('Select at least one item to return');
    setSaving(true);
    try {
      await api.post('/returns/sales', { saleId: sale.id, reason, refundMethod, items });
      onSaved();
    } catch (e: any) { toast.error('Failed', e.response?.data?.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose} title="Sales Return" size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving}>Create Return</Button></>}>
      <div className="space-y-4">
        <Select label="Original Invoice" value={saleId} onChange={(e) => setSaleId(e.target.value)}>
          <option value="">Select invoice</option>
          {sales.map((s) => <option key={s.id} value={s.id}>{s.invoiceNumber} — {s.customer?.name || 'Walk-in'} — Rs {formatMoney(s.total)}</option>)}
        </Select>

        {sale && (
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
                      <p className="text-xs text-ink-secondary">{it.product.model || '—'}</p>
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
        )}

        <div className="grid grid-cols-2 gap-4">
          <Select label="Refund Method" value={refundMethod} onChange={(e) => setRefundMethod(e.target.value as any)}>
            <option value="CASH">Cash Refund</option>
            <option value="BANK">Bank Refund</option>
            <option value="CARD">Card Refund</option>
            <option value="CREDIT">Credit Note</option>
          </Select>
          <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

function PurchaseReturnModal({ onClose, onSaved }: any) {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [purchaseId, setPurchaseId] = useState('');
  const [purchase, setPurchase] = useState<any>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'BANK' | 'CREDIT'>('CASH');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get('/purchases', { params: { pageSize: 100 } }).then((r) => setPurchases(unwrap(r).items));
  }, []);

  useEffect(() => {
    if (purchaseId) api.get(`/purchases/${purchaseId}`).then((r) => { setPurchase(unwrap(r)); setQty({}); });
  }, [purchaseId]);

  const submit = async () => {
    if (!purchase) return;
    const items = Object.entries(qty).filter(([_, q]) => q > 0).map(([purchaseItemId, quantity]) => ({ purchaseItemId, quantity }));
    if (items.length === 0) return toast.warning('Select at least one item');
    setSaving(true);
    try {
      await api.post('/returns/purchase', { purchaseId: purchase.id, reason, refundMethod, items });
      onSaved();
    } catch (e: any) { toast.error('Failed', e.response?.data?.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose} title="Purchase Return" size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving}>Create Return</Button></>}>
      <div className="space-y-4">
        <Select label="Original Purchase" value={purchaseId} onChange={(e) => setPurchaseId(e.target.value)}>
          <option value="">Select purchase</option>
          {purchases.map((p) => <option key={p.id} value={p.id}>{p.purchaseNumber} — {p.supplier.name} — Rs {formatMoney(p.total)}</option>)}
        </Select>

        {purchase && (
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
                      <p className="text-xs text-ink-secondary">{it.product.model || '—'}</p>
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
        )}

        <div className="grid grid-cols-2 gap-4">
          <Select label="Refund Method" value={refundMethod} onChange={(e) => setRefundMethod(e.target.value as any)}>
            <option value="CASH">Cash Refund</option>
            <option value="BANK">Bank Refund</option>
            <option value="CREDIT">Credit</option>
          </Select>
          <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}