'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import { useTenant } from '@/lib/TenantContext';

export default function OrganisationSettingsPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { tenant, isTenant } = useTenant();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    website: '',
    address: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    const load = async () => {
      try {
        const res = await api.get('/settings/organisation');
        if (res.data) {
          const defaultName = (isTenant && (!res.data.name || res.data.name === 'EBS Digital Solutions'))
            ? (tenant?.companyName || res.data.name || '')
            : (res.data.name || '');

          setForm({
            name: defaultName,
            phone: res.data.phone || (tenant?.phone || ''),
            email: res.data.email || (tenant?.email || ''),
            website: res.data.website || '',
            address: res.data.address || '',
          });
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [router, tenant?.companyName, isTenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      await api.post('/settings/organisation', form);
      if (typeof window !== 'undefined') {
        const cacheKey = tenant?.subdomain ? `app-org-settings-${tenant.subdomain}` : 'app-org-settings';
        localStorage.setItem(cacheKey, JSON.stringify(form));
        localStorage.setItem('app-org-settings', JSON.stringify(form));
        window.dispatchEvent(new Event('org-settings-updated'));
      }
      setSuccessMsg(t('orgSavedSuccess'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      alert(lang === 'km' ? 'មិនអាចរក្សាទុកការកំណត់បានទេ' : 'Failed to save settings');
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="loading-wrapper"><div className="spinner" /></div>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('organizationSetting')} subtitle={t('organizationSubtitle')} />
        <div className="page-content">
          <div className="card">
            <div className="card-header"><span className="card-title">{t('organizationDetails')}</span></div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                {successMsg && (
                  <div className="badge badge-delivered" style={{ display: 'block', padding: 12, marginBottom: 16, textAlign: 'center', fontSize: 13 }}>
                    {successMsg}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">{t('companyName')} <span>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('orgPhone')} <span>*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('orgEmail')} <span>*</span></label>
                    <input
                      type="email"
                      className="form-control"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('orgWebsite')}</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.website}
                    onChange={e => setForm({ ...form, website: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('orgAddress')} <span>*</span></label>
                  <textarea
                    className="form-control"
                    rows={3}
                    style={{ resize: 'vertical' }}
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                    required
                  />
                </div>

                <div style={{ marginTop: 20, textAlign: 'right' }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? t('savingChanges') : t('saveChanges')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
