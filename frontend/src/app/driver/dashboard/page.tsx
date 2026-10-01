'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser, isAuthenticated } from '@/lib/auth';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdNotifications,
  MdCalendarToday,
  MdInventory2,
  MdAssignment,
  MdCheckCircle,
  MdError,
  MdReplay,
  MdAccountBalanceWallet,
  MdChevronRight,
  MdClose,
  MdPerson,
  MdChevronLeft,
} from 'react-icons/md';

const dashboardTranslations = {
  en: {
    goodMorning: 'Good Morning,',
    workStats: 'Work Statistics',
    totalParcels: 'Total Parcels',
    assigned: 'Assigned',
    delivered: 'Delivered',
    problem: 'Problem',
    returned: 'Returned',
    financialInfo: 'Financial Information',
    amountToCollect: 'Amount to Collect',
    amountCollected: 'Amount Collected',
    recentTasks: 'Recent Tasks',
    seeAll: 'See All',
    noRecentTasks: 'No tasks found for this date.',
    pending: 'Pending',
    inTransit: 'Delivery',
    failed: 'Failed',
    selectDate: 'Select Date',
    apply: 'Apply',
    today: 'Today',
  },
  km: {
    goodMorning: 'អរុណសួស្តី,',
    workStats: 'ស្ថិតិការងារ',
    totalParcels: 'កញ្ចប់អីវ៉ាន់សរុប',
    assigned: 'បានចាត់តាំង',
    delivered: 'ដឹកជោគជ័យ',
    problem: 'មានបញ្ហា',
    returned: 'ត្រឡប់មកវិញ',
    financialInfo: 'ព័ត៌មានហិរញ្ញវត្ថុ',
    amountToCollect: 'ប្រាក់ត្រូវប្រមូល',
    amountCollected: 'ប្រាក់ប្រមូលបាន',
    recentTasks: 'ភារកិច្ចថ្មីៗ',
    seeAll: 'មើលទាំងអស់',
    noRecentTasks: 'មិនមានកញ្ចប់អីវ៉ាន់នៅថ្ងៃនេះទេ',
    pending: 'រង់ចាំដឹក',
    inTransit: 'កំពុងដឹក',
    failed: 'បរាជ័យ',
    selectDate: 'ជ្រើសរើសថ្ងៃ',
    apply: 'អនុវត្ត',
    today: 'ថ្ងៃនេះ',
  },
};

