'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MdSearch, MdLocalShipping, MdArrowForward } from 'react-icons/md';
import { useTenant } from '@/lib/TenantContext';

export default function TrackingSearchPage() {
  const router = useRouter();
  const { tenant } = useTenant();
  const [code, setCode] = useState('');

  const companyName = tenant?.companyName || 'EBS Express';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    router.push(`/tracking/${encodeURIComponent(code.trim().toUpperCase())}`);
  };

  return (
    <div className="tracking-mesh-container">
      <style jsx global>{`
        .tracking-mesh-container {
          min-height: 100vh;
          width: 100vw;
          background: linear-gradient(160deg, #f8fafc 0%, #f1f5f9 60%, #f8fafc 100%);
          font-family: 'Inter', 'Battambang', sans-serif;
          color: #0f172a;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        .tracking-grid-bg {
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

        .tracking-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(85px);
          pointer-events: none;
          z-index: 0;
        }

        .tracking-orb-1 {
          width: 560px;
          height: 560px;
          top: -180px;
          left: -140px;
          background: var(--accent, #1565D8);
          opacity: 0.13;
        }

        .tracking-orb-2 {
          width: 520px;
          height: 520px;
          bottom: -180px;
          right: -120px;
          background: var(--accent-dark, #0d47a1);
          opacity: 0.11;
        }
      `}</style>

      <div className="tracking-orb tracking-orb-1" />
      <div className="tracking-orb tracking-orb-2" />
      <div className="tracking-grid-bg" />

      {/* Header */}
      <header
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '20px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              color: 'var(--accent, #1565D8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
              overflow: 'hidden',
              padding: tenant?.logoUrl ? 5 : 0,
            }}
          >
            {tenant?.logoUrl ? (
              <img src={tenant.logoUrl} alt={companyName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <MdLocalShipping size={24} />
            )}
          </div>
          <div>
            <div style={{ fontSize: 16.5, fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>{companyName}</div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Live Tracking System</div>
          </div>
        </div>

        <Link
          href="/auth"
          style={{
            padding: '9px 18px',
            borderRadius: 12,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#334155',
            textDecoration: 'none',
            fontSize: 13.5,
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
          }}
        >
          ចូលប្រើប្រព័ន្ធ (Login)
        </Link>
      </header>

      {/* Main Search Area */}
      <main
        style={{
          position: 'relative',
          zIndex: 10,
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
        }}
      >
        <div
          style={{
            maxWidth: 600,
            width: '100%',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            borderRadius: 24,
            padding: '44px 36px 38px',
            border: '1px solid rgba(255, 255, 255, 0.85)',
            boxShadow:
              '0 24px 60px -16px rgba(15, 23, 42, 0.12), 0 4px 16px -4px rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(226, 232, 240, 0.75)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Top Brand Accent Bar */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: 'linear-gradient(90deg, var(--sidebar-bg, #1565D8) 0%, var(--accent-dark, #0d47a1) 100%)',
            }}
          />

          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: 20,
              background: 'var(--accent-subtle, rgba(21, 101, 216, 0.08))',
              border: '1.5px solid var(--accent-light, rgba(21, 101, 216, 0.18))',
              color: 'var(--accent, #1565D8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <MdSearch size={34} />
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 10px', color: '#0f172a', letterSpacing: '-0.3px' }}>
            តាមដានកញ្ចប់ឥវ៉ាន់ផ្ទាល់ (Live GPS)
          </h1>
          <p style={{ fontSize: 14.5, color: '#64748b', margin: '0 0 28px', lineHeight: 1.65 }}>
            បញ្ចូលលេខកូដ Tracking Code ឬស្កេន QR Code ដើម្បីមើលឃើញទីតាំងអ្នកដឹកជញ្ជូនលើផែនទីភ្លាមៗ
          </p>

          <form onSubmit={handleSearch} style={{ position: 'relative', marginBottom: 20 }}>
            <input
              type="text"
              required
              placeholder="ឧ. CO02092026842, EXP-12345..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{
                width: '100%',
                padding: '15px 140px 15px 18px',
                borderRadius: 14,
                border: '1.5px solid #e2e8f0',
                background: '#f8fafc',
                color: '#0f172a',
                fontSize: 15.5,
                fontWeight: 600,
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent, #1565D8)';
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.boxShadow = '0 0 0 4px var(--accent-light, rgba(21, 101, 216, 0.14))';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                position: 'absolute',
                right: 6,
                top: 6,
                bottom: 6,
                padding: '0 20px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--accent, #1565D8)',
                color: '#ffffff',
                fontSize: 14.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 12px var(--accent-glow, rgba(21, 101, 216, 0.28))',
              }}
            >
              <span>ស្វែងរក</span>
              <MdArrowForward size={18} />
            </button>
          </form>

          {/* Quick Tracking Sample Suggestions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>ឧទាហរណ៍៖</span>
            {['CO02098421', 'EXP-2026', 'TRACK-101'].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setCode(sample)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#334155',
                  borderRadius: 8,
                  padding: '4px 10px',
                  fontSize: 12.5,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {sample}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
