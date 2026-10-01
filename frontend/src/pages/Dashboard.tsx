import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, TrendingUp, TrendingDown, Package, AlertTriangle,
  DollarSign, Users, ShoppingBag, Plus, ArrowRight,
} from 'lucide-react';
import { api, unwrap } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, StatCard, Button, Table, Badge, Empty, Loader } from '../components/ui';
import { SalesTrendChart } from '../components/charts';
import { formatMoney, formatDateTime } from '../lib/format';
import type { Column } from '../components/ui';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);

  useEffect(() => {
    api.get('/dashboard').then((r) => setData(unwrap(r)));
    api.get('/reports/trend', { params: { days: 30 } }).then((r) => setTrend(unwrap(r)));
  }, []);

  if (!data) return <div className="p-6"><Loader label="Loading dashboard…" /></div>;

  const typeColor: Record<string, any> = {
    SALE: 'green', PURCHASE: 'blue', EXPENSE: 'red', PAYMENT: 'amber', SALES_RETURN: 'gray',
  };

  const txnColumns: Column<any>[] = [
    { key: 'type', header: 'Type', render: (r) => <Badge variant={typeColor[r.type]}>{r.type}</Badge> },
    { key: 'ref', header: 'Reference', render: (r) => <span className="font-mono text-xs">{r.reference}</span> },
    { key: 'party', header: 'Party', render: (r) => r.party },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className="font-medium">Rs {formatMoney(r.amount)}</span> },
    { key: 'date', header: 'Date', render: (r) => <span className="text-xs text-ink-secondary">{formatDateTime(r.date)}</span> },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Dashboard"
        subtitle={new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        actions={
          <>
            <Link to="/pos"><Button icon={<Plus className="w-3.5 h-3.5" />}>New Sale</Button></Link>
            <Link to="/purchases"><Button variant="outline" icon={<Plus className="w-3.5 h-3.5" />}>New Purchase</Button></Link>
            <Link to="/products"><Button variant="outline" icon={<Plus className="w-3.5 h-3.5" />}>Add Product</Button></Link>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Today's Sales" value={`Rs ${formatMoney(data.todaySales)}`} accent="brand" icon={<DollarSign className="w-4 h-4" />} />
        <StatCard label="Today's Gross Profit" value={`Rs ${formatMoney(data.todayGrossProfit || data.todayProfit)}`} accent="success" icon={<TrendingUp className="w-4 h-4" />} hint="Sales − COGS" />
        <StatCard label="Today's Expenses" value={`Rs ${formatMoney(data.todayExpenses)}`} accent="warning" icon={<TrendingDown className="w-4 h-4" />} />
        <StatCard label="Today's Net Profit" value={`Rs ${formatMoney(data.todayProfit)}`} accent={data.todayProfit >= 0 ? 'success' : 'danger'} icon={<Wallet className="w-4 h-4" />} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Cash in Hand" value={`Rs ${formatMoney(data.cashInHand)}`} accent="gray" />
        <StatCard label="Customer Receivables" value={`Rs ${formatMoney(data.receivables)}`} accent="warning" />
        <StatCard label="Supplier Payables" value={`Rs ${formatMoney(data.payables)}`} accent="danger" />
        <StatCard label="Today's Purchases" value={`Rs ${formatMoney(data.todayPurchases)}`} accent="gray" />
        <StatCard label="Low Stock Items" value={data.lowStockCount} accent={data.lowStockCount > 0 ? 'danger' : 'success'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2">
          <Card.Header title="Sales & Profit Trend" subtitle="Last 30 days" action={<div className="text-xs text-ink-secondary">Blue = Sales · Green = Profit</div>} />
          <SalesTrendChart data={trend} />
        </Card>

        <Card>
          <Card.Header title="Sales Overview" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-ink-secondary">Today</span><span className="font-medium">Rs {formatMoney(data.salesOverview?.today)}</span></div>
            <div className="flex justify-between"><span className="text-ink-secondary">Last 7 Days</span><span className="font-medium">Rs {formatMoney(data.salesOverview?.last7Days)}</span></div>
            <div className="flex justify-between"><span className="text-ink-secondary">Last 30 Days</span><span className="font-medium">Rs {formatMoney(data.salesOverview?.last30Days)}</span></div>
          </div>
          <div className="mt-4 pt-4 border-t border-edge-base space-y-1.5">
            <Link to="/pos" className="flex items-center justify-between p-2 rounded-md hover:bg-surface-hover text-sm text-ink-primary transition-colors">
              <span className="flex items-center gap-2"><ShoppingBag className="w-3.5 h-3.5" /> New Sale</span>
              <ArrowRight className="w-3.5 h-3.5 text-ink-muted" />
            </Link>
            <Link to="/customers" className="flex items-center justify-between p-2 rounded-md hover:bg-surface-hover text-sm text-ink-primary transition-colors">
              <span className="flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Customers</span>
              <ArrowRight className="w-3.5 h-3.5 text-ink-muted" />
            </Link>
            <Link to="/expenses" className="flex items-center justify-between p-2 rounded-md hover:bg-surface-hover text-sm text-ink-primary transition-colors">
              <span className="flex items-center gap-2"><TrendingDown className="w-3.5 h-3.5" /> Add Expense</span>
              <ArrowRight className="w-3.5 h-3.5 text-ink-muted" />
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2" padding="none">
          <div className="p-4 border-b border-edge-base"><h3 className="text-sm font-semibold text-ink-primary">Recent Transactions</h3></div>
          <Table columns={txnColumns} data={data.recentTransactions || []} empty={<Empty title="No transactions yet" />} />
        </Card>

        <Card padding="none">
          <div className="p-4 border-b border-edge-base flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-primary">Low Stock</h3>
            <AlertTriangle className="w-4 h-4 text-warning" />
          </div>
          {!data.lowStock || data.lowStock.length === 0 ? (
            <Empty title="All products well stocked" icon={<Package className="w-6 h-6 text-ink-muted" />} />
          ) : (
            <div className="p-3 space-y-1">
              {data.lowStock.map((p: any) => (
                <Link key={p.id} to={`/products/${p.id}`} className="flex justify-between items-center p-2 rounded hover:bg-surface-hover">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-primary truncate">{p.name}</p>
                    <p className="text-xs text-ink-secondary truncate">{p.model || '—'}</p>
                  </div>
                  <Badge variant={p.quantity <= 0 ? 'red' : 'amber'}>{p.quantity} left</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}