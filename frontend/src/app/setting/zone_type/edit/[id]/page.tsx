'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

export default function EditZonePage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', price: 0, description: '', active: true });

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    
    const load = async () => {
      try {
        const res = await api.get(`/zones`);
        const zone = res.data.find((z: any) => z.id === parseInt(params.id as string));
        if (zone) {
          setForm({
            name: zone.name || '',
            code: zone.code || '',
            price: zone.price || 0,
            description: zone.description || '',
            active: zone.active ?? true
          });
        }
      } catch (err) {
        alert('Failed to load zone details');
        router.push('/setting/zone_type');
      }
      setLoading(false);
    };
    load();
  }, [params.id, router]);

  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: k === 'price' ? parseFloat(e.target.value) : k === 'active' ? e.target.checked : e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/zones/${params.id}`, form);
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
        <Topbar title={t('editZone') || 'Edit Zone'} subtitle="Update delivery zone" />
        <div className="page-content">
          <div className="card">
            <div className="card-header"><span className="card-title">🗺️ {t('editZone') || 'Edit Zone'}</span></div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('zoneName') || 'Zone Name'} <span>*</span></label>
                    <input className="form-control" value={form.name} onChange={f('name')} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('code') || 'Code'} <span>*</span></label>
                    <input className="form-control" value={form.code} onChange={f('code')} placeholder="e.g. PPC" required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('deliveryFee') || 'Delivery Fee'} ($) <span>*</span></label>
                  <input type="number" step="0.5" min="0" className="form-control" value={form.price} onChange={f('price')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('description') || 'Description'}</label>
                  <input className="form-control" value={form.description} onChange={f('description')} />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" id="zone-active" checked={form.active} onChange={f('active')} style={{ width: 16, height: 16 }} />
                  <label htmlFor="zone-active" className="form-label" style={{ margin: 0 }}>{t('activeZone') || 'Active Zone'}</label>
                </div>
                
                <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-outline" onClick={() => router.push('/setting/zone_type')}>
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
