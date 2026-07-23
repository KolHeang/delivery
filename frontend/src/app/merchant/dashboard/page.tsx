'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, isAuthenticated, clearAuth } from '@/lib/auth';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdNotifications,
  MdLogout,
  MdAdd,
  MdFormatListBulleted,
  MdRefresh,
  MdLocalShipping
} from 'react-icons/md';

const merchantDashboardTranslations = {
  en: {
    welcome: 'Welcome Back',
    subtitle: 'Manage your parcel shipments & finances',
    balanceTitle: 'Current Account Balance',
    balanceDesc: 'Pending payout/disbursement balance',
    statsTitle: 'Parcels Statistics',
    totalParcel: 'Total Parcels',
    pendingPickup: 'Pending Pickup',
    pickedUpWaiting: 'Picked Up (Waiting Hub)',
    receivedAtWarehouse: 'Received at Hub',
    inTransit: 'Out for Delivery',
    totalDelivered: 'Delivered Packages',
    totalProblem: 'Problem / Failed',
    totalReturn: 'Returned Packages',
    createOrderBtn: 'Create New Parcel',
    viewOrdersBtn: 'View My Orders',
    pickupRequestsBtn: 'Request / View Pickups',
    logout: 'Log Out',
    loading: 'Loading dashboard...',
  },
  km: {
    welcome: 'សូមស្វាគមន៍ ហាងទំនិញ',
    subtitle: 'គ្រប់គ្រងការផ្ញើកញ្ចប់អីវ៉ាន់ និងហិរញ្ញវត្ថុរបស់អ្នក',
    balanceTitle: 'សមតុល្យគណនីបច្ចុប្បន្ន',
    balanceDesc: 'សមតុល្យទឹកប្រាក់ដែលអាចដកបាន',
    statsTitle: 'ស្ថិតិកញ្ចប់អីវ៉ាន់',
    totalParcel: 'កញ្ចប់អីវ៉ាន់សរុប',
    pendingPickup: 'រង់ចាំប្រមូល',
    pickedUpWaiting: 'ប្រមូលរួច - រង់ចាំស្កេន',
    receivedAtWarehouse: 'បានដល់ឃ្លាំង',
    inTransit: 'កំពុងដឹកជញ្ជូន',
    totalDelivered: 'ដឹកជញ្ជូនជោគជ័យ',
    totalProblem: 'មានបញ្ហា / បរាជ័យ',
    totalReturn: 'កញ្ចប់អីវ៉ាន់ត្រឡប់',
    createOrderBtn: 'បង្កើតការផ្ញើថ្មី',
    viewOrdersBtn: 'មើលការផ្ញើរបស់ខ្ញុំ',
    pickupRequestsBtn: 'ស្នើសុំ / មើលការទៅយកទំនិញ',
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

  const t = merchantDashboardTranslations[lang as 'en' | 'km'] || merchantDashboardTranslations.en;

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
    loadDashboard();
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push('/merchant/login');
  };

  const getInitials = (name: string) => {
    if (!name) return 'M';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
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
          border: '3px solid rgba(37, 99, 235, 0.1)',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '12px'
        }} />
        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>{t.loading}</span>
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
      minHeight: '100vh',
      backgroundColor: '#f4f7fc',
      fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
      paddingBottom: '28px',
      position: 'relative'
    }}>
      {/* Web Admin Royal Blue Gradient Top Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 60%, #3b82f6 100%)',
        padding: '16px 20px 28px',
        borderBottomLeftRadius: '32px',
        borderBottomRightRadius: '32px',
        color: '#ffffff',
        boxShadow: '0 12px 30px rgba(37, 99, 235, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Decorative Pattern */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 70%)',
          pointerEvents: 'none'
        }} />

        {/* Top Action Bar: Brand Logo & Notification Bell */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          {/* Brand Logo matching Web Admin 100% */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563eb, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
              color: '#ffffff',
              flexShrink: 0
            }}>
              📦
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '16px', fontWeight: '900', color: '#ffffff', letterSpacing: '0.4px', lineHeight: 1.1 }}>
                EBS<span style={{ color: '#93c5fd' }}>Express</span>
              </span>
              <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.8)', fontWeight: '700', marginTop: '2px' }}>
                MERCHANT PORTAL
              </span>
            </div>
          </div>

          {/* Notification Bell Button */}
          <button
            onClick={() => loadDashboard()}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.22)',
              border: '1.5px solid rgba(255, 255, 255, 0.4)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              position: 'relative'
            }}
            title="Refresh / Notifications"
          >
            <MdNotifications size={20} />
            <span style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              border: '1.5px solid #ffffff'
            }} />
          </button>
        </div>

        {/* Merchant Profile Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          marginBottom: '20px'
        }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            border: '2.5px solid rgba(255, 255, 255, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: '900',
            color: '#1d4ed8',
            boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            position: 'relative',
            flexShrink: 0
          }}>
            {merchant?.photo ? (
              <img
                src={merchant.photo.startsWith('http') || merchant.photo.startsWith('data:') ? merchant.photo : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/uploads/${merchant.photo}`}
                alt={merchant.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              getInitials(merchant?.name)
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '900',
                color: '#ffffff',
                margin: 0,
                letterSpacing: '-0.3px',
                lineHeight: 1.2
              }}>
                {merchant?.name || 'Shop Name'}
              </h2>

              <span style={{
                backgroundColor: 'rgba(245, 158, 11, 0.25)',
                color: '#fef3c7',
                fontSize: '10.5px',
                fontWeight: '800',
                padding: '2px 8px',
                borderRadius: '20px',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                letterSpacing: '0.3px'
              }}>
                🏪 ហាងទំនិញ
              </span>
            </div>

            <p style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.85)',
              margin: '3px 0 0',
              fontWeight: '500'
            }}>
              {t.subtitle}
            </p>
          </div>
        </div>

        {/* Wallet Balance Glassmorphic Card inside Header */}
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(12px)',
          borderRadius: '20px',
          padding: '16px 18px',
          border: '1px solid rgba(255, 255, 255, 0.28)',
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <span style={{
              fontSize: '11px',
              fontWeight: '800',
              color: 'rgba(255, 255, 255, 0.85)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {t.balanceTitle}
            </span>
            <div style={{
              fontSize: '26px',
              fontWeight: '900',
              color: '#ffffff',
              marginTop: '2px',
              letterSpacing: '-0.4px'
            }}>
              {balanceCurrency === 'USD' ? `$${balanceAmount.toFixed(2)}` : `${balanceAmount.toLocaleString()} ៛`}
            </div>
            <span style={{ fontSize: '10.5px', color: 'rgba(255, 255, 255, 0.75)', fontWeight: '600' }}>
              {t.balanceDesc}
            </span>
          </div>

          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <img src="/3d/3d_cash.png" alt="Cash" style={{ width: '38px', height: '38px', objectFit: 'contain' }} />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{
        padding: '0 16px',
        marginTop: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Quick Action Buttons matching Driver UI */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button
            onClick={() => router.push('/merchant/orders/create')}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              padding: '14px',
              borderRadius: '18px',
              fontSize: '13.5px',
              fontWeight: '800',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 6px 16px rgba(16, 185, 129, 0.25)'
            }}
          >
            <MdAdd size={20} />
            {t.createOrderBtn}
          </button>

          <button
            onClick={() => router.push('/merchant/pickups/create')}
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              padding: '14px',
              borderRadius: '18px',
              fontSize: '13.5px',
              fontWeight: '800',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 6px 16px rgba(37, 99, 235, 0.25)'
            }}
          >
            <MdLocalShipping size={20} />
            {t.pickupRequestsBtn}
          </button>
        </div>

        {/* View All Orders Banner */}
        <button
          onClick={() => router.push('/merchant/orders')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            padding: '14px 18px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#2563eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <MdFormatListBulleted size={20} />
            </div>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
              {t.viewOrdersBtn}
            </span>
          </div>
          <span style={{ fontSize: '12px', fontWeight: '800', color: '#2563eb' }}>
            →
          </span>
        </button>

        {/* Statistics Grid with Premium 3D Icons */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '22px',
          padding: '20px',
          boxShadow: '0 6px 20px rgba(15, 23, 42, 0.04)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '900', color: '#1e293b', margin: 0 }}>
              {t.statsTitle}
            </h3>
            <span style={{
              fontSize: '11px',
              color: '#2563eb',
              backgroundColor: '#eff6ff',
              padding: '4px 10px',
              borderRadius: '20px',
              fontWeight: '800'
            }}>
              📦 កញ្ចប់អីវ៉ាន់
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            {/* Total Parcels */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '16px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#eff6ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <img src="/3d/3d_box.png" alt="Box" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{t.totalParcel}</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>{stats.totalParcel ?? 0}</div>
              </div>
            </div>

            {/* Delivered packages */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '16px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#ecfdf5',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <img src="/3d/3d_check.png" alt="Check" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{t.totalDelivered}</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: '#16a34a', marginTop: '2px' }}>{stats.totalDelivered ?? 0}</div>
              </div>
            </div>

            {/* Pending Pickup */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '16px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#fff7ed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <img src="/3d/3d_shop.png" alt="Shop" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{t.pendingPickup}</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: '#ea580c', marginTop: '2px' }}>{stats.pendingPickup ?? 0}</div>
              </div>
            </div>

            {/* Picked Up (Waiting Hub) */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '16px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#fffbeb',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <img src="/3d/3d_truck.png" alt="Truck" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{t.pickedUpWaiting}</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: '#d97706', marginTop: '2px' }}>{stats.pickedUpWaiting ?? 0}</div>
              </div>
            </div>

            {/* Received at Hub */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '16px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#f0fdfa',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <img src="/3d/3d_dashboard.png" alt="Hub" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{t.receivedAtWarehouse}</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: '#0d9488', marginTop: '2px' }}>{stats.receivedAtWarehouse ?? 0}</div>
              </div>
            </div>

            {/* Out for Delivery */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '16px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#f5f3ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <img src="/3d/3d_scooter.png" alt="Delivery" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{t.inTransit}</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: '#7c3aed', marginTop: '2px' }}>{stats.inTransit ?? 0}</div>
              </div>
            </div>

            {/* Problem/Failed */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '16px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#fef2f2',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <img src="/3d/3d_cross.png" alt="Cross" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{t.totalProblem}</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: '#dc2626', marginTop: '2px' }}>{stats.totalProblem ?? 0}</div>
              </div>
            </div>

            {/* Returned packages */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '16px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <img src="/3d/3d_refresh.png" alt="Refresh" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{t.totalReturn}</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: '#475569', marginTop: '2px' }}>{stats.totalReturn ?? 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
