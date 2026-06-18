'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser, isAuthenticated } from '@/lib/auth';
import { MdDashboard, MdFormatListBulleted, MdPerson } from 'react-icons/md';

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    setMounted(true);
    const authStatus = isAuthenticated();
    const user = getUser();
    setIsAuth(authStatus && user?.role === 'driver');
  }, [pathname]);

  // If loading client-side state
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
          border: '3px solid rgba(47, 85, 165, 0.1)',
          borderTopColor: '#2f55a5',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
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
      fontFamily: "'Kantumruy Pro', 'Inter', sans-serif"
    }}>
      <div className="mobile-phone-frame" style={{
        width: '100%',
        maxWidth: '480px',
        backgroundColor: '#ffffff',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: '0 0 24px rgba(15, 23, 42, 0.05)',
        borderLeft: '1px solid #e2e8f0',
        borderRight: '1px solid #e2e8f0',
        paddingBottom: (!isLoginPage && isAuth) ? '64px' : '0'
      }}>
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>

        {/* Bottom Tab Bar for Drivers */}
        {!isLoginPage && isAuth && (
          <nav className="mobile-bottom-tabs" style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '64px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            zIndex: 10,
            boxShadow: '0 -4px 12px rgba(15, 23, 42, 0.03)'
          }}>
            <Link href="/driver/dashboard" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              color: pathname === '/driver/dashboard' ? '#2f55a5' : '#64748b',
              gap: '4px',
              fontSize: '12px',
              fontWeight: pathname === '/driver/dashboard' ? '700' : '500',
              transition: 'color 0.2s ease',
              width: '33%'
            }}>
              <MdDashboard size={22} />
              <span>Dashboard</span>
            </Link>
            <Link href="/driver/tasks" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              color: pathname === '/driver/tasks' ? '#2f55a5' : '#64748b',
              gap: '4px',
              fontSize: '12px',
              fontWeight: pathname === '/driver/tasks' ? '700' : '500',
              transition: 'color 0.2s ease',
              width: '33%'
            }}>
              <MdFormatListBulleted size={22} />
              <span>Tasks</span>
            </Link>
            <Link href="/driver/profile" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              color: pathname === '/driver/profile' ? '#2f55a5' : '#64748b',
              gap: '4px',
              fontSize: '12px',
              fontWeight: pathname === '/driver/profile' ? '700' : '500',
              transition: 'color 0.2s ease',
              width: '33%'
            }}>
              <MdPerson size={22} />
              <span>Profile</span>
            </Link>
          </nav>
        )}
      </div>
    </div>
  );
}
