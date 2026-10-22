'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';
import { FlagKm, FlagEn } from '@/components/ui/Flags';
import { SaasCloudIcon } from '@/components/ui/SaasCloudIcon';
import { getUser, clearAuth } from '@/lib/auth';
import {
  MdDashboard,
  MdBusiness,
  MdReceiptLong,
  MdPayment,
  MdGroup,
  MdWorkspacePremium,
  MdLocalOffer,
  MdAttachMoney,
  MdLogout,
  MdKeyboardArrowDown,
} from 'react-icons/md';

export interface SaasMasterLayoutProps {
  activeTab: 'dashboard' | 'tenants' | 'invoices' | 'payment-options' | 'users' | 'plans' | 'coupons' | 'partners';
  children: React.ReactNode;
}

export function SaasMasterLayout({ activeTab, children }: SaasMasterLayoutProps) {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const tr = (km: string, en: string) => (lang === 'km' ? km : en);

  const [user, setUser] = useState<any>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  useEffect(() => {
    const u = getUser();
    setUser(u);
  }, []);

  const handleLogout = () => {
    clearAuth();
    router.push('/admin/saas/login');
  };

  const navItems = [
    { key: 'dashboard', label: tr('ផ្ទាំងគ្រប់គ្រង', 'Dashboard'), href: '/admin/saas', icon: MdDashboard },
    { key: 'tenants', label: tr('ក្រុមហ៊ុនទាំងអស់', 'All Companies'), href: '/admin/saas/tenants', icon: MdBusiness },
    { key: 'invoices', label: tr('ប្រវត្តិវិក្កយបត្រ', 'Billing Invoices'), href: '/admin/saas/invoices', icon: MdReceiptLong },
    { key: 'payment-options', label: tr('ជម្រើសទូទាត់', 'Payment Options'), href: '/admin/saas/payment-options', icon: MdPayment },
    { key: 'users', label: tr('គណនី SaaS Admins', 'SaaS Admins'), href: '/admin/saas/users', icon: MdGroup },
    { key: 'plans', label: tr('កញ្ចប់សេវា', 'Subscription Plans'), href: '/admin/saas/plans', icon: MdWorkspacePremium },
    { key: 'coupons', label: tr('គូប៉ុងបញ្ចុះតម្លៃ', 'Promo Coupons'), href: '/admin/saas/coupons', icon: MdLocalOffer },
    { key: 'partners', label: tr('ដៃគូសហការ', 'Affiliate Partners'), href: '/admin/saas/partners', icon: MdAttachMoney },
  ];

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#f8fafc',
        fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
      }}
    >
      {/* 1. DEDICATED SAAS MASTER SIDEBAR */}
      <aside
        style={{
          width: 260,
          minWidth: 260,
          background: '#2b529a',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 90,
          boxShadow: '4px 0 20px rgba(0,0,0,0.1)',
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            height: 64,
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderBottom: '1px solid rgba(255,255,255,0.12)',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
              padding: 2,
              boxSizing: 'border-box',
              flexShrink: 0,
            }}
          >
            <SaasCloudIcon size={34} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.2px', lineHeight: 1.2 }}>
              EBS Master SaaS
            </div>
            <div style={{ fontSize: 10.5, color: '#93c5fd', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ● {tr('ផ្ទាំងគ្រប់គ្រង SUPER ADMIN', 'SUPER ADMIN PORTAL')}
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#93c5fd', padding: '8px 12px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            {tr('ម៉ឺនុយមេ', 'Main Menu')}
          </div>

          {navItems.map((item) => {
            const isActive = activeTab === item.key;
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '11px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: isActive ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: isActive ? 900 : 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  textDecoration: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.15s',
                  borderLeft: isActive ? '4px solid #ffffff' : '4px solid transparent',
                }}
              >
                <Icon size={20} color={isActive ? '#ffffff' : '#bfdbfe'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA WITH UNIFIED TOPBAR */}
      <div
        style={{
          flex: 1,
          marginLeft: 260,
          minWidth: 0,
          maxWidth: 'calc(100vw - 260px)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          overflowX: 'hidden',
        }}
      >
        {/* Unified Topbar */}
        <header
          style={{
            height: 64,
            background: '#2b529a',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            padding: '0 28px',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 80,
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Language Switcher */}
            <button
              onClick={() => setLang(lang === 'en' ? 'km' : 'en')}
              title={tr('ប្តូរភាសា (Switch Language)', 'Switch Language')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                height: 38,
                padding: '0 14px',
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.25)',
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {lang === 'km' ? (
                <>
                  <FlagKm size={22} />
                  <span>ភាសាខ្មែរ</span>
                </>
              ) : (
                <>
                  <FlagEn size={22} />
                  <span>English</span>
                </>
              )}
            </button>

            {/* User Profile Dropdown */}
            <div style={{ position: 'relative', paddingLeft: 14, borderLeft: '1px solid rgba(255, 255, 255, 0.2)' }}>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: showProfileDropdown ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 12,
                  padding: '6px 12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: 14,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  }}
                >
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'M'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
                    {user?.name || 'Master Super Admin'}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#93c5fd', lineHeight: 1.1 }}>
                    {user?.email || 'superadmin@gmail.com'}
                  </div>
                </div>
                <MdKeyboardArrowDown size={18} color="#bfdbfe" />
              </button>

              {showProfileDropdown && (
                <>
                  <div
                    onClick={() => setShowProfileDropdown(false)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      width: 250,
                      background: '#ffffff',
                      borderRadius: 16,
                      boxShadow: '0 14px 35px -4px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.08)',
                      border: '1px solid #e2e8f0',
                      padding: '8px',
                      zIndex: 95,
                    }}
                  >
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: 13.5, fontWeight: 900, color: '#0f172a' }}>{user?.name || 'Admin User'}</div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>{user?.email || 'admin@gmail.com'}</div>
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: 6,
                          background: '#eff6ff',
                          color: '#2563eb',
                          fontSize: 10.5,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 6,
                        }}
                      >
                        👑 Super Administrator
                      </span>
                    </div>

                    <div style={{ padding: '6px 0' }}>
                      <button
                        onClick={handleLogout}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 10,
                          border: 'none',
                          background: 'transparent',
                          color: '#ef4444',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <MdLogout size={16} color="#ef4444" />
                        <span>{tr('ចាកចេញពីប្រព័ន្ធ', 'Sign Out')}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Body */}
        <main style={{ flex: 1, padding: '24px 28px', minWidth: 0, overflowX: 'hidden' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
