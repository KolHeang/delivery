'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

export default function CreateCustomerPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); }
  }, [router]);

  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/customers', form);
      router.push('/customers');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creating customer');
    }
    setSaving(false);
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('addCustomer')} subtitle="Create a new customer profile" />
        <div className="page-content">
          <div className="card">
            <div className="card-header"><span className="card-title">👥 {t('addCustomer')}</span></div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">{t('name')} <span>*</span></label>
                  <input className="form-control" value={form.name} onChange={f('name')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('phone')} <span>*</span></label>
                  <input className="form-control" value={form.phone} onChange={f('phone')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('email')}</label>
                  <input type="email" className="form-control" value={form.email} onChange={f('email')} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('address')}</label>
                  <input className="form-control" value={form.address} onChange={f('address')} />
                </div>
                
                <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-outline" onClick={() => router.push('/customers')}>
                    {t('cancel')}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? t('saving') : t('save')}
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
