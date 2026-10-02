'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import { useSettings } from '@/lib/SettingsContext';
import FormField from '@/components/ui/FormField';

export default function CreateShopPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const { khrRate } = useSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: '',
    nameKh: '',
    contact: '',
    phone: '',
    email: '',
    address: '',
    pricingTier: 'standard',
    zoneId: '',
    deliveryFee: '0',
    exchangeRate: khrRate ? khrRate.toString() : '4100',
    note: '',
    telegram: '',
    qrLinkKhr: '',
    qrLinkUsd: '',
  });

  useEffect(() => {
    if (khrRate) {
      setForm(prev => ({
        ...prev,
        exchangeRate: prev.exchangeRate === '4100' ? khrRate.toString() : prev.exchangeRate,
      }));
    }
  }, [khrRate]);

  const [qrKhrFile, setQrKhrFile] = useState<File | null>(null);
  const [qrUsdFile, setQrUsdFile] = useState<File | null>(null);
  const [qrKhrPreview, setQrKhrPreview] = useState<string>('');
  const [qrUsdPreview, setQrUsdPreview] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    const load = async () => {
      try {
        const res = await api.get('/select/zones');
        const zList = Array.isArray(res.data) ? res.data : (res.data?.result || []);
        if (zList.length > 0) {
          setForm(prev => ({ ...prev, zoneId: zList[0].id.toString() }));
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [router]);

  const handleFileChange = (field: 'qrImageKhr' | 'qrImageUsd') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (field === 'qrImageKhr') {
      setQrKhrFile(file);
      setQrKhrPreview(URL.createObjectURL(file));
    } else {
      setQrUsdFile(file);
      setQrUsdPreview(URL.createObjectURL(file));
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!form.deliveryFee) newErrors.deliveryFee = lang === 'km' ? 'សូមបញ្ចូលថ្លៃដឹកជញ្ជូន' : 'Please enter delivery fee';
    if (!form.exchangeRate) newErrors.exchangeRate = lang === 'km' ? 'សូមបញ្ចូលអត្រាប្តូរប្រាក់' : 'Please enter exchange rate';
    if (!form.name.trim()) newErrors.name = lang === 'km' ? 'សូមបញ្ចូលឈ្មោះ' : 'Please enter name';
    if (!form.phone.trim()) newErrors.phone = lang === 'km' ? 'សូមបញ្ចូលលេខទូរស័ព្ទ' : 'Please enter phone number';
    if (!form.email.trim()) newErrors.email = lang === 'km' ? 'សូមបញ្ចូលអ៊ីមែល' : 'Please enter email';
    if (!form.address.trim()) newErrors.address = lang === 'km' ? 'សូមបញ្ចូលអាសយដ្ឋាន' : 'Please enter address';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('nameKh', form.nameKh);
      formData.append('contact', form.contact);
      formData.append('phone', form.phone);
      formData.append('email', form.email);
      formData.append('address', form.address);
      formData.append('pricingTier', form.pricingTier);
      if (form.zoneId) formData.append('zoneId', form.zoneId);
      formData.append('deliveryFee', form.deliveryFee);
      formData.append('exchangeRate', form.exchangeRate);
      formData.append('note', form.note);
      formData.append('telegram', form.telegram);
      formData.append('qrLinkKhr', form.qrLinkKhr);
      formData.append('qrLinkUsd', form.qrLinkUsd);
      formData.append('balance', '0');

      if (qrKhrFile) {
        formData.append('qrImageKhr', qrKhrFile);
      }
      if (qrUsdFile) {
        formData.append('qrImageUsd', qrUsdFile);
      }
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      await api.post('/merchants', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      router.push('/merchants');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creating shop');
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
        <Topbar title={t('createShop')} subtitle="Add new merchant account to the platform" />
        <div className="page-content">
          <div className="card">
            <div className="card-header"><span className="card-title">🏪 {t('createShop')}</span></div>
            <div className="card-body">
              <form noValidate onSubmit={handleSubmit}>
                {/* Shop Photo Upload */}
                <div className="form-row" style={{ alignItems: 'center', marginBottom: 20 }}>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 70,
                      height: 70,
                      borderRadius: '50%',
                      border: '2px dashed var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      background: 'var(--card-bg)'
                    }}>
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 28, color: 'var(--text-muted)' }}>🏪</span>
                      )}
                    </div>
                    <div>
                      <label className="form-label" style={{ marginBottom: 4 }}>{t('profilePhoto')}</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setPhotoFile(file);
                            setPhotoPreview(URL.createObjectURL(file));
                          }
                        }}
                        style={{ fontSize: 13 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Row 1: Delivery Fee & Exchange Rate */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <FormField label={t('deliveryFee')} required error={errors.deliveryFee}>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={form.deliveryFee}
                      onChange={e => handleFieldChange('deliveryFee', e.target.value)}
                    />
                  </FormField>
                  <FormField label={t('exchangeRate')} required error={errors.exchangeRate}>
                    <input
                      type="number"
                      className="form-control"
                      value={form.exchangeRate}
                      onChange={e => handleFieldChange('exchangeRate', e.target.value)}
                    />
                  </FormField>
                </div>

                {/* Section 2: Shop Info */}
                <div style={{ background: '#eeeeee', padding: '10px 16px', fontWeight: 'bold', fontSize: 13, color: '#334155', margin: '20px 0 16px', borderRadius: 4 }}>
                  {t('shopInfo')}
                </div>

                {/* Row 2: Name, Phone, Email, Address */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <FormField label={t('name')} required error={errors.name}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Zando Shop"
                      value={form.name}
                      onChange={e => handleFieldChange('name', e.target.value)}
                    />
                  </FormField>
                  <FormField label={t('phone')} required error={errors.phone}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 012-100-200"
                      value={form.phone}
                      onChange={e => handleFieldChange('phone', e.target.value)}
                    />
                  </FormField>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <FormField label={t('email')} required error={errors.email}>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="e.g. zando@shop.com"
                      value={form.email}
                      onChange={e => handleFieldChange('email', e.target.value)}
                    />
                  </FormField>
                  <FormField label={t('address')} required error={errors.address}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Full address..."
                      value={form.address}
                      onChange={e => handleFieldChange('address', e.target.value)}
                    />
                  </FormField>
                </div>

                {/* Row 3: Note */}
                <div className="form-group">
                  <label className="form-label">{t('note')}</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Enter notes..."
                    value={form.note}
                    onChange={e => setForm({ ...form, note: e.target.value })}
                  />
                </div>

                {/* Section 3: Bank Info */}
                <div style={{ background: '#eeeeee', padding: '10px 16px', fontWeight: 'bold', fontSize: 13, color: '#334155', margin: '20px 0 16px', borderRadius: 4 }}>
                  {t('bankInfo')}
                </div>

                {/* Row 4: Telegram, Link QR KHR, Link QR USD */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                  <div className="form-group">
                    <label className="form-label">{t('telegramLabel')}</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="@tuyravey99"
                      value={form.telegram}
                      onChange={e => setForm({ ...form, telegram: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('qrLinkKhr')}</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Link..."
                      value={form.qrLinkKhr}
                      onChange={e => setForm({ ...form, qrLinkKhr: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('qrLinkUsd')}</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Link..."
                      value={form.qrLinkUsd}
                      onChange={e => setForm({ ...form, qrLinkUsd: e.target.value })}
                    />
                  </div>
                </div>

                {/* Row 5: QR KHR and USD file uploads */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div className="form-group">
                    <label className="form-label">{t('qrFileKhr')}</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input
                        type="file"
                        accept="image/*"
                        className="form-control"
                        onChange={handleFileChange('qrImageKhr')}
                      />
                      {qrKhrPreview && (
                        <img src={qrKhrPreview} alt="QR KHR Preview" style={{ width: 80, height: 80, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 4 }} />
                      )}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('qrFileUsd')}</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input
                        type="file"
                        accept="image/*"
                        className="form-control"
                        onChange={handleFileChange('qrImageUsd')}
                      />
                      {qrUsdPreview && (
                        <img src={qrUsdPreview} alt="QR USD Preview" style={{ width: 80, height: 80, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 4 }} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Buttons */}
                <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-outline" onClick={() => router.push('/merchants')}>
                    {t('cancel')}
                  </button>
                  <button type="submit" style={{ background: 'var(--accent)', color: '#fff', padding: '10px 24px', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', transition: 'opacity 0.2s' }} disabled={saving}>
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
