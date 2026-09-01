'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import {
  MdSearch,
  MdCheckCircle,
  MdCancel,
  MdSend,
  MdRefresh,
} from 'react-icons/md';
import { FaRegEdit, FaTrashAlt, FaTelegramPlane, FaHistory } from 'react-icons/fa';
import { FiPlusCircle } from 'react-icons/fi';

export default function TelegramSettingsPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const isKh = lang === 'km';

  const [configs, setConfigs] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals for Testing & Logs
  const [showTestModal, setShowTestModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);

  // Test Modal State
  const [testChatId, setTestChatId] = useState('761552994');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const configsRes = await api.get('/telegram/configs').catch(() => ({ data: [] }));
      const cfgList = Array.isArray(configsRes.data)
        ? configsRes.data
        : (configsRes.data?.results || configsRes.data?.result || []);
      setConfigs(cfgList);
    } catch (e) {
      console.error('Failed to load telegram configs', e);
      setConfigs([]);
    }
    setLoading(false);
  }, []);

  const loadLogs = async () => {
    try {
      const res = await api.get('/telegram/logs?limit=50');
      const logList = Array.isArray(res.data)
        ? res.data
        : (res.data?.results || res.data?.result || []);
      setLogs(logList);
    } catch {
      setLogs([]);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
    loadData();
  }, [router, loadData]);

  const handleOpenCreate = () => {
    router.push('/setting/telegram/create');
  };

  const handleOpenEdit = (cfg: any) => {
    router.push(`/setting/telegram/edit/${cfg.id}`);
  };

  const handleDeleteConfig = async (id: number) => {
    if (!confirm(isKh ? 'តើអ្នកប្រាកដជាចង់លុបការកំណត់ Telegram នេះមែនទេ?' : 'Delete this Telegram configuration?')) {
      return;
    }
    try {
      await api.delete(`/telegram/configs/${id}`);
      await loadData();
    } catch {
      alert(isKh ? 'បរាជ័យក្នុងការលុប' : 'Failed to delete');
    }
  };

  const handleRunTest = async () => {
    if (!testChatId.trim()) {
      alert(isKh ? 'សូមបញ្ចូល Chat ID' : 'Please enter Chat ID');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/telegram/test', { chatId: testChatId.trim() });
      if (res.data?.success) {
        setTestResult({ success: true, message: isKh ? 'សារ Test ត្រូវបានផ្ញើជោគជ័យ!' : 'Test message sent successfully!' });
      } else {
        setTestResult({ success: false, error: res.data?.error || (isKh ? 'Telegram ឆ្លើយតប Error' : 'Telegram error') });
      }
    } catch (err: any) {
      setTestResult({ success: false, error: err.response?.data?.message || err.message || (isKh ? 'មិនអាចផ្ញើសារបានទេ' : 'Failed to send') });
    }
    setTesting(false);
  };

  // Filter & Pagination
  const filtered = useMemo(() => {
    return configs.filter((c) => {
      const merchantName = c.merchant ? (c.merchant.nameKh || c.merchant.name || '').toLowerCase() : '';
      const title = (c.channelTitle || '').toLowerCase();
      const chatId = (c.chatId || '').toLowerCase();
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return merchantName.includes(q) || title.includes(q) || chatId.includes(q);
    });
  }, [configs, search]);

  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar
          title={isKh ? 'ការកំណត់ Telegram' : 'Telegram Settings'}
          subtitle={isKh ? 'គ្រប់គ្រង និងកំណត់ការជូនដំណឹងតាម Telegram' : 'Manage and configure Telegram notifications'}
        />

        <div className="page-content">
          {/* Search Filter Card */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div className="search-input-wrapper" style={{ flex: 1, minWidth: 240, maxWidth: 450 }}>
                <MdSearch className="search-icon" />
                <input
                  className="form-control search-input"
                  placeholder={isKh ? 'ស្វែងរកតាមឈ្មោះហាង, ឈ្មោះ Channel, Chat ID...' : 'Search merchant, channel name, chat ID...'}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => router.push('/setting/telegram/logs')}
                >
                  <FaHistory size={12} /> {isKh ? 'ប្រវត្តិ Logs' : 'View Logs'}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setTestResult(null);
                    setShowTestModal(true);
                  }}
                >
                  <FaTelegramPlane size={13} color="#0284c7" /> {isKh ? 'តេស្ត Bot' : 'Test Bot'}
                </button>
              </div>
            </div>
          </div>

          {/* Main Table Card */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">{isKh ? 'បញ្ជី Telegram Notifications' : 'Telegram Notifications'}</span>
              <button className="btn btn-primary btn-sm" onClick={handleOpenCreate}>
                <FiPlusCircle size={14} /> {isKh ? 'បន្ថែម Telegram' : 'Add Telegram'}
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 60, textAlign: 'center' }}>{t('colNo') || (isKh ? 'ល.រ' : 'No.')}</th>
                    <th>{isKh ? 'ឈ្មោះហាង' : 'Merchant Shop'}</th>
                    <th>{isKh ? 'ឈ្មោះសម្គាល់ Channel' : 'Channel Name'}</th>
                    <th>{isKh ? 'Chat ឬ Group ID' : 'Chat ID'}</th>
                    <th>{isKh ? 'ព្រឹត្តិការណ៍ជូនដំណឹង' : 'Notification Events'}</th>
                    <th style={{ textAlign: 'center', width: 100 }}>{isKh ? 'ស្ថានភាព' : 'Status'}</th>
                    <th style={{ width: 120, textAlign: 'center' }}>{t('actions') || (isKh ? 'សកម្មភាព' : 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '40px 0', textAlign: 'center' }}>
                        <div className="loading-wrapper"><div className="spinner" /></div>
                      </td>
                    </tr>
                  ) : pagedItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        {t('noDataFound') || (isKh ? 'គ្មានទិន្នន័យ' : 'No Telegram configurations found')}
                      </td>
                    </tr>
                  ) : (
                    pagedItems.map((cfg, i) => {
                      const merchantName = cfg.merchant ? (cfg.merchant.nameKh || cfg.merchant.name) : (isKh ? 'ក្រុមហ៊ុនទូទៅ' : 'Global Default');
                      return (
                        <tr key={cfg.id}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
                            {(currentPage - 1) * pageSize + i + 1}
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {merchantName}
                          </td>
                          <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            {cfg.channelTitle || '—'}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>
                            {cfg.chatId}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {cfg.notifySettlement && (
                                <span className="badge badge-delivered" style={{ fontSize: 11, padding: '2px 6px' }}>
                                  💵 Settlement
                                </span>
                              )}
                              {cfg.notifyNewOrder && (
                                <span className="badge badge-pending" style={{ fontSize: 11, padding: '2px 6px' }}>
                                  📦 Order
                                </span>
                              )}
                              {cfg.notifyDeliverySuccess && (
                                <span className="badge badge-delivered" style={{ fontSize: 11, padding: '2px 6px' }}>
                                  ✅ Success
                                </span>
                              )}
                              {cfg.notifyDeliveryFailed && (
                                <span className="badge badge-cancelled" style={{ fontSize: 11, padding: '2px 6px' }}>
                                  ⚠️ Failed
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {cfg.isActive ? (
                              <span className="badge badge-delivered" style={{ fontSize: 11 }}>
                                {isKh ? 'សកម្ម' : 'Active'}
                              </span>
                            ) : (
                              <span className="badge badge-cancelled" style={{ fontSize: 11 }}>
                                {isKh ? 'បិទ' : 'Disabled'}
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                              <button
                                className="btn btn-ghost btn-icon btn-sm"
                                title={isKh ? 'តេស្តផ្ញើសារ' : 'Send Test Ping'}
                                onClick={() => {
                                  setTestChatId(cfg.chatId);
                                  setTestResult(null);
                                  setShowTestModal(true);
                                }}
                              >
                                <FaTelegramPlane size={13} color="#0284c7" />
                              </button>
                              <button
                                className="btn btn-ghost btn-icon btn-sm"
                                title={isKh ? 'កែប្រែ' : 'Edit'}
                                onClick={() => handleOpenEdit(cfg)}
                              >
                                <FaRegEdit size={14} />
                              </button>
                              <button
                                className="btn btn-ghost btn-icon btn-sm"
                                style={{ color: 'var(--danger)' }}
                                title={isKh ? 'លុប' : 'Delete'}
                                onClick={() => handleDeleteConfig(cfg.id)}
                              >
                                <FaTrashAlt size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {filtered.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filtered.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(sz) => {
                  setPageSize(sz);
                  setCurrentPage(1);
                }}
              />
            )}
          </div>
        </div>

        {/* Modal: Test Bot */}
        <Modal
          open={showTestModal}
          onClose={() => setShowTestModal(false)}
          title={isKh ? 'តេស្តការភ្ជាប់ Telegram Bot' : 'Test Bot Connection'}
          size="sm"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowTestModal(false)}>
                {isKh ? 'បិទ' : 'Close'}
              </button>
              <button type="button" className="btn btn-primary btn-sm" disabled={testing} onClick={handleRunTest}>
                <MdSend size={14} /> {testing ? (isKh ? 'កំពុងផ្ញើ...' : 'Sending...') : (isKh ? 'ផ្ញើសារតេស្ត' : 'Send Test Ping')}
              </button>
            </div>
          }
        >
          <div>
            <div className="form-group">
              <label className="form-label">{isKh ? 'Chat ID ឬ Group ID សម្រាប់តេស្ត:' : 'Test Chat ID:'}</label>
              <input
                type="text"
                className="form-control"
                placeholder="761552994"
                value={testChatId}
                onChange={(e) => setTestChatId(e.target.value)}
              />
            </div>

            {testResult && (
              <div
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 13,
                  background: testResult.success ? '#ecfdf5' : '#fef2f2',
                  border: `1px solid ${testResult.success ? '#a7f3d0' : '#fecaca'}`,
                  color: testResult.success ? '#065f46' : '#991b1b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {testResult.success ? <MdCheckCircle size={18} /> : <MdCancel size={18} />}
                <span>{testResult.message || testResult.error}</span>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
}
