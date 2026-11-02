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

const TYPES = ['motorbike', 'car', 'van', 'truck', 'tuk-tuk'];

export default function EditVehiclePage() {
  const router = useRouter();
  const params = useParams();
  const { lang, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ plate: '', type: 'motorbike', brand: '', model: '', year: new Date().getFullYear(), status: 'active' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }

    const load = async () => {
      try {
        const res = await api.get(`/vehicles/${params.id}`);
        const vehicle = res.data;
        if (vehicle) {
          setForm({
            plate: vehicle.plate || '',
            type: vehicle.type || 'motorbike',
            brand: vehicle.brand || '',
            model: vehicle.model || '',
            year: vehicle.year || new Date().getFullYear(),
            status: vehicle.status || 'active',
          });
        }
      } catch {
        alert('Failed to load vehicle details');
        router.push('/vehicles');
      }
      setLoading(false);
    };
    load();
  }, [params.id, router]);

  const f = (k: string) => (e: any) => {
    setForm(p => ({ ...p, [k]: k === 'year' ? parseInt(e.target.value) : e.target.value }));
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
    if (!form.plate.trim()) {
      errs.plate = lang === 'km' ? 'សូមបញ្ចូលស្លាកលេខយានយន្ត' : 'Please enter plate number';
    }
    if (!form.brand.trim()) {
      errs.brand = lang === 'km' ? 'សូមបញ្ចូលម៉ាកយានយន្ត' : 'Please enter vehicle brand';
    }
    if (!form.model.trim()) {
      errs.model = lang === 'km' ? 'សូមបញ្ចូលម៉ូដែលយានយន្ត' : 'Please enter vehicle model';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      await api.patch(`/vehicles/${params.id}`, form);
      router.push('/vehicles');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating vehicle');
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('editVehicle')} subtitle={t('loading')} />
        <div className="loading-wrapper"><div className="spinner" /></div>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('editVehicle')} subtitle={lang === 'km' ? 'កែប្រែព័ត៌មាន និងស្ថានភាពយានយន្ត' : 'Update fleet vehicle details'} />
        <div className="page-content">
          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px' }}>
              <button
                type="button"
                onClick={() => router.push('/vehicles')}
                className="btn btn-ghost btn-icon btn-sm"
                title={lang === 'km' ? 'ត្រឡប់ក្រោយ' : 'Back'}
              >
                <MdArrowBack size={18} />
              </button>
              <span className="card-title" style={{ fontSize: 16, fontWeight: 700 }}>{t('editVehicle')}</span>
            </div>
            <div className="card-body" style={{ padding: '20px 24px' }}>
              <form onSubmit={handleSubmit} noValidate>
                <div className="form-row">
                  <FormField label={t('plateNumber')} required error={errors.plate}>
                    <input
                      className="form-control"
                      value={form.plate}
                      onChange={f('plate')}
                      placeholder="e.g. 2A-4532"
                    />
                  </FormField>
                  <FormField label={t('vehicleType')} required>
                    <select className="form-control" value={form.type} onChange={f('type')}>
                      {TYPES.map(tp => <option key={tp} value={tp}>{tp}</option>)}
                    </select>
                  </FormField>
                </div>
                <div className="form-row">
                  <FormField label={t('brand')} required error={errors.brand}>
                    <input
                      className="form-control"
                      value={form.brand}
                      onChange={f('brand')}
                      placeholder="e.g. Honda"
                    />
                  </FormField>
                  <FormField label={t('model')} required error={errors.model}>
                    <input
                      className="form-control"
                      value={form.model}
                      onChange={f('model')}
                      placeholder="e.g. Dream 125"
                    />
                  </FormField>
                </div>
                <div className="form-row">
                  <FormField label={t('year')}>
                    <input type="number" min="2000" max="2035" className="form-control" value={form.year} onChange={f('year')} />
                  </FormField>
                  <FormField label={t('status')}>
                    <select className="form-control" value={form.status} onChange={f('status')}>
                      <option value="active">{lang === 'km' ? 'សកម្ម (Active)' : 'Active'}</option>
                      <option value="maintenance">{lang === 'km' ? 'កំពុងជួសជុល (Maintenance)' : 'Maintenance'}</option>
                      <option value="inactive">{lang === 'km' ? 'អសកម្ម (Inactive)' : 'Inactive'}</option>
                    </select>
                  </FormField>
                </div>

                <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-cancel"
                    onClick={() => router.push('/vehicles')}
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
