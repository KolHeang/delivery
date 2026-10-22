'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

const TYPES = ['motorbike', 'car', 'van', 'truck', 'tuk-tuk'];
const TYPE_ICONS: Record<string, string> = { motorbike: '🏍️', car: '🚗', van: '🚐', truck: '🚚', 'tuk-tuk': '🛺' };

export default function EditVehiclePage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useLanguage();
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
            status: vehicle.status || 'active'
          });
        }
      } catch (err) {
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
      errs.plate = 'សូមបំពេញស្លាកលេខយានយន្ត';
    }
    if (!form.brand.trim()) {
      errs.brand = 'សូមបំពេញម៉ាកយានយន្ត';
    }
    if (!form.model.trim()) {
      errs.model = 'សូមបំពេញម៉ូដែលយានយន្ត';
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
        <Topbar title={t('editVehicle')} subtitle="កែប្រែព័ត៌មាន និងស្ថានភាពយានយន្ត" />
        <div className="page-content">
          <div className="card">
            <div className="card-header"><span className="card-title">{t('editVehicle')}</span></div>
            <div className="card-body">
              <form onSubmit={handleSubmit} noValidate>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('plateNumber')} <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      className={`form-control ${errors.plate ? 'is-invalid' : ''}`}
                      value={form.plate}
                      onChange={f('plate')}
                      placeholder="e.g. 2A-4532"
                    />
                    {errors.plate && <div className="form-error-text">{errors.plate}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('vehicleType')} <span style={{ color: '#ef4444' }}>*</span></label>
                    <select className="form-control" value={form.type} onChange={f('type')}>
                      {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('brand')} <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      className={`form-control ${errors.brand ? 'is-invalid' : ''}`}
                      value={form.brand}
                      onChange={f('brand')}
                      placeholder="e.g. Honda"
                    />
                    {errors.brand && <div className="form-error-text">{errors.brand}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('model')} <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      className={`form-control ${errors.model ? 'is-invalid' : ''}`}
                      value={form.model}
                      onChange={f('model')}
                      placeholder="e.g. Dream 125"
                    />
                    {errors.model && <div className="form-error-text">{errors.model}</div>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">{t('year')}</label><input type="number" min="2000" max="2030" className="form-control" value={form.year} onChange={f('year')} /></div>
                  <div className="form-group">
                    <label className="form-label">{t('status')}</label>
                    <select className="form-control" value={form.status} onChange={f('status')}>
                      <option value="active">Active</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                
                <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-cancel"
                    style={{ background: '#dc2626', color: '#ffffff', border: '1px solid #dc2626', fontWeight: 700 }}
                    onClick={() => router.push('/vehicles')}
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
