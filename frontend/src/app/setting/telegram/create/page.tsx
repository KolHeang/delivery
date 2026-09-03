'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

export default function CreateTelegramPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const isKh = lang === 'km';

  const [saving, setSaving] = useState(false);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    merchantId: '',
    channelTitle: '',
    chatId: '',
    chatType: 'group',
    botToken: '',
    botUsername: '',
    notifyNewOrder: true,
    notifyDeliverySuccess: true,
    notifyDeliveryFailed: true,
    notifySettlement: true,
    isActive: true,
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
    api
      .get('/select/merchants')
      .then((res) => {
        const list = Array.isArray(res.data)
          ? res.data
          : (res.data?.result || res.data?.results || []);
        setMerchants(list);
      })
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.chatId.trim()) {
      setErrors({ chatId: isKh ? 'សូមបញ្ចូល Telegram Chat ID' : 'Please provide Telegram Chat ID' });
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      const payload = {
        ...form,
        merchantId: form.merchantId ? parseInt(form.merchantId, 10) : undefined,
      };
      await api.post('/telegram/configs', payload);
      router.push('/setting/telegram');
    } catch (err: any) {
      alert(err.response?.data?.message || (isKh ? 'បរាជ័យក្នុងការបង្កើត Telegram' : 'Error creating Telegram config'));
    }
    setSaving(false);
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar
          title={isKh ? 'បន្ថែម Telegram ថ្មី' : 'Add Telegram'}
          subtitle={isKh ? 'បង្កើត និងកំណត់ការជូនដំណឹង Telegram ថ្មី' : 'Create a new Telegram notification channel'}
        />

        <div className="page-content">
          <div className="card">
            <div className="card-header">
              <span className="card-title">{isKh ? 'បន្ថែម Telegram ថ្មី' : 'Add New Telegram'}</span>
            </div>

            <div className="card-body">
              <form onSubmit={handleSubmit} noValidate>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  {/* Merchant Shop */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 'bold' }}>
                      {isKh ? 'ឈ្មោះហាង' : 'Merchant Shop'}
                    </label>
                    <select
                      className="form-control"
                      value={form.merchantId}
                      onChange={(e) => setForm({ ...form, merchantId: e.target.value })}
                    >
                      <option value="">{isKh ? '-- សម្រាប់ក្រុមហ៊ុនទូទៅ --' : '-- Global Default --'}</option>
                      {(Array.isArray(merchants) ? merchants : []).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nameKh || m.name} - {m.phone}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Channel Title */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 'bold' }}>
                      {isKh ? 'ឈ្មោះសម្គាល់ Channel' : 'Channel Name'}
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder={isKh ? 'ឧ. Finance Group, Main Alerts' : 'e.g. Finance Group, Main Alerts'}
                      value={form.channelTitle}
                      onChange={(e) => setForm({ ...form, channelTitle: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  {/* Chat ID */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 'bold' }}>
                      {isKh ? 'Telegram Chat ID ឬ Group ID' : 'Telegram Chat ID / Group ID'} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${errors.chatId ? 'is-invalid' : ''}`}
                      placeholder="761552994 or -100xxxxxxxxxx"
                      value={form.chatId}
                      onChange={(e) => {
                        setForm({ ...form, chatId: e.target.value });
                        if (errors.chatId) setErrors({});
                      }}
                    />
                    {errors.chatId && <div className="form-error-text">{errors.chatId}</div>}
                  </div>

                  {/* Chat Type */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 'bold' }}>
                      {isKh ? 'ប្រភេទ Chat' : 'Chat Type'}
                    </label>
                    <select
                      className="form-control"
                      value={form.chatType}
                      onChange={(e) => setForm({ ...form, chatType: e.target.value })}
                    >
                      <option value="group">{isKh ? 'Group ឬ Supergroup' : 'Group / Supergroup'}</option>
                      <option value="channel">{isKh ? 'Channel' : 'Channel'}</option>
                      <option value="private">{isKh ? 'ឆាតផ្ទាល់ខ្លួន Private' : 'Private User Chat'}</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  {/* Bot Token */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 'bold' }}>
                      {isKh ? 'Bot Token (ទុកទទេដើម្បីប្រើ System Default Bot)' : 'Bot Token (Leave blank to use default)'}
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="8865607029:AAFNqjym-HChsCvxSi3AbzA9ODsfR4ikkVw"
                      value={form.botToken}
                      onChange={(e) => setForm({ ...form, botToken: e.target.value })}
                    />
                  </div>

                  {/* Bot Username */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 'bold' }}>
                      {isKh ? 'ឈ្មោះ Bot Username' : 'Bot Username'}
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="@YourBotName"
                      value={form.botUsername}
                      onChange={(e) => setForm({ ...form, botUsername: e.target.value })}
                    />
                  </div>
                </div>

                {/* Notification Checkboxes */}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label" style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                    {isKh ? 'ប្រភេទការជូនដំណឹង' : 'Notification Events'}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.notifySettlement}
                        onChange={(e) => setForm({ ...form, notifySettlement: e.target.checked })}
                      />
                      <span>{isKh ? 'ទូទាត់ប្រាក់' : 'Settlement'}</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.notifyNewOrder}
                        onChange={(e) => setForm({ ...form, notifyNewOrder: e.target.checked })}
                      />
                      <span>{isKh ? 'ការកុម្ម៉ង់ថ្មី' : 'New Order'}</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.notifyDeliverySuccess}
                        onChange={(e) => setForm({ ...form, notifyDeliverySuccess: e.target.checked })}
                      />
                      <span>{isKh ? 'ដឹកជោគជ័យ' : 'Delivery Success'}</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.notifyDeliveryFailed}
                        onChange={(e) => setForm({ ...form, notifyDeliveryFailed: e.target.checked })}
                      />
                      <span>{isKh ? 'ដឹកមិនជោគជ័យ' : 'Delivery Failed'}</span>
                    </label>
                  </div>
                </div>

                {/* Active switch */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '24px' }}>
                  <input
                    type="checkbox"
                    id="activeCheck"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  <label htmlFor="activeCheck" style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {isKh ? 'បើកដំណើរការ' : 'Enable Channel'}
                  </label>
                </div>

                {/* Footer Buttons */}
                <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-cancel"
                    style={{ background: '#dc2626', color: '#ffffff', border: '1px solid #dc2626', fontWeight: 700 }}
                    onClick={() => router.push('/setting/telegram')}
                  >
                    {t('cancel') || (isKh ? 'បោះបង់' : 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ background: '#2563eb', color: '#ffffff', border: '1px solid #2563eb', fontWeight: 700 }}
                    disabled={saving}
                  >
                    {saving ? (isKh ? 'កំពុងរក្សាទុក...' : 'Saving...') : (t('save') || (isKh ? 'រក្សាទុក' : 'Save'))}
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
