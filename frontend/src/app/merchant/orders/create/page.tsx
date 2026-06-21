'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getUser } from '@/lib/auth';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdArrowBack,
  MdSave,
  MdPerson,
  MdPhone,
  MdLocationOn,
  MdAttachMoney,
  MdNotes,
  MdLocalShipping,
  MdInventory2,
  MdScale,
} from 'react-icons/md';

const t_en = {
  title: 'Create Parcel',
  sectionSender: 'Sender Info',
  sectionReceiver: 'Receiver Info',
  sectionPackage: 'Package Details',
  sectionPayment: 'Payment & Fee',
  sectionNote: 'Notes',
  senderName: 'Sender Name',
  senderPhone: 'Sender Phone',
  receiverName: 'Receiver Name',
  receiverPhone: 'Receiver Phone',
  zone: 'Receiver Address',
  address: 'Delivery Address',
  addressPlaceholder: 'Building, street, house number...',
  weight: 'Weight (kg)',
  size: 'Parcel Size',
  small: 'Small (< 1kg)',
  medium: 'Medium (1–5kg)',
  large: 'Large (> 5kg)',
  cod: 'COD Amount',
  codCurrency: 'Currency',
  deliveryFee: 'Delivery Fee ($)',
  note: 'Special Notes',
  notePlaceholder: 'Instructions for driver (optional)...',
  submitBtn: 'Create Shipment',
  submitting: 'Creating...',
  successMsg: 'Parcel created successfully!',
  errorMsg: 'Failed to create parcel. Please verify all details.',
  selectZone: '— Select Zone —',
  loading: 'Loading...',
  required: 'Required field',
};

const t_km = {
  title: 'បង្កើតការផ្ញើកញ្ចប់',
  sectionSender: 'ព័ត៌មានអ្នកផ្ញើ',
  sectionReceiver: 'ព័ត៌មានអ្នកទទួល',
  sectionPackage: 'ព័ត៌មានកញ្ចប់',
  sectionPayment: 'ការទូទាត់ និងថ្លៃដឹក',
  sectionNote: 'ចំណាំ',
  senderName: 'ឈ្មោះអ្នកផ្ញើ',
  senderPhone: 'ទូរស័ព្ទអ្នកផ្ញើ',
  receiverName: 'ឈ្មោះអ្នកទទួល',
  receiverPhone: 'ទូរស័ព្ទអ្នកទទួល',
  zone: 'អាសយដ្ឋានអ្នកទទួល',
  address: 'អាសយដ្ឋានដឹកជញ្ជូន',
  addressPlaceholder: 'ព័ត៌មានផ្លូវ ផ្ទះ ខុនដូ...',
  weight: 'ទម្ងន់ (គីឡូក្រាម)',
  size: 'ទំហំកញ្ចប់',
  small: 'តូច (< 1គក)',
  medium: 'មធ្យម (1–5គក)',
  large: 'ធំ (> 5គក)',
  cod: 'ប្រាក់ COD',
  codCurrency: 'ប្រភេទប្រាក់',
  deliveryFee: 'ថ្លៃដឹក ($)',
  note: 'ចំណាំ',
  notePlaceholder: 'ព័ត៌មានបន្ថែមសម្រាប់អ្នកដឹក (ជម្រើស)...',
  submitBtn: 'រក្សាទុក និងផ្ញើ',
  submitting: 'កំពុងរក្សាទុក...',
  successMsg: 'បានបង្កើតដោយជោគជ័យ!',
  errorMsg: 'មិនអាចបង្កើតបានទេ។ សូមពិនិត្យព័ត៌មានឡើងវិញ។',
  selectZone: '— ជ្រើសរើសតំបន់ —',
  loading: 'កំពុងផ្ទុក...',
  required: 'ចាំបាច់',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 12px 11px 40px',
  borderRadius: '10px',
  border: '1.5px solid #e2e8f0',
  fontSize: '13.5px',
  outline: 'none',
  color: '#0f172a',
  backgroundColor: '#ffffff',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: '700',
  color: '#64748b',
  marginBottom: '6px',
  display: 'block',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '700',
  color: '#3b82f6',
  marginBottom: '12px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  borderBottom: '1.5px solid #eff6ff',
  paddingBottom: '8px',
};

