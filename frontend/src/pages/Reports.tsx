import { useEffect, useState, useRef } from 'react';
import {
  Download, Printer, FileText, TrendingUp, Package, Users, Undo2, Calendar,
} from 'lucide-react';
import { api, unwrap } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, Card, Table, StatCard, Badge, Empty, Loader, Tabs, Input } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { ReportsPrint, ReportColumn } from '../components/print/ReportsPrint';
import { printElement } from '../lib/print';
import { formatMoney, formatDate } from '../lib/format';
import { exportCSV, csvFilename } from '../lib/csv';
import { cn } from '../lib/cn';
import type { Column } from '../components/ui';

type ReportType = 'sales' | 'purchases' | 'inventory' | 'customers' | 'suppliers' | 'financial' | 'returns' | 'daily';
type Period = 'today' | '7d' | '30d' | 'month' | 'year' | 'custom';

const reportTypes = [
  { value: 'sales', label: 'Sales Report', description: 'Invoices, totals and profit', icon: FileText },
  { value: 'purchases', label: 'Purchase Report', description: 'Supplier purchases and payments', icon: Package },
  { value: 'inventory', label: 'Inventory Report', description: 'Stock levels and valuation', icon: Package },
  { value: 'customers', label: 'Customer Report', description: 'Sales by customer', icon: Users },
  { value: 'suppliers', label: 'Supplier Report', description: 'Purchases by supplier', icon: Users },
  { value: 'financial', label: 'Financial Summary', description: 'Revenue, profit and cash', icon: TrendingUp },
  { value: 'returns', label: 'Returns Report', description: 'Sales and purchase returns', icon: Undo2 },
  { value: 'daily', label: 'Daily Business Report', description: 'End-of-day overview', icon: Calendar },
] as const;

