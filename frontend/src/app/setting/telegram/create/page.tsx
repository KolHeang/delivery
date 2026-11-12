'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import { MdArrowBack, MdSave } from 'react-icons/md';

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
    messageThreadId: '',
    pickupTopicId: '',
    driverPaymentTopicId: '',
    merchantPaymentTopicId: '',
    parcelsTopicId: '',
    chatType: 'group',
    botToken: '',
    botUsername: '',
    notifyNewOrder: true,
    notifyPickup: true,
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
    const nextErrors: Record<string, string> = {};
    if (!form.chatId.trim()) {
      nextErrors.chatId = isKh ? 'សូមបញ្ចូល Telegram Chat ID' : 'Please provide Telegram Chat ID';
    }

    const parseTopic = (key: keyof typeof form): number | undefined => {
      const raw = String(form[key] || '').trim();
      if (!raw) return undefined;
      if (!/^\d+$/.test(raw)) {
        nextErrors[key] = isKh ? 'សូមបញ្ចូលតែលេខ Topic ទោលប៉ុណ្ណោះ' : 'Enter a single numeric Topic ID';
        return undefined;
      }
      const num = parseInt(raw, 10);
      if (!Number.isSafeInteger(num) || num < 1 || num > 2147483647) {
        nextErrors[key] = isKh
          ? 'លេខ Topic ត្រូវនៅចន្លោះ 1 ដល់ 2147483647 (ដាក់បានតែ ១ លេខ)'
          : 'Topic ID must be between 1 and 2,147,483,647';
        return undefined;
      }
      return num;
    };

    const messageThreadId = parseTopic('messageThreadId');
    const pickupTopicId = parseTopic('pickupTopicId');
    const driverPaymentTopicId = parseTopic('driverPaymentTopicId');
    const merchantPaymentTopicId = parseTopic('merchantPaymentTopicId');
    const parcelsTopicId = parseTopic('parcelsTopicId');

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      const payload = {
        ...form,
        chatId: form.chatId.trim(),
        botToken: form.botToken.trim(),
        merchantId: form.merchantId ? parseInt(form.merchantId, 10) : undefined,
        messageThreadId,
        pickupTopicId,
        driverPaymentTopicId,
        merchantPaymentTopicId,
        parcelsTopicId,
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
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px' }}>
              <button
                type="button"
                onClick={() => router.push('/setting/telegram')}
                className="btn btn-ghost btn-icon btn-sm"
                title={isKh ? 'ត្រឡប់ក្រោយ' : 'Back'}
              >
                <MdArrowBack size={18} />
              </button>
              <span className="card-title" style={{ fontSize: 16, fontWeight: 700 }}>{isKh ? 'បន្ថែម Telegram ថ្មី' : 'Add New Telegram'}</span>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  {/* Chat ID */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 'bold' }}>
                      {isKh ? 'Telegram Chat ID ឬ Group ID' : 'Telegram Chat ID / Group ID'} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${errors.chatId ? 'is-invalid' : ''}`}
                      placeholder="e.g. -100xxxxxxxxxx"
                      value={form.chatId}
                      onChange={(e) => {
                        setForm({ ...form, chatId: e.target.value });
                        if (errors.chatId) setErrors({ ...errors, chatId: '' });
                      }}
                    />
                    {errors.chatId && <div className="form-error-text">{errors.chatId}</div>}
                  </div>

                  {/* Topic / Thread ID */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 'bold' }}>
                      {isKh ? 'Topic / Thread ID ទូទៅ (ជម្រើសបន្ថែម)' : 'Default Topic / Thread ID (optional)'}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={10}
                      className={`form-control ${errors.messageThreadId ? 'is-invalid' : ''}`}
                      placeholder={isKh ? 'ទុកទទេ បើកំណត់តាមប្រភេទខាងក្រោម' : 'Leave blank if set per event'}
                      value={form.messageThreadId}
                      onChange={(e) => {
                        setForm({ ...form, messageThreadId: e.target.value.replace(/\D/g, '') });
                        if (errors.messageThreadId) setErrors({ ...errors, messageThreadId: '' });
                      }}
                    />
                    {errors.messageThreadId && <div className="form-error-text">{errors.messageThreadId}</div>}
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

                {/* Per-Event Forum Topic IDs */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '16px 18px',
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {isKh
                      ? 'Topic IDs តាមប្រភេទសារ (សម្រាប់ Group បើក Topics)'
                      : 'Per-Event Forum Topic IDs (for Supergroups with Topics)'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                    {isKh
                      ? 'បញ្ចូលតែ ១ លេខគត់ក្នុង ១ ប្រអប់ (ឧ. 110)។ បើទុកទទេ ប្រព័ន្ធនឹងប្រើ Topic ID ទូទៅ ឬ Default ពីម៉ាស៊ីនមេ (110, 108, 106, 113)។'
                      : 'Enter one single numeric Topic ID per field. Leave blank to fall back to the Default Topic ID or server defaults (110, 108, 106, 113).'}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: 12.5 }}>
                        🛵 {isKh ? 'Topic សំណើទៅយក (Pickup)' : 'Pickup Topic ID'}
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={10}
                        className={`form-control ${errors.pickupTopicId ? 'is-invalid' : ''}`}
                        placeholder={isKh ? 'ឧ. 110' : 'e.g. 110'}
                        value={form.pickupTopicId}
                        onChange={(e) => {
                          setForm({ ...form, pickupTopicId: e.target.value.replace(/\D/g, '') });
                          if (errors.pickupTopicId) setErrors({ ...errors, pickupTopicId: '' });
                        }}
                      />
                      {errors.pickupTopicId && <div className="form-error-text">{errors.pickupTopicId}</div>}
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: 12.5 }}>
                        💵 {isKh ? 'Topic ទូទាត់អ្នកដឹក (Driver Pay)' : 'Driver Payment Topic ID'}
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={10}
                        className={`form-control ${errors.driverPaymentTopicId ? 'is-invalid' : ''}`}
                        placeholder={isKh ? 'ឧ. 108' : 'e.g. 108'}
                        value={form.driverPaymentTopicId}
                        onChange={(e) => {
                          setForm({ ...form, driverPaymentTopicId: e.target.value.replace(/\D/g, '') });
                          if (errors.driverPaymentTopicId) setErrors({ ...errors, driverPaymentTopicId: '' });
                        }}
                      />
                      {errors.driverPaymentTopicId && <div className="form-error-text">{errors.driverPaymentTopicId}</div>}
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: 12.5 }}>
                        🏪 {isKh ? 'Topic ទូទាត់ហាង (Merchant Pay)' : 'Merchant Payment Topic ID'}
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={10}
                        className={`form-control ${errors.merchantPaymentTopicId ? 'is-invalid' : ''}`}
                        placeholder={isKh ? 'ឧ. 106' : 'e.g. 106'}
                        value={form.merchantPaymentTopicId}
                        onChange={(e) => {
                          setForm({ ...form, merchantPaymentTopicId: e.target.value.replace(/\D/g, '') });
                          if (errors.merchantPaymentTopicId) setErrors({ ...errors, merchantPaymentTopicId: '' });
                        }}
                      />
                      {errors.merchantPaymentTopicId && <div className="form-error-text">{errors.merchantPaymentTopicId}</div>}
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: 12.5 }}>
                        📦 {isKh ? 'Topic កញ្ចប់ទំនិញ (Parcels)' : 'Parcels / Status Topic ID'}
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={10}
                        className={`form-control ${errors.parcelsTopicId ? 'is-invalid' : ''}`}
                        placeholder={isKh ? 'ឧ. 113' : 'e.g. 113'}
                        value={form.parcelsTopicId}
                        onChange={(e) => {
                          setForm({ ...form, parcelsTopicId: e.target.value.replace(/\D/g, '') });
                          if (errors.parcelsTopicId) setErrors({ ...errors, parcelsTopicId: '' });
                        }}
                      />
                      {errors.parcelsTopicId && <div className="form-error-text">{errors.parcelsTopicId}</div>}
                    </div>
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
                      placeholder={
                        isKh
                          ? 'ទុកទទេ ដើម្បីប្រើ Bot ដើម (ឬ 123456789:ABCdef...)'
                          : 'Leave blank for default bot (or 123456789:ABCdef...)'
                      }
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
                        checked={form.notifyPickup}
                        onChange={(e) => setForm({ ...form, notifyPickup: e.target.checked })}
                      />
                      <span>{isKh ? 'សំណើទៅយកទំនិញ' : 'Pickup Request'}</span>
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
                <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-cancel"
                    onClick={() => router.push('/setting/telegram')}
                  >
                    {t('cancel') || (isKh ? 'បោះបង់' : 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    <MdSave size={17} />
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
