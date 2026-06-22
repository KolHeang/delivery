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

interface Row { id: any; name: string; package: number; fee: number; }

export default function Rpt7Page() {
  const router = useRouter();
  const { t } = useLanguage();
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
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
    try { const res = await api.get(`/reports/pickup-summary?${p}`); setRows(res.data || []); }
    catch { setRows([]); }
    setLoading(false);
  }, [startDate, endDate, driverFilter]);

  useEffect(() => { load(); }, []);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('rpt7Title')} subtitle={t('operationReportTitle')} />
        <div className="page-content">
          <div className="print-only" style={{ marginBottom: 20, paddingBottom: 10, borderBottom: '2px solid #000', textAlign: 'center' }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>EBS Digital Solutions</h1>
            <h2 style={{ fontSize: 14, margin: '4px 0 0' }}>{t('rpt7Title')}</h2>
            <p style={{ fontSize: 11, margin: '4px 0 0', color: '#64748b' }}>{t('startDate')}: {formatDateToDDMMYYYY(startDate)} — {t('endDate')}: {formatDateToDDMMYYYY(endDate)}</p>
          </div>
          <div className="no-print" style={{ marginBottom: 14 }}>
            <button className="btn btn-outline btn-sm" onClick={() => router.push('/report')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MdArrowBack size={16} /> {t('report')}
            </button>
          </div>
          <div className="card no-print" style={{ marginBottom: 18, padding: '14px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>{t('rpt7Title')}</div>
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
                      <th>{t('colNo')}</th>
                      <th>{t('colPickupPerson')}</th>
                      <th style={{ textAlign: 'center' }}>{t('colTotalPackages')}</th>
                      <th style={{ textAlign: 'right' }}>{t('colFee')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0
                      ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>{t('noDataFound')}</td></tr>
                      : rows.map((r, i) => (
                        <tr key={r.id || i}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{r.name}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.package}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>${r.fee.toFixed(2)}</td>
                        </tr>
                      ))
                    }
                    {rows.length > 0 && (
                      <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                        <td colSpan={2} style={{ textAlign: 'right' }}>{t('totalRow')}</td>
                        <td style={{ textAlign: 'center' }}>{rows.reduce((s, r) => s + r.package, 0)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--success)' }}>${rows.reduce((s, r) => s + r.fee, 0).toFixed(2)}</td>
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
