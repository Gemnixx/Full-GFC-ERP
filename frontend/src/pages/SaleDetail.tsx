import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Printer, ArrowLeft, User, CreditCard, Calendar } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, Table, Badge, Button, Loader } from '../components/ui';
import { ReceiptPrint } from '../components/print/ReceiptPrint';
import { printElement } from '../lib/print';
import { formatMoney, formatDateTime } from '../lib/format';
import type { Column } from '../components/ui';

export default function SaleDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [sale, setSale] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([api.get(`/sales/${id}`), api.get('/settings')]).then(([s, st]) => {
      setSale(unwrap(s));
      setSettings(unwrap(st));
    });
  }, [id]);

  useEffect(() => {
    if (sale && params.get('print') === '1') {
      setTimeout(() => printElement(receiptRef.current), 300);
    }
  }, [sale, params]);

  if (!sale) return <div className="p-6"><Loader /></div>;

  // ✅ Discount column hata diya
  const itemColumns: Column<any>[] = [
    { key: 'product', header: 'Product', render: (r) => (
      <div>
        <p className="font-medium text-ink-primary">{r.product.name}</p>
        <p className="text-xs text-ink-secondary">{r.product.model || '—'}</p>
      </div>
    )},
    { key: 'qty', header: 'Qty', align: 'center', render: (r) => r.quantity },
    { key: 'price', header: 'Unit Price', align: 'right', render: (r) => `Rs ${formatMoney(r.unitPrice)}` },
    { key: 'total', header: 'Line Total', align: 'right', render: (r) => <span className="font-medium">Rs {formatMoney(r.lineTotal)}</span> },
  ];

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <PageHeader title={`Invoice ${sale.invoiceNumber}`} subtitle={formatDateTime(sale.saleDate)}
        actions={<>
          <Link to="/sales"><Button variant="outline" icon={<ArrowLeft className="w-3.5 h-3.5" />}>Back</Button></Link>
          <Button icon={<Printer className="w-3.5 h-3.5" />} onClick={() => printElement(receiptRef.current)}>Print Receipt</Button>
        </>} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card><div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-brand-600 dark:text-brand-400" /></div>
          <div><p className="text-xs text-ink-secondary">Customer</p><p className="text-sm font-medium text-ink-primary">{sale.customer?.name || 'Walk-in'}</p>{sale.customer?.phone && <p className="text-xs text-ink-secondary">{sale.customer.phone}</p>}</div>
        </div></Card>
        <Card><div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0"><CreditCard className="w-4 h-4 text-emerald-600" /></div>
          <div><p className="text-xs text-ink-secondary">Payment</p><p className="text-sm font-medium text-ink-primary">{sale.paymentMethod}</p><p className="text-xs text-ink-secondary">Cashier: {sale.user?.fullName}</p></div>
        </div></Card>
        <Card><div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center flex-shrink-0"><Calendar className="w-4 h-4 text-amber-600" /></div>
          <div><p className="text-xs text-ink-secondary">Status</p><Badge variant="green" dot>{sale.status}</Badge></div>
        </div></Card>
      </div>

      <Card padding="none" className="mb-4">
        <Table columns={itemColumns} data={sale.items} />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <Card.Header title="Payments" />
          {sale.payments.length === 0 ? <p className="text-sm text-ink-muted">No payments</p> : (
            <div className="space-y-2">{sale.payments.map((p: any) => (
              <div key={p.id} className="flex justify-between items-center p-2 bg-surface-hover rounded">
                <Badge variant="blue">{p.method}</Badge><span className="font-medium">Rs {formatMoney(p.amount)}</span>
              </div>
            ))}</div>
          )}
        </Card>
        <Card>
          <Card.Header title="Summary" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-ink-secondary">Subtotal</span><span>Rs {formatMoney(sale.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-ink-secondary">Discount</span><span>− Rs {formatMoney(sale.discount)}</span></div>
            <div className="flex justify-between"><span className="text-ink-secondary">Other Charges</span><span>+ Rs {formatMoney(sale.otherCharges)}</span></div>
            <div className="flex justify-between pt-2 border-t border-edge-base text-base font-bold"><span>Total</span><span className="text-brand-600 dark:text-brand-400">Rs {formatMoney(sale.total)}</span></div>
            <div className="flex justify-between text-emerald-600"><span>Paid</span><span>Rs {formatMoney(sale.paid)}</span></div>
            <div className="flex justify-between text-amber-600"><span>Due</span><span>Rs {formatMoney(sale.due)}</span></div>
          </div>
        </Card>
      </div>

      <div className="fixed -left-[9999px] top-0">
        <ReceiptPrint ref={receiptRef} data={{
          outletName: settings?.outletName || 'GFC Fans Outlet',
          outletAddress: settings?.address, outletPhone: settings?.phone,
          invoiceNumber: sale.invoiceNumber, saleDate: sale.saleDate,
          cashier: sale.user?.fullName, customer: sale.customer?.name, customerPhone: sale.customer?.phone,
          items: sale.items.map((i: any) => ({ name: i.product.name, model: i.product.model, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount, lineTotal: i.lineTotal })),
          subtotal: sale.subtotal, discount: sale.discount, otherCharges: sale.otherCharges,
          total: sale.total, paid: sale.paid, due: sale.due,
          paymentMethod: sale.paymentMethod, footer: settings?.receiptFooter,
        }} />
      </div>
    </div>
  );
}