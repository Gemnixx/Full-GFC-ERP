import { useEffect, useState, useRef } from 'react';
import { Download, Printer } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, Button, Input, Loader, Tabs } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { ProfitLossPrint } from '../components/print/ProfitLossPrint';
import { printElement } from '../lib/print';
import { formatMoney } from '../lib/format';
import { exportCSV, csvFilename } from '../lib/csv';

type Period = 'today' | 'week' | 'month' | 'year' | 'custom';

export default function ProfitLoss() {
  const toast = useToast();
  const [data, setData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [period, setPeriod] = useState<Period>('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const buildParams = () => {
    const p: any = {};
    const now = new Date();
    if (period === 'today') {
      p.from = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      p.to = now.toISOString();
    } else if (period === 'week') {
      const s = new Date(); s.setDate(s.getDate() - 6); s.setHours(0, 0, 0, 0);
      p.from = s.toISOString(); p.to = now.toISOString();
    } else if (period === 'month') {
      const s = new Date(); s.setDate(1); s.setHours(0, 0, 0, 0);
      p.from = s.toISOString(); p.to = now.toISOString();
    } else if (period === 'year') {
      const s = new Date(now.getFullYear(), 0, 1);
      p.from = s.toISOString(); p.to = now.toISOString();
    } else {
      if (from) p.from = new Date(from).toISOString();
      if (to) p.to = new Date(to + 'T23:59:59').toISOString();
    }
    return p;
  };

  const periodLabel = () => {
    if (period === 'today') return 'Today';
    if (period === 'week') return 'This Week (Last 7 days)';
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
    setLoading(true);
    api.get('/reports/profit-loss', { params: buildParams() })
      .then((r) => setData(unwrap(r)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [period, from, to]);

  useEffect(() => {
    api.get('/settings').then((r) => setSettings(unwrap(r))).catch(() => {});
  }, []);

  const handleExport = () => {
    if (!data) return;
    const rows = [
      { section: 'Revenue', item: 'Sales Revenue', amount: data.revenue.salesRevenue },
      { section: 'Revenue', item: 'Less: Sales Returns', amount: -data.revenue.lessSalesReturns },
      { section: 'Revenue', item: 'Net Revenue', amount: data.revenue.netRevenue },
      { section: 'Cost', item: 'COGS', amount: -data.cost.costOfGoodsSold },
      { section: 'Cost', item: 'Less: Purchase Returns', amount: data.cost.lessPurchaseReturns },
      { section: 'Cost', item: 'Net COGS', amount: -data.cost.netCogs },
      { section: 'Profit', item: 'Gross Profit', amount: data.grossProfit },
      ...data.operatingExpenses.map((e: any) => ({ section: 'Expenses', item: e.category, amount: -e.amount })),
      { section: 'Profit', item: 'Net Profit', amount: data.netProfit },
    ];
    exportCSV(rows, [
      { key: 'section', header: 'Section' },
      { key: 'item', header: 'Item' },
      { key: 'amount', header: 'Amount' },
    ], csvFilename('profit-loss'));
    toast.success('Exported');
  };

  const handlePrint = () => {
    printElement(printRef.current);
  };

  if (loading || !data) return <div className="p-6"><Loader label="Calculating P&L…" /></div>;

  const Row = ({ label, value, bold, indent, negative }: any) => (
    <div className={`flex justify-between py-2 ${indent ? 'pl-4' : ''} ${bold ? 'font-semibold border-t border-edge-base' : ''}`}>
      <span className={bold ? 'text-ink-primary' : 'text-ink-secondary'}>{label}</span>
      <span className={value < 0 || negative ? 'text-red-600' : bold && value > 0 ? 'text-emerald-600' : 'text-ink-primary'}>
        {value < 0 ? '− ' : ''}Rs {formatMoney(Math.abs(value))}
      </span>
    </div>
  );

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="no-print">
        <PageHeader title="Profit & Loss" subtitle="Revenue, cost, and profitability analysis"
          actions={
            <>
              <Button variant="outline" icon={<Printer className="w-3.5 h-3.5" />} onClick={handlePrint}>Print</Button>
              <Button icon={<Download className="w-3.5 h-3.5" />} onClick={handleExport}>Export CSV</Button>
            </>
          } />

        <Card padding="none" className="mb-4">
          <div className="p-4 flex flex-wrap gap-3 items-center justify-between">
            <Tabs value={period} onChange={(v) => setPeriod(v as Period)} size="sm"
              options={[
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' },
                { value: 'year', label: 'This Year' },
                { value: 'custom', label: 'Custom' },
              ]} />
            {period === 'custom' && (
              <div className="flex gap-3">
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
              </div>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card>
            <p className="text-xs text-ink-secondary mb-1">Gross Profit</p>
            <p className="text-2xl font-bold text-emerald-600">Rs {formatMoney(data.grossProfit)}</p>
            <p className="text-xs text-ink-muted mt-1">Revenue − COGS</p>
          </Card>
          <Card>
            <p className="text-xs text-ink-secondary mb-1">Operating Expenses</p>
            <p className="text-2xl font-bold text-amber-600">Rs {formatMoney(data.totalOperatingExpenses)}</p>
          </Card>
          <Card>
            <p className="text-xs text-ink-secondary mb-1">Net Profit</p>
            <p className={`text-2xl font-bold ${data.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              Rs {formatMoney(data.netProfit)}
            </p>
          </Card>
        </div>

        <Card>
          <Card.Header title="Profit & Loss Statement" subtitle="For selected period" />
          <div className="space-y-1 text-sm">
            <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider pt-2">Revenue</h4>
            <Row label="Sales Revenue" value={data.revenue.salesRevenue} indent />
            <Row label="Less: Sales Returns" value={-data.revenue.lessSalesReturns} indent negative />
            <Row label="Net Revenue" value={data.revenue.netRevenue} bold />

            <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider pt-4">Cost of Goods Sold</h4>
            <Row label="Cost of Goods Sold" value={-data.cost.costOfGoodsSold} indent negative />
            <Row label="Less: Purchase Returns" value={data.cost.lessPurchaseReturns} indent />
            <Row label="Net COGS" value={-data.cost.netCogs} bold negative />

            <Row label="Gross Profit" value={data.grossProfit} bold />

            <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider pt-4">Operating Expenses</h4>
            {data.operatingExpenses.length === 0 ? (
              <p className="text-sm text-ink-muted pl-4 py-2">No expenses recorded</p>
            ) : data.operatingExpenses.map((e: any, i: number) => (
              <Row key={i} label={e.category} value={-e.amount} indent negative />
            ))}
            <Row label="Total Operating Expenses" value={-data.totalOperatingExpenses} bold negative />

            <div className={`flex justify-between py-3 mt-2 border-t-2 border-brand-500 ${data.netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
              <span className="text-base font-bold">NET PROFIT</span>
              <span className="text-base font-bold">{data.netProfit < 0 ? '− ' : ''}Rs {formatMoney(Math.abs(data.netProfit))}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Hidden Print Component */}
      <div className="fixed -left-[9999px] top-0">
        {data && (
          <ProfitLossPrint
            ref={printRef}
            data={{
              outletName: settings?.outletName || 'GFC Fans Outlet',
              outletAddress: settings?.address,
              outletPhone: settings?.phone,
              periodLabel: periodLabel(),
              generatedAt: new Date(),
              revenue: data.revenue,
              cost: data.cost,
              grossProfit: data.grossProfit,
              operatingExpenses: data.operatingExpenses,
              totalOperatingExpenses: data.totalOperatingExpenses,
              netProfit: data.netProfit,
              footer: settings?.receiptFooter,
            }}
          />
        )}
      </div>
    </div>
  );
}