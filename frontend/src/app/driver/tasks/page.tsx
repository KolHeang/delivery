'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getUser } from '@/lib/auth';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdCall,
  MdLocationOn,
  MdCheckCircle,
  MdError,
  MdLocalShipping,
  MdArrowBack,
  MdInfoOutline,
  MdRefresh,
  MdSearch,
  MdContentCopy,
  MdDirections,
  MdClose,
  MdStore,
  MdPerson,
  MdAttachMoney,
  MdInventory2,
  MdSchedule
} from 'react-icons/md';
import Badge from '@/components/ui/Badge';

const taskTranslations = {
  en: {
    title: 'My Tasks',
    activeTab: 'Active Tasks',
    completedTab: 'Completed',
    noTasks: 'No Tasks Assigned Yet',
    noTasksSub: 'You currently do not have any parcels assigned. New delivery tasks will appear here automatically.',
    loading: 'Loading tasks...',
    cod: 'COD to Collect',
    fee: 'Delivery Fee',
    note: 'Special Note',
    btnPickup: 'Start Pick Up',
    btnDeliver: 'Mark Delivered',
    btnProblem: 'Report Issue / Return',
    btnInTransit: 'Start Delivery',
    updating: 'Updating...',
    dialogTitle: 'Report Delivery Issue',
    dialogDesc: 'Please select the issue reason for this parcel:',
    remarkLabel: 'Reason / Remark',
    remarkPlaceholder: 'Enter details (e.g. customer unreachable, wrong address, rejected)...',
    btnFailed: 'Delivery Failed',
    btnReturned: 'Return Package',
    btnPostpone: 'Postpone to Tomorrow',
    btnCancel: 'Cancel',
    customer: 'Customer',
    merchant: 'Merchant / Shop',
    waitingHubReceive: 'Collected - Waiting Hub Receive',
    searchPlaceholder: 'Search tracking code, receiver, phone...',
    filterAll: 'All',
    filterAssigned: 'Assigned',
    filterInTransit: 'In Transit',
    filterDelivered: 'Delivered',
    filterFailed: 'Failed',
    filterReturned: 'Returned',
    copied: 'Copied!',
    callNow: 'Call',
    itemsCount: 'tasks',
    btnRefresh: 'Refresh List',
    btnGoDashboard: 'Go to Dashboard',
    btnGoPickup: 'Go to Pickups'
  },
  km: {
    title: 'ភារកិច្ចដឹកជញ្ជូន',
    activeTab: 'កំពុងដឹក & ចាត់តាំង',
    completedTab: 'រួចរាល់',
    noTasks: 'មិនទាន់មានកញ្ចប់អីវ៉ាន់ទេ',
    noTasksSub: 'មិនទាន់មានកញ្ចប់អីវ៉ាន់ត្រូវបានចាត់តាំងនៅឡើយទេ។ កញ្ចប់អីវ៉ាន់ថ្មីនឹងបង្ហាញនៅទីនេះដោយស្វ័យប្រវត្តិ។',
    loading: 'កំពុងផ្ទុកទិន្នន័យ...',
    cod: 'ប្រាក់ត្រូវប្រមូល (COD)',
    fee: 'ថ្លៃដឹក',
    note: 'ចំណាំពិសេស',
    btnPickup: 'ចាប់ផ្តើមទទួលអីវ៉ាន់',
    btnDeliver: 'ប្រគល់ជោគជ័យ',
    btnProblem: 'រាយការណ៍បញ្ហា / ត្រឡប់',
    btnInTransit: 'ចាប់ផ្ដើមដឹកជញ្ជូន',
    updating: 'កំពុងដំណើរការ...',
    dialogTitle: 'រាយការណ៍បញ្ហាការដឹកជញ្ជូន',
    dialogDesc: 'សូមជ្រើសរើសមូលហេតុបញ្ហាសម្រាប់កញ្ចប់អីវ៉ាន់នេះ៖',
    remarkLabel: 'មូលហេតុ / ការបញ្ជាក់',
    remarkPlaceholder: 'បញ្ជាក់មូលហេតុ (ឧ. ទាក់ទងមិនបាន, មិននៅផ្ទះ, បដិសេធទទួល)...',
    btnFailed: 'ដឹកមិនបានសម្រេច',
    btnReturned: 'ប្រគល់អីវ៉ាន់ត្រឡប់',
    btnPostpone: 'លើកថ្ងៃដឹកទៅស្អែក',
    btnCancel: 'បោះបង់',
    customer: 'អតិថិជនទទួល',
    merchant: 'ហាង / អ្នកផ្ញើ',
    waitingHubReceive: 'បានប្រមូល - រង់ចាំទទួលចូលឃ្លាំង',
    searchPlaceholder: 'ស្វែងរក Tracking, ឈ្មោះ ឬលេខទូរស័ព្ទ...',
    filterAll: 'ទាំងអស់',
    filterAssigned: 'ទើបចាត់តាំង',
    filterInTransit: 'កំពុងដឹក',
    filterDelivered: 'ជោគជ័យ',
    filterFailed: 'មិនបានសម្រេច',
    filterReturned: 'ត្រឡប់',
    copied: 'បានចម្លង!',
    callNow: 'ហៅទូរស័ព្ទ',
    itemsCount: 'កញ្ចប់',
    btnRefresh: 'ពិនិត្យមើលម្ដងទៀត',
    btnGoDashboard: 'ទៅផ្ទាំងដើម',
    btnGoPickup: 'ទៅទទួលអីវ៉ាន់'
  }
};

