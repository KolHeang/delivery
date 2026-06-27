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

interface ShopSummary {
  id: number;
  name: string;
  delivered: number;
  failed: number;
  returned: number;
  qrShopUSD: number;
  qrShopKHR: number;
  qrDriverUSD: number;
  qrDriverKHR: number;
  codUSD: number;
  codKHR: number;
  fee: number;
}

export default function ShopSummaryPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [data, setData] = useState<ShopSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [merchants, setMerchants] = useState<any[]>([]);

  // Filters
  const [startDate, setStartDate] = useState(() => getLocalDateString());
  const [endDate, setEndDate] = useState(() => getLocalDateString());
  const [merchantId, setMerchantId] = useState('');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (merchantId) params.append('merchantId', merchantId);
      const res = await api.get(`/reports/shop-summary?${params.toString()}`);
      setData(res.data);
    } catch {}
    setLoading(false);
  }, [startDate, endDate, merchantId]);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    api.get('/merchants').then(m => setMerchants(m.data)).catch(() => {});
    fetchData();
  }, [router, fetchData]);

  const filtered = data.filter(row =>
    !search || row.name?.toLowerCase().includes(search.toLowerCase())
  );

  const clearFilters = () => { setStartDate(getLocalDateString()); setEndDate(getLocalDateString()); setMerchantId(''); setSearch(''); };
  const hasFilter = startDate !== getLocalDateString() || endDate !== getLocalDateString() || merchantId || search;

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
        <Topbar title={t('shopSummary') || 'Shop Summary'} subtitle={`${filtered.length} shops`} />

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
                <label className="form-label">ហាង (Shop / Merchant)</label>
                <select className="form-control" value={merchantId} onChange={e => setMerchantId(e.target.value)}>
                  <option value="">-- {t('all') || 'All'} --</option>
                  {merchants.map(m => <option key={m.id} value={m.id}>{m.name}{m.nameKh ? ` (${m.nameKh})` : ''}</option>)}
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
              { key: 'shops', label: t('shops') || 'Shops', value: filtered.length, color: 'var(--accent)', icon: '🏪' },
              { key: 'delivered', label: t('delivered') || 'Delivered', value: totalDelivered, color: 'var(--success)', icon: '✅' },
              { key: 'failed', label: t('failed') || 'Failed', value: totalFailed, color: 'var(--danger)', icon: '❌' },
              { key: 'returned', label: t('returned') || 'Returned', value: totalReturned, color: '#d97706', icon: '↩️' },
              { key: 'codUsd', label: t('codUsd') || 'COD (USD)', value: `$${totalCodUSD.toFixed(2)}`, color: 'var(--accent)', icon: '💵' },
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
              <span className="card-title">🏪 {t('shopSummary') || 'Shop Summary'} / សង្ខេបហាង</span>
              <div className="search-input-wrapper" style={{ maxWidth: 280 }}>
                <MdSearch className="search-icon" />
                <input
                  className="form-control search-input"
                  placeholder="ស្វែងរកហាង..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid var(--border)' }}>ល.រ</th>
                    <th rowSpan={2} style={{ verticalAlign: 'middle', borderRight: '1px solid var(--border)' }}>ឈ្មោះ ហាង</th>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid var(--border)' }}>ដឹកជញ្ជូនរួច</th>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid var(--border)' }}>បរាជ័យ</th>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid var(--border)' }}>ប្រគល់</th>
                    <th colSpan={2} style={{ textAlign: 'center', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>QR ហាង</th>
                    <th colSpan={2} style={{ textAlign: 'center', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>QR អ្នកដឹក</th>
                    <th colSpan={2} style={{ textAlign: 'center', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>COD</th>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle' }}>សេវាដឹក</th>
                  </tr>
                  <tr>
                    <th style={{ textAlign: 'center', borderRight: '1px solid var(--border)', borderTop: 'none' }}>USD</th>
                    <th style={{ textAlign: 'center', borderRight: '1px solid var(--border)', borderTop: 'none' }}>KHR</th>
                    <th style={{ textAlign: 'center', borderRight: '1px solid var(--border)', borderTop: 'none' }}>USD</th>
                    <th style={{ textAlign: 'center', borderRight: '1px solid var(--border)', borderTop: 'none' }}>KHR</th>
                    <th style={{ textAlign: 'center', borderRight: '1px solid var(--border)', borderTop: 'none' }}>USD</th>
                    <th style={{ textAlign: 'center', borderRight: '1px solid var(--border)', borderTop: 'none' }}>KHR</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={12} style={{ textAlign: 'center', padding: '40px 0' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={12} style={{ padding: '60px 0', borderBottom: 'none' }}>
                        <div className="empty-state" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                          <div className="empty-state-icon" style={{ fontSize: 48, marginBottom: 16 }}>🏪</div>
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
                          <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>{row.delivered} កញ្ចប់</td>
                          <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>{row.failed} កញ្ចប់</td>
                          <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>{row.returned} កញ្ចប់</td>
                          <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>${(row.qrShopUSD || 0).toFixed(2)}</td>
                          <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>៛{row.qrShopKHR || 0}</td>
                          <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>${(row.qrDriverUSD || 0).toFixed(2)}</td>
                          <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>៛{row.qrDriverKHR || 0}</td>
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
                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>$0.00</td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>៛0</td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>$0.00</td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>៛0</td>
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
