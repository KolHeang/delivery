'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { setAuth, isAuthenticated, getUser } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import { MdPerson, MdLock, MdVisibility, MdVisibilityOff, MdLocalShipping } from 'react-icons/md';

const driverLoginTranslations = {
  en: {
    brandName: 'KOL HEANG EXPRESS',
    portalTag: 'Driver Portal',
    subtitle: 'Sign in to access your delivery tasks',
    emailLabel: 'Email or Phone Number',
    emailPlaceholder: 'Enter your email or phone number',
    emailRequired: 'Please enter your email or phone number',
    emailInvalid: 'Please enter a valid email or phone number',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    passwordRequired: 'Please enter your password',
    passwordMin: 'Password must be at least 6 characters',
    signInBtn: 'Sign In as Driver',
    signingIn: 'Signing in...',
    errorMsg: 'Invalid credentials or you are not registered as a driver.',
  },
  km: {
    brandName: 'KOL HEANG EXPRESS',
    portalTag: 'អ្នកដឹកជញ្ជូន (Driver Portal)',
    subtitle: 'ចូលប្រព័ន្ធដើម្បីមើលភារកិច្ច និងគ្រប់គ្រងការដឹកជញ្ជូន',
    emailLabel: 'អ៊ីមែល ឬលេខទូរស័ព្ទ',
    emailPlaceholder: 'បញ្ចូលអ៊ីមែល ឬលេខទូរស័ព្ទរបស់អ្នក',
    emailRequired: 'សូមបំពេញអ៊ីម៉ែល ឬលេខទូរស័ព្ទ',
    emailInvalid: 'សូមបំពេញអ៊ីម៉ែលត្រឹមត្រូវ',
    passwordLabel: 'ពាក្យសម្ងាត់',
    passwordPlaceholder: 'បញ្ចូលពាក្យសម្ងាត់របស់អ្នក',
    passwordRequired: 'សូមបំពេញពាក្យសម្ងាត់',
    passwordMin: 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៦ តួអក្សរ',
    signInBtn: 'ចូលប្រព័ន្ធអ្នកដឹកជញ្ជូន',
    signingIn: 'កំពុងចូលប្រព័ន្ធ...',
    errorMsg: 'អត្តសញ្ញាណខុស ឬអ្នកមិនទាន់បានចុះឈ្មោះជាអ្នកបើកបរឡើយ។',
  }
};

