'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import FormField from '@/components/ui/FormField';
import { MdArrowBack, MdSave } from 'react-icons/md';

export default function CreateZonePage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', branch: 'EBS Express', active: true });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
  }, [router]);

  const f = (k: string) => (e: any) => {
    setForm(p => ({
      ...p,
      [k]: e.target.value,
    }));
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
    if (!form.name.trim()) {
      setErrors({ name: lang === 'km' ? 'សូមបំពេញឈ្មោះតំបន់' : 'Zone name is required' });
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        price: form.price ? parseFloat(form.price) : 0,
        branch: form.branch,
        active: form.active,
      };
      await api.post('/zones', payload);
      router.push('/setting/zone_type');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creating zone');
    }
    setSaving(false);
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('addZone') || 'Add Zone'} subtitle={lang === 'km' ? 'បង្កើតតំបន់ដឹកជញ្ជូនថ្មី' : 'Create a new delivery zone'} />
        <div className="page-content">
          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px' }}>
              <button
                type="button"
                onClick={() => router.push('/setting/zone_type')}
                className="btn btn-ghost btn-icon btn-sm"
                title={lang === 'km' ? 'ត្រឡប់ក្រោយ' : 'Back'}
              >
                <MdArrowBack size={18} />
              </button>
              <span className="card-title" style={{ fontSize: 16, fontWeight: 700 }}>{t('addZone') || 'Add Zone'}</span>
            </div>
            <div className="card-body" style={{ padding: '20px 24px' }}>
              <form onSubmit={handleSubmit} noValidate>
                <div className="form-row">
                  <FormField label={lang === 'km' ? 'ឈ្មោះតំបន់' : 'Zone Name'} required error={errors.name}>
                    <input
                      className="form-control"
                      value={form.name}
                      onChange={f('name')}
                      placeholder="e.g. Phnom Penh Center"
                    />
                  </FormField>
                  <FormField label={lang === 'km' ? 'តម្លៃសេវាដឹក ($)' : 'Delivery Fee ($)'}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control"
                      value={form.price}
                      onChange={f('price')}
                      placeholder="e.g. 1.25"
                    />
                  </FormField>
                </div>

                <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-cancel" onClick={() => router.push('/setting/zone_type')}>
                    {lang === 'km' ? 'បោះបង់' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    <MdSave size={17} />
                    {saving ? (lang === 'km' ? 'កំពុងរក្សា...' : 'Saving...') : (lang === 'km' ? 'រក្សាទុក' : 'Save')}
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
