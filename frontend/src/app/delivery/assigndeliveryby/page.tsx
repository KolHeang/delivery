'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';
import { MdAssignmentTurnedIn, MdRefresh, MdSearch, MdClose } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';

const formatCOD = (cod: any, currency: string) => {
  if (currency === 'KHR') return `${parseInt(cod).toLocaleString()} ៛`;
  return `$${parseFloat(cod).toFixed(2)}`;
};

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export default function AssignDeliveryPage() {
  const router = useRouter();
  const [unassigned, setUnassigned] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const { lang, t } = useLanguage();
  const [selected, setSelected] = useState<number[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  // Tabs & History states
  const [assignTab, setAssignTab] = useState<'unassigned' | 'assigned'>('unassigned');

  const handleTabChange = (tab: 'unassigned' | 'assigned') => {
    setAssignTab(tab);
    setSelected([]);
    if (tab === 'unassigned') {
      setFilterDriverId('none');
    } else {
      setFilterDriverId('');
    }
  };

  // Orders Search & Pagination
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [filterDate, setFilterDate] = useState('');
  const [filterDriverId, setFilterDriverId] = useState('none');
  const [filterStatus, setFilterStatus] = useState('');

  // Driver search (right panel)
  const [driverSearch, setDriverSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orders, drvs] = await Promise.all([
        api.get('/parcels/in-warehouse'),
        api.get('/drivers/available'),
      ]);
      setUnassigned(orders.data);
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

  // Filter orders by search + date + driver + tab
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return unassigned.filter(o => {
      // text search
      if (q && !(
        o.trackingCode?.toLowerCase().includes(q) ||
        o.merchant?.name?.toLowerCase().includes(q) ||
        o.receiverPhone?.toLowerCase().includes(q) ||
        o.receiverAddress?.toLowerCase().includes(q)
      )) return false;
      // date filter — match by createdAt date (YYYY-MM-DD)
      if (filterDate) {
        const orderDate = o.createdAt ? o.createdAt.slice(0, 10) : '';
        if (orderDate !== filterDate) return false;
      }
      // status filter
      if (filterStatus) {
        if (o.status !== filterStatus) return false;
      }
      // Tab / Driver filter
      if (assignTab === 'unassigned') {
        if (o.driverId != null) return false;
      } else {
        if (o.driverId == null) return false;
        if (filterDriverId && filterDriverId !== 'none' && String(o.driverId) !== filterDriverId) {
          return false;
        }
      }
      return true;
    });
  }, [unassigned, search, filterDate, filterDriverId, filterStatus, assignTab]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [search, pageSize, filterDate, filterDriverId, filterStatus, assignTab]);

  const toggleOrder = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Select all on current page
  const allPageSelected = paginated.length > 0 && paginated.every(o => selected.includes(o.id));
  const togglePageAll = (checked: boolean) => {
    const pageIds = paginated.map(o => o.id);
    if (checked) {
      setSelected(prev => Array.from(new Set([...prev, ...pageIds])));
    } else {
      setSelected(prev => prev.filter(id => !pageIds.includes(id)));
    }
  };

  const handleAssign = async () => {
    if (!selectedDriver || selected.length === 0) return;
    setAssigning(true);
    try {
      await Promise.all(selected.map(id => api.post(`/parcels/${id}/assign-delivery`, { driverId: selectedDriver })));
      const count = selected.length;
      setSelected([]);
      setSelectedDriver(null);
      setSearch('');
      setCurrentPage(1);
      await load();
      alert(`✅ ${count} order(s) assigned for delivery successfully!`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error assigning orders');
    }
    setAssigning(false);
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('assignTitle')} subtitle={t('assignSubtitle')} />
        <div className="page-content">
          <div className="assign-layout">
            {/* Orders panel */}
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
              <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Header */}
                <div className="card-header" style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                      📦
                    </div>
                    <div>
                      <span className="card-title" style={{ fontSize: 16 }}>
                        {assignTab === 'unassigned'
                          ? (lang === 'km' ? 'កញ្ចប់អីវ៉ាន់មិនទាន់ចាត់ចែង' : 'Unassigned Parcels')
                          : (lang === 'km' ? 'កញ្ចប់អីវ៉ាន់ចាត់ចែងរួច' : 'Assigned Parcels')
                        }
                      </span>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                        {filtered.length} / {unassigned.length} {lang === 'km' ? 'កញ្ចប់' : 'orders'}
                        {selected.length > 0 && (
                          <span style={{ marginLeft: 8, fontWeight: 600, color: 'var(--accent)' }}>
                            · {selected.length} {lang === 'km' ? 'បានជ្រើសរើស' : 'selected'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {selected.length > 0 && (
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-light)', padding: '4px 12px', borderRadius: 999 }}>
                        {selected.length} {lang === 'km' ? 'បានជ្រើសរើស' : 'Selected'}
                      </span>
                    )}
                    <button className="btn btn-outline" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MdRefresh size={16} /> {lang === 'km' ? 'ផ្ទុកឡើងវិញ' : 'Refresh'}
                    </button>
                  </div>
                </div>

                {/* Tabs Bar */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 24px', background: 'var(--bg-card)', gap: 24 }}>
                  <button 
                    onClick={() => handleTabChange('unassigned')}
                    style={{ 
                      padding: '12px 8px', 
                      fontSize: 14, 
                      fontWeight: 600, 
                      color: assignTab === 'unassigned' ? 'var(--accent)' : 'var(--text-muted)', 
                      borderBottom: assignTab === 'unassigned' ? '2px solid var(--accent)' : '2px solid transparent',
                      background: 'transparent',
                      borderTop: 'none',
                      borderLeft: 'none',
                      borderRight: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>🔴</span>
                    <span>{lang === 'km' ? 'មិនទាន់ចាត់ចែង' : 'Unassigned'}</span>
                  </button>
                  <button 
                    onClick={() => handleTabChange('assigned')}
                    style={{ 
                      padding: '12px 8px', 
                      fontSize: 14, 
                      fontWeight: 600, 
                      color: assignTab === 'assigned' ? 'var(--accent)' : 'var(--text-muted)', 
                      borderBottom: assignTab === 'assigned' ? '2px solid var(--accent)' : '2px solid transparent',
                      background: 'transparent',
                      borderTop: 'none',
                      borderLeft: 'none',
                      borderRight: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>🟢</span>
                    <span>{lang === 'km' ? 'ចាត់ចែងរួច' : 'Assigned'}</span>
                  </button>
                </div>

                {/* Search + Filters + Page size bar */}
                <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', background: 'var(--bg-card)' }}>

                  {/* Search input */}
                  <div style={{ flex: '1 1 200px', position: 'relative', minWidth: 180 }}>
                    <MdSearch size={18} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      placeholder={lang === 'km' ? 'ស្វែងរកលេខតាមដាន, ហាង, លេខទូរស័ព្ទ...' : 'Search tracking, merchant, phone...'}
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{
                        width: '100%',
                        paddingLeft: 34,
                        paddingRight: search ? 32 : 12,
                        paddingTop: 8,
                        paddingBottom: 8,
                        border: '1.5px solid var(--border)',
                        borderRadius: 10,
                        fontSize: 13,
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box',
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    />
                    {search && (
                      <button
                        onClick={() => setSearch('')}
                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 2 }}
                      >
                        <MdClose size={16} />
                      </button>
                    )}
                  </div>

                  {/* Date filter */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <input
                      type="date"
                      value={filterDate}
                      onChange={e => setFilterDate(e.target.value)}
                      style={{
                        padding: '7px 10px',
                        border: `1.5px solid ${filterDate ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 10,
                        fontSize: 13,
                        background: filterDate ? 'var(--accent-light)' : 'var(--bg-primary)',
                        color: filterDate ? 'var(--accent)' : 'var(--text-primary)',
                        outline: 'none',
                        cursor: 'pointer',
                        fontWeight: filterDate ? 600 : 400,
                      }}
                    />
                    {filterDate && (
                      <button
                        onClick={() => setFilterDate('')}
                        title="Clear date"
                        style={{ position: 'absolute', right: -8, top: -8, background: 'var(--danger)', border: 'none', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: 10 }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Status Filter */}
                  <div style={{ flexShrink: 0, minWidth: 150 }}>
                    <select
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value)}
                      style={{
                        padding: '7px 10px',
                        border: `1.5px solid ${filterStatus ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 10,
                        fontSize: 13,
                        background: filterStatus ? 'var(--accent-light)' : 'var(--bg-primary)',
                        color: filterStatus ? 'var(--accent)' : 'var(--text-primary)',
                        outline: 'none',
                        cursor: 'pointer',
                        fontWeight: filterStatus ? 600 : 400,
                        width: '100%',
                      }}
                    >
                      <option value="">{lang === 'km' ? '⚙️ ស្ថានភាព ទាំងអស់' : '⚙️ All Statuses'}</option>
                      <option value="pending">{lang === 'km' ? 'រង់ចាំ (Pending)' : 'Pending'}</option>
                      <option value="in-warehouse">{lang === 'km' ? 'ក្នុងឃ្លាំង (In Warehouse)' : 'In Warehouse'}</option>
                      <option value="assigned">{lang === 'km' ? 'បានចាត់ចែង (Assigned)' : 'Assigned'}</option>
                      <option value="failed">{lang === 'km' ? 'មិនជោគជ័យ (Failed)' : 'Failed'}</option>
                    </select>
                  </div>

                  {/* Filter by current driver */}
                  {assignTab === 'assigned' && (
                    <div style={{ flexShrink: 0, minWidth: 160 }}>
                      <select
                        value={filterDriverId}
                        onChange={e => setFilterDriverId(e.target.value)}
                        style={{
                          padding: '7px 10px',
                          border: `1.5px solid ${filterDriverId ? 'var(--accent)' : 'var(--border)'}`,
                          borderRadius: 10,
                          fontSize: 13,
                          background: filterDriverId ? 'var(--accent-light)' : 'var(--bg-primary)',
                          color: filterDriverId ? 'var(--accent)' : 'var(--text-primary)',
                          outline: 'none',
                          cursor: 'pointer',
                          fontWeight: filterDriverId ? 600 : 400,
                          width: '100%',
                        }}
                      >
                        <option value="">🧑 {lang === 'km' ? 'អ្នកដឹក ទាំងអស់' : 'All Drivers'}</option>
                        {drivers.map((d: any) => (
                          <option key={d.id} value={String(d.id)}>{lang === 'km' ? (d.nameKh || d.name) : (d.name || d.nameKh)}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Page size selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Rows:</span>
                    {PAGE_SIZE_OPTIONS.map(size => (
                      <button
                        key={size}
                        onClick={() => setPageSize(size)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 8,
                          border: `1.5px solid ${pageSize === size ? 'var(--accent)' : 'var(--border)'}`,
                          background: pageSize === size ? 'var(--accent-light)' : 'transparent',
                          color: pageSize === size ? 'var(--accent)' : 'var(--text-secondary)',
                          fontSize: 12,
                          fontWeight: pageSize === size ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  <table>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#2f55a5' }}>
                      <tr style={{ background: '#2f55a5' }}>
                        <th style={{ width: 40, paddingLeft: 20, background: '#2f55a5', border: 'none', verticalAlign: 'middle' }}>
                          <input type="checkbox"
                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                            checked={allPageSelected}
                            onChange={e => togglePageAll(e.target.checked)}
                          />
                        </th>
                        <th style={{ background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('trackingCode')}</th>
                        <th style={{ background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('merchant')}</th>
                        <th style={{ background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('receiver')}</th>
                        <th style={{ background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('address')}</th>
                        <th style={{ background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('cod')}</th>
                        <th style={{ background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('deliveryFee')}</th>
                        <th style={{ background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'អ្នកដឹក' : 'Driver'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={8} style={{ padding: '40px 0', textAlign: 'center' }}>
                            <div className="loading-wrapper"><div className="spinner" /></div>
                          </td>
                        </tr>
                      ) : filtered.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                            {t('noDataFound') || 'គ្មានទិន្នន័យ'}
                          </td>
                        </tr>
                      ) : (
                        paginated.map((o: any) => (
                          <tr key={o.id} onClick={() => toggleOrder(o.id)}
                            style={{
                              cursor: 'pointer',
                              background: selected.includes(o.id) ? 'var(--accent-light)' : '',
                              borderLeft: selected.includes(o.id) ? '4px solid var(--accent)' : '4px solid transparent',
                              transition: 'all 0.15s ease'
                            }}>
                            <td style={{ paddingLeft: 20 }}>
                              <input type="checkbox"
                                style={{ width: 16, height: 16, cursor: 'pointer' }}
                                checked={selected.includes(o.id)}
                                onChange={() => toggleOrder(o.id)}
                                onClick={e => e.stopPropagation()}
                              />
                            </td>
                            <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                              {o.trackingCode}
                            </td>
                            <td style={{ fontSize: 13 }}>
                              {lang === 'km' ? (o.merchant?.nameKh || ((o.merchant?.name && o.merchant.name !== '-' && o.merchant.name !== '—') ? o.merchant.name : '')) : ((o.merchant?.name && o.merchant.name !== '-' && o.merchant.name !== '—') ? o.merchant.name : '')}
                            </td>
                            <td style={{ fontSize: 13, fontWeight: 600 }}>
                              {(o.receiverPhone && o.receiverPhone !== '-' && o.receiverPhone !== '—') ? o.receiverPhone : ''}
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--text-primary)', maxWidth: 180 }}>
                              {(o.receiverAddress && o.receiverAddress !== '-' && o.receiverAddress !== '—') ? o.receiverAddress : ''}
                            </td>
                            <td style={{ fontWeight: 700 }}>
                              {formatCOD(o.cod, o.codCurrency || 'USD')}
                            </td>
                            <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                              ${parseFloat(o.deliveryFee).toFixed(2)}
                            </td>
                            <td style={{ fontSize: 13 }}>
                              {o.driver ? (lang === 'km' ? (o.driver.nameKh || o.driver.name) : o.driver.name) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Left Pagination */}
                {!loading && filtered.length > 0 && (
                  <div style={{ padding: '10px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {lang === 'km' ? `បង្ហាញ ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} នៃ ${filtered.length}` : `Showing ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length}`}
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
                            background: safePage === pg ? 'var(--accent)' : 'transparent',
                            color: safePage === pg ? '#fff' : 'var(--text-secondary)',
                            borderColor: safePage === pg ? 'var(--accent)' : 'var(--border)',
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
                <div className="card-header" style={{ padding: '16px 20px', background: 'var(--bg-primary)' }}>
                  <span className="card-title" style={{ fontSize: 15 }}>🧑‍💼 {lang === 'km' ? 'ជ្រើសរើសអ្នកដឹក' : 'Select Driver'}</span>
                  {selectedDriver && (
                    <button
                      onClick={() => setSelectedDriver(null)}
                      style={{ fontSize: 12, color: 'var(--danger)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      ✕ {lang === 'km' ? 'សម្អាត' : 'Clear'}
                    </button>
                  )}
                </div>

                {/* Driver search */}
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                  <div style={{ position: 'relative' }}>
                    <MdSearch size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      placeholder={lang === 'km' ? 'ស្វែងរកឈ្មោះអ្នកដឹក, តំបន់...' : 'Search driver name, zone...'}
                      value={driverSearch}
                      onChange={e => setDriverSearch(e.target.value)}
                      style={{
                        width: '100%',
                        paddingLeft: 32,
                        paddingRight: driverSearch ? 32 : 12,
                        paddingTop: 7,
                        paddingBottom: 7,
                        border: '1.5px solid var(--border)',
                        borderRadius: 10,
                        fontSize: 13,
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    />
                    {driverSearch && (
                      <button
                        onClick={() => setDriverSearch('')}
                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 2 }}
                      >
                        <MdClose size={15} />
                      </button>
                    )}
                  </div>
                  {driverSearch && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                      {filteredDrivers.length} {lang === 'km' ? 'អ្នកដឹកត្រូវបានរកឃើញ' : 'drivers found'}
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                  {drivers.length === 0 ? (
                    <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      {lang === 'km' ? 'មិនមានអ្នកដឹកទំនេរទេ' : 'No available drivers'}
                    </div>
                  ) : filteredDrivers.length === 0 ? (
                    <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      {lang === 'km' ? 'រកមិនឃើញអ្នកដឹកទេ' : 'No drivers found'}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {filteredDrivers.map((d: any) => {
                        const isSelected = selectedDriver === d.id;
                        return (
                          <div
                            key={d.id}
                            onClick={() => setSelectedDriver(d.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '10px 12px',
                              borderRadius: 10,
                              border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                              background: isSelected ? 'var(--accent-light)' : 'var(--bg-card)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <input
                              type="radio"
                              name="selectedDriver"
                              checked={isSelected}
                              onChange={() => setSelectedDriver(d.id)}
                              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)', flexShrink: 0 }}
                            />
                            <div style={{
                              width: 34, height: 34, borderRadius: '50%',
                              background: isSelected ? 'var(--accent)' : '#e2e8f0',
                              color: isSelected ? '#fff' : '#64748b',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 14, fontWeight: 700, flexShrink: 0
                            }}>
                              {((lang === 'km' && d.nameKh) ? d.nameKh : d.name || 'D').charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, color: isSelected ? 'var(--accent-dark)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {lang === 'km' ? (d.nameKh || d.name) : (d.name || d.nameKh)}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                {d.phone && <span>📞 {d.phone}</span>}
                                {d.zone?.name && <span>📍 {d.zone.name}</span>}
                              </div>
                            </div>
                            <span style={{
                              fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 600,
                              background: d.status === 'available' ? '#dcfce7' : '#fef3c7',
                              color: d.status === 'available' ? '#16a34a' : '#d97706',
                              flexShrink: 0
                            }}>
                              {d.status === 'available' ? (lang === 'km' ? 'ទំនេរ' : 'Available') : (lang === 'km' ? 'ជាប់រវល់' : 'Busy')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Assignment Action Bottom Bar */}
                <div style={{
                  padding: '16px 20px',
                  borderTop: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  boxShadow: '0 -4px 12px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                        {lang === 'km' ? 'កញ្ចប់បានជ្រើសរើស' : 'Selected Orders'}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: selected.length > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
                        {selected.length} {lang === 'km' ? 'កញ្ចប់' : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                        {lang === 'km' ? 'អ្នកដឹកដែលបានចាត់' : 'Driver Assigned'}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: selectedDriver ? 'var(--accent)' : 'var(--danger)' }}>
                        {selectedDriver ? (lang === 'km' ? (drivers.find(d => d.id === selectedDriver)?.nameKh || drivers.find(d => d.id === selectedDriver)?.name) : drivers.find(d => d.id === selectedDriver)?.name) : (lang === 'km' ? 'មិនទាន់ជ្រើស' : 'None selected')}
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary w-full"
                    onClick={handleAssign}
                    disabled={assigning || selected.length === 0 || !selectedDriver}
                    style={{
                      justifyContent: 'center',
                      padding: '12px',
                      fontSize: 14,
                      fontWeight: 700,
                      borderRadius: 10,
                      minHeight: 42,
                      boxShadow: (selected.length > 0 && selectedDriver) ? '0 8px 16px rgba(59,130,246,0.25)' : 'none'
                    }}>
                    <MdAssignmentTurnedIn size={18} />
                    {assigning ? (lang === 'km' ? 'កំពុងចាត់តាំង...' : 'Assigning Orders...') : (lang === 'km' ? `ចាត់តាំងការដឹក (${selected.length})` : t('assignDelivery'))}
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

// Helper: generate page numbers with ellipsis
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
    padding: '5px 10px',
    minWidth: 32,
    borderRadius: 8,
    border: '1.5px solid var(--border)',
    background: 'transparent',
    color: disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
    fontSize: 13,
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'all 0.15s',
  };
}
