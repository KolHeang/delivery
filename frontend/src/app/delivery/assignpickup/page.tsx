'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';
import { MdLocalShipping, MdRefresh, MdSearch, MdClose, MdWarehouse, MdPhone, MdLocationOn } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';
import Pagination from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Skeleton';

const formatCOD = (cod: any, currency: string) => {
  if (currency === 'KHR') return `${parseInt(cod).toLocaleString()} ៛`;
  return `$${parseFloat(cod).toFixed(2)}`;
};

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export default function AssignPickupPage() {
  const router = useRouter();
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const { t, lang } = useLanguage();
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
        api.get('/parcels/pending-pickup'),
        api.get('/drivers/available'),
      ]);
      setPendingOrders(Array.isArray(orders.data) ? orders.data : (orders.data?.results || orders.data?.result || []));
      setDrivers(Array.isArray(drvs.data) ? drvs.data : (drvs.data?.results || drvs.data?.result || []));
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
      await Promise.all(selected.map(id => api.post(`/parcels/${id}/assign-pickup`, { driverId: selectedDriver })));
      const count = selected.length;
      setSelected([]);
      setSelectedDriver(null);
      setSearch('');
      setCurrentPage(1);
      await load();
      alert(`✅ ${count} ${t('pickupAssignSuccess')}`);
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
                  <div>
                      <span className="card-title" style={{ fontSize: 16 }}>{t('pendingForPickup')}</span>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                        {filtered.length} / {pendingOrders.length} {lang === 'km' ? 'កញ្ចប់' : 'orders'}
                        {selected.length > 0 && (
                          <span style={{ marginLeft: 8, fontWeight: 600, color: '#d97706' }}>
                            · {selected.length} {lang === 'km' ? 'បានជ្រើសរើស' : 'selected'}
                          </span>
                        )}
                      </div>
                    </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {selected.length > 0 && (
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#d97706', background: '#fef3c7', padding: '4px 12px', borderRadius: 999 }}>
                        {selected.length} {lang === 'km' ? 'បានជ្រើសរើស' : 'Selected'}
                      </span>
                    )}
                    <button className="btn btn-outline" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MdRefresh size={16} /> {lang === 'km' ? 'ផ្ទុកឡើងវិញ' : 'Refresh'}
                    </button>
                  </div>
                </div>

                {/* Search + page size bar */}
                <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center', background: 'var(--bg-card)', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                    <MdSearch size={18} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      placeholder={lang === 'km' ? 'ស្វែងរកលេខតាមដាន, ហាង, លេខទូរស័ព្ទ...' : 'Search tracking, merchant, phone...'}
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
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{lang === 'km' ? 'ចំនួនជួរ៖' : 'Rows:'}</span>
                    {PAGE_SIZE_OPTIONS.map(size => (
                      <button key={size} onClick={() => setPageSize(size)} style={{
                        padding: '5px 10px', borderRadius: 8,
                        border: `1.5px solid ${pageSize === size ? 'var(--accent)' : 'var(--border)'}`,
                        background: pageSize === size ? 'var(--accent-light)' : 'transparent',
                        color: pageSize === size ? 'var(--accent)' : 'var(--text-secondary)',
                        fontSize: 12, fontWeight: pageSize === size ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s',
                      }}>{size}</button>
                    ))}
                  </div>
                </div>

                {/* Table */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  <table>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--sidebar-bg, #1565D8)' }}>
                      <tr style={{ background: 'var(--sidebar-bg, #1565D8)' }}>
                        <th style={{ width: 40, paddingLeft: 20, background: 'var(--sidebar-bg, #1565D8)', border: 'none', verticalAlign: 'middle' }}>
                          <input type="checkbox"
                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                            checked={allPageSelected}
                            onChange={e => togglePageAll(e.target.checked)}
                          />
                        </th>
                        <th style={{ background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('trackingCode')}</th>
                        <th style={{ background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('merchant')}</th>
                        <th style={{ background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('receiver')}</th>
                        <th style={{ background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('address')}</th>
                        <th style={{ background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('cod')}</th>
                        <th style={{ background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('deliveryFee')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <TableSkeleton columns={7} rows={6} />
                      ) : filtered.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                            {t('noDataFound') || 'គ្មានទិន្នន័យ'}
                          </td>
                        </tr>
                      ) : (
                        paginated.map((o: any) => (
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
                            <td style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{o.trackingCode}</td>
                            <td style={{ fontSize: 13 }}>
                              {lang === 'km' ? (o.merchant?.nameKh || ((o.merchant?.name && o.merchant.name !== '-' && o.merchant.name !== '—') ? o.merchant.name : '')) : ((o.merchant?.name && o.merchant.name !== '-' && o.merchant.name !== '—') ? o.merchant.name : '')}
                            </td>
                            <td style={{ fontSize: 13, fontWeight: 600 }}>{(o.receiverPhone && o.receiverPhone !== '-' && o.receiverPhone !== '—') ? o.receiverPhone : ''}</td>
                            <td style={{ fontSize: 12, color: 'var(--text-primary)', maxWidth: 180 }}>
                              {(o.receiverAddress && o.receiverAddress !== '-' && o.receiverAddress !== '—') ? o.receiverAddress : ''}
                            </td>
                            <td style={{ fontWeight: 700 }}>{formatCOD(o.cod, o.codCurrency || 'USD')}</td>
                            <td style={{ color: 'var(--success)', fontWeight: 600 }}>${parseFloat(o.deliveryFee).toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Left Pagination */}
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

            {/* Driver panel */}
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
              <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Driver header */}
                <div className="card-header" style={{ padding: '16px 20px', background: 'var(--bg-primary)' }}>
                  <span className="card-title" style={{ fontSize: 15 }}>{lang === 'km' ? 'ជ្រើសរើសអ្នកប្រមូលកញ្ចប់' : t('assignPickupDriver')}</span>
                  {selectedDriver && (
                    <button onClick={() => setSelectedDriver(null)} style={{ fontSize: 12, color: 'var(--danger)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>
                      {lang === 'km' ? 'សម្អាត' : 'Clear'}
                    </button>
                  )}
                </div>

                {/* Driver search */}
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                  <div style={{ position: 'relative' }}>
                    <MdSearch size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input type="text"
                      placeholder={lang === 'km' ? 'ស្វែងរកឈ្មោះអ្នកប្រមូលកញ្ចប់, តំបន់...' : 'Search pickup rider, zone...'}
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
                  {driverSearch && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                      {filteredDrivers.length} {lang === 'km' ? 'អ្នកប្រមូលកញ្ចប់ត្រូវបានរកឃើញ' : 'pickup riders found'}
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                  {filteredDrivers.length === 0 ? (
                    <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      {lang === 'km' ? 'មិនមានអ្នកប្រមូលកញ្ចប់ទំនេរទេ' : 'No available pickup riders'}
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
                              border: `1.5px solid ${isSelected ? '#d97706' : 'var(--border)'}`,
                              background: isSelected ? '#fef3c7' : 'var(--bg-card)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <input
                              type="radio"
                              name="selectedPickupDriver"
                              checked={isSelected}
                              onChange={() => setSelectedDriver(d.id)}
                              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#d97706', flexShrink: 0 }}
                            />
                            <div style={{
                              width: 34, height: 34, borderRadius: '50%',
                              background: isSelected ? '#d97706' : '#e2e8f0',
                              color: isSelected ? '#fff' : '#64748b',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 14, fontWeight: 700, flexShrink: 0
                            }}>
                              {((lang === 'km' && d.nameKh) ? d.nameKh : d.name || 'D').charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, color: isSelected ? '#92400e' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {lang === 'km' ? (d.nameKh || d.name) : (d.name || d.nameKh)}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                {d.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MdPhone size={12} /> {d.phone}</span>}
                                {d.zone?.name && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MdLocationOn size={12} /> {d.zone.name}</span>}
                              </div>
                            </div>
                            <span style={{
                              fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 600,
                              background: (d.isActive !== false && d.status !== 'busy') ? '#dcfce7' : '#fef3c7',
                              color: (d.isActive !== false && d.status !== 'busy') ? '#16a34a' : '#d97706',
                              flexShrink: 0
                            }}>
                              {(d.isActive !== false && d.status !== 'busy') ? (lang === 'km' ? 'ទំនេរ' : 'Available') : (lang === 'km' ? 'ជាប់រវល់' : 'Busy')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Action bottom bar */}
                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)', boxShadow: '0 -4px 12px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                        {lang === 'km' ? 'កញ្ចប់បានជ្រើសរើស' : 'Selected Orders'}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: selected.length > 0 ? '#d97706' : 'var(--text-muted)' }}>
                        {selected.length} {lang === 'km' ? 'កញ្ចប់' : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                        {lang === 'km' ? 'អ្នកប្រមូលកញ្ចប់ដែលបានចាត់' : 'Pickup Rider'}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: selectedDriver ? 'var(--accent)' : 'var(--danger)' }}>
                        {selectedDriver ? (lang === 'km' ? (drivers.find(d => d.id === selectedDriver)?.nameKh || drivers.find(d => d.id === selectedDriver)?.name) : drivers.find(d => d.id === selectedDriver)?.name) : (lang === 'km' ? 'មិនទាន់ជ្រើស' : 'None selected')}
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary w-full"
                    onClick={handleAssignPickup}
                    disabled={assigning || selected.length === 0 || !selectedDriver}
                    style={{
                      justifyContent: 'center', padding: '12px', fontSize: 14, fontWeight: 700, borderRadius: 10,
                      minHeight: 42,
                      gap: 8, display: 'flex', alignItems: 'center',
                      boxShadow: (selected.length > 0 && selectedDriver) ? '0 6px 18px var(--accent-glow, rgba(21, 101, 216, 0.28))' : 'none',
                      transition: 'all 0.2s',
                    }}>
                    <MdWarehouse size={18} />
                    {assigning ? (lang === 'km' ? 'កំពុងចាត់តាំង...' : 'Assigning...') : (lang === 'km' ? `ចាត់តាំងការប្រមូល (${selected.length})` : t('confirmPickupAssignment'))}
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

