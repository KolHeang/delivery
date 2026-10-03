'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { setAuth, isAuthenticated, getUser } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdPhone,
  MdLock,
  MdVisibility,
  MdVisibilityOff,
  MdFingerprint,
  MdSignalCellularAlt,
  MdWifi,
  MdBatteryFull,
} from 'react-icons/md';

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
  const [currentTime, setCurrentTime] = useState('9:41');

  const t = driverLoginTranslations[lang as 'en' | 'km'] || driverLoginTranslations.en;

  useEffect(() => {
    const isAuth = isAuthenticated();
    const user = getUser();
    if (isAuth && user?.role === 'driver') {
      router.push('/driver/dashboard');
    }

    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
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
      const res = await api.post('/mobile/auth/driver/login', {
        phone: phone.trim(),
        password: password,
      });
      setAuth(res.data.access_token, res.data.user);
      router.push('/driver/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || t.errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleFingerprint = () => {
    // Quick biometric fill demo
    setPhone('012345678');
    setPassword('123456');
    setError('');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#f1f5f9',
      fontFamily: "'Kantumruy Pro', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      {/* Mobile Frame */}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: '#ffffff',
        borderRadius: '36px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0,0,0,0.05)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}>
        {/* Status Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 24px 8px',
          fontSize: '13px',
          fontWeight: '700',
          color: '#1e293b',
          zIndex: 10,
        }}>
          <span>{currentTime}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MdSignalCellularAlt size={16} />
            <MdWifi size={16} />
            <MdBatteryFull size={18} />
          </div>
        </div>

        {/* Floating Language Switcher */}
        <div style={{
          position: 'absolute',
          top: '44px',
          right: '20px',
          display: 'flex',
          gap: '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          borderRadius: '20px',
          padding: '3px',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          zIndex: 20,
        }}>
          <button
            type="button"
            onClick={() => setLang('en')}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: '700',
              borderRadius: '16px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: lang === 'en' ? '#1e60ff' : 'transparent',
              color: lang === 'en' ? '#ffffff' : '#64748b',
              transition: 'all 0.2s',
            }}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLang('km')}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: '700',
              borderRadius: '16px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: lang === 'km' ? '#1e60ff' : 'transparent',
              color: lang === 'km' ? '#ffffff' : '#64748b',
              transition: 'all 0.2s',
            }}
          >
            ខ្មែរ
          </button>
        </div>

        {/* Hero Illustration & Branding */}
        <div style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '16px 20px 0',
          background: 'linear-gradient(180deg, #e0f2fe 0%, #ffffff 100%)',
          minHeight: '260px',
        }}>
          {/* Brand Logo */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '8px',
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
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <div style={{
                fontSize: '28px',
                fontWeight: '900',
                fontStyle: 'italic',
                color: '#ef4444',
                lineHeight: 1,
                letterSpacing: '-1px',
              }}>
                E<span style={{ color: '#1e60ff' }}>-Express</span>
              </div>
            </div>
            <div style={{
              fontSize: '11.5px',
              fontWeight: '600',
              color: '#1e60ff',
              letterSpacing: '0.3px',
              marginTop: '2px',
            }}>
              {t.tagline}
            </div>
          </div>

          {/* City Skyline & Rider Visual (SVG) */}
          <div style={{
            width: '100%',
            maxWidth: '320px',
            height: '180px',
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}>
            {/* Skyline Silhouette */}
            <svg
              viewBox="0 0 400 200"
              style={{
                position: 'absolute',
                bottom: 0,
                width: '100%',
                height: '100%',
                opacity: 0.35,
              }}
            >
              {/* Phnom Penh / Modern City Skyline */}
              <path d="M10,200 L10,130 L30,130 L30,100 L40,80 L50,100 L50,130 L70,130 L70,150 L90,150 L90,70 L100,50 L110,70 L110,150 L130,150 L130,110 L150,110 L150,60 L160,40 L170,60 L170,110 L190,110 L190,30 L200,10 L210,30 L210,110 L230,110 L230,90 L240,70 L250,90 L250,110 L270,110 L270,140 L290,140 L290,60 L300,40 L310,60 L310,140 L330,140 L330,120 L350,120 L350,160 L390,160 L390,200 Z" fill="#93c5fd" />
              {/* Pagoda spire representation */}
              <polygon points="100,50 95,90 105,90" fill="#f59e0b" opacity="0.6" />
              <polygon points="200,10 193,60 207,60" fill="#f59e0b" opacity="0.6" />
            </svg>

            {/* Rider Avatar with Blue Helmet & E-Express Jacket */}
            <div style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: '4px',
            }}>
              {/* Helmet */}
              <div style={{
                width: '64px',
                height: '56px',
                backgroundColor: '#1e40af',
                borderRadius: '32px 32px 14px 14px',
                position: 'relative',
                boxShadow: '0 8px 16px rgba(30, 64, 175, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {/* Red stripe on helmet */}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  width: '100%',
                  height: '6px',
                  backgroundColor: '#ef4444',
                }} />
                {/* Visor */}
                <div style={{
                  position: 'absolute',
                  bottom: '10px',
                  width: '46px',
                  height: '16px',
                  backgroundColor: '#0f172a',
                  borderRadius: '6px',
                  border: '1px solid #38bdf8',
                }} />
              </div>
              {/* Rider Shoulders/Back with Uniform */}
              <div style={{
                width: '108px',
                height: '54px',
                backgroundColor: '#1d4ed8',
                borderRadius: '24px 24px 0 0',
                marginTop: '-6px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 14px rgba(29, 78, 216, 0.25)',
                position: 'relative',
              }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: '900',
                  color: '#ffffff',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}>
                  E-Express
                </div>
                <div style={{
                  fontSize: '7.5px',
                  fontWeight: '700',
                  color: '#fbbf24',
                }}>
                  Best Delivery Partner
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Login Form Section */}
        <div style={{
          padding: '24px 28px 28px',
          backgroundColor: '#ffffff',
        }}>
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '10px 14px',
              color: '#dc2626',
              fontSize: '12.5px',
              fontWeight: '600',
              marginBottom: '16px',
              lineHeight: 1.4,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Phone Input */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '14px',
              padding: '0 16px',
              height: '52px',
              transition: 'border-color 0.2s',
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

            {/* Password Input */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '14px',
              padding: '0 16px',
              height: '52px',
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
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

          {/* Fingerprint Biometric Button */}
          <button
            type="button"
            onClick={handleFingerprint}
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              gap: '6px',
            }}
          >
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1e60ff',
              transition: 'transform 0.2s',
            }}>
              <MdFingerprint size={28} />
            </div>
            <span style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#475569',
            }}>
              {t.useFingerprint}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
