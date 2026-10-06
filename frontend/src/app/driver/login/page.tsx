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
  MdPerson,
} from 'react-icons/md';

const driverLoginTranslations = {
  en: {
    brandName: 'E-Express',
    tagline: 'Your Delivery Partner',
    values: 'Fast • Safe • Reliable',
    identifierLabel: 'Email, Phone, or Driver Code',
    identifierPlaceholder: 'Email, phone, or driver code',
    identifierRequired: 'Please enter email, phone, or driver code',
    phoneLabel: 'Email, Phone, or Driver Code',
    phonePlaceholder: 'Email, phone, or driver code',
    phoneRequired: 'Please enter email, phone, or driver code',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    passwordRequired: 'Please enter password',
    passwordMin: 'Password must be at least 6 characters',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot Password?',
    loginBtn: 'Login',
    loggingIn: 'Logging in...',
    or: 'or',
    useFingerprint: 'Demo Driver Login',
    errorMsg: 'Invalid credentials or driver account not found',
  },
  km: {
    brandName: 'E-Express',
    tagline: 'Your Delivery Partner',
    values: 'លឿន • សុវត្ថិភាព • ទុកចិត្តបាន',
    identifierLabel: 'អ៊ីមែល លេខទូរស័ព្ទ ឬកូដអ្នកដឹក',
    identifierPlaceholder: 'បញ្ចូលអ៊ីមែល លេខទូរស័ព្ទ ឬកូដអ្នកដឹក',
    identifierRequired: 'សូមបញ្ចូលអ៊ីមែល លេខទូរស័ព្ទ ឬកូដអ្នកដឹក',
    phoneLabel: 'អ៊ីមែល លេខទូរស័ព្ទ ឬកូដអ្នកដឹក',
    phonePlaceholder: 'បញ្ចូលអ៊ីមែល លេខទូរស័ព្ទ ឬកូដអ្នកដឹក',
    phoneRequired: 'សូមបញ្ចូលអ៊ីមែល លេខទូរស័ព្ទ ឬកូដអ្នកដឹក',
    passwordLabel: 'ពាក្យសម្ងាត់',
    passwordPlaceholder: '••••••••',
    passwordRequired: 'សូមបញ្ចូលពាក្យសម្ងាត់',
    passwordMin: 'ពាក្យសម្ងាត់យ៉ាងតិច ៦ ខ្ទង់',
    rememberMe: 'ចងចាំខ្ញុំ',
    forgotPassword: 'ភ្លេចលេខសម្ងាត់?',
    loginBtn: 'ចូលប្រព័ន្ធ (Login)',
    loggingIn: 'កំពុងចូលប្រព័ន្ធ...',
    or: 'ឬ',
    useFingerprint: 'គណនីសាកល្បងអ្នកដឹក (Demo)',
    errorMsg: 'ព័ត៌មានគណនី ឬលេខសម្ងាត់មិនត្រឹមត្រូវ',
  }
};

