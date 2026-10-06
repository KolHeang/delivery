'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { isAuthenticated, hasPermission } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import { MdArrowBack, MdMap, MdSave } from 'react-icons/md';
import LocationMapModal from '@/components/ui/LocationMapModal';

export default function EditBranchPage() {
  const router = useRouter();
  const params = useParams();
  const branchId = params.id;
  const { lang } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [merchantName, setMerchantName] = useState('');
  const [isMapOpen, setIsMapOpen] = useState(false);

  const [form, setForm] = useState({
    merchantId: '',
    name: '',
    code: '',
    contactName: '',
    phone: '',
    address: '',
    latitude: '',
    longitude: '',
    isDefault: false,
    note: '',
  });

  useEffect(() => {
    if (!isAuthenticated() || !hasPermission('branches.update, merchants.update')) {
      router.push('/merchants/branches');
      return;
    }

    api.get(`/merchants/branches/detail/${branchId}`)
      .then((bRes) => {
        const b = bRes.data;
        if (b) {
          setMerchantName(b.merchant?.name || '');
          setForm({
            merchantId: b.merchantId ? String(b.merchantId) : '',
            name: b.name || '',
            code: b.code || '',
            contactName: b.contactName || '',
            phone: b.phone || '',
            address: b.address || '',
            latitude: b.latitude ? String(b.latitude) : '',
            longitude: b.longitude ? String(b.longitude) : '',
            isDefault: !!b.isDefault,
            note: b.note || '',
          });
        }
      })
      .catch((err) => {
        console.error(err);
        alert('Failed to load branch details');
        router.push('/merchants/branches');
      })
      .finally(() => setLoading(false));
  }, [router, branchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!form.name.trim()) {
      errs.name = lang === 'km' ? 'សូមបញ្ចូលឈ្មោះសាខា' : 'Please enter branch name';
    }
    if (!form.phone.trim()) {
      errs.phone = lang === 'km' ? 'សូមបញ្ចូលលេខទូរស័ព្ទ' : 'Please enter phone number';
    }
    if (!form.address.trim()) {
      errs.address = lang === 'km' ? 'សូមបញ្ចូលអាសយដ្ឋាន' : 'Please enter address';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSaving(true);

    try {
      const payload: any = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        contactName: form.contactName.trim() || undefined,
        phone: form.phone.trim(),
        address: form.address.trim(),
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        isDefault: form.isDefault,
        note: form.note.trim() || undefined,
      };

      await api.put(`/merchants/branches/detail/${branchId}`, payload);
      router.push('/merchants/branches');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating branch');
      setSaving(false);
    }
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
          title={lang === 'km' ? '🏢 កែប្រែព័ត៌មានសាខា' : '🏢 Edit Branch'}
          subtitle={merchantName ? `${lang === 'km' ? 'សាខារបស់ហាង' : 'Branch of'} ${merchantName}` : 'Update branch details'}
        />

        <div className="page-content">
          <div className="card">
            {/* Header */}
            <div
              className="card-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 20px',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <button
                type="button"
                onClick={() => router.push('/merchants/branches')}
                className="btn btn-ghost btn-icon btn-sm"
                title={lang === 'km' ? 'ត្រឡប់ក្រោយ' : 'Back'}
              >
                <MdArrowBack size={18} />
              </button>
              <span className="card-title" style={{ fontSize: 16, fontWeight: 700 }}>
                {lang === 'km' ? 'កែប្រែព័ត៌មានសាខា' : 'Edit Branch'} {form.name ? `- ${form.name}` : ''}
              </span>
            </div>

            <div className="card-body" style={{ padding: '20px 24px' }}>
              <form noValidate onSubmit={handleSubmit}>
                {/* Merchant Name Display */}
                {merchantName && (
                  <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lang === 'km' ? 'ហាងមេ' : 'Merchant'}: </span>
                    <strong style={{ fontSize: 14, color: '#0f172a' }}>{merchantName}</strong>
                  </div>
                )}

                {/* Row 1: Branch Name */}
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                    {lang === 'km' ? 'ឈ្មោះសាខា' : 'Branch Name'} <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                    placeholder={lang === 'km' ? 'ឧ. សាខាទួលគោក, សាខាបឹងកេងកង...' : 'e.g. Tuol Kork Branch'}
                    value={form.name}
                    onChange={(e) => {
                      setForm({ ...form, name: e.target.value });
                      if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    style={{ height: 42, fontSize: 14 }}
                  />
                  {errors.name && (
                    <div className="form-error-text" style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>
                      {errors.name}
                    </div>
                  )}
                </div>

                {/* Row 2: Contact Person & Phone */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                      {lang === 'km' ? 'អ្នកចាត់ការ' : 'Contact Person'}
                    </label>
                    <input
                      className="form-control"
                      placeholder={lang === 'km' ? 'ឈ្មោះអ្នកកាន់សាខា' : 'Branch manager name'}
                      value={form.contactName}
                      onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                      style={{ height: 42, fontSize: 14 }}
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                      {lang === 'km' ? 'លេខទូរស័ព្ទ' : 'Phone'} <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                      placeholder="012 345 678"
                      value={form.phone}
                      onChange={(e) => {
                        setForm({ ...form, phone: e.target.value });
                        if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                      }}
                      style={{ height: 42, fontSize: 14 }}
                    />
                    {errors.phone && (
                      <div className="form-error-text" style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>
                        {errors.phone}
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 3: Address with Single Clean Map Button */}
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                    {lang === 'km' ? 'អាសយដ្ឋាន' : 'Address'} <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      className={`form-control ${errors.address ? 'is-invalid' : ''}`}
                      placeholder={lang === 'km' ? 'បញ្ចូលអាសយដ្ឋាន ឬជ្រើសរើសលើផែនទី...' : 'Enter address or select on map...'}
                      value={form.address}
                      onChange={(e) => {
                        setForm({ ...form, address: e.target.value });
                        if (errors.address) setErrors((prev) => ({ ...prev, address: '' }));
                      }}
                      style={{ flex: 1, height: 42, fontSize: 14 }}
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
                        padding: '0 16px',
                        height: 42,
                      }}
                    >
                      <MdMap size={18} />
                      {lang === 'km' ? 'រើសលើផែនទី' : 'Pick on Map'}
                    </button>
                  </div>
                  {errors.address && (
                    <div className="form-error-text" style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>
                      {errors.address}
                    </div>
                  )}
                  {form.latitude && form.longitude && (
                    <div style={{ fontSize: 11.5, color: '#16a34a', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>📍 GPS: {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}</span>
                    </div>
                  )}
                </div>

                {/* Row 4: Note */}
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                    {lang === 'km' ? 'ចំណាំ' : 'Note'}
                  </label>
                  <input
                    className="form-control"
                    placeholder={lang === 'km' ? 'ចំណាំសម្រាប់ Driver ទៅយក' : 'Notes for driver pickup'}
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    style={{ height: 42, fontSize: 14 }}
                  />
                </div>

                {/* Row 5: Clean Default Branch Toggle Card */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    background: '#f8fafc',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    marginBottom: 24,
                  }}
                >
                  <input
                    type="checkbox"
                    id="isDefaultBranch"
                    checked={form.isDefault}
                    onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                    style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#2563eb' }}
                  />
                  <label htmlFor="isDefaultBranch" style={{ cursor: 'pointer', margin: 0, fontSize: 13.5, fontWeight: 600, color: '#1e293b' }}>
                    {lang === 'km' ? 'កំណត់ជាសាខាដើម' : 'Set as Default Branch'}
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 400, color: '#64748b', marginTop: 2 }}>
                      {lang === 'km' ? 'ប្រើប្រាស់សាខានេះជាទីតាំងចម្បងរបស់ហាងសម្រាប់ទទួលការបញ្ជាទិញ' : 'Use this location as the primary shop branch for incoming orders'}
                    </span>
                  </label>
                </div>

                {/* Bottom Action Buttons */}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => router.push('/merchants/branches')}
                    disabled={saving}
                    style={{ padding: '9px 20px', fontWeight: 600 }}
                  >
                    {lang === 'km' ? 'បោះបង់' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                    style={{
                      padding: '9px 24px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#2563eb',
                    }}
                  >
                    <MdSave size={18} />
                    {saving ? (lang === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...') : (lang === 'km' ? 'រក្សាទុកការកែប្រែ' : 'Update Branch')}
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
          if (errors.address) setErrors((prev) => ({ ...prev, address: '' }));
        }}
      />
    </div>
  );
}