export default function DriverDashboardPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());

  const t = dashboardTranslations[lang as 'en' | 'km'] || dashboardTranslations.en;

  const loadDashboard = async (dateStr = selectedDate) => {
    try {
      const res = await api.get(`/mobile/driver/dashboard?date=${dateStr}`);
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
    loadDashboard(selectedDate);
  }, [router]);

  const formatDateDisplay = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(lang === 'km' ? 'km-KH' : 'en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setShowCalendarModal(false);
    setLoading(true);
    loadDashboard(dateStr);
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'delivered') {
      return { bg: '#ecfdf5', color: '#16a34a', text: lang === 'km' ? 'ជោគជ័យ' : 'Delivered' };
    }
    if (s === 'failed' || s === 'problem') {
      return { bg: '#fef2f2', color: '#dc2626', text: lang === 'km' ? 'មានបញ្ហា' : 'Failed' };
    }
    if (s === 'returned' || s === 'rejected') {
      return { bg: '#faf5ff', color: '#9333ea', text: lang === 'km' ? 'ត្រឡប់' : 'Returned' };
    }
    if (s === 'in-transit') {
      return { bg: '#eff6ff', color: '#2563eb', text: lang === 'km' ? 'កំពុងដឹក' : 'Delivery' };
    }
    return { bg: '#fffbeb', color: '#d97706', text: lang === 'km' ? 'រង់ចាំ' : 'Pending' };
  };

  const workStats = data?.workStatistics || {
    totalParcels: data?.statistics?.totalPackage || 0,
    assigned: data?.statistics?.assignedParcels || 0,
    delivered: data?.statistics?.totalSuccessful || 0,
    problem: data?.statistics?.totalProblem || 0,
    returned: data?.statistics?.totalReturn || 0,
  };

  const amountToCollectUsd = data?.amountToCollect?.usd || 0;
  const amountCollectedUsd = data?.amountCollected?.usd || 0;
  const recentTasks = data?.recentTasks || [];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f8fafc',
      minHeight: '100vh',
      fontFamily: "'Kantumruy Pro', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* 1. Top Header (Deep Royal Blue) */}
      <div style={{
        background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
        padding: '24px 20px 20px',
        color: '#ffffff',
        borderBottomLeftRadius: '28px',
        borderBottomRightRadius: '28px',
        boxShadow: '0 10px 25px rgba(29, 78, 216, 0.2)',
      }}>
        {/* User Info & Notification */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Avatar */}
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              border: '2px solid rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
            }}>
              {driver?.photo ? (
                <img src={driver.photo} alt="Rider" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <MdPerson size={28} color="#ffffff" />
              )}
            </div>
            <div>
              <div style={{ fontSize: '11.5px', color: '#bfdbfe', fontWeight: '500' }}>
                {t.goodMorning}
              </div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.2px' }}>
                {driver?.name || 'Sophal Rider'}
              </div>
            </div>
          </div>

          {/* Notification Bell with Badge */}
          <div style={{
            position: 'relative',
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}>
            <MdNotifications size={22} color="#ffffff" />
            <div style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '8px',
              height: '8px',
              backgroundColor: '#ef4444',
              borderRadius: '50%',
              border: '1.5px solid #1d4ed8',
            }} />
          </div>
        </div>

        {/* Date Filter Bar */}
        <div
          onClick={() => setShowCalendarModal(true)}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#1e293b',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MdCalendarToday size={18} color="#1d4ed8" />
            <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>
              {formatDateDisplay(selectedDate)}
            </span>
          </div>
          <MdCalendarToday size={18} color="#64748b" />
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* 2. Work Statistics */}
        <div>
          <div style={{
            fontSize: '14.5px',
            fontWeight: '800',
            color: '#0f172a',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span>{t.workStats}</span>
          </div>

          {/* 5 Statistics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
          }}>
            {/* Total Parcels */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '12px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
              }}>
                <MdInventory2 size={16} />
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                {workStats.totalParcels}
              </div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>
                {t.totalParcels}
              </div>
            </div>

            {/* Assigned */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '12px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: '#e0e7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4f46e5',
              }}>
                <MdAssignment size={16} />
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                {workStats.assigned}
              </div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>
                {t.assigned}
              </div>
            </div>

            {/* Delivered */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '12px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16a34a',
              }}>
                <MdCheckCircle size={16} />
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                {workStats.delivered}
              </div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>
                {t.delivered}
              </div>
            </div>

            {/* Problem */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '12px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: '#ffedd5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ea580c',
              }}>
                <MdError size={16} />
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                {workStats.problem}
              </div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>
                {t.problem}
              </div>
            </div>

            {/* Returned */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '12px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: '#f3e8ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9333ea',
              }}>
                <MdReplay size={16} />
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                {workStats.returned}
              </div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>
                {t.returned}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Financial Information */}
        <div>
          <div style={{
            fontSize: '14.5px',
            fontWeight: '800',
            color: '#0f172a',
            marginBottom: '12px',
          }}>
            {t.financialInfo}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
          }}>
            {/* Amount to Collect */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              padding: '16px',
              border: '1px solid #fed7aa',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(234, 88, 12, 0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: '#ffedd5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ea580c',
                }}>
                  <MdAccountBalanceWallet size={18} />
                </div>
                <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#ea580c' }}>
                  {t.amountToCollect}
                </span>
              </div>
              <div style={{ fontSize: '19px', fontWeight: '900', color: '#0f172a' }}>
                ${amountToCollectUsd.toFixed(2)}
              </div>
            </div>

            {/* Amount Collected */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              padding: '16px',
              border: '1px solid #bbf7d0',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: '#dcfce7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#16a34a',
                }}>
                  <MdAccountBalanceWallet size={18} />
                </div>
                <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#16a34a' }}>
                  {t.amountCollected}
                </span>
              </div>
              <div style={{ fontSize: '19px', fontWeight: '900', color: '#0f172a' }}>
                ${amountCollectedUsd.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Recent Tasks */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}>
            <span style={{ fontSize: '14.5px', fontWeight: '800', color: '#0f172a' }}>
              {t.recentTasks}
            </span>
            <Link
              href="/driver/tasks"
              style={{
                fontSize: '12.5px',
                fontWeight: '700',
                color: '#1d4ed8',
                textDecoration: 'none',
              }}
            >
              {t.seeAll}
            </Link>
          </div>

          {/* Tasks List Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentTasks.length === 0 ? (
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '24px 16px',
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: '13px',
                border: '1px solid #e2e8f0',
              }}>
                {t.noRecentTasks}
              </div>
            ) : (
              recentTasks.map((task: any) => {
                const badge = getStatusBadge(task.status);
                return (
                  <Link
                    key={task.id}
                    href={`/driver/tasks?id=${task.id}`}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      padding: '14px 16px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textDecoration: 'none',
                      color: 'inherit',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                      transition: 'transform 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Box Icon Square */}
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        backgroundColor: '#ffedd5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ea580c',
                        flexShrink: 0,
                      }}>
                        <MdInventory2 size={22} />
                      </div>

                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                          #{task.trackingCode}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '500', marginTop: '2px' }}>
                          {task.merchantName || 'Sokha Store'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Status Badge */}
                      <div style={{
                        backgroundColor: badge.bg,
                        color: badge.color,
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '700',
                      }}>
                        {badge.text}
                      </div>
                      <MdChevronRight size={20} color="#94a3b8" />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Date Picker Modal */}
      {showCalendarModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '24px',
            width: '100%',
            maxWidth: '360px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                {t.selectDate}
              </span>
              <button
                type="button"
                onClick={() => setShowCalendarModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <MdClose size={22} />
              </button>
            </div>

            {/* Simple Date Input */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleSelectDate(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1.5px solid #e2e8f0',
                fontSize: '14px',
                fontWeight: '600',
                outline: 'none',
                marginBottom: '16px',
              }}
            />

            <button
              type="button"
              onClick={() => handleSelectDate(new Date().toISOString().split('T')[0])}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                borderRadius: '12px',
                fontSize: '13.5px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              {t.today}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
