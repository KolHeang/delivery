'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Skeleton';
import {
  MdSearch,
  MdCheckCircle,
  MdErrorOutline,
  MdWarning,
  MdContentCopy,
  MdVisibility,
  MdVisibilityOff,
  MdRefresh,
  MdSend,
  MdDelete,
  MdNotificationsActive,
  MdPhoneAndroid,
  MdPhoneIphone,
  MdClear,
  MdDevices,
  MdInfo,
} from 'react-icons/md';
import { FaRegEdit, FaTrashAlt, FaEye, FaAndroid, FaApple, FaPaperPlane } from 'react-icons/fa';
import { FiPlusCircle } from 'react-icons/fi';
import { SiFirebase } from 'react-icons/si';

interface FirebaseCredentialItem {
  id: string;
  type: string;
  projectId: string;
  privateKeyId: string;
  privateKey: string;
  clientEmail: string;
  clientId: string;
  authUri?: string;
  tokenUri?: string;
  authProviderX509CertUrl?: string;
  clientX509CertUrl?: string;
  universeDomain?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface FirebaseLogItem {
  id: number;
  tenantId?: number | null;
  recipientType: string;
  recipientId?: number | null;
  recipientName?: string | null;
  title: string;
  body: string;
  tokensCount: number;
  successCount: number;
  failureCount: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'SKIPPED';
  errorMessage?: string | null;
  dataPayload?: Record<string, any> | null;
  createdAt: string;
}

interface DeviceTokenItem {
  id: number;
  token: string;
  deviceType?: string | null;
  userId?: number | null;
  user?: {
    id: number;
    name: string;
    phone?: string;
    role?: string;
  } | null;
  merchantId?: number | null;
  merchant?: {
    id: number;
    name: string;
    phone?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export default function FirebaseSettingsListPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const isKh = lang === 'km';
  const tr = (km: string, en: string) => (isKh ? km : en);

  // Active Tab: 'credentials' | 'logs' | 'devices'
  const [activeTab, setActiveTab] = useState<'credentials' | 'logs' | 'devices'>('logs');

  // ── Credentials Data states ──
  const [items, setItems] = useState<FirebaseCredentialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // View Details Modal (Credentials)
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FirebaseCredentialItem | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  // ── Firebase Logs States ──
  const [logs, setLogs] = useState<FirebaseLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsSearch, setLogsSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [logsPage, setLogsPage] = useState(1);
  const [logsPageSize, setLogsPageSize] = useState(15);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Registered Mobile Devices States ──
  const [devices, setDevices] = useState<DeviceTokenItem[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [devicesSearch, setDevicesSearch] = useState('');
  const [devicesPage, setDevicesPage] = useState(1);
  const [devicesPageSize, setDevicesPageSize] = useState(15);

  // View Log Detail Modal
  const [selectedLog, setSelectedLog] = useState<FirebaseLogItem | null>(null);

  // Test Firebase Modal State
  const [showTestModal, setShowTestModal] = useState(false);
  const [testToken, setTestToken] = useState('');
  const [testTitle, setTestTitle] = useState('🔔 Firebase Push Test');
  const [testBody, setTestBody] = useState('Testing Firebase Cloud Messaging from Delivery Management');
  const [testingStatus, setTestingStatus] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    status: string;
    message: string;
    details?: any;
  } | null>(null);

  // Load Credentials list
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings/firebase');
      let list: FirebaseCredentialItem[] = [];
      if (Array.isArray(res.data)) {
        list = res.data;
      } else if (res.data?.list && Array.isArray(res.data.list)) {
        list = res.data.list;
      } else if (res.data?.current && res.data.current.projectId) {
        list = [res.data.current];
      }
      setItems(list);
    } catch (err) {
      console.error('Failed to load Firebase credentials', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Logs list (supports silent background fetch)
  const loadLogs = useCallback(async (silent = false) => {
    if (!silent) setLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '100');
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      const res = await api.get(`/settings/firebase/logs?${params.toString()}`);
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load Firebase logs', err);
    } finally {
      if (!silent) setLoadingLogs(false);
    }
  }, [statusFilter]);

  // Load Registered Mobile Devices list
  const loadDevices = useCallback(async (silent = false) => {
    if (!silent) setLoadingDevices(true);
    try {
      const res = await api.get('/settings/firebase/tokens');
      setDevices(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load registered devices', err);
      setDevices([]);
    } finally {
      if (!silent) setLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
    loadData();
    loadLogs();
    loadDevices();
  }, [router, loadData, loadLogs, loadDevices]);

  // Handle Auto-Refresh ONLY for Logs tab when explicitly toggled on by user
  useEffect(() => {
    if (autoRefresh && activeTab === 'logs') {
      autoRefreshTimerRef.current = setInterval(() => {
        loadLogs(true); // Silent background refresh without flickering table
      }, 10000);
    } else {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
        autoRefreshTimerRef.current = null;
      }
    }
    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
        autoRefreshTimerRef.current = null;
      }
    };
  }, [autoRefresh, activeTab, loadLogs]);

  // Copy to clipboard helper
  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Open Details View
  const handleOpenView = (item: FirebaseCredentialItem) => {
    setSelectedItem(item);
    setShowPrivateKey(false);
    setShowViewModal(true);
  };

  // Delete Credential Item
  const handleDelete = async (item: FirebaseCredentialItem) => {
    if (
      !confirm(
        tr(
          `តើអ្នកពិតជាចង់លុប Firebase (${item.projectId}) នេះមែនទេ?`,
          `Are you sure you want to delete Firebase configuration for "${item.projectId}"?`,
        ),
      )
    ) {
      return;
    }

    try {
      await api.delete(`/settings/firebase/${item.id}`);
      setSuccessMsg(tr('បានលុបដោយជោគជ័យ!', 'Deleted successfully!'));
      setTimeout(() => setSuccessMsg(''), 3500);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការលុប', 'Failed to delete'));
    }
  };

