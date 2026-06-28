'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import DateInput, { formatDateToDDMMYYYY } from '@/components/ui/DateInput';
import { MdPrint, MdSearch, MdArrowBack } from 'react-icons/md';
import ReportHeader from '@/components/ui/ReportHeader';

interface Row { id: any; name: string; delivered: number; failed: number; returned: number; codUSD: number; codKHR: number; fee: number; }

export default function Rpt3Page() {
  const router = useRouter();
  const { t } = useLanguage();
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [driverFilter, setDriverFilter] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!isAuthenticated()) router.push('/'); }, [router]);
  useEffect(() => { api.get('/reports/driver-performance').then(r => setDrivers(r.data)).catch(() => {}); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (startDate) p.append('startDate', startDate);
    if (endDate) p.append('endDate', endDate);
    if (driverFilter) p.append('driverId', driverFilter);
    try { const res = await api.get(`/reports/delivery-summary?${p}`); setRows(res.data || []); }
    catch { setRows([]); }
    setLoading(false);
  }, [startDate, endDate, driverFilter]);

  useEffect(() => { load(); }, []);
  const total = (field: keyof Row) => rows.reduce((s, r) => s + (Number(r[field]) || 0), 0);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('rpt3Title')} subtitle={t('operationReportTitle')} />
        <div className="page-content">
          <ReportHeader title={t('rpt3Title')} startDate={startDate} endDate={endDate} />

          <div className="no-print" style={{ marginBottom: 14 }}>
            <button className="btn btn-outline btn-sm" onClick={() => router.push('/report')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MdArrowBack size={16} /> {t('report')}
            </button>
          </div>

          <div className="card no-print" style={{ marginBottom: 18, padding: '14px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>{t('rpt3Title')}</div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <DateInput
                labelEn="Start Date"
                labelKh="ចាប់ពីថ្ងៃ"
                value={startDate}
                onChange={setStartDate}
                style={{ minWidth: 210 }}
              />
              <DateInput
                labelEn="End Date"
                labelKh="ដល់"
                value={endDate}
                onChange={setEndDate}
                style={{ minWidth: 210 }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('colDriver')}</span>
                <select className="form-control" value={driverFilter} onChange={e => setDriverFilter(e.target.value)} style={{ minWidth: 170 }}>
                  <option value="">{t('selectDriver3')}</option>
                  {drivers.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <button className="btn btn-primary" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MdSearch size={16} /> {t('filterBtn')}</button>
                <button className="btn btn-outline" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MdPrint size={16} /> {t('downloadAndPrint')}</button>
              </div>
            </div>
          </div>

          {loading ? <div className="loading-wrapper"><div className="spinner" /></div> : (
            <div className="card">
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>{t('colNo')}</th><th>{t('colDriver')}</th><th>{t('colDate')}</th>
                      <th style={{ textAlign: 'center' }}>{t('colDelivered')}</th>
                      <th style={{ textAlign: 'center' }}>{t('colFailed')}</th>
                      <th style={{ textAlign: 'center' }}>{t('colReturned')}</th>
                      <th style={{ textAlign: 'right' }}>COD USD</th>
                      <th style={{ textAlign: 'right' }}>COD KHR</th>
                      <th style={{ textAlign: 'right' }}>{t('colFee')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0
                      ? <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>{t('noDataFound')}</td></tr>
                      : rows.map((r, i) => (
                        <tr key={r.id || i}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{r.name}</td>
                          <td style={{ fontSize: 12 }}>{endDate}</td>
                          <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 700 }}>{r.delivered}</td>
                          <td style={{ textAlign: 'center', color: 'var(--danger)', fontWeight: 700 }}>{r.failed}</td>
                          <td style={{ textAlign: 'center', color: '#f59e0b', fontWeight: 700 }}>{r.returned}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>${r.codUSD.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>៛{r.codKHR.toLocaleString()}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>${r.fee.toFixed(2)}</td>
                        </tr>
                      ))
                    }
                    {rows.length > 0 && (
                      <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                        <td colSpan={3} style={{ textAlign: 'right' }}>{t('totalRow')}</td>
                        <td style={{ textAlign: 'center', color: 'var(--success)' }}>{total('delivered')}</td>
                        <td style={{ textAlign: 'center', color: 'var(--danger)' }}>{total('failed')}</td>
                        <td style={{ textAlign: 'center', color: '#f59e0b' }}>{total('returned')}</td>
                        <td style={{ textAlign: 'right' }}>${total('codUSD').toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>៛{total('codKHR').toLocaleString()}</td>
                        <td style={{ textAlign: 'right', color: 'var(--success)' }}>${total('fee').toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
