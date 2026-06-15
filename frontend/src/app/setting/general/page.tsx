'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';

export default function GeneralSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/settings/general');
      setSettings(res.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    load();
  }, [router]);

  const handleChange = (key: string, value: string) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setSuccessMsg('');
    try {
      await Promise.all(
        settings.map(s => api.post('/settings/general', { key: s.key, value: s.value }))
      );
      setSuccessMsg(`All settings saved successfully!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      alert('Failed to save settings');
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="loading-wrapper"><div className="spinner" /></div>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="General Settings" subtitle="Configure system parameters, currencies, and exchange rates" />
        <div className="page-content">
          <div className="card">
            <div className="card-header"><span className="card-title">⚙️ General Configurations</span></div>
            <div className="card-body">
              {successMsg && (
                <div className="badge badge-delivered" style={{ display: 'block', padding: 12, marginBottom: 16, textAlign: 'center', fontSize: 13 }}>
                  {successMsg}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {settings.map(s => (
                  <div key={s.key} className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ textTransform: 'capitalize' }}>
                      {s.key.replace(/([A-Z])/g, ' $1')}
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={s.value}
                      onChange={e => handleChange(s.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveAll}
                  disabled={saving}
                  style={{ padding: '10px 24px' }}
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
