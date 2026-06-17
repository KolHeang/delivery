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
  const [drivers, setDrivers] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', driverId: '', branch: 'EBS Express', active: true });

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    api.get('/drivers')
      .then(res => setDrivers(res.data || []))
      .catch(() => {});
  }, [router]);

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
            <div className="card-header"><span className="card-title">🗺️ {t('addZone') || 'Add Zone'}</span></div>
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
