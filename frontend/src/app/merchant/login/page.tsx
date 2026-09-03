'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { setAuth, isAuthenticated, getUser } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import { MdPerson, MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md';

const merchantLoginTranslations = {
  en: {
    title: 'Merchant Portal',
    subtitle: 'Sign in to manage your parcels and orders',
    idLabel: 'Phone or Email',
    idPlaceholder: 'Enter your phone number or email',
    idRequired: 'Please enter your phone number or email',
    idInvalid: 'Please enter a valid email',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    passwordRequired: 'Please enter your password',
    passwordMin: 'Password must be at least 6 characters',
    signInBtn: 'Sign In as Merchant',
    signingIn: 'Signing in...',
    errorMsg: 'Invalid credentials or you are not registered as a merchant.',
  },
  km: {
    title: 'ផតថលហាង / អាជីវករ',
    subtitle: 'ចូលប្រព័ន្ធដើម្បីគ្រប់គ្រងកញ្ចប់អីវ៉ាន់ និងការបញ្ជាទិញ',
    idLabel: 'លេខទូរស័ព្ទ ឬ អ៊ីមែល',
    idPlaceholder: 'បញ្ចូលលេខទូរស័ព្ទ ឬ អ៊ីមែលរបស់អ្នក',
    idRequired: 'សូមបំពេញលេខទូរស័ព្ទ ឬ អ៊ីមែល',
    idInvalid: 'សូមបំពេញអ៊ីម៉ែលត្រឹមត្រូវ',
    passwordLabel: 'ពាក្យសម្ងាត់',
    passwordPlaceholder: '••••••••',
    passwordRequired: 'សូមបំពេញពាក្យសម្ងាត់',
    passwordMin: 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៦ តួអក្សរ',
    signInBtn: 'ចូលជាអាជីវករ',
    signingIn: 'កំពុងចូល...',
    errorMsg: 'អត្តសញ្ញាណខុស ឬអ្នកមិនទាន់បានចុះឈ្មោះជាអាជីវករឡើយ។',
  }
};

