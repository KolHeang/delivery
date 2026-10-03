'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { saasApi, Plan } from '@/lib/saas-api';
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
  const [domainSuffix, setDomainSuffix] = useState('.ebsexpress.com');

  const tr = (km: string, en: string) => (lang === 'km' ? km : en);

  const [form, setForm] = useState({
    companyName: '',
    subdomain: '',
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

    if (window.location.host.includes('localhost')) {
      setDomainSuffix(`.localhost:${window.location.port || '3000'}`);
    } else {
      setDomainSuffix('.ebsexpress.com');
    }

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
        } else {
          alert(tr('រកមិនឃើញព័ត៌មានក្រុមហ៊ុននេះទេ', 'Tenant not found'));
          router.push('/admin/saas?tab=tenants');
        }
      } catch (err: any) {
        console.error('Failed to load tenant:', err);
        alert(tr('បរាជ័យក្នុងការទាញយកព័ត៌មានក្រុមហ៊ុន', 'Failed to load company info'));
        router.push('/admin/saas?tab=tenants');
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) {
      loadData();
    }
  }, [tenantId, router]);

  const handleLogout = () => {
    if (confirm(tr('តើអ្នកពិតជាចង់ចាកចេញពីប្រព័ន្ធ (Logout) មែនទេ?', 'Are you sure you want to log out?'))) {
      clearAuth();
      localStorage.removeItem('saas_admin');
      router.push('/admin/saas/login');
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
      router.push('/admin/saas?tab=tenants');
    } catch (err: any) {
      console.error('Update tenant error:', err);
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការកែប្រែព័ត៌មានក្រុមហ៊ុន', 'Failed to update company information'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)', fontFamily: "'Kantumruy Pro', 'Inter', sans-serif" }}>
      {/* 1. MASTER SAAS SIDEBAR */}
      <aside
        style={{
          width: 260,
          background: '#2b529a',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 90,
          boxShadow: '4px 0 20px rgba(0,0,0,0.1)',
        }}
      >
        {/* Brand Header */}
        <div style={{ height: 64, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.12)', boxSizing: 'border-box' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
              padding: 2,
              boxSizing: 'border-box',
              flexShrink: 0,
            }}
          >
            <SaasCloudIcon size={34} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.2px', lineHeight: 1.2 }}>
              EBS Master SaaS
            </div>
            <div style={{ fontSize: 10.5, color: '#93c5fd', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ● {tr('ផ្ទាំងគ្រប់គ្រង SUPER ADMIN', 'SUPER ADMIN PORTAL')}
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#93c5fd', padding: '8px 12px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            {tr('ម៉ឺនុយមេ', 'Main Menu')}
          </div>

          <Link
            href="/admin/saas?tab=dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 10,
              background: 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              borderLeft: '4px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <MdDashboard size={20} color="#bfdbfe" />
            <span>{tr('ផ្ទាំងគ្រប់គ្រង', 'Dashboard')}</span>
          </Link>

          <Link
            href="/admin/saas?tab=tenants"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.18)',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 900,
              textDecoration: 'none',
              borderLeft: '4px solid #ffffff',
              transition: 'all 0.15s',
            }}
          >
            <MdBusiness size={20} color="#ffffff" />
            <span>{tr('ក្រុមហ៊ុនទាំងអស់', 'All Companies')}</span>
          </Link>

          <Link
            href="/admin/saas?tab=invoices"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 10,
              background: 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              borderLeft: '4px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <MdReceiptLong size={20} color="#bfdbfe" />
            <span>{tr('ប្រវត្តិវិក្កយបត្រ', 'Billing Invoices')}</span>
          </Link>

          <Link
            href="/admin/saas?tab=users"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 10,
              background: 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              borderLeft: '4px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <MdGroup size={20} color="#bfdbfe" />
            <span>{tr('គណនី SaaS Admins', 'SaaS Admins')}</span>
          </Link>

          <Link
            href="/admin/saas?tab=plans"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 10,
              background: 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              borderLeft: '4px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <MdWorkspacePremium size={20} color="#bfdbfe" />
            <span>{tr('កញ្ចប់សេវា', 'Plans')}</span>
          </Link>

          <Link
            href="/admin/saas?tab=coupons"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 10,
              background: 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              borderLeft: '4px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <MdLocalOffer size={20} color="#bfdbfe" />
            <span>{tr('គូប៉ុងបញ្ចុះតម្លៃ', 'Promo Coupons')}</span>
          </Link>

          <Link
            href="/admin/saas?tab=partners"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 10,
              background: 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              borderLeft: '4px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <MdAttachMoney size={20} color="#bfdbfe" />
            <span>{tr('ដៃគូសហការ', 'Affiliate Partners')}</span>
          </Link>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div style={{ flex: 1, marginLeft: 260, minWidth: 0, maxWidth: 'calc(100vw - 260px)', display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowX: 'hidden' }}>
        {/* Dedicated SaaS Master Topbar */}
        <header
          style={{
            height: 64,
            background: '#2b529a',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            padding: '0 28px',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 80,
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Language Switcher Button */}
            <button
              onClick={() => setLang(lang === 'en' ? 'km' : 'en')}
              title={tr('ប្តូរភាសា (Switch Language)', 'Switch Language')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                height: 38,
                padding: '0 14px',
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.25)',
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {lang === 'km' ? (
                <>
                  <FlagKm size={22} />
                  <span>ភាសាខ្មែរ</span>
                </>
              ) : (
                <>
                  <FlagEn size={22} />
                  <span>English</span>
                </>
              )}
            </button>

            {/* User Profile Dropdown */}
            <div style={{ position: 'relative', paddingLeft: 14, borderLeft: '1px solid rgba(255, 255, 255, 0.2)' }}>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: showProfileDropdown ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 12,
                  padding: '6px 12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: 14,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}
                >
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#ffffff', lineHeight: 1.2 }}>{user?.name || 'Master Super Admin'}</div>
                  <div style={{ fontSize: 11, color: '#bfdbfe', fontWeight: 600 }}>{user?.email || 'superadmin@ebsexpress.com'}</div>
                </div>
                <MdKeyboardArrowDown
                  size={20}
                  color="#ffffff"
                  style={{
                    marginLeft: 4,
                    transform: showProfileDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }}
                />
              </button>

              {showProfileDropdown && (
                <>
                  <div
                    onClick={() => setShowProfileDropdown(false)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      width: 250,
                      background: '#ffffff',
                      borderRadius: 16,
                      boxShadow: '0 14px 35px -4px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.08)',
                      border: '1px solid #e2e8f0',
                      padding: '8px',
                      zIndex: 95,
                    }}
                  >
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: 13.5, fontWeight: 900, color: '#0f172a' }}>{user?.name || 'Master Super Admin'}</div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>{user?.email || 'superadmin@ebsexpress.com'}</div>
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: 6,
                          background: '#eff6ff',
                          color: '#2563eb',
                          fontSize: 10.5,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 6,
                          border: '1px solid #dbeafe',
                        }}
                      >
                        👑 {tr('Super Admin ពេញសិទ្ធិ', 'Full Super Admin')}
                      </span>
                    </div>

                    <div style={{ padding: '6px 4px 2px' }}>
                      <button
                        onClick={() => {
                          setShowProfileDropdown(false);
                          handleLogout();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          width: '100%',
                          padding: '9px 12px',
                          border: 'none',
                          background: '#fef2f2',
                          color: '#dc2626',
                          fontSize: 13,
                          fontWeight: 800,
                          borderRadius: 10,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#dc2626';
                          e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#fef2f2';
                          e.currentTarget.style.color = '#dc2626';
                        }}
                      >
                        <MdLogout size={18} />
                        <span>{tr('ចាកចេញ (Logout)', 'Logout')}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* 3. BODY CONTENT */}
        <main style={{ flex: 1, padding: '24px 28px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
          {/* Back Button & Header */}
          <div style={{ marginBottom: 20 }}>
            <Link
              href="/admin/saas?tab=tenants"
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
                            {p.name} (${Number(p.priceMonthly).toFixed(2)}/ខែ — {p.maxOrdersPerMonth} orders/ខែ)
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
                        <option value="yearly">{tr('ទូទាត់ប្រចាំឆ្នាំ (មានបញ្ចុះតម្លៃពិសេស)', 'Yearly (Special Discount)')}</option>
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
                        {tr('ពាក្យសម្ងាត់ថ្មី (Password)', 'New Password (Optional)')}
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
                      href="/admin/saas?tab=tenants"
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
        </main>
      </div>
    </div>
  );
}
