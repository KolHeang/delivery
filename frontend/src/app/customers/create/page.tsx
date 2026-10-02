'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

import FormField from '@/components/ui/FormField';

export default function CreateCustomerPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); }
  }, [router]);

  const f = (k: string) => (e: any) => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    if (errors[k]) {
      setErrors(prev => ({ ...prev, [k]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = lang === 'km' ? 'សូមបញ្ចូលឈ្មោះ' : 'Please enter name';
    if (!form.phone.trim()) newErrors.phone = lang === 'km' ? 'សូមបញ្ចូលលេខទូរស័ព្ទ' : 'Please enter phone number';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

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
              <form noValidate onSubmit={handleSubmit}>
                <FormField label={t('name')} required error={errors.name}>
                  <input className="form-control" value={form.name} onChange={f('name')} placeholder="Customer name..." />
                </FormField>
                <FormField label={t('phone')} required error={errors.phone}>
                  <input className="form-control" value={form.phone} onChange={f('phone')} placeholder="Phone number..." />
                </FormField>
                <FormField label={t('email')} error={errors.email}>
                  <input type="email" className="form-control" value={form.email} onChange={f('email')} placeholder="Email address..." />
                </FormField>
                <FormField label={t('address')} error={errors.address}>
                  <input className="form-control" value={form.address} onChange={f('address')} placeholder="Address..." />
                </FormField>
                
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
