'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { setAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md';

const loginTranslations: Record<string, Record<string, string>> = {
  en: {
    subtitle: 'Log in to manage your deliveries',
    emailLabel: 'Email Address',
    emailPlaceholder: 'Enter your email',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    forgotPassword: 'Forgot Password?',
    forgotPasswordAlert: 'Please contact the system administrator to reset your password.',
    signInBtn: 'Sign In',
    signingIn: 'Signing in...',
  },
  km: {
    subtitle: 'ចូលគណនីដើម្បីគ្រប់គ្រងការដឹកជញ្ជូនរបស់អ្នក',
    emailLabel: 'អាសយដ្ឋានអ៊ីមែល',
    emailPlaceholder: 'បញ្ចូលអ៊ីមែលរបស់អ្នក',
    passwordLabel: 'ពាក្យសម្ងាត់',
    passwordPlaceholder: '••••••••',
    forgotPassword: 'ភ្លេចពាក្យសម្ងាត់?',
    forgotPasswordAlert: 'សូមទាក់ទងអ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin) ដើម្បីកំណត់ពាក្យសម្ងាត់របស់អ្នកឡើងវិញ។',
    signInBtn: 'ចូលប្រព័ន្ធ',
    signingIn: 'កំពុងចូល...',
  }
};

export default function LoginPage() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const t = loginTranslations[lang] || loginTranslations['en'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ប្រសិនបើកំពុងតែ Login ស្រាប់ហើយ មិនឲ្យដំណើរការទៅមុខទៀតទេ (ការពារចុច Double Click)
    if (loading) return;

    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', form);
      setAuth(res.data.access_token, res.data.user);
      router.push('/dashboard');
    } catch (err: any) {
      // ចាប់យក Error message ពី Backend បើមាន, បើគ្មានបង្ហាញពាក្យទូទៅ
      setError(err.response?.data?.message || 'អ៊ីមែល ឬ ពាក្យសម្ងាត់មិនត្រឹមត្រូវទេ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Animated Background Elements */}
      <div className="bg-shape shape-1"></div>
      <div className="bg-shape shape-2"></div>
      <div className="bg-shape shape-3"></div>
      <div className="bg-shape shape-4"></div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .login-page {
          background-color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 24px;
          position: relative;
          overflow: hidden;
          font-family: 'Kantumruy Pro', 'Inter', sans-serif;
        }

        .bg-shape {
          position: absolute;
          filter: blur(100px);
          z-index: 0;
          border-radius: 50%;
          animation: float 25s infinite ease-in-out alternate;
          opacity: 0.85;
        }
        
        .shape-1 {
          top: -10%; left: -10%;
          width: 550px; height: 550px;
          background: rgba(59, 130, 246, 0.07);
          animation-delay: 0s;
        }
        .shape-2 {
          bottom: -10%; right: -5%;
          width: 600px; height: 600px;
          background: rgba(139, 92, 246, 0.07);
          animation-delay: -5s;
        }
        .shape-3 {
          top: 30%; left: 60%;
          width: 450px; height: 450px;
          background: rgba(236, 72, 153, 0.04);
          animation-delay: -11s;
        }
        .shape-4 {
          bottom: 20%; left: 5%;
          width: 450px; height: 450px;
          background: rgba(34, 211, 238, 0.05);
          animation-delay: -17s;
        }
        
        @keyframes float {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -60px) scale(1.08); }
          100% { transform: translate(-30px, 30px) scale(0.95); }
        }

        .login-container-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          max-width: 440px;
          z-index: 1;
        }

        .login-card {
          background: #ffffff; 
          border-radius: 24px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.08), 
                      0 0 0 1px rgba(15, 23, 42, 0.02);
          padding: 48px 40px;
          width: 100%;
          position: relative;
          z-index: 1;
        }

        .logo-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 36px;
        }

        .logo-icon {
          width: 60px;
          height: 60px;
          border-radius: 16px;
          background: linear-gradient(135deg, #2f55a5, #4f46e5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          box-shadow: 0 4px 12px rgba(47, 85, 165, 0.15);
          margin-bottom: 20px;
          color: #ffffff;
        }

        .logo-title {
          font-size: 26px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.5px;
        }

        .logo-accent {
          color: #2f55a5;
        }

        .logo-subtitle {
          color: #64748b;
          font-size: 13.5px;
          margin-top: 8px;
          font-weight: 500;
          text-align: center;
        }

        .form-group {
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
        }

        .form-label {
          color: #475569;
          font-size: 12.5px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          color: #475569;
          font-size: 20px;
          pointer-events: none;
          transition: color 0.2s ease;
        }

        .form-input {
          background: #ffffff;
          border: 1.5px solid #94a3b8;
          color: #0f172a;
          padding: 13px 16px 13px 46px;
          border-radius: 12px;
          font-size: 14.5px;
          font-weight: 500;
          width: 100%;
          transition: all 0.2s ease;
          outline: none;
        }

        .form-input:focus {
          border-color: #2f55a5;
          box-shadow: 0 0 0 3px rgba(47, 85, 165, 0.15);
        }

        .input-wrapper:focus-within .input-icon {
          color: #2f55a5;
        }

        .form-input::placeholder {
          color: #475569;
        }

        .password-toggle-btn {
          position: absolute;
          right: 16px;
          background: transparent;
          border: none;
          color: #475569;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          outline: none;
          transition: color 0.2s ease;
        }

        .password-toggle-btn:hover {
          color: #475569;
        }

        .forgot-password-container {
          display: flex;
          justify-content: flex-end;
          margin-top: -12px;
          margin-bottom: 24px;
        }

        .forgot-link {
          color: #2f55a5;
          font-size: 12.5px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .forgot-link:hover {
          color: #1e3b75;
          text-decoration: underline;
        }

        /* Modal Styles */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.3);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          animation: fadeIn 0.2s ease-out;
        }

        .modal-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 32px;
          max-width: 360px;
          width: 90%;
          text-align: center;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          border: 1px solid #e2e8f0;
          animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .modal-icon {
          font-size: 40px;
          margin-bottom: 16px;
        }

        .modal-title {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 12px;
        }

        .modal-text {
          font-size: 14px;
          color: #475569;
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .modal-close-btn {
          background: #2f55a5;
          color: #ffffff;
          border: none;
          padding: 10px 24px;
          font-size: 14px;
          font-weight: 700;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.2s;
          width: 100%;
        }

        .modal-close-btn:hover {
          background: #1e3b75;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .login-error {
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.15);
          color: #b91c1c;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 500;
        }

        .login-btn {
          background: #2f55a5;
          color: #ffffff;
          padding: 13px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          width: 100%;
          transition: background 0.2s ease, transform 0.1s ease;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
        }

        .login-btn:hover {
          background: #1e3b75;
        }
        
        .login-btn:active {
          transform: scale(0.99);
        }

        .login-btn:disabled {
          background: #e2e8f0;
          color: #94a3b8;
          cursor: not-allowed;
        }

        .lang-switcher {
          position: absolute;
          top: 24px;
          right: 24px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 2px;
          display: flex;
          gap: 2px;
          z-index: 10;
        }

        .lang-btn {
          background: transparent;
          border: none;
          color: #64748b;
          padding: 6px 12px;
          font-size: 11.5px;
          font-weight: 700;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        .lang-btn.active {
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
      `}} />

      <div className="login-container-wrapper">
        <div className="login-card">
          {/* Floating Language Switcher */}
          <div className="lang-switcher">
            <button
              className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
              onClick={() => setLang('en')}
              type="button"
            >
              EN
            </button>
            <button
              className={`lang-btn ${lang === 'km' ? 'active' : ''}`}
              onClick={() => setLang('km')}
              type="button"
            >
              ខ្មែរ
            </button>
          </div>

          <div className="logo-container">
            <div className="logo-icon">
              📦
            </div>
            <h1 className="logo-title">
              EBS<span className="logo-accent">Express</span>
            </h1>
            <p className="logo-subtitle">
              {t.subtitle}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="login-error">
                ⚠️ {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">{t.emailLabel}</label>
              <div className="input-wrapper">
                <MdEmail className="input-icon" />
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder={t.emailPlaceholder}
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">{t.passwordLabel}</label>
              <div className="input-wrapper">
                <MdLock className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder={t.passwordPlaceholder}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: '46px' }}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="forgot-password-container">
              <span className="forgot-link" onClick={() => setShowForgotModal(true)}>
                {t.forgotPassword}
              </span>
            </div>

            <button id="login-btn" type="submit" className="login-btn" disabled={loading}>
              {loading ? t.signingIn : t.signInBtn}
              {!loading && <span style={{ fontSize: 18 }}>→</span>}
            </button>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-icon">🔑</div>
            <h3 className="modal-title">{t.forgotPassword}</h3>
            <p className="modal-text">{t.forgotPasswordAlert}</p>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setShowForgotModal(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
