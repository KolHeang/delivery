'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useSettings } from '@/lib/SettingsContext';
import { useLanguage } from '@/lib/LanguageContext';

export default function GeneralSettingsPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { refreshSettings } = useSettings();
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
      await refreshSettings();
      setSuccessMsg(t('settingsSavedSuccess'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      alert(lang === 'km' ? 'មិនអាចរក្សាទុកការកំណត់បានទេ' : 'Failed to save settings');
    }
    setSaving(false);
  };

  const getSettingLabel = (key: string) => {
    switch (key) {
      case 'currency':
        return t('settingCurrency');
      case 'taxRate':
        return t('settingTaxRate');
      case 'timezone':
        return t('settingTimezone');
      case 'khrRate':
        return t('settingKhrRate');
      default:
        return key.replace(/([A-Z])/g, ' $1');
    }
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
        <Topbar title={t('generalSettings')} subtitle={t('generalSettingsSubtitle')} />
        <div className="page-content">
          <div className="card">
            <div className="card-header"><span className="card-title">{t('generalConfigurations')}</span></div>
            <div className="card-body">
              {successMsg && (
                <div className="badge badge-delivered" style={{ display: 'block', padding: 12, marginBottom: 16, textAlign: 'center', fontSize: 13 }}>
                  {successMsg}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {settings.map(s => (
                  <div key={s.key} className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      {getSettingLabel(s.key)}
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
                  {saving ? t('savingSettings') : t('saveSettings')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
