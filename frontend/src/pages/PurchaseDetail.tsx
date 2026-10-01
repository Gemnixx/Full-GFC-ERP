import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Factory, CreditCard, Calendar } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, Table, Badge, Button, Loader } from '../components/ui';
import { formatMoney, formatDateTime } from '../lib/format';
import type { Column } from '../components/ui';

export default function PurchaseDetail() {
  const { id } = useParams();
  const [purchase, setPurchase] = useState<any>(null);

  useEffect(() => { api.get(`/purchases/${id}`).then((r) => setPurchase(unwrap(r))); }, [id]);

  if (!purchase) return <div className="p-6"><Loader /></div>;

  const columns: Column<any>[] = [
    { key: 'product', header: 'Product', render: (r) => (
      <div>
        <p className="font-medium text-ink-primary">{r.product.name}</p>
        <p className="text-xs text-ink-secondary">{r.product.model || '—'}</p>
      </div>
    )},
    { key: 'qty', header: 'Qty', align: 'center', render: (r) => r.quantity },
    { key: 'cost', header: 'Cost', align: 'right', render: (r) => `Rs ${formatMoney(r.purchasePrice)}` },
    { key: 'disc', header: 'Item Discount', align: 'right', render: (r) => `Rs ${formatMoney(r.discount)}` },
    { key: 'total', header: 'Total', align: 'right', render: (r) => <span className="font-medium">Rs {formatMoney(r.lineTotal)}</span> },
  ];

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <PageHeader title={`Purchase ${purchase.purchaseNumber}`} subtitle={formatDateTime(purchase.purchaseDate)}
        actions={<Link to="/purchases"><Button variant="outline" icon={<ArrowLeft className="w-3.5 h-3.5" />}>Back</Button></Link>} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card><div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center flex-shrink-0"><Factory className="w-4 h-4 text-brand-600 dark:text-brand-400" /></div>
          <div><p className="text-xs text-ink-secondary">Supplier</p><p className="text-sm font-medium text-ink-primary">{purchase.supplier.name}</p>{purchase.supplier.phone && <p className="text-xs text-ink-secondary">{purchase.supplier.phone}</p>}</div>
        </div></Card>
        <Card><div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0"><CreditCard className="w-4 h-4 text-emerald-600" /></div>
          <div><p className="text-xs text-ink-secondary">Payment</p><p className="text-sm font-medium text-ink-primary">{purchase.paymentMethod}</p><p className="text-xs text-ink-secondary">Recorded by: {purchase.user?.fullName}</p></div>
        </div></Card>
        <Card><div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center flex-shrink-0"><Calendar className="w-4 h-4 text-amber-600" /></div>
          <div><p className="text-xs text-ink-secondary">Status</p><Badge variant="green" dot>{purchase.status}</Badge>
            {purchase.supplierInvoiceNo && <p className="text-xs text-ink-secondary mt-1">Ref: {purchase.supplierInvoiceNo}</p>}
          </div>
        </div></Card>
      </div>

      <Card padding="none" className="mb-4">
        <Table columns={columns} data={purchase.items} />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <Card.Header title="Payments" />
          {purchase.payments.length === 0 ? <p className="text-sm text-ink-muted">No payments</p> : (
            <div className="space-y-2">{purchase.payments.map((p: any) => (
              <div key={p.id} className="flex justify-between items-center p-2 bg-surface-hover rounded">
                <Badge variant="blue">{p.method}</Badge><span className="font-medium">Rs {formatMoney(p.amount)}</span>
              </div>
            ))}</div>
          )}
        </Card>
        <Card>
          <Card.Header title="Summary" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-ink-secondary">Subtotal</span><span>Rs {formatMoney(purchase.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-ink-secondary">Discount</span><span>− Rs {formatMoney(purchase.discount)}</span></div>
            <div className="flex justify-between"><span className="text-ink-secondary">Other Charges</span><span>+ Rs {formatMoney(purchase.otherCharges)}</span></div>
            <div className="flex justify-between pt-2 border-t border-edge-base text-base font-bold"><span>Total</span><span className="text-brand-600 dark:text-brand-400">Rs {formatMoney(purchase.total)}</span></div>
            <div className="flex justify-between text-emerald-600"><span>Paid</span><span>Rs {formatMoney(purchase.paid)}</span></div>
            <div className="flex justify-between text-amber-600"><span>Due</span><span>Rs {formatMoney(purchase.due)}</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
}