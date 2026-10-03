'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MdSearch, MdLocalShipping, MdQrCodeScanner, MdArrowForward } from 'react-icons/md';

export default function TrackingSearchPage() {
  const router = useRouter();
  const [code, setCode] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    router.push(`/tracking/${encodeURIComponent(code.trim().toUpperCase())}`);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%)',
        fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <header style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#ffffff', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900 }}>
            📦
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#ffffff' }}>EBS Express</div>
            <div style={{ fontSize: 11, color: '#bfdbfe' }}>Live Tracking System</div>
          </div>
        </div>

        <Link
          href="/auth"
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.15)',
            color: '#ffffff',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 700,
            backdropFilter: 'blur(8px)',
          }}
        >
          ចូលប្រើប្រព័ន្ធ (Login)
        </Link>
      </header>

      {/* Main Search Area */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ maxWidth: 580, width: '100%', textAlign: 'center' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(12px)',
              border: '2px solid rgba(255,255,255,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 34,
              margin: '0 auto 20px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
            }}
          >
            🛵
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 10px', letterSpacing: '-0.3px' }}>
            តាមដានកញ្ចប់ឥវ៉ាន់ផ្ទាល់ (Live GPS)
          </h1>
          <p style={{ fontSize: 14, color: '#bfdbfe', margin: '0 0 32px', lineHeight: 1.6 }}>
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
                padding: '16px 140px 16px 20px',
                borderRadius: 16,
                border: '2px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.95)',
                color: '#0f172a',
                fontSize: 16,
                fontWeight: 700,
                outline: 'none',
                boxSizing: 'border-box',
                boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              }}
            />
            <button
              type="submit"
              style={{
                position: 'absolute',
                right: 6,
                top: 6,
                bottom: 6,
                padding: '0 20px',
                borderRadius: 12,
                border: 'none',
                background: '#2563eb',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 12px rgba(37,99,235,0.35)',
              }}
            >
              <span>ស្វែងរក</span>
              <MdArrowForward size={18} />
            </button>
          </form>

          {/* Quick Tracking Sample Suggestions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#93c5fd' }}>ឧទាហរណ៍៖</span>
            {['CO02098421', 'EXP-2026', 'TRACK-101'].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setCode(sample)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#ffffff',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 11.5,
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