export default function Reports() {
  const toast = useToast();
  const [type, setType] = useState<ReportType>('sales');
  const [period, setPeriod] = useState<Period>('month');
  const [data, setData] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const buildRange = () => {
    const now = new Date();
    const r: any = {};
    if (period === 'today') {
      r.from = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      r.to = now.toISOString();
    } else if (period === '7d') {
      const s = new Date(); s.setDate(s.getDate() - 6); s.setHours(0, 0, 0, 0);
      r.from = s.toISOString(); r.to = now.toISOString();
    } else if (period === '30d') {
      const s = new Date(); s.setDate(s.getDate() - 29); s.setHours(0, 0, 0, 0);
      r.from = s.toISOString(); r.to = now.toISOString();
    } else if (period === 'month') {
      const s = new Date(); s.setDate(1); s.setHours(0, 0, 0, 0);
      r.from = s.toISOString(); r.to = now.toISOString();
    } else if (period === 'year') {
      const s = new Date(now.getFullYear(), 0, 1);
      r.from = s.toISOString(); r.to = now.toISOString();
    } else {
      if (from) r.from = new Date(from).toISOString();
      if (to) r.to = new Date(to + 'T23:59:59').toISOString();
    }
    return r;
  };

  const periodLabel = () => {
    if (period === 'today') return 'Today';
    if (period === '7d') return 'Last 7 Days';
    if (period === '30d') return 'Last 30 Days';
    if (period === 'month') return 'This Month';
    if (period === 'year') return 'This Year';
    if (period === 'custom' && from && to) {
      const f = new Date(from).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
      const t = new Date(to).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
      return `${f} — ${t}`;
    }
    return 'Custom period';
  };

  useEffect(() => {
    setLoading(true); setData(null); setSummary(null);
    const params = buildRange();
    const run = async () => {
      try {
        if (type === 'sales') {
          const [s, pl] = await Promise.all([
            api.get('/reports/sales', { params }),
            api.get('/reports/profit-loss', { params }),
          ]);
          setData(unwrap(s)); setSummary(unwrap(pl));
        } else if (type === 'purchases') {
          const r = await api.get('/reports/purchases', { params }); setData(unwrap(r));
        } else if (type === 'inventory') {
          const r = await api.get('/reports/stock', { params }); setData(unwrap(r));
        } else if (type === 'customers') {
          const r = await api.get('/reports/sales-by-customer', { params }); setData(unwrap(r));
        } else if (type === 'suppliers') {
          const r = await api.get('/reports/purchases-by-supplier', { params }); setData(unwrap(r));
        } else if (type === 'returns') {
          const r = await api.get('/reports/returns', { params }); setData(unwrap(r));
        } else if (type === 'daily') {
          const r = await api.get('/reports/daily-business', { params }); setData(unwrap(r));
        } else if (type === 'financial') {
          const pl = await api.get('/reports/profit-loss', { params }); setSummary(unwrap(pl));
        }
      } finally { setLoading(false); }
    };
    run();
    // eslint-disable-next-line
  }, [type, period, from, to]);

  useEffect(() => {
    api.get('/settings').then((r) => setSettings(unwrap(r))).catch(() => {});
  }, []);

  // ===== PRINT LOGIC =====
  const buildPrintData = () => {
    const base = {
      outletName: settings?.outletName || 'GFC Fans Outlet',
      outletAddress: settings?.address,
      outletPhone: settings?.phone,
      reportTitle: reportTypes.find((r) => r.value === type)?.label || 'Report',
      periodLabel: periodLabel(),
      generatedAt: new Date(),
      footer: 'Computer-generated report. No signature required.',
    };

    if (type === 'sales') {
      return {
        ...base,
        columns: [
          { key: 'invoiceNumber', header: 'Invoice #' },
          { key: 'saleDate', header: 'Date' },
          { key: 'customer', header: 'Customer' },
          { key: 'total', header: 'Total', align: 'right' as const },
          { key: 'paid', header: 'Paid', align: 'right' as const },
          { key: 'due', header: 'Balance', align: 'right' as const },
        ],
        rows: (data || []).map((r: any) => ({
          invoiceNumber: r.invoiceNumber,
          saleDate: formatDate(r.saleDate),
          customer: r.customer?.name || 'Walk-in',
          total: `Rs ${formatMoney(r.total)}`,
          paid: `Rs ${formatMoney(r.paid)}`,
          due: `Rs ${formatMoney(r.due)}`,
        })),
        summary: [
          { label: 'Total Invoices', value: String((data || []).length) },
          { label: 'Total Sales', value: `Rs ${formatMoney((data || []).reduce((s: number, x: any) => s + x.total, 0))}` },
          { label: 'Total Paid', value: `Rs ${formatMoney((data || []).reduce((s: number, x: any) => s + x.paid, 0))}` },
          { label: 'Total Due', value: `Rs ${formatMoney((data || []).reduce((s: number, x: any) => s + x.due, 0))}`, highlight: true },
        ],
      };
    }

    if (type === 'purchases') {
      return {
        ...base,
        columns: [
          { key: 'purchaseNumber', header: 'Purchase #' },
          { key: 'purchaseDate', header: 'Date' },
          { key: 'supplier', header: 'Supplier' },
          { key: 'total', header: 'Total', align: 'right' as const },
          { key: 'paid', header: 'Paid', align: 'right' as const },
          { key: 'due', header: 'Due', align: 'right' as const },
        ],
        rows: (data || []).map((r: any) => ({
          purchaseNumber: r.purchaseNumber,
          purchaseDate: formatDate(r.purchaseDate),
          supplier: r.supplier?.name || '—',
          total: `Rs ${formatMoney(r.total)}`,
          paid: `Rs ${formatMoney(r.paid)}`,
          due: `Rs ${formatMoney(r.due)}`,
        })),
        summary: [
          { label: 'Total Purchases', value: String((data || []).length) },
          { label: 'Total Amount', value: `Rs ${formatMoney((data || []).reduce((s: number, x: any) => s + x.total, 0))}` },
          { label: 'Total Paid', value: `Rs ${formatMoney((data || []).reduce((s: number, x: any) => s + x.paid, 0))}` },
          { label: 'Total Due', value: `Rs ${formatMoney((data || []).reduce((s: number, x: any) => s + x.due, 0))}`, highlight: true },
        ],
      };
    }

    if (type === 'inventory') {
      return {
        ...base,
        columns: [
          { key: 'product', header: 'Product' },
          { key: 'model', header: 'Model' },
          { key: 'brand', header: 'Brand' },
          { key: 'stock', header: 'Stock', align: 'center' as const },
          { key: 'wac', header: 'WAC', align: 'right' as const },
          { key: 'value', header: 'Value', align: 'right' as const },
        ],
        rows: (data || []).map((r: any) => ({
          product: r.product,
          model: r.model || '—',
          brand: r.brand || '—',
          stock: r.stock,
          wac: `Rs ${formatMoney(r.wac)}`,
          value: `Rs ${formatMoney(r.value)}`,
        })),
        summary: [
          { label: 'Total Products', value: String((data || []).length) },
          { label: 'Total Stock Units', value: String((data || []).reduce((s: number, x: any) => s + (x.stock || 0), 0)) },
          { label: 'Total Stock Value', value: `Rs ${formatMoney((data || []).reduce((s: number, x: any) => s + (x.value || 0), 0))}`, highlight: true },
        ],
      };
    }

    if (type === 'customers') {
      return {
        ...base,
        columns: [
          { key: 'customer', header: 'Customer' },
          { key: 'count', header: 'Invoices', align: 'center' as const },
          { key: 'sales', header: 'Total Sales', align: 'right' as const },
        ],
        rows: (data || []).map((r: any) => ({
          customer: r.customer,
          count: r.count,
          sales: `Rs ${formatMoney(r.sales)}`,
        })),
        summary: [
          { label: 'Total Customers', value: String((data || []).length) },
          { label: 'Total Revenue', value: `Rs ${formatMoney((data || []).reduce((s: number, x: any) => s + (x.sales || 0), 0))}`, highlight: true },
        ],
      };
    }

    if (type === 'suppliers') {
      return {
        ...base,
        columns: [
          { key: 'supplier', header: 'Supplier' },
          { key: 'count', header: 'Purchases', align: 'center' as const },
          { key: 'total', header: 'Total Amount', align: 'right' as const },
        ],
        rows: (data || []).map((r: any) => ({
          supplier: r.supplier,
          count: r.count,
          total: `Rs ${formatMoney(r.total)}`,
        })),
        summary: [
          { label: 'Total Suppliers', value: String((data || []).length) },
          { label: 'Total Purchases', value: `Rs ${formatMoney((data || []).reduce((s: number, x: any) => s + (x.total || 0), 0))}`, highlight: true },
        ],
      };
    }

    if (type === 'returns') {
      return {
        ...base,
        columns: [
          { key: 'returnNumber', header: 'Return #' },
          { key: 'reference', header: 'Reference' },
          { key: 'party', header: 'Party' },
          { key: 'type', header: 'Type', align: 'center' as const },
          { key: 'date', header: 'Date' },
          { key: 'amount', header: 'Amount', align: 'right' as const },
        ],
        rows: (data || []).map((r: any) => ({
          returnNumber: r.returnNumber,
          reference: r.reference,
          party: r.party,
          type: r.type,
          date: formatDate(r.date),
          amount: `Rs ${formatMoney(r.amount)}`,
        })),
        summary: [
          { label: 'Total Returns', value: String((data || []).length) },
          { label: 'Total Amount', value: `Rs ${formatMoney((data || []).reduce((s: number, x: any) => s + (x.amount || 0), 0))}`, highlight: true },
        ],
      };
    }

    if (type === 'financial' && summary) {
      return {
        ...base,
        columns: [],
        rows: [],
        financialSummary: {
          salesRevenue: summary.revenue?.salesRevenue || 0,
          lessSalesReturns: summary.revenue?.lessSalesReturns || 0,
          netRevenue: summary.revenue?.netRevenue || 0,
          costOfGoodsSold: summary.cost?.costOfGoodsSold || 0,
          lessPurchaseReturns: summary.cost?.lessPurchaseReturns || 0,
          netCogs: summary.cost?.netCogs || 0,
          grossProfit: summary.grossProfit || 0,
          operatingExpenses: summary.operatingExpenses || [],
          totalOperatingExpenses: summary.totalOperatingExpenses || 0,
          netProfit: summary.netProfit || 0,
        },
      };
    }

    if (type === 'daily' && data) {
      return {
        ...base,
        columns: [],
        rows: [],
        dailySummary: {
          sales: data.sales,
          purchases: data.purchases,
          expenses: data.expenses,
          salesReturns: data.salesReturns,
          cashIn: data.cashIn,
          cashOut: data.cashOut,
        },
      };
    }

    return { ...base, columns: [], rows: [] };
  };

  const handlePrint = () => {
    printElement(printRef.current);
  };

  const handleExport = () => {
    if (!data) return;
    const rows: any[] = Array.isArray(data) ? data : [];
    const columns: any[] = [
      { key: 'x', header: 'Data', value: () => 'See report' },
    ];
    exportCSV(rows, columns, csvFilename(`${type}-report`));
    toast.success('Exported');
  };

  const salesColumns: Column<any>[] = [
    { key: 'invoice', header: 'Invoice', render: (r) => <span className="font-mono text-xs">{r.invoiceNumber}</span> },
    { key: 'date', header: 'Date', render: (r) => formatDate(r.saleDate) },
    { key: 'customer', header: 'Customer', render: (r) => r.customer?.name || 'Walk-in' },
    { key: 'total', header: 'Total', align: 'right', render: (r) => <span className="font-medium">Rs {formatMoney(r.total)}</span> },
    { key: 'paid', header: 'Paid', align: 'right', render: (r) => <span className="text-emerald-600">Rs {formatMoney(r.paid)}</span> },
    { key: 'balance', header: 'Balance', align: 'right', render: (r) => <span className="text-amber-600">Rs {formatMoney(r.due)}</span> },
  ];

  const purchaseColumns: Column<any>[] = [
    { key: 'pn', header: 'Purchase #', render: (r) => <span className="font-mono text-xs">{r.purchaseNumber}</span> },
    { key: 'date', header: 'Date', render: (r) => formatDate(r.purchaseDate) },
    { key: 'supplier', header: 'Supplier', render: (r) => r.supplier?.name || '—' },
    { key: 'total', header: 'Total', align: 'right', render: (r) => <span className="font-medium">Rs {formatMoney(r.total)}</span> },
    { key: 'paid', header: 'Paid', align: 'right', render: (r) => <span className="text-emerald-600">Rs {formatMoney(r.paid)}</span> },
    { key: 'due', header: 'Due', align: 'right', render: (r) => <span className="text-amber-600">Rs {formatMoney(r.due)}</span> },
  ];

  const stockColumns: Column<any>[] = [
    { key: 'product', header: 'Product', render: (r) => <span className="font-medium">{r.product}</span> },
    { key: 'model', header: 'Model', render: (r) => r.model || '—' },
    { key: 'brand', header: 'Brand', render: (r) => r.brand || '—' },
    { key: 'stock', header: 'Stock', align: 'center', render: (r) => <Badge variant={r.stock > 5 ? 'green' : r.stock > 0 ? 'amber' : 'red'}>{r.stock}</Badge> },
    { key: 'wac', header: 'WAC', align: 'right', render: (r) => `Rs ${formatMoney(r.wac)}` },
    { key: 'value', header: 'Value', align: 'right', render: (r) => <span className="font-medium">Rs {formatMoney(r.value)}</span> },
  ];

  const customerReportColumns: Column<any>[] = [
    { key: 'customer', header: 'Customer', render: (r) => r.customer },
    { key: 'sales', header: 'Total Sales', align: 'right', render: (r) => <span className="font-medium">Rs {formatMoney(r.sales)}</span> },
    { key: 'count', header: 'Invoices', align: 'center', render: (r) => r.count },
  ];

  const supplierReportColumns: Column<any>[] = [
    { key: 'supplier', header: 'Supplier', render: (r) => r.supplier },
    { key: 'total', header: 'Total Purchases', align: 'right', render: (r) => <span className="font-medium">Rs {formatMoney(r.total)}</span> },
    { key: 'count', header: 'Purchases', align: 'center', render: (r) => r.count },
  ];

  const returnsColumns: Column<any>[] = [
    { key: 'rn', header: 'Return #', render: (r) => <span className="font-mono text-xs">{r.returnNumber}</span> },
    { key: 'ref', header: 'Reference', render: (r) => <span className="font-mono text-xs">{r.reference}</span> },
    { key: 'party', header: 'Party', render: (r) => r.party },
    { key: 'type', header: 'Type', render: (r) => <Badge variant={r.type === 'SALES' ? 'amber' : 'blue'}>{r.type}</Badge> },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className="font-medium">Rs {formatMoney(r.amount)}</span> },
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="no-print">
        <PageHeader title="Reports" subtitle="Filter any report by date range, then print or export"
          actions={<>
            <Button variant="outline" icon={<Printer className="w-3.5 h-3.5" />} onClick={handlePrint}>Print</Button>
            <Button icon={<Download className="w-3.5 h-3.5" />} onClick={handleExport}>Export CSV</Button>
          </>} />

        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Revenue" value={`Rs ${formatMoney(summary.revenue?.netRevenue || 0)}`} accent="brand" />
            <StatCard label="Gross Profit" value={`Rs ${formatMoney(summary.grossProfit || 0)}`} accent="success" />
            <StatCard label="Expenses" value={`Rs ${formatMoney(summary.totalOperatingExpenses || 0)}`} accent="warning" />
            <StatCard label="Net Profit" value={`Rs ${formatMoney(summary.netProfit || 0)}`} accent={summary.netProfit >= 0 ? 'success' : 'danger'} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Card padding="sm" className="lg:col-span-1">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider px-2 py-2">Report Type</p>
            <div className="space-y-0.5">
              {reportTypes.map((rt) => {
                const Icon = rt.icon;
                const active = type === rt.value;
                return (
                  <button key={rt.value} onClick={() => setType(rt.value as ReportType)}
                    className={cn('w-full text-left px-3 py-2 rounded-md transition-colors', active ? 'bg-brand-50 dark:bg-brand-950/40' : 'hover:bg-surface-hover')}>
                    <div className="flex items-center gap-2.5">
                      <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-brand-600 dark:text-brand-400' : 'text-ink-muted')} strokeWidth={1.75} />
                      <div className="min-w-0">
                        <p className={cn('text-sm font-medium truncate', active ? 'text-brand-700 dark:text-brand-300' : 'text-ink-primary')}>{rt.label}</p>
                        <p className="text-xs text-ink-secondary truncate">{rt.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="lg:col-span-3 space-y-4">
            <Card padding="none">
              <div className="p-4 border-b border-edge-base flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-sm font-semibold text-ink-primary capitalize">
                  {reportTypes.find((r) => r.value === type)?.label} — {periodLabel()}
                </h3>
                <Tabs value={period} onChange={(v) => setPeriod(v as Period)} size="sm"
                  options={[
                    { value: 'today', label: 'Today' },
                    { value: '7d', label: '7 days' },
                    { value: '30d', label: '30 days' },
                    { value: 'month', label: 'This month' },
                    { value: 'year', label: 'This year' },
                    { value: 'custom', label: 'Custom' },
                  ]} />
              </div>

              {period === 'custom' && (
                <div className="p-4 border-b border-edge-base flex gap-3">
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
                </div>
              )}

              {loading ? <Loader /> : (
                <>
                  {type === 'sales' && <Table columns={salesColumns} data={data || []} empty={<Empty title="No sales in this period" />} />}
                  {type === 'purchases' && <Table columns={purchaseColumns} data={data || []} empty={<Empty title="No purchases in this period" />} />}
                  {type === 'inventory' && <Table columns={stockColumns} data={data || []} empty={<Empty title="No stock data" />} />}
                  {type === 'customers' && <Table columns={customerReportColumns} data={data || []} empty={<Empty title="No customer data" />} />}
                  {type === 'suppliers' && <Table columns={supplierReportColumns} data={data || []} empty={<Empty title="No supplier data" />} />}
                  {type === 'returns' && <Table columns={returnsColumns} data={data || []} empty={<Empty title="No returns in this period" />} />}
                  {type === 'financial' && summary && (
                    <div className="p-5 space-y-3 text-sm">
                      <div className="flex justify-between border-b border-edge-light pb-2"><span>Sales Revenue</span><span className="font-medium">Rs {formatMoney(summary.revenue.salesRevenue)}</span></div>
                      <div className="flex justify-between border-b border-edge-light pb-2"><span>Less: Returns</span><span>− Rs {formatMoney(summary.revenue.lessSalesReturns)}</span></div>
                      <div className="flex justify-between border-b border-edge-light pb-2"><span>Net Revenue</span><span className="font-medium">Rs {formatMoney(summary.revenue.netRevenue)}</span></div>
                      <div className="flex justify-between border-b border-edge-light pb-2"><span>COGS</span><span>− Rs {formatMoney(summary.cost.netCogs)}</span></div>
                      <div className="flex justify-between border-b border-edge-light pb-2 font-semibold"><span>Gross Profit</span><span className="text-emerald-600">Rs {formatMoney(summary.grossProfit)}</span></div>
                      <div className="flex justify-between border-b border-edge-light pb-2"><span>Operating Expenses</span><span>− Rs {formatMoney(summary.totalOperatingExpenses)}</span></div>
                      <div className="flex justify-between pt-2 text-base font-bold"><span>Net Profit</span><span className={summary.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}>Rs {formatMoney(summary.netProfit)}</span></div>
                    </div>
                  )}
                  {type === 'daily' && data && (
                    <div className="p-5 grid grid-cols-2 gap-4 text-sm">
                      <div><p className="text-xs text-ink-secondary">Sales</p><p className="text-lg font-bold">Rs {formatMoney(data.sales?.total)}</p><p className="text-xs text-ink-muted">{data.sales?.count} invoices</p></div>
                      <div><p className="text-xs text-ink-secondary">Purchases</p><p className="text-lg font-bold">Rs {formatMoney(data.purchases?.total)}</p><p className="text-xs text-ink-muted">{data.purchases?.count} purchases</p></div>
                      <div><p className="text-xs text-ink-secondary">Expenses</p><p className="text-lg font-bold text-danger">Rs {formatMoney(data.expenses?.total)}</p><p className="text-xs text-ink-muted">{data.expenses?.count} entries</p></div>
                      <div><p className="text-xs text-ink-secondary">Returns</p><p className="text-lg font-bold text-amber-600">Rs {formatMoney(data.salesReturns?.total)}</p><p className="text-xs text-ink-muted">{data.salesReturns?.count} returns</p></div>
                      <div><p className="text-xs text-ink-secondary">Cash In</p><p className="text-lg font-bold text-emerald-600">Rs {formatMoney(data.cashIn)}</p></div>
                      <div><p className="text-xs text-ink-secondary">Cash Out</p><p className="text-lg font-bold text-red-600">Rs {formatMoney(data.cashOut)}</p></div>
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Hidden Print Component */}
      <div className="fixed -left-[9999px] top-0">
        {!loading && (
          <ReportsPrint ref={printRef} data={buildPrintData() as any} />
        )}
      </div>
    </div>
  );
}