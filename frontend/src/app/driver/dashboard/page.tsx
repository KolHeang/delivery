'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, isAuthenticated } from '@/lib/auth';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdAccountBalanceWallet,
  MdAssignment,
  MdCheckCircle,
  MdLocalShipping,
  MdRefresh,
  MdInventory2,
  MdChevronRight,
  MdNotifications,
  MdCalendarToday,
  MdHelpOutline,
  MdLoop,
  MdClose,
  MdChevronLeft
} from 'react-icons/md';
import LiveLocationTracker from '@/components/driver/LiveLocationTracker';

const dashboardTranslations = {
  en: {
    welcome: 'Hello',
    subtitle: 'Track your packages and earnings today',
    walletTitle: 'Collected COD Wallets',
    walletDesc: 'Cash collected pending handover to company',
    statsTitle: 'Delivery Statistics',
    pickupRequest: 'Pending Pickups',
    assignedParcels: 'Assigned Parcels',
    totalPackage: 'Total Packages',
    totalSuccessful: 'Successful Deliveries',
    totalProblem: 'Problem Parcels',
    totalReturn: 'Returned Parcels',
    activeTasksBtn: 'Go to Tasks Management',
    pickupTasksBtn: 'Pickup Requests Management',
    calendarTitle: 'Select Date (Calendar)',
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    all: 'All Time',
    custom: 'Custom Date',
    applyDate: 'Apply Selected Date',
  },
  km: {
    welcome: 'សួស្តី',
    subtitle: 'តាមដានកញ្ចប់អីវ៉ាន់ និងចំណូលរបស់អ្នកនៅថ្ងៃនេះ',
    walletTitle: 'កាបូបប្រាក់ COD ដែលប្រមូលបាន',
    walletDesc: 'ប្រាក់សុទ្ធដែលប្រមូលបាន រង់ចាំការប្រគល់ជូនក្រុមហ៊ុន',
    statsTitle: 'ស្ថិតិដឹកជញ្ជូន',
    pickupRequest: 'រង់ចាំទទួលអីវ៉ាន់',
    assignedParcels: 'អីវ៉ាន់ចាត់តាំង',
    totalPackage: 'កញ្ចប់អីវ៉ាន់សរុប',
    totalSuccessful: 'ដឹកជញ្ជូនជោគជ័យ',
    totalProblem: 'មានបញ្ហា',
    totalReturn: 'អីវ៉ាន់ត្រឡប់មកវិញ',
    activeTasksBtn: 'ទៅកាន់ការងារដឹកជញ្ជូន',
    pickupTasksBtn: 'ការទាមទារទទួលអីវ៉ាន់ពីហាង',
    calendarTitle: 'ប្រតិទិន (Interactive Calendar)',
    today: 'ថ្ងៃនេះ',
    week: 'សប្ដាហ៍',
    month: 'ខែ',
    all: 'ទាំងអស់',
    custom: 'ជ្រើសរើសថ្ងៃ',
    applyDate: 'អនុវត្តកាលបរិច្ឆេទ',
  }
};

