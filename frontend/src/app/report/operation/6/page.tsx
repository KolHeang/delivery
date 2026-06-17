'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import { MdPrint, MdSearch, MdArrowBack } from 'react-icons/md';

interface Row { id: number; trackingCode: string; shopName: string; receiverPhone: string; location: string; weight: string; size: string; date: string; status: string; note: string; }

const statusBadge = (status: string) => {
  const s = (status || '').toLowerCase();
  const color = s === 'delivered' ? '#10b981' : s === 'failed' ? '#ef4444' : s === 'picked-up' ? '#3b82f6' : s === 'returned' ? '#f59e0b' : '#64748b';
  return <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: color, color: '#fff', textTransform: 'capitalize' }}>{status || '—'}</span>;
};

export default function Rpt6Page() {
  const router = useRouter();
  const { t } = useLanguage();
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
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
      const res = await api.get(`/reports/delivery-daily?${p}`);
      const mapped: Row[] = (res.data || []).map((o: any) => ({
        id: o.id, trackingCode: o.trackingCode, shopName: o.shopName,
        receiverPhone: o.receiverPhone, location: o.location,
        weight: o.weight || '—', size: o.size || '—', date: o.date,
        status: o.status, note: o.note || '',
      }));
      setRows(mapped);
    } catch { setRows([]); }
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => { load(); }, []);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('rpt6Title')} subtitle={t('operationReportTitle')} />
        <div className="page-content">
          <div className="print-only" style={{ marginBottom: 20, paddingBottom: 10, borderBottom: '2px solid #000', textAlign: 'center' }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>EBS Digital Solutions</h1>
            <h2 style={{ fontSize: 14, margin: '4px 0 0' }}>{t('rpt6Title')}</h2>
            <p style={{ fontSize: 11, margin: '4px 0 0', color: '#64748b' }}>{t('startDate')}: {startDate} — {t('endDate')}: {endDate}</p>
          </div>
          <div className="no-print" style={{ marginBottom: 14 }}>
            <button className="btn btn-outline btn-sm" onClick={() => router.push('/report')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MdArrowBack size={16} /> {t('report')}
            </button>
          </div>
          <div className="card no-print" style={{ marginBottom: 18, padding: '14px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>{t('rpt6Title')}</div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('startDate')}</span>
                <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ minWidth: 140 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('endDate')}</span>
                <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ minWidth: 140 }} />
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
                      <th>{t('colNo')}</th><th>{t('colTrackingCode')}</th><th>{t('colShop')}</th>
                      <th>{t('colReceiverPhone')}</th><th>{t('colLocation')}</th>
                      <th>{t('colWeight')}</th><th>{t('colSize')}</th>
                      <th>{t('colDate')}</th><th>{t('colStatus')}</th><th>{t('colNote')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0
                      ? <tr><td colSpan={10} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>{t('noDataFound')}</td></tr>
                      : rows.map((r, i) => (
                        <tr key={r.id || i}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                          <td style={{ fontWeight: 600, fontSize: 12 }}>{r.trackingCode}</td>
                          <td style={{ fontSize: 12 }}>{r.shopName}</td>
                          <td style={{ fontSize: 12 }}>{r.receiverPhone}</td>
                          <td style={{ fontSize: 12 }}>{r.location}</td>
                          <td style={{ fontSize: 12 }}>{r.weight}</td>
                          <td style={{ fontSize: 12 }}>{r.size}</td>
                          <td style={{ fontSize: 12 }}>{r.date}</td>
                          <td>{statusBadge(r.status)}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.note}</td>
                        </tr>
                      ))
                    }
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
