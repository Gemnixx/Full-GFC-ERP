import React, { forwardRef } from 'react';

export interface ReceiptData {
  outletName: string;
  outletAddress?: string;
  outletPhone?: string;
  invoiceNumber: string;
  saleDate: string | Date;
  cashier?: string;
  customer?: string;
  customerPhone?: string;
  items: {
    name: string;
    model?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    lineTotal: number;
  }[];
  subtotal: number;
  discount: number;
  otherCharges: number;
  total: number;
  paid: number;
  due: number;
  paymentMethod: string;
  footer?: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n || 0);

const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const ReceiptPrint = forwardRef<HTMLDivElement, { data: ReceiptData }>(({ data }, ref) => (
  <div ref={ref} className="receipt-print">
    <style>{`
      .receipt-print {
        width: 80mm;
        padding: 4mm 3mm;
        font-family: 'Courier New', ui-monospace, monospace;
        font-size: 11px;
        line-height: 1.4;
        color: #000;
        background: #fff;
      }
      .receipt-print .bold { font-weight: 700; }
      .receipt-print .lg { font-size: 15px; }
      .receipt-print .xs { font-size: 10px; }
      .receipt-print .row { display: flex; justify-content: space-between; gap: 6px; }
      .receipt-print .row > span:first-child { flex: 1; }
      .receipt-print .row > span:last-child { white-space: nowrap; text-align: right; }
      .receipt-print .divider { border-top: 1px dashed #000; margin: 5px 0; }
      .receipt-print .header { text-align: center; padding-bottom: 6px; border-bottom: 2px solid #000; margin-bottom: 6px; }
      .receipt-print .logo { width: 18mm; height: 18mm; margin: 0 auto 4px; display: block; object-fit: contain; }
      .receipt-print table { width: 100%; border-collapse: collapse; }
      .receipt-print table td { padding: 2px 0; vertical-align: top; }
      .receipt-print .item-name { font-weight: 600; }
      .receipt-print .item-meta { font-size: 10px; color: #333; }
      .receipt-print .totals { border-top: 2px solid #000; padding-top: 6px; margin-top: 6px; }
      .receipt-print .grand { font-size: 14px; font-weight: 700; border-top: 1px dashed #000; border-bottom: 2px solid #000; padding: 5px 0; }
      .receipt-print .footer { text-align: center; margin-top: 8px; padding-top: 6px; border-top: 1px dashed #000; font-size: 10px; }
      .receipt-print .footer .thankyou { font-weight: 700; margin-bottom: 3px; }
    `}</style>

    {/* ============ HEADER with LOGO ============ */}
    <div className="header">
      <img
        src="/logo.svg"
        alt="GFC Logo"
        className="logo"
        onError={(e: any) => { e.target.style.display = 'none'; }}
      />
      <div className="bold lg">{data.outletName}</div>
      {data.outletAddress && <div className="xs">{data.outletAddress}</div>}
      {data.outletPhone && <div className="xs">Tel: {data.outletPhone}</div>}
    </div>

    {/* ============ INVOICE META ============ */}
    <div className="row"><span>Invoice:</span><span className="bold">{data.invoiceNumber}</span></div>
    <div className="row"><span>Date:</span><span>{fmtDate(data.saleDate)}</span></div>
    {data.cashier && <div className="row"><span>Cashier:</span><span>{data.cashier}</span></div>}
    <div className="row"><span>Customer:</span><span>{data.customer || 'Walk-in'}</span></div>
    {data.customerPhone && <div className="row"><span>Phone:</span><span>{data.customerPhone}</span></div>}

    <div className="divider" />

    {/* ============ ITEMS ============ */}
    <table>
      <tbody>
        {data.items.map((it, i) => (
          <React.Fragment key={`item-${i}`}>
            <tr>
              <td colSpan={2} className="item-name">{it.name}</td>
            </tr>
            {it.model && (
              <tr>
                <td colSpan={2} className="item-meta">{it.model}</td>
              </tr>
            )}
            <tr>
              <td className="item-meta">
                {it.quantity} × Rs {fmt(it.unitPrice)}
                {it.discount ? ` − ${fmt(it.discount)}` : ''}
              </td>
              <td style={{ textAlign: 'right' }} className="bold">Rs {fmt(it.lineTotal)}</td>
            </tr>
          </React.Fragment>
        ))}
      </tbody>
    </table>

    <div className="divider" />

    {/* ============ TOTALS ============ */}
    <div className="totals">
      <div className="row"><span>Subtotal</span><span>Rs {fmt(data.subtotal)}</span></div>
      {data.discount > 0 && (
        <div className="row"><span>Discount</span><span>− Rs {fmt(data.discount)}</span></div>
      )}
      {data.otherCharges > 0 && (
        <div className="row"><span>Other Charges</span><span>+ Rs {fmt(data.otherCharges)}</span></div>
      )}
      <div className="row grand">
        <span>TOTAL</span>
        <span>Rs {fmt(data.total)}</span>
      </div>
      <div className="row" style={{ marginTop: 4 }}>
        <span>Paid ({data.paymentMethod})</span>
        <span>Rs {fmt(data.paid)}</span>
      </div>
      {data.due > 0 && (
        <div className="row bold">
          <span>Balance Due</span>
          <span>Rs {fmt(data.due)}</span>
        </div>
      )}
    </div>

    {/* ============ FOOTER ============ */}
    <div className="footer">
      <div className="thankyou">{data.footer || 'Thank you for your business!'}</div>
      <span className="xs">Goods once sold are not returnable without receipt.</span>
      <br />
      <span className="xs">Powered by GFC Fans Outlet</span>
    </div>
  </div>
));
ReceiptPrint.displayName = 'ReceiptPrint';