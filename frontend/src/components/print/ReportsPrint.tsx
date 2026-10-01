import { forwardRef } from 'react';

export type ReportType =
  | 'sales'
  | 'purchases'
  | 'inventory'
  | 'customers'
  | 'suppliers'
  | 'financial'
  | 'returns'
  | 'daily';

export interface ReportColumn {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

export interface ReportsPrintData {
  outletName: string;
  outletAddress?: string;
  outletPhone?: string;
  reportTitle: string;
  periodLabel: string;
  generatedAt: string | Date;
  columns: ReportColumn[];
  rows: any[];
  summary?: { label: string; value: string; highlight?: boolean }[];
  financialSummary?: {
    salesRevenue: number;
    lessSalesReturns: number;
    netRevenue: number;
    costOfGoodsSold: number;
    lessPurchaseReturns: number;
    netCogs: number;
    grossProfit: number;
    operatingExpenses: { category: string; amount: number }[];
    totalOperatingExpenses: number;
    netProfit: number;
  };
  dailySummary?: {
    sales?: { total: number; count: number };
    purchases?: { total: number; count: number };
    expenses?: { total: number; count: number };
    salesReturns?: { total: number; count: number };
    cashIn?: number;
    cashOut?: number;
  };
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

export const ReportsPrint = forwardRef<HTMLDivElement, { data: ReportsPrintData }>(
  ({ data }, ref) => (
    <div ref={ref} className="report-print">
      <style>{`
        .report-print {
          width: 210mm;
          min-height: 297mm;
          padding: 12mm 14mm;
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 11px;
          line-height: 1.5;
          color: #0f172a;
          background: #fff;
        }
        .report-print .header {
          text-align: center;
          padding-bottom: 10px;
          border-bottom: 3px double #0f172a;
          margin-bottom: 16px;
          position: relative;
        }
        .report-print .logo {
          width: 22mm;
          height: 22mm;
          margin: 0 auto 6px;
          display: block;
          object-fit: contain;
        }
        .report-print .outlet-name {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.5px;
          margin-top: 2px;
        }
        .report-print .outlet-meta {
          font-size: 11px;
          color: #475569;
          margin-top: 4px;
        }
        .report-print .title {
          font-size: 16px;
          font-weight: 700;
          text-align: center;
          margin: 8px 0 4px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .report-print .period {
          text-align: center;
          font-size: 11px;
          color: #334155;
          margin-bottom: 14px;
          padding-bottom: 10px;
          border-bottom: 1px solid #cbd5e1;
        }
        .report-print table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
          font-size: 10px;
        }
        .report-print thead {
          background: #f1f5f9;
        }
        .report-print th {
          padding: 6px 8px;
          text-align: left;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #334155;
          border-bottom: 2px solid #0f172a;
        }
        .report-print th.right { text-align: right; }
        .report-print th.center { text-align: center; }
        .report-print td {
          padding: 5px 8px;
          border-bottom: 1px solid #e2e8f0;
        }
        .report-print td.right { text-align: right; }
        .report-print td.center { text-align: center; }
        .report-print tbody tr:hover {
          background: #f8fafc;
        }
        .report-print .empty {
          text-align: center;
          padding: 30px;
          color: #94a3b8;
          font-style: italic;
        }
        .report-print .summary {
          margin-top: 20px;
          padding: 12px 16px;
          background: #f8fafc;
          border: 2px solid #0f172a;
          border-radius: 4px;
        }
        .report-print .summary-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #0f172a;
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid #cbd5e1;
        }
        .report-print .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 3px 0;
          font-size: 11px;
        }
        .report-print .summary-row.highlight {
          font-weight: 700;
          font-size: 13px;
          border-top: 2px solid #0f172a;
          border-bottom: 2px solid #0f172a;
          padding: 8px 0;
          margin-top: 6px;
          color: #059669;
        }
        .report-print .summary-row.highlight.negative {
          color: #dc2626;
        }
        .report-print .financial-section {
          margin-bottom: 14px;
        }
        .report-print .financial-section-title {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #475569;
          padding: 5px 8px;
          background: #f1f5f9;
          border-left: 3px solid #2563eb;
          margin-bottom: 6px;
        }
        .report-print .financial-row {
          display: flex;
          justify-content: space-between;
          padding: 3px 8px;
          font-size: 11px;
        }
        .report-print .financial-row.sub {
          padding-left: 20px;
          color: #475569;
        }
        .report-print .financial-row.total {
          font-weight: 700;
          border-top: 1px solid #94a3b8;
          margin-top: 4px;
          padding-top: 6px;
        }
        .report-print .financial-grand {
          font-size: 15px;
          font-weight: 700;
          padding: 12px 8px;
          margin-top: 10px;
          text-align: right;
          background: #f8fafc;
          border: 2px solid #0f172a;
        }
        .report-print .financial-grand .label {
          float: left;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .report-print .negative { color: #dc2626; }
        .report-print .positive { color: #059669; }
        .report-print .daily-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 12px;
        }
        .report-print .daily-card {
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          background: #fff;
        }
        .report-print .daily-card .label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          font-weight: 600;
        }
        .report-print .daily-card .value {
          font-size: 16px;
          font-weight: 700;
          margin-top: 4px;
          color: #0f172a;
        }
        .report-print .daily-card .meta {
          font-size: 10px;
          color: #94a3b8;
          margin-top: 2px;
        }
        .report-print .footer {
          margin-top: 30px;
          padding-top: 12px;
          border-top: 1px solid #cbd5e1;
          font-size: 10px;
          text-align: center;
          color: #64748b;
        }
        .report-print .records-count {
          font-size: 10px;
          color: #64748b;
          margin-top: 8px;
          text-align: right;
        }
        .report-print .signature {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
          font-size: 11px;
        }
        .report-print .signature .line {
          border-top: 1px solid #0f172a;
          padding-top: 4px;
          width: 200px;
          text-align: center;
        }

        @media print {
          @page { size: A4; margin: 0; }
          body * { visibility: hidden; }
          .report-print, .report-print * { visibility: visible; }
          .report-print {
            position: absolute;
            left: 0;
            top: 0;
          }
          .report-print tbody tr:hover { background: transparent; }
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
      <div className="title">{data.reportTitle}</div>
      <div className="period">
        Period: <strong>{data.periodLabel}</strong>
        <br />
        Generated: {fmtDate(data.generatedAt)}
      </div>

      {/* ============ FINANCIAL SUMMARY ============ */}
      {data.financialSummary && (
        <div>
          <div className="financial-section">
            <div className="financial-section-title">Revenue</div>
            <div className="financial-row sub">
              <span>Sales Revenue</span>
              <span>Rs {fmt(data.financialSummary.salesRevenue)}</span>
            </div>
            {data.financialSummary.lessSalesReturns > 0 && (
              <div className="financial-row sub">
                <span>Less: Sales Returns</span>
                <span className="negative">− Rs {fmt(data.financialSummary.lessSalesReturns)}</span>
              </div>
            )}
            <div className="financial-row total">
              <span>Net Revenue</span>
              <span>Rs {fmt(data.financialSummary.netRevenue)}</span>
            </div>
          </div>

          <div className="financial-section">
            <div className="financial-section-title">Cost of Goods Sold</div>
            <div className="financial-row sub">
              <span>Cost of Goods Sold</span>
              <span className="negative">− Rs {fmt(data.financialSummary.costOfGoodsSold)}</span>
            </div>
            {data.financialSummary.lessPurchaseReturns > 0 && (
              <div className="financial-row sub">
                <span>Less: Purchase Returns</span>
                <span>+ Rs {fmt(data.financialSummary.lessPurchaseReturns)}</span>
              </div>
            )}
            <div className="financial-row total">
              <span>Net COGS</span>
              <span className="negative">− Rs {fmt(data.financialSummary.netCogs)}</span>
            </div>
          </div>

          <div className="financial-row total" style={{ fontSize: 13, padding: '10px 8px', borderTop: '2px solid #0f172a', borderBottom: '2px solid #0f172a' }}>
            <span>GROSS PROFIT</span>
            <span className={data.financialSummary.grossProfit >= 0 ? 'positive' : 'negative'}>
              Rs {fmt(data.financialSummary.grossProfit)}
            </span>
          </div>

          <div className="financial-section" style={{ marginTop: 16 }}>
            <div className="financial-section-title">Operating Expenses</div>
            {data.financialSummary.operatingExpenses.length === 0 ? (
              <div className="financial-row sub">
                <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>No expenses recorded</span>
                <span>—</span>
              </div>
            ) : (
              data.financialSummary.operatingExpenses.map((e, i) => (
                <div className="financial-row sub" key={i}>
                  <span>{e.category}</span>
                  <span className="negative">− Rs {fmt(e.amount)}</span>
                </div>
              ))
            )}
            <div className="financial-row total">
              <span>Total Operating Expenses</span>
              <span className="negative">− Rs {fmt(data.financialSummary.totalOperatingExpenses)}</span>
            </div>
          </div>

          <div className="financial-grand">
            <span className="label">NET PROFIT</span>
            <span className={data.financialSummary.netProfit >= 0 ? 'positive' : 'negative'}>
              {data.financialSummary.netProfit < 0 ? '− ' : ''}Rs {fmt(data.financialSummary.netProfit)}
            </span>
          </div>
        </div>
      )}

      {/* ============ DAILY BUSINESS ============ */}
      {data.dailySummary && (
        <div className="daily-grid">
          <div className="daily-card">
            <div className="label">Sales</div>
            <div className="value">Rs {fmt(data.dailySummary.sales?.total || 0)}</div>
            <div className="meta">{data.dailySummary.sales?.count || 0} invoices</div>
          </div>
          <div className="daily-card">
            <div className="label">Purchases</div>
            <div className="value">Rs {fmt(data.dailySummary.purchases?.total || 0)}</div>
            <div className="meta">{data.dailySummary.purchases?.count || 0} purchases</div>
          </div>
          <div className="daily-card">
            <div className="label">Expenses</div>
            <div className="value" style={{ color: '#dc2626' }}>Rs {fmt(data.dailySummary.expenses?.total || 0)}</div>
            <div className="meta">{data.dailySummary.expenses?.count || 0} entries</div>
          </div>
          <div className="daily-card">
            <div className="label">Sales Returns</div>
            <div className="value" style={{ color: '#f59e0b' }}>Rs {fmt(data.dailySummary.salesReturns?.total || 0)}</div>
            <div className="meta">{data.dailySummary.salesReturns?.count || 0} returns</div>
          </div>
          <div className="daily-card">
            <div className="label">Cash In</div>
            <div className="value" style={{ color: '#059669' }}>Rs {fmt(data.dailySummary.cashIn || 0)}</div>
          </div>
          <div className="daily-card">
            <div className="label">Cash Out</div>
            <div className="value" style={{ color: '#dc2626' }}>Rs {fmt(data.dailySummary.cashOut || 0)}</div>
          </div>
        </div>
      )}

      {/* ============ TABLE DATA ============ */}
      {!data.financialSummary && !data.dailySummary && (
        <>
          {data.rows.length === 0 ? (
            <div className="empty">No data for this period</div>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    {data.columns.map((c) => (
                      <th key={c.key} className={c.align || 'left'} style={{ width: c.width }}>
                        {c.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, i) => (
                    <tr key={i}>
                      {data.columns.map((c) => (
                        <td key={c.key} className={c.align || 'left'}>
                          {row[c.key] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="records-count">
                Total Records: <strong>{data.rows.length}</strong>
              </div>
            </>
          )}

          {/* Summary block */}
          {data.summary && data.summary.length > 0 && (
            <div className="summary">
              <div className="summary-title">Summary</div>
              {data.summary.map((s, i) => (
                <div className={`summary-row ${s.highlight ? 'highlight' : ''}`} key={i}>
                  <span>{s.label}</span>
                  <span>{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ============ SIGNATURE (only for tabular reports) ============ */}
      {!data.financialSummary && !data.dailySummary && data.rows.length > 0 && (
        <div className="signature">
          <div className="line">Prepared By</div>
          <div className="line">Authorized Signature</div>
        </div>
      )}

      {/* ============ FOOTER ============ */}
      <div className="footer">
        {data.footer || 'Computer-generated report. No signature required.'}
      </div>
    </div>
  )
);
ReportsPrint.displayName = 'ReportsPrint';