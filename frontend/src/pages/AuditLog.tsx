import { useEffect, useState } from 'react';
import { Activity, Search, Download } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, Card, Input, Table, Badge, Pagination, Empty } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { formatDateTime } from '../lib/format';
import { exportCSV, csvFilename } from '../lib/csv';
import type { Column } from '../components/ui';

export default function AuditLog() {
  const toast = useToast();
  const [data, setData] = useState<any>({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/audit', { params: { entity, page, pageSize: 50 } })
      .then((r) => setData(unwrap(r))).finally(() => setLoading(false));
  }, [entity, page]);

  const handleExport = () => {
    exportCSV(data.items, [
      { key: 'createdAt', header: 'Date', value: (r: any) => formatDateTime(r.createdAt) },
      { key: 'user', header: 'User', value: (r: any) => r.user?.fullName || 'System' },
      { key: 'action', header: 'Action' },
      { key: 'entity', header: 'Entity' },
      { key: 'entityId', header: 'Entity ID' },
    ], csvFilename('audit-log'));
    toast.success('Exported');
  };

  const columns: Column<any>[] = [
    { key: 'date', header: 'Date & Time', render: (r) => <span className="text-xs text-ink-secondary">{formatDateTime(r.createdAt)}</span> },
    { key: 'user', header: 'User', render: (r) => r.user?.fullName || 'System' },
    { key: 'action', header: 'Action', render: (r) => (
      <Badge variant={
        r.action === 'CREATE' ? 'green' : r.action === 'UPDATE' ? 'blue' :
        r.action === 'DELETE' ? 'red' : r.action === 'LOGIN' ? 'purple' : 'gray'
      }>{r.action}</Badge>
    )},
    { key: 'entity', header: 'Entity', render: (r) => r.entity },
    { key: 'entityId', header: 'Entity ID', render: (r) => <span className="font-mono text-xs text-ink-secondary">{r.entityId?.slice(0, 12) || '—'}</span> },
    { key: 'ip', header: 'IP', render: (r) => <span className="text-xs text-ink-secondary">{r.ipAddress || '—'}</span> },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Audit Log" subtitle="Track all system activity"
        actions={<Button variant="outline" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExport}>Export</Button>} />

      <Card padding="none" className="mb-4">
        <div className="p-4">
          <Input placeholder="Filter by entity…" value={entity}
            onChange={(e) => { setEntity(e.target.value); setPage(1); }}
            leftIcon={<Search className="w-3.5 h-3.5" />} />
        </div>
      </Card>

      <Card padding="none">
        <Table columns={columns} data={data.items} loading={loading}
          empty={<Empty title="No audit entries yet" icon={<Activity className="w-6 h-6 text-ink-muted" />} />} />
        {data.total > 50 && <Pagination page={page} total={data.total} pageSize={50} onChange={setPage} />}
      </Card>
    </div>
  );
}