const iconWrapStyle: React.CSSProperties = {
  position: 'absolute',
  left: '12px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#94a3b8',
  display: 'flex',
  alignItems: 'center',
  pointerEvents: 'none',
};

export default function MerchantCreateOrderPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const t = lang === 'km' ? t_km : t_en;

  const [zones, setZones] = useState<any[]>([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    senderName: '',
    senderPhone: '',
    receiverName: '',
    receiverPhone: '',
    receiverAddress: '',
    zoneId: '',
    cod: '',
    codCurrency: 'USD',
    deliveryFee: '',
    weight: '1',
    size: 'small',
    note: '',
  });

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/merchant/login'); return; }
    const user = getUser();
    if (user?.role !== 'merchant') { router.push('/merchant/login'); return; }
    setForm(prev => ({
      ...prev,
      senderName: user.name || '',
      senderPhone: user.phone || '',
    }));

    // Fetch merchant profile to get default delivery fee and zone
    api.get('/mobile/merchant/profile').then(res => {
      const profile = res.data;
      setForm(prev => ({
        ...prev,
        ...(profile?.deliveryFee ? { deliveryFee: String(parseFloat(profile.deliveryFee)) } : {}),
        ...(profile?.zoneId ? { zoneId: String(profile.zoneId) } : {}),
      }));
    }).catch(console.error);

    api.get('/zones').then(res => {
      const active = res.data.filter((z: any) => z.active);
      setZones(active);
      // If no zone set from profile, auto-pick first active zone
      setForm(prev => {
        if (!prev.zoneId && active.length > 0) {
          const first = active[0];
          return {
            ...prev,
            zoneId: String(first.id),
            deliveryFee: prev.deliveryFee || (first.price ? String(parseFloat(first.price)) : ''),
          };
        }
        return prev;
      });
    }).catch(console.error).finally(() => setLoadingZones(false));
  }, [router]);

  const handleZoneChange = (zoneIdVal: string) => {
    const selectedZone = zones.find(z => String(z.id) === zoneIdVal);
    const price = selectedZone ? parseFloat(selectedZone.price) : 0;
    setForm(prev => ({ ...prev, zoneId: zoneIdVal, deliveryFee: price > 0 ? String(price) : '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess(false);
    try {
      // Resolve zoneId — use form value, fallback to first active zone
      const resolvedZoneId = Number(form.zoneId) || (zones.length > 0 ? zones[0].id : null);

      const payload: any = {
        senderName: form.senderName || '-',
        senderPhone: form.senderPhone || '-',
        receiverName: form.receiverName || '-',
        receiverPhone: form.receiverPhone,
        receiverAddress: form.receiverAddress,
        cod: Number(form.cod) || 0,
        codCurrency: form.codCurrency,
        deliveryFee: Number(form.deliveryFee) || 0,
        weight: Number(form.weight) || 1,
        size: form.size || 'small',
        note: form.note,
      };
      // Only include zoneId if it's a valid positive number
      if (resolvedZoneId && resolvedZoneId > 0) {
        payload.zoneId = resolvedZoneId;
      }

      await api.post('/mobile/merchant/orders', payload);
      setSuccess(true);
      setForm(prev => ({
        ...prev,
        receiverName: '',
        receiverPhone: '',
        receiverAddress: '',
        zoneId: '',
        cod: '',
        codCurrency: 'USD',
        deliveryFee: '',
        weight: '1',
        size: 'small',
        note: '',
      }));
      setTimeout(() => router.push('/merchant/orders'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || t.errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f1f5f9', paddingBottom: '90px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxShadow: '0 2px 8px rgba(37,99,235,0.18)',
      }}>
        <button
          onClick={() => router.push('/merchant/dashboard')}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', marginRight: '14px' }}
        >
          <MdArrowBack size={22} />
        </button>
        <div>
          <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#fff', margin: 0 }}>{t.title}</h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', margin: 0, marginTop: '2px' }}>
            {lang === 'km' ? 'បំពេញព័ត៌មានខាងក្រោម' : 'Fill in the details below'}
          </p>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Alerts */}
        {success && (
          <div style={{ background: '#ecfdf5', border: '1.5px solid #6ee7b7', color: '#065f46', padding: '13px 16px', borderRadius: '12px', fontSize: '13.5px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ✓ {t.successMsg}
          </div>
        )}
        {error && (
          <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', color: '#b91c1c', padding: '13px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: '500' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Sender info hidden — auto-filled from merchant profile, sent on submit */}

          {/* === RECEIVER INFO === */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={sectionHeaderStyle}>
              <MdPerson size={16} />
              {t.sectionReceiver}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Receiver Name hidden — sent as '-' on submit */}
              {/* Receiver Phone */}
              <div>
                <label style={labelStyle}>{t.receiverPhone} <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <span style={iconWrapStyle}><MdPhone size={17} /></span>
                  <input
                    type="tel"
                    placeholder={lang === 'km' ? 'លេខទូរស័ព្ទ' : 'Phone number'}
                    value={form.receiverPhone}
                    onChange={e => setForm({ ...form, receiverPhone: e.target.value })}
                    required
                    style={inputStyle}
                  />
                </div>
              </div>
              {/* Destination Zone hidden — auto-filled from merchant profile zoneId */}
              {/* Delivery Address */}
              <div>
                <label style={labelStyle}>{t.address} <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <span style={{ ...iconWrapStyle, top: '14px', transform: 'none' }}><MdLocationOn size={17} /></span>
                  <textarea
                    placeholder={t.addressPlaceholder}
                    value={form.receiverAddress}
                    onChange={e => setForm({ ...form, receiverAddress: e.target.value })}
                    required
                    rows={2}
                    style={{
                      ...inputStyle,
                      paddingTop: '11px',
                      resize: 'none',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Package Details hidden — defaults: size='small', weight=1 */}

          {/* === PAYMENT & FEE === */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={sectionHeaderStyle}>
              <MdAttachMoney size={16} />
              {t.sectionPayment}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* COD Amount + Currency */}
              <div>
                <label style={labelStyle}>{t.cod}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px' }}>
                  <div style={{ position: 'relative' }}>
                    <span style={iconWrapStyle}><MdAttachMoney size={17} /></span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={form.cod}
                      onChange={e => setForm({ ...form, cod: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '10px', padding: '3px', border: '1.5px solid #e2e8f0' }}>
                    {(['USD', 'KHR'] as const).map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm({ ...form, codCurrency: c })}
                        style={{
                          flex: 1,
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          background: form.codCurrency === c ? '#fff' : 'transparent',
                          color: form.codCurrency === c ? '#1d4ed8' : '#64748b',
                          boxShadow: form.codCurrency === c ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                          transition: 'all 0.15s',
                        }}
                      >
                        {c === 'USD' ? '$ USD' : '៛ KHR'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Delivery Fee */}
              <div>
                <label style={labelStyle}>{t.deliveryFee}</label>
                <div style={{ position: 'relative' }}>
                  <span style={iconWrapStyle}><MdAttachMoney size={17} /></span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={form.deliveryFee}
                    onChange={e => setForm({ ...form, deliveryFee: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* === NOTE === */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={sectionHeaderStyle}>
              <MdNotes size={16} />
              {t.sectionNote}
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ ...iconWrapStyle, top: '14px', transform: 'none' }}><MdNotes size={17} /></span>
              <textarea
                placeholder={t.notePlaceholder}
                value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })}
                rows={3}
                style={{ ...inputStyle, resize: 'none', paddingTop: '11px' }}
              />
            </div>
          </div>

          {/* === SUBMIT === */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              background: submitting ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: '#fff',
              padding: '16px',
              borderRadius: '14px',
              fontSize: '15px',
              fontWeight: '700',
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: submitting ? 'none' : '0 4px 14px rgba(37,99,235,0.25)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <MdSave size={20} />
            {submitting ? t.submitting : t.submitBtn}
          </button>
        </form>
      </div>
    </div>
  );
}
