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
        paddingBottom: (!isLoginPage && isAuth) ? '76px' : '0'
      }}>
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>

        {/* Floating Bottom Navigation Bar with Center Curved Notch */}
        {!isLoginPage && isAuth && (
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '480px',
            zIndex: 100,
            pointerEvents: 'none'
          }}>
            {/* SVG Center Curved Notch Background */}
            <div style={{
              position: 'relative',
              width: '100%',
              pointerEvents: 'auto'
            }}>
              <svg
                viewBox="0 0 375 72"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '100%',
                  height: '76px',
                  filter: 'drop-shadow(0 -4px 16px rgba(0, 0, 0, 0.06))',
                  zIndex: 1
                }}
              >
                <path
                  d="M0 16C0 7.16344 7.16344 0 16 0H138C148.5 0 154 6.5 159 13.5C164.5 21.2 173.5 26 187.5 26C201.5 26 210.5 21.2 216 13.5C221 6.5 226.5 0 237 0H359C367.837 0 375 7.16344 375 16V72H0V16Z"
                  fill="#ffffff"
                />
              </svg>

              <nav style={{
                position: 'relative',
                zIndex: 2,
                height: '72px',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                padding: '0 8px 8px'
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
                    color: pathname === '/driver/dashboard' ? '#2563eb' : '#64748b',
                    gap: '3px',
                    flex: 1
                  }}
                >
                  <MdGridView size={22} />
                  <span style={{ fontSize: '11px', fontWeight: pathname === '/driver/dashboard' ? '800' : '600' }}>
                    {labels.dashboard}
                  </span>
                </Link>

                {/* 2. Tasks */}
                <Link
                  href="/driver/tasks"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    color: pathname.startsWith('/driver/tasks') ? '#2563eb' : '#64748b',
                    gap: '3px',
                    flex: 1
                  }}
                >
                  <MdFormatListBulleted size={23} />
                  <span style={{ fontSize: '11px', fontWeight: pathname.startsWith('/driver/tasks') ? '800' : '600' }}>
                    {labels.tasks}
                  </span>
                </Link>

                {/* 3. Scanner (Center Raised Button) */}
                <Link
                  href="/driver/tasks?scan=true"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    color: '#64748b',
                    gap: '2px',
                    flex: 1,
                    marginBottom: '10px'
                  }}
                >
                  <div style={{
                    width: '42px',
                    height: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b'
                  }}>
                    <MdQrCodeScanner size={28} />
                  </div>
                  <span style={{ fontSize: '10.5px', fontWeight: '600', marginTop: '-4px' }}>
                    {labels.scanner}
                  </span>
                </Link>

                {/* 4. Payments */}
                <Link
                  href="/driver/payments"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    color: pathname.startsWith('/driver/payments') ? '#2563eb' : '#64748b',
                    gap: '3px',
                    flex: 1
                  }}
                >
                  <MdCreditCard size={23} />
                  <span style={{ fontSize: '11px', fontWeight: pathname.startsWith('/driver/payments') ? '800' : '600' }}>
                    {labels.payments}
                  </span>
                </Link>

                {/* 5. Profile */}
                <Link
                  href="/driver/profile"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    color: pathname === '/driver/profile' ? '#2563eb' : '#64748b',
                    gap: '3px',
                    flex: 1
                  }}
                >
                  <MdPersonOutline size={23} />
                  <span style={{ fontSize: '11px', fontWeight: pathname === '/driver/profile' ? '800' : '600' }}>
                    {labels.profile}
                  </span>
                </Link>
              </nav>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
