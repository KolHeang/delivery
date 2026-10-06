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
  MdErrorOutline,
  MdContentCopy,
  MdVisibility,
  MdVisibilityOff,
} from 'react-icons/md';
import { FaRegEdit, FaTrashAlt, FaEye } from 'react-icons/fa';
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

export default function FirebaseSettingsListPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const isKh = lang === 'km';
  const tr = (km: string, en: string) => (isKh ? km : en);

  // Data states
  const [items, setItems] = useState<FirebaseCredentialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // View Details Modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FirebaseCredentialItem | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  // Load list from backend
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

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
    loadData();
  }, [router, loadData]);

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

  // Delete Item
  const handleDelete = async (item: FirebaseCredentialItem) => {
    if (!confirm(tr(`តើអ្នកពិតជាចង់លុប Firebase (${item.projectId}) នេះមែនទេ?`, `Are you sure you want to delete Firebase configuration for "${item.projectId}"?`))) {
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

  // Search Filter & Pagination
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return items;
    return items.filter((item) =>
      (item.projectId || '').toLowerCase().includes(q) ||
      (item.clientEmail || '').toLowerCase().includes(q) ||
      (item.type || '').toLowerCase().includes(q) ||
      (item.privateKeyId || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar
          title={tr('ការកំណត់ Firebase (Firebase Credentials)', 'Firebase Credentials')}
          subtitle={tr('គ្រប់គ្រងបញ្ជី Google Service Accounts សម្រាប់ផ្ញើសារ Push Notification', 'Manage Firebase service accounts for push notifications')}
        />

        <div className="page-content">

          {/* Feedback messages */}
          {successMsg && (
            <div style={{
              backgroundColor: '#ecfdf5',
              color: '#065f46',
              padding: '12px 18px',
              borderRadius: 12,
              marginBottom: 16,
              fontSize: 13.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid #a7f3d0',
            }}>
              <MdCheckCircle size={20} color="#10b981" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div style={{
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              padding: '12px 18px',
              borderRadius: 12,
              marginBottom: 16,
              fontSize: 13.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid #fecaca',
            }}>
              <MdErrorOutline size={20} color="#ef4444" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Top Filter & Action Bar */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}>
              {/* Search Box */}
              <div className="search-input-wrapper" style={{ flex: 1, minWidth: 260, maxWidth: 450 }}>
                <MdSearch className="search-icon" />
                <input
                  className="form-control search-input"
                  placeholder={tr('ស្វែងរកតាម Project ID, Client Email, Key ID...', 'Search by Project ID, Email, Key ID...')}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {/* Status Indicator & Create Button (Navigates to /setting/firebase/create) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: items.length > 0 ? '#15803d' : '#b45309',
                  backgroundColor: items.length > 0 ? '#dcfce7' : '#fef3c7',
                  padding: '6px 12px',
                  borderRadius: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <SiFirebase size={14} color="#f59e0b" />
                  {items.length > 0
                    ? tr(`សរុប៖ ${items.length} គណនី`, `Total: ${items.length} Accounts`)
                    : tr('មិនទាន់មានទិន្នន័យ', 'No Accounts')}
                </span>

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

          {/* Main CRUD Table Card */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SiFirebase color="#f59e0b" size={18} />
                {tr('បញ្ជី Firebase Service Accounts', 'Firebase Service Accounts List')}
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 60, textAlign: 'center' }}>{t('colNo') || tr('ល.រ', 'No.')}</th>
                    <th>{tr('Firebase Project ID', 'Project ID')}</th>
                    <th>{tr('Client Email', 'Client Email')}</th>
                    <th>{tr('Private Key ID', 'Key ID')}</th>
                    <th>{tr('ប្រភេទ (Type)', 'Type')}</th>
                    <th>{tr('កាលបរិច្ឆេទ', 'Created / Updated')}</th>
                    <th style={{ textAlign: 'center', width: 100 }}>{tr('ស្ថានភាព', 'Status')}</th>
                    <th style={{ width: 140, textAlign: 'center' }}>{t('actions') || tr('សកម្មភាព', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px 0', textAlign: 'center' }}>
                        <div className="loading-wrapper"><div className="spinner" /></div>
                      </td>
                    </tr>
                  ) : pagedItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                          <SiFirebase size={36} color="#cbd5e1" />
                          <span>{tr('គ្មានទិន្នន័យ Firebase នៅឡើយទេ។ ចុច "បន្ថែម Firebase ថ្មី" ដើម្បីបញ្ចូល។', 'No Firebase credentials found. Click "Add Firebase" to create.')}</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pagedItems.map((item, i) => (
                      <tr key={item.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
                          {(currentPage - 1) * pageSize + i + 1}
                        </td>

                        {/* Project ID */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              backgroundColor: '#fff7ed',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}>
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
                            <span style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.clientEmail || '—'}
                            </span>
                            {item.clientEmail && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(item.clientEmail, `email-${item.id}`)}
                                title="Copy Email"
                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: copiedKey === `email-${item.id}` ? '#10b981' : '#94a3b8' }}
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
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            fontSize: 11,
                            fontWeight: 700,
                          }}>
                            {item.type || 'service_account'}
                          </span>
                        </td>

                        {/* Date */}
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {item.updatedAt
                            ? new Date(item.updatedAt).toLocaleDateString(isKh ? 'km-KH' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                            : '—'}
                        </td>

                        {/* Status */}
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-delivered" style={{ fontSize: 11, padding: '3px 8px' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', marginRight: 4 }} />
                            {tr('សកម្ម', 'Active')}
                          </span>
                        </td>

                        {/* Actions (View, Edit, Delete) */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            {/* View Details */}
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleOpenView(item)}
                              title={tr('មើលលម្អិត', 'View Details')}
                              style={{ padding: '6px 8px' }}
                            >
                              <FaEye size={13} color="#2563eb" />
                            </button>

                            {/* Edit (Navigates to /setting/firebase/edit/[id]) */}
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => router.push(`/setting/firebase/edit/${item.id}`)}
                              title={tr('កែប្រែ', 'Edit')}
                              style={{ padding: '6px 8px' }}
                            >
                              <FaRegEdit size={13} color="#059669" />
                            </button>

                            {/* Delete */}
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleDelete(item)}
                              title={tr('លុប', 'Delete')}
                              style={{ padding: '6px 8px', color: '#dc2626' }}
                            >
                              <FaTrashAlt size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filtered.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filtered.length}
                pageSize={pageSize}
                onPageChange={(p) => setCurrentPage(p)}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setCurrentPage(1);
                }}
              />
            )}
          </div>

          {/* VIEW / DETAILS MODAL */}
          <Modal
            open={showViewModal}
            onClose={() => setShowViewModal(false)}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FaEye color="#2563eb" size={18} />
                <span>{tr('ព័ត៌មានលម្អិត Firebase Credential', 'Firebase Credential Details')}</span>
              </div>
            }
            size="md"
            footer={
              <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowViewModal(false)}
                >
                  {t('close') || tr('បិទ', 'Close')}
                </button>
              </div>
            }
          >
            {selectedItem && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ padding: '12px 14px', borderRadius: 10, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>PROJECT ID</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{selectedItem.projectId}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedItem.projectId, 'view-proj')}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: copiedKey === 'view-proj' ? '#10b981' : '#64748b' }}
                    >
                      <MdContentCopy size={15} />
                    </button>
                  </div>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: 10, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>CLIENT EMAIL</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{selectedItem.clientEmail}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedItem.clientEmail, 'view-email')}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: copiedKey === 'view-email' ? '#10b981' : '#64748b' }}
                    >
                      <MdContentCopy size={15} />
                    </button>
                  </div>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: 10, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>PRIVATE KEY ID</div>
                  <div style={{ fontSize: 13, fontFamily: 'monospace', marginTop: 4, color: '#334155' }}>
                    {selectedItem.privateKeyId || '—'}
                  </div>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: 10, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>PRIVATE KEY</span>
                    <button
                      type="button"
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      style={{ border: 'none', background: 'none', color: '#2563eb', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      {showPrivateKey ? <MdVisibilityOff size={14} /> : <MdVisibility size={14} />}
                      {showPrivateKey ? tr('លាក់', 'Hide') : tr('បង្ហាញ', 'Show')}
                    </button>
                  </div>
                  <pre style={{
                    marginTop: 6,
                    padding: 8,
                    borderRadius: 6,
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    fontSize: 10.5,
                    maxHeight: 120,
                    overflowY: 'auto',
                    filter: showPrivateKey ? 'none' : 'blur(3px)',
                  }}>
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