  // Handle Clear Logs
  const handleClearLogs = async () => {
    if (
      !confirm(
        tr(
          'តើអ្នកពិតជាចង់សម្អាតប្រវត្តិកត់ត្រា Firebase ទាំងអស់មែនទេ?',
          'Are you sure you want to clear all Firebase logs?',
        ),
      )
    ) {
      return;
    }
    try {
      await api.delete('/settings/firebase/logs/clear');
      await loadLogs();
      setSuccessMsg(tr('បានសម្អាតកំណត់ត្រា Logs ដោយជោគជ័យ!', 'Firebase logs cleared successfully!'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការសម្អាត logs', 'Failed to clear logs'));
    }
  };

  // Run Test Firebase
  const handleRunTest = async () => {
    setTestingStatus(true);
    setTestResult(null);
    const testPayload = {
      targetToken: testToken.trim() || undefined,
      title: testTitle.trim() || undefined,
      body: testBody.trim() || undefined,
    };
    console.log('🚀 [Firebase Test] Initiating notification test from browser:', testPayload);
    try {
      const res = await api.post('/settings/firebase/test', testPayload);
      console.log('📥 [Firebase Test Response]:', res.data);
      if (!res.data?.success || res.data?.status === 'FAILED') {
        console.error('❌ [Firebase Test Returned Failure]:', res.data);
      }
      setTestResult(res.data);
      await loadLogs();
    } catch (err: any) {
      console.error('❌ [Firebase Test HTTP/Network Error]:', {
        responseData: err?.response?.data,
        status: err?.response?.status,
        message: err?.message,
        error: err,
      });
      setTestResult({
        success: false,
        status: 'FAILED',
        message:
          err.response?.data?.message ||
          err.message ||
          'Failed to communicate with Firebase server',
      });
      await loadLogs();
    } finally {
      setTestingStatus(false);
    }
  };

  // Format Date-Time
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${day}/${month}/${year} ${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
    } catch {
      return dateStr;
    }
  };

  // Filter Credentials
  const filteredCredentials = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (item) =>
        (item.projectId || '').toLowerCase().includes(q) ||
        (item.clientEmail || '').toLowerCase().includes(q) ||
        (item.type || '').toLowerCase().includes(q) ||
        (item.privateKeyId || '').toLowerCase().includes(q),
    );
  }, [items, search]);

  const pagedCredentials = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCredentials.slice(start, start + pageSize);
  }, [filteredCredentials, currentPage, pageSize]);

  // Filter Logs
  const filteredLogs = useMemo(() => {
    const q = logsSearch.toLowerCase().trim();
    return logs.filter((log) => {
      const matchSearch =
        !q ||
        (log.title || '').toLowerCase().includes(q) ||
        (log.body || '').toLowerCase().includes(q) ||
        (log.recipientName || '').toLowerCase().includes(q) ||
        (log.recipientType || '').toLowerCase().includes(q) ||
        (log.errorMessage || '').toLowerCase().includes(q);

      const matchStatus = statusFilter === 'all' || log.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [logs, logsSearch, statusFilter]);

  const pagedLogs = useMemo(() => {
    const start = (logsPage - 1) * logsPageSize;
    return filteredLogs.slice(start, start + logsPageSize);
  }, [filteredLogs, logsPage, logsPageSize]);

  // Log Statistics Counters
  const logStats = useMemo(() => {
    const total = logs.length;
    const success = logs.filter((l) => l.status === 'SUCCESS').length;
    const partial = logs.filter((l) => l.status === 'PARTIAL').length;
    const failed = logs.filter((l) => l.status === 'FAILED').length;
    const skipped = logs.filter((l) => l.status === 'SKIPPED').length;
    return { total, success, partial, failed, skipped };
  }, [logs]);

  // Filter Devices
  const filteredDevices = useMemo(() => {
    const q = devicesSearch.toLowerCase().trim();
    if (!q) return devices;
    return devices.filter((d) => {
      const name = d.user?.name || d.merchant?.name || '';
      const phone = d.user?.phone || d.merchant?.phone || '';
      const role = d.user?.role || (d.merchant ? 'merchant' : '');
      const token = d.token || '';
      const devType = d.deviceType || '';
      return (
        name.toLowerCase().includes(q) ||
        phone.toLowerCase().includes(q) ||
        role.toLowerCase().includes(q) ||
        token.toLowerCase().includes(q) ||
        devType.toLowerCase().includes(q)
      );
    });
  }, [devices, devicesSearch]);

  const pagedDevices = useMemo(() => {
    const start = (devicesPage - 1) * devicesPageSize;
    return filteredDevices.slice(start, start + devicesPageSize);
  }, [filteredDevices, devicesPage, devicesPageSize]);

  // Device Statistics Counters
  const deviceStats = useMemo(() => {
    const total = devices.length;
    const android = devices.filter((d) => (d.deviceType || '').toLowerCase() === 'android').length;
    const ios = devices.filter((d) => (d.deviceType || '').toLowerCase() === 'ios').length;
    const drivers = devices.filter((d) => !!d.userId).length;
    const merchants = devices.filter((d) => !!d.merchantId).length;
    return { total, android, ios, drivers, merchants };
  }, [devices]);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar
          title={tr('Firebase & ការជូនដំណឹង (Push Notifications)', 'Firebase & Push Notifications')}
          subtitle={tr(
            'តាមដានស្ថានភាព Push Notification និងគ្រប់គ្រងគណនី Firebase',
            'Monitor push notification logs and manage Firebase credentials',
          )}
        />

        <div className="page-content">
          {/* Feedback messages */}
          {successMsg && (
            <div
              style={{
                backgroundColor: '#ecfdf5',
                color: '#065f46',
                padding: '10px 16px',
                borderRadius: 8,
                marginBottom: 14,
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <MdCheckCircle size={16} color="#10b981" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                color: '#991b1b',
                padding: '10px 16px',
                borderRadius: 8,
                marginBottom: 14,
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <MdErrorOutline size={16} color="#ef4444" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Navigation Tabs Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            {/* Segmented Pill Tabs */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: '#f1f5f9',
                padding: 4,
                borderRadius: 12,
                gap: 4,
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('logs')}
                style={{
                  padding: '7px 16px',
                  border: 'none',
                  borderRadius: 9,
                  background: activeTab === 'logs' ? '#ffffff' : 'transparent',
                  color: activeTab === 'logs' ? '#0f172a' : '#64748b',
                  boxShadow: activeTab === 'logs' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: activeTab === 'logs' ? 700 : 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tr('តាមដាន Logs', 'Notification Logs')}</span>
                <span
                  style={{
                    backgroundColor: activeTab === 'logs' ? '#eff6ff' : '#e2e8f0',
                    color: activeTab === 'logs' ? '#2563eb' : '#64748b',
                    fontSize: 11,
                    padding: '1px 7px',
                    borderRadius: 10,
                    fontWeight: 700,
                  }}
                >
                  {logs.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('devices');
                  loadDevices();
                }}
                style={{
                  padding: '7px 16px',
                  border: 'none',
                  borderRadius: 9,
                  background: activeTab === 'devices' ? '#ffffff' : 'transparent',
                  color: activeTab === 'devices' ? '#0f172a' : '#64748b',
                  boxShadow: activeTab === 'devices' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: activeTab === 'devices' ? 700 : 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tr('ឧបករណ៍ទូរស័ព្ទ', 'Registered Devices')}</span>
                <span
                  style={{
                    backgroundColor: activeTab === 'devices' ? '#eff6ff' : '#e2e8f0',
                    color: activeTab === 'devices' ? '#2563eb' : '#64748b',
                    fontSize: 11,
                    padding: '1px 7px',
                    borderRadius: 10,
                    fontWeight: 700,
                  }}
                >
                  {devices.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('credentials')}
                style={{
                  padding: '7px 16px',
                  border: 'none',
                  borderRadius: 9,
                  background: activeTab === 'credentials' ? '#ffffff' : 'transparent',
                  color: activeTab === 'credentials' ? '#0f172a' : '#64748b',
                  boxShadow: activeTab === 'credentials' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: activeTab === 'credentials' ? 700 : 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tr('គណនី Firebase', 'Service Accounts')}</span>
                <span
                  style={{
                    backgroundColor: activeTab === 'credentials' ? '#eff6ff' : '#e2e8f0',
                    color: activeTab === 'credentials' ? '#2563eb' : '#64748b',
                    fontSize: 11,
                    padding: '1px 7px',
                    borderRadius: 10,
                    fontWeight: 700,
                  }}
                >
                  {items.length}
                </span>
              </button>
            </div>

            {/* Top Action: Test Connection Button */}
            <button
              className="btn btn-primary"
              onClick={() => {
                setTestResult(null);
                setShowTestModal(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontWeight: 700,
                fontSize: 13,
                padding: '8px 18px',
                borderRadius: 10,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                cursor: 'pointer',
              }}
            >
              <MdSend size={15} />
              <span>{tr('តេស្ត Push Notification', 'Test Push')}</span>
            </button>
          </div>

          {/* ========================================================
              TAB 1: LIVE FIREBASE LOGS WATCHER
             ======================================================== */}
          {activeTab === 'logs' && (
            <>
              {/* Stat Cards - Modern Clean KPI Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 14,
                  marginBottom: 18,
                }}
              >
                {/* Total */}
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: 14,
                    padding: '14px 18px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: '#eff6ff',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <MdNotificationsActive size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                      {tr('សរុប', 'Total Logs')}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', marginTop: 2 }}>
                      {logStats.total.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Success */}
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: 14,
                    padding: '14px 18px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: '#ecfdf5',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <MdCheckCircle size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>
                      {tr('ជោគជ័យ', 'Success')}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#059669', marginTop: 2 }}>
                      {logStats.success.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Failed */}
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: 14,
                    padding: '14px 18px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: '#fef2f2',
                      color: '#dc2626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <MdErrorOutline size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
                      {tr('បរាជ័យ', 'Failed')}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#dc2626', marginTop: 2 }}>
                      {logStats.failed.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Skipped */}
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: 14,
                    padding: '14px 18px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: '#fffbeb',
                      color: '#d97706',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <MdWarning size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#d97706', fontWeight: 600 }}>
                      {tr('រំលង', 'Skipped')}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#d97706', marginTop: 2 }}>
                      {logStats.skipped.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Logs Filter & Controls Bar */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: 14,
                  padding: '12px 18px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  marginBottom: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, flexWrap: 'wrap' }}>
                  <div
                    style={{
                      position: 'relative',
                      minWidth: 220,
                      maxWidth: 340,
                      flex: '1 1 220px',
                    }}
                  >
                    <MdSearch
                      size={18}
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8',
                        pointerEvents: 'none',
                      }}
                    />
                    <input
                      placeholder={tr('ស្វែងរក logs...', 'Search logs...')}
                      value={logsSearch}
                      onChange={(e) => {
                        setLogsSearch(e.target.value);
                        setLogsPage(1);
                      }}
                      style={{
                        width: '100%',
                        height: 38,
                        paddingLeft: 36,
                        paddingRight: 12,
                        borderRadius: 10,
                        border: '1px solid #e2e8f0',
                        fontSize: 13,
                        outline: 'none',
                        background: '#f8fafc',
                        color: '#0f172a',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent, #2563eb)';
                        e.currentTarget.style.background = '#ffffff';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.background = '#f8fafc';
                      }}
                    />
                  </div>

                  {/* Status filter dropdown */}
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setLogsPage(1);
                    }}
                    style={{
                      height: 38,
                      padding: '0 12px',
                      fontSize: 13,
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      color: '#0f172a',
                      outline: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    <option value="all">{tr('ស្ថានភាពទាំងអស់', 'All Statuses')}</option>
                    <option value="SUCCESS">{tr('ជោគជ័យ (SUCCESS)', 'SUCCESS')}</option>
                    <option value="FAILED">{tr('បរាជ័យ (FAILED)', 'FAILED')}</option>
                    <option value="SKIPPED">{tr('រំលង (SKIPPED)', 'SKIPPED')}</option>
                    <option value="PARTIAL">{tr('មួយចំនួន (PARTIAL)', 'PARTIAL')}</option>
                  </select>
                </div>

                {/* Right Actions: Auto Refresh Toggle, Manual Refresh, Clear */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: autoRefresh ? '#2563eb' : '#64748b',
                      background: autoRefresh ? '#eff6ff' : '#f8fafc',
                      padding: '7px 12px',
                      borderRadius: 9,
                      border: `1px solid ${autoRefresh ? '#bfdbfe' : '#e2e8f0'}`,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      style={{ cursor: 'pointer', accentColor: '#2563eb' }}
                    />
                    <span>{tr('Auto-refresh (10s)', 'Auto-refresh (10s)')}</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => loadLogs()}
                    disabled={loadingLogs}
                    title="Refresh"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      height: 38,
                      padding: '0 14px',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      color: '#475569',
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <MdRefresh size={16} className={loadingLogs ? 'spinner' : ''} />
                    <span>{tr('ផ្ទុកឡើងវិញ', 'Refresh')}</span>
                  </button>

                  {logs.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearLogs}
                      title="Clear"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        height: 38,
                        padding: '0 14px',
                        borderRadius: 10,
                        border: '1px solid #fecaca',
                        background: '#fef2f2',
                        color: '#dc2626',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <MdDelete size={15} />
                      <span>{tr('សម្អាត Logs', 'Clear Logs')}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Logs Table Card */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: 16,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff' }}>
                      <tr style={{ background: 'var(--sidebar-bg, #1565D8)' }}>
                        <th style={{ width: 45, textAlign: 'center', padding: '12px 14px', border: 'none', color: '#ffffff', fontSize: 13, fontWeight: 700 }}>#</th>
                        <th style={{ width: 110, textAlign: 'center', padding: '12px 14px', border: 'none', color: '#ffffff', fontSize: 13, fontWeight: 700 }}>{tr('ស្ថានភាព', 'Status')}</th>
                        <th style={{ minWidth: 140, padding: '12px 14px', border: 'none', color: '#ffffff', fontSize: 13, fontWeight: 700 }}>{tr('អ្នកទទួល', 'Recipient')}</th>
                        <th style={{ minWidth: 220, padding: '12px 14px', border: 'none', color: '#ffffff', fontSize: 13, fontWeight: 700 }}>{tr('ខ្លឹមសារសារ', 'Notification')}</th>
                        <th style={{ width: 80, textAlign: 'center', padding: '12px 14px', border: 'none', color: '#ffffff', fontSize: 13, fontWeight: 700 }}>{tr('ឧបករណ៍', 'Devices')}</th>
                        <th style={{ width: 80, textAlign: 'center', padding: '12px 14px', border: 'none', color: '#ffffff', fontSize: 13, fontWeight: 700 }}>{tr('លទ្ធផល', 'Delivered')}</th>
                        <th style={{ minWidth: 200, padding: '12px 14px', border: 'none', color: '#ffffff', fontSize: 13, fontWeight: 700 }}>{tr('ព័ត៌មាន / កំហុស', 'Info / Diagnostics')}</th>
                        <th style={{ width: 160, padding: '12px 14px', border: 'none', color: '#ffffff', fontSize: 13, fontWeight: 700 }}>{tr('កាលបរិច្ឆេទ', 'Timestamp')}</th>
                        <th style={{ width: 65, textAlign: 'center', padding: '12px 14px', border: 'none', color: '#ffffff', fontSize: 13, fontWeight: 700 }}>{tr('មើល', 'View')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingLogs && logs.length === 0 ? (
                        <TableSkeleton columns={9} rows={6} />
                      ) : pagedLogs.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ padding: '48px 20px', textAlign: 'center', color: '#94a3b8' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                              <MdNotificationsActive size={36} color="#cbd5e1" />
                              <span style={{ fontSize: 13.5, fontWeight: 600, color: '#64748b' }}>
                                {tr('មិនទាន់មានប្រវត្តិកត់ត្រា Firebase នៅឡើយទេ', 'No Firebase notification logs recorded yet')}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        pagedLogs.map((log, i) => {
                          const isSuccess = log.status === 'SUCCESS';
                          const isFailed = log.status === 'FAILED';
                          const isSkipped = log.status === 'SKIPPED';
                          const isPartial = log.status === 'PARTIAL';

                          const statusBg = isSuccess ? '#ecfdf5' : isFailed ? '#fef2f2' : isSkipped ? '#f1f5f9' : '#fffbeb';
                          const statusColor = isSuccess ? '#059669' : isFailed ? '#dc2626' : isSkipped ? '#475569' : '#b45309';
                          const statusBorder = isSuccess ? '#a7f3d0' : isFailed ? '#fecaca' : isSkipped ? '#e2e8f0' : '#fde68a';
                          const statusDot = isSuccess ? '#10b981' : isFailed ? '#ef4444' : isSkipped ? '#94a3b8' : '#f59e0b';
                          const statusText = isSuccess ? tr('ជោគជ័យ', 'SUCCESS') : isFailed ? tr('បរាជ័យ', 'FAILED') : isSkipped ? tr('រំលង', 'SKIPPED') : tr('មួយចំនួន', 'PARTIAL');

                          return (
                            <tr
                              key={log.id}
                              style={{
                                borderBottom: '1px solid #f1f5f9',
                                fontSize: 13,
                                transition: 'background 0.15s ease',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: '12px 14px' }}>
                                {(logsPage - 1) * logsPageSize + i + 1}
                              </td>

                              {/* Status Badge */}
                              <td style={{ textAlign: 'center', padding: '12px 14px' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    padding: '3px 10px',
                                    borderRadius: 20,
                                    backgroundColor: statusBg,
                                    color: statusColor,
                                    border: `1px solid ${statusBorder}`,
                                  }}
                                >
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusDot }} />
                                  {statusText}
                                </span>
                              </td>

                              {/* Recipient */}
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>
                                    {log.recipientName || `ID: ${log.recipientId || '—'}`}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 10.5,
                                      fontWeight: 700,
                                      padding: '1px 6px',
                                      borderRadius: 6,
                                      backgroundColor: log.recipientType === 'merchant' ? '#f3e8ff' : log.recipientType === 'driver' ? '#eff6ff' : '#f1f5f9',
                                      color: log.recipientType === 'merchant' ? '#7e22ce' : log.recipientType === 'driver' ? '#2563eb' : '#475569',
                                      textTransform: 'capitalize',
                                    }}
                                  >
                                    {log.recipientType}
                                  </span>
                                </div>
                              </td>

                              {/* Notification Title & Body */}
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                                  {log.title}
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: '#64748b',
                                    maxWidth: 300,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    marginTop: 2,
                                  }}
                                  title={log.body}
                                >
                                  {log.body}
                                </div>
                              </td>

                              {/* Devices Count */}
                              <td style={{ textAlign: 'center', fontSize: 12.5, color: '#475569', fontWeight: 700, padding: '12px 14px' }}>
                                <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 10 }}>
                                  {log.tokensCount}
                                </span>
                              </td>

                              {/* Delivered / Failed */}
                              <td style={{ textAlign: 'center', padding: '12px 14px' }}>
                                <span style={{ fontSize: 12.5, fontWeight: 700, color: log.successCount > 0 ? '#059669' : log.failureCount > 0 ? '#dc2626' : '#94a3b8' }}>
                                  {log.successCount}/{log.failureCount}
                                </span>
                              </td>

                              {/* Diagnostics / Error Message */}
                              <td style={{ padding: '12px 14px' }}>
                                {isSuccess ? (
                                  <span style={{ fontSize: 12, fontWeight: 600, color: '#059669', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <MdCheckCircle size={14} />
                                    <span>{tr('ផ្ញើបានជោគជ័យ', 'Delivered')}</span>
                                  </span>
                                ) : log.errorMessage?.includes('No active device tokens') || isSkipped ? (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      fontSize: 11.5,
                                      fontWeight: 600,
                                      color: '#b45309',
                                      background: '#fffbeb',
                                      border: '1px solid #fde68a',
                                      padding: '2px 8px',
                                      borderRadius: 6,
                                    }}
                                    title={log.errorMessage || 'No active device tokens found'}
                                  >
                                    <MdWarning size={13} />
                                    <span>{tr('គ្មាន Device Token', 'No Device Token')}</span>
                                  </span>
                                ) : log.errorMessage ? (
                                  <span
                                    style={{
                                      fontSize: 11.5,
                                      fontWeight: 600,
                                      color: '#dc2626',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      maxWidth: 240,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                    title={log.errorMessage}
                                  >
                                    <MdErrorOutline size={14} />
                                    <span>{log.errorMessage}</span>
                                  </span>
                                ) : (
                                  <span style={{ color: '#94a3b8' }}>—</span>
                                )}
                              </td>

                              {/* Timestamp */}
                              <td style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap', padding: '12px 14px' }}>
                                {formatDateTime(log.createdAt)}
                              </td>

                              {/* Action */}
                              <td style={{ textAlign: 'center', padding: '12px 14px' }}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedLog(log)}
                                  style={{
                                    border: '1px solid #e2e8f0',
                                    background: '#ffffff',
                                    color: '#2563eb',
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#eff6ff';
                                    e.currentTarget.style.borderColor = '#bfdbfe';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#ffffff';
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                  }}
                                  title="View Details"
                                >
                                  <FaEye size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredLogs.length > logsPageSize && (
                  <div style={{ padding: '12px 18px', borderTop: '1px solid #f1f5f9' }}>
                    <Pagination
                      currentPage={logsPage}
                      totalItems={filteredLogs.length}
                      pageSize={logsPageSize}
                      onPageChange={(page) => setLogsPage(page)}
                      onPageSizeChange={(size) => {
                        setLogsPageSize(size);
                        setLogsPage(1);
                      }}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* ========================================================
              TAB 2: REGISTERED MOBILE DEVICES
             ======================================================== */}
          {activeTab === 'devices' && (
            <>
              {/* Clean Status Banner if no devices */}
              {devices.length === 0 && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fef3c7',
                    color: '#92400e',
                    fontSize: 13,
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <MdWarning size={18} color="#d97706" />
                  <span>
                    {tr(
                      'មិនទាន់មានឧបករណ៍ទូរស័ព្ទណាបានចុះឈ្មោះ Device Token នៅឡើយទេ។ Mobile App ត្រូវផ្ញើ Token មកកាន់ Server (POST /api/mobile/auth/device-token) ក្រោយពេល Login។',
                      'No mobile devices registered yet. Mobile apps must send their FCM token to POST /api/mobile/auth/device-token upon login.',
                    )}
                  </span>
                </div>
              )}

              {/* Search & Actions Bar */}
              <div className="card" style={{ marginBottom: 14 }}>
                <div
                  style={{
                    padding: '10px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div className="search-input-wrapper" style={{ flex: 1, minWidth: 220, maxWidth: 360 }}>
                    <MdSearch className="search-icon" />
                    <input
                      className="form-control search-input"
                      placeholder={tr('ស្វែងរកឧបករណ៍...', 'Search devices...')}
                      value={devicesSearch}
                      onChange={(e) => {
                        setDevicesSearch(e.target.value);
                        setDevicesPage(1);
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => loadDevices()}
                      disabled={loadingDevices}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, height: 34 }}
                    >
                      <MdRefresh size={15} className={loadingDevices ? 'spin' : ''} />
                      <span>{tr('ផ្ទុកឡើងវិញ', 'Refresh')}</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setTestToken('');
                        setTestResult(null);
                        setShowTestModal(true);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, height: 34 }}
                    >
                      <MdSend size={13} />
                      <span>{tr('តេស្ត FCM Token', 'Test FCM Token')}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Devices Table / Empty State */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: 16,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff' }}>
                      <tr style={{ background: 'var(--sidebar-bg, #1565D8)' }}>
                        <th style={{ width: 60, textAlign: 'center', padding: '12px 14px', border: 'none', color: '#ffffff', fontSize: 13, fontWeight: 700 }}>#</th>
                        <th style={{ padding: '12px 14px', border: 'none', color: '#ffffff', fontSize: 13, fontWeight: 700 }}>{tr('អ្នកប្រើប្រាស់ / គណនី', 'User / Account')}</th>
                        <th style={{ width: 140, padding: '12px 14px', border: 'none', color: '#ffffff', fontSize: 13, fontWeight: 700 }}>{tr('លេខទូរស័ព្ទ', 'Phone')}</th>
                        <th style={{ width: 120, padding: '12px 14px', border: 'none', color: '#ffffff', fontSize: 13, fontWeight: 700 }}>{tr('ប្រព័ន្ធ (OS)', 'Platform')}</th>
                        <th style={{ padding: '12px 14px', border: 'none', color: '#ffffff', fontSize: 13, fontWeight: 700 }}>{tr('FCM Device Token', 'FCM Device Token')}</th>
                        <th style={{ width: 180, padding: '12px 14px', border: 'none', color: '#ffffff', fontSize: 13, fontWeight: 700 }}>{tr('កាលបរិច្ឆេទចុះឈ្មោះ', 'Registered / Updated')}</th>
                        <th style={{ width: 130, textAlign: 'center', padding: '12px 14px', border: 'none', color: '#ffffff', fontSize: 13, fontWeight: 700 }}>{tr('សកម្មភាព', 'Action')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingDevices ? (
                        <TableSkeleton rows={5} columns={7} />
                      ) : filteredDevices.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '36px 20px', color: '#94a3b8' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                              <MdPhoneAndroid size={32} color="#cbd5e1" />
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>
                                {tr('មិនទាន់មានទិន្នន័យឧបករណ៍ទូរស័ព្ទនៅឡើយទេ', 'No mobile devices registered yet')}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        pagedDevices.map((dev, idx) => {
                          const isDriver = !!dev.userId;
                          const isMerchant = !!dev.merchantId;
                          const name = dev.user?.name || dev.merchant?.name || 'Unknown User';
                          const phone = dev.user?.phone || dev.merchant?.phone || '—';
                          const isAndroid = (dev.deviceType || '').toLowerCase() === 'android';
                          const isIos = (dev.deviceType || '').toLowerCase() === 'ios';

                          return (
                            <tr key={dev.id || idx}>
                              <td style={{ textAlign: 'center', fontWeight: 700, color: '#94a3b8' }}>
                                {(devicesPage - 1) * devicesPageSize + idx + 1}
                              </td>

                              {/* Recipient */}
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ fontWeight: 800, color: '#0f172a' }}>{name}</div>
                                  <span
                                    style={{
                                      padding: '2px 8px',
                                      borderRadius: 6,
                                      fontSize: 10.5,
                                      fontWeight: 800,
                                      backgroundColor: isDriver ? '#dbeafe' : isMerchant ? '#f3e8ff' : '#f1f5f9',
                                      color: isDriver ? '#1e40af' : isMerchant ? '#6b21a8' : '#475569',
                                    }}
                                  >
                                    {isDriver ? 'DRIVER' : isMerchant ? 'MERCHANT' : 'DEVICE'}
                                  </span>
                                </div>
                              </td>

                              {/* Phone */}
                              <td style={{ fontWeight: 600, color: '#334155' }}>{phone}</td>

                              {/* Platform */}
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {isAndroid ? (
                                    <FaAndroid size={16} color="#16a34a" />
                                  ) : isIos ? (
                                    <FaApple size={16} color="#000000" />
                                  ) : (
                                    <MdPhoneAndroid size={16} color="#64748b" />
                                  )}
                                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>
                                    {dev.deviceType || 'Mobile'}
                                  </span>
                                </div>
                              </td>

                              {/* Token */}
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <code
                                    style={{
                                      fontSize: 11,
                                      backgroundColor: '#f1f5f9',
                                      padding: '3px 8px',
                                      borderRadius: 6,
                                      color: '#0f172a',
                                      maxWidth: 240,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      display: 'inline-block',
                                    }}
                                  >
                                    {dev.token}
                                  </code>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm btn-icon"
                                    onClick={() => copyToClipboard(dev.token, `token-${dev.id}`)}
                                    title="Copy FCM Token"
                                  >
                                    <MdContentCopy size={13} color={copiedKey === `token-${dev.id}` ? '#10b981' : '#64748b'} />
                                  </button>
                                </div>
                              </td>

                              {/* Registered */}
                              <td style={{ fontSize: 12, color: '#64748b' }}>
                                {formatDateTime(dev.updatedAt || dev.createdAt)}
                              </td>

                              {/* Action */}
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() => {
                                    setTestToken(dev.token);
                                    setTestResult(null);
                                    setShowTestModal(true);
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    padding: '5px 10px',
                                  }}
                                >
                                  <MdSend size={13} />
                                  {tr('ផ្ញើតេស្ត', 'Test Push')}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredDevices.length > devicesPageSize && (
                  <div style={{ padding: '12px 18px', borderTop: '1px solid #f1f5f9' }}>
                    <Pagination
                      currentPage={devicesPage}
                      totalItems={filteredDevices.length}
                      pageSize={devicesPageSize}
                      onPageChange={(page) => setDevicesPage(page)}
                      onPageSizeChange={(size) => {
                        setDevicesPageSize(size);
                        setDevicesPage(1);
                      }}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* ========================================================
              TAB 3: FIREBASE CREDENTIALS MANAGEMENT
             ======================================================== */}
          {activeTab === 'credentials' && (
            <>
              {/* Search and Action Bar */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div
                  style={{
                    padding: '12px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div className="search-input-wrapper" style={{ flex: 1, minWidth: 260, maxWidth: 450 }}>
                    <MdSearch className="search-icon" />
                    <input
                      className="form-control search-input"
                      placeholder={tr(
                        'ស្វែងរកតាម Project ID, Client Email, Key ID...',
                        'Search by Project ID, Email, Key ID...',
                      )}
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </div>

                  {/* Create Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => router.push('/setting/firebase/create')}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                    >
                      <FiPlusCircle size={15} />
                      {tr('បន្ថែម Firebase ថ្មី', 'Add Firebase')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Credentials Table */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: 16,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <SiFirebase color="#f59e0b" size={18} />
                    {tr('បញ្ជី Firebase Service Accounts', 'Firebase Service Accounts List')}
                  </span>
                </div>

                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff' }}>
                      <tr style={{ background: 'var(--sidebar-bg, #1565D8)' }}>
                        <th style={{ width: 60, textAlign: 'center', padding: '12px 14px', border: 'none', color: '#ffffff', fontSize: 13, fontWeight: 700 }}>{t('colNo') || tr('ល.រ', 'No.')}</th>
                        <th style={{ padding: '12px 14px', border: 'none', color: '#ffffff', fontSize: 13, fontWeight: 700 }}>{tr('Firebase Project ID', 'Project ID')}</th>
                        <th style={{ padding: '12px 14px', border: 'none', color: '#ffffff', fontSize: 13, fontWeight: 700 }}>{tr('Client Email', 'Client Email')}</th>
                        <th style={{ padding: '12px 14px', border: 'none', color: '#ffffff', fontSize: 13, fontWeight: 700 }}>{tr('Private Key ID', 'Key ID')}</th>
                        <th style={{ padding: '12px 14px', border: 'none', color: '#ffffff', fontSize: 13, fontWeight: 700 }}>{tr('ប្រភេទ (Type)', 'Type')}</th>
                        <th style={{ padding: '12px 14px', border: 'none', color: '#ffffff', fontSize: 13, fontWeight: 700 }}>{tr('កាលបរិច្ឆេទ', 'Created / Updated')}</th>
                        <th style={{ textAlign: 'center', width: 100, padding: '12px 14px', border: 'none', color: '#ffffff', fontSize: 13, fontWeight: 700 }}>{tr('ស្ថានភាព', 'Status')}</th>
                        <th style={{ width: 140, textAlign: 'center', padding: '12px 14px', border: 'none', color: '#ffffff', fontSize: 13, fontWeight: 700 }}>
                          {t('actions') || tr('សកម្មភាព', 'Actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <TableSkeleton columns={8} rows={5} />
                      ) : pagedCredentials.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            style={{
                              padding: '36px 20px',
                              textAlign: 'center',
                              color: 'var(--text-muted)',
                              fontSize: 13,
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                              <SiFirebase size={36} color="#cbd5e1" />
                              <span>
                                {tr(
                                  'គ្មានទិន្នន័យ Firebase នៅឡើយទេ។ ចុច "បន្ថែម Firebase ថ្មី" ដើម្បីបញ្ចូល។',
                                  'No Firebase credentials found. Click "Add Firebase" to create.',
                                )}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        pagedCredentials.map((item, i) => (
                          <tr key={item.id}>
                            <td style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
                              {(currentPage - 1) * pageSize + i + 1}
                            </td>

                            {/* Project ID */}
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 8,
                                    backgroundColor: '#fff7ed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  <SiFirebase size={16} color="#f59e0b" />
                                </div>
                                <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 13.5 }}>
                                  {item.projectId}
                                </span>
                              </div>
                            </td>

                            {/* Client Email */}
                            <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span
                                  style={{
                                    maxWidth: 220,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {item.clientEmail || '—'}
                                </span>
                                {item.clientEmail && (
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(item.clientEmail, `email-${item.id}`)}
                                    title="Copy Email"
                                    style={{
                                      border: 'none',
                                      background: 'none',
                                      cursor: 'pointer',
                                      color: copiedKey === `email-${item.id}` ? '#10b981' : '#94a3b8',
                                    }}
                                  >
                                    <MdContentCopy size={13} />
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Private Key ID */}
                            <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                              {item.privateKeyId ? `${item.privateKeyId.slice(0, 12)}...` : '••••••••'}
                            </td>

                            {/* Type */}
                            <td>
                              <span
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  backgroundColor: '#f1f5f9',
                                  color: '#475569',
                                  fontSize: 11,
                                  fontWeight: 700,
                                }}
                              >
                                {item.type || 'service_account'}
                              </span>
                            </td>

                            {/* Date */}
                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              {item.updatedAt ? formatDateTime(item.updatedAt) : '—'}
                            </td>

                            {/* Status */}
                            <td style={{ textAlign: 'center' }}>
                              <span className="badge badge-delivered" style={{ fontSize: 11, padding: '3px 8px' }}>
                                <span
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    backgroundColor: '#10b981',
                                    display: 'inline-block',
                                    marginRight: 4,
                                  }}
                                />
                                {tr('សកម្ម', 'Active')}
                              </span>
                            </td>

                            {/* Actions */}
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                                <button
                                  className="btn btn-ghost btn-sm btn-icon"
                                  onClick={() => handleOpenView(item)}
                                  title={tr('មើលលម្អិត', 'View Details')}
                                >
                                  <FaEye size={13} color="#2563eb" />
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm btn-icon"
                                  onClick={() => router.push(`/setting/firebase/edit/${item.id}`)}
                                  title={tr('កែសម្រួល', 'Edit')}
                                >
                                  <FaRegEdit size={13} color="#64748b" />
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm btn-icon"
                                  onClick={() => handleDelete(item)}
                                  title={tr('លុប', 'Delete')}
                                >
                                  <FaTrashAlt size={13} color="#ef4444" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredCredentials.length > pageSize && (
                  <div style={{ padding: '12px 18px', borderTop: '1px solid #f1f5f9' }}>
                    <Pagination
                      currentPage={currentPage}
                      totalItems={filteredCredentials.length}
                      pageSize={pageSize}
                      onPageChange={(page) => setCurrentPage(page)}
                      onPageSizeChange={(size) => {
                        setPageSize(size);
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* ========================================================
              MODAL: TEST FIREBASE PUSH NOTIFICATION
             ======================================================== */}
          {showTestModal && (
            <Modal
              open={showTestModal}
              title={tr('🧪 តេស្តសេវា Firebase Cloud Messaging', '🧪 Test Firebase Connection')}
              onClose={() => setShowTestModal(false)}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.5 }}>
                  {tr(
                    'ផ្ញើសារសាកល្បងទៅកាន់ Firebase FCM ដើម្បីផ្ទៀងផ្ទាត់ថា Service Account ដំណើរការ (Work) ឬបរាជ័យ (Not Work)។ លទ្ធផលនឹងត្រូវបានកត់ត្រាចូលក្នុង Logs ភ្លាមៗ។',
                    'Dispatch a test push message through Firebase FCM to verify whether your credentials and connectivity work properly.',
                  )}
                </p>

                {/* Quick Select from Registered Devices */}
                {devices.length > 0 && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      {tr('ជ្រើសរើសពីឧបករណ៍ទូរស័ព្ទដែលបានភ្ជាប់', 'Select from Registered Devices')}
                    </label>
                    <select
                      className="form-control"
                      value={testToken}
                      onChange={(e) => setTestToken(e.target.value)}
                      style={{ fontSize: 12.5 }}
                    >
                      <option value="">
                        {tr('-- បញ្ចូល Token ដោយផ្ទាល់ ឬទុកទទេដើម្បីតេស្ត Server --', '-- Manual Token / Server Health Check --')}
                      </option>
                      {devices.map((d) => {
                        const name = d.user?.name || d.merchant?.name || 'Device';
                        const role = d.user?.role || (d.merchant ? 'merchant' : 'device');
                        return (
                          <option key={d.id} value={d.token}>
                            [{role.toUpperCase()}] {name} ({d.user?.phone || d.merchant?.phone || d.deviceType || 'mobile'}) - {d.token.slice(0, 14)}...
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    {tr('Target Device Token (FCM Token របស់ទូរស័ព្ទ)', 'Target FCM Device Token')}
                  </label>
                  <input
                    className="form-control"
                    placeholder="e.g. f9xL4... (Paste phone FCM Token here or leave empty to test Firebase credentials)"
                    value={testToken}
                    onChange={(e) => setTestToken(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                  <small style={{ color: '#64748b', fontSize: 11, marginTop: 4, display: 'block' }}>
                    {tr(
                      'ប្រសិនបើមិនបញ្ចូល Token ប្រព័ន្ធនឹងតេស្តភ្ជាប់ Firebase Admin SDK ជាមួយ Google Cloud ដោយស្វ័យប្រវត្តិ។',
                      'If no device token is provided, the system will verify authentication with Google Cloud automatically.',
                    )}
                  </small>
                </div>

                {/* Mobile Test Advice Note */}
                <div
                  style={{
                    padding: '9px 12px',
                    borderRadius: 8,
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    fontSize: 12,
                    color: '#1e40af',
                    lineHeight: 1.45,
                  }}
                >
                  💡 <strong>{tr('គន្លឹះតេស្តទូរស័ព្ទដៃ (Mobile Banner Test):', 'Mobile Banner Tip:')}</strong>{' '}
                  {tr(
                    'ដើម្បីឱ្យ Notification លោត Pop-up Banner ពីលើអេក្រង់ទូរស័ព្ទដៃ សូមបិទ App ទុកចោលក្នុង Background (ឬចាក់សោរ Screen ទូរស័ព្ទ) មុននឹងចុចផ្ញើសារតេស្ត!',
                    'To see the heads-up banner pop up on mobile, lock your phone screen or minimize the app to background before clicking Send Test!',
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    {tr('ចំណងជើងសារ (Notification Title)', 'Title')}
                  </label>
                  <input
                    className="form-control"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    {tr('ខ្លឹមសារសារ (Body)', 'Body')}
                  </label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={testBody}
                    onChange={(e) => setTestBody(e.target.value)}
                  />
                </div>

                {/* Test Result Display */}
                {testResult && (
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      backgroundColor: testResult.success ? '#ecfdf5' : '#fef2f2',
                      border: `1.5px solid ${testResult.success ? '#a7f3d0' : '#fecaca'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {testResult.success ? (
                        <MdCheckCircle size={20} color="#10b981" />
                      ) : (
                        <MdErrorOutline size={20} color="#ef4444" />
                      )}
                      <span
                        style={{
                          fontSize: 13.5,
                          fontWeight: 700,
                          color: testResult.success ? '#065f46' : '#991b1b',
                        }}
                      >
                        {testResult.success
                          ? tr('ការតេស្តជោគជ័យ', 'Test Successful')
                          : tr('ការតេស្តបរាជ័យ', 'Test Failed')}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 12.5,
                        color: testResult.success ? '#047857' : '#b91c1c',
                        margin: 0,
                        lineHeight: 1.4,
                      }}
                    >
                      {testResult.message}
                    </p>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowTestModal(false)}
                  >
                    {tr('បិទ', 'Close')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleRunTest}
                    disabled={testingStatus}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                  >
                    {testingStatus && <div className="spinner" style={{ width: 14, height: 14 }} />}
                    <span>
                      {testingStatus
                        ? tr('កំពុងធ្វើតេស្ត...', 'Testing...')
                        : tr('ផ្ញើសារតេស្តឥឡូវនេះ', 'Send Test Now')}
                    </span>
                  </button>
                </div>
              </div>
            </Modal>
          )}

          {/* ========================================================
              MODAL: VIEW LOG DETAILS & JSON PAYLOAD
             ======================================================== */}
          {selectedLog && (
            <Modal
              open={Boolean(selectedLog)}
              title={tr('📋 ព័ត៌មានលម្អិតនៃ Firebase Log', 'Firebase Notification Log Details')}
              onClose={() => setSelectedLog(null)}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #e2e8f0' }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>LOG ID: #{selectedLog.id}</span>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{selectedLog.title}</h3>
                  </div>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 800,
                      backgroundColor: selectedLog.status === 'SUCCESS' ? '#ecfdf5' : selectedLog.status === 'FAILED' ? '#fef2f2' : '#fef3c7',
                      color: selectedLog.status === 'SUCCESS' ? '#047857' : selectedLog.status === 'FAILED' ? '#b91c1c' : '#92400e',
                    }}
                  >
                    {selectedLog.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12.5 }}>
                  <div>
                    <strong style={{ color: '#64748b' }}>{tr('ប្រភេទអ្នកទទួល', 'Recipient Type')}:</strong>{' '}
                    <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{selectedLog.recipientType}</span>
                  </div>
                  <div>
                    <strong style={{ color: '#64748b' }}>{tr('ឈ្មោះអ្នកទទួល', 'Recipient Name')}:</strong>{' '}
                    <span style={{ fontWeight: 700 }}>{selectedLog.recipientName || '—'}</span>
                  </div>
                  <div>
                    <strong style={{ color: '#64748b' }}>{tr('ចំនួនឧបករណ៍ Target', 'Devices Targeted')}:</strong>{' '}
                    <span>{selectedLog.tokensCount}</span>
                  </div>
                  <div>
                    <strong style={{ color: '#64748b' }}>{tr('ជោគជ័យ / បរាជ័យ', 'Success / Fail')}:</strong>{' '}
                    <span>{selectedLog.successCount} / {selectedLog.failureCount}</span>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <strong style={{ color: '#64748b' }}>{tr('កាលបរិច្ឆេទផ្ញើ', 'Dispatched At')}:</strong>{' '}
                    <span>{formatDateTime(selectedLog.createdAt)}</span>
                  </div>
                </div>

                {/* Error diagnostics banner if any */}
                {selectedLog.errorMessage && (
                  <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: 12 }}>
                    <strong style={{ display: 'block', marginBottom: 4 }}>⚠️ Error Diagnostics:</strong>
                    <code>{selectedLog.errorMessage}</code>
                  </div>
                )}

                {/* Body Text */}
                <div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b' }}>NOTIFICATION BODY</span>
                  <div style={{ padding: '8px 12px', borderRadius: 6, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 13, marginTop: 4 }}>
                    {selectedLog.body}
                  </div>
                </div>

                {/* Raw JSON Payload */}
                {selectedLog.dataPayload && (
                  <div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b' }}>DATA PAYLOAD (JSON)</span>
                    <pre style={{
                      backgroundColor: '#0f172a',
                      color: '#38bdf8',
                      padding: 10,
                      borderRadius: 6,
                      fontSize: 11,
                      maxHeight: 140,
                      overflowY: 'auto',
                      marginTop: 4,
                    }}>
                      {JSON.stringify(selectedLog.dataPayload, null, 2)}
                    </pre>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setSelectedLog(null)}>
                    {tr('បិទ', 'Close')}
                  </button>
                </div>
              </div>
            </Modal>
          )}

          {/* ========================================================
              MODAL: VIEW CREDENTIAL DETAILS
             ======================================================== */}
          <Modal
            open={showViewModal}
            title={tr('ព័ត៌មានលម្អិតគណនី Firebase', 'Firebase Credential Details')}
            onClose={() => setShowViewModal(false)}
          >
            {selectedItem && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12.5 }}>
                  <div>
                    <strong style={{ color: '#64748b' }}>PROJECT ID:</strong>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>{selectedItem.projectId}</div>
                  </div>
                  <div>
                    <strong style={{ color: '#64748b' }}>TYPE:</strong>
                    <div style={{ fontWeight: 700 }}>{selectedItem.type}</div>
                  </div>
                </div>

                <div>
                  <strong style={{ color: '#64748b', fontSize: 12 }}>CLIENT EMAIL:</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <code style={{ fontSize: 12, backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: 6, flex: 1 }}>
                      {selectedItem.clientEmail}
                    </code>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => copyToClipboard(selectedItem.clientEmail, 'modal-email')}
                    >
                      {copiedKey === 'modal-email' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div>
                  <strong style={{ color: '#64748b', fontSize: 12 }}>PRIVATE KEY ID:</strong>
                  <div style={{ marginTop: 4 }}>
                    <code style={{ fontSize: 11.5, backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: 6, display: 'inline-block' }}>
                      {selectedItem.privateKeyId}
                    </code>
                  </div>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: 10, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>PRIVATE KEY</span>
                    <button
                      type="button"
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      style={{
                        border: 'none',
                        background: 'none',
                        color: '#2563eb',
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {showPrivateKey ? <MdVisibilityOff size={14} /> : <MdVisibility size={14} />}
                      {showPrivateKey ? tr('លាក់', 'Hide') : tr('បង្ហាញ', 'Show')}
                    </button>
                  </div>
                  <pre
                    style={{
                      marginTop: 6,
                      padding: 8,
                      borderRadius: 6,
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      fontSize: 10.5,
                      maxHeight: 120,
                      overflowY: 'auto',
                      filter: showPrivateKey ? 'none' : 'blur(3px)',
                    }}
                  >
                    {selectedItem.privateKey}
                  </pre>
                </div>
              </div>
            )}
          </Modal>
        </div>
      </div>
    </div>
  );
}