export default function MerchantLoginPage() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const [form, setForm] = useState({ email: '', password: '' }); // we map the 'email' field to phoneOrEmail for the login endpoint
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const t = merchantLoginTranslations[lang] || merchantLoginTranslations['en'];

  useEffect(() => {
    const isAuth = isAuthenticated();
    const user = getUser();
    if (isAuth && user?.role === 'merchant') {
      router.push('/merchant/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const newErrors: { email?: string; password?: string } = {};
    const idVal = form.email.trim();
    if (!idVal) {
      newErrors.email = t.idRequired;
    } else if (idVal.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(idVal)) {
      newErrors.email = t.idInvalid;
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
    setError('');
    setLoading(true);
    try {
      // Endpoint is mobile/auth/merchant/login
      const res = await api.post('/mobile/auth/merchant/login', form);
      setAuth(res.data.access_token, res.data.user);
      router.push('/merchant/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || t.errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      padding: '32px 24px',
      justifyContent: 'center',
      position: 'relative',
      backgroundColor: '#ffffff'
    }}>
      {/* Floating Language Switcher */}
      <div style={{
        position: 'absolute',
        top: '24px',
        right: '24px',
        backgroundColor: '#f1f5f9',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '2px',
        display: 'flex',
        gap: '2px',
        zIndex: 10
      }}>
        <button
          onClick={() => setLang('en')}
          type="button"
          style={{
            background: lang === 'en' ? '#ffffff' : 'transparent',
            border: 'none',
            color: lang === 'en' ? '#0f172a' : '#64748b',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: '700',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          EN
        </button>
        <button
          onClick={() => setLang('km')}
          type="button"
          style={{
            background: lang === 'km' ? '#ffffff' : 'transparent',
            border: 'none',
            color: lang === 'km' ? '#0f172a' : '#64748b',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: '700',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          ខ្មែរ
        </button>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '32px'
      }}>
        {/* Brand Logo Badge matching Web Admin */}
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '18px',
          background: 'linear-gradient(135deg, #2563eb, #6366f1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          boxShadow: '0 10px 24px rgba(37, 99, 235, 0.25)',
          marginBottom: '16px',
          color: '#ffffff'
        }}>
          📦
        </div>
        <h1 style={{
          fontSize: '22px',
          fontWeight: '900',
          color: '#0f172a',
          margin: 0,
          letterSpacing: '-0.4px'
        }}>
          EBS<span style={{ color: '#2563eb' }}>Express</span> Merchant
        </h1>
        <p style={{
          color: '#64748b',
          fontSize: '13px',
          marginTop: '6px',
          fontWeight: '500',
          textAlign: 'center'
        }}>
          {t.subtitle}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column' }}>
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.15)',
            color: '#b91c1c',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '12.5px',
            marginBottom: '20px',
            fontWeight: '500'
          }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column' }}>
          <label style={{
            color: '#475569',
            fontSize: '12px',
            fontWeight: '600',
            marginBottom: '8px'
          }}>{t.idLabel}</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <MdPerson style={{
              position: 'absolute',
              left: '16px',
              color: errors.email ? '#ef4444' : '#64748b',
              fontSize: '18px'
            }} />
            <input
              type="text"
              placeholder={t.idPlaceholder}
              value={form.email} // Send this as "email" property to match NestJS LoginDto
              onChange={e => {
                setForm({ ...form, email: e.target.value });
                if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
              }}
              style={{
                width: '100%',
                background: errors.email ? '#fff8f8' : '#ffffff',
                border: errors.email ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                color: '#0f172a',
                padding: '12px 16px 12px 46px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '500',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = errors.email ? '#ef4444' : '#2563eb';
                e.target.style.boxShadow = errors.email ? '0 0 0 4px rgba(239, 68, 68, 0.15)' : '0 0 0 4px rgba(37, 99, 235, 0.12)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = errors.email ? '#ef4444' : '#cbd5e1';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          {errors.email && (
            <div style={{ color: '#dc2626', fontSize: '12.5px', fontWeight: 600, marginTop: '6px', lineHeight: '1.4' }}>
              {errors.email}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '28px', display: 'flex', flexDirection: 'column' }}>
          <label style={{
            color: '#475569',
            fontSize: '12px',
            fontWeight: '600',
            marginBottom: '8px'
          }}>{t.passwordLabel}</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <MdLock style={{
              position: 'absolute',
              left: '16px',
              color: errors.password ? '#ef4444' : '#64748b',
              fontSize: '18px'
            }} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={t.passwordPlaceholder}
              value={form.password}
              onChange={e => {
                setForm({ ...form, password: e.target.value });
                if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
              }}
              style={{
                width: '100%',
                background: errors.password ? '#fff8f8' : '#ffffff',
                border: errors.password ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                color: '#0f172a',
                padding: '12px 46px 12px 46px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '500',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = errors.password ? '#ef4444' : '#2563eb';
                e.target.style.boxShadow = errors.password ? '0 0 0 4px rgba(239, 68, 68, 0.15)' : '0 0 0 4px rgba(37, 99, 235, 0.12)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = errors.password ? '#ef4444' : '#cbd5e1';
                e.target.style.boxShadow = 'none';
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '16px',
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
              }}
            >
              {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
            </button>
          </div>
          {errors.password && (
            <div style={{ color: '#dc2626', fontSize: '12.5px', fontWeight: 600, marginTop: '6px', lineHeight: '1.4' }}>
              {errors.password}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            background: '#10b981',
            color: '#ffffff',
            padding: '13px',
            borderRadius: '12px',
            fontSize: '14.5px',
            fontWeight: '700',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? '0.8' : '1',
            transition: 'background 0.2s',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {loading ? t.signingIn : t.signInBtn}
        </button>
      </form>
    </div>
  );
}