export default function DriverTasksPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Problem Dialog state
  const [problemDialogOpen, setProblemDialogOpen] = useState(false);
  const [selectedTaskForProblem, setSelectedTaskForProblem] = useState<any>(null);
  const [problemRemark, setProblemRemark] = useState('');

  const t = taskTranslations[lang as 'en' | 'km'] || taskTranslations.en;

  const loadTasks = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.get('/mobile/driver/tasks');
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setTasks(list);
    } catch (err) {
      console.error('Failed to load driver tasks', err);
      setTasks([]);
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
    const currentUser = getUser();
    setUser(currentUser);
    loadTasks();
  }, [router]);

  const updateStatus = async (taskId: number, status: string, remark?: string) => {
    setUpdatingId(taskId);
    try {
      await api.patch(`/mobile/driver/tasks/${taskId}/status`, {
        status,
        note: remark || undefined,
        remark: remark || undefined,
      });
      await loadTasks();
      if (problemDialogOpen) {
        setProblemDialogOpen(false);
        setSelectedTaskForProblem(null);
        setProblemRemark('');
      }
    } catch (err: any) {
      console.error('Failed to update status', err);
      alert(err.response?.data?.message || 'Failed to update task status');
    } finally {
      setUpdatingId(null);
    }
  };

  const openProblemDialog = (task: any) => {
    setSelectedTaskForProblem(task);
    setProblemRemark('');
    setProblemDialogOpen(true);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isActiveTask = (task: any) => {
    return ['pending', 'assigned', 'in-transit', 'in-warehouse'].includes(task.status);
  };

  const isCompletedTask = (task: any) => {
    return ['delivered', 'failed', 'returned'].includes(task.status);
  };

  const taskList = Array.isArray(tasks) ? tasks : [];

  // Filter tasks based on activeTab, search query, and status chip
  const filteredTasks = taskList.filter((task) => {
    const tabMatch = activeTab === 'active' ? isActiveTask(task) : isCompletedTask(task);
    if (!tabMatch) return false;

    if (statusFilter !== 'all') {
      if (task.status !== statusFilter) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTracking = task.trackingCode?.toLowerCase().includes(q);
      const matchReceiver = task.receiverName?.toLowerCase().includes(q);
      const matchPhone = task.receiverPhone?.toLowerCase().includes(q);
      const matchMerchant = task.merchant?.name?.toLowerCase().includes(q);
      const matchAddress = task.receiverAddress?.toLowerCase().includes(q);
      return matchTracking || matchReceiver || matchPhone || matchMerchant || matchAddress;
    }

    return true;
  });

  const activeTasksCount = taskList.filter(isActiveTask).length;
  const completedTasksCount = taskList.filter(isCompletedTask).length;

  const getStatusCount = (status: string) => {
    if (status === 'all') return activeTab === 'active' ? activeTasksCount : completedTasksCount;
    return taskList.filter(t => t.status === status).length;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: "'Kantumruy Pro', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      paddingBottom: '84px',
      position: 'relative'
    }}>
      {/* ── 1. Top Header Bar (Clean White, High Legibility) ── */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '14px 18px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => router.push('/driver/dashboard')}
            style={{
              width: '38px',
              height: '38px',
              backgroundColor: '#f1f5f9',
              borderRadius: '12px',
              border: 'none',
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <MdArrowBack size={20} />
          </button>

          <div>
            <h1 style={{
              fontSize: '18px',
              fontWeight: '900',
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.3px',
              lineHeight: 1.2
            }}>
              {t.title}
            </h1>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>
              {activeTab === 'active' ? `${activeTasksCount} ${t.itemsCount}` : `${completedTasksCount} ${t.itemsCount}`}
            </span>
          </div>
        </div>

        {/* 1-Tap Refresh Button */}
        <button
          onClick={() => loadTasks(true)}
          disabled={refreshing}
          style={{
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            border: '1px solid #bfdbfe',
            padding: '8px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
        >
          <MdRefresh size={18} style={{ animation: refreshing ? 'spinRefresh 0.8s linear infinite' : 'none' }} />
          <span>{lang === 'km' ? 'ផ្ទុកឡើងវិញ' : 'Refresh'}</span>
        </button>
      </div>

      {/* ── 2. Sticky Tab & Filter Controls Header ── */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '12px 16px 14px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {/* Dual Segmented Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: '#f1f5f9',
          borderRadius: '14px',
          padding: '4px',
          gap: '4px'
        }}>
          <button
            onClick={() => { setActiveTab('active'); setStatusFilter('all'); }}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'active' ? '#2563eb' : 'transparent',
              color: activeTab === 'active' ? '#ffffff' : '#64748b',
              fontWeight: activeTab === 'active' ? '800' : '700',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: activeTab === 'active' ? '0 2px 8px rgba(37, 99, 235, 0.3)' : 'none'
            }}
          >
            <span>{t.activeTab}</span>
            <span style={{
              fontSize: '11px',
              padding: '2px 7px',
              borderRadius: '20px',
              backgroundColor: activeTab === 'active' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
              color: activeTab === 'active' ? '#ffffff' : '#475569',
              fontWeight: '900'
            }}>
              {activeTasksCount}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('completed'); setStatusFilter('all'); }}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'completed' ? '#2563eb' : 'transparent',
              color: activeTab === 'completed' ? '#ffffff' : '#64748b',
              fontWeight: activeTab === 'completed' ? '800' : '700',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: activeTab === 'completed' ? '0 2px 8px rgba(37, 99, 235, 0.3)' : 'none'
            }}
          >
            <span>{t.completedTab}</span>
            <span style={{
              fontSize: '11px',
              padding: '2px 7px',
              borderRadius: '20px',
              backgroundColor: activeTab === 'completed' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
              color: activeTab === 'completed' ? '#ffffff' : '#475569',
              fontWeight: '900'
            }}>
              {completedTasksCount}
            </span>
          </button>
        </div>

        {/* Clean Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          border: '1.5px solid #e2e8f0',
          padding: '8px 12px',
          gap: '8px'
        }}>
          <MdSearch size={20} color="#94a3b8" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              fontSize: '13px',
              fontWeight: '600',
              color: '#0f172a',
              fontFamily: 'inherit'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: '#e2e8f0',
                border: 'none',
                color: '#64748b',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <MdClose size={14} />
            </button>
          )}
        </div>

        {/* Horizontally Scrollable Status Chips */}
        <div style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '2px',
          scrollbarWidth: 'none'
        }}>
          {(activeTab === 'active'
            ? [
                { key: 'all', label: t.filterAll },
                { key: 'assigned', label: t.filterAssigned },
                { key: 'in-transit', label: t.filterInTransit },
                { key: 'pending', label: 'Pending' }
              ]
            : [
                { key: 'all', label: t.filterAll },
                { key: 'delivered', label: t.filterDelivered },
                { key: 'failed', label: t.filterFailed },
                { key: 'returned', label: t.filterReturned }
              ]
          ).map((chip) => {
            const isSelected = statusFilter === chip.key;
            const count = getStatusCount(chip.key);
            return (
              <button
                key={chip.key}
                onClick={() => setStatusFilter(chip.key)}
                style={{
                  flexShrink: 0,
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: isSelected ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                  color: isSelected ? '#2563eb' : '#64748b',
                  fontWeight: isSelected ? '800' : '600',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{chip.label}</span>
                <span style={{
                  fontSize: '10.5px',
                  fontWeight: '900',
                  color: isSelected ? '#2563eb' : '#94a3b8'
                }}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. Main Content / Task Cards Area ── */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {loading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 0'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              border: '3.5px solid rgba(37, 99, 235, 0.15)',
              borderTopColor: '#2563eb',
              borderRadius: '50%',
              animation: 'spinRefresh 0.8s linear infinite',
              marginBottom: '12px'
            }} />
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>
              {t.loading}
            </span>
          </div>
        ) : filteredTasks.length === 0 ? (
          /* ── Improved, Friendly Empty State ── */
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '36px 20px',
            textAlign: 'center',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{
              width: '74px',
              height: '74px',
              borderRadius: '24px',
              backgroundColor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              marginBottom: '16px',
              boxShadow: '0 8px 20px rgba(37, 99, 235, 0.12)'
            }}>
              📦
            </div>

            <h3 style={{ fontSize: '17px', fontWeight: '900', color: '#0f172a', margin: '0 0 6px' }}>
              {t.noTasks}
            </h3>
            <p style={{
              fontSize: '13px',
              color: '#64748b',
              margin: '0 0 24px',
              maxWidth: '300px',
              lineHeight: 1.55,
              fontWeight: '500'
            }}>
              {t.noTasksSub}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '280px' }}>
              <button
                onClick={() => loadTasks(true)}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 18px',
                  borderRadius: '14px',
                  fontSize: '13.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)'
                }}
              >
                <MdRefresh size={18} /> {t.btnRefresh}
              </button>

              <button
                onClick={() => router.push('/driver/pickups')}
                style={{
                  backgroundColor: '#f8fafc',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '11px 18px',
                  borderRadius: '14px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <MdInventory2 size={16} /> {t.btnGoPickup}
              </button>
            </div>
          </div>
        ) : (
          /* ── Task Delivery Cards (High Contrast & Ergonomic) ── */
          filteredTasks.map((task) => {
            const isPickupTask = task.pickupDriverId === user?.id;
            const isDeliveryTask = task.driverId === user?.id;
            const codNum = Number(task.cod) || 0;
            const feeNum = Number(task.deliveryFee) || 0;

            return (
              <div
                key={task.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '20px',
                  border: '1.5px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* 1. Task Card Header */}
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '13.5px',
                      fontWeight: '900',
                      color: '#0f172a',
                      fontFamily: 'monospace',
                      letterSpacing: '-0.2px'
                    }}>
                      {task.trackingCode || `TASK-#${task.id}`}
                    </span>
                    <button
                      onClick={() => handleCopy(task.trackingCode)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: copiedId === task.trackingCode ? '#16a34a' : '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '2px'
                      }}
                      title="Copy Tracking"
                    >
                      {copiedId === task.trackingCode ? (
                        <span style={{ fontSize: '11px', fontWeight: '800' }}>✓ {t.copied}</span>
                      ) : (
                        <MdContentCopy size={15} />
                      )}
                    </button>
                  </div>

                  <Badge status={task.status} />
                </div>

                {/* 2. Card Body: Customer & Destination Info */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                  {/* Customer Information with Instant Call Button */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>
                        {t.customer}
                      </div>
                      {task.receiverName && task.receiverName !== '-' && task.receiverName !== '—' && (
                        <div style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a' }}>
                          {task.receiverName}
                        </div>
                      )}
                      {task.receiverAddress && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '4px',
                          color: '#475569',
                          fontSize: '12.5px',
                          marginTop: (task.receiverName && task.receiverName !== '-' && task.receiverName !== '—') ? '4px' : '0px',
                          lineHeight: 1.4
                        }}>
                          <MdLocationOn size={16} color="#f97316" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>{task.receiverAddress} {task.zone?.name ? `(${task.zone.name})` : ''}</span>
                        </div>
                      )}
                    </div>

                    {/* Prominent One-Tap Call Button */}
                    {task.receiverPhone && (
                      <a
                        href={`tel:${task.receiverPhone}`}
                        style={{
                          backgroundColor: '#ecfdf5',
                          color: '#059669',
                          border: '1.5px solid #a7f3d0',
                          padding: '8px 14px',
                          borderRadius: '14px',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          fontWeight: '900',
                          flexShrink: 0,
                          boxShadow: '0 2px 6px rgba(16, 185, 129, 0.15)'
                        }}
                      >
                        <MdCall size={16} />
                        <span>{t.callNow}</span>
                      </a>
                    )}
                  </div>

                  {/* Merchant / Shop Source Info (If available) */}
                  {task.merchant && (
                    <div style={{
                      backgroundColor: '#f8fafc',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      border: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      color: '#64748b'
                    }}>
                      <MdStore size={16} color="#64748b" />
                      <span style={{ fontWeight: '600' }}>{t.merchant}:</span>
                      <strong style={{ color: '#0f172a' }}>{task.merchant.name}</strong>
                      {task.merchant.phone && (
                        <a href={`tel:${task.merchant.phone}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '700', marginLeft: 'auto' }}>
                          📞 {task.merchant.phone}
                        </a>
                      )}
                    </div>
                  )}

                  {/* 3. COD Money Collection Box (High Contrast) */}
                  <div style={{
                    backgroundColor: codNum > 0 ? '#fff7ed' : '#f8fafc',
                    border: codNum > 0 ? '1.5px solid #ffedd5' : '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', color: codNum > 0 ? '#c2410c' : '#64748b', fontWeight: '800' }}>
                        💵 {t.cod}
                      </div>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: '900',
                        color: codNum > 0 ? '#ea580c' : '#0f172a',
                        marginTop: '2px'
                      }}>
                        {task.codCurrency === 'KHR'
                          ? `${codNum.toLocaleString()} ៛`
                          : `$${codNum.toFixed(2)}`}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>
                        {t.fee}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                        ${feeNum.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Special Delivery Note or Failure Remark */}
                  {task.note && (
                    <div style={{
                      backgroundColor: (task.status === 'failed' || task.status === 'returned') ? '#fee2e2' : '#fef3c7',
                      border: (task.status === 'failed' || task.status === 'returned') ? '1px solid #fca5a5' : '1px solid #fde68a',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      fontSize: '12.5px',
                      color: (task.status === 'failed' || task.status === 'returned') ? '#991b1b' : '#92400e',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <MdInfoOutline size={18} style={{ flexShrink: 0, color: (task.status === 'failed' || task.status === 'returned') ? '#dc2626' : '#d97706' }} />
                      <span>
                        <strong>{(task.status === 'failed' || task.status === 'returned') ? (lang === 'km' ? 'មូលហេតុមិនបានសម្រេច (Remark)' : 'Failure Reason / Remark') : t.note}:</strong> {task.note}
                      </span>
                    </div>
                  )}
                </div>

                {/* 4. Action Buttons Footer */}
                {isActiveTask(task) && (
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: '#ffffff',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    gap: '10px'
                  }}>
                    {/* Role: Pickup Driver */}
                    {isPickupTask && task.status === 'pending' && (
                      <button
                        onClick={() => updateStatus(task.id, 'in-warehouse')}
                        disabled={updatingId === task.id}
                        style={{
                          flex: 1,
                          backgroundColor: '#059669',
                          color: '#ffffff',
                          border: 'none',
                          padding: '13px',
                          borderRadius: '14px',
                          fontWeight: '800',
                          fontSize: '14px',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                        }}
                      >
                        {updatingId === task.id ? t.updating : t.btnPickup}
                      </button>
                    )}

                    {/* Role: Delivery Driver */}
                    {isDeliveryTask && (
                      <>
                        {(task.status === 'assigned' || task.status === 'pending' || task.status === 'in-warehouse') && (
                          <button
                            onClick={() => updateStatus(task.id, 'in-transit')}
                            disabled={updatingId === task.id}
                            style={{
                              flex: 1,
                              backgroundColor: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              padding: '13px',
                              borderRadius: '14px',
                              fontWeight: '800',
                              fontSize: '14px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                            }}
                          >
                            <MdLocalShipping size={18} />
                            <span>{updatingId === task.id ? t.updating : t.btnInTransit}</span>
                          </button>
                        )}

                        {task.status === 'in-transit' && (
                          <>
                            <button
                              onClick={() => updateStatus(task.id, 'delivered')}
                              disabled={updatingId === task.id}
                              style={{
                                flex: 2,
                                backgroundColor: '#16a34a',
                                color: '#ffffff',
                                border: 'none',
                                padding: '13px',
                                borderRadius: '14px',
                                fontWeight: '800',
                                fontSize: '14px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
                              }}
                            >
                              <MdCheckCircle size={18} />
                              <span>{updatingId === task.id ? t.updating : t.btnDeliver}</span>
                            </button>

                            <button
                              onClick={() => openProblemDialog(task)}
                              disabled={updatingId === task.id}
                              style={{
                                flex: 1,
                                backgroundColor: '#fff1f2',
                                color: '#e11d48',
                                border: '1.5px solid #fecdd3',
                                padding: '13px 8px',
                                borderRadius: '14px',
                                fontWeight: '800',
                                fontSize: '12.5px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              <MdError size={16} />
                              <span>{t.btnProblem}</span>
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── 4. Problem & Remark Modal ── */}
      {problemDialogOpen && selectedTaskForProblem && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
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
            borderRadius: '24px',
            width: '100%',
            maxWidth: '390px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
            border: '1px solid #e2e8f0',
            animation: 'popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '12px', backgroundColor: '#fff1f2',
                  color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <MdError size={20} />
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                  {t.dialogTitle}
                </h3>
              </div>
              <button
                onClick={() => setProblemDialogOpen(false)}
                style={{
                  width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f1f5f9',
                  border: 'none', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}
              >
                <MdClose size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 }}>
              {t.dialogDesc}
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '6px' }}>
                {t.remarkLabel}
              </label>
              <textarea
                value={problemRemark}
                onChange={(e) => setProblemRemark(e.target.value)}
                placeholder={t.remarkPlaceholder}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#f8fafc',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  resize: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => updateStatus(selectedTaskForProblem.id, 'failed', problemRemark)}
                disabled={updatingId === selectedTaskForProblem.id}
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                {t.btnFailed}
              </button>

              <button
                onClick={() => updateStatus(selectedTaskForProblem.id, 'returned', problemRemark)}
                disabled={updatingId === selectedTaskForProblem.id}
                style={{
                  backgroundColor: '#ea580c',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                {t.btnReturned}
              </button>

              <button
                onClick={() => setProblemDialogOpen(false)}
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                {t.btnCancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS keyframes */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes spinRefresh {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}} />
    </div>
  );
}
