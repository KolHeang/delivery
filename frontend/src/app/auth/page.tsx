'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { setAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', form);
      setAuth(res.data.access_token, res.data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ 
      backgroundColor: '#f8fafc',
      display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background Elements matching System Theme */}
      <div className="bg-shape shape-1"></div>
      <div className="bg-shape shape-2"></div>
      <div className="bg-shape shape-3"></div>
      <div className="bg-shape shape-4"></div>

      <style dangerouslySetInnerHTML={{__html: `
        .bg-shape {
          position: absolute;
          filter: blur(90px);
          z-index: 0;
          border-radius: 50%;
          animation: float 25s infinite ease-in-out alternate;
          opacity: 0.4;
        }
        .shape-1 {
          top: -10%; left: -10%;
          width: 600px; height: 600px;
          background: #2f55a5; /* System Accent */
          animation-delay: 0s;
        }
        .shape-2 {
          bottom: -10%; right: -5%;
          width: 500px; height: 500px;
          background: #1e3b75; /* System Accent Dark */
          animation-delay: -5s;
        }
        .shape-3 {
          top: 30%; left: 50%;
          width: 450px; height: 450px;
          background: #60a5fa; /* Light Blue */
          animation-delay: -12s;
        }
        .shape-4 {
          bottom: 20%; left: 10%;
          width: 400px; height: 400px;
          background: #93c5fd; /* Soft Blue */
          animation-delay: -18s;
        }
        @keyframes float {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -60px) scale(1.1); }
          66% { transform: translate(-30px, 30px) scale(0.9); }
          100% { transform: translate(0, 0) scale(1); }
        }
      `}} />

      <div className="login-card" style={{ 
        background: 'rgba(255, 255, 255, 0.7)', 
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        padding: '48px 40px',
        maxWidth: 420,
        width: '100%',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 36 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16,
            background: 'linear-gradient(135deg, var(--accent), #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#ffffff', fontSize: 28, boxShadow: '0 8px 16px rgba(59,130,246,0.3)',
            marginBottom: 20
          }}>
            📦
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.5px' }}>
            EBS<span style={{ color: 'var(--accent)' }}>Express</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 6, fontWeight: 500 }}>
            Log in to manage your deliveries
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error" style={{ 
              background: 'var(--danger-light)', border: '1px solid rgba(239,68,68,0.2)', 
              color: 'var(--danger)', padding: '12px 16px', borderRadius: 12, fontSize: 13, marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600
            }}>
              ⚠️ {error}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label" style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Email Address</label>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="Enter your email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
              style={{ 
                background: '#ffffff', border: '1px solid var(--border)', 
                color: 'var(--text-primary)', padding: '14px 16px', borderRadius: 12, fontSize: 15,
                width: '100%', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 28 }}>
            <label className="form-label" style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Password</label>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
              autoComplete="current-password"
              style={{ 
                background: '#ffffff', border: '1px solid var(--border)', 
                color: 'var(--text-primary)', padding: '14px 16px', borderRadius: 12, fontSize: 15,
                width: '100%', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            />
          </div>

          <button id="login-btn" type="submit" className="login-btn" disabled={loading} style={{
            background: 'linear-gradient(135deg, var(--accent), #3b82f6)', color: '#ffffff',
            padding: '14px', borderRadius: 12, fontSize: 16, fontWeight: 700,
            boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)', transition: 'all 0.2s',
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
            border: 'none', cursor: 'pointer', width: '100%'
          }}>
            {loading ? 'Signing in...' : 'Sign In'}
            {!loading && <span style={{ fontSize: 18 }}>→</span>}
          </button>
        </form>
      </div>
    </div>
  );
}
