'use/client';
// wait, Next.js 'use client' directive
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, isAuthenticated, clearAuth } from '@/lib/auth';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdAccountBalanceWallet,
  MdAssignment,
  MdCheckCircle,
  MdError,
  MdLocalShipping,
  MdLogout,
  MdRefresh,
  MdFormatListBulleted
} from 'react-icons/md';

const dashboardTranslations = {
  en: {
    welcome: 'Hello',
    subtitle: 'Track your packages and earnings today',
    walletTitle: 'Collected COD Wallets',
    walletDesc: 'Cash collected pending handover to company',
    statsTitle: 'My Statistics',
    totalPackage: 'Total Packages',
    pickupRequest: 'Pending Pickups',
    pickedUpWaiting: 'Picked Up (Waiting Hub)',
    broughtToHub: 'Brought to Warehouse',
    assignedParcels: 'Assigned Parcels',
    totalSuccessful: 'Successful Deliveries',
    totalProblem: 'Problem / Failed',
    totalReturn: 'Returned Packages',
    activeTasksBtn: 'Go to Tasks',
    logout: 'Log Out',
    loading: 'Loading dashboard...',
  },
  km: {
    welcome: 'សួស្តី',
    subtitle: 'តាមដានកញ្ចប់អីវ៉ាន់ និងចំណូលរបស់អ្នកនៅថ្ងៃនេះ',
    walletTitle: 'កាបូបប្រាក់ COD ដែលប្រមូលបាន',
    walletDesc: 'ប្រាក់សុទ្ធដែលប្រមូលបាន រង់ចាំការប្រគល់ជូនក្រុមហ៊ុន',
    statsTitle: 'ស្ថិតិរបស់ខ្ញុំ',
    totalPackage: 'កញ្ចប់អីវ៉ាន់សរុប',
    pickupRequest: 'រង់ចាំទទួល',
    pickedUpWaiting: 'ប្រមូលបាន (រង់ចាំការស្កេន)',
    broughtToHub: 'បាននាំចូលឃ្លាំង',
    assignedParcels: 'បានចាត់តាំង',
    totalSuccessful: 'ដឹកជញ្ជូនជោគជ័យ',
    totalProblem: 'មានបញ្ហា / បរាជ័យ',
    totalReturn: 'កញ្ចប់អីវ៉ាន់ត្រឡប់មកវិញ',
    activeTasksBtn: 'ទៅកាន់ភារកិច្ច',
    logout: 'ចាកចេញ',
    loading: 'កំពុងផ្ទុកផ្ទាំងគ្រប់គ្រង...',
  }
};

export default function DriverDashboardPage() {
  const router = useRouter();
  const { lang, t: tGlobal } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const t = dashboardTranslations[lang] || dashboardTranslations['en'];

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/driver/login');
      return;
    }
    const user = getUser();
    if (user?.role !== 'driver') {
      router.push('/driver/login');
      return;
    }
    setDriver(user);

    const loadDashboard = async () => {
      try {
        const res = await api.get('/mobile/driver/dashboard');
        setData(res.data);
      } catch (err) {
        console.error('Failed to load driver dashboard', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push('/driver/login');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        backgroundColor: '#f8fafc',
        padding: '24px'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid rgba(47, 85, 165, 0.1)',
          borderTopColor: '#2f55a5',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '12px'
        }} />
        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>{t.loading}</span>
        <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
      </div>
    );
  }

  const khrBalance = data?.wallets?.find((w: any) => w.currency === 'KHR')?.balance || 0;
  const usdBalance = data?.wallets?.find((w: any) => w.currency === 'USD')?.balance || 0;
  const stats = data?.statistics || {};

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
      backgroundColor: '#f8fafc',
      flex: 1
    }}>
      {/* Header Profile / Welcome */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {t.welcome},
          </span>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '2px 0 0' }}>
            {driver?.name}
          </h2>
          <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 0' }}>
            {t.subtitle}
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            color: '#ef4444',
            padding: '10px',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s'
          }}
          title={t.logout}
        >
          <MdLogout size={18} />
        </button>
      </div>

      {/* COD Handover Wallets */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <MdAccountBalanceWallet size={20} style={{ color: '#2f55a5' }} />
          <h3 style={{ fontSize: '14.5px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
            {t.walletTitle}
          </h3>
        </div>
        <p style={{ fontSize: '11.5px', color: '#64748b', margin: '0 0 16px' }}>
          {t.walletDesc}
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #2f55a5, #4f46e5)',
            borderRadius: '16px',
            padding: '16px',
            color: '#ffffff',
            boxShadow: '0 10px 15px -3px rgba(47, 85, 165, 0.15)'
          }}>
            <span style={{ fontSize: '10.5px', opacity: '0.8', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>USD Wallet</span>
            <div style={{ fontSize: '18px', fontWeight: '800', marginTop: '6px' }}>
              ${usdBalance.toFixed(2)}
            </div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #f16222, #f97316)',
            borderRadius: '16px',
            padding: '16px',
            color: '#ffffff',
            boxShadow: '0 10px 15px -3px rgba(241, 98, 34, 0.15)'
          }}>
            <span style={{ fontSize: '10.5px', opacity: '0.8', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>KHR Wallet</span>
            <div style={{ fontSize: '18px', fontWeight: '800', marginTop: '6px' }}>
              {khrBalance.toLocaleString()} ៛
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '14px' }}>
        {t.statsTitle}
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '24px'
      }}>
        {/* Total packages */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: '#eef2fa',
            color: '#2f55a5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MdAssignment size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{t.totalPackage}</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{stats.totalPackage ?? 0}</div>
          </div>
        </div>

        {/* Successful Deliveries */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: '#ecfdf5',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MdCheckCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{t.totalSuccessful}</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{stats.totalSuccessful ?? 0}</div>
          </div>
        </div>

        {/* Assigned */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: '#f5f3ff',
            color: '#8b5cf6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MdLocalShipping size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{t.assignedParcels}</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{stats.assignedParcels ?? 0}</div>
          </div>
        </div>

        {/* Pending Pickups */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: '#fef4ef',
            color: '#f16222',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MdLocalShipping size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{t.pickupRequest}</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{stats.pickupRequest ?? 0}</div>
          </div>
        </div>

        {/* Picked Up (Waiting Hub) */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: '#fffbeb',
            color: '#d97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MdLocalShipping size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{t.pickedUpWaiting}</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{stats.pickedUpWaiting ?? 0}</div>
          </div>
        </div>

        {/* Brought to Warehouse */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: '#f0fdfa',
            color: '#0d9488',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MdCheckCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{t.broughtToHub}</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{stats.broughtToHub ?? 0}</div>
          </div>
        </div>

        {/* Problem/Failed */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: '#fef2f2',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MdError size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{t.totalProblem}</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{stats.totalProblem ?? 0}</div>
          </div>
        </div>

        {/* Returns */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: '#f3f4f6',
            color: '#6b7280',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MdRefresh size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{t.totalReturn}</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{stats.totalReturn ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <button
        onClick={() => router.push('/driver/tasks')}
        style={{
          background: '#2f55a5',
          color: '#ffffff',
          padding: '16px',
          borderRadius: '16px',
          fontSize: '15px',
          fontWeight: '700',
          border: 'none',
          cursor: 'pointer',
          width: '100%',
          boxShadow: '0 4px 12px rgba(47, 85, 165, 0.15)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <MdFormatListBulleted size={20} />
        {t.activeTasksBtn}
      </button>
    </div>
  );
}
