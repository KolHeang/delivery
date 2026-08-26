'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getUser } from '@/lib/auth';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdAssessment,
  MdRefresh,
  MdAccountBalanceWallet,
  MdCheckCircle,
  MdLocalShipping,
  MdError,
  MdUndo,
  MdTrendingUp,
  MdCalendarToday,
  MdSearch,
  MdContentCopy,
  MdPhone,
  MdLocationOn,
  MdStorefront,
  MdFilterList,
  MdAttachMoney,
  MdDirectionsBike,
  MdClose,
  MdFileDownload,
  MdPrint
} from 'react-icons/md';

const reportTranslations = {
  en: {
    title: 'Driver Report',
    subtitle: 'Track your earnings, COD collections & delivery performance',
    today: 'Today',
    yesterday: 'Yesterday',
    week: '7 Days',
    month: 'This Month',
    all: 'All Time',
    custom: 'Custom',
    startDate: 'Start Date',
    endDate: 'End Date',
    applyFilter: 'Apply Filter',
    financialOverview: 'Financial & COD Overview',
    deliveryFeeEarned: 'Delivery Fee Earned',
    codCollectedUsd: 'COD Collected (USD)',
    codCollectedKhr: 'COD Collected (KHR)',
    paidToHub: 'Paid / Handed Over',
    pendingHandover: 'Pending Handover',
    performanceStats: 'Delivery Performance',
    totalOrders: 'Total Orders',
    delivered: 'Delivered',
    inTransit: 'In Transit',
    pickedUp: 'Picked Up',
    failed: 'Failed',
    returned: 'Returned',
    pending: 'Pending',
    successRate: 'Success Rate',
    dailyActivity: 'Daily Breakdown',
    ordersList: 'Orders & Parcels Breakdown',
    searchPlaceholder: 'Search tracking #, receiver, phone...',
    allStatuses: 'All',
    driverInfo: 'Driver Info',
    zone: 'Zone',
    vehicle: 'Vehicle',
    noOrders: 'No orders found for the selected timeframe',
    copied: 'Tracking code copied!',
    statementSummary: 'Reconciliation Statement',
    printSummary: 'Print Statement',
    close: 'Close',
    handoverSummary: 'Cash Handover Summary',
    totalCashToHandover: 'Total Cash Pending Handover'
  },
  km: {
    title: 'របាយការណ៍អ្នកដឹក',
    subtitle: 'តាមដានចំណូល ប្រាក់ COD ប្រមូលបាន និងលទ្ធផលដឹកជញ្ជូន',
    today: 'ថ្ងៃនេះ',
    yesterday: 'ម្សិលមិញ',
    week: '៧ ថ្ងៃ',
    month: 'ខែនេះ',
    all: 'ទាំងអស់',
    custom: 'ជ្រើសថ្ងៃ',
    startDate: 'ថ្ងៃចាប់ផ្តើម',
    endDate: 'ថ្ងៃបញ្ចប់',
    applyFilter: 'អនុវត្ត',
    financialOverview: 'ទិដ្ឋភាពហិរញ្ញវត្ថុ & ប្រាក់ COD',
    deliveryFeeEarned: 'ថ្លៃសេវាដឹកជញ្ជូនទទួលបាន',
    codCollectedUsd: 'ប្រាក់ COD ប្រមូលបាន (USD)',
    codCollectedKhr: 'ប្រាក់ COD ប្រមូលបាន (KHR)',
    paidToHub: 'បានប្រគល់ជូនក្រុមហ៊ុន',
    pendingHandover: 'រង់ចាំប្រគល់ក្រុមហ៊ុន',
    performanceStats: 'ស្ថិតិលទ្ធផលដឹកជញ្ជូន',
    totalOrders: 'កញ្ចប់សរុប',
    delivered: 'ជោគជ័យ',
    inTransit: 'កំពុងដឹក',
    pickedUp: 'បានទទួល',
    failed: 'មិនជោគជ័យ',
    returned: 'ត្រឡប់មកវិញ',
    pending: 'រង់ចាំ',
    successRate: 'អត្រាជោគជ័យ',
    dailyActivity: 'សកម្មភាពតាមថ្ងៃ',
    ordersList: 'បញ្ជីកញ្ចប់អីវ៉ាន់លម្អិត',
    searchPlaceholder: 'ស្វែងរកលេខកូដ, អតិថិជន, ទូរស័ព្ទ...',
    allStatuses: 'ទាំងអស់',
    driverInfo: 'ព័ត៌មានអ្នកដឹក',
    zone: 'តំបន់',
    vehicle: 'មធ្យោបាយ',
    noOrders: 'មិនមានទិន្នន័យសម្រាប់ចន្លោះពេលនេះទេ',
    copied: 'បានចម្លងលេខកូដ!',
    statementSummary: 'ប័ណ្ណទូទាត់ប្រាក់សង្ខេប',
    printSummary: 'បោះពុម្ពប័ណ្ណទូទាត់',
    close: 'បិទ',
    handoverSummary: 'សង្ខេបប្រាក់ត្រូវប្រគល់',
    totalCashToHandover: 'ប្រាក់សុទ្ធត្រូវប្រគល់ជូនក្រុមហ៊ុន'
  }
};

