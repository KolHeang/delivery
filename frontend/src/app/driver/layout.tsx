'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser, isAuthenticated } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdDashboard,
  MdFormatListBulleted,
  MdPerson,
  MdInventory2,
  MdQrCodeScanner
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

  // Tab translations
  const tabLabels = {
    en: {
      dashboard: 'Home',
      tasks: 'Tasks',
      scan: 'Scan QR',
      pickup: 'Pickup',
      profile: 'Profile'
    },
    km: {
      dashboard: 'ផ្ទាំងដើម',
      tasks: 'ភារកិច្ច',
      scan: 'ស្កែន QR',
      pickup: 'ទទួលអីវ៉ាន់',
      profile: 'គណនី'
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
      backgroundColor: '#f1f5f9',
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
        boxShadow: '0 20px 50px -10px rgba(15, 23, 42, 0.12), 0 0 1px rgba(15, 23, 42, 0.1)',
        borderLeft: '1px solid #e2e8f0',
        borderRight: '1px solid #e2e8f0',
        paddingBottom: (!isLoginPage && isAuth) ? '76px' : '0'
      }}>
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>

        {/* Floating Bottom Glassmorphism Navigation Bar */}
        {!isLoginPage && isAuth && (
          <nav className="mobile-bottom-tabs" style={{
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '480px',
            height: '74px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(226, 232, 240, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 100,
            boxShadow: '0 -6px 24px rgba(15, 23, 42, 0.08)',
            padding: '0 10px'
          }}>
            {/* 1. Home / Dashboard */}
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
                padding: '6px',
                flex: 1
              }}
            >
              <MdDashboard size={22} />
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
                padding: '6px',
                flex: 1
              }}
            >
              <MdFormatListBulleted size={22} />
              <span style={{ fontSize: '11px', fontWeight: pathname.startsWith('/driver/tasks') ? '800' : '600' }}>
                {labels.tasks}
              </span>
            </Link>



            {/* 4. Pickup */}
            <Link
              href="/driver/pickups"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                color: pathname.startsWith('/driver/pickups') ? '#2563eb' : '#64748b',
                gap: '3px',
                padding: '6px',
                flex: 1
              }}
            >
              <MdInventory2 size={22} />
              <span style={{ fontSize: '11px', fontWeight: pathname.startsWith('/driver/pickups') ? '800' : '600' }}>
                {labels.pickup}
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
                padding: '6px',
                flex: 1
              }}
            >
              <MdPerson size={22} />
              <span style={{ fontSize: '11px', fontWeight: pathname === '/driver/profile' ? '800' : '600' }}>
                {labels.profile}
              </span>
            </Link>
          </nav>
        )}
      </div>
    </div>
  );
}
