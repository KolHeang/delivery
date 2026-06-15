'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

const TYPES = ['motorbike', 'car', 'van', 'truck', 'tuk-tuk'];
const TYPE_ICONS: Record<string, string> = { motorbike: '🏍️', car: '🚗', van: '🚐', truck: '🚚', 'tuk-tuk': '🛺' };

export default function CreateVehiclePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ plate: '', type: 'motorbike', brand: '', model: '', year: new Date().getFullYear(), status: 'active' });

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); }
  }, [router]);

  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: k === 'year' ? parseInt(e.target.value) : e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">{t('plateNumber')} <span>*</span></label><input className="form-control" value={form.plate} onChange={f('plate')} placeholder="e.g. 2A-4532" required /></div>
                  <div className="form-group">
                    <label className="form-label">{t('vehicleType')} <span>*</span></label>
                    <select className="form-control" value={form.type} onChange={f('type')}>
                      {TYPES.map(t => <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">{t('brand')} <span>*</span></label><input className="form-control" value={form.brand} onChange={f('brand')} required /></div>
                  <div className="form-group"><label className="form-label">{t('model')} <span>*</span></label><input className="form-control" value={form.model} onChange={f('model')} required /></div>
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
