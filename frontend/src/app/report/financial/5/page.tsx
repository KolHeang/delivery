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

interface CommissionRow {
  id: number;
  name: string;
  phone: string;
  deliveredCount: number;
  failedCount: number;
  returnedCount: number;
  totalDriverFee: number;
  paidDriverFee: number;
  unpaidDriverFee: number;
  totalDeliveryFee: number;
  codUSD: number;
  codKHR: number;
}

const getFirstDayOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

export default function DriverCommissionReportPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const isKm = lang === 'km';

  const [startDate, setStartDate] = useState(() => getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(() => getLocalDateString());
  const [driverId, setDriverId] = useState('');
  const [search, setSearch] = useState('');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [rows, setRows] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (driverId) params.driverId = driverId;
      const res = await api.get('/reports/driver-commission', { params });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch {}
    setLoading(false);
  }, [startDate, endDate, driverId]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
    api
      .get('/select/drivers')
      .then((res) => setDrivers(Array.isArray(res.data) ? res.data : res.data?.result || []))
      .catch(() => {});
    load();
  }, [router, load]);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.phone.toLowerCase().includes(q);
  });

  const totals = filtered.reduce(
    (acc, r) => ({
      delivered: acc.delivered + r.deliveredCount,
      failed: acc.failed + r.failedCount,
      returned: acc.returned + r.returnedCount,
      totalFee: acc.totalFee + r.totalDriverFee,
      paidFee: acc.paidFee + r.paidDriverFee,
      unpaidFee: acc.unpaidFee + r.unpaidDriverFee,
      deliveryFee: acc.deliveryFee + r.totalDeliveryFee,
    }),
    { delivered: 0, failed: 0, returned: 0, totalFee: 0, paidFee: 0, unpaidFee: 0, deliveryFee: 0 },
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar
          title={isKm ? 'កម្រៃអ្នកដឹកជញ្ជូន' : 'Driver Commission & Payroll'}
          subtitle={isKm ? 'សរុបកម្រៃជើងសារអ្នកដឹកជញ្ជូនតាមចំនួនកញ្ចប់ដឹកជោគជ័យ' : 'Summary of driver commissions earned, paid, and pending payout'}
        />

        <div className="page-content">
          <ReportHeader
            title={isKm ? 'របាយការណ៍កម្រៃអ្នកដឹកជញ្ជូន' : 'Driver Commission & Payroll Report'}
            startDate={startDate}
            endDate={endDate}
          />

          {/* Summary KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 18 }}>
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>
                {isKm ? 'កម្រៃអ្នកដឹកសរុប (KHR)' : 'Total Driver Commission'}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent, #1565D8)' }}>
                ៛{Math.round(totals.totalFee).toLocaleString()}
              </div>
              <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
                {totals.delivered} {isKm ? 'កញ្ចប់ដឹកជោគជ័យ' : 'delivered parcels'}
              </div>
            </div>

            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>
                {isKm ? 'បានទូទាត់រួច (Paid)' : 'Paid Commission'}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>
                ៛{Math.round(totals.paidFee).toLocaleString()}
              </div>
            </div>

            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>
                {isKm ? 'មិនទាន់ទូទាត់ (Unpaid)' : 'Pending Commission'}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>
                ៛{Math.round(totals.unpaidFee).toLocaleString()}
              </div>
            </div>

            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>
                {isKm ? 'សេវាដឹកសរុប (ក្រុមហ៊ុន)' : 'Company Delivery Fee'}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                ${totals.deliveryFee.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Filter Card */}
          <div className="card no-print" style={{ marginBottom: 16, padding: '16px 20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ width: 170 }}>
                <DateInput labelEn="Start Date" labelKh="ចាប់ពីថ្ងៃ" value={startDate} onChange={setStartDate} />
              </div>
              <div style={{ width: 170 }}>
                <DateInput labelEn="End Date" labelKh="ដល់ថ្ងៃ" value={endDate} onChange={setEndDate} />
              </div>
              <div style={{ width: 210 }}>
                <label className="form-label" style={{ fontSize: 12.5, fontWeight: 600 }}>
                  {isKm ? 'អ្នកដឹកជញ្ជូន' : 'Driver'}
                </label>
                <select
                  className="form-control"
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  style={{ height: 38 }}
                >
                  <option value="">{isKm ? '-- ទាំងអស់ --' : '-- All Drivers --'}</option>
                  {drivers.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.nameKh ? `${d.nameKh} (${d.name})` : d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ position: 'relative', width: 200 }}>
                <MdSearch size={17} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder={isKm ? 'ស្វែងរកអ្នកដឹក...' : 'Search driver...'}
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
                      `driver-commission-${startDate || 'all'}-to-${endDate || 'now'}`,
                      [
                        isKm ? 'ល.រ' : 'No.',
                        isKm ? 'អ្នកដឹកជញ្ជូន' : 'Driver',
                        isKm ? 'លេខទូរស័ព្ទ' : 'Phone',
                        isKm ? 'ដឹកជោគជ័យ' : 'Delivered',
                        isKm ? 'បរាជ័យ' : 'Failed',
                        isKm ? 'ត្រឡប់' : 'Returned',
                        isKm ? 'កម្រៃសរុប (KHR)' : 'Total Fee (KHR)',
                        isKm ? 'បានទូទាត់ (KHR)' : 'Paid (KHR)',
                        isKm ? 'នៅសល់ (KHR)' : 'Unpaid (KHR)',
                        isKm ? 'សេវាដឹក (USD)' : 'Delivery Fee (USD)',
                      ],
                      filtered.map((r, i) => [
                        i + 1,
                        r.name,
                        r.phone || '',
                        r.deliveredCount,
                        r.failedCount,
                        r.returnedCount,
                        Math.round(r.totalDriverFee),
                        Math.round(r.paidDriverFee),
                        Math.round(r.unpaidDriverFee),
                        r.totalDeliveryFee.toFixed(2),
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

          {/* Commission Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 54, textAlign: 'center' }}>{isKm ? 'ល.រ' : 'No.'}</th>
                    <th>{isKm ? 'អ្នកដឹកជញ្ជូន' : 'Driver'}</th>
                    <th>{isKm ? 'លេខទូរស័ព្ទ' : 'Phone'}</th>
                    <th style={{ textAlign: 'center' }}>{isKm ? 'ដឹកជោគជ័យ' : 'Delivered'}</th>
                    <th style={{ textAlign: 'center' }}>{isKm ? 'បរាជ័យ / ត្រឡប់' : 'Failed / Ret.'}</th>
                    <th style={{ textAlign: 'right' }}>{isKm ? 'កម្រៃសរុប (៛)' : 'Total Fee (៛)'}</th>
                    <th style={{ textAlign: 'right' }}>{isKm ? 'បានទូទាត់ (៛)' : 'Paid (៛)'}</th>
                    <th style={{ textAlign: 'right' }}>{isKm ? 'នៅសល់ (៛)' : 'Unpaid (៛)'}</th>
                    <th style={{ textAlign: 'right' }}>{isKm ? 'សេវាដឹក ($)' : 'Delivery Fee'}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton columns={9} rows={6} />
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: 36, color: '#94a3b8' }}>
                        {isKm ? 'គ្មានទិន្នន័យក្នុងចន្លោះកាលបរិច្ឆេទនេះទេ' : 'No commission records found'}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filtered.map((row, idx) => (
                        <tr key={row.id}>
                          <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>{row.name}</td>
                          <td style={{ color: '#475569' }}>{row.phone || '—'}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>{row.deliveredCount}</td>
                          <td style={{ textAlign: 'center', color: '#64748b' }}>
                            {row.failedCount} / {row.returnedCount}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                            ៛{Math.round(row.totalDriverFee).toLocaleString()}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                            ៛{Math.round(row.paidDriverFee).toLocaleString()}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: row.unpaidDriverFee > 0 ? '#dc2626' : '#64748b' }}>
                            ៛{Math.round(row.unpaidDriverFee).toLocaleString()}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent, #1565D8)' }}>
                            ${row.totalDeliveryFee.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ background: '#f1f5f9', fontWeight: 800 }}>
                        <td colSpan={3} style={{ textAlign: 'right', fontWeight: 800 }}>
                          {isKm ? 'សរុបរួម' : 'Total'}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 800, color: '#16a34a' }}>{totals.delivered}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>
                          {totals.failed} / {totals.returned}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>៛{Math.round(totals.totalFee).toLocaleString()}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>៛{Math.round(totals.paidFee).toLocaleString()}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>៛{Math.round(totals.unpaidFee).toLocaleString()}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent, #1565D8)' }}>${totals.deliveryFee.toFixed(2)}</td>
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
