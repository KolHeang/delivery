'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import FormField from '@/components/ui/FormField';
import { MdArrowBack, MdSave } from 'react-icons/md';

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const { lang, t } = useLanguage();
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
      } catch {
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
      errs.name = lang === 'km' ? 'សូមបំពេញឈ្មោះអតិថិជន' : 'Customer name is required';
    }
    if (!form.phone.trim()) {
      errs.phone = lang === 'km' ? 'សូមបំពេញលេខទូរស័ព្ទ' : 'Phone number is required';
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = lang === 'km' ? 'សូមបំពេញអ៊ីម៉ែលត្រឹមត្រូវ' : 'Please enter a valid email';
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
        <Topbar title={t('editCustomer')} subtitle={t('loading')} />
        <div className="loading-wrapper"><div className="spinner" /></div>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('editCustomer')} subtitle={lang === 'km' ? 'កែប្រែ និងធ្វើបច្ចុប្បន្នភាពព័ត៌មានអតិថិជន' : 'Update customer details'} />
        <div className="page-content">
          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px' }}>
              <button
                type="button"
                onClick={() => router.push('/customers')}
                className="btn btn-ghost btn-icon btn-sm"
                title={lang === 'km' ? 'ត្រឡប់ក្រោយ' : 'Back'}
              >
                <MdArrowBack size={18} />
              </button>
              <span className="card-title" style={{ fontSize: 16, fontWeight: 700 }}>{t('editCustomer')}</span>
            </div>
            <div className="card-body" style={{ padding: '20px 24px' }}>
              <form onSubmit={handleSubmit} noValidate>
                <div className="form-row">
                  <FormField label={t('name')} required error={errors.name}>
                    <input
                      className="form-control"
                      value={form.name}
                      onChange={f('name')}
                      placeholder="e.g. Sok Dara"
                    />
                  </FormField>
                  <FormField label={t('phone')} required error={errors.phone}>
                    <input
                      className="form-control"
                      value={form.phone}
                      onChange={f('phone')}
                      placeholder="e.g. 012-345-678"
                    />
                  </FormField>
                </div>
                <div className="form-row">
                  <FormField label={t('email')} error={errors.email}>
                    <input
                      type="email"
                      className="form-control"
                      value={form.email}
                      onChange={f('email')}
                      placeholder="e.g. customer@example.com"
                    />
                  </FormField>
                  <FormField label={t('address')}>
                    <input
                      className="form-control"
                      value={form.address}
                      onChange={f('address')}
                      placeholder="Street, Sangkat, Khan, Province"
                    />
                  </FormField>
                </div>

                <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-cancel"
                    onClick={() => router.push('/customers')}
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    <MdSave size={17} />
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
