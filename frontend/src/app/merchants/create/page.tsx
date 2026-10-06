'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import { useSettings } from '@/lib/SettingsContext';
import LocationMapModal from '@/components/ui/LocationMapModal';
import { MdArrowBack, MdSave, MdMap } from 'react-icons/md';

export default function CreateShopPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const { khrRate } = useSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [zones, setZones] = useState<any[]>([]);

  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState({
    name: '',
    nameKh: '',
    contact: '',
    phone: '',
    email: '',
    address: '',
    latitude: '',
    longitude: '',
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
      setForm((prev) => ({
        ...prev,
        exchangeRate: prev.exchangeRate === '4100' ? khrRate.toString() : prev.exchangeRate,
      }));
    }
  }, [khrRate]);

  const [qrKhrFile, setQrKhrFile] = useState<File | null>(null);
  const [qrUsdFile, setQrUsdFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
    const load = async () => {
      try {
        const res = await api.get('/select/zones');
        const zList = Array.isArray(res.data) ? res.data : res.data?.result || [];
        setZones(zList);
        if (zList.length > 0) {
          setForm((prev) => ({ ...prev, zoneId: zList[0].id.toString() }));
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [router]);

  const handleFieldChange = (field: string, val: string) => {
    setForm((prev) => ({ ...prev, [field]: val }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = lang === 'km' ? 'សូមបញ្ចូលឈ្មោះហាង' : 'Please enter shop name';
    if (!form.phone.trim()) errs.phone = lang === 'km' ? 'សូមបញ្ចូលលេខទូរស័ព្ទ' : 'Please enter phone number';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = lang === 'km' ? 'សូមបំពេញអ៊ីម៉ែលឱ្យបានត្រឹមត្រូវ' : 'Invalid email';
    }
    if (!form.address.trim()) errs.address = lang === 'km' ? 'សូមបញ្ចូលអាសយដ្ឋាន' : 'Please enter address';
    if (!form.deliveryFee) errs.deliveryFee = lang === 'km' ? 'សូមបញ្ចូលថ្លៃដឹក' : 'Please enter fee';
    if (!form.exchangeRate) errs.exchangeRate = lang === 'km' ? 'សូមបញ្ចូលអត្រាប្តូរប្រាក់' : 'Please enter rate';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
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
      if (form.latitude) formData.append('latitude', form.latitude);
      if (form.longitude) formData.append('longitude', form.longitude);
      formData.append('pricingTier', form.pricingTier);
      if (form.zoneId) formData.append('zoneId', form.zoneId);
      formData.append('deliveryFee', form.deliveryFee);
      formData.append('exchangeRate', form.exchangeRate);
      formData.append('note', form.note);
      formData.append('telegram', form.telegram);
      formData.append('qrLinkKhr', form.qrLinkKhr);
      formData.append('qrLinkUsd', form.qrLinkUsd);
      formData.append('balance', '0');

      if (qrKhrFile) formData.append('qrImageKhr', qrKhrFile);
      if (qrUsdFile) formData.append('qrImageUsd', qrUsdFile);
      if (photoFile) formData.append('photo', photoFile);

      await api.post('/merchants', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      router.push('/merchants');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creating shop');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <div className="loading-wrapper"><div className="spinner" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar
          title={lang === 'km' ? '🏪 បង្កើតហាងថ្មី' : '🏪 Create Merchant'}
          subtitle={lang === 'km' ? 'បញ្ចូល និងបង្កើតព័ត៌មានហាងទំនិញថ្មី' : 'Add new merchant'}
        />

        <div className="page-content">
          <div className="card">
            {/* Header */}
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px' }}>
              <button
                type="button"
                onClick={() => router.push('/merchants')}
                className="btn btn-ghost btn-icon btn-sm"
              >
                <MdArrowBack size={18} />
              </button>
              <span className="card-title" style={{ fontSize: 16, fontWeight: 700 }}>
                {lang === 'km' ? 'ព័ត៌មានហាងថ្មី' : 'New Merchant'}
              </span>
            </div>

            <div className="card-body" style={{ padding: '20px 24px' }}>
              <form noValidate onSubmit={handleSubmit}>
                {/* Logo & Basic Info Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setPhotoFile(file);
                        setPhotoPreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                  <div
                    onClick={() => photoInputRef.current?.click()}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 24 }}>🏪</span>
                    )}
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: 12, padding: '4px 12px' }}
                    >
                      {photoPreview ? (lang === 'km' ? 'ប្តូររូប Logo' : 'Change Logo') : (lang === 'km' ? 'ដាក់រូប Logo ហាង' : 'Upload Logo')}
                    </button>
                    {photoPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoFile(null);
                          setPhotoPreview('');
                        }}
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#ef4444', fontSize: 12, marginLeft: 8 }}
                      >
                        {lang === 'km' ? 'លុប' : 'Remove'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Section: ព័ត៌មានហាង */}
                <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 16, fontWeight: 700, fontSize: 13.5, color: '#334155' }}>
                  {lang === 'km' ? 'ព័ត៌មានទូទៅ' : 'General Info'}
                </div>

                {/* Row 1: Name EN, Name KH */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 14 }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: 13 }}>
                      {lang === 'km' ? 'ឈ្មោះហាង (English)' : 'Shop Name'} <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                      placeholder="e.g. Zando Shop"
                      value={form.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                    />
                    {errors.name && <div className="form-error-text" style={{ color: 'var(--danger)', fontSize: 12, marginTop: 3 }}>{errors.name}</div>}
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: 13 }}>
                      {lang === 'km' ? 'ឈ្មោះជាភាសាខ្មែរ' : 'Khmer Name'}
                    </label>
                    <input
                      className="form-control"
                      placeholder="ឧ. ហាង ហ្សានដូ"
                      value={form.nameKh}
                      onChange={(e) => handleFieldChange('nameKh', e.target.value)}
                    />
                  </div>
                </div>

                {/* Row 2: Phone, Contact */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 14 }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: 13 }}>
                      {lang === 'km' ? 'លេខទូរស័ព្ទ' : 'Phone'} <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                      placeholder="012 345 678"
                      value={form.phone}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                    />
                    {errors.phone && <div className="form-error-text" style={{ color: 'var(--danger)', fontSize: 12, marginTop: 3 }}>{errors.phone}</div>}
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: 13 }}>
                      {lang === 'km' ? 'អ្នកទំនាក់ទំនង / ម្ចាស់ហាង' : 'Contact Person'}
                    </label>
                    <input
                      className="form-control"
                      placeholder={lang === 'km' ? 'ឈ្មោះអ្នកចាត់ការ' : 'Manager Name'}
                      value={form.contact}
                      onChange={(e) => handleFieldChange('contact', e.target.value)}
                    />
                  </div>
                </div>

                {/* Row 3: Email, Telegram */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 18 }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: 13 }}>
                      {lang === 'km' ? 'អ៊ីមែល' : 'Email'}
                    </label>
                    <input
                      type="email"
                      className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                      placeholder="shop@example.com"
                      value={form.email}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                    />
                    {errors.email && <div className="form-error-text" style={{ color: 'var(--danger)', fontSize: 12, marginTop: 3 }}>{errors.email}</div>}
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: 13 }}>
                      {lang === 'km' ? 'Telegram' : 'Telegram'}
                    </label>
                    <input
                      className="form-control"
                      placeholder="@username"
                      value={form.telegram}
                      onChange={(e) => handleFieldChange('telegram', e.target.value)}
                    />
                  </div>
                </div>

                {/* Section: ទីតាំង និងតម្លៃដឹក */}
                <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 16, fontWeight: 700, fontSize: 13.5, color: '#334155' }}>
                  {lang === 'km' ? 'ទីតាំង និងការកំណត់សេវា' : 'Location & Pricing'}
                </div>

                {/* Row 4: Delivery Fee, Exchange Rate */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 14 }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: 13 }}>
                      {lang === 'km' ? 'ថ្លៃដឹកគោល ($)' : 'Fee ($)'} <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className={`form-control ${errors.deliveryFee ? 'is-invalid' : ''}`}
                      value={form.deliveryFee}
                      onChange={(e) => handleFieldChange('deliveryFee', e.target.value)}
                    />
                    {errors.deliveryFee && <div className="form-error-text" style={{ color: 'var(--danger)', fontSize: 12, marginTop: 3 }}>{errors.deliveryFee}</div>}
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: 13 }}>
                      {lang === 'km' ? 'អត្រាប្តូរប្រាក់ (៛)' : 'Rate (KHR)'} <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      type="number"
                      className={`form-control ${errors.exchangeRate ? 'is-invalid' : ''}`}
                      value={form.exchangeRate}
                      onChange={(e) => handleFieldChange('exchangeRate', e.target.value)}
                    />
                    {errors.exchangeRate && <div className="form-error-text" style={{ color: 'var(--danger)', fontSize: 12, marginTop: 3 }}>{errors.exchangeRate}</div>}
                  </div>
                </div>

                {/* Row 5: Address with single Map button */}
                <div style={{ marginBottom: 18 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 13 }}>
                    {lang === 'km' ? 'អាសយដ្ឋាន' : 'Address'} <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      className={`form-control ${errors.address ? 'is-invalid' : ''}`}
                      placeholder={lang === 'km' ? 'បញ្ចូលអាសយដ្ឋាន ឬចុចជ្រើសរើសលើផែនទី...' : 'Enter address or select on map...'}
                      value={form.address}
                      onChange={(e) => handleFieldChange('address', e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => setIsMapOpen(true)}
                      className="btn btn-outline"
                      style={{
                        whiteSpace: 'nowrap',
                        fontWeight: 600,
                        fontSize: 13,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        color: '#2563eb',
                        borderColor: '#2563eb',
                      }}
                    >
                      <MdMap size={18} />
                      {lang === 'km' ? 'រើសលើផែនទី' : 'Pick on Map'}
                    </button>
                  </div>
                  {errors.address && (
                    <div className="form-error-text" style={{ color: 'var(--danger)', fontSize: 12, marginTop: 3 }}>
                      {errors.address}
                    </div>
                  )}
                  {form.latitude && form.longitude && (
                    <div style={{ fontSize: 11.5, color: '#16a34a', marginTop: 4 }}>
                      📍 GPS: {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}
                    </div>
                  )}
                </div>

                {/* Section: ការទូទាត់ QR Code */}
                <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginBottom: 16, fontWeight: 700, fontSize: 13.5, color: '#334155' }}>
                  {lang === 'km' ? 'គណនីទូទាត់ (QR Code)' : 'Payment QR'}
                </div>

                {/* Row 6: QR KHR & QR USD */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 18 }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: 13 }}>
                      🇰🇭 {lang === 'km' ? 'KHQR ប្រាក់រៀល' : 'KHR QR'}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      className="form-control"
                      style={{ fontSize: 13, padding: 6, marginBottom: 6 }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setQrKhrFile(file);
                      }}
                    />
                    <input
                      className="form-control"
                      placeholder="Link QR KHR (Optional)"
                      value={form.qrLinkKhr}
                      onChange={(e) => handleFieldChange('qrLinkKhr', e.target.value)}
                      style={{ fontSize: 13 }}
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: 13 }}>
                      💵 {lang === 'km' ? 'KHQR ប្រាក់ដុល្លារ' : 'USD QR'}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      className="form-control"
                      style={{ fontSize: 13, padding: 6, marginBottom: 6 }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setQrUsdFile(file);
                      }}
                    />
                    <input
                      className="form-control"
                      placeholder="Link QR USD (Optional)"
                      value={form.qrLinkUsd}
                      onChange={(e) => handleFieldChange('qrLinkUsd', e.target.value)}
                      style={{ fontSize: 13 }}
                    />
                  </div>
                </div>

                {/* Row 7: Note */}
                <div style={{ marginBottom: 20 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 13 }}>
                    {lang === 'km' ? 'ចំណាំផ្សេងៗ' : 'Notes'}
                  </label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder={lang === 'km' ? 'ចំណាំផ្សេងៗ...' : 'Notes...'}
                    value={form.note}
                    onChange={(e) => handleFieldChange('note', e.target.value)}
                    style={{ fontSize: 13.5 }}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 14, borderTop: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => router.push('/merchants')}
                    disabled={saving}
                  >
                    {lang === 'km' ? 'បោះបង់' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                    style={{ background: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                  >
                    <MdSave size={18} />
                    {saving ? (lang === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...') : (lang === 'km' ? 'រក្សាទុកហាង' : 'Save Merchant')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <LocationMapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        initialAddress={form.address}
        initialLat={form.latitude ? parseFloat(form.latitude) : undefined}
        initialLng={form.longitude ? parseFloat(form.longitude) : undefined}
        lang={lang}
        onSelect={({ address, lat, lng }) => {
          setForm((prev) => ({
            ...prev,
            address,
            latitude: String(lat),
            longitude: String(lng),
          }));
          if (errors.address) {
            setErrors((prev) => {
              const next = { ...prev };
              delete next.address;
              return next;
            });
          }
        }}
      />
    </div>
  );
}
