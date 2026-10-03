'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { saasApi } from '@/lib/saas-api';
import { setAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import { useTenant } from '@/lib/TenantContext';
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { FlagKm, FlagEn } from '@/components/ui/Flags';

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
  },
  km: {
    subtitle: 'ចូលគណនីដើម្បីគ្រប់គ្រងការដឹកជញ្ជូនរបស់អ្នក',
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
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname.includes('.localhost')) {
        const sub = hostname.split('.localhost')[0].replace(/\..*$/, '').toLowerCase();
        if (sub && sub !== 'www' && sub !== 'app' && sub !== 'api') {
          setCurrentSubdomain(sub);
        }
      } else {
        const parts = hostname.split('.');
        if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'app') {
          setCurrentSubdomain(parts[0].toLowerCase());
        }
      }
    }
  }, []);

  const activeSubdomain = workspaceSubdomain || currentSubdomain;
  const activeCompanyName = tenant?.companyName || (activeSubdomain ? activeSubdomain.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : null);

  const t = loginTranslations[lang] || loginTranslations['en'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const newErrors: { email?: string; password?: string } = {};
    const emailVal = form.email.trim();
    if (!emailVal) {
      newErrors.email = t.emailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      newErrors.email = t.emailInvalid;
    }

    if (!form.password) {
      newErrors.password = t.passwordRequired;
    } else if (form.password.length < 6) {
      newErrors.password = t.passwordMin;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', form);
      setAuth(res.data.access_token, res.data.user);
      window.location.href = '/dashboard';
      return;
    } catch (err: any) {
      try {
        const saasRes = await saasApi.adminLogin(form.email, form.password);
        if (saasRes && saasRes.access_token && saasRes.admin) {
          setAuth(saasRes.access_token, {
            id: saasRes.admin.id,
            name: saasRes.admin.name,
            email: saasRes.admin.email,
            role: 'admin',
            active: saasRes.admin.isActive,
            permissions: ['*'],
          });
          localStorage.setItem('saas_admin', JSON.stringify(saasRes.admin));
          window.location.href = '/admin/saas';
          return;
        }
      } catch (saasErr) {
        // fallback to standard error
      }

      setError(err.response?.data?.message || (lang === 'km' ? 'អ៊ីមែល ឬ ពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ' : 'Invalid email or password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="blueprint-login-container">
      {/* Route Path Following Animation Styles with Larger Vectors */}
      <style jsx global>{`
        @keyframes networkFlow {
          to { stroke-dashoffset: -60; }
        }

        @keyframes moveAlongRoute1 {
          0%   { offset-distance: 0%;   opacity: 0; }
          4%   { opacity: 1; }
          96%  { opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
        }

        @keyframes moveAlongRoute2 {
          0%   { offset-distance: 0%;   opacity: 0; }
          4%   { opacity: 1; }
          96%  { opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
        }

        @keyframes radarPulse {
          0%   { transform: scale(0.85); opacity: 0.85; }
          100% { transform: scale(2.4);  opacity: 0; }
        }

        @keyframes personBounce {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25%       { transform: translateY(-10px) rotate(-1.5deg); }
          50%       { transform: translateY(-4px) rotate(0deg); }
          75%       { transform: translateY(-12px) rotate(1.5deg); }
        }

        @keyframes legSwingL {
          0%, 100% { transform: rotate(0deg);  transform-origin: top center; }
          25%       { transform: rotate(22deg);  transform-origin: top center; }
          50%       { transform: rotate(0deg);  transform-origin: top center; }
          75%       { transform: rotate(-18deg); transform-origin: top center; }
        }

        @keyframes legSwingR {
          0%, 100% { transform: rotate(0deg);  transform-origin: top center; }
          25%       { transform: rotate(-20deg); transform-origin: top center; }
          50%       { transform: rotate(0deg);  transform-origin: top center; }
          75%       { transform: rotate(20deg);  transform-origin: top center; }
        }

        @keyframes armSwingL {
          0%, 100% { transform: rotate(0deg);  transform-origin: top center; }
          25%       { transform: rotate(-18deg); transform-origin: top center; }
          50%       { transform: rotate(0deg);  transform-origin: top center; }
          75%       { transform: rotate(16deg);  transform-origin: top center; }
        }

        @keyframes armSwingR {
          0%, 100% { transform: rotate(0deg);  transform-origin: top center; }
          25%       { transform: rotate(18deg);  transform-origin: top center; }
          50%       { transform: rotate(0deg);  transform-origin: top center; }
          75%       { transform: rotate(-16deg); transform-origin: top center; }
        }

        .blueprint-login-container {
          min-height: 100vh;
          width: 100vw;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          font-family: 'Kantumruy Pro', 'Inter', sans-serif;
          position: relative;
          overflow: hidden;
        }

        /* SaaS-style Dot Matrix + Grid (delivery orange accent) */
        .blueprint-grid {
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(rgba(245, 158, 11, 0.14) 1.5px, transparent 1.5px),
            linear-gradient(to right, rgba(226, 232, 240, 0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(226, 232, 240, 0.4) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
          z-index: 1;
        }

        /* Motorcycle on path */
        .moto-on-path {
          position: absolute;
          top: 0;
          left: 0;
          width: 72px;
          height: 52px;
          offset-path: path("M -100,180 C 320,50 520,350 920,180 C 1320,10 1550,390 2050,200");
          offset-rotate: auto;
          animation: moveAlongRoute1 15s linear infinite;
          z-index: 4;
          pointer-events: none;
          filter: drop-shadow(0 4px 10px rgba(245, 158, 11, 0.25));
        }

        /* Delivery Van on path */
        .van-on-path {
          position: absolute;
          top: 0;
          left: 0;
          width: 82px;
          height: 52px;
          offset-path: path("M -100,680 C 380,490 700,750 1150,560 C 1500,390 1750,690 2150,520");
          offset-rotate: auto;
          animation: moveAlongRoute2 18s linear infinite;
          z-index: 4;
          pointer-events: none;
          filter: drop-shadow(0 4px 10px rgba(43, 82, 154, 0.2));
        }

        /* Walking people */
        .person-node {
          position: absolute;
          z-index: 3;
          pointer-events: none;
          animation: personBounce 1.2s ease-in-out infinite;
          filter: drop-shadow(0 4px 10px rgba(0,0,0,0.13));
        }

        .person-leg-l { animation: legSwingL 0.6s ease-in-out infinite; transform-origin: top center; }
        .person-leg-r { animation: legSwingR 0.6s ease-in-out infinite; transform-origin: top center; }
        .person-arm-l { animation: armSwingL 0.6s ease-in-out infinite; transform-origin: top center; }
        .person-arm-r { animation: armSwingR 0.6s ease-in-out infinite; transform-origin: top center; }

        /* GPS pulse dots */
        .radar-node {
          position: absolute;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #f59e0b;
          z-index: 2;
          pointer-events: none;
        }

        .radar-node::after {
          content: '';
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          border: 2px solid #fbbf24;
          animation: radarPulse 2s ease-out infinite;
        }

        .clean-card {
          width: 100%;
          max-width: 420px;
          background: #ffffff;
          border-radius: 22px;
          padding: 40px 34px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 20px 40px -12px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02);
          position: relative;
          z-index: 10;
        }
      `}</style>

      {/* 1. Blueprint Grid Background */}
      <div className="blueprint-grid" />

      {/* 2. SVG Route Paths — SaaS-style dashed network lines */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 2,
        }}
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
      >
        {/* Route 1: Top Curve — amber/orange delivery brand */}
        <path
          d="M -100,180 C 320,50 520,350 920,180 C 1320,10 1550,390 2050,200"
          fill="none"
          stroke="rgba(245, 158, 11, 0.38)"
          strokeWidth="3.5"
          strokeDasharray="9,11"
          style={{ animation: 'networkFlow 2.2s linear infinite' }}
        />

        {/* Route 2: Bottom Curve — blue delivery brand */}
        <path
          d="M -100,680 C 380,490 700,750 1150,560 C 1500,390 1750,690 2150,520"
          fill="none"
          stroke="rgba(43, 82, 154, 0.32)"
          strokeWidth="3.5"
          strokeDasharray="11,13"
          style={{ animation: 'networkFlow 2.8s linear infinite' }}
        />
      </svg>

      {/* 3. Large Delivery Motorcycle & Courier Rider */}
      <div className="moto-on-path">
        <svg width="72" height="52" viewBox="0 0 48 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="26" r="7" stroke="#1e3b75" strokeWidth="2.5" fill="#f8fafc" />
          <circle cx="10" cy="26" r="2.5" fill="#1e3b75" />
          <circle cx="38" cy="26" r="7" stroke="#1e3b75" strokeWidth="2.5" fill="#f8fafc" />
          <circle cx="38" cy="26" r="2.5" fill="#1e3b75" />
          <path d="M10 26L20 18H28L38 26M22 18L18 26M33 13L38 26" stroke="#1e3b75" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M16 23C16 19 21 16 28 17L34 23" fill="#2563eb" />
          <circle cx="27" cy="8" r="4.5" fill="#0f172a" />
          <path d="M28 6.5H31C32 6.5 32.5 7.5 32 8.5L30 10H27" fill="#38bdf8" />
          <path d="M23 13C23 13 25 10.5 28 12C31 13.5 30 17 28 19L22 22" fill="#1e40af" />
          <path d="M26 14L32 16M32 14V17" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
          <rect x="7" y="10" width="13" height="11" rx="2" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
          <path d="M10 13H17M10 16H15" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* 4. Large Delivery Van Truck & Driver */}
      <div className="van-on-path">
        <svg width="82" height="52" viewBox="0 0 54 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="7" width="34" height="20" rx="3" fill="#2b529a" />
          <path d="M6 12H18M6 16H14" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="23" y="11" width="9" height="9" rx="1.5" fill="#ffffff" opacity="0.9" />
          <path d="M25 14H30M25 17H28" stroke="#2b529a" strokeWidth="1.2" />
          <path d="M36 12H44C46.5 12 49 14.5 50 17.5L52 23.5C52.5 25 51.5 27 49.5 27H36V12Z" fill="#1e3b75" />
          <path d="M38 14H43.5L46.5 19H38V14Z" fill="#bae6fd" />
          <circle cx="41" cy="16.5" r="2" fill="#0f172a" />
          <path d="M51 22H53V25H51V22Z" fill="#facc15" />
          <circle cx="12" cy="27" r="5.5" stroke="#0f172a" strokeWidth="2.5" fill="#e2e8f0" />
          <circle cx="12" cy="27" r="2" fill="#0f172a" />
          <circle cx="43" cy="27" r="5.5" stroke="#0f172a" strokeWidth="2.5" fill="#e2e8f0" />
          <circle cx="43" cy="27" r="2" fill="#0f172a" />
        </svg>
      </div>

      {/* 5. Courier & Customer Figures - Walking Animation */}

      {/* Person 1: Courier with delivery box (top right) */}
      <div className="person-node" style={{ top: '120px', right: '13%' }}>
        <svg width="48" height="64" viewBox="0 0 32 44" fill="none">
          {/* Head */}
          <circle cx="16" cy="7" r="5.5" fill="#1e3b75" />
          {/* Helmet */}
          <path d="M10.5 6C10.5 3.5 13 1.5 16 1.5C19 1.5 21.5 3.5 21.5 6H10.5Z" fill="#facc15" />
          {/* Body */}
          <path d="M10 15C10 13 13 12.5 16 12.5C19 12.5 22 13 22 15L23 26H9L10 15Z" fill="#2563eb" />
          {/* Delivery Box on back */}
          <rect x="20" y="14" width="11" height="10" rx="1.5" fill="#f59e0b" stroke="#d97706" strokeWidth="1.2" />
          <path d="M23 17H28M23 20H26" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
          {/* Left arm (swings forward) */}
          <g className="person-arm-l">
            <path d="M10 16L6 23" stroke="#1e3b75" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          {/* Right arm (swings back) */}
          <g className="person-arm-r">
            <path d="M22 16L26 22" stroke="#1e3b75" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          {/* Left leg */}
          <g className="person-leg-l">
            <path d="M13 26L11 38" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M11 38L8 41" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
          </g>
          {/* Right leg */}
          <g className="person-leg-r">
            <path d="M19 26L21 38" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M21 38L24 41" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
          </g>
        </svg>
      </div>

      {/* Person 2: Customer receiving (bottom left) */}
      <div className="person-node" style={{ bottom: '140px', left: '11%', animationDelay: '-0.6s' }}>
        <svg width="48" height="64" viewBox="0 0 32 44" fill="none">
          {/* Head */}
          <circle cx="16" cy="7" r="5.5" fill="#0f172a" />
          {/* Hair */}
          <path d="M10.5 6C10.5 3 13 1 16 1C19 1 21.5 3 21.5 6H10.5Z" fill="#2b529a" />
          {/* Body */}
          <path d="M11 15C11 13 13 12.5 16 12.5C19 12.5 21 13 21 15L22 26H10L11 15Z" fill="#059669" />
          {/* Tablet/phone in hand */}
          <rect x="3" y="17" width="7" height="10" rx="1.2" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" />
          <path d="M5 20H8M5 23H7" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
          {/* Left arm holding tablet */}
          <path d="M11 16L7 20" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
          {/* Right arm (swings) */}
          <g className="person-arm-r">
            <path d="M21 16L25 22" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          {/* Left leg */}
          <g className="person-leg-l" style={{ animationDelay: '0.3s' }}>
            <path d="M13 26L11 38" stroke="#1e293b" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M11 38L8 41" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
          </g>
          {/* Right leg */}
          <g className="person-leg-r" style={{ animationDelay: '0.3s' }}>
            <path d="M19 26L21 38" stroke="#1e293b" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M21 38L24 41" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
          </g>
        </svg>
      </div>

      {/* Person 3: Extra small courier (bottom right) */}
      <div className="person-node" style={{ bottom: '180px', right: '10%', animationDelay: '-1.1s' }}>
        <svg width="40" height="54" viewBox="0 0 32 44" fill="none">
          <circle cx="16" cy="7" r="5" fill="#7c3aed" />
          <path d="M10.5 6C10.5 3.5 13 1.5 16 1.5C19 1.5 21.5 3.5 21.5 6H10.5Z" fill="#a78bfa" />
          <path d="M11 15C11 13 13.5 12.5 16 12.5C18.5 12.5 21 13 21 15L22.5 26H9.5L11 15Z" fill="#6d28d9" />
          <rect x="20" y="13" width="9" height="8" rx="1.2" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
          <g className="person-arm-l">
            <path d="M11 16L7 22" stroke="#5b21b6" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <g className="person-arm-r">
            <path d="M21 15L25 20" stroke="#5b21b6" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <g className="person-leg-l">
            <path d="M13 26L11 38" stroke="#3b0764" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M11 38L8 41" stroke="#3b0764" strokeWidth="2" strokeLinecap="round" />
          </g>
          <g className="person-leg-r">
            <path d="M19 26L21 38" stroke="#3b0764" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M21 38L24 41" stroke="#3b0764" strokeWidth="2" strokeLinecap="round" />
          </g>
        </svg>
      </div>

      {/* 6. Pulsing GPS Radar Points */}
      <div className="radar-node" style={{ top: '180px', left: '16%' }} />
      <div className="radar-node" style={{ top: '180px', right: '22%' }} />
      <div className="radar-node" style={{ bottom: '260px', left: '20%' }} />
      <div className="radar-node" style={{ bottom: '220px', right: '16%' }} />

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
            background: lang === 'km' ? '#2b529a' : 'transparent',
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
            background: lang === 'en' ? '#2b529a' : 'transparent',
            color: lang === 'en' ? '#ffffff' : '#64748b',
            transition: 'all 0.15s ease',
          }}
        >
          <FlagEn size={18} />
          <span>EN</span>
        </button>
      </div>

      {/* 8. Clean Centered Card - FULLY DYNAMIC BRANDING */}
      <div className="clean-card">
        {/* Dynamic Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: 22,
              background: tenant?.logoUrl ? '#ffffff' : 'linear-gradient(135deg, #1e3a8a 0%, #2b529a 60%, #3b6cc4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 24px rgba(43, 82, 154, 0.28)',
              color: '#ffffff',
              border: '2.5px solid #e2e8f0',
              overflow: 'hidden',
              padding: tenant?.logoUrl ? 8 : 0,
            }}
          >
            {tenant?.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt={tenant.companyName}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <svg width="58" height="58" viewBox="0 0 58 58" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="24" width="30" height="17" rx="3" fill="white" fillOpacity="0.95" />
                <path d="M35 27H45C47 27 49.5 29 50.5 32L52 37C52.5 38.5 51.5 41 49.5 41H35V27Z" fill="white" fillOpacity="0.82" />
                <path d="M37 29H43L46 35H37V29Z" fill="#93c5fd" />
                <rect x="9" y="27" width="9" height="6" rx="1.5" fill="#93c5fd" />
                <path d="M9 36H22M9 39H18" stroke="#2b529a" strokeWidth="1.5" strokeLinecap="round" />
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
              fontSize: 27,
              fontWeight: 900,
              color: '#0f172a',
              margin: '0 0 6px',
              letterSpacing: '-0.4px',
            }}
          >
            {activeCompanyName ? (
              <span>{activeCompanyName}</span>
            ) : (
              <>EBS<span style={{ color: '#2b529a' }}>Express</span></>
            )}
          </h1>

          {/* Dynamic Subtitle */}
          <p style={{ fontSize: 13, color: '#64748b', margin: 0, fontWeight: 500 }}>
            {activeCompanyName
              ? (lang === 'km' ? `ចូលគ្រប់គ្រងប្រព័ន្ធដឹកជញ្ជូន ${activeCompanyName}` : `Sign in to manage ${activeCompanyName} logistics`)
              : t.subtitle}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
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
            <span>{error}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13.5,
                fontWeight: 700,
                color: '#1e293b',
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
                {errors.email}
              </div>
            )}
          </div>

          {/* Password */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13.5,
                fontWeight: 700,
                color: '#1e293b',
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
                {errors.password}
              </div>
            )}
          </div>

          {/* Forgot Password */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <span
              onClick={() => setShowForgotModal(true)}
              style={{
                color: '#2563eb',
                fontSize: 12.5,
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
              background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
              color: '#ffffff',
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.28)',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.8 : 1,
            }}
          >
            <span>{loading ? t.signingIn : t.signInBtn}</span>
          </button>
        </form>

        {/* Dynamic Footer */}
        <div
          style={{
            marginTop: 26,
            textAlign: 'center',
            fontSize: 12,
            color: '#94a3b8',
            fontWeight: 500,
          }}
        >
          {tenant?.companyName ? `${tenant.companyName} • Delivery System` : 'EBS Express • Delivery Management System'}
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
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔑</div>
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
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 10,
                cursor: 'pointer',
                width: '100%',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
