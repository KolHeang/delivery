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
  MdSecurity,
  MdDns,
} from 'react-icons/md';
import { FlagKm, FlagEn } from '@/components/ui/Flags';
import { SaasCloudIcon } from '@/components/ui/SaasCloudIcon';

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
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      const res = await saasApi.adminLogin(email.trim(), password);
      if (res && res.access_token && res.admin) {
        setAuth(res.access_token, {
          id: res.admin.id,
          name: res.admin.name,
          email: res.admin.email,
          role: 'admin',
          active: res.admin.isActive,
          permissions: ['*'],
        });
        localStorage.setItem('saas_admin', JSON.stringify(res.admin));
        window.location.href = '/admin/saas';
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
    <div className="saas-cloud-bg-container">
      {/* SaaS Cloud & Server Infrastructure Network Styles */}
      <style jsx global>{`
        @keyframes networkFlow {
          to {
            stroke-dashoffset: -60;
          }
        }

        @keyframes moveCloudPacket {
          0% {
            offset-distance: 0%;
            opacity: 0;
          }
          4% {
            opacity: 1;
          }
          96% {
            opacity: 1;
          }
          100% {
            offset-distance: 100%;
            opacity: 0;
          }
        }

        @keyframes moveServerPacket {
          0% {
            offset-distance: 0%;
            opacity: 0;
          }
          4% {
            opacity: 1;
          }
          96% {
            opacity: 1;
          }
          100% {
            offset-distance: 100%;
            opacity: 0;
          }
        }

        @keyframes cloudServerPulse {
          0% {
            transform: scale(0.85);
            opacity: 0.85;
          }
          100% {
            transform: scale(2.4);
            opacity: 0;
          }
        }

        @keyframes adminFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }

        @keyframes personBounce {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25%       { transform: translateY(-10px) rotate(-1.5deg); }
          50%       { transform: translateY(-4px) rotate(0deg); }
          75%       { transform: translateY(-12px) rotate(1.5deg); }
        }

        @keyframes legSwingL {
          0%, 100% { transform: rotate(0deg); transform-origin: top center; }
          25%       { transform: rotate(22deg); transform-origin: top center; }
          50%       { transform: rotate(0deg); transform-origin: top center; }
          75%       { transform: rotate(-18deg); transform-origin: top center; }
        }

        @keyframes legSwingR {
          0%, 100% { transform: rotate(0deg); transform-origin: top center; }
          25%       { transform: rotate(-20deg); transform-origin: top center; }
          50%       { transform: rotate(0deg); transform-origin: top center; }
          75%       { transform: rotate(20deg); transform-origin: top center; }
        }

        @keyframes armSwingL {
          0%, 100% { transform: rotate(0deg); transform-origin: top center; }
          25%       { transform: rotate(-18deg); transform-origin: top center; }
          50%       { transform: rotate(0deg); transform-origin: top center; }
          75%       { transform: rotate(16deg); transform-origin: top center; }
        }

        @keyframes armSwingR {
          0%, 100% { transform: rotate(0deg); transform-origin: top center; }
          25%       { transform: rotate(18deg); transform-origin: top center; }
          50%       { transform: rotate(0deg); transform-origin: top center; }
          75%       { transform: rotate(-16deg); transform-origin: top center; }
        }

        .saas-cloud-bg-container {
          min-height: 100vh;
          width: 100vw;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          font-family: 'Kantumruy Pro', 'Inter', sans-serif;
          position: relative;
          overflow: hidden;
        }

        /* SaaS Dot Matrix & Server Grid */
        .saas-grid-pattern {
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(rgba(37, 99, 235, 0.12) 1.5px, transparent 1.5px),
            linear-gradient(to right, rgba(226, 232, 240, 0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(226, 232, 240, 0.4) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
          z-index: 1;
        }

        /* Large Cloud Sync Node (រត់តាមខ្សែ Network ខាងលើ - ធំ & ច្បាស់) */
        .cloud-node-runner {
          position: absolute;
          top: 0;
          left: 0;
          width: 60px;
          height: 60px;
          offset-path: path("M -80,160 C 350,40 600,340 1000,160 C 1400,-10 1650,360 2080,180");
          offset-rotate: auto;
          animation: moveCloudPacket 16s linear infinite;
          z-index: 4;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 4px 10px rgba(37, 99, 235, 0.25));
        }

        /* Large Server Cluster Node (រត់តាមខ្សែ Server Bus ខាងក្រោម - ធំ & ច្បាស់) */
        .server-node-runner {
          position: absolute;
          top: 0;
          left: 0;
          width: 60px;
          height: 60px;
          offset-path: path("M -80,720 C 400,500 750,800 1200,600 C 1550,400 1800,740 2180,560");
          offset-rotate: auto;
          animation: moveServerPacket 20s linear infinite;
          z-index: 4;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 4px 10px rgba(99, 102, 241, 0.25));
        }

        /* Cloud Architect / Super Admin Figure */
        .admin-person-node {
          position: absolute;
          z-index: 3;
          pointer-events: none;
          animation: personBounce 1.2s ease-in-out infinite;
          filter: drop-shadow(0 4px 10px rgba(0,0,0,0.13));
        }

        .person-leg-l {
          animation: legSwingL 0.6s ease-in-out infinite;
          transform-origin: top center;
        }

        .person-leg-r {
          animation: legSwingR 0.6s ease-in-out infinite;
          transform-origin: top center;
        }

        .person-arm-l {
          animation: armSwingL 0.6s ease-in-out infinite;
          transform-origin: top center;
        }

        .person-arm-r {
          animation: armSwingR 0.6s ease-in-out infinite;
          transform-origin: top center;
        }

        .server-pulse-point {
          position: absolute;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #2563eb;
          z-index: 2;
          pointer-events: none;
        }

        .server-pulse-point::after {
          content: '';
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          border: 2px solid #60a5fa;
          animation: cloudServerPulse 2.2s ease-out infinite;
        }

        .saas-clean-card {
          width: 100%;
          max-width: 430px;
          background: #ffffff;
          border-radius: 24px;
          padding: 42px 36px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 20px 45px -10px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02);
          position: relative;
          z-index: 10;
        }
      `}</style>

      {/* 1. SaaS Cloud Infrastructure Grid Background */}
      <div className="saas-grid-pattern" />

      {/* 2. SaaS Cloud & Server Highway Vector Lines */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 2,
        }}
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
      >
        {/* Top Cloud Highway Path */}
        <path
          d="M -80,160 C 350,40 600,340 1000,160 C 1400,-10 1650,360 2080,180"
          fill="none"
          stroke="rgba(37, 99, 235, 0.32)"
          strokeWidth="3.5"
          strokeDasharray="9,11"
          style={{ animation: 'networkFlow 2.2s linear infinite' }}
        />

        {/* Bottom Server Bus Network Path */}
        <path
          d="M -80,720 C 400,500 750,800 1200,600 C 1550,400 1800,740 2180,560"
          fill="none"
          stroke="rgba(99, 102, 241, 0.32)"
          strokeWidth="3.5"
          strokeDasharray="11,13"
          style={{ animation: 'networkFlow 2.8s linear infinite' }}
        />
      </svg>

      {/* 3. Large Cloud Sync Hub (ធំ & ច្បាស់) */}
      <div className="cloud-node-runner">
        <div
          style={{
            background: '#ffffff',
            borderRadius: 18,
            padding: 8,
            border: '2px solid #3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
          }}
        >
          <SaasCloudIcon size={34} />
        </div>
      </div>

      {/* 4. Large Datacenter Server Node (ធំ & ច្បាស់) */}
      <div className="server-node-runner">
        <div
          style={{
            background: '#ffffff',
            borderRadius: 18,
            padding: 8,
            border: '2px solid #6366f1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
          }}
        >
          <MdDns size={32} color="#6366f1" />
        </div>
      </div>

      {/* 5. Cloud Platform Engineer / Super Admin (មនុស្សគ្រប់គ្រងប្រព័ន្ធ) */}

      {/* Admin 1: Cloud Architect (top right) - blue suit + laptop */}
      <div className="admin-person-node" style={{ top: '115px', right: '13%' }}>
        <svg width="50" height="66" viewBox="0 0 32 44" fill="none">
          {/* Head */}
          <circle cx="16" cy="7" r="5.5" fill="#1e3a8a" />
          {/* Glasses */}
          <rect x="11" y="6" width="4" height="2.5" rx="1" fill="none" stroke="#38bdf8" strokeWidth="0.8" />
          <rect x="17" y="6" width="4" height="2.5" rx="1" fill="none" stroke="#38bdf8" strokeWidth="0.8" />
          <path d="M15 7.2H17" stroke="#38bdf8" strokeWidth="0.6" />
          {/* Body - suit */}
          <path d="M10 15C10 13 13 12.5 16 12.5C19 12.5 22 13 22 15L23 26H9L10 15Z" fill="#1e3a8a" />
          {/* Tie */}
          <path d="M15.5 13L16 22L16.5 13Z" fill="#38bdf8" />
          {/* Laptop in hands */}
          <rect x="8" y="18" width="13" height="9" rx="1.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
          <rect x="9.5" y="19.5" width="10" height="6" rx="0.5" fill="#1d4ed8" />
          <path d="M11 22H17M11 24H15" stroke="#60a5fa" strokeWidth="0.8" strokeLinecap="round" />
          {/* Left arm holding laptop */}
          <path d="M10 16L8 20" stroke="#1e3a8a" strokeWidth="2.5" strokeLinecap="round" />
          {/* Right arm */}
          <g className="person-arm-r">
            <path d="M22 16L26 21" stroke="#1e3a8a" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          {/* Left leg */}
          <g className="person-leg-l">
            <path d="M13 26L11 38" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M11 38L8 41" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
          </g>
          {/* Right leg */}
          <g className="person-leg-r">
            <path d="M19 26L21 38" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M21 38L24 41" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
          </g>
        </svg>
      </div>

      {/* Admin 2: DevOps Engineer (bottom left) - green hoodie + server rack */}
      <div className="admin-person-node" style={{ bottom: '135px', left: '11%', animationDelay: '-0.6s' }}>
        <svg width="50" height="66" viewBox="0 0 32 44" fill="none">
          {/* Head */}
          <circle cx="16" cy="7" r="5.5" fill="#0f172a" />
          {/* Hoodie */}
          <path d="M10.5 6C10.5 3 13 1 16 1C19 1 21.5 3 21.5 6H10.5Z" fill="#059669" />
          {/* Body */}
          <path d="M10 15C10 13 13 12.5 16 12.5C19 12.5 21 13 21 15L22 26H10L10 15Z" fill="#059669" />
          {/* Server rack tablet */}
          <rect x="3" y="15" width="8" height="11" rx="1.5" fill="#0f172a" stroke="#34d399" strokeWidth="1" />
          <rect x="4.5" y="17" width="5" height="1.5" rx="0.5" fill="#34d399" />
          <rect x="4.5" y="20" width="5" height="1.5" rx="0.5" fill="#6ee7b7" />
          <rect x="4.5" y="23" width="3" height="1.5" rx="0.5" fill="#34d399" />
          {/* Left arm holding rack */}
          <path d="M10 16L7 19" stroke="#065f46" strokeWidth="2.5" strokeLinecap="round" />
          {/* Right arm swings */}
          <g className="person-arm-r">
            <path d="M22 15L26 21" stroke="#065f46" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          {/* Left leg */}
          <g className="person-leg-l" style={{ animationDelay: '0.3s' }}>
            <path d="M13 26L11 38" stroke="#1e293b" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M11 38L8 41" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
          </g>
          {/* Right leg */}
          <g className="person-leg-r" style={{ animationDelay: '0.3s' }}>
            <path d="M19 26L21 38" stroke="#1e293b" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M21 38L24 41" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
          </g>
        </svg>
      </div>

      {/* Admin 3: Security Engineer (bottom right) - purple + shield */}
      <div className="admin-person-node" style={{ bottom: '175px', right: '9%', animationDelay: '-1.1s' }}>
        <svg width="44" height="58" viewBox="0 0 32 44" fill="none">
          <circle cx="16" cy="7" r="5" fill="#4c1d95" />
          <path d="M10.5 6C10.5 3.5 13 1.5 16 1.5C19 1.5 21.5 3.5 21.5 6H10.5Z" fill="#7c3aed" />
          <path d="M11 15C11 13 13.5 12.5 16 12.5C18.5 12.5 21 13 21 15L22.5 26H9.5L11 15Z" fill="#6d28d9" />
          {/* Shield badge */}
          <path d="M14 17C14 17 16 15.5 18 17V21C18 22.5 16 23.5 16 23.5C16 23.5 14 22.5 14 21V17Z" fill="#a78bfa" stroke="#7c3aed" strokeWidth="0.8" />
          <path d="M15.5 19.5L16.5 20.5L18 18.5" stroke="#ffffff" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
          <g className="person-arm-l">
            <path d="M11 16L7 22" stroke="#4c1d95" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <g className="person-arm-r">
            <path d="M21 15L25 20" stroke="#4c1d95" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <g className="person-leg-l">
            <path d="M13 26L11 38" stroke="#2e1065" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M11 38L8 41" stroke="#2e1065" strokeWidth="2" strokeLinecap="round" />
          </g>
          <g className="person-leg-r">
            <path d="M19 26L21 38" stroke="#2e1065" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M21 38L24 41" stroke="#2e1065" strokeWidth="2" strokeLinecap="round" />
          </g>
        </svg>
      </div>

      {/* 6. Cloud Server Pulse Nodes */}
      <div className="server-pulse-point" style={{ top: '160px', left: '18%' }} />
      <div className="server-pulse-point" style={{ top: '160px', right: '20%' }} />
      <div className="server-pulse-point" style={{ bottom: '260px', left: '22%', background: '#6366f1' }} />
      <div className="server-pulse-point" style={{ bottom: '200px', right: '18%', background: '#6366f1' }} />

      {/* 7. Top Right Flag Switcher */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: 3,
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
        }}
      >
        <button
          type="button"
          onClick={() => setLang('km')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 9,
            border: 'none',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
            background: lang === 'km' ? '#2b529a' : 'transparent',
            color: lang === 'km' ? '#ffffff' : '#64748b',
            transition: 'all 0.15s ease',
          }}
        >
          <FlagKm size={18} />
          <span>ខ្មែរ</span>
        </button>
        <button
          type="button"
          onClick={() => setLang('en')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 9,
            border: 'none',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
            background: lang === 'en' ? '#2b529a' : 'transparent',
            color: lang === 'en' ? '#ffffff' : '#64748b',
            transition: 'all 0.15s ease',
          }}
        >
          <FlagEn size={18} />
          <span>EN</span>
        </button>
      </div>

      {/* 8. Clean Centered SaaS Admin Card */}
      <div className="saas-clean-card">
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: 22,
              background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #4f8ef7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 10px 28px rgba(37, 99, 235, 0.32)',
              border: '2.5px solid rgba(255, 255, 255, 0.85)',
            }}
          >
            {/* Custom SVG SaaS Cloud + Server Network Icon */}
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Cloud shape */}
              <path
                d="M44 28C44 28 44.5 27.2 44.5 26C44.5 22.1 41.4 19 37.5 19C36.9 19 36.3 19.1 35.7 19.3C34.4 16.2 31.3 14 27.7 14C22.7 14 18.7 18 18.7 23C18.7 23.3 18.7 23.6 18.8 23.9C17.1 24.6 16 26.3 16 28.2C16 30.9 18.2 33 20.9 33H43C43 33 44 30.8 44 28Z"
                fill="white"
                fillOpacity="0.95"
              />
              {/* Server rack body */}
              <rect x="21" y="35" width="18" height="13" rx="2" fill="white" fillOpacity="0.85" />
              <rect x="23" y="37" width="14" height="2.5" rx="1" fill="#2563eb" />
              <rect x="23" y="41" width="14" height="2.5" rx="1" fill="#3b82f6" />
              <rect x="23" y="45" width="10" height="2.5" rx="1" fill="#60a5fa" />
              {/* LED dots on server */}
              <circle cx="35" cy="38.2" r="1" fill="#34d399" />
              <circle cx="35" cy="42.2" r="1" fill="#fbbf24" />
              {/* Connection lines from cloud to server */}
              <path d="M30 33V35" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              {/* Side network nodes */}
              <circle cx="12" cy="38" r="3" fill="white" fillOpacity="0.7" />
              <path d="M15 38H21" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7" />
              <circle cx="48" cy="38" r="3" fill="white" fillOpacity="0.7" />
              <path d="M39 38H45" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7" />
              {/* Top wifi/signal arcs on cloud */}
              <path d="M26 22C26 22 27.5 20.5 30 20.5C32.5 20.5 34 22 34 22" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M28 24.5C28 24.5 29 23.5 30 23.5C31 23.5 32 24.5 32 24.5" stroke="#bfdbfe" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </div>

          <h1
            style={{
              fontSize: 27,
              fontWeight: 900,
              color: '#0f172a',
              margin: '0 0 6px',
              letterSpacing: '-0.4px',
            }}
          >
            EBS Master SaaS
          </h1>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 12px',
              borderRadius: 20,
              background: '#eff6ff',
              color: '#2563eb',
              fontSize: 11.5,
              fontWeight: 800,
              border: '1px solid #bfdbfe',
              marginBottom: 6,
            }}
          >
            <MdSecurity size={13} />
            <span>Platform Super Admin</span>
          </div>

          <p style={{ fontSize: 13, color: '#64748b', margin: 0, fontWeight: 500 }}>
            {tr('ផ្ទាំងចូលគ្រប់គ្រង SaaS Platform Master Admin', 'Login portal for SaaS Platform Master Admin')}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '10px 12px',
              borderRadius: 12,
              fontSize: 12.5,
              fontWeight: 600,
              marginBottom: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleLogin}>
          {/* Email */}
          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13.5,
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: 7,
              }}
            >
              {tr('អ៊ីមែល', 'Email')}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <MdEmail
                size={19}
                color="#94a3b8"
                style={{ position: 'absolute', left: 14, pointerEvents: 'none' }}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={tr('បញ្ចូលអ៊ីមែល', 'Enter email')}
                style={{
                  width: '100%',
                  padding: '13px 16px 13px 44px',
                  borderRadius: 14,
                  border: '1.5px solid #e2e8f0',
                  background: '#f8fafc',
                  fontSize: 14.5,
                  fontWeight: 500,
                  color: '#0f172a',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#2563eb';
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.background = '#f8fafc';
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13.5,
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: 7,
              }}
            >
              {tr('ពាក្យសម្ងាត់', 'Password')}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <MdLock
                size={19}
                color="#94a3b8"
                style={{ position: 'absolute', left: 14, pointerEvents: 'none' }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '13px 44px 13px 44px',
                  borderRadius: 14,
                  border: '1.5px solid #e2e8f0',
                  background: '#f8fafc',
                  fontSize: 14.5,
                  fontWeight: 500,
                  color: '#0f172a',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#2563eb';
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.background = '#f8fafc';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 14,
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13.5px 20px',
              borderRadius: 14,
              border: 'none',
              background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
              color: '#ffffff',
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.28)',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.8 : 1,
            }}
          >
            <span>{loading ? tr('កំពុងផ្ទៀងផ្ទាត់...', 'Authenticating...') : tr('ចូលប្រើប្រាស់', 'Sign In')}</span>
          </button>
        </form>

        {/* Footer */}
        <div
          style={{
            marginTop: 26,
            textAlign: 'center',
            fontSize: 12,
            color: '#94a3b8',
            fontWeight: 500,
          }}
        >
          EBS Express • SaaS Cloud Infrastructure
        </div>
      </div>
    </div>
  );
}