export default function DriverLoginPage() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
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

    const newErrors: { identifier?: string; password?: string } = {};
    const idVal = form.identifier.trim();
    if (!idVal) {
      newErrors.identifier = t.identifierRequired;
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
        identifier: idVal,
        phone: idVal,
        email: idVal,
        code: idVal,
        password: form.password,
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
    setForm({ identifier: '012345678', password: 'password123' });
    setError('');
    setErrors({});
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      fontFamily: "'Inter', 'Kantumruy Pro', -apple-system, BlinkMacSystemFont, sans-serif",
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      {/* Mobile Phone Frame */}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: '#ffffff',
        borderRadius: '36px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.1)',
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
          padding: '12px 24px 6px',
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
          top: '38px',
          right: '18px',
          display: 'flex',
          gap: '3px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          borderRadius: '20px',
          padding: '2px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          zIndex: 20,
        }}>
          <button
            type="button"
            onClick={() => setLang('en')}
            style={{
              padding: '3px 9px',
              fontSize: '10.5px',
              fontWeight: '800',
              borderRadius: '14px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: lang === 'en' ? '#2563eb' : 'transparent',
              color: lang === 'en' ? '#ffffff' : '#64748b',
            }}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLang('km')}
            style={{
              padding: '3px 9px',
              fontSize: '10.5px',
              fontWeight: '800',
              borderRadius: '14px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: lang === 'km' ? '#2563eb' : 'transparent',
              color: lang === 'km' ? '#ffffff' : '#64748b',
            }}
          >
            ខ្មែរ
          </button>
        </div>

        {/* Hero Top Illustration Banner (Screen 1 Design) */}
        <div style={{
          position: 'relative',
          height: '180px',
          background: 'linear-gradient(180deg, #dbeafe 0%, #eff6ff 60%, #ffffff 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '10px',
        }}>
          {/* City & Rider Skyline SVG Vector Art */}
          <svg viewBox="0 0 400 120" style={{ position: 'absolute', bottom: 0, width: '100%', height: '100px', opacity: 0.35 }}>
            <path d="M0,120 L0,90 L25,90 L25,60 L45,60 L45,90 L70,90 L70,40 L90,40 L90,90 L120,90 L120,70 L140,70 L140,90 L170,90 L170,30 L195,30 L195,90 L230,90 L230,55 L255,55 L255,90 L285,90 L285,45 L310,45 L310,90 L340,90 L340,65 L365,65 L365,90 L400,90 L400,120 Z" fill="#93c5fd" />
          </svg>

          {/* Rider in Blue/Red Helmet & Uniform */}
          <div style={{
            position: 'relative',
            zIndex: 5,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            {/* E-Express Logo Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '4px',
            }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 40%, #1d4ed8 41%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: '900',
                fontSize: '22px',
                fontStyle: 'italic',
                boxShadow: '0 6px 16px rgba(37, 99, 235, 0.3)',
              }}>
                E
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '900',
                  color: '#1d4ed8',
                  letterSpacing: '-0.5px',
                  lineHeight: 1.1,
                  fontStyle: 'italic',
                }}>
                  <span style={{ color: '#ef4444' }}>E</span>-Express
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', letterSpacing: '0.2px' }}>
                  Your Delivery Partner
                </div>
              </div>
            </div>

            {/* Rider Avatar Graphic */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#2563eb',
              border: '3px solid #ffffff',
              boxShadow: '0 8px 20px rgba(37, 99, 235, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '6px',
              overflow: 'hidden',
            }}>
              <span style={{ fontSize: '34px' }}>🏍️</span>
            </div>
          </div>
        </div>

        {/* Login Form Section */}
        <div style={{
          padding: '16px 24px 28px',
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

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Identifier Input (Email, Phone, or Driver Code) with Icon */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '14px',
                border: errors.identifier ? '1.5px solid #ef4444' : '1.5px solid #e2e8f0',
                backgroundColor: '#f8fafc',
              }}>
                <MdPerson size={20} color="#64748b" />
                <input
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={form.identifier}
                  onChange={(e) => {
                    setForm({ ...form, identifier: e.target.value });
                    if (errors.identifier) setErrors({ ...errors, identifier: undefined });
                  }}
                  placeholder={t.identifierPlaceholder}
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#0f172a',
                  }}
                />
              </div>
              {errors.identifier && (
                <div style={{ fontSize: '11.5px', color: '#ef4444', marginTop: '4px', marginLeft: '6px', fontWeight: '600' }}>
                  {errors.identifier}
                </div>
              )}
            </div>

            {/* Password Input with Lock & Eye */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '14px',
                border: errors.password ? '1.5px solid #ef4444' : '1.5px solid #e2e8f0',
                backgroundColor: '#f8fafc',
              }}>
                <MdLock size={20} color="#64748b" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => {
                    setForm({ ...form, password: e.target.value });
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  placeholder={t.passwordPlaceholder}
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#0f172a',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}
                >
                  {showPassword ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
                </button>
              </div>
              {errors.password && (
                <div style={{ fontSize: '11.5px', color: '#ef4444', marginTop: '4px', marginLeft: '6px', fontWeight: '600' }}>
                  {errors.password}
                </div>
              )}
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12.5px',
              fontWeight: '600',
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#475569' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: '#2563eb', cursor: 'pointer', width: '15px', height: '15px' }}
                />
                {t.rememberMe}
              </label>

              <span style={{ color: '#2563eb', cursor: 'pointer', fontWeight: '700' }}>
                {t.forgotPassword}
              </span>
            </div>

            {/* Blue Login Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '4px',
                width: '100%',
                padding: '13px',
                borderRadius: '14px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: '800',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 6px 20px rgba(37, 99, 235, 0.35)',
                opacity: loading ? 0.8 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              {loading ? t.loggingIn : t.loginBtn}
            </button>
          </form>

          {/* Or Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '18px 0',
            color: '#94a3b8',
            fontSize: '12px',
            fontWeight: '600',
          }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
            <span>{t.or}</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
          </div>

          {/* Use Fingerprint Button */}
          <button
            type="button"
            onClick={handleFingerprint}
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#2563eb',
              fontWeight: '700',
              fontSize: '12.5px',
            }}
          >
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: '#eff6ff',
              border: '1.5px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
            }}>
              <MdFingerprint size={28} />
            </div>
            <span>{t.useFingerprint}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
