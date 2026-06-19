'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { setAuth, isAuthenticated, getUser } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import { MdPerson, MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md';

const driverLoginTranslations = {
  en: {
    title: 'Driver Portal',
    subtitle: 'Sign in to access your delivery tasks',
    emailLabel: 'Email or Phone',
    emailPlaceholder: 'Enter your email or phone number',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    signInBtn: 'Sign In as Driver',
    signingIn: 'Signing in...',
    errorMsg: 'Invalid credentials or you are not registered as a driver.',
  },
  km: {
    title: 'ផតថលអ្នកបើកបរ',
    subtitle: 'ចូលប្រព័ន្ធដើម្បីមើលភារកិច្ចដឹកជញ្ជូនរបស់អ្នក',
    emailLabel: 'អ៊ីមែល ឬលេខទូរស័ព្ទ',
    emailPlaceholder: 'បញ្ចូលអ៊ីមែល ឬលេខទូរស័ព្ទរបស់អ្នក',
    passwordLabel: 'ពាក្យសម្ងាត់',
    passwordPlaceholder: '••••••••',
    signInBtn: 'ចូលជាអ្នកដឹកជញ្ជូន',
    signingIn: 'កំពុងចូល...',
    errorMsg: 'អត្តសញ្ញាណខុស ឬអ្នកមិនទាន់បានចុះឈ្មោះជាអ្នកបើកបរឡើយ។',
  }
};

export default function DriverLoginPage() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const [form, setForm] = useState({ email: '', password: '' });
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
    setLoading(true);
    setError('');
    try {
      // Endpoint is mobile/auth/driver/login
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
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #2f55a5, #4f46e5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          boxShadow: '0 4px 12px rgba(47, 85, 165, 0.15)',
          marginBottom: '16px',
          color: '#ffffff'
        }}>
          🛵
        </div>
        <h1 style={{
          fontSize: '22px',
          fontWeight: '800',
          color: '#0f172a',
          margin: 0,
          letterSpacing: '-0.5px'
        }}>
          EBS<span style={{ color: '#2f55a5' }}>Express</span> Driver
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

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
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
          }}>{t.emailLabel}</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <MdPerson style={{
              position: 'absolute',
              left: '16px',
              color: '#64748b',
              fontSize: '18px'
            }} />
            <input
              type="text"
              placeholder={t.emailPlaceholder}
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
              style={{
                width: '100%',
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                color: '#0f172a',
                padding: '12px 16px 12px 46px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '500',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
          </div>
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
              color: '#64748b',
              fontSize: '18px'
            }} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={t.passwordPlaceholder}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
              style={{
                width: '100%',
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                color: '#0f172a',
                padding: '12px 46px 12px 46px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '500',
                outline: 'none',
                transition: 'border-color 0.2s'
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
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            background: '#2f55a5',
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
