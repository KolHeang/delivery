'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { saasApi } from '@/lib/saas-api';
import { setAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import { useTenant } from '@/lib/TenantContext';
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff, MdLocalShipping } from 'react-icons/md';
import { FlagKm, FlagEn } from '@/components/ui/Flags';
import { detectTenantSubdomain } from '@/lib/domain';
import { applyBrandTheme, initBrandTheme } from '@/lib/theme';

const loginTranslations: Record<string, Record<string, string>> = {
  en: {
    subtitle: 'Log in to manage your deliveries',
    emailLabel: 'Email',
    emailPlaceholder: 'Enter email',
    emailRequired: 'Please enter your email',
    emailInvalid: 'Please enter a valid email',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    passwordRequired: 'Please enter your password',
    passwordMin: 'Password must be at least 6 characters',
    forgotPassword: 'Forgot Password?',
    forgotPasswordAlert: 'Please contact the system administrator to reset your password.',
    signInBtn: 'Sign In',
    signingIn: 'Signing in...',
    systemSuffix: 'Delivery System',
    defaultSystem: 'EBS Express • Delivery Management System',
    saasAdminLink: 'EBS Master SaaS Super Admin',
    modalOk: 'OK',
    invalidCredentials: 'Invalid email or password',
    userNotFound: 'User account not found',
    accountDisabled: 'Your account has been deactivated',
  },
  km: {
    subtitle: 'ចូលគ្រប់គ្រងប្រព័ន្ធដឹកជញ្ជូន',
    emailLabel: 'អ៊ីមែល',
    emailPlaceholder: 'បញ្ចូលអ៊ីមែល',
    emailRequired: 'សូមបំពេញអ៊ីម៉ែល',
    emailInvalid: 'សូមបំពេញអ៊ីម៉ែលត្រឹមត្រូវ',
    passwordLabel: 'ពាក្យសម្ងាត់',
    passwordPlaceholder: '••••••••',
    passwordRequired: 'សូមបំពេញពាក្យសម្ងាត់',
    passwordMin: 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៦ តួអក្សរ',
    forgotPassword: 'ភ្លេចពាក្យសម្ងាត់?',
    forgotPasswordAlert: 'សូមទាក់ទងអ្នកគ្រប់គ្រងប្រព័ន្ធ ដើម្បីកំណត់ពាក្យសម្ងាត់របស់អ្នកឡើងវិញ។',
    signInBtn: 'ចូលប្រើប្រាស់',
    signingIn: 'កំពុងចូល...',
    systemSuffix: 'ប្រព័ន្ធគ្រប់គ្រងការដឹកជញ្ជូន',
    defaultSystem: 'EBS Express • ប្រព័ន្ធគ្រប់គ្រងការដឹកជញ្ជូន',
    saasAdminLink: 'ចូលគណនី EBS Master SaaS Super Admin',
    modalOk: 'យល់ព្រម',
    invalidCredentials: 'អ៊ីមែល ឬ ពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ',
    userNotFound: 'រកមិនឃើញគណនីនេះក្នុងប្រព័ន្ធទេ',
    accountDisabled: 'គណនីរបស់អ្នកត្រូវបានផ្អាកដំណើរការ',
  }
};

