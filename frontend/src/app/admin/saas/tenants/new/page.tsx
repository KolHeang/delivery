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
    adminName: '',
    email: '',
    phone: '',
    password: '',
  });

  const [createdCredentials, setCreatedCredentials] = useState<{
    companyName: string;
    subdomain: string;
    url: string;
    adminName: string;
    email: string;
    password: string;
    planName: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

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
    generatePassword();
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.companyName || !companyForm.subdomain || !companyForm.email) {
      alert('សូមបញ្ចូលព័ត៌មានចាំបាច់ឱ្យបានគ្រប់គ្រាន់');
      return;
    }

    try {
      setCreating(true);
      const selectedPlan = plans.find(p => p.id === Number(companyForm.planId));

      await saasApi.registerAndCheckout({
        planId: Number(companyForm.planId),
        billingCycle: companyForm.billingCycle,
        companyName: companyForm.companyName.trim(),
        subdomain: companyForm.subdomain.trim(),
        adminName: companyForm.adminName.trim() || companyForm.companyName.trim(),
        email: companyForm.email.trim().toLowerCase(),
        phone: companyForm.phone.trim() || undefined,
        password: companyForm.password || '123456',
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
        <div style={{ padding: '22px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              color: '#fff',
              boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
              flexShrink: 0,
            }}
          >
            👑
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
              EBS Master SaaS
            </div>
            <div style={{ fontSize: 11, color: '#93c5fd', fontWeight: 800, marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />
              SUPER ADMIN PORTAL
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
            background: 'linear-gradient(135deg, #1e3b75 0%, #2b529a 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            padding: '0 32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 80,
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />
            <span style={{ fontSize: 13, color: '#ffffff', fontWeight: 700 }}>EBS Cloud Administration</span>
          </div>

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
        <main style={{ flex: 1, padding: '32px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
          {/* Back Button & Title */}
          <div style={{ marginBottom: 28 }}>
            <Link
              href="/admin/saas"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                color: '#64748b',
                textDecoration: 'none',
                fontSize: 13.5,
                fontWeight: 700,
                marginBottom: 12,
                transition: 'color 0.15s',
              }}
            >
              <MdArrowBack size={18} />
              <span>ត្រឡប់ទៅបញ្ជីក្រុមហ៊ុន</span>
            </Link>

            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
              🏢 បង្កើតក្រុមហ៊ុន & Workspace ថ្មីជូនអតិថិជន
            </h1>
            <p style={{ fontSize: 13.5, color: '#64748b', margin: 0 }}>
              ប្រព័ន្ធនឹងដំឡើង Workspace Subdomain ស្វ័យប្រវត្តិ និងបង្កើតគណនី Admin សម្រាប់ផ្ញើជូនភ្ញៀវ
            </p>
          </div>

          {/* If Created Success */}
          {createdCredentials ? (
            <div style={{ background: '#ffffff', borderRadius: 24, padding: '40px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.06)', textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 20px' }}>
                🎉
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>
                បានបង្កើតក្រុមហ៊ុន & គណនីជោគជ័យ!
              </h2>
              <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 28px' }}>
                ព័ត៌មាន Workspace និងគណនី Admin ត្រូវបានរៀបចំរួចរាល់។ សូមចម្លងព័ត៌មានខាងក្រោមផ្ញើជូនភ្ញៀវ៖
              </p>

              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 20, padding: '24px', textAlign: 'left', marginBottom: 28, fontSize: 14.5, lineHeight: 2 }}>
                <div>🏢 <strong>ក្រុមហ៊ុន៖</strong> <span style={{ color: '#0f172a', fontWeight: 900 }}>{createdCredentials.companyName}</span></div>
                <div>🌐 <strong>តំណភ្ជាប់ Workspace:</strong> <a href={`${createdCredentials.url}/auth`} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 800, textDecoration: 'none' }}>{createdCredentials.url}/auth</a></div>
                <div>👤 <strong>Email Login:</strong> <span style={{ color: '#0f172a', fontWeight: 800 }}>{createdCredentials.email}</span></div>
                <div>🔑 <strong>Password:</strong> <span style={{ color: '#16a34a', fontWeight: 900, background: '#dcfce7', padding: '3px 10px', borderRadius: 8 }}>{createdCredentials.password}</span></div>
                <div>🏷️ <strong>កញ្ចប់សេវា៖</strong> <span style={{ fontWeight: 700, color: '#4f46e5' }}>{createdCredentials.planName}</span></div>
              </div>

              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={handleCopyCredentials}
                  style={{
                    padding: '13px 26px',
                    borderRadius: 14,
                    border: 'none',
                    background: copied ? '#10b981' : '#0f172a',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 14px rgba(15,23,42,0.15)',
                  }}
                >
                  {copied ? <MdCheck size={18} /> : <MdContentCopy size={18} />}
                  <span>{copied ? 'បានចម្លងរួចរាល់!' : 'ចម្លងព័ត៌មានផ្ញើឱ្យភ្ញៀវ'}</span>
                </button>

                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(createdCredentials.url)}&text=${encodeURIComponent(getShareableText())}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '13px 22px',
                    borderRadius: 14,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#0088cc',
                    fontWeight: 800,
                    fontSize: 14,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <MdShare size={18} /> ផ្ញើតាម Telegram
                </a>

                <Link
                  href="/admin/saas"
                  style={{
                    padding: '13px 22px',
                    borderRadius: 14,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#64748b',
                    fontWeight: 800,
                    fontSize: 14,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  ត្រឡប់ទៅផ្ទាំងគ្រប់គ្រង
                </Link>
              </div>
            </div>
          ) : (
            /* Full Form */
            <form onSubmit={handleSubmit} style={{ background: '#ffffff', borderRadius: 24, padding: '36px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.04)' }}>
              {/* Section 1: Company & Subdomain */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>1</span>
                  <span>ព័ត៌មានក្រុមហ៊ុន & Workspace Subdomain</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 8 }}>
                      ឈ្មោះក្រុមហ៊ុន / អាជីវកម្មដឹកជញ្ជូន <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ឧ. Angkor Express, Battambang Logistics"
                      value={companyForm.companyName}
                      onChange={handleCompanyNameChange}
                      style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 14, outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 8 }}>
                      Workspace Subdomain <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ background: '#f1f5f9', border: '1.5px solid #cbd5e1', borderRight: 'none', padding: '13px 14px', borderTopLeftRadius: 12, borderBottomLeftRadius: 12, color: '#64748b', fontSize: 13 }}>https://</span>
                      <input
                        type="text"
                        required
                        placeholder="angkorexpress"
                        value={companyForm.subdomain}
                        onChange={(e) => setCompanyForm({ ...companyForm, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                        style={{ flex: 1, padding: '13px 14px', border: '1.5px solid #cbd5e1', borderRadius: 0, fontSize: 14, fontWeight: 800, color: '#2563eb', outline: 'none' }}
                      />
                      <span style={{ background: '#f1f5f9', border: '1.5px solid #cbd5e1', borderLeft: 'none', padding: '13px 14px', borderTopRightRadius: 12, borderBottomRightRadius: 12, color: '#64748b', fontSize: 13 }}>.ebsexpress.com</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', marginBottom: 32 }} />

              {/* Section 2: Plan & Billing */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>2</span>
                  <span>កញ្ចប់សេវាកម្ម & វដ្តបង់ប្រាក់</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 8 }}>កញ្ចប់សេវា (Plan Tier)</label>
                    <select
                      value={companyForm.planId}
                      onChange={(e) => setCompanyForm({ ...companyForm, planId: Number(e.target.value) })}
                      style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 14, fontWeight: 700, outline: 'none', background: '#fff' }}
                    >
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} (${p.priceMonthly}/m - {p.maxOrdersPerMonth} orders/m)</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 8 }}>វដ្តបង់ប្រាក់ (Billing Cycle)</label>
                    <select
                      value={companyForm.billingCycle}
                      onChange={(e) => setCompanyForm({ ...companyForm, billingCycle: e.target.value as any })}
                      style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 14, fontWeight: 700, outline: 'none', background: '#fff' }}
                    >
                      <option value="monthly">បង់ប្រចាំខែ (Monthly)</option>
                      <option value="yearly">បង់ប្រចាំឆ្នាំ (Yearly - ទទួល Discount ពិសេស)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', marginBottom: 32 }} />

              {/* Section 3: Admin User Credentials */}
              <div style={{ marginBottom: 36 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>3</span>
                  <span>ព័ត៌មានគណនី Admin សម្រាប់ Login</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 8 }}>
                      ឈ្មោះម្ចាស់ក្រុមហ៊ុន / Admin Name
                    </label>
                    <input
                      type="text"
                      placeholder="ឧ. Sok Dara"
                      value={companyForm.adminName}
                      onChange={(e) => setCompanyForm({ ...companyForm, adminName: e.target.value })}
                      style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 14, outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 8 }}>
                      លេខទូរស័ព្ទ (Phone)
                    </label>
                    <input
                      type="text"
                      placeholder="012 345 678"
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                      style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 14, outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 8 }}>
                      Email សម្រាប់ Login <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="client@gmail.com"
                      value={companyForm.email}
                      onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                      style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 14, outline: 'none' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <label style={{ fontSize: 13, fontWeight: 800, color: '#334155' }}>
                        Password <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <button
                        type="button"
                        onClick={generatePassword}
                        style={{ fontSize: 12, background: 'none', border: 'none', color: '#2563eb', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <MdAutoAwesome />
                        <span>បង្កើត Password ថ្មី (Auto-Gen)</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={companyForm.password}
                      onChange={(e) => setCompanyForm({ ...companyForm, password: e.target.value })}
                      style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 14, fontWeight: 800, color: '#0f172a', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: 14, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                <Link
                  href="/admin/saas"
                  style={{
                    padding: '13px 24px',
                    borderRadius: 12,
                    border: '1.5px solid #cbd5e1',
                    background: '#fff',
                    color: '#64748b',
                    fontWeight: 800,
                    textDecoration: 'none',
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  បោះបង់
                </Link>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    padding: '13px 32px',
                    borderRadius: 12,
                    border: 'none',
                    background: '#2f55a5',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: creating ? 'not-allowed' : 'pointer',
                    boxShadow: '0 6px 18px rgba(47,85,165,0.3)',
                    transition: 'all 0.15s',
                  }}
                >
                  {creating ? 'កំពុងបង្កើត Workspace...' : '🚀 បង្កើតក្រុមហ៊ុន & Setup Workspace'}
                </button>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
