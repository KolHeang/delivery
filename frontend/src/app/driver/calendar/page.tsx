'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, isAuthenticated } from '@/lib/auth';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdArrowBack,
  MdCalendarToday,
  MdChevronLeft,
  MdChevronRight,
  MdAccountBalanceWallet,
  MdLocalShipping,
  MdInventory2,
  MdAssignment,
  MdCheckCircle,
  MdHelpOutline,
  MdLoop
} from 'react-icons/md';

const calendarTranslations = {
  en: {
    title: 'Delivery Calendar',
    subtitle: 'Select any date to view historical tasks and COD earnings',
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    all: 'All Time',
    selectedDateTitle: 'Statistics for Selected Date',
    pickupRequest: 'Pending Pickups',
    assignedParcels: 'Assigned Parcels',
    totalPackage: 'Total Packages',
    totalSuccessful: 'Successful Deliveries',
    totalProblem: 'Problem Parcels',
    totalReturn: 'Returned Parcels',
    khrWallet: 'KHR Wallet',
    usdWallet: 'USD Wallet',
    viewTasksBtn: 'View Delivery Tasks',
    loading: 'Loading calendar data...'
  },
  km: {
    title: 'ប្រតិទិនដឹកជញ្ជូន',
    subtitle: 'ជ្រើសរើសកាលបរិច្ឆេទដើម្បីមើលស្ថិតិ និងចំណូលប្រាក់ COD',
    today: 'ថ្ងៃនេះ',
    week: 'សប្ដាហ៍',
    month: 'ខែ',
    all: 'ទាំងអស់',
    selectedDateTitle: 'ស្ថិតិដឹកជញ្ជូនប្រចាំថ្ងៃ',
    pickupRequest: 'រង់ចាំទទួលអីវ៉ាន់',
    assignedParcels: 'អីវ៉ាន់ចាត់តាំង',
    totalPackage: 'កញ្ចប់អីវ៉ាន់សរុប',
    totalSuccessful: 'ដឹកជញ្ជូនជោគជ័យ',
    totalProblem: 'មានបញ្ហា',
    totalReturn: 'អីវ៉ាន់ត្រឡប់មកវិញ',
    khrWallet: 'កាបូបប្រាក់ KHR',
    usdWallet: 'កាបូបប្រាក់ USD',
    viewTasksBtn: 'មើលការងារដឹកជញ្ជូនប្រចាំថ្ងៃ',
    loading: 'កំពុងផ្ទុកប្រតិទិន...'
  }
};