export default function LoginPage() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const { tenant, subdomain: workspaceSubdomain, isTenant } = useTenant();
  const [currentSubdomain, setCurrentSubdomain] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [loginProgress, setLoginProgress] = useState(0);
  const [errorKey, setErrorKey] = useState('');
  const [rawError, setRawError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  React.useEffect(() => {
    const sub = detectTenantSubdomain();
    if (sub) {
      setCurrentSubdomain(sub);
    }
    if (tenant?.primaryColor) {
      applyBrandTheme(tenant.primaryColor);
    } else {
      initBrandTheme();
    }
  }, [tenant?.primaryColor]);

  const activeSubdomain = workspaceSubdomain || currentSubdomain;
  const activeCompanyName = tenant?.companyName || (activeSubdomain ? activeSubdomain.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : null);

  const t = loginTranslations[lang] || loginTranslations['en'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const newErrors: { email?: string; password?: string } = {};
    const emailVal = form.email.trim();
    if (!emailVal) {
      newErrors.email = 'emailRequired';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      newErrors.email = 'emailInvalid';
    }

    if (!form.password) {
      newErrors.password = 'passwordRequired';
    } else if (form.password.length < 6) {
      newErrors.password = 'passwordMin';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    setLoginProgress(20);
    setErrorKey('');
    setRawError('');

    const progressInterval = setInterval(() => {
      setLoginProgress((prev) => (prev < 78 ? prev + 12 : prev));
    }, 120);

    try {
      const res = await api.post('/auth/login', form);
      clearInterval(progressInterval);
      const col = res.data?.user?.primaryColor || res.data?.primaryColor || tenant?.primaryColor;
      if (col) {
        try {
          localStorage.setItem('app-brand-color', col);
          applyBrandTheme(col);
        } catch {}
      }
      setAuth(res.data.access_token, res.data.user);
      setLoginProgress(100);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 450);
      return;
    } catch (err: any) {
      try {
        const saasRes = await saasApi.adminLogin(form.email, form.password);
        if (saasRes && saasRes.access_token && saasRes.admin) {
          clearInterval(progressInterval);
          setAuth(saasRes.access_token, {
            id: saasRes.admin.id,
            name: saasRes.admin.name,
            email: saasRes.admin.email,
            role: 'admin',
            active: saasRes.admin.isActive,
            permissions: ['*'],
          });
          localStorage.setItem('saas_admin', JSON.stringify(saasRes.admin));
          setLoginProgress(100);
          setTimeout(() => {
            window.location.href = '/admin/saas';
          }, 450);
          return;
        }
      } catch (saasErr) {
        // fallback to standard error
      }

      clearInterval(progressInterval);
      const serverMsg = err.response?.data?.message;
      if (serverMsg) {
        const lower = String(serverMsg).toLowerCase();
        if (lower.includes('credential') || lower.includes('password') || lower.includes('email') || lower.includes('login') || lower.includes('unauthorized') || lower.includes('invalid')) {
          setErrorKey('invalidCredentials');
        } else if (lower.includes('not found')) {
          setErrorKey('userNotFound');
        } else if (lower.includes('disabled') || lower.includes('deactivated') || lower.includes('inactive')) {
          setErrorKey('accountDisabled');
        } else {
          setRawError(serverMsg);
        }
      } else {
        setErrorKey('invalidCredentials');
      }
      setLoginProgress(0);
      setLoading(false);
    }
  };

  return (
    <div className="blueprint-login-container">
      {/* Soft Ambient Mesh Gradient + Subtle Grid Styles */}
      <style jsx global>{`
        @keyframes authAmbientFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(24px, -18px) scale(1.06); }
        }

        @keyframes authAmbientFloatReverse {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(-22px, 16px) scale(1.05); }
        }

        @keyframes loginProgressRun {
          0%   { transform: translateX(-100%); width: 35%; }
          50%  { transform: translateX(100%);  width: 55%; }
          100% { transform: translateX(300%);  width: 35%; }
        }

        .blueprint-login-container {
          min-height: 100vh;
          width: 100vw;
          background: linear-gradient(160deg, #f8fafc 0%, #f1f5f9 60%, #f8fafc 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          font-family: 'Inter', 'Battambang', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .blueprint-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(to right, rgba(148, 163, 184, 0.14) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148, 163, 184, 0.14) 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: radial-gradient(ellipse 75% 70% at 50% 45%, #000 35%, transparent 100%);
          -webkit-mask-image: radial-gradient(ellipse 75% 70% at 50% 45%, #000 35%, transparent 100%);
          pointer-events: none;
          z-index: 1;
        }

        .auth-mesh-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(85px);
          pointer-events: none;
          z-index: 0;
        }

        .auth-mesh-orb-1 {
          width: 560px;
          height: 560px;
          top: -180px;
          left: -140px;
          background: var(--accent, #1565D8);
          opacity: 0.13;
          animation: authAmbientFloat 18s ease-in-out infinite;
        }

        .auth-mesh-orb-2 {
          width: 520px;
          height: 520px;
          bottom: -180px;
          right: -120px;
          background: var(--accent-dark, #0d47a1);
          opacity: 0.12;
          animation: authAmbientFloatReverse 22s ease-in-out infinite;
        }

        .auth-mesh-orb-3 {
          width: 380px;
          height: 380px;
          top: 22%;
          right: 14%;
          background: var(--accent, #1565D8);
          opacity: 0.08;
          animation: authAmbientFloat 25s ease-in-out infinite reverse;
        }

        .clean-card {
          width: 100%;
          max-width: 420px;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-radius: 24px;
          padding: 40px 36px 34px;
          border: 1px solid rgba(255, 255, 255, 0.85);
          box-shadow:
            0 24px 60px -16px rgba(15, 23, 42, 0.12),
            0 4px 16px -4px rgba(15, 23, 42, 0.05),
            0 0 0 1px rgba(226, 232, 240, 0.75);
          position: relative;
          z-index: 10;
          color: #0f172a;
          overflow: hidden;
        }

        .clean-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--sidebar-bg, #1565D8) 0%, var(--accent-dark, #0d47a1) 100%);
        }
      `}</style>

      {/* 1. Dynamic Soft Ambient Mesh Glow Orbs */}
      <div className="auth-mesh-orb auth-mesh-orb-1" />
      <div className="auth-mesh-orb auth-mesh-orb-2" />
      <div className="auth-mesh-orb auth-mesh-orb-3" />

      {/* 2. Subtle Vignette Grid */}
      <div className="blueprint-grid" />

      {/* Full-Screen Clean Login Progress Overlay */}
      {loading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'linear-gradient(160deg, #f8fafc 0%, #f1f5f9 60%, #f8fafc 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: "'Inter', 'Battambang', sans-serif",
          }}
        >
          <div className="auth-mesh-orb auth-mesh-orb-1" />
          <div className="auth-mesh-orb auth-mesh-orb-2" />
          <div className="blueprint-grid" />

          <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 360, textAlign: 'center' }}>
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 18,
                background: tenant?.logoUrl ? '#ffffff' : 'var(--accent-subtle, rgba(21, 101, 216, 0.08))',
                border: tenant?.logoUrl ? '1px solid #e2e8f0' : '1.5px solid var(--accent-light, rgba(21, 101, 216, 0.18))',
                color: 'var(--accent, #1565D8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px',
                padding: tenant?.logoUrl ? 8 : 0,
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
              }}
            >
              {tenant?.logoUrl ? (
                <img
                  src={tenant.logoUrl}
                  alt={activeCompanyName || 'Logo'}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <MdLocalShipping size={34} />
              )}
            </div>

            <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', marginBottom: 6 }}>
              {activeCompanyName || 'EBS Express'}
            </div>
            <div style={{ fontSize: 14, color: '#64748b', fontWeight: 500, marginBottom: 22 }}>
              {lang === 'km' ? 'កំពុងចូលទៅកាន់ប្រព័ន្ធ...' : 'Signing you in...'}
            </div>

            <div
              style={{
                width: '100%',
                height: 6,
                borderRadius: 999,
                background: '#e2e8f0',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${loginProgress}%`,
                  borderRadius: 999,
                  background: 'var(--accent, #1565D8)',
                  transition: 'width 0.35s ease-out',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 7. Top Right Flag Switcher */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: 3,
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
        }}
      >
        <button
          type="button"
          onClick={() => setLang('km')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 9,
            border: 'none',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
            background: lang === 'km' ? 'var(--accent, #1565D8)' : 'transparent',
            color: lang === 'km' ? '#ffffff' : '#64748b',
            transition: 'all 0.15s ease',
          }}
        >
          <FlagKm size={18} />
          <span>ខ្មែរ</span>
        </button>
        <button
          type="button"
          onClick={() => setLang('en')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 9,
            border: 'none',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
            background: lang === 'en' ? 'var(--accent, #1565D8)' : 'transparent',
            color: lang === 'en' ? '#ffffff' : '#64748b',
            transition: 'all 0.15s ease',
          }}
        >
          <FlagEn size={18} />
          <span>EN</span>
        </button>
      </div>

      {/* 8. Clean Centered Card - Harmonized Light Surface with Dynamic Brand Accents */}
      <div className="clean-card">
        {/* Dynamic Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 20,
              background: tenant?.logoUrl ? '#ffffff' : 'var(--accent-subtle, rgba(21, 101, 216, 0.08))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 20px -4px rgba(15, 23, 42, 0.08)',
              border: tenant?.logoUrl ? '1.5px solid #e2e8f0' : '1.5px solid var(--accent-light, rgba(21, 101, 216, 0.18))',
              overflow: 'hidden',
              padding: tenant?.logoUrl ? 10 : 0,
            }}
          >
            {tenant?.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt={tenant.companyName}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <svg width="54" height="54" viewBox="0 0 58 58" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="24" width="30" height="17" rx="3" fill="var(--accent, #1565D8)" />
                <path d="M35 27H45C47 27 49.5 29 50.5 32L52 37C52.5 38.5 51.5 41 49.5 41H35V27Z" fill="var(--accent, #1565D8)" />
                <path d="M37 29H43L46 35H37V29Z" fill="#93c5fd" />
                <rect x="9" y="27" width="9" height="6" rx="1.5" fill="#93c5fd" />
                <path d="M9 36H22M9 39H18" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                <rect x="50" y="34" width="3" height="4" rx="1" fill="#fbbf24" />
                <circle cx="15" cy="41" r="5" fill="#1e3a8a" stroke="white" strokeWidth="1.5" />
                <circle cx="15" cy="41" r="2" fill="white" />
                <circle cx="43" cy="41" r="5" fill="#1e3a8a" stroke="white" strokeWidth="1.5" />
                <circle cx="43" cy="41" r="2" fill="white" />
                <path d="M29 5C25 5 21.5 8.5 21.5 12.5C21.5 17.5 29 24 29 24C29 24 36.5 17.5 36.5 12.5C36.5 8.5 33 5 29 5Z" fill="#f59e0b" />
                <circle cx="29" cy="12.5" r="3.5" fill="white" />
              </svg>
            )}
          </div>

          {/* Dynamic Company / Workspace Title */}
          <h1
            style={{
              fontSize: 25,
              fontWeight: 900,
              color: '#0f172a',
              margin: '0 0 6px',
              letterSpacing: '-0.4px',
            }}
          >
            {activeCompanyName ? (
              <span>{activeCompanyName}</span>
            ) : (
              <>EBS<span style={{ color: 'var(--accent, #1565D8)' }}>Express</span></>
            )}
          </h1>

          {/* Dynamic Subtitle */}
          <p style={{ fontSize: 14, color: '#64748b', margin: 0, fontWeight: 500 }}>
            {activeCompanyName
              ? (lang === 'km' ? `ចូលគ្រប់គ្រងប្រព័ន្ធដឹកជញ្ជូន ${activeCompanyName}` : `Sign in to manage ${activeCompanyName} logistics`)
              : t.subtitle}
          </p>
        </div>

        {/* Error Alert */}
        {(errorKey || rawError) && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '10px 12px',
              borderRadius: 12,
              fontSize: 12.5,
              fontWeight: 600,
              marginBottom: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>⚠️</span>
            <span>{errorKey ? (t[errorKey] || errorKey) : rawError}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display: 'block',
                fontSize: 14.5,
                fontWeight: 700,
                color: '#334155',
                marginBottom: 7,
              }}
            >
              {t.emailLabel}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <MdEmail
                size={19}
                color={errors.email ? '#ef4444' : '#94a3b8'}
                style={{ position: 'absolute', left: 14, pointerEvents: 'none' }}
              />
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={e => {
                  setForm({ ...form, email: e.target.value });
                  if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                }}
                placeholder={t.emailPlaceholder}
                style={{
                  width: '100%',
                  padding: '13px 16px 13px 44px',
                  borderRadius: 14,
                  border: errors.email ? '1.5px solid #ef4444' : '1.5px solid #e2e8f0',
                  background: '#f8fafc',
                  fontSize: 14.5,
                  fontWeight: 500,
                  color: '#0f172a',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = errors.email ? '#ef4444' : 'var(--accent, #1565D8)';
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.boxShadow = errors.email ? '0 0 0 4px rgba(239, 68, 68, 0.15)' : '0 0 0 4px var(--accent-light, rgba(21, 101, 216, 0.14))';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = errors.email ? '#ef4444' : '#e2e8f0';
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
            {errors.email && (
              <div style={{ color: '#dc2626', fontSize: '12.5px', fontWeight: 600, marginTop: '6px', lineHeight: '1.4' }}>
                {t[errors.email] || errors.email}
              </div>
            )}
          </div>

          {/* Password */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                fontSize: 14.5,
                fontWeight: 700,
                color: '#334155',
                marginBottom: 7,
              }}
            >
              {t.passwordLabel}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <MdLock
                size={19}
                color={errors.password ? '#ef4444' : '#94a3b8'}
                style={{ position: 'absolute', left: 14, pointerEvents: 'none' }}
              />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={form.password}
                onChange={e => {
                  setForm({ ...form, password: e.target.value });
                  if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                }}
                placeholder={t.passwordPlaceholder}
                style={{
                  width: '100%',
                  padding: '13px 44px 13px 44px',
                  borderRadius: 14,
                  border: errors.password ? '1.5px solid #ef4444' : '1.5px solid #e2e8f0',
                  background: '#f8fafc',
                  fontSize: 14.5,
                  fontWeight: 500,
                  color: '#0f172a',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = errors.password ? '#ef4444' : 'var(--accent, #1565D8)';
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.boxShadow = errors.password ? '0 0 0 4px rgba(239, 68, 68, 0.15)' : '0 0 0 4px var(--accent-light, rgba(21, 101, 216, 0.14))';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = errors.password ? '#ef4444' : '#e2e8f0';
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 14,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
              </button>
            </div>
            {errors.password && (
              <div style={{ color: '#dc2626', fontSize: '12.5px', fontWeight: 600, marginTop: '6px', lineHeight: '1.4' }}>
                {t[errors.password] || errors.password}
              </div>
            )}
          </div>

          {/* Forgot Password */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 22 }}>
            <span
              onClick={() => setShowForgotModal(true)}
              style={{
                color: 'var(--accent, #1565D8)',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              {t.forgotPassword}
            </span>
          </div>

          {/* Submit Button */}
          <button
            id="login-btn"
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13.5px 20px',
              borderRadius: 14,
              border: 'none',
              background: 'var(--accent, #1565D8)',
              color: '#ffffff',
              fontSize: 15.5,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 6px 18px var(--accent-glow, rgba(21, 101, 216, 0.3))',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.85 : 1,
            }}
          >
            <span>{loading ? t.signingIn : t.signInBtn}</span>
          </button>

          {/* Running Progress Bar while authenticating */}
          {loading && (
            <div
              style={{
                width: '100%',
                height: 5,
                borderRadius: 999,
                background: '#e2e8f0',
                marginTop: 14,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: '40%',
                  borderRadius: 999,
                  background: 'var(--accent, #1565D8)',
                  animation: 'loginProgressRun 1.15s ease-in-out infinite',
                }}
              />
            </div>
          )}
        </form>

        {/* SaaS Super Admin Switcher (Only visible on main root domain, hidden on tenant workspaces) */}
        {!isTenant && !activeSubdomain && (
          <div style={{ marginTop: 22, textAlign: 'center' }}>
            <a
              href="/admin/saas/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12.5,
                fontWeight: 700,
                color: 'var(--accent, #1565D8)',
                textDecoration: 'none',
                padding: '6px 14px',
                borderRadius: 8,
                backgroundColor: 'var(--accent-subtle, rgba(21, 101, 216, 0.08))',
                border: '1px solid var(--accent-light, rgba(21, 101, 216, 0.16))',
                transition: 'background 0.15s',
              }}
            >
              {t.saasAdminLink} &rarr;
            </a>
          </div>
        )}

        <div
          style={{
            marginTop: 20,
            textAlign: 'center',
            fontSize: 12.5,
            color: '#94a3b8',
            fontWeight: 500,
          }}
        >
          {activeCompanyName ? `${activeCompanyName} • ${t.systemSuffix}` : t.defaultSystem}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
          onClick={() => setShowForgotModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 18,
              padding: '30px 26px',
              maxWidth: 360,
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 30px rgba(0, 0, 0, 0.15)',
              border: '1px solid #e2e8f0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <MdLock size={36} color="var(--accent, #1565D8)" />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              {t.forgotPassword}
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>
              {t.forgotPasswordAlert}
            </p>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              style={{
                background: 'var(--accent, #1565D8)',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 10,
                cursor: 'pointer',
                width: '100%',
                boxShadow: '0 4px 12px var(--accent-glow, rgba(37, 99, 235, 0.25))',
              }}
            >
              {t.modalOk}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
