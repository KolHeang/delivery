'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

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
      [k]: e.target.value
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
        active: form.active
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
        <Topbar title={t('addZone') || 'Add Zone'} subtitle="Create a new delivery zone" />
        <div className="page-content">
          <div className="card">
            <div className="card-header"><span className="card-title">📖 {t('addZone') || 'Add Zone'}</span></div>
            <div className="card-body">
              <form onSubmit={handleSubmit} noValidate>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 'bold' }}>
                      {lang === 'km' ? 'ឈ្មោះតំបន់' : 'Zone Name'} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                      value={form.name}
                      onChange={f('name')}
                      placeholder="e.g. Phnom Penh Center"
                    />
                    {errors.name && <div className="form-error-text">{errors.name}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 'bold' }}>
                      {lang === 'km' ? 'តម្លៃសេវាដឹក ($)' : 'Delivery Fee ($)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control"
                      value={form.price}
                      onChange={f('price')}
                      placeholder="e.g. 1.25"
                    />
                  </div>
                </div>

                <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-cancel" onClick={() => router.push('/setting/zone_type')}>
                    {lang === 'km' ? 'បោះបង់' : 'Cancel'}
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={saving}
                    style={{
                      padding: '8px 24px',
                      fontWeight: 'bold',
                      borderRadius: 6,
                    }}
                  >
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
