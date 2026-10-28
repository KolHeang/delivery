'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { 
  MdAssignmentTurnedIn, MdRefresh, MdSearch, MdClose, 
  MdPhone, MdLocationOn, MdLocalShipping, MdCheckCircle, MdFilterListOff
} from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';
import SearchableSelect from '@/components/ui/SearchableSelect';

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
      setUnassigned(Array.isArray(orders.data) ? orders.data : (orders.data?.results || orders.data?.result || []));
      setDrivers(Array.isArray(drvs.data) ? drvs.data : (drvs.data?.results || drvs.data?.result || []));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    load();
  }, [router, load]);

  // Counts for tabs
  const unassignedCount = useMemo(() => unassigned.filter(o => o.driverId == null).length, [unassigned]);
  const assignedCount = useMemo(() => unassigned.filter(o => o.driverId != null).length, [unassigned]);

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

  const hasActiveFilters = Boolean(search || filterDate || filterStatus || (assignTab === 'assigned' && filterDriverId));
  const clearFilters = () => {
    setSearch('');
    setFilterDate('');
    setFilterStatus('');
    if (assignTab === 'assigned') setFilterDriverId('');
  };

  const handleAssign = async () => {
    if (!selectedDriver || selected.length === 0) return;
    setAssigning(true);
    try {
      await api.post('/parcels/assign-delivery/batch', { parcelIds: selected, driverId: selectedDriver });
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

  const currentSelectedDriverObj = drivers.find(d => d.id === selectedDriver);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('assignTitle')} subtitle={t('assignSubtitle')} />
        <div className="page-content">
          <div className="assign-layout">
            
            {/* ── LEFT PANEL: Orders to Dispatch (Step 1) ── */}
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
              <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1.5px solid var(--border)' }}>

                {/* Panel Header with Step 1 Badge */}
                <div className="card-header" style={{ padding: '14px 20px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: 'var(--accent)',
                      background: 'var(--accent-light)',
                      padding: '3px 9px',
                      borderRadius: 6,
                      letterSpacing: '0.3px',
                      textTransform: 'uppercase'
                    }}>
                      {lang === 'km' ? 'ជំហានទី ១' : 'Step 1'}
                    </span>
                    <div>
                      <span className="card-title" style={{ fontSize: 15, fontWeight: 700 }}>
                        {assignTab === 'unassigned'
                          ? (lang === 'km' ? 'ជ្រើសរើសកញ្ចប់អីវ៉ាន់ដែលត្រូវចាត់ចែង' : 'Select Parcels to Dispatch')
                          : (lang === 'km' ? 'កញ្ចប់អីវ៉ាន់ចាត់ចែងរួច' : 'Assigned Parcels')
                        }
                      </span>
                      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
                        {filtered.length} {lang === 'km' ? 'កញ្ចប់' : 'parcels'}
                        {selected.length > 0 && (
                          <span style={{ marginLeft: 8, fontWeight: 700, color: 'var(--accent)' }}>
                            · {lang === 'km' ? `បានធីកជ្រើសរើស ${selected.length} កញ្ចប់` : `Selected ${selected.length}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {selected.length > 0 && (
                      <button
                        onClick={() => setSelected([])}
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, padding: '4px 8px' }}
                      >
                        {lang === 'km' ? 'ដោះការជ្រើសរើស' : 'Deselect All'}
                      </button>
                    )}
                    <button className="btn btn-outline btn-sm" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MdRefresh size={15} /> {lang === 'km' ? 'ផ្ទុកឡើងវិញ' : 'Refresh'}
                    </button>
                  </div>
                </div>

                {/* Modern Pill Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '8px 16px', background: 'var(--bg-primary)', gap: 10 }}>
                  <button 
                    onClick={() => handleTabChange('unassigned')}
                    style={{ 
                      padding: '7px 14px', 
                      fontSize: 13, 
                      fontWeight: assignTab === 'unassigned' ? 700 : 500, 
                      color: assignTab === 'unassigned' ? 'var(--accent)' : 'var(--text-secondary)', 
                      borderRadius: 8,
                      background: assignTab === 'unassigned' ? 'var(--bg-card)' : 'transparent',
                      border: assignTab === 'unassigned' ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                      boxShadow: assignTab === 'unassigned' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{lang === 'km' ? 'មិនទាន់ចាត់ចែង' : 'Unassigned'}</span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '1px 7px',
                      borderRadius: 999,
                      background: assignTab === 'unassigned' ? 'var(--accent)' : 'var(--border)',
                      color: assignTab === 'unassigned' ? '#ffffff' : 'var(--text-muted)'
                    }}>
                      {unassignedCount}
                    </span>
                  </button>

                  <button 
                    onClick={() => handleTabChange('assigned')}
                    style={{ 
                      padding: '7px 14px', 
                      fontSize: 13, 
                      fontWeight: assignTab === 'assigned' ? 700 : 500, 
                      color: assignTab === 'assigned' ? 'var(--accent)' : 'var(--text-secondary)', 
                      borderRadius: 8,
                      background: assignTab === 'assigned' ? 'var(--bg-card)' : 'transparent',
                      border: assignTab === 'assigned' ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                      boxShadow: assignTab === 'assigned' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{lang === 'km' ? 'ចាត់ចែងរួច' : 'Assigned'}</span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '1px 7px',
                      borderRadius: 999,
                      background: assignTab === 'assigned' ? 'var(--accent)' : 'var(--border)',
                      color: assignTab === 'assigned' ? '#ffffff' : 'var(--text-muted)'
                    }}>
                      {assignedCount}
                    </span>
                  </button>
                </div>

                {/* Filter & Search Bar */}
                <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', background: 'var(--bg-card)' }}>

                  {/* Search input */}
                  <div style={{ flex: '1 1 180px', position: 'relative', minWidth: 160 }}>
                    <MdSearch size={17} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      placeholder={lang === 'km' ? 'ស្វែងរកលេខកូដ, ហាង, ទូរស័ព្ទ...' : 'Search code, shop, phone...'}
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{
                        width: '100%',
                        paddingLeft: 32,
                        paddingRight: search ? 28 : 10,
                        paddingTop: 6,
                        paddingBottom: 6,
                        height: 34,
                        border: '1.5px solid var(--border)',
                        borderRadius: 8,
                        fontSize: 12.5,
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
                        style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 2 }}
                      >
                        <MdClose size={14} />
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
                        padding: '5px 8px',
                        height: 34,
                        border: `1.5px solid ${filterDate ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 8,
                        fontSize: 12.5,
                        background: filterDate ? 'var(--accent-light)' : 'var(--bg-primary)',
                        color: filterDate ? 'var(--accent)' : 'var(--text-primary)',
                        outline: 'none',
                        cursor: 'pointer',
                        fontWeight: filterDate ? 600 : 400,
                        boxSizing: 'border-box',
                      }}
                    />
                    {filterDate && (
                      <button
                        onClick={() => setFilterDate('')}
                        title="Clear date"
                        style={{ position: 'absolute', right: -6, top: -6, background: 'var(--danger)', border: 'none', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: 9 }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Status Filter */}
                  <div style={{ flexShrink: 0, minWidth: 130 }}>
                    <select
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value)}
                      style={{
                        padding: '5px 8px',
                        height: 34,
                        border: `1.5px solid ${filterStatus ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 8,
                        fontSize: 12.5,
                        background: filterStatus ? 'var(--accent-light)' : 'var(--bg-primary)',
                        color: filterStatus ? 'var(--accent)' : 'var(--text-primary)',
                        outline: 'none',
                        cursor: 'pointer',
                        fontWeight: filterStatus ? 600 : 400,
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="">{lang === 'km' ? 'ស្ថានភាព ទាំងអស់' : 'All Status'}</option>
                      <option value="pending">{lang === 'km' ? 'រង់ចាំ' : 'Pending'}</option>
                      <option value="in-warehouse">{lang === 'km' ? 'ក្នុងឃ្លាំង' : 'In Warehouse'}</option>
                      <option value="assigned">{lang === 'km' ? 'បានចាត់ចែង' : 'Assigned'}</option>
                      <option value="failed">{lang === 'km' ? 'មិនជោគជ័យ' : 'Failed'}</option>
                    </select>
                  </div>

                  {/* Filter by current driver (assigned tab only) */}
                  {assignTab === 'assigned' && (
                    <div style={{ flexShrink: 0, minWidth: 140 }}>
                      <SearchableSelect
                        value={filterDriverId}
                        onChange={setFilterDriverId}
                        style={{
                          borderRadius: 8,
                          fontSize: 12.5,
                          background: filterDriverId ? 'var(--accent-light)' : 'var(--bg-primary)',
                          width: '100%',
                          height: 34,
                        }}
                        placeholder={lang === 'km' ? 'អ្នកដឹក ទាំងអស់' : 'All Drivers'}
                        options={[
                          { value: '', label: lang === 'km' ? 'អ្នកដឹក ទាំងអស់' : 'All Drivers' },
                          ...drivers.map((d: any) => ({
                            value: String(d.id),
                            label: (lang === 'km' ? (d.nameKh || d.name) : (d.name || d.nameKh)),
                          })),
                        ]}
                      />
                    </div>
                  )}

                  {/* Reset all filters button */}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 12,
                        color: 'var(--danger)',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        padding: '5px 10px',
                        height: 34,
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                      title="Clear all filters"
                    >
                      <MdFilterListOff size={14} />
                      <span>{lang === 'km' ? 'សម្អាត Filter' : 'Clear'}</span>
                    </button>
                  )}

                  {/* Page size selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto', flexShrink: 0 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Rows:</span>
                    {PAGE_SIZE_OPTIONS.map(size => (
                      <button
                        key={size}
                        onClick={() => setPageSize(size)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          border: `1px solid ${pageSize === size ? 'var(--accent)' : 'var(--border)'}`,
                          background: pageSize === size ? 'var(--accent-light)' : 'transparent',
                          color: pageSize === size ? 'var(--accent)' : 'var(--text-secondary)',
                          fontSize: 11.5,
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

                {/* ── Table with Modern Header keeping Brand Color ── */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--sidebar-bg, #1565D8)', boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
                      <tr style={{ background: 'var(--sidebar-bg, #1565D8)' }}>
                        <th style={{ width: 44, padding: '11px 14px', background: 'var(--sidebar-bg, #1565D8)', border: 'none', textAlign: 'center', verticalAlign: 'middle' }}>
                          <input type="checkbox"
                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#ffffff' }}
                            checked={allPageSelected}
                            onChange={e => togglePageAll(e.target.checked)}
                          />
                        </th>
                        <th style={{ background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, padding: '11px 14px', border: 'none', whiteSpace: 'nowrap' }}>{t('trackingCode')}</th>
                        <th style={{ background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, padding: '11px 14px', border: 'none', whiteSpace: 'nowrap' }}>{t('merchant')}</th>
                        <th style={{ background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, padding: '11px 14px', border: 'none', whiteSpace: 'nowrap' }}>{t('receiver')}</th>
                        <th style={{ background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, padding: '11px 14px', border: 'none', whiteSpace: 'nowrap' }}>{t('address')}</th>
                        <th style={{ background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, padding: '11px 14px', border: 'none', whiteSpace: 'nowrap' }}>{t('cod')}</th>
                        <th style={{ background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, padding: '11px 14px', border: 'none', whiteSpace: 'nowrap' }}>{t('deliveryFee')}</th>
                        <th style={{ background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, padding: '11px 14px', border: 'none', whiteSpace: 'nowrap' }}>{lang === 'km' ? 'អ្នកដឹក' : 'Driver'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={8} style={{ padding: '60px 0', textAlign: 'center' }}>
                            <div className="loading-wrapper"><div className="spinner" /></div>
                          </td>
                        </tr>
                      ) : filtered.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ padding: '60px 20px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                              <div style={{
                                width: 56, height: 56, borderRadius: '50%',
                                background: 'var(--bg-primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--text-muted)'
                              }}>
                                <MdLocalShipping size={30} />
                              </div>
                              <div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {lang === 'km' ? 'មិនមានកញ្ចប់អីវ៉ាន់ដែលត្រូវចាត់ចែងឡើយ' : 'No parcels found'}
                                </div>
                                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
                                  {hasActiveFilters
                                    ? (lang === 'km' ? 'សូមសាកល្បងសម្អាតការស្វែងរក ឬកែប្រែ Filter' : 'Try clearing your search or filters')
                                    : (lang === 'km' ? 'កញ្ចប់អីវ៉ាន់ដែលបានទទួលចូលឃ្លាំងនឹងបង្ហាញនៅទីនេះ' : 'Parcels received in warehouse will appear here')}
                                </div>
                              </div>
                              {hasActiveFilters ? (
                                <button className="btn btn-outline btn-sm" onClick={clearFilters} style={{ marginTop: 4 }}>
                                  {lang === 'km' ? 'សម្អាតការស្វែងរក' : 'Clear Filters'}
                                </button>
                              ) : (
                                <button className="btn btn-outline btn-sm" onClick={load} style={{ marginTop: 4 }}>
                                  <MdRefresh size={14} /> {lang === 'km' ? 'ផ្ទុកទិន្នន័យឡើងវិញ' : 'Refresh'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginated.map((o: any) => {
                          const isRowChecked = selected.includes(o.id);
                          return (
                            <tr key={o.id} onClick={() => toggleOrder(o.id)}
                              style={{
                                cursor: 'pointer',
                                background: isRowChecked ? 'var(--accent-light)' : 'transparent',
                                borderLeft: isRowChecked ? '4px solid var(--accent)' : '4px solid transparent',
                                borderBottom: '1px solid var(--border)',
                                transition: 'background 0.15s ease'
                              }}>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                <input type="checkbox"
                                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
                                  checked={isRowChecked}
                                  onChange={() => toggleOrder(o.id)}
                                  onClick={e => e.stopPropagation()}
                                />
                              </td>
                              <td style={{ fontWeight: 700, fontSize: 13, color: isRowChecked ? 'var(--accent-dark)' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                {o.trackingCode}
                              </td>
                              <td style={{ fontSize: 13 }}>
                                {lang === 'km' ? (o.merchant?.nameKh || ((o.merchant?.name && o.merchant.name !== '-' && o.merchant.name !== '—') ? o.merchant.name : '')) : ((o.merchant?.name && o.merchant.name !== '-' && o.merchant.name !== '—') ? o.merchant.name : '')}
                              </td>
                              <td style={{ fontSize: 13, fontWeight: 600 }}>
                                {(o.receiverPhone && o.receiverPhone !== '-' && o.receiverPhone !== '—') ? o.receiverPhone : ''}
                              </td>
                              <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={o.receiverAddress}>
                                {(o.receiverAddress && o.receiverAddress !== '-' && o.receiverAddress !== '—') ? o.receiverAddress : ''}
                              </td>
                              <td style={{ fontWeight: 700, fontSize: 13 }}>
                                {formatCOD(o.cod, o.codCurrency || 'USD')}
                              </td>
                              <td style={{ color: 'var(--success)', fontWeight: 600, fontSize: 13 }}>
                                ${parseFloat(o.deliveryFee).toFixed(2)}
                              </td>
                              <td style={{ fontSize: 12.5 }}>
                                {o.driver ? (
                                  <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                                    {lang === 'km' ? (o.driver.nameKh || o.driver.name) : o.driver.name}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Left Pagination Footer */}
                {!loading && filtered.length > 0 && (
                  <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {lang === 'km' ? `បង្ហាញ ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} នៃ ${filtered.length}` : `Showing ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length}`}
                    </span>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <button onClick={() => setCurrentPage(1)} disabled={safePage === 1} style={paginationBtnStyle(safePage === 1)}>«</button>
                      <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1} style={paginationBtnStyle(safePage === 1)}>‹</button>
                      {getPageNumbers(safePage, totalPages).map((pg, i) =>
                        pg === '...' ? (
                          <span key={`e-${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: 12 }}>…</span>
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

            {/* ── RIGHT PANEL: Driver Selection (Step 2) ── */}
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
              <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1.5px solid var(--border)' }}>
                
                {/* Driver Panel Header with Step 2 Badge */}
                <div className="card-header" style={{ padding: '14px 18px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: '#2563eb',
                      background: '#eff6ff',
                      padding: '3px 9px',
                      borderRadius: 6,
                      letterSpacing: '0.3px',
                      textTransform: 'uppercase'
                    }}>
                      {lang === 'km' ? 'ជំហានទី ២' : 'Step 2'}
                    </span>
                    <span className="card-title" style={{ fontSize: 15, fontWeight: 700 }}>
                      {lang === 'km' ? 'ជ្រើសរើសអ្នកដឹក' : 'Select Driver'}
                    </span>
                  </div>
                  {selectedDriver && (
                    <button
                      onClick={() => setSelectedDriver(null)}
                      style={{ fontSize: 12, color: 'var(--danger)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      {lang === 'km' ? 'សម្អាត' : 'Clear'}
                    </button>
                  )}
                </div>

                {/* Driver Search Input */}
                <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
                  <div style={{ position: 'relative' }}>
                    <MdSearch size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      placeholder={lang === 'km' ? 'ស្វែងរកឈ្មោះអ្នកដឹក, តំបន់...' : 'Search driver or zone...'}
                      value={driverSearch}
                      onChange={e => setDriverSearch(e.target.value)}
                      style={{
                        width: '100%',
                        paddingLeft: 30,
                        paddingRight: driverSearch ? 26 : 10,
                        paddingTop: 6,
                        paddingBottom: 6,
                        height: 32,
                        border: '1.5px solid var(--border)',
                        borderRadius: 8,
                        fontSize: 12.5,
                        background: 'var(--bg-card)',
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
                        style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 2 }}
                      >
                        <MdClose size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Driver List (Slim, Compact & Clean) */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
                  {drivers.length === 0 ? (
                    <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      {lang === 'km' ? 'មិនមានអ្នកដឹកទំនេរទេ' : 'No available drivers'}
                    </div>
                  ) : filteredDrivers.length === 0 ? (
                    <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      {lang === 'km' ? 'រកមិនឃើញអ្នកដឹកទេ' : 'No drivers found'}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {filteredDrivers.map((d: any) => {
                        const isSelected = selectedDriver === d.id;
                        const isAvailable = (d.isActive !== false && d.status !== 'busy');
                        const driverNameDisplay = lang === 'km' ? (d.nameKh || d.name) : (d.name || d.nameKh);

                        return (
                          <div
                            key={d.id}
                            onClick={() => setSelectedDriver(d.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '8px 12px',
                              borderRadius: 8,
                              border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                              background: isSelected ? 'var(--accent-light)' : 'var(--bg-card)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                            }}
                          >
                            {/* Checkmark or Selection circle */}
                            <div style={{
                              width: 18, height: 18, borderRadius: '50%',
                              border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                              background: isSelected ? 'var(--accent)' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0, transition: 'all 0.15s'
                            }}>
                              {isSelected && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                            </div>

                            {/* Driver Avatar */}
                            <div style={{
                              width: 32, height: 32, borderRadius: 8,
                              background: isSelected ? 'var(--accent)' : 'var(--bg-primary)',
                              color: isSelected ? '#fff' : 'var(--text-secondary)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 13, fontWeight: 700, flexShrink: 0
                            }}>
                              {driverNameDisplay.charAt(0).toUpperCase()}
                            </div>

                            {/* Name & details */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: isSelected ? 'var(--accent-dark)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {driverNameDisplay}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', overflow: 'hidden' }}>
                                {d.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><MdPhone size={11} /> {d.phone}</span>}
                                {d.zone?.name && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><MdLocationOn size={11} /> {d.zone.name}</span>}
                              </div>
                            </div>

                            {/* Availability badge */}
                            <span style={{
                              fontSize: 10.5, padding: '2px 7px', borderRadius: 999, fontWeight: 700,
                              background: isAvailable ? '#dcfce7' : '#fef3c7',
                              color: isAvailable ? '#16a34a' : '#d97706',
                              flexShrink: 0
                            }}>
                              {isAvailable ? (lang === 'km' ? 'ទំនេរ' : 'Free') : (lang === 'km' ? 'រវល់' : 'Busy')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── BOTTOM ACTION BAR (Step 3: Confirm Assignment) ── */}
                <div style={{
                  padding: '14px 18px',
                  borderTop: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  boxShadow: '0 -4px 12px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>
                        {lang === 'km' ? 'កញ្ចប់បានជ្រើសរើស' : 'Selected Parcels'}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: selected.length > 0 ? 'var(--accent)' : 'var(--text-muted)', marginTop: 2 }}>
                        {selected.length} {lang === 'km' ? 'កញ្ចប់' : 'orders'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>
                        {lang === 'km' ? 'អ្នកដឹកដែលបានចាត់' : 'Selected Driver'}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: currentSelectedDriverObj ? 'var(--accent)' : 'var(--text-muted)', marginTop: 2 }}>
                        {currentSelectedDriverObj ? (lang === 'km' ? (currentSelectedDriverObj.nameKh || currentSelectedDriverObj.name) : currentSelectedDriverObj.name) : (lang === 'km' ? 'មិនទាន់ជ្រើស' : 'None')}
                      </div>
                    </div>
                  </div>

                  {/* Prominent Action Button */}
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
                      minHeight: 44,
                      gap: 8,
                      boxShadow: (selected.length > 0 && selectedDriver) ? '0 6px 18px rgba(234, 88, 12, 0.35)' : 'none',
                      transition: 'all 0.2s ease',
                    }}>
                    <MdAssignmentTurnedIn size={18} />
                    {assigning
                      ? (lang === 'km' ? 'កំពុងចាត់តាំង...' : 'Assigning...')
                      : (selected.length === 0
                          ? (lang === 'km' ? 'សូមជ្រើសរើសកញ្ចប់អីវ៉ាន់' : 'Select parcels first')
                          : (!selectedDriver
                              ? (lang === 'km' ? 'សូមជ្រើសរើសអ្នកដឹក' : 'Select a driver')
                              : (lang === 'km' ? `ចាត់តាំងការដឹក (${selected.length} កញ្ចប់)` : `Assign Delivery (${selected.length})`)
                            )
                        )
                    }
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
    padding: '4px 8px',
    minWidth: 28,
    borderRadius: 6,
    border: '1.5px solid var(--border)',
    background: 'transparent',
    color: disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
    fontSize: 12,
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'all 0.15s',
  };
}
