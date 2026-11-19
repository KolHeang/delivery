'use client';

import React, { useEffect, useState } from 'react';
import { MdRefresh } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';
import { useTenant } from '@/lib/TenantContext';

export const SERVER_UNAVAILABLE_EVENT = 'app:server-unavailable';
export const SERVER_RECOVERED_EVENT = 'app:server-recovered';

const TOTAL_SECONDS = 10;

export default function ServerStatusOverlay() {
  const { lang } = useLanguage();
  const { tenant } = useTenant();
  const [visible, setVisible] = useState(false);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(TOTAL_SECONDS);

  useEffect(() => {
    const handleUnavailable = (e: Event) => {
      const detail = (e as CustomEvent<{ status?: number }>).detail;
      setStatusCode(detail?.status ?? 502);
      setCountdown(TOTAL_SECONDS);
      setVisible(true);
    };

    const handleRecovered = () => {
      setVisible(false);
    };

    window.addEventListener(SERVER_UNAVAILABLE_EVENT, handleUnavailable);
    window.addEventListener(SERVER_RECOVERED_EVENT, handleRecovered);
    return () => {
      window.removeEventListener(SERVER_UNAVAILABLE_EVENT, handleUnavailable);
      window.removeEventListener(SERVER_RECOVERED_EVENT, handleRecovered);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.reload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [visible]);

  if (!visible) return null;

  const isKm = lang === 'km';
  const companyName = tenant?.companyName || 'EBS Express';
  const progressPct = ((TOTAL_SECONDS - countdown) / TOTAL_SECONDS) * 100;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'linear-gradient(160deg, #f8fafc 0%, #f1f5f9 60%, #f8fafc 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        fontFamily: "'Inter', 'Battambang', sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* Subtle Vignette Grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(to right, rgba(148, 163, 184, 0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.14) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse 75% 70% at 50% 45%, #000 35%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 75% 70% at 50% 45%, #000 35%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Soft Ambient Glow Orbs */}
      <div
        style={{
          position: 'absolute',
          width: 620,
          height: 620,
          top: -200,
          left: -160,
          borderRadius: '50%',
          background: 'var(--accent, #1565D8)',
          opacity: 0.13,
          filter: 'blur(90px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 580,
          height: 580,
          bottom: -200,
          right: -140,
          borderRadius: '50%',
          background: 'var(--accent-dark, #0d47a1)',
          opacity: 0.11,
          filter: 'blur(90px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Top Brand Bar */}
      <div
        style={{
          position: 'absolute',
          top: 28,
          left: 36,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {tenant?.logoUrl && (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 11,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 5,
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
            }}
          >
            <img
              src={tenant.logoUrl}
              alt={companyName}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        )}
        <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.2px' }}>
          {companyName}
        </span>
      </div>

      {/* Main Centered Content (Full & Clean) */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: 520,
          textAlign: 'center',
        }}
      >
        {/* Status Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            color: 'var(--accent, #1565D8)',
            fontSize: 13,
            fontWeight: 700,
            padding: '6px 16px',
            borderRadius: 999,
            marginBottom: 24,
            boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--accent, #1565D8)',
            }}
          />
          <span>
            {isKm
              ? `កំពុងភ្ជាប់ឡើងវិញ${statusCode ? ` • ${statusCode}` : ''}`
              : `Reconnecting${statusCode ? ` • ${statusCode}` : ''}`}
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 32,
            fontWeight: 900,
            color: '#0f172a',
            margin: '0 0 14px',
            lineHeight: 1.35,
            letterSpacing: '-0.4px',
          }}
        >
          {isKm ? 'ប្រព័ន្ធកំពុងធ្វើបច្ចុប្បន្នភាព' : 'System is Updating'}
        </h1>

        {/* Clean Single-Language Description */}
        <p
          style={{
            fontSize: 15.5,
            color: '#64748b',
            lineHeight: 1.7,
            margin: '0 auto 32px',
            maxWidth: 440,
          }}
        >
          {isKm
            ? 'សូមរង់ចាំបន្តិច ប្រព័ន្ធកំពុងដំណើរការឡើងវិញ ដើម្បីផ្តល់សេវាកម្មកាន់តែប្រសើរ។ ទិន្នន័យរបស់អ្នកមានសុវត្ថិភាព ១០០%។'
            : 'Please wait a moment while the server restarts. Your data is completely safe and the page will refresh automatically.'}
        </p>

        {/* Sleek Auto-Reconnect Progress Bar */}
        <div
          style={{
            width: '100%',
            maxWidth: 320,
            height: 5,
            borderRadius: 999,
            background: '#e2e8f0',
            margin: '0 auto 14px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              background: 'var(--accent, #1565D8)',
              borderRadius: 999,
              transition: 'width 0.9s linear',
            }}
          />
        </div>

        <div style={{ fontSize: 13.5, color: '#64748b', fontWeight: 600, marginBottom: 28 }}>
          {isKm ? (
            <>
              ផ្ទុកឡើងវិញដោយស្វ័យប្រវត្តិក្នុង{' '}
              <strong style={{ color: 'var(--accent, #1565D8)' }}>{countdown}</strong> វិនាទី
            </>
          ) : (
            <>
              Refreshing automatically in{' '}
              <strong style={{ color: 'var(--accent, #1565D8)' }}>{countdown}s</strong>
            </>
          )}
        </div>

        {/* Single Clean Primary Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '13px 28px',
              borderRadius: 14,
              border: 'none',
              background: 'var(--accent, #1565D8)',
              color: '#ffffff',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 8px 22px var(--accent-glow, rgba(21, 101, 216, 0.28))',
            }}
          >
            <MdRefresh size={20} />
            <span>{isKm ? 'ផ្ទុកឡើងវិញឥឡូវនេះ' : 'Reload Now'}</span>
          </button>
        </div>
      </div>

      {/* Subtle Footer */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          zIndex: 10,
          fontSize: 12.5,
          color: '#94a3b8',
          fontWeight: 500,
        }}
      >
        {companyName} • {isKm ? 'ប្រព័ន្ធគ្រប់គ្រងការដឹកជញ្ជូន' : 'Delivery Management System'}
      </div>
    </div>
  );
}
