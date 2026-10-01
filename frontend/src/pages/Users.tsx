import { useEffect, useState } from 'react';
import { Plus, MoreVertical, Edit, UserCheck, UserX, Shield } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, Card, Table, Badge, Empty, Dropdown, Modal, Input, Select, StatCard } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import type { Column } from '../components/ui';

export default function Users() {
  const toast = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [showForm, setShowForm] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/users').then((r) => setUsers(unwrap(r))),
      api.get('/users/roles').then((r) => setRoles(unwrap(r))),
    ]).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const toggleActive = async (u: any) => {
    try {
      await api.post(`/users/${u.id}/toggle`);
      toast.success(u.active ? 'User deactivated' : 'User activated');
      load();
    } catch (e: any) { toast.error('Failed', e.response?.data?.message); }
  };

  const columns: Column<any>[] = [
    { key: 'user', header: 'User', render: (r) => (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center font-semibold text-sm">
          {r.fullName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium text-ink-primary">{r.fullName}</p>
          <p className="text-xs text-ink-secondary">@{r.username}</p>
        </div>
      </div>
    )},
    { key: 'email', header: 'Email', render: (r) => r.email || '—' },
    { key: 'role', header: 'Role', render: (r) => <Badge variant="indigo">{r.role}</Badge> },
    { key: 'status', header: 'Status', render: (r) => (
      <Badge variant={r.active ? 'green' : 'gray'} dot>{r.active ? 'Active' : 'Inactive'}</Badge>
    )},
    { key: 'actions', header: '', align: 'right', render: (r) => (
      <Dropdown trigger={<button className="p-1 text-ink-muted hover:text-ink-primary rounded hover:bg-surface-hover"><MoreVertical className="w-4 h-4" /></button>}>
        <Dropdown.Item icon={<Edit className="w-3.5 h-3.5" />} onClick={() => setShowForm(r)}>Edit</Dropdown.Item>
        <Dropdown.Item icon={r.active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
          onClick={() => toggleActive(r)}>
          {r.active ? 'Deactivate' : 'Activate'}
        </Dropdown.Item>
      </Dropdown>
    )},
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Users & Roles" subtitle={`${users.length} users`}
        actions={<Button icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowForm({})}>Add User</Button>} />

      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatCard label="Total Users" value={users.length} icon={<Shield className="w-4 h-4" />} />
        <StatCard label="Active" value={users.filter((u) => u.active).length} accent="success" />
        <StatCard label="Roles" value={roles.length} accent="gray" />
      </div>

      <Card padding="none">
        <Table columns={columns} data={users} loading={loading} empty={<Empty title="No users yet" />} />
      </Card>

      <UserForm user={showForm} roles={roles} onClose={() => setShowForm(null)} onSaved={() => { setShowForm(null); load(); }} />
    </div>
  );
}

function UserForm({ user, roles, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (user) {
      setForm(user.id ? { ...user, password: '' } : {
        username: '', password: '', fullName: '', email: '', phone: '',
        roleId: roles[0]?.id || '', active: true,
      });
    }
  }, [user, roles]);

  const submit = async () => {
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (!payload.password) delete payload.password;
      if (form.id) await api.put(`/users/${form.id}`, payload);
      else await api.post('/users', payload);
      toast.success(form.id ? 'User updated' : 'User created');
      onSaved();
    } catch (e: any) { toast.error('Failed', e.response?.data?.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={!!user} onClose={onClose} title={form.id ? 'Edit User' : 'Add User'} size="md"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving} disabled={!form.username || !form.fullName || (!form.id && !form.password)}>{form.id ? 'Update' : 'Create'}</Button></>}>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Username *" value={form.username || ''} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <Input label={form.id ? 'Password (blank = keep)' : 'Password *'} type="password"
          value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <Input label="Full Name *" value={form.fullName || ''} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <Input label="Email" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Phone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Select label="Role *" value={form.roleId || ''} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
          <option value="">Select role</option>
          {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </Select>
        <div className="col-span-2">
          <Select label="Status" value={form.active ? '1' : '0'} onChange={(e) => setForm({ ...form, active: e.target.value === '1' })}>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </Select>
        </div>
      </div>
    </Modal>
  );
}