'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    
    const load = async () => {
      try {
        const res = await api.get(`/customers/${params.id}`);
        const c = res.data;
        if (c) {
          setForm({ name: c.name || '', phone: c.phone || '', email: c.email || '', address: c.address || '' });
        }
      } catch (err) {
        alert('Failed to load customer details');
        router.push('/customers');
      }
      setLoading(false);
    };
    load();
  }, [params.id, router]);

  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/customers/${params.id}`, form);
      router.push('/customers');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating customer');
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('editCustomer')} subtitle="Loading data..." />
        <div className="loading-wrapper"><div className="spinner" /></div>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('editCustomer')} subtitle="Update customer profile" />
        <div className="page-content">
          <div className="card">
            <div className="card-header"><span className="card-title">👥 {t('editCustomer')}</span></div>
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
