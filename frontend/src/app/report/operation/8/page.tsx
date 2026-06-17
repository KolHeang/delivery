'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import { MdPrint, MdSearch, MdArrowBack } from 'react-icons/md';

interface Row { id: number; trackingCode: string; shopName: string; stockIn: number; stockOut: number; remain: number; status: string; }

const statusBadge = (status: string) => {
  const s = (status || '').toLowerCase();
  const color = s === 'delivered' ? '#10b981' : s === 'failed' ? '#ef4444' : s === 'picked-up' ? '#3b82f6' : s === 'returned' ? '#f59e0b' : s === 'in-transit' ? '#8b5cf6' : '#64748b';
  return <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: color, color: '#fff', textTransform: 'capitalize' }}>{status || '—'}</span>;
};

export default function Rpt8Page() {
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
        stockIn: 1, stockOut: (o.status === 'delivered') ? 1 : 0,
        remain: (o.status !== 'delivered') ? 1 : 0, status: o.status,
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
        <Topbar title={t('rpt8Title')} subtitle={t('operationReportTitle')} />
        <div className="page-content">
          <div className="print-only" style={{ marginBottom: 20, paddingBottom: 10, borderBottom: '2px solid #000', textAlign: 'center' }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>EBS Digital Solutions</h1>
            <h2 style={{ fontSize: 14, margin: '4px 0 0' }}>{t('rpt8Title')}</h2>
            <p style={{ fontSize: 11, margin: '4px 0 0', color: '#64748b' }}>{t('startDate')}: {startDate} — {t('endDate')}: {endDate}</p>
          </div>
          <div className="no-print" style={{ marginBottom: 14 }}>
            <button className="btn btn-outline btn-sm" onClick={() => router.push('/report')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MdArrowBack size={16} /> {t('report')}
            </button>
          </div>
          <div className="card no-print" style={{ marginBottom: 18, padding: '14px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>{t('rpt8Title')}</div>
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

          {/* Summary stats */}
          {rows.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
              {[
                { label: t('colStockIn'), value: rows.reduce((s, r) => s + r.stockIn, 0), color: 'var(--accent)' },
                { label: t('colStockOut'), value: rows.reduce((s, r) => s + r.stockOut, 0), color: 'var(--success)' },
                { label: t('colStockRemain'), value: rows.reduce((s, r) => s + r.remain, 0), color: '#f59e0b' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ padding: '14px 18px', borderRadius: 'var(--radius)', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color }}>📦</div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {loading ? <div className="loading-wrapper"><div className="spinner" /></div> : (
            <div className="card">
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>{t('colNo')}</th><th>{t('colTrackingCode')}</th><th>{t('colShop')}</th>
                      <th style={{ textAlign: 'center' }}>{t('colStockIn')}</th>
                      <th style={{ textAlign: 'center' }}>{t('colStockOut')}</th>
                      <th style={{ textAlign: 'center' }}>{t('colStockRemain')}</th>
                      <th>{t('colStatus')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0
                      ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>{t('noDataFound')}</td></tr>
                      : rows.map((r, i) => (
                        <tr key={r.id || i}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                          <td style={{ fontWeight: 600, fontSize: 12 }}>{r.trackingCode}</td>
                          <td style={{ fontSize: 12 }}>{r.shopName}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--accent)' }}>{r.stockIn}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--success)' }}>{r.stockOut}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: '#f59e0b' }}>{r.remain}</td>
                          <td>{statusBadge(r.status)}</td>
                        </tr>
                      ))
                    }
                    {rows.length > 0 && (
                      <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                        <td colSpan={3} style={{ textAlign: 'right' }}>{t('totalRow')}</td>
                        <td style={{ textAlign: 'center', color: 'var(--accent)' }}>{rows.reduce((s, r) => s + r.stockIn, 0)}</td>
                        <td style={{ textAlign: 'center', color: 'var(--success)' }}>{rows.reduce((s, r) => s + r.stockOut, 0)}</td>
                        <td style={{ textAlign: 'center', color: '#f59e0b' }}>{rows.reduce((s, r) => s + r.remain, 0)}</td>
                        <td></td>
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
