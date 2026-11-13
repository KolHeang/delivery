'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { MdSearch, MdFilterAlt, MdClose, MdRefresh } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';
import DateInput, { getLocalDateString } from '@/components/ui/DateInput';
import Pagination from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Skeleton';

const getLocalFirstDayOfMonthString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

interface PickupSummary {
  id: number;
  name: string;
  package: number;
  shopCount: number;
  fee: number;
}

export default function PickUpSummaryPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();

  const [data, setData] = useState<PickupSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);

  // Filters
  const [startDate, setStartDate] = useState(() => getLocalDateString());
  const [endDate, setEndDate] = useState(() => getLocalDateString());
  const [driverId, setDriverId] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, driverId, merchantId, search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (driverId) params.append('driverId', driverId);
      if (merchantId) params.append('merchantId', merchantId);
      const res = await api.get(`/reports/pickup-summary?${params.toString()}`);
      setData(res.data);
    } catch {}
    setLoading(false);
  }, [startDate, endDate, driverId, merchantId]);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    // Load filter options
    Promise.all([api.get('/select/drivers'), api.get('/select/merchants')]).then(([d, m]) => {
      setDrivers(Array.isArray(d.data) ? d.data : (d.data?.result || []));
      setMerchants(Array.isArray(m.data) ? m.data : (m.data?.result || []));
    }).catch(() => {});
    fetchData();
  }, [router, fetchData]);

  const filtered = data.filter(row =>
    !search || row.name?.toLowerCase().includes(search.toLowerCase())
  );

  const clearFilters = () => {
    setStartDate(getLocalDateString()); setEndDate(getLocalDateString());
    setDriverId(''); setMerchantId(''); setSearch('');
  };

  const hasFilter = startDate !== getLocalDateString() || endDate !== getLocalDateString() || driverId || merchantId || search;

  const totalPackage = filtered.reduce((a, r) => a + r.package, 0);
  const totalFee = filtered.reduce((a, r) => a + r.fee, 0);

  // Pagination calculations
  const totalEntries = filtered.length;
  const totalPages = Math.ceil(totalEntries / pageSize);
  const startEntry = totalEntries === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endEntry = Math.min(currentPage * pageSize, totalEntries);
  const currentPageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('pickupSummary')} subtitle={lang === 'km' ? `${filtered.length} អ្នកប្រមូលកញ្ចប់` : `${filtered.length} pickup riders`} />

        <div className="page-content">
          {/* Filter Card */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <MdFilterAlt size={18} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>{lang === 'km' ? 'តម្រង' : 'Filter'}</span>
              {hasFilter && (
                <button type="button" className="btn btn-outline btn-sm" onClick={clearFilters} style={{ marginLeft: 'auto', fontSize: 12, padding: '4px 10px', minHeight: 30 }}>
                  <MdClose size={14} /> {lang === 'km' ? 'សម្អាតទាំងអស់' : 'Clear All'}
                </button>
              )}
            </div>
            <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, alignItems: 'end' }}>
              <DateInput
                labelEn="Start Date"
                labelKh="ចាប់ពីថ្ងៃ"
                value={startDate}
                onChange={setStartDate}
              />
              <DateInput
                labelEn="End Date"
                labelKh="ដល់"
                value={endDate}
                onChange={setEndDate}
              />
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{lang === 'km' ? 'អ្នកប្រមូលកញ្ចប់ (Pickup Rider)' : 'Pickup Rider'}</label>
                <select className="form-control" value={driverId} onChange={e => setDriverId(e.target.value)}>
                  <option value="">-- {lang === 'km' ? 'ទាំងអស់' : 'All'} --</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.name}{d.nameKh ? ` (${d.nameKh})` : ''}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{lang === 'km' ? 'ហាង (Shop)' : 'Shop'}</label>
                <select className="form-control" value={merchantId} onChange={e => setMerchantId(e.target.value)}>
                  <option value="">-- {lang === 'km' ? 'ទាំងអស់' : 'All'} --</option>
                  {merchants.map(m => <option key={m.id} value={m.id}>{m.name}{m.nameKh ? ` (${m.nameKh})` : ''}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'flex-end' }}>
                <button className="btn btn-primary w-full" onClick={fetchData} disabled={loading} style={{ height: 38, gap: 6 }}>
                  <MdRefresh size={16} /> {loading ? (lang === 'km' ? 'កំពុងដំណើរការ...' : 'Loading...') : (lang === 'km' ? 'ស្វែងរក' : 'Apply Filter')}
                </button>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { key: 'pickupDrivers', label: lang === 'km' ? 'អ្នកប្រមូលកញ្ចប់' : 'Pickup Riders', value: filtered.length, color: 'var(--accent)', icon: '🚗' },
              { key: 'totalParcels', label: lang === 'km' ? 'សរុបកញ្ចប់' : 'Total Parcels', value: totalPackage, color: '#d97706', icon: '📦' },
              { key: 'totalFee', label: lang === 'km' ? 'សេវាដឹកសរុប' : 'Total Fee', value: `$${totalFee.toFixed(2)}`, color: 'var(--success)', icon: '💰' },
            ].map(s => (
              <div key={s.key} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 28 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Table Card */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">🚗 {t('pickupSummary')}</span>
              <div className="search-input-wrapper" style={{ maxWidth: 280 }}>
                <MdSearch className="search-icon" />
                <input
                  className="form-control search-input"
                  placeholder={lang === 'km' ? 'ស្វែងរកឈ្មោះ...' : 'Search name...'}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 50, textAlign: 'center' }}>{lang === 'km' ? 'ល.រ' : 'No.'}</th>
                    <th>{lang === 'km' ? 'អ្នកប្រមូលកញ្ចប់' : 'Pickup Rider'}</th>
                    <th style={{ textAlign: 'center' }}>{lang === 'km' ? 'ចំនួនហាង' : 'Shop Count'}</th>
                    <th style={{ textAlign: 'center' }}>{lang === 'km' ? 'ចំនួនកញ្ចប់' : 'Parcel Count'}</th>
                    <th style={{ textAlign: 'right', paddingRight: 24 }}>{lang === 'km' ? 'សេវាដឹក' : 'Delivery Fee'}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton columns={5} rows={5} />
                  ) : currentPageItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, borderBottom: 'none' }}>
                        {lang === 'km' ? 'គ្មានទិន្នន័យ' : 'No data'}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {currentPageItems.map((row, index) => (
                        <tr key={row.id}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>{(currentPage - 1) * pageSize + index + 1}</td>
                          <td style={{ fontWeight: 600 }}>{row.name}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '4px 12px', borderRadius: 4, fontWeight: 600, fontSize: 12 }}>{row.shopCount || 0}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ background: '#d97706', color: 'white', padding: '4px 12px', borderRadius: 4, fontWeight: 600, fontSize: 12 }}>{row.package}</span>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--success)', textAlign: 'right', paddingRight: 24 }}>
                            ${(row.fee || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {/* Total row */}
                      <tr style={{ background: 'var(--bg-primary)', fontWeight: 700 }}>
                        <td colSpan={2} style={{ textAlign: 'right', paddingRight: 20 }}>{lang === 'km' ? 'សរុប' : 'Total'}</td>
                        <td style={{ textAlign: 'center' }}>{filtered.reduce((a, r) => a + (r.shopCount || 0), 0)}</td>
                        <td style={{ textAlign: 'center' }}>{totalPackage}</td>
                        <td style={{ textAlign: 'right', paddingRight: 24, color: 'var(--success)' }}>${totalFee.toFixed(2)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {!loading && totalEntries > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={totalEntries}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(sz) => { setPageSize(sz); setCurrentPage(1); }}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