export default function DriverReportsPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const t = reportTranslations[lang as 'en' | 'km'] || reportTranslations.en;

  const [period, setPeriod] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'>('today');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);

  const loadReport = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      let url = `/mobile/driver/report?period=${period}`;
      if (period === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await api.get(url);
      setReportData(res.data);
    } catch (err) {
      console.error('Failed to load driver report', err);
    } finally {
      setLoading(false);
      if (isManual) {
        setTimeout(() => setRefreshing(false), 400);
      }
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
    loadReport();
  }, [period, router]);

  const handleApplyCustom = () => {
    if (!startDate || !endDate) return;
    setPeriod('custom');
    setShowCustomModal(false);
    loadReport();
  };

  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter orders by status and search query
  const filteredOrders = useMemo(() => {
    if (!reportData?.orders) return [];
    return reportData.orders.filter((o: any) => {
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchStatus;

      const matchSearch =
        o.trackingCode?.toLowerCase().includes(query) ||
        o.receiverName?.toLowerCase().includes(query) ||
        o.receiverPhone?.toLowerCase().includes(query) ||
        o.receiverAddress?.toLowerCase().includes(query) ||
        o.merchantName?.toLowerCase().includes(query);

      return matchStatus && matchSearch;
    });
  }, [reportData, statusFilter, searchQuery]);

  const summary = reportData?.summary;
  const driver = reportData?.driver;
  const timeline = reportData?.timeline || [];

  if (loading && !reportData) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        gap: '12px'
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          border: '3px solid rgba(37, 99, 235, 0.2)',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
          {lang === 'km' ? 'កំពុងទាញយកទិន្នន័យរបាយការណ៍...' : 'Loading report data...'}
        </span>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }` }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 14px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Toast */}
      {copiedId && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <MdCheckCircle color="#22c55e" size={16} />
          <span>{t.copied}</span>
        </div>
      )}

      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 2px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <MdAssessment size={20} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '19px', fontWeight: '800', color: '#0f172a' }}>
                {t.title}
              </h1>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                {driver?.name} {driver?.vehicle ? `• ${driver.vehicle}` : ''}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowStatementModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '10px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#334155',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <MdPrint size={15} color="#2563eb" />
            <span>{lang === 'km' ? 'ប័ណ្ណទូទាត់' : 'Statement'}</span>
          </button>

          <button
            onClick={() => loadReport(true)}
            disabled={refreshing}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#334155',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            <MdRefresh
              size={18}
              style={{
                transform: refreshing ? 'rotate(360deg)' : 'none',
                transition: 'transform 0.5s ease-in-out'
              }}
            />
          </button>
        </div>
      </div>

      {/* Date Filter Pills */}
      <div style={{
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        paddingBottom: '2px',
        scrollbarWidth: 'none'
      }}>
        {[
          { key: 'today', label: t.today },
          { key: 'yesterday', label: t.yesterday },
          { key: 'week', label: t.week },
          { key: 'month', label: t.month },
          { key: 'all', label: t.all },
          { key: 'custom', label: t.custom },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => {
              if (item.key === 'custom') {
                setShowCustomModal(true);
              } else {
                setPeriod(item.key as any);
              }
            }}
            style={{
              padding: '7px 14px',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: period === item.key ? '#2563eb' : '#e2e8f0',
              backgroundColor: period === item.key ? '#2563eb' : '#ffffff',
              color: period === item.key ? '#ffffff' : '#475569',
              fontSize: '12px',
              fontWeight: '700',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              boxShadow: period === item.key ? '0 4px 12px rgba(37,99,235,0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Custom Date Modal */}
      {showCustomModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '360px',
            padding: '20px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                {t.custom}
              </h3>
              <button
                onClick={() => setShowCustomModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <MdClose size={20} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>{t.startDate}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  marginTop: '4px',
                  fontSize: '13px'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>{t.endDate}</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  marginTop: '4px',
                  fontSize: '13px'
                }}
              />
            </div>

            <button
              onClick={handleApplyCustom}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '12px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontWeight: '800',
                fontSize: '13px',
                cursor: 'pointer',
                marginTop: '6px'
              }}
            >
              {t.applyFilter}
            </button>
          </div>
        </div>
      )}

      {/* Financial & COD Cards */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {/* Earnings Card */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
          borderRadius: '18px',
          padding: '18px',
          color: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(37,99,235,0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <MdAttachMoney size={20} color="#ffffff" />
              </div>
              <span style={{ fontSize: '12px', fontWeight: '700', opacity: 0.9 }}>
                {t.deliveryFeeEarned}
              </span>
            </div>
            <span style={{
              fontSize: '10px',
              fontWeight: '800',
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: '3px 8px',
              borderRadius: '12px'
            }}>
              {t[period] || period}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '30px', fontWeight: '900', letterSpacing: '-0.5px' }}>
              ${summary?.deliveryFeeTotal?.toFixed(2) || '0.00'}
            </span>
            <span style={{ fontSize: '12px', opacity: 0.8 }}>USD</span>
          </div>

          {/* Mini Stats Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            paddingTop: '10px',
            borderTop: '1px solid rgba(255,255,255,0.15)'
          }}>
            <div>
              <div style={{ fontSize: '10px', opacity: 0.8 }}>{t.delivered}</div>
              <div style={{ fontSize: '16px', fontWeight: '800' }}>
                {summary?.totalDelivered || 0} {lang === 'km' ? 'កញ្ចប់' : 'parcels'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', opacity: 0.8 }}>{t.successRate}</div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#86efac' }}>
                {summary?.successRate || 0}%
              </div>
            </div>
          </div>
        </div>

        {/* COD Wallets (USD & KHR) Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {/* USD COD */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>
                COD (USD)
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: '800',
                padding: '2px 6px',
                borderRadius: '6px',
                backgroundColor: '#dcfce7',
                color: '#166534'
              }}>$</span>
            </div>

            <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>
              ${summary?.cod?.usd?.totalDelivered?.toFixed(2) || '0.00'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '10px', borderTop: '1px dashed #f1f5f9', paddingTop: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                <span>{t.paidToHub}:</span>
                <span style={{ fontWeight: '700' }}>${summary?.cod?.usd?.paidToCompany?.toFixed(2) || '0.00'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ea580c' }}>
                <span>{t.pendingHandover}:</span>
                <span style={{ fontWeight: '800' }}>${summary?.cod?.usd?.pendingCollection?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>

          {/* KHR COD */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>
                COD (KHR)
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: '800',
                padding: '2px 6px',
                borderRadius: '6px',
                backgroundColor: '#fef3c7',
                color: '#92400e'
              }}>៛</span>
            </div>

            <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>
              {summary?.cod?.khr?.totalDelivered?.toLocaleString() || '0'} ៛
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '10px', borderTop: '1px dashed #f1f5f9', paddingTop: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                <span>{t.paidToHub}:</span>
                <span style={{ fontWeight: '700' }}>{summary?.cod?.khr?.paidToCompany?.toLocaleString() || '0'} ៛</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ea580c' }}>
                <span>{t.pendingHandover}:</span>
                <span style={{ fontWeight: '800' }}>{summary?.cod?.khr?.pendingCollection?.toLocaleString() || '0'} ៛</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Counts Grid */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '18px',
        padding: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
            {t.performanceStats}
          </h3>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb' }}>
            {summary?.totalOrders || 0} {lang === 'km' ? 'សរុប' : 'Total'}
          </span>
        </div>

        {/* Progress Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700', marginBottom: '6px' }}>
            <span style={{ color: '#64748b' }}>{t.successRate}</span>
            <span style={{ color: '#16a34a' }}>{summary?.successRate || 0}%</span>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            borderRadius: '10px',
            backgroundColor: '#f1f5f9',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${Math.min(100, Math.max(0, summary?.successRate || 0))}%`,
              height: '100%',
              borderRadius: '10px',
              backgroundColor: '#16a34a',
              transition: 'width 0.6s ease'
            }} />
          </div>
        </div>

        {/* Grid Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', paddingTop: '4px' }}>
          <div style={{ backgroundColor: '#f0fdf4', padding: '10px 8px', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: '900', color: '#166534' }}>
              {summary?.totalDelivered || 0}
            </div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#15803d' }}>
              {t.delivered}
            </div>
          </div>

          <div style={{ backgroundColor: '#eff6ff', padding: '10px 8px', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: '900', color: '#1e40af' }}>
              {summary?.totalInTransit || 0}
            </div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#2563eb' }}>
              {t.inTransit}
            </div>
          </div>

          <div style={{ backgroundColor: '#fff1f2', padding: '10px 8px', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: '900', color: '#9f1239' }}>
              {(summary?.totalFailed || 0) + (summary?.totalReturned || 0)}
            </div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#e11d48' }}>
              {t.failed} / {t.returned}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Timeline Activity (if available) */}
      {timeline.length > 1 && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '18px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
            {t.dailyActivity}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {timeline.slice(-7).reverse().map((day: any) => (
              <div
                key={day.date}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #f1f5f9'
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b' }}>
                    {day.date}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    {day.delivered} {t.delivered} • {day.totalOrders} {t.totalOrders}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#16a34a' }}>
                    +${day.deliveryFee?.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '10px', color: '#475569', fontWeight: '600' }}>
                    COD: ${day.codUSD?.toFixed(2)} / {day.codKHR?.toLocaleString()}៛
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders List & Search Section */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
            {t.ordersList} ({filteredOrders.length})
          </h3>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative' }}>
          <MdSearch
            size={20}
            color="#94a3b8"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 38px',
              borderRadius: '14px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              fontWeight: '500',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8'
              }}
            >
              <MdClose size={16} />
            </button>
          )}
        </div>

        {/* Status Filter Chips */}
        <div style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '2px',
          scrollbarWidth: 'none'
        }}>
          {[
            { key: 'all', label: t.allStatuses },
            { key: 'delivered', label: t.delivered },
            { key: 'in-transit', label: t.inTransit },
            { key: 'failed', label: t.failed },
            { key: 'returned', label: t.returned },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setStatusFilter(item.key)}
              style={{
                padding: '5px 12px',
                borderRadius: '16px',
                border: '1px solid',
                borderColor: statusFilter === item.key ? '#2563eb' : '#e2e8f0',
                backgroundColor: statusFilter === item.key ? '#eff6ff' : '#ffffff',
                color: statusFilter === item.key ? '#2563eb' : '#64748b',
                fontSize: '11px',
                fontWeight: '700',
                whiteSpace: 'nowrap',
                cursor: 'pointer'
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Orders Card List */}
        {filteredOrders.length === 0 ? (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '36px 16px',
            textAlign: 'center',
            border: '1px solid #e2e8f0',
            color: '#64748b',
            fontSize: '13px'
          }}>
            <MdAssessment size={36} color="#cbd5e1" style={{ marginBottom: '8px' }} />
            <div>{t.noOrders}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredOrders.map((ord: any) => {
              const isDelivered = ord.status === 'delivered';
              const isFailed = ord.status === 'failed';
              const isReturned = ord.status === 'returned';

              const statusColor = isDelivered
                ? '#16a34a'
                : isFailed
                ? '#dc2626'
                : isReturned
                ? '#ea580c'
                : '#2563eb';

              const statusBg = isDelivered
                ? '#f0fdf4'
                : isFailed
                ? '#fef2f2'
                : isReturned
                ? '#fff7ed'
                : '#eff6ff';

              return (
                <div
                  key={ord.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    padding: '14px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  {/* Top Bar with Tracking & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div
                      onClick={(e) => handleCopy(ord.trackingCode, e)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        cursor: 'pointer',
                        backgroundColor: '#f8fafc',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>
                        #{ord.trackingCode}
                      </span>
                      <MdContentCopy size={13} color="#64748b" />
                    </div>

                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '3px 9px',
                      borderRadius: '12px',
                      backgroundColor: statusBg,
                      color: statusColor,
                      textTransform: 'capitalize'
                    }}>
                      {ord.status}
                    </span>
                  </div>

                  {/* Customer / Destination Info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                      {ord.receiverName || 'Customer'}
                    </div>

                    {ord.receiverPhone && (
                      <a
                        href={`tel:${ord.receiverPhone}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#2563eb',
                          fontSize: '12px',
                          fontWeight: '700',
                          textDecoration: 'none'
                        }}
                      >
                        <MdPhone size={13} />
                        <span>{ord.receiverPhone}</span>
                      </a>
                    )}

                    {ord.receiverAddress && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', color: '#64748b', fontSize: '11px' }}>
                        <MdLocationOn size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{ord.receiverAddress}</span>
                      </div>
                    )}

                    {ord.merchantName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                        <MdStorefront size={13} />
                        <span>{ord.merchantName}</span>
                      </div>
                    )}
                  </div>

                  {/* Financial Details Footer */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '8px',
                    borderTop: '1px dashed #f1f5f9',
                    fontSize: '11px'
                  }}>
                    <div>
                      <span style={{ color: '#64748b' }}>COD: </span>
                      <span style={{ fontWeight: '800', color: '#0f172a' }}>
                        {ord.codCurrency === 'KHR'
                          ? `${ord.cod?.toLocaleString()} ៛`
                          : `$${ord.cod?.toFixed(2)}`}
                      </span>
                      {ord.driverPaymentStatus === 'paid' ? (
                        <span style={{ marginLeft: '4px', color: '#16a34a', fontWeight: '700' }}>(Paid)</span>
                      ) : (
                        <span style={{ marginLeft: '4px', color: '#ea580c', fontWeight: '700' }}>(Unpaid)</span>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: '#64748b' }}>Fee: </span>
                      <span style={{ fontWeight: '800', color: '#16a34a' }}>
                        +${ord.deliveryFee?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Statement / Reconciliation Modal */}
      {showStatementModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(5px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '14px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '400px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '20px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                  {t.statementSummary}
                </h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  {new Date().toLocaleDateString()} • {t[period] || period}
                </span>
              </div>
              <button
                onClick={() => setShowStatementModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <MdClose size={22} />
              </button>
            </div>

            {/* Driver Info */}
            <div style={{
              backgroundColor: '#f8fafc',
              padding: '12px',
              borderRadius: '12px',
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div><strong>{lang === 'km' ? 'ឈ្មោះអ្នកដឹក' : 'Driver'}:</strong> {driver?.name} ({driver?.phone})</div>
              {driver?.vehicle && <div><strong>{lang === 'km' ? 'មធ្យោបាយ' : 'Vehicle'}:</strong> {driver.vehicle}</div>}
              {driver?.zone && <div><strong>{lang === 'km' ? 'តំបន់' : 'Zone'}:</strong> {driver.zone}</div>}
            </div>

            {/* Summary Breakdown Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>{t.totalOrders}:</span>
                <span style={{ fontWeight: '800' }}>{summary?.totalOrders || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>{t.delivered}:</span>
                <span style={{ fontWeight: '800', color: '#16a34a' }}>{summary?.totalDelivered || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>{t.failed} / {t.returned}:</span>
                <span style={{ fontWeight: '800', color: '#dc2626' }}>
                  {(summary?.totalFailed || 0) + (summary?.totalReturned || 0)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>{t.deliveryFeeEarned}:</span>
                <span style={{ fontWeight: '800', color: '#2563eb' }}>${summary?.deliveryFeeTotal?.toFixed(2)}</span>
              </div>
            </div>

            {/* Pending Handover Highlight */}
            <div style={{
              backgroundColor: '#fff7ed',
              border: '1px solid #fed7aa',
              padding: '12px',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#9a3412' }}>
                {t.totalCashToHandover}:
              </span>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '900', color: '#c2410c' }}>
                <span>USD: ${summary?.cod?.usd?.pendingCollection?.toFixed(2) || '0.00'}</span>
                <span>KHR: {summary?.cod?.khr?.pendingCollection?.toLocaleString() || '0'} ៛</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                onClick={() => window.print()}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: '800',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <MdPrint size={16} />
                <span>{t.printSummary}</span>
              </button>

              <button
                onClick={() => setShowStatementModal(false)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
