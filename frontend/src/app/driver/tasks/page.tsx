'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { isAuthenticated, getUser } from '@/lib/auth';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdQrCodeScanner,
  MdSearch,
  MdInventory2,
  MdChevronRight,
  MdCall,
  MdLocationOn,
  MdCheckCircle,
  MdError,
  MdReplay,
  MdDirections,
  MdClose,
  MdRefresh,
  MdLocalShipping,
  MdSchedule,
} from 'react-icons/md';

const taskTranslations = {
  en: {
    title: 'Task',
    searchPlaceholder: 'Search parcel, order code, phone...',
    all: 'All',
    pending: 'Pending',
    delivered: 'Delivered',
    failed: 'Failed',
    returned: 'Returned',
    delivery: 'Delivery',
    return: 'Return',
    pickup: 'Pickup',
    noTasks: 'No tasks found',
    noTasksSub: 'No parcels matching current filter or search criteria.',
    codToCollect: 'COD to Collect',
    deliveryFee: 'Delivery Fee',
    customer: 'Receiver',
    merchant: 'Merchant',
    address: 'Address',
    call: 'Call',
    directions: 'Map',
    startDelivery: 'Start Delivery',
    markDelivered: 'Mark Delivered',
    reportIssue: 'Report Issue',
    scanQrTitle: 'Scan QR Code',
    scanQrDesc: 'Scan tracking QR to claim or update parcel',
    scanCodePlaceholder: 'Enter or scan tracking code...',
    btnScanClaim: 'Claim Parcel',
    btnCancel: 'Cancel',
    statusSuccess: 'Parcel updated successfully',
    issueDialogTitle: 'Report Delivery Issue',
    issueReasonPlaceholder: 'Enter reason (e.g. unreachable, wrong address)...',
    btnConfirmFailed: 'Delivery Failed',
    btnConfirmReturn: 'Return Parcel',
  },
  km: {
    title: 'ភារកិច្ច',
    searchPlaceholder: 'ស្វែងរក Tracking, លេខកូដ ឬទូរស័ព្ទ...',
    all: 'ទាំងអស់',
    pending: 'រង់ចាំដឹក',
    delivered: 'ជោគជ័យ',
    failed: 'មិនបានសម្រេច',
    returned: 'ត្រឡប់',
    delivery: 'ដឹកជញ្ជូន',
    return: 'ត្រឡប់',
    pickup: 'ទទួលអីវ៉ាន់',
    noTasks: 'មិនមានកញ្ចប់អីវ៉ាន់ទេ',
    noTasksSub: 'មិនមានកញ្ចប់អីវ៉ាន់ដែលត្រូវនឹងការស្វែងរក ឬផ្ទាំងនេះឡើយ។',
    codToCollect: 'ប្រាក់ត្រូវប្រមូល COD',
    deliveryFee: 'ថ្លៃដឹកជញ្ជូន',
    customer: 'អ្នកទទួល',
    merchant: 'ហាង / អ្នកផ្ញើ',
    address: 'អាសយដ្ឋាន',
    call: 'ហៅទូរស័ព្ទ',
    directions: 'ផែនទី',
    startDelivery: 'ចាប់ផ្ដើមដឹក',
    markDelivered: 'ប្រគល់ជោគជ័យ',
    reportIssue: 'រាយការណ៍បញ្ហា',
    scanQrTitle: 'ស្កេន QR កូដ',
    scanQrDesc: 'ស្កេន QR កូដលើកញ្ចប់ដើម្បីទទួលយក ឬកែប្រែស្ថានភាព',
    scanCodePlaceholder: 'បញ្ចូល ឬស្កេនលេខ Tracking...',
    btnScanClaim: 'ទទួលយកកញ្ចប់អីវ៉ាន់',
    btnCancel: 'បោះបង់',
    statusSuccess: 'បានកែប្រែទិន្នន័យដោយជោគជ័យ',
    issueDialogTitle: 'រាយការណ៍បញ្ហាការដឹកជញ្ជូន',
    issueReasonPlaceholder: 'បញ្ជាក់មូលហេតុ (ឧ. ទាក់ទងមិនបាន, មិននៅផ្ទះ)...',
    btnConfirmFailed: 'ដឹកមិនបានសម្រេច',
    btnConfirmReturn: 'ប្រគល់អីវ៉ាន់ត្រឡប់',
  },
};

