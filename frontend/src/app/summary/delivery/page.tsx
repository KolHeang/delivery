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
  const { t } = useLanguage();

  const [data, setData] = useState<DeliverySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);

  // Filters
  const [startDate, setStartDate] = useState(() => getLocalFirstDayOfMonthString());
  const [endDate, setEndDate] = useState(() => getLocalDateString());
  const [driverId, setDriverId] = useState('');
  const [search, setSearch] = useState('');

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

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('deliverySummary') || 'Delivery Summary'} subtitle={`${filtered.length} drivers`} />

        <div className="page-content">
          {/* Filter Card */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <MdFilterAlt size={18} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Filter</span>
              {hasFilter && (
                <button onClick={clearFilters} style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--danger)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MdClose size={14} /> Clear All
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
                <label className="form-label">អ្នកដឹក (Driver)</label>
                <select className="form-control" value={driverId} onChange={e => setDriverId(e.target.value)}>
                  <option value="">-- {t('all') || 'All'} --</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.name}{d.nameKh ? ` (${d.nameKh})` : ''}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'flex-end' }}>
                <button className="btn btn-primary w-full" onClick={fetchData} disabled={loading} style={{ height: 38, gap: 6 }}>
                  <MdRefresh size={16} /> {loading ? 'Loading...' : 'Apply Filter'}
                </button>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { key: 'delivered', label: t('delivered') || 'Delivered', value: totalDelivered, color: 'var(--success)', icon: '✅' },
              { key: 'failed', label: t('failed') || 'Failed', value: totalFailed, color: 'var(--danger)', icon: '❌' },
              { key: 'returned', label: t('returned') || 'Returned', value: totalReturned, color: '#d97706', icon: '↩️' },
              { key: 'codUsd', label: t('codUsd') || 'COD (USD)', value: `$${totalCodUSD.toFixed(2)}`, color: 'var(--accent)', icon: '💵' },
              { key: 'codKhr', label: t('codKhr') || 'COD (KHR)', value: `៛${totalCodKHR.toLocaleString()}`, color: '#7c3aed', icon: '💴' },
              { key: 'deliveryFee', label: t('deliveryFee') || 'Delivery Fee', value: `$${totalFee.toFixed(2)}`, color: 'var(--success)', icon: '💰' },
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
              <span className="card-title">🚚 {t('deliverySummary') || 'Delivery Summary'} / សង្ខេបអ្នកដឹក</span>
              <div className="search-input-wrapper" style={{ maxWidth: 280 }}>
                <MdSearch className="search-icon" />
                <input
                  className="form-control search-input"
                  placeholder="ស្វែងរកអ្នកដឹក..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid var(--border)' }}>#</th>
                    <th rowSpan={2} style={{ verticalAlign: 'middle', borderRight: '1px solid var(--border)' }}>ឈ្មោះអ្នកដឹក</th>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid var(--border)' }}>ដឹកជញ្ជូនរួច</th>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid var(--border)' }}>បរាជ័យ</th>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid var(--border)' }}>ប្រគល់</th>
                    <th colSpan={2} style={{ textAlign: 'center', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>COD</th>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle' }}>សេវាដឹក</th>
                  </tr>
                  <tr>
                    <th style={{ textAlign: 'center', borderRight: '1px solid var(--border)', borderTop: 'none' }}>USD</th>
                    <th style={{ textAlign: 'center', borderRight: '1px solid var(--border)', borderTop: 'none' }}>KHR</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px 0' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '60px 0', borderBottom: 'none' }}>
                        <div className="empty-state" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                          <div className="empty-state-icon" style={{ fontSize: 48, marginBottom: 16 }}>🚚</div>
                          <div className="empty-state-title">No data available</div>
                          <div className="empty-state-text">Try adjusting the filters or date range</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filtered.map((row, index) => (
                        <tr key={row.id}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>{index + 1}</td>
                          <td style={{ fontWeight: 600, borderRight: '1px solid var(--border-light)' }}>{row.name}</td>
                          <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>
                            <span style={{ background: 'var(--success)', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{row.delivered} កញ្ចប់</span>
                          </td>
                          <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>
                            <span style={{ background: 'var(--danger)', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{row.failed} កញ្ចប់</span>
                          </td>
                          <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>
                            <span style={{ background: 'var(--warning)', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{row.returned} កញ្ចប់</span>
                          </td>
                          <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-light)', fontWeight: 600 }}>${(row.codUSD || 0).toFixed(2)}</td>
                          <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-light)', fontWeight: 600 }}>៛{(row.codKHR || 0).toLocaleString()}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--success)' }}>${(row.fee || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr style={{ background: 'var(--bg-primary)', fontWeight: 700 }}>
                        <td colSpan={2} style={{ textAlign: 'right', paddingRight: 20, borderRight: '1px solid var(--border)' }}>សរុប</td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>{totalDelivered} កញ្ចប់</td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>{totalFailed} កញ្ចប់</td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>{totalReturned} កញ្ចប់</td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>${totalCodUSD.toFixed(2)}</td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>៛{totalCodKHR.toLocaleString()}</td>
                        <td style={{ textAlign: 'center', color: 'var(--success)' }}>${totalFee.toFixed(2)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
