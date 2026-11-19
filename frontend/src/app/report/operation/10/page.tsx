'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import api from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import ReportHeader from '@/components/ui/ReportHeader';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useLanguage } from '@/lib/LanguageContext';
import { getParcelStatusLabel } from '@/lib/status';
import { MdPrint, MdRefresh, MdSearch, MdWarningAmber, MdDownload } from 'react-icons/md';
import { exportToExcel } from '@/lib/export-excel';

export default function OverdueParcelsReportPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const isKm = lang === 'km';

  const [minHours, setMinHours] = useState('24');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalOverdue: 0, over48h: 0, over72h: 0 });
  const [items, setItems] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { minHours };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/reports/overdue-parcels', { params });
      if (res.data?.summary) setSummary(res.data.summary);
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch {}
    setLoading(false);
  }, [minHours, statusFilter]);

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
      it.receiverPhone?.toLowerCase().includes(q)
    );
  });

  const formatDelay = (hours: number) => {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    if (days >= 1) {
      return isKm ? `${days} ថ្ងៃ ${remHours} ម៉ោង` : `${days}d ${remHours}h`;
    }
    return isKm ? `${hours} ម៉ោង` : `${hours}h`;
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar
          title={isKm ? 'កញ្ចប់យឺតយ៉ាវ (SLA)' : 'Overdue / SLA Parcels'}
          subtitle={isKm ? 'តាមដានកញ្ចប់ដែលមិនទាន់ដឹកដល់លើសពេលកំណត់' : 'Monitor active parcels delayed beyond SLA threshold'}
        />

        <div className="page-content">
          <ReportHeader title={isKm ? 'របាយការណ៍កញ្ចប់យឺតយ៉ាវ (SLA)' : 'Overdue / SLA Parcels Report'} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>
                {isKm ? `យឺតលើស ${minHours} ម៉ោង` : `Overdue (${minHours}h+)`}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#d97706' }}>{summary.totalOverdue}</div>
            </div>

            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>
                {isKm ? 'យឺតលើស 48 ម៉ោង (2 ថ្ងៃ)' : 'Over 48 Hours (2d+)'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#ea580c' }}>{summary.over48h}</div>
            </div>

            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>
                {isKm ? 'យឺតធ្ងន់ធ្ងរ (លើស 72 ម៉ោង)' : 'Critical (72h+)'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626' }}>{summary.over72h}</div>
            </div>
          </div>

          <div className="card no-print" style={{ marginBottom: 16, padding: '16px 20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ width: 170 }}>
                <label className="form-label" style={{ fontSize: 12.5, fontWeight: 600 }}>
                  {isKm ? 'រយៈពេលយឺតអប្បបរមា' : 'Minimum Delay'}
                </label>
                <select className="form-control" value={minHours} onChange={(e) => setMinHours(e.target.value)} style={{ height: 38 }}>
                  <option value="12">{isKm ? 'លើស 12 ម៉ោង' : 'Over 12 hours'}</option>
                  <option value="24">{isKm ? 'លើស 24 ម៉ោង (1 ថ្ងៃ)' : 'Over 24 hours (1 day)'}</option>
                  <option value="48">{isKm ? 'លើស 48 ម៉ោង (2 ថ្ងៃ)' : 'Over 48 hours (2 days)'}</option>
                  <option value="72">{isKm ? 'លើស 72 ម៉ោង (3 ថ្ងៃ)' : 'Over 72 hours (3 days)'}</option>
                </select>
              </div>
              <div style={{ width: 170 }}>
                <label className="form-label" style={{ fontSize: 12.5, fontWeight: 600 }}>
                  {isKm ? 'ស្ថានភាព' : 'Status'}
                </label>
                <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ height: 38 }}>
                  <option value="">{isKm ? '-- ទាំងអស់ --' : '-- All Open --'}</option>
                  <option value="pending">{getParcelStatusLabel('pending', lang)}</option>
                  <option value="in-warehouse">{getParcelStatusLabel('in-warehouse', lang)}</option>
                  <option value="assigned">{getParcelStatusLabel('assigned', lang)}</option>
                  <option value="picked-up">{getParcelStatusLabel('picked-up', lang)}</option>
                  <option value="in-transit">{getParcelStatusLabel('in-transit', lang)}</option>
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
                      `overdue-parcels-${minHours}h-${new Date().toISOString().slice(0, 10)}`,
                      [
                        isKm ? 'ល.រ' : 'No.',
                        isKm ? 'លេខកូដ' : 'Tracking Code',
                        isKm ? 'ហាង' : 'Merchant',
                        isKm ? 'អ្នកដឹកជញ្ជូន' : 'Driver',
                        isKm ? 'ឈ្មោះអ្នកទទួល' : 'Receiver',
                        isKm ? 'ទូរស័ព្ទអ្នកទទួល' : 'Phone',
                        isKm ? 'ស្ថានភាព' : 'Status',
                        isKm ? 'រយៈពេលយឺត (ម៉ោង)' : 'Hours Delayed',
                      ],
                      filtered.map((it, i) => [
                        i + 1,
                        it.trackingCode,
                        it.merchantName,
                        it.driverName,
                        it.receiverName,
                        it.receiverPhone,
                        getParcelStatusLabel(it.status, lang),
                        it.hoursDelayed,
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
                    <th style={{ textAlign: 'center' }}>{isKm ? 'ស្ថានភាព' : 'Status'}</th>
                    <th style={{ textAlign: 'center' }}>{isKm ? 'រយៈពេលយឺត' : 'Delayed'}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton columns={7} rows={6} />
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: 36, color: '#94a3b8' }}>
                        {isKm ? 'ល្អណាស់! គ្មានកញ្ចប់យឺតយ៉ាវទេ' : 'Great! No overdue parcels found'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item, idx) => {
                      const isCritical = item.hoursDelayed >= 72;
                      return (
                        <tr key={item.id}>
                          <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent, #1565D8)' }}>{item.trackingCode}</td>
                          <td style={{ fontWeight: 600 }}>{item.merchantName}</td>
                          <td>{item.driverName}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{item.receiverName || '—'}</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>{item.receiverPhone}</div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: '#f1f5f9', color: '#334155' }}>
                              {getParcelStatusLabel(item.status, lang)}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 10px',
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 700,
                                background: isCritical ? '#fee2e2' : '#fef3c7',
                                color: isCritical ? '#dc2626' : '#d97706',
                              }}
                            >
                              {isCritical && <MdWarningAmber size={13} />}
                              {formatDelay(item.hoursDelayed)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
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
