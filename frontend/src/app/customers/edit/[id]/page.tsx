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
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const f = (k: string) => (e: any) => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    if (errors[k]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[k];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) {
      errs.name = 'សូមបំពេញឈ្មោះអតិថិជន';
    }
    if (!form.phone.trim()) {
      errs.phone = 'សូមបំពេញលេខទូរស័ព្ទ';
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = 'សូមបំពេញអ៊ីម៉ែលត្រឹមត្រូវ';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setErrors({});
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
        <Topbar title={t('editCustomer')} subtitle="កែប្រែ និងធ្វើបច្ចុប្បន្នភាពព័ត៌មានអតិថិជន" />
        <div className="page-content">
          <div className="card">
            <div className="card-header"><span className="card-title">{t('editCustomer')}</span></div>
            <div className="card-body">
              <form onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label className="form-label">{t('name')} <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                    value={form.name}
                    onChange={f('name')}
                    placeholder="e.g. Sok Dara"
                  />
                  {errors.name && <div className="form-error-text">{errors.name}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">{t('phone')} <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                    value={form.phone}
                    onChange={f('phone')}
                    placeholder="e.g. 012-345-678"
                  />
                  {errors.phone && <div className="form-error-text">{errors.phone}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">{t('email')}</label>
                  <input
                    type="email"
                    className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                    value={form.email}
                    onChange={f('email')}
                    placeholder="e.g. customer@example.com"
                  />
                  {errors.email && <div className="form-error-text">{errors.email}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">{t('address')}</label>
                  <input
                    className="form-control"
                    value={form.address}
                    onChange={f('address')}
                    placeholder="Street, Sangkat, Khan, Province"
                  />
                </div>
                
                <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-cancel"
                    style={{ background: '#dc2626', color: '#ffffff', border: '1px solid #dc2626', fontWeight: 700 }}
                    onClick={() => router.push('/customers')}
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ background: '#2563eb', color: '#ffffff', border: '1px solid #2563eb', fontWeight: 700 }}
                    disabled={saving}
                  >
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
