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
import { getParcelStatusLabel } from '@/lib/status';
import { MdPrint, MdRefresh, MdSearch, MdDownload } from 'react-icons/md';
import { exportToExcel } from '@/lib/export-excel';

const getFirstDayOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

export default function FailedReturnedReportPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const isKm = lang === 'km';

  const [startDate, setStartDate] = useState(() => getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(() => getLocalDateString());
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalAll: 0,
    totalDelivered: 0,
    totalFailed: 0,
    totalReturned: 0,
    issueRatePct: 0,
  });
  const [items, setItems] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.get('/reports/failed-returned', { params });
      if (res.data?.summary) setSummary(res.data.summary);
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch {}
    setLoading(false);
  }, [startDate, endDate, statusFilter]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
    load();
  }, [router, load]);

  const filtered = items.filter((it) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      it.trackingCode?.toLowerCase().includes(q) ||
      it.merchantName?.toLowerCase().includes(q) ||
      it.driverName?.toLowerCase().includes(q) ||
      it.receiverPhone?.toLowerCase().includes(q) ||
      it.note?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar
          title={isKm ? 'កញ្ចប់បរាជ័យ & ត្រឡប់ទៅហាង' : 'Failed & Returned Parcels'}
          subtitle={isKm ? 'វិភាគកញ្ចប់ដឹកមិនជោគជ័យ និងកញ្ចប់ត្រឡប់ទៅហាងវិញ' : 'Track failed deliveries, returned parcels, and reasons'}
        />

        <div className="page-content">
          <ReportHeader
            title={isKm ? 'របាយការណ៍កញ្ចប់បរាជ័យ & ត្រឡប់ទៅហាង' : 'Failed & Returned Parcels Report'}
            startDate={startDate}
            endDate={endDate}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>
                {isKm ? 'ដឹកបរាជ័យ (Failed)' : 'Failed Deliveries'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626' }}>{summary.totalFailed}</div>
            </div>

            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>
                {isKm ? 'ត្រឡប់ទៅហាង (Returned)' : 'Returned to Shop'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#d97706' }}>{summary.totalReturned}</div>
            </div>

            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>
                {isKm ? 'អត្រាបរាជ័យ / ត្រឡប់' : 'Issue Rate (%)'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{summary.issueRatePct}%</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {isKm ? `ក្នុងចំណោម ${summary.totalAll} កញ្ចប់` : `out of ${summary.totalAll} parcels`}
              </div>
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
              <div style={{ width: 170 }}>
                <label className="form-label" style={{ fontSize: 12.5, fontWeight: 600 }}>
                  {isKm ? 'ស្ថានភាព' : 'Status'}
                </label>
                <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ height: 38 }}>
                  <option value="all">{isKm ? 'ទាំងអស់ (បរាជ័យ & ត្រឡប់)' : 'All (Failed & Returned)'}</option>
                  <option value="failed">{isKm ? 'ដឹកបរាជ័យ' : 'Failed Only'}</option>
                  <option value="returned">{isKm ? 'ត្រឡប់ទៅហាង' : 'Returned Only'}</option>
                </select>
              </div>
              <div style={{ position: 'relative', width: 220 }}>
                <MdSearch size={17} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder={isKm ? 'ស្វែងរកកូដ, ហាង, អ្នកដឹក...' : 'Search code, shop, driver...'}
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
                      `failed-returned-${startDate || 'all'}-to-${endDate || 'now'}`,
                      [
                        isKm ? 'ល.រ' : 'No.',
                        isKm ? 'លេខកូដ' : 'Tracking Code',
                        isKm ? 'ហាង' : 'Merchant',
                        isKm ? 'អ្នកដឹកជញ្ជូន' : 'Driver',
                        isKm ? 'ឈ្មោះអ្នកទទួល' : 'Receiver',
                        isKm ? 'ទូរស័ព្ទអ្នកទទួល' : 'Phone',
                        'COD',
                        isKm ? 'រូបិយប័ណ្ណ' : 'Currency',
                        isKm ? 'ស្ថានភាព' : 'Status',
                        isKm ? 'មូលហេតុ / ចំណាំ' : 'Reason / Note',
                      ],
                      filtered.map((it, i) => [
                        i + 1,
                        it.trackingCode,
                        it.merchantName,
                        it.driverName,
                        it.receiverName,
                        it.receiverPhone,
                        it.cod,
                        it.codCurrency,
                        getParcelStatusLabel(it.status, lang),
                        it.note || '',
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
                    <th>{isKm ? 'លេខកូដ' : 'Tracking Code'}</th>
                    <th>{isKm ? 'ហាង' : 'Merchant'}</th>
                    <th>{isKm ? 'អ្នកដឹកជញ្ជូន' : 'Driver'}</th>
                    <th>{isKm ? 'អ្នកទទួល' : 'Receiver'}</th>
                    <th style={{ textAlign: 'right' }}>COD</th>
                    <th style={{ textAlign: 'center' }}>{isKm ? 'ស្ថានភាព' : 'Status'}</th>
                    <th>{isKm ? 'មូលហេតុ / ចំណាំ' : 'Reason / Note'}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton columns={8} rows={6} />
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 36, color: '#94a3b8' }}>
                        {isKm ? 'គ្មានកញ្ចប់បរាជ័យ ឬត្រឡប់ទេ' : 'No failed or returned parcels found'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item, idx) => (
                      <tr key={item.id}>
                        <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent, #1565D8)' }}>{item.trackingCode}</td>
                        <td style={{ fontWeight: 600 }}>{item.merchantName}</td>
                        <td>{item.driverName}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{item.receiverName || '—'}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{item.receiverPhone}</div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          {item.codCurrency === 'KHR' ? `៛${Math.round(item.cod).toLocaleString()}` : `$${item.cod.toFixed(2)}`}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 700,
                              background: item.status === 'failed' ? '#fee2e2' : '#fef3c7',
                              color: item.status === 'failed' ? '#dc2626' : '#d97706',
                            }}
                          >
                            {getParcelStatusLabel(item.status, lang)}
                          </span>
                        </td>
                        <td style={{ maxWidth: 220, color: '#475569' }}>{item.note || '—'}</td>
                      </tr>
                    ))
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
