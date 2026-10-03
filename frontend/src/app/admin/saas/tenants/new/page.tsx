'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saasApi, Plan } from '@/lib/saas-api';
import { getUser, clearAuth } from '@/lib/auth';
import {
  MdDashboard,
  MdBusiness,
  MdArrowBack,
  MdCheck,
  MdContentCopy,
  MdShare,
  MdOpenInNew,
  MdWorkspacePremium,
  MdPerson,
  MdVpnKey,
  MdEmail,
  MdPhone,
  MdLanguage,
  MdAutoAwesome,
  MdCheckCircle,
  MdRefresh,
  MdGroup,
  MdLocalOffer,
  MdAttachMoney,
  MdLogout,
  MdKeyboardArrowDown,
} from 'react-icons/md';
import { SaasCloudIcon } from '@/components/ui/SaasCloudIcon';

export default function CreateTenantPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const [companyForm, setCompanyForm] = useState({
    companyName: '',
    subdomain: '',
    planId: 2,
    billingCycle: 'monthly' as 'monthly' | 'yearly',
    couponCode: '',
    referralCode: '',
    adminName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [createdCredentials, setCreatedCredentials] = useState<{
    companyName: string;
    subdomain: string;
    url: string;
    adminName: string;
    email: string;
    password: string;
    planName: string;
  } | null>(null);
  const [domainSuffix, setDomainSuffix] = useState('.ebsexpress.com');
  const [copied, setCopied] = useState(false);

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

    // If not authenticated, redirect to SaaS Master Admin Login page
    if (!token && !saasAdminRaw && !currentUser) {
      router.push('/admin/saas/login');
      return;
    }

    let adminObj = null;
    if (saasAdminRaw) {
      try {
        adminObj = JSON.parse(saasAdminRaw);
      } catch (e) {
        // ignore
      }
    }

    if (adminObj) {
      setUser(adminObj);
    } else if (currentUser) {
      setUser(currentUser);
    } else {
      setUser({ name: 'Master Super Admin', email: 'superadmin@ebsexpress.com', role: 'super_admin' });
    }

    loadPlans();
  }, []);

  const handleLogout = () => {
    if (confirm('តើអ្នកពិតជាចង់ចាកចេញពីប្រព័ន្ធ (Logout) មែនទេ?')) {
      clearAuth();
      localStorage.removeItem('saas_admin');
      router.push('/admin/saas/login');
    }
  };

  const loadPlans = async () => {
    try {
      setLoading(true);
      const res = await saasApi.getPlans(true);
      setPlans(res || []);
      if (res && res.length > 1) {
        setCompanyForm(prev => ({ ...prev, planId: res[1].id }));
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const fullPass = pass + '@2026';
    setCompanyForm(prev => ({ ...prev, password: fullPass }));
    return fullPass;
  };

  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const slug = val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    setCompanyForm(prev => ({
      ...prev,
      companyName: val,
      subdomain: slug,
    }));
    if (errors.companyName || errors.subdomain) {
      setErrors(prev => {
        const next = { ...prev };
        delete next.companyName;
        delete next.subdomain;
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!companyForm.companyName.trim()) {
      errs.companyName = 'សូមបំពេញឈ្មោះក្រុមហ៊ុន';
    }
    if (!companyForm.subdomain.trim()) {
      errs.subdomain = 'សូមបំពេញឈ្មោះ Subdomain';
    }
    if (!companyForm.adminName.trim()) {
      errs.adminName = 'សូមបំពេញឈ្មោះអ្នកគ្រប់គ្រង';
    }
    if (!companyForm.phone.trim()) {
      errs.phone = 'សូមបំពេញលេខទូរស័ព្ទ';
    }
    if (!companyForm.email.trim()) {
      errs.email = 'សូមបំពេញអ៊ីម៉ែល';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyForm.email.trim())) {
      errs.email = 'សូមបំពេញអ៊ីម៉ែលត្រឹមត្រូវ';
    }
    if (!companyForm.password) {
      errs.password = 'សូមបំពេញពាក្យសម្ងាត់';
    } else if (companyForm.password.length < 6) {
      errs.password = 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៦ តួអក្សរ';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setErrors({});
    try {
      setCreating(true);
      const selectedPlan = plans.find(p => p.id === Number(companyForm.planId));

      await saasApi.registerAndCheckout({
        planId: Number(companyForm.planId),
        billingCycle: companyForm.billingCycle,
        couponCode: companyForm.couponCode.trim() || undefined,
        referralCode: companyForm.referralCode.trim() || undefined,
        companyName: companyForm.companyName.trim(),
        subdomain: companyForm.subdomain.trim(),
        adminName: companyForm.adminName.trim(),
        email: companyForm.email.trim().toLowerCase(),
        phone: companyForm.phone.trim(),
        password: companyForm.password,
      });

      // Return immediately to the company list
      router.push('/admin/saas?tab=tenants');
    } catch (err: any) {
      alert(err.response?.data?.message || 'បរាជ័យក្នុងការបង្កើតក្រុមហ៊ុន');
    } finally {
      setCreating(false);
    }
  };

  const getShareableText = () => {
    if (!createdCredentials) return '';
    return `📦 ព័ត៌មានគណនីប្រើប្រាស់ប្រព័ន្ធដឹកជញ្ជូន (EBS Delivery System)
-----------------------------------------
🏢 ក្រុមហ៊ុន: ${createdCredentials.companyName}
🌐 តំណភ្ជាប់ចូលប្រើប្រាស់: ${createdCredentials.url}/auth
👤 អ៊ីមែល (Email): ${createdCredentials.email}
🔑 ពាក្យសម្ងាត់ (Password): ${createdCredentials.password}
🏷️ កញ្ចប់សេវា: ${createdCredentials.planName}
-----------------------------------------
សូមចូលប្រើប្រាស់ និងផ្លាស់ប្តូរពាក្យសម្ងាត់តាមការគួរ។`;
  };

  const handleCopyCredentials = () => {
    navigator.clipboard.writeText(getShareableText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Kantumruy Pro', 'Inter', sans-serif" }}>
      {/* 1. DEDICATED SAAS MASTER SIDEBAR */}
      <aside
        style={{
          width: 270,
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
              ● SUPER ADMIN PORTAL
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <div style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#bfdbfe', textTransform: 'uppercase', padding: '8px 12px 6px', letterSpacing: '0.8px' }}>
            Main Menu
          </div>

          <Link
            href="/admin/saas"
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
            <span>ផ្ទាំងគ្រប់គ្រង</span>
          </Link>

          <Link
            href="/admin/saas"
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
            <span>ក្រុមហ៊ុនទាំងអស់</span>
          </Link>

          <Link
            href="/admin/saas"
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
            <span>គណនី SaaS Admins</span>
          </Link>

          <Link
            href="/admin/saas"
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
            <span>កញ្ចប់សេវា</span>
          </Link>

          <Link
            href="/admin/saas"
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
            <span>គូប៉ុងបញ្ចុះតម្លៃ</span>
          </Link>

          <Link
            href="/admin/saas"
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
            <span>ដៃគូសហការ</span>
          </Link>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div style={{ flex: 1, marginLeft: 270, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Topbar */}
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
          }}
        >
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
                <div style={{ fontSize: 13, fontWeight: 900, color: '#ffffff', lineHeight: 1.2 }}>{user?.name || 'Admin User'}</div>
                <div style={{ fontSize: 11, color: '#bfdbfe', fontWeight: 600 }}>{user?.email || 'admin@gmail.com'}</div>
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

            {/* Dropdown Menu Card */}
            {showProfileDropdown && (
              <>
                {/* Invisible backdrop to close on outside click */}
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
                  {/* Dropdown Header */}
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 900, color: '#0f172a' }}>{user?.name || 'Admin User'}</div>
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>{user?.email || 'admin@gmail.com'}</div>
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
                      }}
                    >
                      👑 Super Administrator
                    </span>
                  </div>

                  {/* Dropdown Menu Links */}
                  <div style={{ padding: '6px 0' }}>
                    <Link
                      href="/admin/saas"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '9px 12px',
                        textDecoration: 'none',
                        color: '#334155',
                        fontSize: 13,
                        fontWeight: 700,
                        borderRadius: 10,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <MdGroup size={18} color="#64748b" />
                      <span>គណនី SaaS Admins</span>
                    </Link>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
                    {/* Logout Action */}
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
                      <span>ចាកចេញ (Logout)</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page Content Body */}
        <main style={{ flex: 1, padding: '24px 32px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
          {/* Back Button & Title */}
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
              <span>ត្រឡប់ទៅបញ្ជីក្រុមហ៊ុន</span>
            </Link>

            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              បង្កើតក្រុមហ៊ុន & Workspace ថ្មី
            </h1>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
              ប្រព័ន្ធនឹងដំឡើង Workspace Subdomain ស្វ័យប្រវត្តិ និងបង្កើតគណនី Admin សម្រាប់ផ្ញើជូនភ្ញៀវ
            </p>
          </div>

          {/* If Created Success */}
          {createdCredentials ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 30px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 16px' }}>
                ✓
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
                បានបង្កើតក្រុមហ៊ុន & គណនីជោគជ័យ!
              </h2>
              <p style={{ fontSize: 13.5, color: '#64748b', margin: '0 0 24px' }}>
                ព័ត៌មាន Workspace និងគណនី Admin ត្រូវបានរៀបចំរួចរាល់។ សូមចម្លងព័ត៌មានខាងក្រោមផ្ញើជូនភ្ញៀវ៖
              </p>

              <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 12, padding: '20px', textAlign: 'left', marginBottom: 24, fontSize: 14, lineHeight: 2, maxWidth: 640, margin: '0 auto 24px' }}>
                <div>🏢 <strong>ក្រុមហ៊ុន៖</strong> <span style={{ color: '#0f172a', fontWeight: 700, marginLeft: 6 }}>{createdCredentials.companyName}</span></div>
                <div>🌐 <strong>តំណភ្ជាប់ Workspace:</strong> <a href={`${createdCredentials.url}/auth`} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none', marginLeft: 6 }}>{createdCredentials.url}/auth</a></div>
                <div>👤 <strong>Email Login:</strong> <span style={{ color: '#0f172a', fontWeight: 700, marginLeft: 6 }}>{createdCredentials.email}</span></div>
                <div>🔑 <strong>Password:</strong> <span style={{ color: '#16a34a', fontWeight: 800, background: '#dcfce7', padding: '2px 8px', borderRadius: 6, marginLeft: 6 }}>{createdCredentials.password}</span></div>
                <div>🏷️ <strong>កញ្ចប់សេវា៖</strong> <span style={{ fontWeight: 700, color: '#4f46e5', marginLeft: 6 }}>{createdCredentials.planName}</span></div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="btn btn-primary"
                >
                  {copied ? <MdCheck size={16} /> : <MdContentCopy size={16} />}
                  <span>{copied ? 'បានចម្លងរួចរាល់!' : 'ចម្លងព័ត៌មានផ្ញើឱ្យភ្ញៀវ'}</span>
                </button>

                <a
                  href={`${createdCredentials.url}/auth`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline"
                >
                  <MdShare size={16} /> ផ្ញើតាម Telegram
                </a>

                <Link
                  href="/admin/saas"
                  className="btn btn-outline"
                >
                  ត្រឡប់ទៅបញ្ជីក្រុមហ៊ុន
                </Link>
              </div>
            </div>
          ) : (
            /* Full Form */
            <div className="card">
              <div className="card-header">
                <span className="card-title">បង្កើតក្រុមហ៊ុន និង Workspace ថ្មី</span>
              </div>

              <div className="card-body">
                <form onSubmit={handleSubmit} autoComplete="off" noValidate>
                  {/* Invisible fake inputs to prevent aggressive browser autofill */}
                  <input type="text" style={{ display: 'none' }} tabIndex={-1} readOnly />
                  <input type="password" style={{ display: 'none' }} tabIndex={-1} readOnly />

                  {/* Section 1: Company & Subdomain */}
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center' }}>
                    ១. ព័ត៌មានក្រុមហ៊ុន និង Workspace
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        ឈ្មោះក្រុមហ៊ុន <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${errors.companyName ? 'is-invalid' : ''}`}
                        placeholder="ឧ. Angkor Express, Battambang Logistics"
                        value={companyForm.companyName}
                        onChange={handleCompanyNameChange}
                      />
                      {errors.companyName && <div className="form-error-text">{errors.companyName}</div>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        ឈ្មោះ Subdomain សម្រាប់ Workspace <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div style={{ display: 'flex' }}>
                        <input
                          type="text"
                          className={`form-control ${errors.subdomain ? 'is-invalid' : ''}`}
                          style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                          placeholder="angkorexpress"
                          value={companyForm.subdomain}
                          onChange={(e) => {
                            setCompanyForm({ ...companyForm, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') });
                            if (errors.subdomain) setErrors(prev => { const n = { ...prev }; delete n.subdomain; return n; });
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
                      <label className="form-label">កញ្ចប់គម្រោងតម្លៃ</label>
                      <select
                        className="form-control"
                        value={companyForm.planId}
                        onChange={(e) => setCompanyForm({ ...companyForm, planId: Number(e.target.value) })}
                      >
                        {plans.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} (${Number(p.priceMonthly).toFixed(2)}/ខែ — {p.maxOrdersPerMonth} orders/ខែ)</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">វដ្តទូទាត់ប្រាក់</label>
                      <select
                        className="form-control"
                        value={companyForm.billingCycle}
                        onChange={(e) => setCompanyForm({ ...companyForm, billingCycle: e.target.value as any })}
                      >
                        <option value="monthly">ទូទាត់ប្រចាំខែ</option>
                        <option value="yearly">ទូទាត់ប្រចាំឆ្នាំ (មានបញ្ចុះតម្លៃពិសេស)</option>
                      </select>
                    </div>
                  </div>

                  {/* Section 2: Coupon & Referral */}
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', margin: '20px 0 14px', display: 'flex', alignItems: 'center' }}>
                    ២. គូប៉ុង និង ដៃគូសហការ
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        លេខកូដគូប៉ុង
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="ឧ. SAVE20, LAUNCH50"
                        value={companyForm.couponCode}
                        onChange={(e) => setCompanyForm({ ...companyForm, couponCode: e.target.value.toUpperCase() })}
                      />
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        {companyForm.couponCode ? '✅ នឹងត្រូវបានផ្ទៀងផ្ទាត់ពេលបង្កើតជាវ' : 'ទុកទំនេរ បើគ្មានគូប៉ុង'}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        លេខកូដដៃគូ
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="ឧ. PARTNER-001, REF-KH"
                        value={companyForm.referralCode}
                        onChange={(e) => setCompanyForm({ ...companyForm, referralCode: e.target.value.toUpperCase() })}
                      />
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>ទុកទំនេរ បើគ្មានដៃគូសហការ</div>
                    </div>
                  </div>

                  {/* Section 3: Admin User Credentials */}
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', margin: '20px 0 14px', display: 'flex', alignItems: 'center' }}>
                    ៣. គណនី Admin ដំបូងសម្រាប់ក្រុមហ៊ុន
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        ឈ្មោះអ្នកគ្រប់គ្រង <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${errors.adminName ? 'is-invalid' : ''}`}
                        placeholder="ឧ. Sok Dara"
                        value={companyForm.adminName}
                        onChange={(e) => {
                          setCompanyForm({ ...companyForm, adminName: e.target.value });
                          if (errors.adminName) setErrors(prev => { const n = { ...prev }; delete n.adminName; return n; });
                        }}
                      />
                      {errors.adminName && <div className="form-error-text">{errors.adminName}</div>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        លេខទូរស័ព្ទ <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                        placeholder="012 345 678"
                        value={companyForm.phone}
                        onChange={(e) => {
                          setCompanyForm({ ...companyForm, phone: e.target.value });
                          if (errors.phone) setErrors(prev => { const n = { ...prev }; delete n.phone; return n; });
                        }}
                      />
                      {errors.phone && <div className="form-error-text">{errors.phone}</div>}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        អ៊ីមែលសម្រាប់ Login <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="email"
                        name="tenant_admin_email_field"
                        id="tenant_admin_email_field"
                        autoComplete="off"
                        className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                        placeholder="client@gmail.com"
                        value={companyForm.email}
                        onChange={(e) => {
                          setCompanyForm({ ...companyForm, email: e.target.value });
                          if (errors.email) setErrors(prev => { const n = { ...prev }; delete n.email; return n; });
                        }}
                      />
                      {errors.email && <div className="form-error-text">{errors.email}</div>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        ពាក្យសម្ងាត់ <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="password"
                        name="tenant_admin_password_field"
                        id="tenant_admin_password_field"
                        autoComplete="new-password"
                        className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                        placeholder="បញ្ចូលពាក្យសម្ងាត់..."
                        value={companyForm.password}
                        onChange={(e) => {
                          setCompanyForm({ ...companyForm, password: e.target.value });
                          if (errors.password) setErrors(prev => { const n = { ...prev }; delete n.password; return n; });
                        }}
                      />
                      {errors.password && <div className="form-error-text">{errors.password}</div>}
                    </div>
                  </div>

                  {/* Submit Buttons */}
                  <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <Link
                      href="/admin/saas?tab=tenants"
                      className="btn btn-cancel"
                      style={{ background: '#dc2626', color: '#ffffff', border: '1px solid #dc2626', fontWeight: 700 }}
                    >
                      បោះបង់
                    </Link>
                    <button
                      type="submit"
                      disabled={creating}
                      className="btn btn-primary"
                      style={{ background: '#2563eb', color: '#ffffff', border: '1px solid #2563eb', fontWeight: 700 }}
                    >
                      {creating ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
