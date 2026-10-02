'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser, isAuthenticated } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdFormatListBulleted,
  MdQrCodeScanner,
  MdCreditCard,
  MdGridView,
  MdPersonOutline
} from 'react-icons/md';

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    setMounted(true);
    const authStatus = isAuthenticated();
    const user = getUser();
    setIsAuth(authStatus && user?.role === 'driver');
  }, [pathname]);

  const tabLabels = {
    en: {
      dashboard: 'Home',
      tasks: 'Tasks',
      scanner: 'Scanner',
      payments: 'Payments',
      profile: 'Profile'
    },
    km: {
      dashboard: 'ទំព័រដើម',
      tasks: 'ភារកិច្ច',
      scanner: 'ម៉ាស៊ីនស្កេន',
      payments: 'ការទូទាត់',
      profile: 'ប្រវត្តិរូប'
    }
  };

  const labels = tabLabels[lang as 'en' | 'km'] || tabLabels.en;

  if (!mounted) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(4, 120, 87, 0.15)',
          borderTopColor: '#047857',
          borderRadius: '50%',
          animation: 'driverSpin 0.8s ease-in-out infinite'
        }} />
        <style dangerouslySetInnerHTML={{__html: `@keyframes driverSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
      </div>
    );
  }

  const isLoginPage = pathname === '/driver/login' || pathname === '/driver/auth';
  const isDetailPage = pathname.startsWith('/driver/tasks/') && pathname !== '/driver/tasks';
  const showBottomNav = !isLoginPage && !isDetailPage && isAuth;

  return (
    <div className="mobile-layout-container" style={{
      display: 'flex',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#e2e8f0',
      fontFamily: "'Kantumruy Pro', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      WebkitFontSmoothing: 'antialiased'
    }}>
      <div className="mobile-phone-frame" style={{
        width: '100%',
        maxWidth: '480px',
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: '0 20px 50px -10px rgba(15, 23, 42, 0.12)',
        paddingBottom: showBottomNav ? '76px' : '0'
      }}>
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>

        {/* Modern 4-Tab Bottom Navigation Bar matching Reference */}
        {showBottomNav && (
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '480px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.05)',
            zIndex: 100,
            padding: '8px 12px 12px',
          }}>
            <nav style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
            }}>
              {/* 1. Home */}
              <Link
                href="/driver/dashboard"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  color: pathname === '/driver/dashboard' ? '#1e60ff' : '#94a3b8',
                  gap: '4px',
                  flex: 1,
                  transition: 'color 0.2s ease',
                }}
              >
                <MdGridView size={24} style={{ color: pathname === '/driver/dashboard' ? '#1e60ff' : '#94a3b8' }} />
                <span style={{ fontSize: '11px', fontWeight: pathname === '/driver/dashboard' ? '700' : '500' }}>
                  {labels.dashboard}
                </span>
              </Link>

              {/* 2. Task */}
              <Link
                href="/driver/tasks"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  color: pathname.startsWith('/driver/tasks') ? '#1e60ff' : '#94a3b8',
                  gap: '4px',
                  flex: 1,
                  transition: 'color 0.2s ease',
                }}
              >
                <MdFormatListBulleted size={24} style={{ color: pathname.startsWith('/driver/tasks') ? '#1e60ff' : '#94a3b8' }} />
                <span style={{ fontSize: '11px', fontWeight: pathname.startsWith('/driver/tasks') ? '700' : '500' }}>
                  {labels.tasks}
                </span>
              </Link>

              {/* 3. Payment */}
              <Link
                href="/driver/payments"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  color: pathname.startsWith('/driver/payments') ? '#1e60ff' : '#94a3b8',
                  gap: '4px',
                  flex: 1,
                  transition: 'color 0.2s ease',
                }}
              >
                <MdCreditCard size={24} style={{ color: pathname.startsWith('/driver/payments') ? '#1e60ff' : '#94a3b8' }} />
                <span style={{ fontSize: '11px', fontWeight: pathname.startsWith('/driver/payments') ? '700' : '500' }}>
                  {labels.payments}
                </span>
              </Link>

              {/* 4. Profile */}
              <Link
                href="/driver/profile"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  color: pathname === '/driver/profile' ? '#1e60ff' : '#94a3b8',
                  gap: '4px',
                  flex: 1,
                  transition: 'color 0.2s ease',
                }}
              >
                <MdPersonOutline size={24} style={{ color: pathname === '/driver/profile' ? '#1e60ff' : '#94a3b8' }} />
                <span style={{ fontSize: '11px', fontWeight: pathname === '/driver/profile' ? '700' : '500' }}>
                  {labels.profile}
                </span>
              </Link>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
