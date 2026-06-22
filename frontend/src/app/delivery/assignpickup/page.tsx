'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';
import { MdLocalShipping, MdRefresh, MdSearch, MdClose, MdWarehouse } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';

const formatCOD = (cod: any, currency: string) => {
  if (currency === 'KHR') return `${parseInt(cod).toLocaleString()} ៛`;
  return `$${parseFloat(cod).toFixed(2)}`;
};

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export default function AssignPickupPage() {
  const router = useRouter();
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const { t } = useLanguage();
  const [selected, setSelected] = useState<number[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  // Orders search & pagination
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  // Driver search
  const [driverSearch, setDriverSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orders, drvs] = await Promise.all([
        api.get('/orders/pending-pickup'),
        api.get('/drivers/available'),
      ]);
      setPendingOrders(orders.data);
      setDrivers(drvs.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    load();
  }, [router, load]);

  // Filter drivers by search
  const filteredDrivers = useMemo(() => {
    const q = driverSearch.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter(d =>
      d.name?.toLowerCase().includes(q) ||
      d.nameKh?.toLowerCase().includes(q) ||
      d.zone?.name?.toLowerCase().includes(q) ||
      d.phone?.toLowerCase().includes(q)
    );
  }, [drivers, driverSearch]);

  // Filter orders by search
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pendingOrders;
    return pendingOrders.filter(o =>
      o.trackingCode?.toLowerCase().includes(q) ||
      o.merchant?.name?.toLowerCase().includes(q) ||
      o.merchant?.nameKh?.toLowerCase().includes(q) ||
      o.receiverPhone?.toLowerCase().includes(q) ||
      o.receiverAddress?.toLowerCase().includes(q)
    );
  }, [pendingOrders, search]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  useEffect(() => { setCurrentPage(1); }, [search, pageSize]);

  const toggleOrder = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const allPageSelected = paginated.length > 0 && paginated.every(o => selected.includes(o.id));
  const togglePageAll = (checked: boolean) => {
    const pageIds = paginated.map(o => o.id);
    if (checked) {
      setSelected(prev => Array.from(new Set([...prev, ...pageIds])));
    } else {
      setSelected(prev => prev.filter(id => !pageIds.includes(id)));
    }
  };

  const handleAssignPickup = async () => {
    if (!selectedDriver || selected.length === 0) return;
    setAssigning(true);
    try {
      await Promise.all(selected.map(id => api.post(`/orders/${id}/assign-pickup`, { driverId: selectedDriver })));
      setSelected([]);
      setSelectedDriver(null);
      setSearch('');
      setCurrentPage(1);
      await load();
      alert(`✅ ${selected.length} ${t('pickupAssignSuccess')}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error assigning pickup');
    }
    setAssigning(false);
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('pickupProcessTitle')} subtitle={t('pickupProcessSubtitle')} />
        <div className="page-content">
          <div className="assign-layout">
            {/* Orders panel */}
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
              <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Header */}
                <div className="card-header" style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '12px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                      🏪
                    </div>
                    <div>
                      <span className="card-title" style={{ fontSize: 16 }}>{t('pendingForPickup')}</span>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                        {filtered.length} / {pendingOrders.length} orders
                        {selected.length > 0 && (
                          <span style={{ marginLeft: 8, fontWeight: 600, color: '#d97706' }}>
                            · {selected.length} selected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {selected.length > 0 && (
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#d97706', background: '#fef3c7', padding: '4px 12px', borderRadius: 999 }}>
                        {selected.length} Selected
                      </span>
                    )}
                    <button className="btn btn-outline" onClick={load}><MdRefresh size={16} /> Refresh</button>
                  </div>
                </div>

                {/* Search + page size bar */}
                <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center', background: 'var(--bg-card)' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <MdSearch size={18} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      placeholder="ស្វែងរក tracking, merchant, phone..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{
                        width: '100%', paddingLeft: 34, paddingRight: search ? 32 : 12,
                        paddingTop: 8, paddingBottom: 8, border: '1.5px solid var(--border)',
                        borderRadius: 10, fontSize: 13, background: 'var(--bg-primary)',
                        color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = '#d97706'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    />
                    {search && (
                      <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 2 }}>
                        <MdClose size={16} />
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Rows:</span>
                    {PAGE_SIZE_OPTIONS.map(size => (
                      <button key={size} onClick={() => setPageSize(size)} style={{
                        padding: '5px 10px', borderRadius: 8,
                        border: `1.5px solid ${pageSize === size ? '#d97706' : 'var(--border)'}`,
                        background: pageSize === size ? '#fef3c7' : 'transparent',
                        color: pageSize === size ? '#d97706' : 'var(--text-secondary)',
                        fontSize: 12, fontWeight: pageSize === size ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s',
                      }}>{size}</button>
                    ))}
                  </div>
                </div>

                {/* Table */}
                {loading ? (
                  <div className="loading-wrapper"><div className="spinner" /></div>
                ) : filtered.length === 0 ? (
                  <div className="empty-state" style={{ margin: 'auto' }}>
                    <div className="empty-state-icon">{search ? '🔍' : '✅'}</div>
                    <div className="empty-state-title">{search ? 'No results found' : 'No pending parcels!'}</div>
                    <div className="empty-state-text">{search ? `No orders match "${search}"` : 'All pending parcels have been assigned for pickup'}</div>
                  </div>
                ) : (
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    <table>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-primary)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <tr>
                          <th style={{ width: 40, paddingLeft: 24 }}>
                            <input type="checkbox"
                              style={{ width: 16, height: 16, cursor: 'pointer' }}
                              checked={allPageSelected}
                              onChange={e => togglePageAll(e.target.checked)}
                            />
                          </th>
                          <th>{t('trackingCode')}</th>
                          <th>{t('merchant')}</th>
                          <th>{t('receiver')}</th>
                          <th>{t('address')}</th>
                          <th>{t('cod')}</th>
                          <th>{t('deliveryFee')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map((o: any) => (
                          <tr key={o.id} onClick={() => toggleOrder(o.id)}
                            style={{
                              cursor: 'pointer',
                              background: selected.includes(o.id) ? '#fef3c7' : '',
                              borderLeft: selected.includes(o.id) ? '4px solid #d97706' : '4px solid transparent',
                              transition: 'all 0.2s'
                            }}>
                            <td style={{ paddingLeft: 20 }}>
                              <input type="checkbox"
                                style={{ width: 16, height: 16, cursor: 'pointer' }}
                                checked={selected.includes(o.id)}
                                onChange={() => toggleOrder(o.id)}
                                onClick={e => e.stopPropagation()}
                              />
                            </td>
                            <td><code style={{ fontSize: 12, background: 'rgba(0,0,0,0.05)', padding: '4px 8px', borderRadius: 6, fontWeight: 600 }}>{o.trackingCode}</code></td>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{o.merchant?.name || '—'}</div>
                              {o.merchant?.nameKh && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.merchant.nameKh}</div>}
                            </td>
                            <td><div style={{ fontWeight: 600, fontSize: 13 }}>{o.receiverPhone}</div></td>
                            <td>
                              <div style={{ fontSize: 12, color: 'var(--text-primary)', maxWidth: 160, wordBreak: 'break-word', lineHeight: 1.4 }}>
                                {o.receiverAddress || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                              </div>
                            </td>
                            <td style={{ fontWeight: 700 }}>{formatCOD(o.cod, o.codCurrency || 'USD')}</td>
                            <td style={{ color: 'var(--success)', fontWeight: 600 }}>${parseFloat(o.deliveryFee).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
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

            {/* Driver panel */}
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
              <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Driver header */}
                <div className="card-header" style={{ padding: '16px 24px', background: 'var(--bg-primary)' }}>
                  <span className="card-title" style={{ fontSize: 16 }}>🚗 {t('assignPickupDriver')}</span>
                  {selectedDriver && (
                    <button onClick={() => setSelectedDriver(null)} style={{ fontSize: 12, color: 'var(--danger)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>
                      ✕ Clear
                    </button>
                  )}
                </div>

                {/* Driver search */}
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                  <div style={{ position: 'relative' }}>
                    <MdSearch size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input type="text"
                      placeholder="ស្វែងរក driver name, zone..."
                      value={driverSearch}
                      onChange={e => setDriverSearch(e.target.value)}
                      style={{
                        width: '100%', paddingLeft: 32, paddingRight: driverSearch ? 32 : 12,
                        paddingTop: 7, paddingBottom: 7, border: '1.5px solid var(--border)',
                        borderRadius: 10, fontSize: 13, background: 'var(--bg-primary)',
                        color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = '#d97706'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    />
                    {driverSearch && (
                      <button onClick={() => setDriverSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 2 }}>
                        <MdClose size={15} />
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                  {filteredDrivers.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px 16px' }}>
                      <div className="empty-state-title">No available drivers</div>
                      <div className="empty-state-text">All drivers might be busy or offline.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {filteredDrivers.map((d: any) => (
                        <div key={d.id}
                          onClick={() => setSelectedDriver(d.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 14,
                            padding: '14px 16px', borderRadius: '12px',
                            border: `2px solid ${selectedDriver === d.id ? '#d97706' : 'var(--border)'}`,
                            background: selectedDriver === d.id ? '#fef3c7' : 'var(--bg-card)',
                            boxShadow: selectedDriver === d.id ? '0 4px 12px rgba(217,119,6,0.15)' : 'none',
                            cursor: 'pointer', transition: 'all 0.2s ease',
                            transform: selectedDriver === d.id ? 'translateY(-2px)' : 'none'
                          }}>
                          <div style={{
                            width: 44, height: 44, borderRadius: '50%',
                            background: selectedDriver === d.id ? '#d97706' : 'var(--bg-primary)',
                            color: selectedDriver === d.id ? '#fff' : 'var(--text-secondary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: 16, transition: 'all 0.2s'
                          }}>
                            {d.name.charAt(0)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: selectedDriver === d.id ? '#92400e' : 'var(--text-primary)' }}>
                              {d.name} {d.nameKh && <span style={{ fontWeight: 500, fontSize: 13 }}>({d.nameKh})</span>}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                              📍 {d.zone?.name || t('noZone')}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <Badge status={d.status} />
                            {selectedDriver === d.id && (
                              <div style={{ marginTop: 6, color: '#d97706', fontSize: 18 }}>
                                <MdWarehouse />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action bottom bar */}
                <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)', boxShadow: '0 -4px 12px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Selected Orders</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: selected.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {selected.length}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Pickup Driver</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: selectedDriver ? '#d97706' : 'var(--danger)' }}>
                        {selectedDriver ? drivers.find(d => d.id === selectedDriver)?.name : 'None selected'}
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn w-full"
                    onClick={handleAssignPickup}
                    disabled={assigning || selected.length === 0 || !selectedDriver}
                    style={{
                      justifyContent: 'center', padding: '14px', fontSize: 15, borderRadius: 12,
                      background: (selected.length > 0 && selectedDriver) ? '#d97706' : 'var(--border)',
                      color: (selected.length > 0 && selectedDriver) ? '#fff' : 'var(--text-muted)',
                      border: 'none', cursor: (selected.length > 0 && selectedDriver) ? 'pointer' : 'not-allowed',
                      gap: 8, display: 'flex', alignItems: 'center',
                      boxShadow: (selected.length > 0 && selectedDriver) ? '0 8px 16px rgba(217,119,6,0.25)' : 'none',
                      transition: 'all 0.2s',
                    }}>
                    <MdWarehouse size={20} />
                    {assigning ? 'Assigning...' : t('confirmPickupAssignment')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [];
  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, '...', total);
  } else if (current >= total - 3) {
    pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }
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
