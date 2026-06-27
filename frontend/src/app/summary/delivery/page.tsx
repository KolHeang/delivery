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

const getLocalFirstDayOfMonthString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

interface DeliverySummary {
  id: number;
  name: string;
  delivered: number;
  failed: number;
  returned: number;
  codUSD: number;
  codKHR: number;
  fee: number;
}

export default function DeliverySummaryPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();

  const [data, setData] = useState<DeliverySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);

  // Filters
  const [startDate, setStartDate] = useState(() => getLocalDateString());
  const [endDate, setEndDate] = useState(() => getLocalDateString());
  const [driverId, setDriverId] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, driverId, search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (driverId) params.append('driverId', driverId);
      const res = await api.get(`/reports/delivery-summary?${params.toString()}`);
      setData(res.data);
    } catch {}
    setLoading(false);
  }, [startDate, endDate, driverId]);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    api.get('/drivers').then(d => setDrivers(d.data)).catch(() => {});
    fetchData();
  }, [router, fetchData]);

  const filtered = data.filter(row =>
    !search || row.name?.toLowerCase().includes(search.toLowerCase())
  );

  const clearFilters = () => { setStartDate(getLocalDateString()); setEndDate(getLocalDateString()); setDriverId(''); setSearch(''); };
  const hasFilter = startDate !== getLocalDateString() || endDate !== getLocalDateString() || driverId || search;

  const totalDelivered = filtered.reduce((a, r) => a + r.delivered, 0);
  const totalFailed = filtered.reduce((a, r) => a + r.failed, 0);
  const totalReturned = filtered.reduce((a, r) => a + r.returned, 0);
  const totalCodUSD = filtered.reduce((a, r) => a + r.codUSD, 0);
  const totalCodKHR = filtered.reduce((a, r) => a + r.codKHR, 0);
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
        <Topbar title={lang === 'km' ? 'សង្ខេបការដឹកជញ្ជូន' : 'Delivery Summary'} subtitle={lang === 'km' ? `${filtered.length} អ្នកដឹក` : `${filtered.length} drivers`} />

        <div className="page-content">
          {/* Filter Card */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <MdFilterAlt size={18} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>{lang === 'km' ? 'តម្រង' : 'Filter'}</span>
              {hasFilter && (
                <button onClick={clearFilters} style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--danger)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
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
                <label className="form-label">{lang === 'km' ? 'អ្នកដឹក (Driver)' : 'Driver'}</label>
                <select className="form-control" value={driverId} onChange={e => setDriverId(e.target.value)}>
                  <option value="">-- {lang === 'km' ? 'ទាំងអស់' : 'All'} --</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.name}{d.nameKh ? ` (${d.nameKh})` : ''}</option>)}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { key: 'delivered', label: lang === 'km' ? 'ដឹកជញ្ជូនរួច' : 'Delivered', value: totalDelivered, color: 'var(--success)', icon: '✅' },
              { key: 'failed', label: lang === 'km' ? 'បរាជ័យ' : 'Failed', value: totalFailed, color: 'var(--danger)', icon: '❌' },
              { key: 'returned', label: lang === 'km' ? 'បង្វិលត្រឡប់' : 'Returned', value: totalReturned, color: '#d97706', icon: '↩️' },
              { key: 'codUsd', label: lang === 'km' ? 'COD (USD)' : 'COD (USD)', value: `$${totalCodUSD.toFixed(2)}`, color: 'var(--accent)', icon: '💵' },
              { key: 'codKhr', label: lang === 'km' ? 'COD (KHR)' : 'COD (KHR)', value: `៛${totalCodKHR.toLocaleString()}`, color: '#7c3aed', icon: '💴' },
              { key: 'deliveryFee', label: lang === 'km' ? 'សេវាដឹកសរុប' : 'Delivery Fee', value: `$${totalFee.toFixed(2)}`, color: 'var(--success)', icon: '💰' },
            ].map(s => (
              <div key={s.key} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 22 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Table Card */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">🚚 {lang === 'km' ? 'សង្ខេបអ្នកដឹក' : 'Delivery Summary'}</span>
              <div className="search-input-wrapper" style={{ maxWidth: 280 }}>
                <MdSearch className="search-icon" />
                <input
                  className="form-control search-input"
                  placeholder={lang === 'km' ? 'ស្វែងរកអ្នកដឹក...' : 'Search driver...'}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Datatable Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #e5e7eb', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#4b5563' }}>
                <span>{lang === 'km' ? 'បង្ហាញ' : 'Show'}</span>
                <select
                  className="form-control"
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  style={{ width: '70px', height: '34px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span>{lang === 'km' ? 'ជួរ' : 'entries'}</span>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid var(--border)' }}>#</th>
                    <th rowSpan={2} style={{ verticalAlign: 'middle', borderRight: '1px solid var(--border)' }}>{lang === 'km' ? 'ឈ្មោះអ្នកដឹក' : 'Driver Name'}</th>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid var(--border)' }}>{lang === 'km' ? 'ដឹកជញ្ជូនរួច' : 'Delivered'}</th>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid var(--border)' }}>{lang === 'km' ? 'បរាជ័យ' : 'Failed'}</th>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid var(--border)' }}>{lang === 'km' ? 'ប្រគល់' : 'Returned'}</th>
                    <th colSpan={2} style={{ textAlign: 'center', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>COD</th>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle' }}>{lang === 'km' ? 'សេវាដឹក' : 'Delivery Fee'}</th>
                  </tr>
                  <tr>
                    <th style={{ textAlign: 'center', borderRight: '1px solid var(--border)', borderTop: 'none' }}>USD</th>
                    <th style={{ textAlign: 'center', borderRight: '1px solid var(--border)', borderTop: 'none' }}>KHR</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px 0' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
                  ) : currentPageItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '60px 0', borderBottom: 'none' }}>
                        <div className="empty-state" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                          <div className="empty-state-icon" style={{ fontSize: 48, marginBottom: 16 }}>🚚</div>
                          <div className="empty-state-title">{lang === 'km' ? 'គ្មានទិន្នន័យទេ' : 'No data available'}</div>
                          <div className="empty-state-text">{lang === 'km' ? 'សាកល្បងកែតម្រូវតម្រង ឬចន្លោះកាលបរិច្ឆេទ' : 'Try adjusting the filters or date range'}</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {currentPageItems.map((row, index) => (
                        <tr key={row.id}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>{(currentPage - 1) * pageSize + index + 1}</td>
                          <td style={{ fontWeight: 600, borderRight: '1px solid var(--border-light)' }}>{row.name}</td>
                           <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>
                            <span style={{ background: 'var(--success)', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{row.delivered} {lang === 'km' ? 'កញ្ចប់' : 'parcels'}</span>
                          </td>
                          <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>
                            <span style={{ background: 'var(--danger)', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{row.failed} {lang === 'km' ? 'កញ្ចប់' : 'parcels'}</span>
                          </td>
                          <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>
                            <span style={{ background: 'var(--warning)', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{row.returned} {lang === 'km' ? 'កញ្ចប់' : 'parcels'}</span>
                          </td>
                          <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-light)', fontWeight: 600 }}>${(row.codUSD || 0).toFixed(2)}</td>
                          <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-light)', fontWeight: 600 }}>៛{(row.codKHR || 0).toLocaleString()}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--success)' }}>${(row.fee || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr style={{ background: 'var(--bg-primary)', fontWeight: 700 }}>
                        <td colSpan={2} style={{ textAlign: 'right', paddingRight: 20, borderRight: '1px solid var(--border)' }}>{lang === 'km' ? 'សរុប' : 'Total'}</td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>{totalDelivered} {lang === 'km' ? 'កញ្ចប់' : 'parcels'}</td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>{totalFailed} {lang === 'km' ? 'កញ្ចប់' : 'parcels'}</td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>{totalReturned} {lang === 'km' ? 'កញ្ចប់' : 'parcels'}</td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>${totalCodUSD.toFixed(2)}</td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>៛{totalCodKHR.toLocaleString()}</td>
                        <td style={{ textAlign: 'center', color: 'var(--success)' }}>${totalFee.toFixed(2)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid #e5e7eb', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  {lang === 'km' 
                    ? `បង្ហាញពីជួរទី ${startEntry} ដល់ ${endEntry} នៃទិន្នន័យសរុប ${totalEntries} ជួរ` 
                    : `Showing ${startEntry} to ${endEntry} of ${totalEntries} entries`}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    style={{ padding: '4px 10px', height: '30px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    {lang === 'km' ? 'មុន' : 'Previous'}
                  </button>
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(pageNum => (
                    <button
                      key={pageNum}
                      className={`btn btn-sm ${currentPage === pageNum ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setCurrentPage(pageNum)}
                      style={{
                        padding: '4px 10px',
                        height: '30px',
                        fontSize: '12px',
                        backgroundColor: currentPage === pageNum ? '#2563eb' : 'transparent',
                        borderColor: '#2563eb',
                        color: currentPage === pageNum ? '#fff' : '#2563eb',
                        cursor: 'pointer'
                      }}
                    >
                      {pageNum}
                    </button>
                  ))}
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    style={{ padding: '4px 10px', height: '30px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    {lang === 'km' ? 'បន្ទាប់' : 'Next'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
