'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

import FormField from '@/components/ui/FormField';

const TYPES = ['motorbike', 'car', 'van', 'truck', 'tuk-tuk'];
const TYPE_ICONS: Record<string, string> = { motorbike: '🏍️', car: '🚗', van: '🚐', truck: '🚚', 'tuk-tuk': '🛺' };

export default function CreateVehiclePage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ plate: '', type: 'motorbike', brand: '', model: '', year: new Date().getFullYear(), status: 'active' });

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); }
  }, [router]);

  const f = (k: string) => (e: any) => {
    setForm(p => ({ ...p, [k]: k === 'year' ? parseInt(e.target.value) : e.target.value }));
    if (errors[k]) {
      setErrors(prev => ({ ...prev, [k]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!form.plate.trim()) newErrors.plate = lang === 'km' ? 'សូមបញ្ចូលស្លាកលេខយានយន្ត' : 'Please enter plate number';
    if (!form.brand.trim()) newErrors.brand = lang === 'km' ? 'សូមបញ្ចូលម៉ាកយានយន្ត' : 'Please enter vehicle brand';
    if (!form.model.trim()) newErrors.model = lang === 'km' ? 'សូមបញ្ចូលម៉ូដែលយានយន្ត' : 'Please enter vehicle model';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      await api.post('/vehicles', form);
      router.push('/vehicles');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creating vehicle');
    }
    setSaving(false);
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('addVehicle')} subtitle={t('addVehicle')} />
        <div className="page-content">
          <div className="card">
            <div className="card-header"><span className="card-title">🚗 {t('addVehicle')}</span></div>
            <div className="card-body">
              <form noValidate onSubmit={handleSubmit}>
                <div className="form-row">
                  <FormField label={t('plateNumber')} required error={errors.plate}>
                    <input className="form-control" value={form.plate} onChange={f('plate')} placeholder="e.g. 2A-4532" />
                  </FormField>
                  <FormField label={t('vehicleType')} required>
                    <select className="form-control" value={form.type} onChange={f('type')}>
                      {TYPES.map(t => <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>)}
                    </select>
                  </FormField>
                </div>
                <div className="form-row">
                  <FormField label={t('brand')} required error={errors.brand}>
                    <input className="form-control" value={form.brand} onChange={f('brand')} placeholder="e.g. Honda" />
                  </FormField>
                  <FormField label={t('model')} required error={errors.model}>
                    <input className="form-control" value={form.model} onChange={f('model')} placeholder="e.g. Wave 110" />
                  </FormField>
                </div>
                <div className="form-row">
                  <FormField label={t('year')}>
                    <input type="number" min="2000" max="2030" className="form-control" value={form.year} onChange={f('year')} />
                  </FormField>
                  <FormField label={t('status')}>
                    <select className="form-control" value={form.status} onChange={f('status')}>
                      <option value="active">Active</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </FormField>
                </div>
                
                <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-outline" onClick={() => router.push('/vehicles')}>
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
