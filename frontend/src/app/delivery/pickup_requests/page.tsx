'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import { getPickupRequestStatusLabel } from '@/lib/status';
import { TableSkeleton } from '@/components/ui/Skeleton';
import Pagination from '@/components/ui/Pagination';
import {
  MdRefresh, MdSearch, MdClose, MdVisibility, MdDirectionsBike,
  MdCheckCircle, MdHourglassEmpty, MdLocalShipping, MdPhone, MdNotes, MdStorefront, MdSync, MdExpandMore,
} from 'react-icons/md';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:        { bg: '#fef3c7', color: '#d97706' },
  assigned:       { bg: '#dbeafe', color: '#2563eb' },
  'picked-up':    { bg: '#f3e8ff', color: '#7c3aed' },
  'in-warehouse': { bg: '#e0f2fe', color: '#0284c7' },
  completed:      { bg: '#dcfce7', color: '#16a34a' },
  cancelled:      { bg: '#fee2e2', color: '#dc2626' },
};

function StatusBadge({ status, lang, onClick }: { status: string; lang: string; onClick?: () => void }) {
  const cfg = STATUS_COLORS[status] ?? { bg: '#f3f4f6', color: '#6b7280' };
  return (
    <button
      type="button"
      onClick={onClick}
      title={lang === 'km' ? 'ចុចដើម្បីប្តូរស្ថានភាព' : 'Click to update status'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
        background: cfg.bg, color: cfg.color,
        border: '1px solid transparent',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'filter 0.15s, transform 0.15s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.filter = 'brightness(0.94)'; }}
      onMouseLeave={(e) => { if (onClick) e.currentTarget.style.filter = 'none'; }}
    >
      {status === 'pending' && <MdHourglassEmpty size={13} />}
      {status === 'assigned' && <MdDirectionsBike size={13} />}
      {status === 'picked-up' && <MdLocalShipping size={13} />}
      {status === 'completed' && <MdCheckCircle size={13} />}
      <span>{getPickupRequestStatusLabel(status, lang)}</span>
      {onClick && <MdExpandMore size={14} style={{ opacity: 0.75, marginLeft: -1 }} />}
    </button>
  );
}

function formatDate(d: string | null | undefined) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PickupRequestsPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch]           = useState('');
  const [statusFilter, setStatus]     = useState('');
  const [pageSize, setPageSize]       = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [previewModalImg, setPreviewModalImg] = useState<string | null>(null);

  /* ── update status modal ── */
  const [statusTarget, setStatusTarget]     = useState<any | null>(null);
  const [nextStatus, setNextStatus]         = useState<string>('picked-up');
  const [actualQtyInput, setActualQtyInput] = useState<string>('');
  const [statusNote, setStatusNote]         = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const openStatusModal = (r: any) => {
    setStatusTarget(r);
    const defaultNext =
      r.status === 'pending' || r.status === 'assigned'
        ? 'picked-up'
        : r.status;
    setNextStatus(defaultNext);
    setActualQtyInput(
      r.actualQuantity != null
        ? String(r.actualQuantity)
        : r.declaredQuantity != null
          ? String(r.declaredQuantity)
          : '',
    );
    setStatusNote(r.driverNote || '');
  };

  const handleUpdateStatus = async () => {
    if (!statusTarget || !nextStatus) return;
    setUpdatingStatus(true);
    try {
      const payload: Record<string, any> = {
        status: nextStatus,
        driverNote: statusNote.trim() || undefined,
      };
      if (actualQtyInput !== '' && !isNaN(Number(actualQtyInput))) {
        payload.actualQuantity = Math.max(0, Math.floor(Number(actualQtyInput)));
      }
      await api.patch(`/parcels/pickup-requests/${statusTarget.id}/status`, payload);
      setStatusTarget(null);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message || (lang === 'km' ? 'មិនអាចធ្វើបច្ចុប្បន្នភាពស្ថានភាពបានទេ' : 'Failed to update status'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/parcels/pickup-requests', { params });
      setRequests(res.data);
    } catch { /* silent */ }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    load();
  }, [router, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter(r =>
      r.merchant?.name?.toLowerCase().includes(q) ||
      r.merchant?.nameKh?.toLowerCase().includes(q) ||
      r.shopLocation?.toLowerCase().includes(q) ||
      r.merchant?.phone?.toLowerCase().includes(q) ||
      String(r.id).includes(q)
    );
  }, [requests, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage   = Math.min(currentPage, totalPages);
  const paginated  = useMemo(() => {
    const s = (safePage - 1) * pageSize;
    return filtered.slice(s, s + pageSize);
  }, [filtered, safePage, pageSize]);

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, pageSize]);

  const statuses = ['', 'pending', 'assigned', 'picked-up', 'in-warehouse', 'completed', 'cancelled'];

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('pickupRequests')} subtitle={t('pickupRequestsSubtitle')} />
        <div className="page-content">
          <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* ── Header ── */}
            <div className="card-header" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                  <div className="card-title" style={{ fontSize: 16 }}>{t('pickupRequestList')}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                    {filtered.length} / {requests.length} {t('record')}
                  </div>
                </div>
              <button className="btn btn-outline" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MdRefresh size={16} /> {lang === 'km' ? 'ផ្ទុកឡើងវិញ' : 'Refresh'}
              </button>
            </div>

            {/* ── Filters bar ── */}
            <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center', background: 'var(--bg-card)', flexWrap: 'wrap' }}>
              {/* Search */}
              <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                <MdSearch size={17} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder={t('searchPickupRequests')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', paddingLeft: 34, paddingRight: search ? 32 : 12, paddingTop: 8, paddingBottom: 8, border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 13, background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#d97706')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 2 }}>
                    <MdClose size={15} />
                  </button>
                )}
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={e => setStatus(e.target.value)}
                style={{ padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 13, background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', minWidth: 160 }}
              >
                {statuses.map(s => (
                  <option key={s} value={s}>
                    {s === '' ? t('allStatuses') : getPickupRequestStatusLabel(s, lang)}
                  </option>
                ))}
              </select>

              {/* Page size */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{lang === 'km' ? 'ចំនួនជួរ៖' : 'Rows:'}</span>
                {PAGE_SIZE_OPTIONS.map(sz => (
                  <button key={sz} onClick={() => setPageSize(sz)} style={{
                    padding: '5px 10px', borderRadius: 8,
                    border: `1.5px solid ${pageSize === sz ? 'var(--accent)' : 'var(--border)'}`,
                    background: pageSize === sz ? 'var(--accent-light)' : 'transparent',
                    color: pageSize === sz ? 'var(--accent)' : 'var(--text-secondary)',
                    fontSize: 12, fontWeight: pageSize === sz ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s',
                  }}>{sz}</button>
                ))}
              </div>
            </div>

            {/* ── Table ── */}
            <div style={{ overflowX: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--sidebar-bg, #1565D8)' }}>
                  <tr style={{ background: 'var(--sidebar-bg, #1565D8)' }}>
                    <th style={{ width: 70, padding: '12px 10px', textAlign: 'center', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'ល.រ' : 'No.'}</th>
                    <th style={{ padding: '12px 10px', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('merchant')}</th>
                    <th style={{ padding: '12px 10px', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('location')}</th>
                    <th style={{ padding: '12px 10px', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('pickupDriver')}</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('declaredQty')}</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('actualQty')}</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('completedQty')}</th>
                    <th style={{ padding: '12px 10px', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('scheduledAt')}</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('status')}</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton columns={10} rows={6} hasThumbnail />
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        {t('noDataFound') || 'គ្មានទិន្នន័យ'}
                      </td>
                    </tr>
                  ) : (
                    paginated.map((r: any) => {
                      const completedCount = r.parcels?.length ?? r.orders?.length ?? 0;
                      const progress = r.declaredQuantity > 0 ? Math.min(100, Math.round((completedCount / r.declaredQuantity) * 100)) : 0;
                      const merchantName = r.merchant?.nameKh || r.merchant?.name || '—';
                      const photoUrl = r.photo || r.photos?.[0];
                      const canUpdateStatus = r.status === 'pending' || r.status === 'assigned';
                      return (
                        <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                          <td style={{ padding: '12px 10px', textAlign: 'center', border: 'none' }}>
                            <span style={{
                              display: 'inline-block',
                              fontFamily: 'monospace',
                              fontSize: 12.5,
                              background: 'var(--accent-light, #eff6ff)',
                              color: 'var(--accent, #1565D8)',
                              padding: '3px 9px',
                              borderRadius: 7,
                              fontWeight: 700,
                            }}>
                              #{r.id}
                            </span>
                          </td>
                          <td style={{ padding: '12px 10px', border: 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                              {photoUrl ? (
                                <div
                                  onClick={() => setPreviewModalImg(photoUrl)}
                                  style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    overflow: 'hidden',
                                    border: '1.5px solid #e2e8f0',
                                    flexShrink: 0,
                                    cursor: 'pointer',
                                    background: '#f8fafc',
                                  }}
                                  title={lang === 'km' ? 'ចុចដើម្បីពង្រីករូបភាព' : 'Click to zoom'}
                                >
                                  <img
                                    src={photoUrl}
                                    alt="Goods"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                </div>
                              ) : (
                                <div
                                  style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    background: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    color: '#64748b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  <MdStorefront size={19} />
                                </div>
                              )}
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a', lineHeight: 1.35 }}>
                                  {merchantName}
                                </div>
                                {r.merchant?.phone && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                    <MdPhone size={12} color="#94a3b8" />
                                    <span>{r.merchant.phone}</span>
                                  </div>
                                )}
                                {r.note && (
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      fontSize: 11.5,
                                      color: '#64748b',
                                      marginTop: 2,
                                      maxWidth: 180,
                                    }}
                                    title={r.note}
                                  >
                                    <MdNotes size={12} color="#94a3b8" style={{ flexShrink: 0 }} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {r.note}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 10px', border: 'none' }}>
                            <div
                              title={r.pickupAddress || ''}
                              style={{
                                fontSize: 13,
                                maxWidth: 210,
                                lineHeight: 1.45,
                                color: '#475569',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {r.pickupAddress && r.pickupAddress.trim() !== '=' ? r.pickupAddress : (
                                <span style={{ color: '#94a3b8' }}>—</span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '12px 10px', border: 'none' }}>
                            {r.pickupDriver ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {(r.pickupProofPhoto || r.pickupProofPhotos?.[0]) ? (
                                  <div
                                    onClick={() => setPreviewModalImg(r.pickupProofPhoto || r.pickupProofPhotos[0])}
                                    style={{
                                      width: 34,
                                      height: 34,
                                      borderRadius: 8,
                                      overflow: 'hidden',
                                      border: '1.5px solid #86efac',
                                      flexShrink: 0,
                                      cursor: 'pointer',
                                      background: '#f8fafc',
                                    }}
                                    title={lang === 'km' ? 'ភស្តុតាងទៅយក — ចុចមើល' : 'Pickup Proof — Click to view'}
                                  >
                                    <img
                                      src={r.pickupProofPhoto || r.pickupProofPhotos[0]}
                                      alt="Proof"
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  </div>
                                ) : null}
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 13.5, color: '#0f172a' }}>{r.pickupDriver.nameKh || r.pickupDriver.name}</div>
                                  {r.driverNote && (
                                    <div style={{ fontSize: 11.5, color: '#16a34a', marginTop: 1, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.driverNote}>
                                      {r.driverNote}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span style={{
                                display: 'inline-block',
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#94a3b8',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                padding: '2px 9px',
                                borderRadius: 6,
                                whiteSpace: 'nowrap',
                              }}>
                                {lang === 'km' ? 'មិនទាន់ចាត់ចែង' : 'Unassigned'}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 700, fontSize: 14, color: '#0f172a', border: 'none' }}>
                            {r.declaredQuantity ?? <span style={{ color: '#cbd5e1', fontWeight: 500 }}>—</span>}
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 700, fontSize: 14, color: '#0f172a', border: 'none' }}>
                            {r.actualQuantity ?? <span style={{ color: '#cbd5e1', fontWeight: 500 }}>—</span>}
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'center', border: 'none' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                              <span style={{ fontWeight: 700, fontSize: 13.5, color: completedCount >= (r.declaredQuantity ?? 0) && r.declaredQuantity > 0 ? '#16a34a' : '#0f172a' }}>
                                {completedCount}{r.declaredQuantity ? ` / ${r.declaredQuantity}` : ''}
                              </span>
                              {r.declaredQuantity > 0 && (
                                <div style={{ width: 64, height: 5, borderRadius: 9999, background: '#e2e8f0', overflow: 'hidden' }}>
                                  <div style={{ width: `${progress}%`, height: '100%', borderRadius: 9999, background: progress >= 100 ? '#16a34a' : 'var(--accent, #1565D8)', transition: 'width 0.4s' }} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '12px 10px', fontSize: 12.5, color: '#64748b', whiteSpace: 'nowrap', border: 'none' }}>
                            {formatDate(r.pickupTime)}
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'center', border: 'none' }}>
                            <StatusBadge
                              status={r.status}
                              lang={lang}
                              onClick={canUpdateStatus ? () => openStatusModal(r) : undefined}
                            />
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'center', border: 'none' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
                              {canUpdateStatus && (
                                <button
                                  type="button"
                                  onClick={() => openStatusModal(r)}
                                  title={lang === 'km' ? 'ប្តូរស្ថានភាព' : 'Update Status'}
                                  style={{
                                    width: 32,
                                    height: 32,
                                    padding: 0,
                                    borderRadius: 8,
                                    border: '1px solid #e2e8f0',
                                    background: '#ffffff',
                                    color: '#475569',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    flexShrink: 0,
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--accent, #0f766e)';
                                    e.currentTarget.style.color = 'var(--accent, #0f766e)';
                                    e.currentTarget.style.background = 'var(--accent-light, #f0fdfa)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                    e.currentTarget.style.color = '#475569';
                                    e.currentTarget.style.background = '#ffffff';
                                  }}
                                >
                                  <MdSync size={16} />
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => router.push(`/delivery/pickup_requests/${r.id}`)}
                                title={t('viewInbound')}
                                style={{
                                  width: 32,
                                  height: 32,
                                  padding: 0,
                                  minHeight: 32,
                                  borderRadius: 8,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <MdVisibility size={16} />
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

            {/* ── Pagination ── */}
            {!loading && filtered.length > 0 && (
              <Pagination
                currentPage={safePage}
                totalItems={filtered.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(sz) => { setPageSize(sz); setCurrentPage(1); }}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
              />
            )}
          </div>
        </div>
      </div>

      {/* Update Status Modal */}
      {statusTarget && (
        <div
          onClick={() => setStatusTarget(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(0,0,0,0.2)', position: 'relative' }}
          >
            <button
              onClick={() => setStatusTarget(null)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
            >
              <MdClose size={22} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ccfbf1', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MdSync size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17 }}>
                  {lang === 'km' ? 'ប្តូរស្ថានភាពសំណើប្រមូល' : 'Update Pickup Request Status'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  #{statusTarget.id} — {statusTarget.merchant?.nameKh || statusTarget.merchant?.name || '—'}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {(['pending', 'assigned', 'picked-up', 'in-warehouse', 'completed', 'cancelled'] as const).map((st) => {
                const selected = nextStatus === st;
                const sc = STATUS_COLORS[st] ?? { bg: '#f1f5f9', color: '#475569' };
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setNextStatus(st)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: `2px solid ${selected ? sc.color : 'var(--border)'}`,
                      background: selected ? sc.bg : 'var(--bg-primary)',
                      color: selected ? sc.color : 'var(--text-primary)',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span>{getPickupRequestStatusLabel(st, lang)}</span>
                    {selected && <MdCheckCircle size={18} />}
                  </button>
                );
              })}
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label" style={{ fontSize: 12.5, fontWeight: 600 }}>
                {lang === 'km' ? 'ចំនួនកញ្ចប់ជាក់ស្តែង (Actual Quantity)' : 'Actual Quantity'}
              </label>
              <input
                type="number"
                min={0}
                className="form-control"
                value={actualQtyInput}
                onChange={(e) => setActualQtyInput(e.target.value)}
                placeholder={String(statusTarget.declaredQuantity ?? 0)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontSize: 12.5, fontWeight: 600 }}>
                {lang === 'km' ? 'កំណត់ចំណាំ (ស្រេចចិត្ត)' : 'Note (Optional)'}
              </label>
              <input
                type="text"
                className="form-control"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder={lang === 'km' ? 'ឧ. ហាងយកមកដាក់ឃ្លាំងផ្ទាល់...' : 'e.g. Dropped off at warehouse...'}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={handleUpdateStatus}
              disabled={updatingStatus}
              style={{ width: '100%', padding: '12px', borderRadius: 10, fontWeight: 700, fontSize: 14 }}
            >
              {updatingStatus
                ? (lang === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...')
                : (lang === 'km' ? 'រក្សាទុកស្ថានភាពថ្មី' : 'Save Status')}
            </button>
          </div>
        </div>
      )}

      {/* Lightbox / Zoom Modal */}
      {previewModalImg && (
        <div
          onClick={() => setPreviewModalImg(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '85vh',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewModalImg}
              alt="Enlarged Goods"
              style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', display: 'block' }}
            />
            <button
              onClick={() => setPreviewModalImg(null)}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MdClose size={22} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

