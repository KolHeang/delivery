'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saasApi } from '@/lib/saas-api';
import { setAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdEmail,
  MdLock,
  MdVisibility,
  MdVisibilityOff,
} from 'react-icons/md';
import { FlagKm, FlagEn } from '@/components/ui/Flags';
import { SaasCloudIcon } from '@/components/ui/SaasCloudIcon';

export default function SaasAdminLoginPage() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const tr = (km: string, en: string) => (lang === 'km' ? km : en);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginProgress, setLoginProgress] = useState(0);
  const [errorKey, setErrorKey] = useState('');
  const [rawError, setRawError] = useState('');

  const getErrorText = (key: string) => {
    switch (key) {
      case 'emailRequired': return tr('សូមបំពេញអ៊ីម៉ែល', 'Please enter your email');
      case 'emailInvalid': return tr('សូមបំពេញអ៊ីម៉ែលត្រឹមត្រូវ', 'Please enter a valid email');
      case 'passwordRequired': return tr('សូមបំពេញពាក្យសម្ងាត់', 'Please enter your password');
      case 'passwordMin': return tr('ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៦ តួអក្សរ', 'Password must be at least 6 characters');
      case 'loginFailed': return tr('បរាជ័យក្នុងការ Login សូមពិនិត្យមើល Email និង Password', 'Login failed, please check your Email and Password');
      case 'invalidCredentials': return tr('Email ឬ Password មិនត្រឹមត្រូវ', 'Invalid Email or Password');
      default: return key;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const newErrors: { email?: string; password?: string } = {};
    const emailVal = email.trim();
    if (!emailVal) {
      newErrors.email = 'emailRequired';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      newErrors.email = 'emailInvalid';
    }

    if (!password) {
      newErrors.password = 'passwordRequired';
    } else if (password.length < 6) {
      newErrors.password = 'passwordMin';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setErrorKey('');
    setRawError('');
    setLoading(true);
    setLoginProgress(20);

    const progressInterval = setInterval(() => {
      setLoginProgress((prev) => (prev < 78 ? prev + 12 : prev));
    }, 120);

    try {
      const res = await saasApi.adminLogin(email.trim(), password);
      clearInterval(progressInterval);
      if (res && res.access_token && res.admin) {
        setAuth(res.access_token, {
          id: res.admin.id,
          name: res.admin.name,
          email: res.admin.email,
          role: 'admin',
          active: res.admin.isActive,
          permissions: ['*'],
        });
        localStorage.setItem('saas_admin', JSON.stringify(res.admin));
        setLoginProgress(100);
        setTimeout(() => {
          window.location.href = '/admin/saas';
        }, 450);
        return;
      } else {
        setErrorKey('loginFailed');
        setLoginProgress(0);
        setLoading(false);
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      const msg = err.response?.data?.message;
      if (msg) {
        setRawError(msg);
      } else {
        setErrorKey('invalidCredentials');
      }
      setLoginProgress(0);
      setLoading(false);
    }
  };

  return (
    <div
      className="saas-cloud-bg-container"
      style={{
        ['--sidebar-bg' as any]: '#1565D8',
        ['--sidebar-active' as any]: '#0d47a1',
        ['--accent' as any]: '#1565D8',
        ['--accent-dark' as any]: '#0d47a1',
        ['--accent-light' as any]: 'rgba(21, 101, 216, 0.12)',
        ['--accent-glow' as any]: 'rgba(21, 101, 216, 0.28)',
      }}
    >
      {/* Soft Ambient Mesh Gradient + Subtle Grid Styles */}
      <style jsx global>{`
        @keyframes saasAmbientFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(24px, -18px) scale(1.06); }
        }

        @keyframes saasAmbientFloatReverse {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(-22px, 16px) scale(1.05); }
        }

        @keyframes loginProgressRun {
          0%   { transform: translateX(-100%); width: 35%; }
          50%  { transform: translateX(100%);  width: 55%; }
          100% { transform: translateX(300%);  width: 35%; }
        }

        .saas-cloud-bg-container {
          min-height: 100vh;
          width: 100vw;
          background: linear-gradient(160deg, #f8fafc 0%, #f1f5f9 55%, #eef2ff 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          font-family: 'Inter', 'Battambang', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .saas-grid-pattern {
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

        .saas-mesh-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }

        .saas-mesh-orb-1 {
          width: 560px;
          height: 560px;
          top: -180px;
          left: -140px;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.2) 0%, rgba(37, 99, 235, 0) 70%);
          animation: saasAmbientFloat 18s ease-in-out infinite;
        }

        .saas-mesh-orb-2 {
          width: 520px;
          height: 520px;
          bottom: -180px;
          right: -120px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0) 70%);
          animation: saasAmbientFloatReverse 22s ease-in-out infinite;
        }

        .saas-mesh-orb-3 {
          width: 420px;
          height: 420px;
          top: 22%;
          right: 12%;
          background: radial-gradient(circle, rgba(14, 165, 233, 0.14) 0%, rgba(14, 165, 233, 0) 70%);
          animation: saasAmbientFloat 25s ease-in-out infinite reverse;
        }

        .saas-clean-card {
          width: 100%;
          max-width: 430px;
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
          overflow: hidden;
        }

        .saas-clean-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #1565D8 0%, #4f46e5 100%);
        }
      `}</style>

      {/* 1. Soft Ambient Mesh Glow Orbs */}
      <div className="saas-mesh-orb saas-mesh-orb-1" />
      <div className="saas-mesh-orb saas-mesh-orb-2" />
      <div className="saas-mesh-orb saas-mesh-orb-3" />

      {/* 2. Subtle Vignette Grid */}
      <div className="saas-grid-pattern" />

      {/* Full-Screen Clean Login Progress Overlay */}
      {loading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'linear-gradient(160deg, #f8fafc 0%, #f1f5f9 55%, #eef2ff 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: "'Inter', 'Battambang', sans-serif",
          }}
        >
          <div className="saas-mesh-orb saas-mesh-orb-1" />
          <div className="saas-mesh-orb saas-mesh-orb-2" />
          <div className="saas-grid-pattern" />

          <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 360, textAlign: 'center' }}>
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 18,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px',
                boxShadow: '0 8px 24px rgba(21, 101, 216, 0.14)',
              }}
            >
              <SaasCloudIcon size={40} />
            </div>
            <div style={{ fontSize: 21, fontWeight: 900, color: '#0f172a', marginBottom: 6 }}>
              EBS Master SaaS
            </div>
            <div style={{ fontSize: 14, color: '#64748b', fontWeight: 500, marginBottom: 22 }}>
              {tr('កំពុងចូលទៅកាន់ផ្ទាំងគ្រប់គ្រង...', 'Signing you in...')}
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
                  background: '#1565D8',
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
            background: lang === 'km' ? '#1565D8' : 'transparent',
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
            background: lang === 'en' ? '#1565D8' : 'transparent',
            color: lang === 'en' ? '#ffffff' : '#64748b',
            transition: 'all 0.15s ease',
          }}
        >
          <FlagEn size={18} />
          <span>EN</span>
        </button>
      </div>

      {/* 8. Clean Centered SaaS Admin Card */}
      <div className="saas-clean-card">
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: 22,
              background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #4f8ef7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 10px 28px rgba(37, 99, 235, 0.32)',
              border: '2.5px solid rgba(255, 255, 255, 0.85)',
            }}
          >
            {/* Custom SVG SaaS Cloud + Server Network Icon */}
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Cloud shape */}
              <path
                d="M44 28C44 28 44.5 27.2 44.5 26C44.5 22.1 41.4 19 37.5 19C36.9 19 36.3 19.1 35.7 19.3C34.4 16.2 31.3 14 27.7 14C22.7 14 18.7 18 18.7 23C18.7 23.3 18.7 23.6 18.8 23.9C17.1 24.6 16 26.3 16 28.2C16 30.9 18.2 33 20.9 33H43C43 33 44 30.8 44 28Z"
                fill="white"
                fillOpacity="0.95"
              />
              {/* Server rack body */}
              <rect x="21" y="35" width="18" height="13" rx="2" fill="white" fillOpacity="0.85" />
              <rect x="23" y="37" width="14" height="2.5" rx="1" fill="#2563eb" />
              <rect x="23" y="41" width="14" height="2.5" rx="1" fill="#3b82f6" />
              <rect x="23" y="45" width="10" height="2.5" rx="1" fill="#60a5fa" />
              {/* LED dots on server */}
              <circle cx="35" cy="38.2" r="1" fill="#34d399" />
              <circle cx="35" cy="42.2" r="1" fill="#fbbf24" />
              {/* Connection lines from cloud to server */}
              <path d="M30 33V35" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              {/* Side network nodes */}
              <circle cx="12" cy="38" r="3" fill="white" fillOpacity="0.7" />
              <path d="M15 38H21" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7" />
              <circle cx="48" cy="38" r="3" fill="white" fillOpacity="0.7" />
              <path d="M39 38H45" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7" />
              {/* Top wifi/signal arcs on cloud */}
              <path d="M26 22C26 22 27.5 20.5 30 20.5C32.5 20.5 34 22 34 22" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M28 24.5C28 24.5 29 23.5 30 23.5C31 23.5 32 24.5 32 24.5" stroke="#bfdbfe" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </div>

          <h1
            style={{
              fontSize: 27,
              fontWeight: 900,
              color: '#0f172a',
              margin: '0 0 6px',
              letterSpacing: '-0.4px',
            }}
          >
            EBS Master SaaS
          </h1>

          <p style={{ fontSize: 14, color: '#64748b', margin: 0, fontWeight: 500 }}>
            {tr('ផ្ទាំងចូលគ្រប់គ្រង SaaS Platform Master Admin', 'Login portal for SaaS Platform Master Admin')}
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
            <span>{errorKey ? getErrorText(errorKey) : rawError}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleLogin} autoComplete="off" noValidate>
          {/* Prevent aggressive browser auto-fill */}
          <input type="text" name="fake_username" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
          <input type="password" name="fake_password" style={{ display: 'none' }} tabIndex={-1} autoComplete="new-password" />

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
              {tr('អ៊ីមែល', 'Email')}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <MdEmail
                size={19}
                color={errors.email ? '#ef4444' : '#94a3b8'}
                style={{ position: 'absolute', left: 14, pointerEvents: 'none' }}
              />
              <input
                type="email"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                }}
                placeholder={tr('បញ្ចូលអ៊ីមែល', 'Enter email')}
                style={{
                  width: '100%',
                  padding: '13px 16px 13px 44px',
                  borderRadius: 14,
                  border: errors.email ? '1.5px solid #ef4444' : '1.5px solid #e2e8f0',
                  background: errors.email ? '#fff8f8' : '#f8fafc',
                  fontSize: 14.5,
                  fontWeight: 500,
                  color: '#0f172a',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = errors.email ? '#ef4444' : '#2563eb';
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.boxShadow = errors.email ? '0 0 0 4px rgba(239, 68, 68, 0.15)' : '0 0 0 4px rgba(37, 99, 235, 0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = errors.email ? '#ef4444' : '#e2e8f0';
                  e.currentTarget.style.background = errors.email ? '#fff8f8' : '#f8fafc';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
            {errors.email && (
              <div style={{ color: '#dc2626', fontSize: '12.5px', fontWeight: 600, marginTop: '6px', lineHeight: '1.4' }}>
                {getErrorText(errors.email)}
              </div>
            )}
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'block',
                fontSize: 14.5,
                fontWeight: 700,
                color: '#334155',
                marginBottom: 7,
              }}
            >
              {tr('ពាក្យសម្ងាត់', 'Password')}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <MdLock
                size={19}
                color={errors.password ? '#ef4444' : '#94a3b8'}
                style={{ position: 'absolute', left: 14, pointerEvents: 'none' }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                }}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '13px 44px 13px 44px',
                  borderRadius: 14,
                  border: errors.password ? '1.5px solid #ef4444' : '1.5px solid #e2e8f0',
                  background: errors.password ? '#fff8f8' : '#f8fafc',
                  fontSize: 14.5,
                  fontWeight: 500,
                  color: '#0f172a',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = errors.password ? '#ef4444' : '#2563eb';
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.boxShadow = errors.password ? '0 0 0 4px rgba(239, 68, 68, 0.15)' : '0 0 0 4px rgba(37, 99, 235, 0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = errors.password ? '#ef4444' : '#e2e8f0';
                  e.currentTarget.style.background = errors.password ? '#fff8f8' : '#f8fafc';
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
                {getErrorText(errors.password)}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13.5px 20px',
              borderRadius: 14,
              border: 'none',
              background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
              color: '#ffffff',
              fontSize: 15.5,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.28)',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.85 : 1,
            }}
          >
            <span>{loading ? tr('កំពុងផ្ទៀងផ្ទាត់...', 'Authenticating...') : tr('ចូលប្រើប្រាស់', 'Sign In')}</span>
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
                  background: '#1565D8',
                  animation: 'loginProgressRun 1.15s ease-in-out infinite',
                }}
              />
            </div>
          )}
        </form>

        {/* Footer */}
        <div
          style={{
            marginTop: 22,
            textAlign: 'center',
            fontSize: 12.5,
            color: '#94a3b8',
            fontWeight: 500,
          }}
        >
          {tr('EBS Express • ហេដ្ឋារចនាសម្ព័ន្ធ SaaS Cloud', 'EBS Express • SaaS Cloud Infrastructure')}
        </div>
      </div>
    </div>
  );
}
