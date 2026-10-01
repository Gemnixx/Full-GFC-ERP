import { useEffect, useState } from 'react';
import { Save, Building2, Receipt, Palette, Shield } from 'lucide-react';
import { api, unwrap } from '../api/client';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, Card, Input, Tabs, Loader } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { useTheme } from '../contexts/ThemeContext';

type Tab = 'general' | 'pos' | 'appearance';

export default function Settings() {
  const toast = useToast();
  const { theme, toggle } = useTheme();
  const [tab, setTab] = useState<Tab>('general');
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/settings').then((r) => setForm(unwrap(r)));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      // ✅ Only send fields that have values (skip null/empty)
      const payload: any = {};

      if (form.outletName) payload.outletName = form.outletName;
      if (form.address) payload.address = form.address;
      if (form.phone) payload.phone = form.phone;
      if (form.email) payload.email = form.email;
      if (form.invoicePrefix) payload.invoicePrefix = form.invoicePrefix;
      if (form.invoiceNextNum) payload.invoiceNextNum = Number(form.invoiceNextNum);
      if (form.receiptFooter) payload.receiptFooter = form.receiptFooter;
      if (form.currency) payload.currency = form.currency;
      if (form.taxEnabled !== undefined) payload.taxEnabled = Boolean(form.taxEnabled);
      if (form.taxPercent !== undefined) payload.taxPercent = Number(form.taxPercent);
      if (form.lowStockAlerts !== undefined) payload.lowStockAlerts = Boolean(form.lowStockAlerts);

      const res = await api.put('/settings', payload);
      setForm(unwrap(res)); // refresh form with saved data
      toast.success('Settings saved');
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to save';
      const errors = e.response?.data?.errors;
      console.error('Save error:', e.response?.data);
      if (errors) {
        const errText = Array.isArray(errors)
          ? errors.map((x: any) => `${x.path}: ${x.message}`).join(', ')
          : JSON.stringify(errors);
        toast.error('Validation failed', errText);
      } else {
        toast.error('Failed', msg);
      }
    } finally { setSaving(false); }
  };

  if (!form) return <div className="p-6"><Loader /></div>;

  return (
    <div className="p-6 max-w-[1000px] mx-auto">
      <PageHeader title="Settings" subtitle="Configure your outlet"
        actions={<Button icon={<Save className="w-3.5 h-3.5" />} onClick={save} loading={saving}>Save Changes</Button>} />

      <Card padding="none">
        <div className="p-4 border-b border-edge-base">
          <Tabs value={tab} onChange={(v) => setTab(v as Tab)}
            options={[
              { value: 'general', label: 'General' },
              { value: 'pos', label: 'POS & Receipt' },
              { value: 'appearance', label: 'Appearance' },
            ]} />
        </div>

        <div className="p-6">
          {tab === 'general' && (
            <div>
              <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-ink-muted" /> Outlet Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Outlet Name" value={form.outletName || ''}
                  onChange={(e) => setForm({ ...form, outletName: e.target.value })} />
                <Input label="Phone" value={form.phone || ''}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <Input label="Email" type="email" value={form.email || ''}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Input label="Currency" value={form.currency || ''}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })} />
                <div className="col-span-2">
                  <Input label="Address" value={form.address || ''}
                    onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {tab === 'pos' && (
            <div>
              <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-2 mb-3">
                <Receipt className="w-4 h-4 text-ink-muted" /> Invoice Settings
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Invoice Prefix" value={form.invoicePrefix || ''}
                  onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })} />
                <Input label="Next Invoice Number" type="number"
                  value={form.invoiceNextNum ?? 1}
                  onChange={(e) => setForm({ ...form, invoiceNextNum: parseInt(e.target.value) || 1 })} />
              </div>
              <div className="mt-4">
                <Input label="Receipt Footer" value={form.receiptFooter || ''}
                  onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
                  placeholder="e.g. Thank you for your business!" />
              </div>
            </div>
          )}

          {tab === 'appearance' && (
            <div>
              <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-2 mb-4">
                <Palette className="w-4 h-4 text-ink-muted" /> Theme
              </h3>
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <button onClick={() => theme === 'dark' && toggle()}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${theme === 'light' ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40' : 'border-edge-base'}`}>
                  <div className="w-full h-16 rounded bg-white border border-gray-200 mb-2" />
                  <p className="text-sm font-medium">Light Mode</p>
                </button>
                <button onClick={() => theme === 'light' && toggle()}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${theme === 'dark' ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40' : 'border-edge-base'}`}>
                  <div className="w-full h-16 rounded bg-slate-900 border border-slate-700 mb-2" />
                  <p className="text-sm font-medium">Dark Mode</p>
                </button>
              </div>
              <div className="mt-6 pt-4 border-t border-edge-base">
                <h3 className="text-sm font-semibold text-ink-primary flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-ink-muted" /> Security
                </h3>
                <p className="text-sm text-ink-secondary">
                  User management is on the <a href="/users" className="text-brand-600 hover:underline">Users & Roles</a> page.
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}