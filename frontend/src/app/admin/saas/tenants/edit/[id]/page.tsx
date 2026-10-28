'use client';

import { SaasMasterLayout } from '@/components/layout/SaasMasterLayout';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { saasApi, Plan } from '@/lib/saas-api';
import api from '@/lib/api';
import { getUser, clearAuth } from '@/lib/auth';
import {
  MdDashboard,
  MdBusiness,
  MdArrowBack,
  MdGroup,
  MdWorkspacePremium,
  MdLocalOffer,
  MdAttachMoney,
  MdLogout,
  MdKeyboardArrowDown,
  MdReceiptLong,
  MdCloudUpload,
  MdDelete,
  MdAddPhotoAlternate,
} from 'react-icons/md';
import { SaasCloudIcon } from '@/components/ui/SaasCloudIcon';

const FlagKm = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={Math.round(size * 0.67)} viewBox="0 0 900 600" style={{ borderRadius: 3, display: 'inline-block', verticalAlign: 'middle', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
    <rect width="900" height="600" fill="#032EA6" />
    <rect y="150" width="900" height="300" fill="#ED1B24" />
    <g fill="#ffffff">
      <path d="M450 200 L460 235 L475 235 L475 295 L425 295 L425 235 L440 235 Z" />
      <path d="M380 235 L390 255 L405 255 L405 295 L355 295 L355 255 L370 255 Z" />
      <path d="M520 235 L530 255 L545 255 L545 295 L495 295 L495 255 L510 255 Z" />
      <rect x="330" y="295" width="240" height="65" />
      <rect x="310" y="360" width="280" height="40" />
    </g>
  </svg>
);

const FlagEn = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={Math.round(size * 0.67)} viewBox="0 0 60 30" style={{ borderRadius: 3, display: 'inline-block', verticalAlign: 'middle', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
    <clipPath id="s"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
    <clipPath id="t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath>
    <g clipPath="url(#s)">
      <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#t)" stroke="#C8102E" strokeWidth="4"/>
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
    </g>
  </svg>
);

import { getDomainSuffix } from '@/lib/domain';

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

export default function EditTenantPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = Number(params.id);

  const [lang, setLang] = useState<'km' | 'en'>('km');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [domainSuffix, setDomainSuffix] = useState('.new-delivery.rithyboth.work');

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [logoUploading, setLogoUploading] = useState<boolean>(false);
  const logoInputRef = React.useRef<HTMLInputElement | null>(null);

  const tr = (km: string, en: string) => (lang === 'km' ? km : en);

  const [form, setForm] = useState({
    companyName: '',
    subdomain: '',
    logo: '',
    primaryColor: '#2563eb',
    planId: 0,
    billingCycle: 'monthly' as 'monthly' | 'yearly',
    status: 'active',
    phone: '',
    email: '',
    address: '',
    adminName: '',
    adminPhone: '',
    adminEmail: '',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setDomainSuffix(getDomainSuffix());

    const token = localStorage.getItem('access_token');
    const saasAdminRaw = localStorage.getItem('saas_admin');
    const currentUser = getUser();

    if (!token && !saasAdminRaw && !currentUser) {
      router.push('/admin/saas/login');
      return;
    }

    let adminObj = null;
    if (saasAdminRaw) {
      try {
        adminObj = JSON.parse(saasAdminRaw);
      } catch (e) {}
    }

    if (adminObj) {
      setUser(adminObj);
    } else if (currentUser) {
      setUser(currentUser);
    } else {
      setUser({ name: 'Master Super Admin', email: 'superadmin@ebsexpress.com', role: 'super_admin' });
    }

    const loadData = async () => {
      if (!tenantId || isNaN(tenantId)) return;
      try {
        setLoading(true);
        const [plansRes, tenantRes] = await Promise.all([
          saasApi.getPlans(true).catch(() => []),
          saasApi.getTenantById(tenantId).catch(() => null),
        ]);

        setPlans(plansRes || []);

        if (tenantRes) {
          const activeSub = (tenantRes.subscriptions && tenantRes.subscriptions[0]) || null;
          setForm({
            companyName: tenantRes.name || '',
            subdomain: tenantRes.slug || '',
            logo: tenantRes.logo || '',
            primaryColor: tenantRes.primaryColor || tenantRes.settings?.primaryColor || '#2563eb',
            planId: tenantRes.planId || (tenantRes.plan ? tenantRes.plan.id : (plansRes && plansRes[0]?.id) || 0),
            billingCycle: activeSub?.billingCycle || 'monthly',
            status: tenantRes.status || 'active',
            phone: tenantRes.phone || '',
            email: tenantRes.email || '',
            address: tenantRes.address || '',
            adminName: tenantRes.adminUser?.name || tenantRes.name || '',
            adminPhone: tenantRes.adminUser?.phone || tenantRes.phone || '',
            adminEmail: tenantRes.adminUser?.email || tenantRes.email || '',
            password: '',
          });
          if (tenantRes.logo) {
            setLogoPreview(tenantRes.logo);
          }
        } else {
          alert(tr('រកមិនឃើញព័ត៌មានក្រុមហ៊ុននេះទេ', 'Tenant not found'));
          router.push('/admin/saas/tenants');
        }
      } catch (err: any) {
        console.error('Failed to load tenant:', err);
        alert(tr('បរាជ័យក្នុងការទាញយកព័ត៌មានក្រុមហ៊ុន', 'Failed to load company info'));
        router.push('/admin/saas/tenants');
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) {
      loadData();
    }
  }, [tenantId, router]);

  const handleLogout = () => {
    if (confirm(tr('តើអ្នកពិតជាចង់ចាកចេញពីប្រព័ន្ធមែនទេ?', 'Are you sure you want to log out?'))) {
      clearAuth();
      localStorage.removeItem('saas_admin');
      router.push('/admin/saas/login');
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert(tr('ទំហំរូបភាពត្រូវតែតូចជាង 5MB', 'Image size must be less than 5MB'));
      return;
    }

    setLogoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);

    // 1. Convert to Base64 data URL as immediate fallback
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setForm(prev => ({ ...prev, logo: base64String }));
    };
    reader.readAsDataURL(file);

    // 2. Also try uploading to server storage
    try {
      setLogoUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/mobile/upload/single?folder=tenants', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.url) {
        setForm(prev => ({ ...prev, logo: res.data.url }));
      }
    } catch {
      // Fallback is base64String
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setForm(prev => ({ ...prev, logo: '' }));
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errs: Record<string, string> = {};
    if (!form.companyName.trim()) {
      errs.companyName = tr('សូមបញ្ចូលឈ្មោះក្រុមហ៊ុន', 'Please enter company name');
    }
    if (!form.subdomain.trim()) {
      errs.subdomain = tr('សូមបញ្ចូលឈ្មោះ Subdomain', 'Please enter subdomain');
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});

    try {
      setSaving(true);
      await saasApi.updateTenant(tenantId, {
        name: form.companyName.trim(),
        slug: form.subdomain.trim().toLowerCase(),
        logo: form.logo,
        primaryColor: form.primaryColor || '#2563eb',
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        planId: form.planId ? Number(form.planId) : undefined,
        billingCycle: form.billingCycle,
        status: form.status,
        adminName: form.adminName.trim(),
        password: form.password ? form.password.trim() : undefined,
      });

      alert(tr('បានកែប្រែព័ត៌មានក្រុមហ៊ុនជោគជ័យ!', 'Company information updated successfully!'));
      router.push('/admin/saas/tenants');
    } catch (err: any) {
      console.error('Update tenant error:', err);
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការកែប្រែព័ត៌មានក្រុមហ៊ុន', 'Failed to update company information'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SaasMasterLayout activeTab="tenants">
          {/* Back Button & Header */}
          <div style={{ marginBottom: 20 }}>
            <Link
              href="/admin/saas/tenants"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--text-muted)',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 10,
              }}
            >
              <MdArrowBack size={16} />
              <span>{tr('ត្រឡប់ទៅបញ្ជីក្រុមហ៊ុន', 'Back to Tenant List')}</span>
            </Link>

            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              {tr('កែប្រែព័ត៌មានក្រុមហ៊ុន', 'Edit Company Information')}
            </h1>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
              {tr('កែប្រែព័ត៌មានលម្អិត កញ្ចប់គម្រោង និងស្ថានភាពដំណើរការរបស់ក្រុមហ៊ុន', 'Update company details, subscription plan, and account status')}
            </p>
          </div>

          {/* Form Card */}
          <div className="card" style={{ width: '100%' }}>
            <div className="card-header">
              <span className="card-title">{tr('ព័ត៌មានក្រុមហ៊ុន', 'Company Details')}</span>
            </div>

            <div className="card-body" style={{ padding: '24px 28px' }}>
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  {tr('កំពុងទាញយកទិន្នន័យ...', 'Loading company details...')}
                </div>
              ) : (
                <form onSubmit={handleSubmit} autoComplete="off">
                  {/* SECTION 1: Company & Workspace */}
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center' }}>
                    {tr('១. ព័ត៌មានក្រុមហ៊ុន និង Workspace', '1. Company & Workspace Details')}
                  </div>

                  {/* Company Logo Upload Card */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '16px 20px',
                    background: '#f8fafc',
                    borderRadius: 12,
                    border: '1.5px dashed #cbd5e1',
                    marginBottom: 20,
                  }}>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                      style={{ display: 'none' }}
                      onChange={handleLogoChange}
                    />
                    <div
                      onClick={() => logoInputRef.current?.click()}
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 14,
                        background: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        position: 'relative',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                        flexShrink: 0,
                        transition: 'all 0.15s ease',
                      }}
                      title={tr('ចុចដើម្បីជ្រើសរើសរូប Logo', 'Click to choose company logo')}
                    >
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Logo Preview"
                          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
                        />
                      ) : (
                        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                          <MdAddPhotoAlternate size={28} />
                          <div style={{ fontSize: 9, fontWeight: 700, marginTop: 2 }}>LOGO</div>
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1e293b' }}>
                          {tr('រូបសញ្ញាក្រុមហ៊ុន', 'Company Logo')}
                        </span>
                        {logoUploading && (
                          <span style={{ fontSize: 11, background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                            {tr('កំពុង Upload...', 'Uploading...')}
                          </span>
                        )}
                        {logoPreview && !logoUploading && (
                          <span style={{ fontSize: 11, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                            {tr('✓ មានរូបភាព Logo រួចហើយ', '✓ Logo image set')}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 8px 0' }}>
                        {tr('គាំទ្រទម្រង់ PNG, JPG, WebP ឬ SVG • ទំហំមិនលើសពី 5MB', 'Supports PNG, JPG, WebP, or SVG • Max 5MB')}
                      </p>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="btn btn-outline"
                          style={{
                            fontSize: 12,
                            height: 32,
                            padding: '0 12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            borderRadius: 6,
                          }}
                        >
                          <MdCloudUpload size={16} />
                          {logoPreview ? tr('ប្តូររូប Logo', 'Change Logo') : tr('ជ្រើសរើសរូប Logo', 'Choose Logo')}
                        </button>
                        {logoPreview && (
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="btn btn-ghost"
                            style={{
                              fontSize: 12,
                              height: 32,
                              padding: '0 8px',
                              color: '#ef4444',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <MdDelete size={16} /> {tr('លុបចេញ', 'Remove')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        {tr('ឈ្មោះក្រុមហ៊ុន', 'Company Name')} <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className={`form-control ${errors.companyName ? 'is-invalid' : ''}`}
                        placeholder="ឧ. Angkor Express, Battambang Logistics"
                        value={form.companyName}
                        onChange={(e) => {
                          setForm({ ...form, companyName: e.target.value });
                          if (errors.companyName) setErrors({ ...errors, companyName: '' });
                        }}
                      />
                      {errors.companyName && <div className="form-error-text">{errors.companyName}</div>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        {tr('ឈ្មោះ Subdomain សម្រាប់ Workspace', 'Workspace Subdomain')} <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div style={{ display: 'flex' }}>
                        <input
                          type="text"
                          required
                          className={`form-control ${errors.subdomain ? 'is-invalid' : ''}`}
                          style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                          placeholder="angkorexpress"
                          value={form.subdomain}
                          onChange={(e) => {
                            setForm({ ...form, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') });
                            if (errors.subdomain) setErrors({ ...errors, subdomain: '' });
                          }}
                        />
                        <span
                          suppressHydrationWarning
                          style={{
                            padding: '0 12px',
                            background: '#f8fafc',
                            border: '1.5px solid var(--border)',
                            borderLeft: 'none',
                            borderTopRightRadius: 'var(--radius)',
                            borderBottomRightRadius: 'var(--radius)',
                            display: 'flex',
                            alignItems: 'center',
                            color: 'var(--text-secondary)',
                            fontSize: 12.5,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {domainSuffix}
                        </span>
                      </div>
                      {errors.subdomain && <div className="form-error-text">{errors.subdomain}</div>}
                    </div>
                  </div>

                  {/* Brand Theme Color Selector */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 14,
                    padding: '16px 18px',
                    marginBottom: 20,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 13.5, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                          <span>🎨</span>
                          <span>{tr('ពណ៌សម្គាល់ក្រុមហ៊ុន', 'Brand Theme Color')}</span>
                        </label>
                        <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0 0' }}>
                          {tr('ជ្រើសរើសពណ៌ចម្បងសម្រាប់ Workspace ក្រុមហ៊ុននេះ សម្រាប់ប៊ូតុង របារម៉ឺនុយ និងផ្ទាំង Login', 'Choose the primary theme color for this company workspace')}
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
                        <span>✨ {tr('គំរូពណ៌', 'Theme Preview')}</span>
                      </div>
                    </div>

                    {/* Preset Swatches and Color Picker */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {PRESET_BRAND_COLORS.map(p => {
                          const isSelected = form.primaryColor.toLowerCase() === p.color.toLowerCase();
                          return (
                            <button
                              key={p.color}
                              type="button"
                              onClick={() => setForm(prev => ({ ...prev, primaryColor: p.color }))}
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
                          onChange={(e) => setForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                          style={{
                            width: 26,
                            height: 26,
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            background: 'transparent',
                            padding: 0,
                          }}
                          title={tr('ជ្រើសរើសពណ៌ផ្ទាល់ខ្លួន', 'Custom Hex Color')}
                        />
                        <input
                          type="text"
                          value={form.primaryColor}
                          onChange={(e) => setForm(prev => ({ ...prev, primaryColor: e.target.value }))}
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
                      <label className="form-label">
                        {tr('កញ្ចប់គម្រោងតម្លៃ', 'Subscription Plan')}
                      </label>
                      <select
                        className="form-control"
                        value={form.planId}
                        onChange={(e) => setForm({ ...form, planId: Number(e.target.value) })}
                      >
                        {plans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} - ${Number(p.priceMonthly).toFixed(2)}/ខែ — {p.maxOrdersPerMonth} orders/ខែ
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        {tr('វដ្តទូទាត់ប្រាក់', 'Billing Cycle')}
                      </label>
                      <select
                        className="form-control"
                        value={form.billingCycle}
                        onChange={(e) => setForm({ ...form, billingCycle: e.target.value as any })}
                      >
                        <option value="monthly">{tr('ទូទាត់ប្រចាំខែ', 'Monthly')}</option>
                        <option value="yearly">{tr('ទូទាត់ប្រចាំឆ្នាំ — មានបញ្ចុះតម្លៃពិសេស', 'Yearly — Special Discount')}</option>
                      </select>
                    </div>
                  </div>

                  {/* SECTION 2: Contact & Address */}
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', margin: '22px 0 14px', display: 'flex', alignItems: 'center' }}>
                    {tr('២. ព័ត៌មានទំនាក់ទំនង និងអាសយដ្ឋាន', '2. Contact & Address Details')}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        {tr('លេខទូរស័ព្ទក្រុមហ៊ុន', 'Company Phone Number')}
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="012 345 678"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        {tr('អ៊ីមែលក្រុមហ៊ុន', 'Company Email')}
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="info@company.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        {tr('ស្ថានភាពក្រុមហ៊ុន', 'Company Status')}
                      </label>
                      <select
                        className="form-control"
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                      >
                        <option value="active">Active (សកម្ម)</option>
                        <option value="suspended">Suspended (ផ្អាក)</option>
                        <option value="trial">Trial (សាកល្បង)</option>
                        <option value="expired">Expired (ផុតកំណត់)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      {tr('អាសយដ្ឋាន', 'Address')}
                    </label>
                    <textarea
                      rows={2}
                      className="form-control"
                      placeholder={tr('បញ្ចូលទីតាំង ឬអាសយដ្ឋានក្រុមហ៊ុន...', 'Enter company address...')}
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </div>

                  {/* SECTION 3: Admin User Credentials */}
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', margin: '22px 0 14px', display: 'flex', alignItems: 'center' }}>
                    {tr('៣. គណនី Admin សម្រាប់ក្រុមហ៊ុន', '3. Tenant Admin Account & Credentials')}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        {tr('ឈ្មោះអ្នកគ្រប់គ្រង', 'Admin Manager Name')}
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="ឧ. Sok Dara"
                        value={form.adminName}
                        onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        {tr('ពាក្យសម្ងាត់ថ្មី', 'New Password')}
                      </label>
                      <input
                        type="password"
                        autoComplete="new-password"
                        className="form-control"
                        placeholder={tr('ទុកទំនេរ បើមិនចង់ប្តូរពាក្យសម្ងាត់...', 'Leave blank to keep existing password...')}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                      />
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        {tr('ទុកទំនេរ បើមិនចង់ផ្លាស់ប្តូរពាក្យសម្ងាត់', 'Leave blank to keep existing password')}
                      </div>
                    </div>
                  </div>

                  {/* Submit Buttons */}
                  <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <Link
                      href="/admin/saas/tenants"
                      className="btn btn-cancel"
                      style={{ background: '#dc2626', color: '#ffffff', border: '1px solid #dc2626', fontWeight: 700 }}
                    >
                      {tr('បោះបង់', 'Cancel')}
                    </Link>
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn btn-primary"
                      style={{ background: '#2563eb', color: '#ffffff', border: '1px solid #2563eb', fontWeight: 700 }}
                    >
                      {saving ? tr('កំពុងរក្សាទុក...', 'Saving...') : tr('រក្សាទុកការកែប្រែ', 'Save Changes')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
            </SaasMasterLayout>
  );
}
