'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

export default function CreateShopPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    exchangeRate: '4100',
    note: '',
    telegram: '',
    qrLinkKhr: '',
    qrLinkUsd: '',
  });

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
        const res = await api.get('/zones');
        if (res.data && res.data.length > 0) {
          setForm(prev => ({ ...prev, zoneId: res.data[0].id.toString() }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      router.push('/client');
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
              <form onSubmit={handleSubmit}>
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
                  <div className="form-group">
                    <label className="form-label">{t('deliveryFee')} <span>*</span></label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={form.deliveryFee}
                      onChange={e => setForm({ ...form, deliveryFee: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('exchangeRate')} <span>*</span></label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.exchangeRate}
                      onChange={e => setForm({ ...form, exchangeRate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Section 2: Shop Info */}
                <div style={{ background: '#eeeeee', padding: '10px 16px', fontWeight: 'bold', fontSize: 13, color: '#334155', margin: '20px 0 16px', borderRadius: 4 }}>
                  {t('shopInfo')}
                </div>

                {/* Row 2: Name, Phone, Address */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                  <div className="form-group">
                    <label className="form-label">{t('name')} <span>*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Zando Shop"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('phone')} <span>*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 012-100-200"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('address')} <span>*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Full address..."
                      value={form.address}
                      onChange={e => setForm({ ...form, address: e.target.value })}
                      required
                    />
                  </div>
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
                    <label className="form-label">{t('qrFileKhr')} <span>*</span></label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input
                        type="file"
                        accept="image/*"
                        className="form-control"
                        onChange={handleFileChange('qrImageKhr')}
                        required
                      />
                      {qrKhrPreview && (
                        <img src={qrKhrPreview} alt="QR KHR Preview" style={{ width: 80, height: 80, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 4 }} />
                      )}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('qrFileUsd')} <span>*</span></label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input
                        type="file"
                        accept="image/*"
                        className="form-control"
                        onChange={handleFileChange('qrImageUsd')}
                        required
                      />
                      {qrUsdPreview && (
                        <img src={qrUsdPreview} alt="QR USD Preview" style={{ width: 80, height: 80, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 4 }} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Buttons */}
                <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-outline" onClick={() => router.push('/client')}>
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
