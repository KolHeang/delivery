'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useSettings } from '@/lib/SettingsContext';
import { useLanguage } from '@/lib/LanguageContext';
import { MdTrendingUp, MdOpenInNew } from 'react-icons/md';

interface ActiveCurrency {
  id: number;
  code: string;
  name: string;
  nameKh?: string;
  symbol: string;
  flagEmoji?: string;
  exchangeRate: number;
}

export default function GeneralSettingsPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { refreshSettings } = useSettings();
  const [settings, setSettings] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<ActiveCurrency[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const load = async () => {
    try {
      const [settingsRes, curRes] = await Promise.all([
        api.get('/settings/general'),
        api.get('/settings/currencies?activeOnly=true').catch(() => ({ data: [] })),
      ]);
      setSettings(settingsRes.data || []);
      setCurrencies(curRes.data || []);
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

      // If currency was changed, also set it as base in currency table
      const currencySetting = settings.find(s => s.key === 'currency');
      if (currencySetting && currencySetting.value) {
        const matchingCur = currencies.find(c => c.code === currencySetting.value);
        if (matchingCur) {
          await api.post(`/settings/currencies/${matchingCur.id}/set-base`).catch(() => {});
        }
      }

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
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <span className="card-title">{t('generalConfigurations')}</span>
              <Link
                href="/setting/currency"
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <MdTrendingUp size={16} />
                <span>{t('currencySettings')}</span>
                <MdOpenInNew size={14} style={{ opacity: 0.7 }} />
              </Link>
            </div>
            <div className="card-body">
              {successMsg && (
                <div className="badge badge-delivered" style={{ display: 'block', padding: 12, marginBottom: 16, textAlign: 'center', fontSize: 13 }}>
                  {successMsg}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {settings.map(s => {
                  const isCurrencyKey = s.key === 'currency';
                  const isKhrRate = s.key === 'khrRate';

                  return (
                    <div key={s.key} className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{getSettingLabel(s.key)}</span>
                        {isCurrencyKey && (
                          <Link
                            href="/setting/currency"
                            style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
                          >
                            ⚙️ {lang === 'km' ? 'គ្រប់គ្រងរូបិយប័ណ្ណ' : 'Manage Currencies'}
                          </Link>
                        )}
                      </label>

                      {isCurrencyKey ? (
                        <div>
                          <select
                            className="form-control"
                            value={s.value}
                            onChange={e => handleChange(s.key, e.target.value)}
                            style={{ height: 42, borderRadius: 10, fontWeight: 600 }}
                          >
                            {currencies.map(c => (
                              <option key={c.id} value={c.code}>
                                {c.flagEmoji || '🌐'} {c.code} — {c.name} {c.nameKh ? `(${c.nameKh})` : ''} [{c.symbol}]
                              </option>
                            ))}
                            {/* Fallback if current setting not yet in active list */}
                            {!currencies.some(c => c.code === s.value) && (
                              <option value={s.value}>{s.value}</option>
                            )}
                          </select>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                            {t('manageCurrenciesHint')}: <Link href="/setting/currency" style={{ color: '#2563eb', fontWeight: 600 }}>/setting/currency</Link>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <input
                            type="text"
                            className="form-control"
                            value={s.value}
                            onChange={e => handleChange(s.key, e.target.value)}
                            style={{ height: 42, borderRadius: 10 }}
                          />
                          {isKhrRate && (
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                              {lang === 'km'
                                ? 'អត្រាប្តូរប្រាក់រៀលត្រូវបានធ្វើសមកាលកម្មដោយស្វ័យប្រវត្តិតាមតារាងរូបិយប័ណ្ណ (1 USD = KHR Rate)'
                                : 'KHR exchange rate is automatically synchronized with the Currency table (1 USD = KHR Rate)'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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
