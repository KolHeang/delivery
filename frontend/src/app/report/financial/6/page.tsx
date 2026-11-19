'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import api from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import ReportHeader from '@/components/ui/ReportHeader';
import DateInput, { getLocalDateString } from '@/components/ui/DateInput';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useLanguage } from '@/lib/LanguageContext';
import { MdPrint, MdRefresh, MdSearch, MdDownload } from 'react-icons/md';
import { exportToExcel } from '@/lib/export-excel';

const getFirstDayOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

export default function ZonePerformanceReportPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const isKm = lang === 'km';

  const [startDate, setStartDate] = useState(() => getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(() => getLocalDateString());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await api.get('/reports/zone-performance', { params });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch {}
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
    load();
  }, [router, load]);

  const filtered = rows.filter((r) => !search.trim() || r.name?.toLowerCase().includes(search.toLowerCase()));

  const totals = filtered.reduce(
    (acc, r) => ({
      total: acc.total + r.totalParcels,
      delivered: acc.delivered + r.delivered,
      failed: acc.failed + r.failed,
      returned: acc.returned + r.returned,
      fee: acc.fee + r.deliveryFee,
      codUSD: acc.codUSD + r.codUSD,
      codKHR: acc.codKHR + r.codKHR,
    }),
    { total: 0, delivered: 0, failed: 0, returned: 0, fee: 0, codUSD: 0, codKHR: 0 },
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar
          title={isKm ? 'ចំណូល & ដំណើរការតាមតំបន់' : 'Zone Performance & Revenue'}
          subtitle={isKm ? 'ប្រៀបធៀបចំនួនកញ្ចប់ អត្រាជោគជ័យ និងចំណូលសេវាដឹកតាមតំបន់' : 'Compare parcel volume, success rate, and delivery revenue by zone'}
        />

        <div className="page-content">
          <ReportHeader
            title={isKm ? 'របាយការណ៍ចំណូល & ដំណើរការតាមតំបន់' : 'Zone Performance & Revenue Report'}
            startDate={startDate}
            endDate={endDate}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>
                {isKm ? 'តំបន់សរុប' : 'Active Zones'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{filtered.length}</div>
            </div>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>
                {isKm ? 'កញ្ចប់សរុប / ដឹកជោគជ័យ' : 'Total / Delivered'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>
                {totals.delivered} <span style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>/ {totals.total}</span>
              </div>
            </div>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>
                {isKm ? 'ចំណូលសេវាដឹកសរុប' : 'Total Delivery Fee'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent, #1565D8)' }}>${totals.fee.toFixed(2)}</div>
            </div>
          </div>

          <div className="card no-print" style={{ marginBottom: 16, padding: '16px 20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ width: 170 }}>
                <DateInput labelEn="Start Date" labelKh="ចាប់ពីថ្ងៃ" value={startDate} onChange={setStartDate} />
              </div>
              <div style={{ width: 170 }}>
                <DateInput labelEn="End Date" labelKh="ដល់ថ្ងៃ" value={endDate} onChange={setEndDate} />
              </div>
              <div style={{ position: 'relative', width: 220 }}>
                <MdSearch size={17} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder={isKm ? 'ស្វែងរកតំបន់...' : 'Search zone...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: 32, height: 38 }}
                />
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-outline" onClick={load} style={{ height: 38 }}>
                  <MdRefresh size={16} /> {isKm ? 'ផ្ទុកឡើងវិញ' : 'Refresh'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={filtered.length === 0}
                  onClick={() =>
                    exportToExcel(
                      `zone-performance-${startDate || 'all'}-to-${endDate || 'now'}`,
                      [
                        isKm ? 'ល.រ' : 'No.',
                        isKm ? 'តំបន់' : 'Zone',
                        isKm ? 'កញ្ចប់សរុប' : 'Total',
                        isKm ? 'ដឹកជោគជ័យ' : 'Delivered',
                        isKm ? 'បរាជ័យ' : 'Failed',
                        isKm ? 'ត្រឡប់' : 'Returned',
                        isKm ? 'អត្រាជោគជ័យ (%)' : 'Success Rate (%)',
                        'COD (USD)',
                        'COD (KHR)',
                        isKm ? 'សេវាដឹក (USD)' : 'Delivery Fee (USD)',
                      ],
                      filtered.map((r, i) => [
                        i + 1,
                        r.name,
                        r.totalParcels,
                        r.delivered,
                        r.failed,
                        r.returned,
                        `${r.successRatePct}%`,
                        r.codUSD.toFixed(2),
                        Math.round(r.codKHR),
                        r.deliveryFee.toFixed(2),
                      ]),
                    )
                  }
                  style={{ height: 38 }}
                >
                  <MdDownload size={16} /> {isKm ? 'ទាញយក Excel' : 'Export Excel'}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => window.print()} style={{ height: 38 }}>
                  <MdPrint size={16} /> {isKm ? 'បោះពុម្ព' : 'Print'}
                </button>
              </div>
            </div>
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 50, textAlign: 'center' }}>{isKm ? 'ល.រ' : 'No.'}</th>
                    <th>{isKm ? 'តំបន់' : 'Zone'}</th>
                    <th style={{ textAlign: 'center' }}>{isKm ? 'សរុប' : 'Total'}</th>
                    <th style={{ textAlign: 'center' }}>{isKm ? 'ជោគជ័យ' : 'Delivered'}</th>
                    <th style={{ textAlign: 'center' }}>{isKm ? 'បរាជ័យ / ត្រឡប់' : 'Failed / Ret.'}</th>
                    <th style={{ textAlign: 'center' }}>{isKm ? 'អត្រាជោគជ័យ' : 'Success Rate'}</th>
                    <th style={{ textAlign: 'right' }}>COD ($)</th>
                    <th style={{ textAlign: 'right' }}>COD (៛)</th>
                    <th style={{ textAlign: 'right' }}>{isKm ? 'សេវាដឹក ($)' : 'Delivery Fee'}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton columns={9} rows={6} />
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: 36, color: '#94a3b8' }}>
                        {isKm ? 'គ្មានទិន្នន័យតំបន់ទេ' : 'No zone data found'}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filtered.map((row, idx) => (
                        <tr key={`${row.id}-${row.name}`}>
                          <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>{row.name}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{row.totalParcels}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>{row.delivered}</td>
                          <td style={{ textAlign: 'center', color: '#64748b' }}>
                            {row.failed} / {row.returned}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 9px',
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 700,
                                background: row.successRatePct >= 80 ? '#dcfce7' : row.successRatePct >= 50 ? '#fef3c7' : '#fee2e2',
                                color: row.successRatePct >= 80 ? '#16a34a' : row.successRatePct >= 50 ? '#d97706' : '#dc2626',
                              }}
                            >
                              {row.successRatePct}%
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>${row.codUSD.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>៛{Math.round(row.codKHR).toLocaleString()}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent, #1565D8)' }}>${row.deliveryFee.toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr style={{ background: '#f1f5f9', fontWeight: 800 }}>
                        <td colSpan={2} style={{ textAlign: 'right', fontWeight: 800 }}>{isKm ? 'សរុបរួម' : 'Total'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 800 }}>{totals.total}</td>
                        <td style={{ textAlign: 'center', fontWeight: 800, color: '#16a34a' }}>{totals.delivered}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{totals.failed} / {totals.returned}</td>
                        <td style={{ textAlign: 'center', fontWeight: 800 }}>
                          {totals.total > 0 ? `${Math.round((totals.delivered / totals.total) * 1000) / 10}%` : '0%'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>${totals.codUSD.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>៛{Math.round(totals.codKHR).toLocaleString()}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent, #1565D8)' }}>${totals.fee.toFixed(2)}</td>
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
