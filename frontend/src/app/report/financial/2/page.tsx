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

interface Row { id: any; name: string; date: string; packages: number; totalUSD: number; totalKHR: number; }

export default function Frpt2Page() {
  const router = useRouter();
  const { t } = useLanguage();
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!isAuthenticated()) router.push('/'); }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (startDate) p.append('startDate', startDate);
    if (endDate) p.append('endDate', endDate);
    try {
      const res = await api.get(`/reports/delivery-summary?${p}`);
      setRows((res.data || []).map((d: any) => ({
        id: d.id, name: d.name, date: endDate,
        packages: (d.delivered || 0) + (d.failed || 0) + (d.returned || 0),
        totalUSD: d.fee || 0, totalKHR: d.codKHR || 0,
      })));
    } catch { setRows([]); }
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => { load(); }, []);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('frpt2Title')} subtitle={t('financialReportTitle')} />
        <div className="page-content">
          <ReportHeader title={t('frpt2Title')} startDate={startDate} endDate={endDate} />
          <div className="no-print" style={{ marginBottom: 14 }}>
            <button className="btn btn-outline btn-sm" onClick={() => router.push('/report')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MdArrowBack size={16} /> {t('report')}
            </button>
          </div>
          <div className="card no-print" style={{ marginBottom: 18, padding: '14px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>{t('frpt2Title')}</div>
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
                      <th>{t('colDriver')}</th>
                      <th>{t('colDate')}</th>
                      <th style={{ textAlign: 'center' }}>{t('colTotalPackages')}</th>
                      <th style={{ textAlign: 'right' }}>{t('colAmountUSD')}</th>
                      <th style={{ textAlign: 'right' }}>{t('colAmountKHR')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0
                      ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>{t('noDataFound')}</td></tr>
                      : rows.map((r, i) => (
                        <tr key={r.id || i}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{r.name}</td>
                          <td style={{ fontSize: 12 }}>{formatDateToDDMMYYYY(r.date)}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{r.packages}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>${r.totalUSD.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>៛{r.totalKHR.toLocaleString()}</td>
                        </tr>
                      ))
                    }
                    {rows.length > 0 && (
                      <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                        <td colSpan={3} style={{ textAlign: 'right' }}>{t('totalRow')}</td>
                        <td style={{ textAlign: 'center' }}>{rows.reduce((s, r) => s + r.packages, 0)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--success)' }}>${rows.reduce((s, r) => s + r.totalUSD, 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>៛{rows.reduce((s, r) => s + r.totalKHR, 0).toLocaleString()}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Print signatures */}
              <div className="print-only" style={{ marginTop: 48, display: 'flex', justifyContent: 'space-between', padding: '0 40px' }}>
                {['ចុះហត្ថលេខាបង្ហាញ', 'ត្រួតពិនិត្យ', 'គណនេយ្យករ'].map(lbl => (
                  <div key={lbl} style={{ textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid #000', width: 140, margin: '0 auto', paddingTop: 6 }}>{lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
