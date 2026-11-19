'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import api from '@/lib/api';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import ReportHeader from '@/components/ui/ReportHeader';
import DateInput from '@/components/ui/DateInput';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useLanguage } from '@/lib/LanguageContext';
import { MdPrint, MdRefresh, MdSearch, MdDirectionsBike, MdStorefront, MdWarningAmber, MdDownload } from 'react-icons/md';
import { exportToExcel } from '@/lib/export-excel';

interface UnpaidRow {
  id: number;
  name: string;
  phone: string;
  parcelCount: number;
  codUSD: number;
  codKHR: number;
  driverFee?: number;
  deliveryFee?: number;
  oldestDate: string | null;
  overdueDays: number;
}

export default function UnpaidCodReportPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const isKm = lang === 'km';

  const [tab, setTab] = useState<'driver' | 'merchant'>('driver');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [driverUnpaid, setDriverUnpaid] = useState<UnpaidRow[]>([]);
  const [merchantUnpaid, setMerchantUnpaid] = useState<UnpaidRow[]>([]);
  const [summary, setSummary] = useState<any>({
    driverCount: 0,
    driverParcels: 0,
    driverCodUSD: 0,
    driverCodKHR: 0,
    merchantCount: 0,
    merchantParcels: 0,
    merchantCodUSD: 0,
    merchantCodKHR: 0,
    merchantDeliveryFee: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await api.get('/reports/unpaid-cod', { params });
      setDriverUnpaid(res.data?.driverUnpaid || []);
      setMerchantUnpaid(res.data?.merchantUnpaid || []);
      if (res.data?.summary) setSummary(res.data.summary);
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

  const activeRows = (tab === 'driver' ? driverUnpaid : merchantUnpaid).filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.phone.toLowerCase().includes(q);
  });

  const getAgingBadge = (days: number) => {
    if (days >= 7) {
      return { bg: '#fee2e2', color: '#dc2626', label: isKm ? `យឺត ${days} ថ្ងៃ` : `${days}d overdue` };
    }
    if (days >= 3) {
      return { bg: '#fef3c7', color: '#d97706', label: isKm ? `${days} ថ្ងៃ` : `${days} days` };
    }
    if (days >= 1) {
      return { bg: '#eff6ff', color: '#2563eb', label: isKm ? `${days} ថ្ងៃ` : `${days} day(s)` };
    }
    return { bg: '#f1f5f9', color: '#475569', label: isKm ? 'ថ្ងៃនេះ' : 'Today' };
  };

  const totalParcels = activeRows.reduce((s, r) => s + r.parcelCount, 0);
  const totalCodUSD = activeRows.reduce((s, r) => s + r.codUSD, 0);
  const totalCodKHR = activeRows.reduce((s, r) => s + r.codKHR, 0);
  const totalFee = activeRows.reduce((s, r) => s + (tab === 'driver' ? (r.driverFee || 0) : (r.deliveryFee || 0)), 0);

  const reportTitle = isKm
    ? (tab === 'driver' ? 'របាយការណ៍ប្រាក់ COD មិនទាន់ទូទាត់ (អ្នកដឹកជញ្ជូន)' : 'របាយការណ៍ប្រាក់ COD មិនទាន់ទូទាត់ (ហាងទំនិញ)')
    : (tab === 'driver' ? 'Unpaid COD Report (Drivers)' : 'Unpaid COD Report (Merchants)');

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar
          title={isKm ? 'ប្រាក់ COD មិនទាន់ទូទាត់' : 'Unpaid COD & Aging'}
          subtitle={isKm ? 'តាមដានប្រាក់ COD ដែលអ្នកដឹកមិនទាន់បង្វែរ និងប្រាក់ជំពាក់ហាង' : 'Track unsettled driver COD collections and pending merchant payouts'}
        />

        <div className="page-content">
          <ReportHeader title={reportTitle} startDate={startDate} endDate={endDate} />

          {/* Summary KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>
                {isKm ? 'អ្នកដឹកមិនទាន់បង្វែរ (USD / KHR)' : 'Driver Unpaid COD'}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>
                ${summary.driverCodUSD.toFixed(2)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginTop: 2 }}>
                ៛{Math.round(summary.driverCodKHR).toLocaleString()} · {summary.driverParcels} {isKm ? 'កញ្ចប់' : 'parcels'}
              </div>
            </div>

            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>
                {isKm ? 'ក្រុមហ៊ុនជំពាក់ហាង (USD / KHR)' : 'Merchant Unpaid COD'}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#d97706' }}>
                ${summary.merchantCodUSD.toFixed(2)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginTop: 2 }}>
                ៛{Math.round(summary.merchantCodKHR).toLocaleString()} · {summary.merchantParcels} {isKm ? 'កញ្ចប់' : 'parcels'}
              </div>
            </div>

            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>
                {isKm ? 'សេវាដឹកមិនទាន់កាត់ពីហាង' : 'Unsettled Delivery Fees'}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent, #1565D8)' }}>
                ${summary.merchantDeliveryFee.toFixed(2)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginTop: 2 }}>
                {summary.merchantCount} {isKm ? 'ហាង' : 'merchants'} · {summary.driverCount} {isKm ? 'អ្នកដឹក' : 'drivers'}
              </div>
            </div>
          </div>

          {/* Filter & Tab Bar */}
          <div className="card no-print" style={{ marginBottom: 16, padding: '16px 20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setTab('driver')}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 10,
                    border: tab === 'driver' ? 'none' : '1px solid #e2e8f0',
                    background: tab === 'driver' ? 'var(--accent, #1565D8)' : '#ffffff',
                    color: tab === 'driver' ? '#ffffff' : '#334155',
                    fontWeight: 700,
                    fontSize: 13.5,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <MdDirectionsBike size={17} />
                  <span>{isKm ? `អ្នកដឹកជំពាក់ (${driverUnpaid.length})` : `Drivers Owe (${driverUnpaid.length})`}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTab('merchant')}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 10,
                    border: tab === 'merchant' ? 'none' : '1px solid #e2e8f0',
                    background: tab === 'merchant' ? 'var(--accent, #1565D8)' : '#ffffff',
                    color: tab === 'merchant' ? '#ffffff' : '#334155',
                    fontWeight: 700,
                    fontSize: 13.5,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <MdStorefront size={17} />
                  <span>{isKm ? `ជំពាក់ហាង (${merchantUnpaid.length})` : `Owed to Shops (${merchantUnpaid.length})`}</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
                <div style={{ width: 165 }}>
                  <DateInput labelEn="From Date" labelKh="ចាប់ពីថ្ងៃ" value={startDate} onChange={setStartDate} />
                </div>
                <div style={{ width: 165 }}>
                  <DateInput labelEn="To Date" labelKh="ដល់ថ្ងៃ" value={endDate} onChange={setEndDate} />
                </div>
                <div style={{ position: 'relative', width: 200 }}>
                  <MdSearch size={17} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder={isKm ? 'ស្វែងរកឈ្មោះ / លេខ...' : 'Search name / phone...'}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ paddingLeft: 32, height: 38 }}
                  />
                </div>
                <button type="button" className="btn btn-outline" onClick={load} style={{ height: 38 }}>
                  <MdRefresh size={16} /> {isKm ? 'ផ្ទុកឡើងវិញ' : 'Refresh'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={activeRows.length === 0}
                  onClick={() =>
                    exportToExcel(
                      `unpaid-cod-${tab}-${new Date().toISOString().slice(0, 10)}`,
                      [
                        isKm ? 'ល.រ' : 'No.',
                        tab === 'driver' ? (isKm ? 'អ្នកដឹកជញ្ជូន' : 'Driver') : (isKm ? 'ឈ្មោះហាង' : 'Merchant'),
                        isKm ? 'លេខទូរស័ព្ទ' : 'Phone',
                        isKm ? 'ចំនួនកញ្ចប់' : 'Parcels',
                        'COD (USD)',
                        'COD (KHR)',
                        tab === 'driver' ? (isKm ? 'កម្រៃអ្នកដឹក (KHR)' : 'Driver Fee (KHR)') : (isKm ? 'សេវាដឹក (USD)' : 'Delivery Fee (USD)'),
                        isKm ? 'ចំនួនថ្ងៃយឺត' : 'Overdue Days',
                      ],
                      activeRows.map((r, i) => [
                        i + 1,
                        r.name,
                        r.phone || '',
                        r.parcelCount,
                        r.codUSD.toFixed(2),
                        Math.round(r.codKHR),
                        tab === 'driver' ? Math.round(r.driverFee || 0) : (r.deliveryFee || 0).toFixed(2),
                        r.overdueDays,
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

          {/* Data Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 54, textAlign: 'center' }}>{isKm ? 'ល.រ' : 'No.'}</th>
                    <th>{tab === 'driver' ? (isKm ? 'អ្នកដឹកជញ្ជូន' : 'Driver') : (isKm ? 'ឈ្មោះហាង' : 'Merchant')}</th>
                    <th>{isKm ? 'លេខទូរស័ព្ទ' : 'Phone'}</th>
                    <th style={{ textAlign: 'center' }}>{isKm ? 'ចំនួនកញ្ចប់' : 'Parcels'}</th>
                    <th style={{ textAlign: 'right' }}>COD ($)</th>
                    <th style={{ textAlign: 'right' }}>COD (៛)</th>
                    <th style={{ textAlign: 'right' }}>
                      {tab === 'driver' ? (isKm ? 'កម្រៃអ្នកដឹក (៛)' : 'Driver Fee (៛)') : (isKm ? 'សេវាដឹក ($)' : 'Delivery Fee ($)')}
                    </th>
                    <th style={{ textAlign: 'center' }}>{isKm ? 'រយៈពេលយឺត' : 'Aging'}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton columns={8} rows={6} />
                  ) : activeRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 36, color: '#94a3b8' }}>
                        {isKm ? 'គ្មានប្រាក់ COD មិនទាន់ទូទាត់ទេ' : 'No unpaid COD records found'}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {activeRows.map((row, idx) => {
                        const badge = getAgingBadge(row.overdueDays);
                        return (
                          <tr key={row.id}>
                            <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                            <td style={{ fontWeight: 700, color: '#0f172a' }}>{row.name}</td>
                            <td style={{ color: '#475569' }}>{row.phone || '—'}</td>
                            <td style={{ textAlign: 'center', fontWeight: 700 }}>{row.parcelCount}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>${row.codUSD.toFixed(2)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>៛{Math.round(row.codKHR).toLocaleString()}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent, #1565D8)' }}>
                              {tab === 'driver'
                                ? `៛${Math.round(row.driverFee || 0).toLocaleString()}`
                                : `$${(row.deliveryFee || 0).toFixed(2)}`}
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
                                  background: badge.bg,
                                  color: badge.color,
                                }}
                              >
                                {row.overdueDays >= 7 && <MdWarningAmber size={13} />}
                                {badge.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      <tr style={{ background: '#f1f5f9', fontWeight: 800 }}>
                        <td colSpan={3} style={{ textAlign: 'right', fontWeight: 800 }}>
                          {isKm ? 'សរុបរួម' : 'Total'}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 800 }}>{totalParcels}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>${totalCodUSD.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>៛{Math.round(totalCodKHR).toLocaleString()}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent, #1565D8)' }}>
                          {tab === 'driver' ? `៛${Math.round(totalFee).toLocaleString()}` : `$${totalFee.toFixed(2)}`}
                        </td>
                        <td />
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
