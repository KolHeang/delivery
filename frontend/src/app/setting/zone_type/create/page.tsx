'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import FormField from '@/components/ui/FormField';

export default function CreateZonePage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: '', driverId: '', branch: 'EBS Express', active: true });

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    api.get('/select/drivers')
      .then(res => setDrivers(Array.isArray(res.data) ? res.data : (res.data?.result || [])))
      .catch(() => {});
  }, [router]);

  const f = (k: string) => (e: any) => {
    setForm(p => ({
      ...p,
      [k]: k === 'driverId' ? (parseInt(e.target.value) || '') : e.target.value
    }));
    if (errors[k]) {
      setErrors(prev => ({ ...prev, [k]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) {
      newErrors.name = lang === 'km' ? 'សូមបញ្ចូលឈ្មោះតំបន់' : 'Please enter zone name';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

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
              <form noValidate onSubmit={handleSubmit}>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <FormField label={lang === 'km' ? 'ឈ្មោះតំបន់' : 'Zone Name'} required error={errors.name}>
                    <input className="form-control" value={form.name} onChange={f('name')} placeholder="Zone name..." />
                  </FormField>
                  <FormField label={lang === 'km' ? 'ឈ្មោះភ្នាក់ងារដឹក' : 'Driver Name'}>
                    <select className="form-control" value={form.driverId} onChange={f('driverId')}>
                      <option value="">{lang === 'km' ? '-- ជ្រើសរើសអ្នកដឹក --' : '-- Select Driver --'}</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.nameKh || d.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
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