export default function DriverDashboardPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Calendar State
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('today');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [viewDate, setViewDate] = useState<Date>(new Date());

  const t = dashboardTranslations[lang as 'en' | 'km'] || dashboardTranslations.en;

  const loadDashboard = async (p = period, dateStr = selectedDate) => {
    try {
      let url = `/mobile/driver/dashboard?period=${p}`;
      if (p === 'custom' && dateStr) {
        url += `&startDate=${dateStr}&endDate=${dateStr}`;
      }
      const res = await api.get(url);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load driver dashboard', err);
    } finally {
      setLoading(false);
    }
  };

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
    loadDashboard(period, selectedDate);
  }, [router]);

  const handleSelectSpecificDate = (dayNum: number) => {
    const year = viewDate.getFullYear();
    const month = String(viewDate.getMonth() + 1).padStart(2, '0');
    const day = String(dayNum).padStart(2, '0');
    const fullDate = `${year}-${month}-${day}`;
    setSelectedDate(fullDate);
    setPeriod('custom');
    loadDashboard('custom', fullDate);
    setShowCalendarModal(false);
  };

  const handleQuickPeriod = (p: 'today' | 'week' | 'month' | 'all') => {
    setPeriod(p);
    if (p === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      setSelectedDate(todayStr);
    }
    loadDashboard(p);
    setShowCalendarModal(false);
  };

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        minHeight: '80vh',
        backgroundColor: '#f8fafc',
        padding: '24px'
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          border: '3.5px solid rgba(37, 99, 235, 0.2)',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'dashSpin 0.8s linear infinite',
          marginBottom: '14px'
        }} />
        <span style={{ fontSize: '13.5px', color: '#64748b', fontWeight: '700' }}>
          {lang === 'km' ? 'កំពុងផ្ទុកទិន្នន័យ...' : 'Loading Dashboard...'}
        </span>
        <style dangerouslySetInnerHTML={{__html: `@keyframes dashSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
      </div>
    );
  }

  // Extract balances & stats
  const khrBalance = data?.wallets?.find((w: any) => w.currency === 'KHR')?.balance || 0;
  const usdBalance = data?.wallets?.find((w: any) => w.currency === 'USD')?.balance || 0;
  const stats = data?.statistics || {};
  const deliveryFeeTotal = data?.deliveryFeeTotal || 0;
  const totalSuccessful = stats?.totalSuccessful || 0;
  const feePerPkg = totalSuccessful > 0 ? (deliveryFeeTotal / totalSuccessful).toFixed(2) : '0.00';

  // Driver initials helper
  const getInitials = (name?: string) => {
    if (!name) return 'D';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Days in month logic for calendar grid
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNamesKm = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
  const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const currentMonthName = lang === 'km' ? `${monthNamesKm[month]} ${year}` : `${monthNamesEn[month]} ${year}`;

  const todayStr = new Date().toISOString().split('T')[0];

  // Active period display string
  const getDisplayPeriodText = () => {
    if (period === 'today') return t.today;
    if (period === 'week') return t.week;
    if (period === 'month') return t.month;
    if (period === 'all') return t.all;
    if (period === 'custom') return selectedDate;
    return t.today;
  };

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

        {/* Top Action Bar: Logo & Calendar Icon */}
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
              <span style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.4px', lineHeight: 1.1 }}>
                EBS<span style={{ color: '#93c5fd' }}>Express</span>
              </span>
              <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.75)', fontWeight: '600', marginTop: '2px' }}>
                DRIVER PORTAL
              </span>
            </div>
          </div>

          {/* Action Buttons: Notification & Calendar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>


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
              title="Notifications"
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

            {/* Calendar Button (Navigates to Dedicated Calendar Page) */}
            <button
              onClick={() => router.push('/driver/calendar')}
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
                transition: 'all 0.2s ease'
              }}
              title="Open Calendar"
            >
              <MdCalendarToday size={20} />
            </button>
          </div>
        </div>

        {/* Driver Profile Row */}
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
            overflow: 'hidden'
          }}>
            {getInitials(driver?.name)}
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '900', margin: 0, letterSpacing: '-0.3px', color: '#ffffff' }}>
              {driver?.name || 'Kol Heang'}
            </h2>
            <p style={{ fontSize: '11.5px', color: 'rgba(239, 246, 255, 0.95)', margin: '2px 0 0', fontWeight: '600' }}>
              🟢 {lang === 'km' ? 'កំពុងដំណើរការដឹកជញ្ជូន' : 'Active Delivery Driver'}
            </p>
          </div>
        </div>

        {/* COD Wallets Nested Glass Row — ចំនួនលុយថ្លៃដឹក */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Delivery Fee Total — Full width */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.20)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.30)',
            borderRadius: '16px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <img src="/3d/3d_cash.png" alt="Fee" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '800', opacity: 0.85, lineHeight: 1.3 }}>
                  {lang === 'km' ? 'ថ្លៃដឹករួម (រយៈពេល)' : 'Total Delivery Fee (Period)'}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '900', marginTop: '2px' }}>
                  ${deliveryFeeTotal.toFixed(2)}
                </div>
              </div>
            </div>
            {/* Per-package avg badge */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.22)',
              borderRadius: '12px',
              padding: '6px 12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '9px', fontWeight: '800', opacity: 0.85 }}>
                {lang === 'km' ? '/ 1 កញ្ចប់' : '/ pkg'}
              </div>
              <div style={{ fontSize: '14px', fontWeight: '900' }}>
                ${feePerPkg}
              </div>
            </div>
          </div>

          {/* KHR & USD COD pills */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* KHR Pill */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.16)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: '16px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)'
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <img src="/3d/3d_khr_coin.png" alt="KHR Coin" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '800', opacity: 0.85, lineHeight: 1.3 }}>
                  {lang === 'km' ? 'ប្រមូលបាន COD (រៀល)' : 'COD Collected (KHR)'}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '900', marginTop: '2px' }}>
                  {khrBalance.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: '700' }}>៛</span>
                </div>
              </div>
            </div>

            {/* USD Pill */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.16)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: '16px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)'
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <img src="/3d/3d_cash.png" alt="USD Cash" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '800', opacity: 0.85, lineHeight: 1.3 }}>
                  {lang === 'km' ? 'ប្រមូលបាន COD (ដុល្លារ)' : 'COD Collected (USD)'}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '900', marginTop: '2px' }}>
                  ${usdBalance.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Main Cards Body Container */}
      <div style={{
        padding: '20px 16px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Real-time Driver GPS Live Location Broadcaster */}
        <LiveLocationTracker />

        {/* Prime 3-Column Metrics Grid (6 Cards with 3D Icons) */}
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '10px'
          }}>
            {/* Card 1: Pickup Request */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '14px 10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px'
              }}>
                <img src="/3d/3d_shop.png" alt="Shop" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569', lineHeight: 1.2, height: '26px', display: 'flex', alignItems: 'center' }}>
                {t.pickupRequest}
              </span>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#2563eb', marginTop: '4px' }}>
                {stats.pickupRequest ?? 0}
              </span>
            </div>

            {/* Card 2: Assigned Parcels */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '14px 10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px'
              }}>
                <img src="/3d/3d_truck.png" alt="Assigned" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569', lineHeight: 1.2, height: '26px', display: 'flex', alignItems: 'center' }}>
                {t.assignedParcels}
              </span>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#2563eb', marginTop: '4px' }}>
                {stats.assignedParcels ?? 0}
              </span>
            </div>

            {/* Card 3: Total Package */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '14px 10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px'
              }}>
                <img src="/3d/3d_box.png" alt="Box" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569', lineHeight: 1.2, height: '26px', display: 'flex', alignItems: 'center' }}>
                {t.totalPackage}
              </span>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#334155', marginTop: '4px' }}>
                {stats.totalPackage ?? 0}
              </span>
            </div>

            {/* Card 4: Total Successful */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '14px 10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px'
              }}>
                <img src="/3d/3d_check.png" alt="Successful" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569', lineHeight: 1.2, height: '26px', display: 'flex', alignItems: 'center' }}>
                {t.totalSuccessful}
              </span>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#16a34a', marginTop: '4px' }}>
                {stats.totalSuccessful ?? 0}
              </span>
            </div>

            {/* Card 5: Total Problem */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '14px 10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px'
              }}>
                <img src="/3d/3d_cross.png" alt="Problem" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569', lineHeight: 1.2, height: '26px', display: 'flex', alignItems: 'center' }}>
                {t.totalProblem}
              </span>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#d97706', marginTop: '4px' }}>
                {stats.totalProblem ?? 0}
              </span>
            </div>

            {/* Card 6: Total Return */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '14px 10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px'
              }}>
                <img src="/3d/3d_refresh.png" alt="Return" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569', lineHeight: 1.2, height: '26px', display: 'flex', alignItems: 'center' }}>
                {t.totalReturn}
              </span>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#dc2626', marginTop: '4px' }}>
                {stats.totalReturn ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Modern 2-Column Quick Action Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px'
        }}>
          {/* Card 1: Delivery Tasks */}
          <button
            onClick={() => router.push('/driver/tasks')}
            style={{
              background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '20px',
              padding: '16px 14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              textAlign: 'left',
              minHeight: '110px',
              boxShadow: '0 8px 20px rgba(37, 99, 235, 0.25)',
              cursor: 'pointer'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              marginBottom: '12px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.22)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img src="/3d/3d_scooter.png" alt="Delivery Scooter" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
              </div>
              <MdChevronRight size={20} style={{ opacity: 0.8 }} />
            </div>

            <div>
              <div style={{
                fontSize: '13.5px',
                fontWeight: '800',
                lineHeight: '1.45',
                color: '#ffffff',
                marginBottom: '2px'
              }}>
                {t.activeTasksBtn}
              </div>
              <div style={{
                fontSize: '10.5px',
                fontWeight: '500',
                lineHeight: '1.3',
                opacity: 0.88,
                color: 'rgba(255, 255, 255, 0.9)'
              }}>
                {lang === 'km' ? 'ដឹកជញ្ជូនកញ្ចប់អីវ៉ាន់' : 'Deliver packages'}
              </div>
            </div>
          </button>

          {/* Card 2: Pickup Requests */}
          <button
            onClick={() => router.push('/driver/pickups')}
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '16px 14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              textAlign: 'left',
              minHeight: '110px',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
              cursor: 'pointer'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              marginBottom: '12px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img src="/3d/3d_shop.png" alt="Pickup Shop" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
              </div>
              <MdChevronRight size={20} color="#94a3b8" />
            </div>

            <div>
              <div style={{
                fontSize: '13.5px',
                fontWeight: '800',
                lineHeight: '1.45',
                color: '#0f172a',
                marginBottom: '2px'
              }}>
                {t.pickupTasksBtn}
              </div>
              <div style={{
                fontSize: '10.5px',
                fontWeight: '500',
                lineHeight: '1.3',
                color: '#64748b'
              }}>
                {lang === 'km' ? 'ទទួលអីវ៉ាន់ពីអ្នកផ្ញើ/ហាង' : 'Receive packages'}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* FULL VISUAL INTERACTIVE CALENDAR MODAL */}
      {showCalendarModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '28px',
            width: '100%',
            maxWidth: '380px',
            padding: '22px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
            border: '1px solid #e2e8f0',
            animation: 'calPop 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Calendar Modal Top Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '12px',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <MdCalendarToday size={20} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                  {t.calendarTitle}
                </h3>
              </div>

              <button
                onClick={() => setShowCalendarModal(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <MdClose size={20} />
              </button>
            </div>

            {/* Quick Filter Period Pills */}
            <div style={{
              display: 'flex',
              gap: '6px',
              backgroundColor: '#f8fafc',
              borderRadius: '14px',
              padding: '4px',
              border: '1px solid #e2e8f0',
              marginBottom: '18px'
            }}>
              {[
                { id: 'today', label: t.today },
                { id: 'week', label: t.week },
                { id: 'month', label: t.month },
                { id: 'all', label: t.all }
              ].map(pItem => {
                const isSelected = period === pItem.id;
                return (
                  <button
                    key={pItem.id}
                    onClick={() => handleQuickPeriod(pItem.id as any)}
                    style={{
                      flex: 1,
                      padding: '7px 2px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: isSelected ? '#2563eb' : 'transparent',
                      color: isSelected ? '#ffffff' : '#64748b',
                      fontWeight: isSelected ? '800' : '600',
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isSelected ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none'
                    }}
                  >
                    {pItem.label}
                  </button>
                );
              })}
            </div>

            {/* Calendar Month Switcher Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc',
              borderRadius: '16px',
              padding: '10px 14px',
              border: '1px solid #e2e8f0',
              marginBottom: '14px'
            }}>
              <button
                onClick={prevMonth}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px'
                }}
              >
                <MdChevronLeft size={24} />
              </button>

              <span style={{ fontSize: '15px', fontWeight: '900', color: '#0f172a' }}>
                {currentMonthName}
              </span>

              <button
                onClick={nextMonth}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px'
                }}
              >
                <MdChevronRight size={24} />
              </button>
            </div>

            {/* Days of Week Header Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '4px',
              textAlign: 'center',
              marginBottom: '8px'
            }}>
              {(lang === 'km'
                ? ['អា', 'ច', 'អ', 'ព', 'ព្រ', 'សុ', 'ស']
                : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
              ).map((dName, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    color: idx === 0 || idx === 6 ? '#ef4444' : '#64748b',
                    padding: '4px 0'
                  }}
                >
                  {dName}
                </span>
              ))}
            </div>

            {/* Visual Days Grid (1..31) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '4px',
              textAlign: 'center'
            }}>
              {/* Empty padding slots before day 1 */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {/* Month Day Buttons */}
              {Array.from({ length: totalDaysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isToday = dStr === todayStr;
                const isSelected = period === 'custom' && dStr === selectedDate;

                return (
                  <button
                    key={dayNum}
                    onClick={() => handleSelectSpecificDate(dayNum)}
                    style={{
                      height: '38px',
                      borderRadius: '12px',
                      border: isToday && !isSelected ? '2px solid #2563eb' : 'none',
                      backgroundColor: isSelected ? '#2563eb' : 'transparent',
                      color: isSelected ? '#ffffff' : isToday ? '#2563eb' : '#1e293b',
                      fontWeight: isSelected || isToday ? '900' : '600',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none'
                    }}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CSS Animation */}
      <style dangerouslySetInnerHTML={{__html: `@keyframes calPop { 0% { transform: scale(0.92); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }`}} />
    </div>
  );
}
