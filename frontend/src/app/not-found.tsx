'use client';

import React from 'react';
import Link from 'next/link';
import { MdHome, MdArrowBack } from 'react-icons/md';

export default function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        background: 'linear-gradient(160deg, #f8fafc 0%, #f1f5f9 60%, #f8fafc 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: "'Inter', 'Battambang', sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Soft Ambient Orbs */}
      <div
        style={{
          position: 'absolute',
          width: 520,
          height: 520,
          top: -180,
          left: -140,
          borderRadius: '50%',
          background: 'var(--accent, #1565D8)',
          opacity: 0.12,
          filter: 'blur(85px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 480,
          height: 480,
          bottom: -180,
          right: -120,
          borderRadius: '50%',
          background: 'var(--accent-dark, #0d47a1)',
          opacity: 0.1,
          filter: 'blur(85px)',
          pointerEvents: 'none',
        }}
      />

      {/* Frosted Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: 450,
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderRadius: 24,
          padding: '40px 32px 32px',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.85)',
          boxShadow:
            '0 24px 60px -16px rgba(15, 23, 42, 0.12), 0 4px 16px -4px rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          overflow: 'hidden',
        }}
      >
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
            display: 'inline-block',
            fontSize: 44,
            fontWeight: 900,
            color: 'var(--accent, #1565D8)',
            background: 'var(--accent-light, rgba(21, 101, 216, 0.1))',
            padding: '6px 22px',
            borderRadius: 16,
            marginBottom: 18,
            letterSpacing: '1px',
          }}
        >
          404
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '0 0 10px' }}>
          រកមិនឃើញទំព័រនេះទេ
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.65, margin: '0 0 6px' }}>
          តំណភ្ជាប់ដែលអ្នកកំពុងស្វែងរកមិនមាន ឬត្រូវបានផ្លាស់ប្តូរទីតាំង។
        </p>
        <p style={{ fontSize: 12.5, color: '#94a3b8', margin: '0 0 24px' }}>
          The page you are looking for does not exist or has been moved.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link
            href="/dashboard"
            style={{
              width: '100%',
              padding: '12.5px 18px',
              borderRadius: 12,
              border: 'none',
              background: 'var(--accent, #1565D8)',
              color: '#ffffff',
              fontSize: 14.5,
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 6px 18px var(--accent-glow, rgba(21, 101, 216, 0.28))',
            }}
          >
            <MdHome size={19} />
            <span>ត្រឡប់ទៅផ្ទាំងគ្រប់គ្រង (Dashboard)</span>
          </Link>

          <button
            type="button"
            onClick={() => window.history.back()}
            style={{
              width: '100%',
              padding: '11.5px 18px',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#334155',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <MdArrowBack size={18} />
            <span>ត្រឡប់ក្រោយ (Go Back)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
