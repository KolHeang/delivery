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

export default function EditZonePage() {
  const router = useRouter();
  const params = useParams();
  const { lang, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', branch: 'EBS Express', active: true });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }

    const load = async () => {
      try {
        const res = await api.get(`/zones/${params.id}`);
        const zone = res.data;
        if (zone) {
          setForm({
            name: zone.name || '',
            price: zone.price !== undefined && zone.price !== null ? String(zone.price) : '',
            branch: zone.branch || 'EBS Express',
            active: zone.active ?? true,
          });
        }
      } catch {
        alert('Failed to load zone details');
        router.push('/setting/zone_type');
      }
      setLoading(false);
    };
    load();
  }, [params.id, router]);

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
      await api.patch(`/zones/${params.id}`, payload);
      router.push('/setting/zone_type');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating zone');
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('editZone') || 'Edit Zone'} subtitle={t('loading')} />
        <div className="loading-wrapper"><div className="spinner" /></div>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('editZone') || 'Edit Zone'} subtitle={lang === 'km' ? 'កែប្រែព័ត៌មានតំបន់ដឹកជញ្ជូន' : 'Update delivery zone'} />
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
              <span className="card-title" style={{ fontSize: 16, fontWeight: 700 }}>{t('editZone') || 'Edit Zone'}</span>
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
