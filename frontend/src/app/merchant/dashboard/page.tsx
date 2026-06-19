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
  MdAdd,
  MdFormatListBulleted
} from 'react-icons/md';

const merchantDashboardTranslations = {
  en: {
    welcome: 'Welcome Shop',
    subtitle: 'Manage your parcel shipments & finances',
    balanceTitle: 'Current Account Balance',
    balanceDesc: 'Pending payout/disbursement balance',
    statsTitle: 'Parcels Statistics',
    totalParcel: 'Total Parcels',
    totalDelivered: 'Delivered Packages',
    totalTransit: 'In Transit / Pending',
    totalReturn: 'Returned Packages',
    createOrderBtn: 'Create New Parcel',
    viewOrdersBtn: 'View My Orders',
    logout: 'Log Out',
    loading: 'Loading dashboard...',
  },
  km: {
    welcome: 'សូមស្វាគមន៍ ហាង',
    subtitle: 'គ្រប់គ្រងការផ្ញើកញ្ចប់អីវ៉ាន់ និងហិរញ្ញវត្ថុរបស់អ្នក',
    balanceTitle: 'សមតុល្យគណនីបច្ចុប្បន្ន',
    balanceDesc: 'សមតុល្យទឹកប្រាក់ដែលអាចដកបាន',
    statsTitle: 'ស្ថិតិកញ្ចប់អីវ៉ាន់',
    totalParcel: 'កញ្ចប់អីវ៉ាន់សរុប',
    totalDelivered: 'ដឹកជញ្ជូនជោគជ័យ',
    totalTransit: 'កំពុងដឹកជញ្ជូន / រង់ចាំ',
    totalReturn: 'កញ្ចប់អីវ៉ាន់ត្រឡប់មកវិញ',
    createOrderBtn: 'បង្កើតការផ្ញើថ្មី',
    viewOrdersBtn: 'មើលការផ្ញើរបស់ខ្ញុំ',
    logout: 'ចាកចេញ',
    loading: 'កំពុងផ្ទុកផ្ទាំងគ្រប់គ្រង...',
  }
};

export default function MerchantDashboardPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const t = merchantDashboardTranslations[lang] || merchantDashboardTranslations['en'];

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/merchant/login');
      return;
    }
    const user = getUser();
    if (user?.role !== 'merchant') {
      router.push('/merchant/login');
      return;
    }
    setMerchant(user);

    const loadDashboard = async () => {
      try {
        const res = await api.get('/mobile/merchant/dashboard');
        setData(res.data);
      } catch (err) {
        console.error('Failed to load merchant dashboard', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push('/merchant/login');
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
          border: '3px solid rgba(16, 185, 129, 0.1)',
          borderTopColor: '#10b981',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '12px'
        }} />
        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>{t.loading}</span>
        <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
      </div>
    );
  }

  const balanceAmount = data?.balance?.amount || 0;
  const balanceCurrency = data?.balance?.currency || 'USD';
  const stats = data?.statistics || {};

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
      backgroundColor: '#f8fafc',
      flex: 1
    }}>
      {/* Welcome Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {t.welcome},
          </span>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '2px 0 0' }}>
            {merchant?.name}
          </h2>
          <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 0', lineHeight: 1.3 }}>
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

      {/* Wallet Balance Card */}
      <div style={{
        background: 'linear-gradient(135deg, #10b981, #057857)',
        borderRadius: '20px',
        padding: '20px',
        color: '#ffffff',
        boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.2)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <MdAccountBalanceWallet size={20} style={{ opacity: '0.9' }} />
          <span style={{ fontSize: '12.5px', fontWeight: '700', opacity: '0.9', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {t.balanceTitle}
          </span>
        </div>
        <div style={{ fontSize: '28px', fontWeight: '800', marginBottom: '6px' }}>
          {balanceCurrency === 'USD' ? `$${balanceAmount.toFixed(2)}` : `${balanceAmount.toLocaleString()} ៛`}
        </div>
        <div style={{ fontSize: '11px', opacity: '0.8', fontWeight: '500' }}>
          {t.balanceDesc}
        </div>
      </div>

      {/* Stats Section */}
      <h3 style={{ fontSize: '14.5px', fontWeight: '700', color: '#0f172a', marginBottom: '14px' }}>
        {t.statsTitle}
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '24px'
      }}>
        {/* Total Parcels */}
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
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{t.totalParcel}</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{stats.totalParcel ?? 0}</div>
          </div>
        </div>

        {/* Delivered packages */}
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
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{t.totalDelivered}</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{stats.totalDelivered ?? 0}</div>
          </div>
        </div>

        {/* In transit / Pending */}
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
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{t.totalTransit}</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{stats.totalTransit ?? 0}</div>
          </div>
        </div>

        {/* Returned packages */}
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
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{t.totalReturn}</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{stats.totalReturn ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button
          onClick={() => router.push('/merchant/orders/create')}
          style={{
            background: '#10b981',
            color: '#ffffff',
            padding: '15px',
            borderRadius: '16px',
            fontSize: '14.5px',
            fontWeight: '700',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <MdAdd size={20} />
          {t.createOrderBtn}
        </button>

        <button
          onClick={() => router.push('/merchant/orders')}
          style={{
            background: '#ffffff',
            color: '#10b981',
            border: '1.5px solid #a7f3d0',
            padding: '14px',
            borderRadius: '16px',
            fontSize: '14.5px',
            fontWeight: '700',
            cursor: 'pointer',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <MdFormatListBulleted size={20} />
          {t.viewOrdersBtn}
        </button>
      </div>
    </div>
  );
}
