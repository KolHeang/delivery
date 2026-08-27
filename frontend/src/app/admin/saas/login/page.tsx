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
  MdLogin,
  MdLanguage,
} from 'react-icons/md';

export default function SaasAdminLoginPage() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const tr = (km: string, en: string) => (lang === 'km' ? km : en);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await saasApi.adminLogin(email.trim(), password);
      if (res && res.access_token && res.admin) {
        // Save auth state
        setAuth(res.access_token, {
          id: res.admin.id,
          name: res.admin.name,
          email: res.admin.email,
          role: 'admin',
          active: res.admin.isActive,
          permissions: ['*'],
        });
        localStorage.setItem('saas_admin', JSON.stringify(res.admin));

        // Navigate to SaaS Master Dashboard
        router.push('/admin/saas');
      } else {
        setError(tr('បរាជ័យក្នុងការ Login សូមពិនិត្យមើល Email និង Password', 'Login failed, please check your Email and Password'));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || tr('Email ឬ Password មិនត្រឹមត្រូវ', 'Invalid Email or Password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3b75 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
        position: 'relative',
      }}
    >
      {/* Top Right Language Switcher */}
      <div style={{ position: 'absolute', top: 24, right: 24 }}>
        <button
          onClick={() => setLang(lang === 'en' ? 'km' : 'en')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 10,
            border: '1px solid rgba(255, 255, 255, 0.25)',
            background: 'rgba(255, 255, 255, 0.12)',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 800,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
          }}
        >
          <MdLanguage size={18} />
          <span>{lang === 'en' ? '🇰🇭 ភាសាខ្មែរ' : '🇬🇧 English'}</span>
        </button>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#ffffff',
          borderRadius: 24,
          padding: '40px 36px',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.2)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 18,
              background: 'linear-gradient(135deg, #1e3b75, #2563eb)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              margin: '0 auto 16px',
              boxShadow: '0 8px 20px rgba(37,99,235,0.35)',
            }}
          >
            👑
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
            EBS Master SaaS
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0, fontWeight: 600 }}>
            {tr('ផ្ទាំង Login សម្រាប់ SaaS Platform Master Admin', 'Login portal for SaaS Platform Master Admin')}
          </p>
        </div>

        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1.5px solid #fecaca',
              color: '#dc2626',
              padding: '12px 14px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 20,
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          {/* Email */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
              {tr('អ៊ីមែល Master Admin (Email)', 'Master Admin Email')}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <MdEmail size={20} color="#94a3b8" style={{ position: 'absolute', left: 14 }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="superadmin@ebsexpress.com"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: 12,
                  border: '1.5px solid #e2e8f0',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#0f172a',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
              {tr('ពាក្យសម្ងាត់ (Password)', 'Password')}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <MdLock size={20} color="#94a3b8" style={{ position: 'absolute', left: 14 }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 42px',
                  borderRadius: 12,
                  border: '1.5px solid #e2e8f0',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#0f172a',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
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
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #1e3b75, #2563eb)',
              color: '#ffffff',
              fontSize: 15,
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 8px 20px rgba(37,99,235,0.3)',
              transition: 'all 0.15s',
              opacity: loading ? 0.8 : 1,
            }}
          >
            <MdLogin size={20} />
            <span>{loading ? tr('កំពុងផ្ទៀងផ្ទាត់...', 'Authenticating...') : tr('ចូលគ្រប់គ្រង SaaS Portal', 'Login to SaaS Portal')}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