export default function DriverLoginPage() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const t = driverLoginTranslations[lang] || driverLoginTranslations['en'];

  useEffect(() => {
    const isAuth = isAuthenticated();
    const user = getUser();
    if (isAuth && user?.role === 'driver') {
      router.push('/driver/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const newErrors: { email?: string; password?: string } = {};
    const emailVal = form.email.trim();
    if (!emailVal) {
      newErrors.email = t.emailRequired;
    } else if (emailVal.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
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
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/mobile/auth/driver/login', form);
      setAuth(res.data.access_token, res.data.user);
      router.push('/driver/dashboard');
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
      backgroundColor: '#f4f7fc',
      fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px 16px',
      position: 'relative'
    }}>
      {/* Background Decorative Gradient Spheres */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '260px',
        height: '260px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, rgba(37, 99, 235, 0) 70%)',
        pointerEvents: 'none'
      }} />

      {/* Floating Language Switcher Top Right */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '3px',
        display: 'flex',
        gap: '3px',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
        zIndex: 10
      }}>
        <button
          onClick={() => setLang('en')}
          type="button"
          style={{
            background: lang === 'en' ? '#2563eb' : 'transparent',
            border: 'none',
            color: lang === 'en' ? '#ffffff' : '#64748b',
            padding: '6px 12px',
            fontSize: '11.5px',
            fontWeight: '800',
            borderRadius: '9px',
            cursor: 'pointer',
            boxShadow: lang === 'en' ? '0 2px 6px rgba(37, 99, 235, 0.2)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          EN
        </button>
        <button
          onClick={() => setLang('km')}
          type="button"
          style={{
            background: lang === 'km' ? '#2563eb' : 'transparent',
            border: 'none',
            color: lang === 'km' ? '#ffffff' : '#64748b',
            padding: '6px 12px',
            fontSize: '11.5px',
            fontWeight: '800',
            borderRadius: '9px',
            cursor: 'pointer',
            boxShadow: lang === 'km' ? '0 2px 6px rgba(37, 99, 235, 0.2)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          ខ្មែរ
        </button>
      </div>

      {/* Main Glassmorphism Login Card */}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: '#ffffff',
        borderRadius: '28px',
        padding: '36px 24px',
        boxShadow: '0 16px 40px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.03)',
        border: '1px solid #e2e8f0',
        position: 'relative',
        zIndex: 2
      }}>
        {/* Brand Header */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          marginBottom: '28px'
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
            letterSpacing: '-0.4px',
            lineHeight: 1.3
          }}>
            EBS<span style={{ color: '#2563eb' }}>Express</span> Driver
          </h1>

          <div style={{
            fontSize: '13px',
            fontWeight: '800',
            color: '#2563eb',
            marginTop: '4px',
            letterSpacing: '0.2px'
          }}>
            {t.portalTag}
          </div>

          <p style={{
            color: '#64748b',
            fontSize: '12px',
            marginTop: '6px',
            fontWeight: '500',
            margin: '6px 0 0'
          }}>
            {t.subtitle}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '12px 14px',
              borderRadius: '14px',
              fontSize: '12px',
              fontWeight: '600',
              lineHeight: 1.4,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Email / Phone Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{
              color: '#334155',
              fontSize: '12.5px',
              fontWeight: '800'
            }}>
              {t.emailLabel}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div style={{
                position: 'absolute',
                left: '14px',
                color: errors.email ? '#ef4444' : '#2563eb',
                display: 'flex',
                alignItems: 'center'
              }}>
                <MdPerson size={20} />
              </div>
              <input
                type="text"
                placeholder={t.emailPlaceholder}
                value={form.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                }}
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 44px',
                  backgroundColor: errors.email ? '#fff8f8' : '#f8fafc',
                  border: errors.email ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                  borderRadius: '16px',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  color: '#0f172a',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = errors.email ? '#ef4444' : '#2563eb';
                  e.target.style.backgroundColor = '#ffffff';
                  e.target.style.boxShadow = errors.email ? '0 0 0 4px rgba(239, 68, 68, 0.15)' : '0 0 0 4px rgba(37, 99, 235, 0.12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.email ? '#ef4444' : '#cbd5e1';
                  e.target.style.backgroundColor = errors.email ? '#fff8f8' : '#f8fafc';
                  e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)';
                }}
              />
            </div>
            {errors.email && (
              <div style={{ color: '#dc2626', fontSize: '12.5px', fontWeight: 600, marginTop: '2px', lineHeight: '1.4' }}>
                {errors.email}
              </div>
            )}
          </div>

          {/* Password Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{
              color: '#334155',
              fontSize: '12.5px',
              fontWeight: '800'
            }}>
              {t.passwordLabel}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div style={{
                position: 'absolute',
                left: '14px',
                color: errors.password ? '#ef4444' : '#2563eb',
                display: 'flex',
                alignItems: 'center'
              }}>
                <MdLock size={20} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t.passwordPlaceholder}
                value={form.password}
                onChange={(e) => {
                  setForm({ ...form, password: e.target.value });
                  if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                }}
                style={{
                  width: '100%',
                  padding: '14px 44px 14px 44px',
                  backgroundColor: errors.password ? '#fff8f8' : '#f8fafc',
                  border: errors.password ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                  borderRadius: '16px',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  color: '#0f172a',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = errors.password ? '#ef4444' : '#2563eb';
                  e.target.style.backgroundColor = '#ffffff';
                  e.target.style.boxShadow = errors.password ? '0 0 0 4px rgba(239, 68, 68, 0.15)' : '0 0 0 4px rgba(37, 99, 235, 0.12)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.password ? '#ef4444' : '#cbd5e1';
                  e.target.style.backgroundColor = errors.password ? '#fff8f8' : '#f8fafc';
                  e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0
                }}
              >
                {showPassword ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
              </button>
            </div>
            {errors.password && (
              <div style={{ color: '#dc2626', fontSize: '12.5px', fontWeight: 600, marginTop: '2px', lineHeight: '1.4' }}>
                {errors.password}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '16px',
              padding: '16px 20px',
              fontSize: '15px',
              fontWeight: '800',
              lineHeight: '1.45',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1,
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.3)',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#ffffff',
                  borderRadius: '50%',
                  animation: 'spinLogin 0.8s linear infinite',
                  display: 'inline-block'
                }} />
                {t.signingIn}
              </span>
            ) : (
              t.signInBtn
            )}
          </button>
        </form>
      </div>

      {/* CSS Animation */}
      <style dangerouslySetInnerHTML={{__html: `@keyframes spinLogin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
    </div>
  );
}
