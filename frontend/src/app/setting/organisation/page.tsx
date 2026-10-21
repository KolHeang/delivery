'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import { useTenant } from '@/lib/TenantContext';
import { MdCloudUpload, MdDeleteOutline, MdBusiness } from 'react-icons/md';

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
  });
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

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

          setForm({
            name: defaultName,
            phone: res.data.phone || (tenant?.phone || ''),
            email: res.data.email || (tenant?.email || ''),
            website: res.data.website || '',
            address: res.data.address || '',
            logo: existingLogo,
          });
          setLogoPreview(existingLogo);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [router, tenant?.companyName, tenant?.logoUrl, isTenant]);

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
                            background: 'rgba(255,255,255,0.85)',
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 240 }}>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                        style={{ display: 'none' }}
                        onChange={handleLogoChange}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={logoUploading || saving}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600 }}
                        >
                          <MdCloudUpload size={18} />
                          {logoPreview ? t('changeLogo') : t('uploadLogo')}
                        </button>

                        {logoPreview && (
                          <button
                            type="button"
                            className="btn btn-danger-outline"
                            onClick={handleRemoveLogo}
                            disabled={logoUploading || saving}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '8px 14px',
                              fontSize: 13,
                              border: '1px solid #fee2e2',
                              background: '#fff',
                              color: '#ef4444',
                              borderRadius: 8,
                              cursor: 'pointer',
                            }}
                          >
                            <MdDeleteOutline size={18} />
                            {t('removeLogo')}
                          </button>
                        )}
                      </div>

                      <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                        {t('logoUploadHint')}
                      </div>
                      {logoUploading && (
                        <div style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{t('logoUploading')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('companyName')} <span>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
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
