'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import { useTenant } from '@/lib/TenantContext';
import { applyBrandTheme } from '@/lib/theme';
import { MdCloudUpload, MdDeleteOutline, MdBusiness } from 'react-icons/md';

const PRESET_BRAND_COLORS = [
  { name: 'Royal Blue - ពណ៌លំនាំដើម', color: '#2563eb' },
  { name: 'Emerald Express - ពណ៌បៃតង', color: '#059669' },
  { name: 'Flame Orange - ពណ៌ទឹកក្រូច', color: '#ea580c' },
  { name: 'Crimson Red - ពណ៌ក្រហម', color: '#dc2626' },
  { name: 'Deep Purple - ពណ៌ស្វាយ', color: '#7c3aed' },
  { name: 'Amber Gold - ពណ៌លឿងទុំ', color: '#d97706' },
  { name: 'Cyan Tech - ពណ៌ផ្ទៃមេឃ', color: '#0284c7' },
  { name: 'Midnight Dark - ពណ៌ខ្មៅរលោង', color: '#0f172a' },
  { name: 'Rose Pink - ពណ៌ផ្កាឈូក', color: '#e11d48' },
  { name: 'Teal Modern - ពណ៌ត្បូងកណ្តៀង', color: '#0d9488' },
];

export default function OrganisationSettingsPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { tenant, isTenant, refetchTenant } = useTenant();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    logo: '',
    primaryColor: '#2563eb',
  });
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const triggerColorUpdate = (color: string) => {
    setForm(prev => ({ ...prev, primaryColor: color }));
    if (/^#[0-9A-Fa-f]{3,6}$/.test(color)) {
      applyBrandTheme(color);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('brand-color-preview', { detail: color }));
      }
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    const load = async () => {
      try {
        const res = await api.get('/settings/organisation');
        if (res.data) {
          const defaultName = (isTenant && (!res.data.name || res.data.name === 'EBS Digital Solutions'))
            ? (tenant?.companyName || res.data.name || '')
            : (res.data.name || '');

          const existingLogo = res.data.logo || (tenant?.logoUrl || '');
          const defaultColor = res.data.primaryColor || res.data.primary_color || tenant?.primaryColor || '#2563eb';

          setForm({
            name: defaultName,
            phone: res.data.phone || (tenant?.phone || ''),
            email: res.data.email || (tenant?.email || ''),
            website: res.data.website || '',
            address: res.data.address || '',
            logo: existingLogo,
            primaryColor: defaultColor,
          });
          setLogoPreview(existingLogo);
          if (defaultColor) {
            applyBrandTheme(defaultColor);
          }
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [router, tenant?.companyName, tenant?.logoUrl, tenant?.primaryColor, isTenant]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert(lang === 'km' ? 'ទំហំរូបភាពត្រូវតែតូចជាង 5MB' : 'Image size must be less than 5MB');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);
    setLogoUploading(true);

    // 1. Read base64 as immediate resilient fallback
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setForm(prev => ({ ...prev, logo: base64 }));
    };
    reader.readAsDataURL(file);

    // 2. Upload file to server storage
    try {
      const formData = new FormData();
      formData.append('file', file);

      let uploadedUrl = '';
      try {
        const res = await api.post('/settings/organisation/logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data?.url) uploadedUrl = res.data.url;
      } catch {
        const res = await api.post('/mobile/upload?folder=organisations', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data?.url) uploadedUrl = res.data.url;
      }

      if (uploadedUrl) {
        setForm(prev => ({ ...prev, logo: uploadedUrl }));
        setLogoPreview(uploadedUrl);
      }
    } catch (err) {
      console.warn('Storage upload failed, keeping base64 fallback', err);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    setForm(prev => ({ ...prev, logo: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      await api.post('/settings/organisation', form);
      if (typeof window !== 'undefined') {
        const cacheKey = tenant?.subdomain ? `app-org-settings-${tenant.subdomain}` : 'app-org-settings';
        localStorage.setItem(cacheKey, JSON.stringify(form));
        localStorage.setItem('app-org-settings', JSON.stringify(form));
        if (form.primaryColor) {
          localStorage.setItem('app-brand-color', form.primaryColor);
          applyBrandTheme(form.primaryColor);
        }
        window.dispatchEvent(new Event('org-settings-updated'));
      }
      if (refetchTenant) {
        await refetchTenant();
      }
      setSuccessMsg(t('orgSavedSuccess'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      alert(lang === 'km' ? 'មិនអាចរក្សាទុកការកំណត់បានទេ' : 'Failed to save settings');
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
        <Topbar title={t('organizationSetting')} subtitle={t('organizationSubtitle')} />
        <div className="page-content">
          <div className="card">
            <div className="card-header"><span className="card-title">{t('organizationDetails')}</span></div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                {successMsg && (
                  <div className="badge badge-delivered" style={{ display: 'block', padding: 12, marginBottom: 16, textAlign: 'center', fontSize: 13 }}>
                    {successMsg}
                  </div>
                )}

                {/* Organization Logo Section */}
                <div className="form-group" style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #f1f5f9' }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, display: 'block', color: '#1e293b' }}>
                    {t('orgLogo')}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                    {/* Logo Preview */}
                    <div
                      style={{
                        width: 104,
                        height: 104,
                        borderRadius: 16,
                        border: logoPreview ? '2px solid #e2e8f0' : '2px dashed #cbd5e1',
                        background: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        position: 'relative',
                        boxShadow: logoPreview ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
                        flexShrink: 0,
                      }}
                    >
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Organization Logo"
                          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4, background: '#ffffff' }}
                        />
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94a3b8' }}>
                          <MdBusiness size={36} />
                          <span style={{ fontSize: 11, marginTop: 4, fontWeight: 500 }}>
                            {lang === 'km' ? 'គ្មានឡូហ្គោ' : 'No Logo'}
                          </span>
                        </div>
                      )}
                      {logoUploading && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
                        </div>
                      )}
                    </div>

                    {/* Logo Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={logoUploading}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '9px 18px' }}
                        >
                          <MdCloudUpload size={18} />
                          <span>{logoPreview ? (lang === 'km' ? 'ប្តូរឡូហ្គោ' : 'Change Logo') : (lang === 'km' ? 'ជ្រើសរើស Logo' : 'Upload Logo')}</span>
                        </button>

                        {logoPreview && (
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={handleRemoveLogo}
                            disabled={logoUploading}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '9px 16px' }}
                          >
                            <MdDeleteOutline size={18} />
                            <span>{lang === 'km' ? 'លុបឡូហ្គោ' : 'Remove Logo'}</span>
                          </button>
                        )}
                      </div>

                      <span style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                        {t('logoRequirement')} (ទម្រង់ការ៉េ 1:1 ត្រូវបានណែនាំ)
                      </span>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        style={{ display: 'none' }}
                        onChange={handleLogoChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Organization Brand Color Picker Section */}
                <div className="form-group" style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, color: '#1e293b' }}>
                        <span>{lang === 'km' ? 'ពណ៌សម្គាល់ស្ថាប័ន' : 'Organization Brand Color'}</span>
                      </label>
                      <p style={{ fontSize: 12.5, color: '#64748b', margin: 0 }}>
                        {lang === 'km'
                          ? 'ជ្រើសរើសពណ៌ចម្បងសម្រាប់ស្ថាប័ន សម្រាប់របារម៉ឺនុយ ប៊ូតុង និងពណ៌សំខាន់ៗ'
                          : 'Select primary brand color for organization sidebar, buttons and highlights'}
                      </p>
                    </div>

                    {/* Live Preview Button */}
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 14px',
                      borderRadius: 8,
                      background: form.primaryColor,
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 700,
                      boxShadow: `0 4px 12px ${form.primaryColor}40`,
                      transition: 'all 0.2s ease',
                    }}>
                      <span>{lang === 'km' ? 'គំរូពណ៌' : 'Preview'}</span>
                    </div>
                  </div>

                  {/* Preset Swatches and Color Picker */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {PRESET_BRAND_COLORS.map(p => {
                        const isSelected = form.primaryColor?.toLowerCase() === p.color.toLowerCase();
                        return (
                          <button
                            key={p.color}
                            type="button"
                            onClick={() => triggerColorUpdate(p.color)}
                            title={p.name}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: p.color,
                              border: isSelected ? '2.5px solid #0f172a' : '2px solid #ffffff',
                              boxShadow: isSelected ? '0 0 0 2px #64748b' : '0 1px 3px rgba(0,0,0,0.15)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontSize: 14,
                              fontWeight: 800,
                              transition: 'all 0.15s ease',
                              transform: isSelected ? 'scale(1.12)' : 'scale(1)',
                            }}
                          >
                            {isSelected && '✓'}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Color Input */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#ffffff',
                      padding: '4px 10px',
                      borderRadius: 8,
                      border: '1.5px solid #cbd5e1',
                    }}>
                      <input
                        type="color"
                        value={form.primaryColor}
                        onChange={(e) => triggerColorUpdate(e.target.value)}
                        style={{
                          width: 26,
                          height: 26,
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          background: 'transparent',
                          padding: 0,
                        }}
                        title={lang === 'km' ? 'ជ្រើសរើសពណ៌ផ្ទាល់ខ្លួន' : 'Choose custom color'}
                      />
                      <input
                        type="text"
                        value={form.primaryColor}
                        onChange={(e) => triggerColorUpdate(e.target.value)}
                        style={{
                          width: 80,
                          border: 'none',
                          background: 'transparent',
                          fontSize: 12.5,
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          color: '#1e293b',
                          outline: 'none',
                        }}
                        placeholder="#2563eb"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('orgPhone')} <span>*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('orgEmail')} <span>*</span></label>
                    <input
                      type="email"
                      className="form-control"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('orgWebsite')}</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.website}
                    onChange={e => setForm({ ...form, website: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('orgAddress')} <span>*</span></label>
                  <textarea
                    className="form-control"
                    rows={3}
                    style={{ resize: 'vertical' }}
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                    required
                  />
                </div>

                <div style={{ marginTop: 20, textAlign: 'right' }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? t('savingChanges') : t('saveChanges')}
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
