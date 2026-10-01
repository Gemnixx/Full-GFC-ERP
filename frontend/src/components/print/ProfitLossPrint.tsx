import { forwardRef } from 'react';

export interface ProfitLossData {
  outletName: string;
  outletAddress?: string;
  outletPhone?: string;
  periodLabel: string;
  generatedAt: string | Date;
  revenue: {
    salesRevenue: number;
    lessSalesReturns: number;
    netRevenue: number;
  };
  cost: {
    costOfGoodsSold: number;
    lessPurchaseReturns: number;
    netCogs: number;
  };
  grossProfit: number;
  operatingExpenses: { category: string; amount: number }[];
  totalOperatingExpenses: number;
  netProfit: number;
  footer?: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(n || 0));

const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const ProfitLossPrint = forwardRef<HTMLDivElement, { data: ProfitLossData }>(
  ({ data }, ref) => (
    <div ref={ref} className="pl-print">
      <style>{`
        .pl-print {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm 18mm;
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 12px;
          line-height: 1.5;
          color: #0f172a;
          background: #fff;
        }
        .pl-print .header {
          text-align: center;
          padding-bottom: 12px;
          border-bottom: 3px double #0f172a;
          margin-bottom: 20px;
        }
        .pl-print .logo {
          width: 24mm;
          height: 24mm;
          margin: 0 auto 6px;
          display: block;
          object-fit: contain;
        }
        .pl-print .outlet-name {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.5px;
          margin-top: 2px;
        }
        .pl-print .outlet-meta {
          font-size: 11px;
          color: #475569;
          margin-top: 4px;
        }
        .pl-print .title {
          font-size: 18px;
          font-weight: 700;
          text-align: center;
          margin: 8px 0 4px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .pl-print .period {
          text-align: center;
          font-size: 12px;
          color: #334155;
          margin-bottom: 18px;
          padding-bottom: 12px;
          border-bottom: 1px solid #cbd5e1;
        }
        .pl-print .section {
          margin-bottom: 16px;
        }
        .pl-print .section-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #475569;
          padding: 6px 10px;
          background: #f1f5f9;
          border-left: 3px solid #2563eb;
          margin-bottom: 8px;
        }
        .pl-print .row {
          display: flex;
          justify-content: space-between;
          padding: 4px 10px;
          font-size: 12px;
        }
        .pl-print .row.sub {
          padding-left: 24px;
          color: #475569;
        }
        .pl-print .row.total {
          font-weight: 700;
          border-top: 1px solid #94a3b8;
          margin-top: 6px;
          padding-top: 6px;
        }
        .pl-print .row.double {
          font-weight: 700;
          font-size: 14px;
          border-top: 2px solid #0f172a;
          border-bottom: 2px solid #0f172a;
          padding: 10px;
          margin-top: 8px;
        }
        .pl-print .grand {
          font-size: 16px;
          font-weight: 700;
          padding: 14px 10px;
          margin-top: 12px;
          text-align: right;
          background: #f8fafc;
          border: 2px solid #0f172a;
        }
        .pl-print .grand .label {
          float: left;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .pl-print .negative { color: #dc2626; }
        .pl-print .positive { color: #059669; }
        .pl-print .footer {
          margin-top: 30px;
          padding-top: 12px;
          border-top: 1px solid #cbd5e1;
          font-size: 10px;
          text-align: center;
          color: #64748b;
        }
        .pl-print .signature {
          display: flex;
          justify-content: space-between;
          margin-top: 60px;
          font-size: 11px;
        }
        .pl-print .signature .line {
          border-top: 1px solid #0f172a;
          padding-top: 4px;
          width: 200px;
          text-align: center;
        }

        @media print {
          @page { size: A4; margin: 0; }
          body * { visibility: hidden; }
          .pl-print, .pl-print * { visibility: visible; }
          .pl-print {
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}</style>

      {/* ============ HEADER with LOGO ============ */}
      <div className="header">
        <img
          src="/logo.svg"
          alt="GFC Logo"
          className="logo"
          onError={(e: any) => { e.target.style.display = 'none'; }}
        />
        <div className="outlet-name">{data.outletName}</div>
        <div className="outlet-meta">
          {data.outletAddress && <div>{data.outletAddress}</div>}
          {data.outletPhone && <div>Tel: {data.outletPhone}</div>}
        </div>
      </div>

      {/* ============ TITLE ============ */}
      <div className="title">Profit & Loss Statement</div>
      <div className="period">
        Period: <strong>{data.periodLabel}</strong>
        <br />
        Generated: {fmtDate(data.generatedAt)}
      </div>

      {/* ============ REVENUE ============ */}
      <div className="section">
        <div className="section-title">Revenue</div>
        <div className="row sub">
          <span>Sales Revenue</span>
          <span>Rs {fmt(data.revenue.salesRevenue)}</span>
        </div>
        {data.revenue.lessSalesReturns > 0 && (
          <div className="row sub">
            <span>Less: Sales Returns</span>
            <span className="negative">− Rs {fmt(data.revenue.lessSalesReturns)}</span>
          </div>
        )}
        <div className="row total">
          <span>Net Revenue</span>
          <span>Rs {fmt(data.revenue.netRevenue)}</span>
        </div>
      </div>

      {/* ============ COGS ============ */}
      <div className="section">
        <div className="section-title">Cost of Goods Sold</div>
        <div className="row sub">
          <span>Cost of Goods Sold</span>
          <span className="negative">− Rs {fmt(data.cost.costOfGoodsSold)}</span>
        </div>
        {data.cost.lessPurchaseReturns > 0 && (
          <div className="row sub">
            <span>Less: Purchase Returns</span>
            <span>+ Rs {fmt(data.cost.lessPurchaseReturns)}</span>
          </div>
        )}
        <div className="row total">
          <span>Net COGS</span>
          <span className="negative">− Rs {fmt(data.cost.netCogs)}</span>
        </div>
      </div>

      {/* ============ GROSS PROFIT ============ */}
      <div className="row double">
        <span>GROSS PROFIT</span>
        <span className={data.grossProfit >= 0 ? 'positive' : 'negative'}>
          Rs {fmt(data.grossProfit)}
        </span>
      </div>

      {/* ============ OPERATING EXPENSES ============ */}
      <div className="section" style={{ marginTop: 20 }}>
        <div className="section-title">Operating Expenses</div>
        {data.operatingExpenses.length === 0 ? (
          <div className="row sub">
            <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>No expenses recorded</span>
            <span>—</span>
          </div>
        ) : (
          data.operatingExpenses.map((e, i) => (
            <div className="row sub" key={i}>
              <span>{e.category}</span>
              <span className="negative">− Rs {fmt(e.amount)}</span>
            </div>
          ))
        )}
        <div className="row total">
          <span>Total Operating Expenses</span>
          <span className="negative">− Rs {fmt(data.totalOperatingExpenses)}</span>
        </div>
      </div>

      {/* ============ NET PROFIT ============ */}
      <div className="grand">
        <span className="label">NET PROFIT</span>
        <span className={data.netProfit >= 0 ? 'positive' : 'negative'}>
          {data.netProfit < 0 ? '− ' : ''}Rs {fmt(data.netProfit)}
        </span>
      </div>

      {/* ============ SIGNATURES ============ */}
      <div className="signature">
        <div className="line">Prepared By</div>
        <div className="line">Authorized Signature</div>
      </div>

      {/* ============ FOOTER ============ */}
      <div className="footer">
        {data.footer || 'This is a computer-generated statement. No signature required.'}
      </div>
    </div>
  )
);
ProfitLossPrint.displayName = 'ProfitLossPrint';