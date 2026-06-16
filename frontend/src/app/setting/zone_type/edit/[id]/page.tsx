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
  const { lang, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', driverId: '', branch: 'E Express', active: true });

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    
    const load = async () => {
      try {
        const [zoneRes, driverRes] = await Promise.all([
          api.get('/zones'),
          api.get('/drivers')
        ]);
        setDrivers(driverRes.data || []);
        
        const zone = zoneRes.data.find((z: any) => z.id === parseInt(params.id as string));
        if (zone) {
          setForm({
            name: zone.name || '',
            driverId: zone.driverId || '',
            branch: zone.branch || 'E Express',
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

  const f = (k: string) => (e: any) => setForm(p => ({
    ...p,
    [k]: k === 'driverId' ? (parseInt(e.target.value) || '') : e.target.value
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        driverId: form.driverId || null,
        branch: form.branch,
        active: form.active
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
        <Topbar title={t('editZone') || 'Edit Zone'} subtitle="Update delivery zone" />
        <div className="page-content">
          <div className="card">
            <div className="card-header"><span className="card-title">🗺️ {t('editZone') || 'Edit Zone'}</span></div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 'bold' }}>
                      {lang === 'km' ? 'ឈ្មោះតំបន់' : 'Zone Name'} <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input className="form-control" value={form.name} onChange={f('name')} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 'bold' }}>
                      {lang === 'km' ? 'ឈ្មោះភ្នាក់ងារដឹក' : 'Driver Name'}
                    </label>
                    <select className="form-control" value={form.driverId} onChange={f('driverId')}>
                      <option value="">{lang === 'km' ? '-- ជ្រើសរើសអ្នកដឹក --' : '-- Select Driver --'}</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.nameKh || d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 'bold' }}>
                      {lang === 'km' ? 'សាខា' : 'Branch'}
                    </label>
                    <select className="form-control" value={form.branch} onChange={f('branch')}>
                      <option value="E Express">E Express</option>
                      <option value="EBS Express">EBS Express</option>
                    </select>
                  </div>
                  <div className="form-group"></div>
                </div>

                <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-outline" onClick={() => router.push('/setting/zone_type')}>
                    {lang === 'km' ? 'បោះបង់' : 'Cancel'}
                  </button>
                  <button 
                    type="submit" 
                    className="btn" 
                    disabled={saving}
                    style={{
                      background: '#e28a35',
                      color: '#fff',
                      border: 'none',
                      padding: '8px 24px',
                      fontWeight: 'bold',
                      borderRadius: 4,
                      cursor: 'pointer'
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