export default function DriverCalendarPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const t = calendarTranslations[lang as 'en' | 'km'] || calendarTranslations.en;

  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('today');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [viewDate, setViewDate] = useState<Date>(new Date());

  const loadCalendarData = async (p = period, dateStr = selectedDate) => {
    setLoading(true);
    try {
      let url = `/mobile/driver/dashboard?period=${p}`;
      if (p === 'custom' && dateStr) {
        url += `&startDate=${dateStr}&endDate=${dateStr}`;
      }
      const res = await api.get(url);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load driver calendar dashboard data', err);
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
    loadCalendarData(period, selectedDate);
  }, [router]);

  const handleSelectSpecificDate = (dayNum: number) => {
    const year = viewDate.getFullYear();
    const month = String(viewDate.getMonth() + 1).padStart(2, '0');
    const day = String(dayNum).padStart(2, '0');
    const fullDate = `${year}-${month}-${day}`;
    setSelectedDate(fullDate);
    setPeriod('custom');
    loadCalendarData('custom', fullDate);
  };

  const handleQuickPeriod = (p: 'today' | 'week' | 'month' | 'all') => {
    setPeriod(p);
    if (p === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      setSelectedDate(todayStr);
    }
    loadCalendarData(p);
  };

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
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

  // Extract balances & stats
  const khrBalance = data?.wallets?.find((w: any) => w.currency === 'KHR')?.balance || 0;
  const usdBalance = data?.wallets?.find((w: any) => w.currency === 'USD')?.balance || 0;
  const stats = data?.statistics || {};

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#f4f7fc',
      fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
      paddingBottom: '36px',
      position: 'relative'
    }}>
      {/* Top Royal Blue Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 60%, #3b82f6 100%)',
        padding: '20px 20px 28px',
        borderBottomLeftRadius: '32px',
        borderBottomRightRadius: '32px',
        color: '#ffffff',
        boxShadow: '0 12px 30px rgba(37, 99, 235, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        {/* Back Button & Title Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => router.push('/driver/dashboard')}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <MdArrowBack size={22} />
          </button>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '900', margin: 0, letterSpacing: '-0.3px', color: '#ffffff' }}>
              {t.title}
            </h1>
            <p style={{ fontSize: '11.5px', color: 'rgba(239, 246, 255, 0.9)', margin: '2px 0 0', fontWeight: '500' }}>
              {t.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Main Calendar Body Container */}
      <div style={{
        padding: '0 16px',
        marginTop: '-14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Full Interactive Monthly Calendar Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          padding: '20px',
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.05)',
          border: '1px solid #e2e8f0'
        }}>
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
                    padding: '8px 2px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: isSelected ? '#2563eb' : 'transparent',
                    color: isSelected ? '#ffffff' : '#64748b',
                    fontWeight: isSelected ? '800' : '600',
                    fontSize: '11.5px',
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

          {/* Month Switcher Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
            borderRadius: '16px',
            padding: '10px 16px',
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

            <span style={{ fontSize: '15.5px', fontWeight: '900', color: '#0f172a' }}>
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

          {/* Days Header */}
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
                  fontSize: '11.5px',
                  fontWeight: '800',
                  color: idx === 0 || idx === 6 ? '#ef4444' : '#64748b',
                  padding: '4px 0'
                }}
              >
                {dName}
              </span>
            ))}
          </div>

          {/* Monthly Days Grid */}
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
                    height: '42px',
                    borderRadius: '14px',
                    border: isToday && !isSelected ? '2px solid #2563eb' : 'none',
                    backgroundColor: isSelected ? '#2563eb' : 'transparent',
                    color: isSelected ? '#ffffff' : isToday ? '#2563eb' : '#1e293b',
                    fontWeight: isSelected || isToday ? '900' : '600',
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 4px 14px rgba(37, 99, 235, 0.35)' : 'none'
                  }}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Stats Summary Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          padding: '20px',
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.05)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
              {t.selectedDateTitle}
            </h3>
            <span style={{
              fontSize: '12px',
              fontWeight: '800',
              color: '#2563eb',
              backgroundColor: '#eff6ff',
              padding: '4px 10px',
              borderRadius: '8px'
            }}>
              📅 {period === 'custom' ? selectedDate : (period === 'today' ? t.today : period)}
            </span>
          </div>

          {/* COD Wallets Mini Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
              borderRadius: '16px',
              padding: '12px 14px',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
            }}>
              <div style={{ fontSize: '10px', fontWeight: '800', opacity: 0.85, textTransform: 'uppercase' }}>
                {t.usdWallet}
              </div>
              <div style={{ fontSize: '17px', fontWeight: '900', marginTop: '2px' }}>
                ${usdBalance.toFixed(2)}
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
              borderRadius: '16px',
              padding: '12px 14px',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(249, 115, 22, 0.25)'
            }}>
              <div style={{ fontSize: '10px', fontWeight: '800', opacity: 0.85, textTransform: 'uppercase' }}>
                {t.khrWallet}
              </div>
              <div style={{ fontSize: '17px', fontWeight: '900', marginTop: '2px' }}>
                {khrBalance.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: '700' }}>៛</span>
              </div>
            </div>
          </div>

          {/* 3-Column Metrics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px'
          }}>
            {/* Pickup Requests */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '14px',
              padding: '10px 8px',
              textAlign: 'center',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b' }}>{t.pickupRequest}</div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#2563eb', marginTop: '2px' }}>{stats.pickupRequest ?? 0}</div>
            </div>

            {/* Total Packages */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '14px',
              padding: '10px 8px',
              textAlign: 'center',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b' }}>{t.totalPackage}</div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#334155', marginTop: '2px' }}>{stats.totalPackage ?? 0}</div>
            </div>

            {/* Successful */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '14px',
              padding: '10px 8px',
              textAlign: 'center',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b' }}>{t.totalSuccessful}</div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#16a34a', marginTop: '2px' }}>{stats.totalSuccessful ?? 0}</div>
            </div>
          </div>

          {/* Action Link Button */}
          <button
            onClick={() => router.push('/driver/tasks')}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '16px',
              padding: '14px',
              fontSize: '14px',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 6px 18px rgba(37, 99, 235, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <MdLocalShipping size={18} />
            {t.viewTasksBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