export default function DriverTasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();

  const [tasks, setTasks] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({
    all: 0,
    pending: 0,
    delivered: 0,
    failed: 0,
    returned: 0,
  });
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'delivered' | 'failed' | 'returned'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [manualScanCode, setManualScanCode] = useState('');
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Issue reporting modal
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueRemark, setIssueRemark] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const t = taskTranslations[lang as 'en' | 'km'] || taskTranslations.en;

  const loadTasksAndCounts = async (tab = activeTab, query = searchQuery) => {
    try {
      const [tasksRes, countsRes] = await Promise.all([
        api.get(`/mobile/driver/tasks?status=${tab}&search=${encodeURIComponent(query)}`),
        api.get(`/mobile/driver/tasks/status-counts?search=${encodeURIComponent(query)}`),
      ]);

      const taskList = Array.isArray(tasksRes.data)
        ? tasksRes.data
        : tasksRes.data?.result || tasksRes.data?.data || [];
      setTasks(taskList);

      const rawCounts = countsRes.data || {};
      setCounts({
        all: rawCounts.all || 0,
        pending: (rawCounts.pending || 0) + (rawCounts.assigned || 0) + (rawCounts.inTransit || 0),
        delivered: rawCounts.delivered || 0,
        failed: rawCounts.failed || 0,
        returned: rawCounts.returned || 0,
      });
    } catch (err) {
      console.error('Failed to load driver tasks', err);
      setTasks([]);
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

    if (searchParams.get('scan') === 'true') {
      setShowScannerModal(true);
    }

    loadTasksAndCounts(activeTab, searchQuery);
  }, [router, activeTab]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    loadTasksAndCounts(activeTab, val);
  };

  const handleTabChange = (tab: 'all' | 'pending' | 'delivered' | 'failed' | 'returned') => {
    setActiveTab(tab);
    setLoading(true);
    loadTasksAndCounts(tab, searchQuery);
  };

  const handleUpdateStatus = async (taskId: number, newStatus: string, note = '') => {
    setActionLoading(true);
    try {
      await api.patch(`/mobile/driver/tasks/${taskId}/status`, {
        status: newStatus,
        note,
      });
      setSelectedTask(null);
      setShowIssueModal(false);
      setIssueRemark('');
      loadTasksAndCounts(activeTab, searchQuery);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClaimScanned = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualScanCode.trim()) return;
    setActionLoading(true);
    setScanMessage(null);
    try {
      const res = await api.post('/mobile/driver/scan/claim', { code: manualScanCode.trim() });
      setScanMessage({
        type: 'success',
        text: res.data?.message || (lang === 'km' ? 'បានទទួលយកកញ្ចប់អីវ៉ាន់ដោយជោគជ័យ' : 'Parcel claimed successfully'),
      });
      setManualScanCode('');
      loadTasksAndCounts(activeTab, searchQuery);
    } catch (err: any) {
      setScanMessage({
        type: 'error',
        text: err.response?.data?.message || (lang === 'km' ? 'រកមិនឃើញកញ្ចប់អីវ៉ាន់ ឬត្រូវចាត់តាំងរួចហើយ' : 'Parcel not found or already assigned'),
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'delivered') {
      return { bg: '#ecfdf5', color: '#16a34a', text: lang === 'km' ? 'ជោគជ័យ' : 'Delivered' };
    }
    if (s === 'failed' || s === 'problem') {
      return { bg: '#fef2f2', color: '#dc2626', text: lang === 'km' ? 'បរាជ័យ' : 'Failed' };
    }
    if (s === 'returned' || s === 'rejected') {
      return { bg: '#faf5ff', color: '#9333ea', text: lang === 'km' ? 'ត្រឡប់' : 'Returned' };
    }
    if (s === 'in-transit') {
      return { bg: '#eff6ff', color: '#2563eb', text: lang === 'km' ? 'កំពុងដឹក' : 'In Transit' };
    }
    return { bg: '#fffbeb', color: '#d97706', text: lang === 'km' ? 'រង់ចាំ' : 'Pending' };
  };

  const getTypeBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'returned' || s === 'rejected') {
      return { bg: '#eff6ff', color: '#2563eb', text: t.return };
    }
    return { bg: '#eff6ff', color: '#2563eb', text: t.delivery };
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f8fafc',
      minHeight: '100vh',
      fontFamily: "'Kantumruy Pro', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* 1. Header (Deep Blue) */}
      <div style={{
        background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
        padding: '24px 20px 20px',
        color: '#ffffff',
        borderBottomLeftRadius: '28px',
        borderBottomRightRadius: '28px',
        boxShadow: '0 10px 25px rgba(29, 78, 216, 0.2)',
      }}>
        {/* Title & QR Scan Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: '900',
            margin: 0,
            letterSpacing: '-0.3px',
          }}>
            {t.title}
          </h1>

          <button
            type="button"
            onClick={() => setShowScannerModal(true)}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'transform 0.15s',
            }}
          >
            <MdQrCodeScanner size={22} />
          </button>
        </div>

        {/* Search Bar */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          padding: '0 14px',
          height: '46px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        }}>
          <MdSearch size={22} color="#94a3b8" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={t.searchPlaceholder}
            style={{
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              width: '100%',
              fontSize: '13.5px',
              fontWeight: '500',
              color: '#0f172a',
            }}
          />
          <button
            type="button"
            onClick={() => setShowScannerModal(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}
          >
            <MdQrCodeScanner size={18} />
          </button>
        </div>
      </div>

      {/* 2. Filter Tabs (Horizontal Pills) */}
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '16px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}>
        {[
          { key: 'all', label: t.all, count: counts.all },
          { key: 'pending', label: t.pending, count: counts.pending },
          { key: 'delivered', label: t.delivered, count: counts.delivered },
          { key: 'failed', label: t.failed, count: counts.failed },
          { key: 'returned', label: t.returned, count: counts.returned },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: isActive ? '#1e60ff' : '#f1f5f9',
                color: isActive ? '#ffffff' : '#64748b',
                fontSize: '13px',
                fontWeight: isActive ? '700' : '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: isActive ? '0 4px 12px rgba(30, 96, 255, 0.25)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                fontSize: '11.5px',
                opacity: 0.9,
              }}>
                ({tab.count})
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Parcel Tasks List */}
      <div style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: '13.5px' }}>
            Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '36px 20px',
            textAlign: 'center',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
            }}>
              <MdInventory2 size={26} />
            </div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{t.noTasks}</div>
            <div style={{ fontSize: '12px', color: '#64748b', maxWidth: '260px' }}>{t.noTasksSub}</div>
          </div>
        ) : (
          tasks.map((task: any) => {
            const statusBadge = getStatusBadge(task.status);
            const typeBadge = getTypeBadge(task.status);
            const merchantName = task.merchant?.name || task.merchant?.nameKh || task.receiverName || 'Merchant Store';
            const locationAddress = task.receiverAddress || 'Phnom Penh';

            return (
              <div
                key={task.id}
                onClick={() => router.push(`/driver/tasks/${task.id}`)}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '18px',
                  padding: '14px 16px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                {/* Left side: Icon + Information */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  {/* Orange Warm Box Container */}
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '14px',
                    backgroundColor: '#ffedd5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ea580c',
                    flexShrink: 0,
                  }}>
                    <MdInventory2 size={24} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                    <div style={{
                      fontSize: '13.5px',
                      fontWeight: '800',
                      color: '#0f172a',
                    }}>
                      #{task.trackingCode}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#475569',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {merchantName}
                    </div>
                    <div style={{
                      fontSize: '11.5px',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      <MdLocationOn size={14} style={{ flexShrink: 0 }} />
                      <span>{locationAddress}</span>
                    </div>
                  </div>
                </div>

                {/* Right side: Status Badge + Type Tag + Chevron */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                  {/* Status Tag */}
                  <span style={{
                    backgroundColor: statusBadge.bg,
                    color: statusBadge.color,
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '4px 8px',
                    borderRadius: '14px',
                  }}>
                    {statusBadge.text}
                  </span>

                  {/* Delivery / Return Tag */}
                  <span style={{
                    backgroundColor: typeBadge.bg,
                    color: typeBadge.color,
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '4px 8px',
                    borderRadius: '14px',
                  }}>
                    {typeBadge.text}
                  </span>

                  <MdChevronRight size={18} color="#94a3b8" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Task Details Action Modal */}
      {selectedTask && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderTopLeftRadius: '28px',
            borderTopRightRadius: '28px',
            padding: '24px 20px 32px',
            width: '100%',
            maxWidth: '480px',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.2)',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <div>
                <div style={{ fontSize: '17px', fontWeight: '900', color: '#0f172a' }}>
                  #{selectedTask.trackingCode}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  {selectedTask.merchant?.name || 'Merchant Order'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <MdClose size={24} />
              </button>
            </div>

            {/* Info Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {/* Receiver Info */}
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '14px',
                padding: '12px 14px',
                border: '1px solid #e2e8f0',
              }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                  {t.customer}
                </div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                  {selectedTask.receiverName || 'Customer'} • {selectedTask.receiverPhone}
                </div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                  {selectedTask.receiverAddress}
                </div>
              </div>

              {/* Financials (COD & Delivery Fee) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
              }}>
                <div style={{
                  backgroundColor: '#fff7ed',
                  borderRadius: '14px',
                  padding: '12px',
                  border: '1px solid #fed7aa',
                }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#ea580c' }}>
                    {t.codToCollect}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '900', color: '#c2410c', marginTop: '2px' }}>
                    ${Number(selectedTask.cod || 0).toFixed(2)} {selectedTask.codCurrency || 'USD'}
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#f0fdf4',
                  borderRadius: '14px',
                  padding: '12px',
                  border: '1px solid #bbf7d0',
                }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#16a34a' }}>
                    {t.deliveryFee}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '900', color: '#15803d', marginTop: '2px' }}>
                    ${Number(selectedTask.deliveryFee || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions (Call, Map) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <a
                href={`tel:${selectedTask.receiverPhone}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  borderRadius: '14px',
                  fontWeight: '700',
                  fontSize: '13.5px',
                  textDecoration: 'none',
                  border: '1px solid #bfdbfe',
                }}
              >
                <MdCall size={18} />
                <span>{t.call}</span>
              </a>

              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(selectedTask.receiverAddress || 'Phnom Penh')}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  borderRadius: '14px',
                  fontWeight: '700',
                  fontSize: '13.5px',
                  textDecoration: 'none',
                  border: '1px solid #cbd5e1',
                }}
              >
                <MdDirections size={18} />
                <span>{t.directions}</span>
              </a>
            </div>

            {/* Status Transition Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedTask.status !== 'delivered' && (
                <>
                  {selectedTask.status !== 'in-transit' && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleUpdateStatus(selectedTask.id, 'in-transit')}
                      style={{
                        padding: '14px',
                        backgroundColor: '#1e60ff',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '14px',
                        fontSize: '14.5px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(30, 96, 255, 0.3)',
                      }}
                    >
                      {t.startDelivery}
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus(selectedTask.id, 'delivered')}
                    style={{
                      padding: '14px',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '14px',
                      fontSize: '14.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
                    }}
                  >
                    {t.markDelivered}
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setShowIssueModal(true)}
                    style={{
                      padding: '12px',
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      borderRadius: '14px',
                      fontSize: '13.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    {t.reportIssue}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Issue / Failed / Return Modal */}
      {showIssueModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '24px',
            width: '100%',
            maxWidth: '380px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                {t.issueDialogTitle}
              </span>
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <MdClose size={22} />
              </button>
            </div>

            <textarea
              rows={3}
              value={issueRemark}
              onChange={(e) => setIssueRemark(e.target.value)}
              placeholder={t.issueReasonPlaceholder}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: '1.5px solid #e2e8f0',
                fontSize: '13.5px',
                outline: 'none',
                marginBottom: '16px',
                resize: 'none',
              }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleUpdateStatus(selectedTask.id, 'failed', issueRemark)}
                style={{
                  padding: '12px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                {t.btnConfirmFailed}
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleUpdateStatus(selectedTask.id, 'returned', issueRemark)}
                style={{
                  padding: '12px',
                  backgroundColor: '#9333ea',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                {t.btnConfirmReturn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner / Claim Modal */}
      {showScannerModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '28px',
            padding: '24px',
            width: '100%',
            maxWidth: '380px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '17px', fontWeight: '900', color: '#0f172a' }}>
                {t.scanQrTitle}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowScannerModal(false);
                  setScanMessage(null);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <MdClose size={24} />
              </button>
            </div>

            <p style={{ fontSize: '12.5px', color: '#64748b', marginTop: 0, marginBottom: '16px' }}>
              {t.scanQrDesc}
            </p>

            {/* QR Viewfinder Target Simulation */}
            <div style={{
              height: '160px',
              backgroundColor: '#0f172a',
              borderRadius: '18px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8',
              marginBottom: '16px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <MdQrCodeScanner size={64} />
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
                Position QR code inside box
              </div>
            </div>

            {scanMessage && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '12px',
                fontSize: '12.5px',
                fontWeight: '600',
                marginBottom: '12px',
                backgroundColor: scanMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
                color: scanMessage.type === 'success' ? '#16a34a' : '#dc2626',
              }}>
                {scanMessage.text}
              </div>
            )}

            <form onSubmit={handleClaimScanned}>
              <input
                type="text"
                value={manualScanCode}
                onChange={(e) => setManualScanCode(e.target.value)}
                placeholder={t.scanCodePlaceholder}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '14px',
                  outline: 'none',
                  marginBottom: '12px',
                }}
              />

              <button
                type="submit"
                disabled={actionLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#1e60ff',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(30, 96, 255, 0.3)',
                }}
              >
                {actionLoading ? 'Claiming...' : t.btnScanClaim}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
