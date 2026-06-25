'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdRefresh, MdSearch, MdClose, MdVisibility, MdDirectionsBike,
  MdCheckCircle, MdHourglassEmpty, MdLocalShipping,
} from 'react-icons/md';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  pending:    { bg: '#fef3c7', color: '#d97706', label: 'Pending' },
  assigned:   { bg: '#dbeafe', color: '#2563eb', label: 'Assigned' },
  'picked-up':{ bg: '#f3e8ff', color: '#7c3aed', label: 'Picked Up' },
  completed:  { bg: '#dcfce7', color: '#16a34a', label: 'Completed' },
  cancelled:  { bg: '#fee2e2', color: '#dc2626', label: 'Cancelled' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_COLORS[status] ?? { bg: '#f3f4f6', color: '#6b7280', label: status };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
      background: cfg.bg, color: cfg.color,
    }}>
      {status === 'pending' && <MdHourglassEmpty size={13} />}
      {status === 'assigned' && <MdDirectionsBike size={13} />}
      {status === 'picked-up' && <MdLocalShipping size={13} />}
      {status === 'completed' && <MdCheckCircle size={13} />}
      {cfg.label}
    </span>
  );
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PickupRequestsPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch]           = useState('');
  const [statusFilter, setStatus]     = useState('');
  const [pageSize, setPageSize]       = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/orders/pickup-requests', { params });
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

  const statuses = ['', 'pending', 'assigned', 'picked-up', 'completed', 'cancelled'];

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('pickupRequests')} subtitle={t('pickupRequestsSubtitle')} />
        <div className="page-content">
          <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* ── Header ── */}
            <div className="card-header" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#d97706,#f59e0b)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 4px 12px rgba(217,119,6,0.3)' }}>
                  📦
                </div>
                <div>
                  <div className="card-title" style={{ fontSize: 16 }}>{t('pickupRequestList')}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                    {filtered.length} / {requests.length} {t('record')}
                  </div>
                </div>
              </div>
              <button className="btn btn-outline" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MdRefresh size={16} /> Refresh
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
                    {s === '' ? t('allStatuses') : (STATUS_COLORS[s]?.label ?? s)}
                  </option>
                ))}
              </select>

              {/* Page size */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Rows:</span>
                {PAGE_SIZE_OPTIONS.map(sz => (
                  <button key={sz} onClick={() => setPageSize(sz)} style={{
                    padding: '5px 10px', borderRadius: 8,
                    border: `1.5px solid ${pageSize === sz ? '#d97706' : 'var(--border)'}`,
                    background: pageSize === sz ? '#fef3c7' : 'transparent',
                    color: pageSize === sz ? '#d97706' : 'var(--text-secondary)',
                    fontSize: 12, fontWeight: pageSize === sz ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s',
                  }}>{sz}</button>
                ))}
              </div>
            </div>

            {/* ── Table ── */}
            {loading ? (
              <div className="loading-wrapper"><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state" style={{ padding: '60px 0' }}>
                <div className="empty-state-icon">📦</div>
                <div className="empty-state-title">{t('noPickupRequests')}</div>
                <div className="empty-state-text">No pickup requests match your current filters.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', flex: 1 }}>
                <table>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-primary)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <tr>
                      <th style={{ paddingLeft: 24 }}>{t('requestNo')}</th>
                      <th>{t('merchant')}</th>
                      <th>{t('location')}</th>
                      <th>{t('pickupDriver')}</th>
                      <th>{t('declaredQty')}</th>
                      <th>{t('actualQty')}</th>
                      <th>{t('completedQty')}</th>
                      <th>{t('scheduledAt')}</th>
                      <th>{t('status')}</th>
                      <th>{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((r: any) => {
                      const completedCount = r.orders?.length ?? 0;
                      const progress = r.declaredQuantity > 0 ? Math.round((completedCount / r.declaredQuantity) * 100) : 0;
                      return (
                        <tr key={r.id}>
                          <td style={{ paddingLeft: 24 }}>
                            <code style={{ fontSize: 12, background: 'rgba(0,0,0,0.05)', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                              #{r.id}
                            </code>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{r.merchant?.name || '—'}</div>
                            {r.merchant?.nameKh && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.merchant.nameKh}</div>}
                            {r.merchant?.phone && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>📞 {r.merchant.phone}</div>}
                          </td>
                          <td>
                            <div style={{ fontSize: 12, maxWidth: 150, wordBreak: 'break-word', lineHeight: 1.4 }}>
                              {r.pickupAddress || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                            </div>
                          </td>
                          <td>
                            {r.pickupDriver ? (
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{r.pickupDriver.name}</div>
                                {r.pickupDriver.nameKh && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.pickupDriver.nameKh}</div>}
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.declaredQuantity ?? '—'}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.actualQuantity ?? '—'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontWeight: 700, color: completedCount >= (r.declaredQuantity ?? 0) && r.declaredQuantity > 0 ? '#16a34a' : 'var(--text-primary)' }}>
                                {completedCount}{r.declaredQuantity ? ` / ${r.declaredQuantity}` : ''}
                              </span>
                              {r.declaredQuantity > 0 && (
                                <div style={{ width: 60, height: 5, borderRadius: 9999, background: 'var(--border)', overflow: 'hidden' }}>
                                  <div style={{ width: `${progress}%`, height: '100%', borderRadius: 9999, background: progress >= 100 ? '#16a34a' : '#d97706', transition: 'width 0.4s' }} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ fontSize: 12 }}>{formatDate(r.pickupTime)}</td>
                          <td><StatusBadge status={r.status} /></td>
                          <td>
                            <button
                              onClick={() => router.push(`/delivery/pickup_requests/${r.id}`)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1.5px solid #d97706', background: '#fef3c7', color: '#d97706', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                              onMouseEnter={e => { (e.currentTarget as any).style.background = '#d97706'; (e.currentTarget as any).style.color = '#fff'; }}
                              onMouseLeave={e => { (e.currentTarget as any).style.background = '#fef3c7'; (e.currentTarget as any).style.color = '#d97706'; }}
                            >
                              <MdVisibility size={14} /> {t('viewInbound')}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Pagination ── */}
            {!loading && filtered.length > 0 && (
              <div style={{ padding: '10px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
                </span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button onClick={() => setCurrentPage(1)} disabled={safePage === 1} style={paginationBtnStyle(safePage === 1)}>«</button>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1} style={paginationBtnStyle(safePage === 1)}>‹</button>
                  {getPageNumbers(safePage, totalPages).map((pg, i) =>
                    pg === '...' ? (
                      <span key={`e-${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: 13 }}>…</span>
                    ) : (
                      <button key={pg} onClick={() => setCurrentPage(pg as number)} style={{
                        ...paginationBtnStyle(false),
                        background: safePage === pg ? '#d97706' : 'transparent',
                        color: safePage === pg ? '#fff' : 'var(--text-secondary)',
                        borderColor: safePage === pg ? '#d97706' : 'var(--border)',
                        fontWeight: safePage === pg ? 700 : 500,
                      }}>{pg}</button>
                    )
                  )}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={paginationBtnStyle(safePage === totalPages)}>›</button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages} style={paginationBtnStyle(safePage === totalPages)}>»</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [];
  if (current <= 4) { pages.push(1, 2, 3, 4, 5, '...', total); }
  else if (current >= total - 3) { pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total); }
  else { pages.push(1, '...', current - 1, current, current + 1, '...', total); }
  return pages;
}

function paginationBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '5px 10px', minWidth: 32, borderRadius: 8,
    border: '1.5px solid var(--border)', background: 'transparent',
    color: disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
    fontSize: 13, fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1, transition: 'all 0.15s',
  };
}
