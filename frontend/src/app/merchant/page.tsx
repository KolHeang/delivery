'use/client';
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, isAuthenticated } from '@/lib/auth';

export default function MerchantRootPage() {
  const router = useRouter();

  useEffect(() => {
    const isAuth = isAuthenticated();
    const user = getUser();
    if (isAuth && user?.role === 'merchant') {
      router.replace('/merchant/dashboard');
    } else {
      router.replace('/merchant/login');
    }
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#ffffff'
    }}>
      <div className="spinner" style={{
        width: '32px',
        height: '32px',
        border: '3px solid rgba(47, 85, 165, 0.1)',
        borderTopColor: '#2f55a5',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
    </div>
  );
}
