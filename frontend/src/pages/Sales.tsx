import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, MoreVertical, Eye, Printer, Undo2, Download,
} from 'lucide-react';
import { api, unwrap } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Button, Card, Input, Select, Table, Badge, Pagination, Empty, Dropdown,
} from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { formatMoney, formatDateTime } from '../lib/format';
import { exportCSV, csvFilename } from '../lib/csv';
import type { Column } from '../components/ui';

export default function Sales() {
  const nav = useNavigate();
  const toast = useToast();
  const [data, setData] = useState<any>({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/sales', { params: { search, paymentMethod: method, page, pageSize: 20 } })
      .then((r) => setData(unwrap(r)))
      .finally(() => setLoading(false));
  }, [page, search, method]);

  const handleExport = () => {
    exportCSV(data.items, [
      { key: 'invoiceNumber', header: 'Invoice #' },
      { key: 'customer', header: 'Customer', value: (r: any) => r.customer?.name || 'Walk-in' },
      { key: 'saleDate', header: 'Date & Time', value: (r: any) => formatDateTime(r.saleDate) },
      { key: 'items', header: 'Items', value: (r: any) => r.items.length },
      { key: 'total', header: 'Total' },
      { key: 'returns', header: 'Returns', value: (r: any) => (r.salesReturns || []).reduce((s: number, x: any) => s + x.total, 0) },
      { key: 'net', header: 'Net Total', value: (r: any) => {
        const returns = (r.salesReturns || []).reduce((s: number, x: any) => s + x.total, 0);
        return r.total - returns;
      }},
      { key: 'paid', header: 'Paid' },
      { key: 'due', header: 'Due' },
      { key: 'paymentMethod', header: 'Method' },
    ], csvFilename('sales'));
    toast.success('Exported');
  };

  // ============================================
  // TABLE COLUMNS — Compact + Single-line
  // ============================================
  const columns: Column<any>[] = [
    // ============ INVOICE # ============
    {
      key: 'inv',
      header: 'Invoice #',
      render: (r) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="font-mono text-xs font-medium text-ink-primary">
            {r.invoiceNumber}
          </span>
          {(r.salesReturns || []).length > 0 && (
            <Badge variant="amber">
              <Undo2 className="w-3 h-3 inline mr-0.5" />
              {r.salesReturns.length}
            </Badge>
          )}
        </div>
      ),
    },

    // ============ CUSTOMER (fixed min-width) ============
    {
      key: 'customer',
      header: 'Customer',
      render: (r) => (
        <span className="text-sm text-ink-primary whitespace-nowrap">
          {r.customer?.name || 'Walk-in'}
        </span>
      ),
    },

    // ============ DATE ============
    {
      key: 'date',
      header: 'Date & Time',
      render: (r) => (
        <span className="text-xs text-ink-secondary whitespace-nowrap">
          {formatDateTime(r.saleDate)}
        </span>
      ),
    },

    // ============ ITEMS ============
    {
      key: 'items',
      header: 'Items',
      align: 'center',
      render: (r) => (
        <span className="text-sm text-ink-primary whitespace-nowrap">
          {r.items.length}
        </span>
      ),
    },

    // ============ TOTAL ============
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (r) => (
        <span className="text-sm text-ink-primary whitespace-nowrap">
          Rs {formatMoney(r.total)}
        </span>
      ),
    },

    // ============ RETURNS ============
    {
      key: 'returns',
      header: 'Returns',
      align: 'right',
      render: (r) => {
        const returns = (r.salesReturns || []).reduce(
          (s: number, x: any) => s + x.total,
          0,
        );
        if (returns === 0) {
          return <span className="text-ink-muted text-xs">—</span>;
        }
        return (
          <span className="text-sm font-medium text-rose-600 whitespace-nowrap">
            − Rs {formatMoney(returns)}
          </span>
        );
      },
    },

    // ============ NET TOTAL ============
    {
      key: 'netTotal',
      header: 'Net Total',
      align: 'right',
      render: (r) => {
        const returns = (r.salesReturns || []).reduce(
          (s: number, x: any) => s + x.total,
          0,
        );
        const net = r.total - returns;
        return (
          <span className="text-sm font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">
            Rs {formatMoney(net)}
          </span>
        );
      },
    },

    // ============ PAID ============
    {
      key: 'paid',
      header: 'Paid',
      align: 'right',
      render: (r) => (
        <span className="text-sm text-emerald-600 whitespace-nowrap">
          Rs {formatMoney(r.paid)}
        </span>
      ),
    },

    // ============ DUE ============
    {
      key: 'due',
      header: 'Due',
      align: 'right',
      render: (r) => {
        const returns = (r.salesReturns || []).reduce(
          (s: number, x: any) => s + x.total,
          0,
        );
        const netDue = Math.max(r.due - returns, 0);
        if (netDue === 0) {
          return <span className="text-ink-muted text-xs">—</span>;
        }
        return (
          <span className="text-sm font-medium text-amber-600 whitespace-nowrap">
            Rs {formatMoney(netDue)}
          </span>
        );
      },
    },

    // ============ METHOD ============
    {
      key: 'method',
      header: 'Method',
      render: (r) => (
        <Badge variant="blue">
          <span className="whitespace-nowrap">{r.paymentMethod}</span>
        </Badge>
      ),
    },

    // ============ STATUS ============
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <Badge variant={r.status === 'COMPLETED' ? 'green' : 'gray'} dot>
          <span className="whitespace-nowrap">{r.status}</span>
        </Badge>
      ),
    },

    // ============ ACTIONS ============
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <Dropdown
          trigger={
            <button className="p-1 text-ink-muted hover:text-ink-primary rounded hover:bg-surface-hover">
              <MoreVertical className="w-4 h-4" />
            </button>
          }
        >
          <Dropdown.Item icon={<Eye className="w-3.5 h-3.5" />} onClick={() => nav(`/sales/${r.id}`)}>
            View
          </Dropdown.Item>
          <Dropdown.Item icon={<Printer className="w-3.5 h-3.5" />} onClick={() => nav(`/sales/${r.id}?print=1`)}>
            Print
          </Dropdown.Item>
          <Dropdown.Item icon={<Undo2 className="w-3.5 h-3.5" />} onClick={() => nav(`/returns?type=SALES&saleId=${r.id}`)}>
            Return
          </Dropdown.Item>
        </Dropdown>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-[1800px] mx-auto">
      <PageHeader
        title="Sales"
        subtitle={`${data.total} invoices`}
        actions={
          <>
            <Button variant="outline" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExport}>
              Export CSV
            </Button>
            <Button icon={<Plus className="w-3.5 h-3.5" />} onClick={() => nav('/pos')}>
              New Sale
            </Button>
          </>
        }
      />

      <Card padding="none" className="mb-4">
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            placeholder="Search invoice, customer…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            leftIcon={<Search className="w-3.5 h-3.5" />}
          />
          <Select
            value={method}
            onChange={(e) => {
              setMethod(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Payment Methods</option>
            <option value="CASH">Cash</option>
            <option value="BANK">Bank</option>
            <option value="CARD">Card</option>
            <option value="CREDIT">Credit</option>
            <option value="MIXED">Mixed</option>
          </Select>
        </div>
      </Card>

      {/* Table with horizontal scroll on small screens */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table
            columns={columns}
            data={data.items}
            loading={loading}
            empty={<Empty title="No sales yet" />}
          />
        </div>
        {data.total > 20 && (
          <Pagination page={page} total={data.total} pageSize={20} onChange={setPage} />
        )}
      </Card>
    </div>
  );
}