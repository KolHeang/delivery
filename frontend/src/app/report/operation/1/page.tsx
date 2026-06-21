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

interface Row {
  id: number; trackingCode: string; driver: string; shopName: string;
  receiverPhone: string; location: string; date: string; status: string;
  currency: string; codAmount: number; deliveryFee: number; paidAmount: number; note: string;
}

const statusBadge = (status: string) => {
  const s = (status || '').toLowerCase();
  const color = s === 'delivered' || s === 'closed' ? '#10b981'
    : s === 'failed' || s === 'cancelled' ? '#ef4444'
    : s === 'picked-up' ? '#3b82f6'
    : s === 'returned' ? '#f59e0b' : '#64748b';
  return <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: color, color: '#fff', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{status || '—'}</span>;
};

export default function Rpt1Page() {
  const router = useRouter();
  const { t } = useLanguage();
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [driverFilter, setDriverFilter] = useState('');
  const [merchantFilter, setMerchantFilter] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!isAuthenticated()) router.push('/'); }, [router]);
  useEffect(() => {
    api.get('/reports/driver-performance').then(r => setDrivers(r.data)).catch(() => {});
    api.get('/reports/shop-summary').then(r => setMerchants(r.data)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (startDate) p.append('startDate', startDate);
    if (endDate) p.append('endDate', endDate);
    if (driverFilter) p.append('driverId', driverFilter);
    if (merchantFilter) p.append('merchantId', merchantFilter);
    try {
      const res = await api.get(`/reports/delivery-daily?${p}`);
      setRows(res.data || []);
    } catch { setRows([]); }
    setLoading(false);
  }, [startDate, endDate, driverFilter, merchantFilter]);

  useEffect(() => { load(); }, []);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('rpt1Title')} subtitle={t('operationReportTitle')} />
        <div className="page-content">
          {/* Print header */}
          <div className="print-only" style={{ marginBottom: 20, paddingBottom: 10, borderBottom: '2px solid #000', textAlign: 'center' }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>EBS Digital Solutions</h1>
            <h2 style={{ fontSize: 14, margin: '4px 0 0' }}>{t('rpt1Title')}</h2>
            <p style={{ fontSize: 11, margin: '4px 0 0', color: '#64748b' }}>{t('startDate')}: {formatDateToDDMMYYYY(startDate)} — {t('endDate')}: {formatDateToDDMMYYYY(endDate)}</p>
          </div>

          {/* Back */}
          <div className="no-print" style={{ marginBottom: 14 }}>
            <button className="btn btn-outline btn-sm" onClick={() => router.push('/report')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MdArrowBack size={16} /> {t('report')}
            </button>
          </div>

          {/* Filters */}
          <div className="card no-print" style={{ marginBottom: 18, padding: '14px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>{t('rpt1Title')}</div>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('colMerchant')}</span>
                <select className="form-control" value={merchantFilter} onChange={e => setMerchantFilter(e.target.value)} style={{ minWidth: 170 }}>
                  <option value="">{t('selectMerchant2')}</option>
                  {merchants.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <button className="btn btn-primary" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MdSearch size={16} /> {t('filterBtn')}
                </button>
                <button className="btn btn-outline" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MdPrint size={16} /> {t('downloadAndPrint')}
                </button>
              </div>
            </div>
          </div>

          {loading ? <div className="loading-wrapper"><div className="spinner" /></div> : (
            <div className="card">
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>{t('colNo')}</th><th>{t('colTrackingCode')}</th><th>{t('colDriver')}</th>
                      <th>{t('colShop')}</th><th>{t('colReceiverPhone')}</th><th>{t('colLocation')}</th>
                      <th>{t('colDate')}</th><th>{t('colStatus')}</th><th>{t('colCurrency')}</th>
                      <th>{t('colCodPod')}</th><th>{t('colServiceFee')}</th><th>{t('colNote')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0
                      ? <tr><td colSpan={12} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>{t('noDataFound')}</td></tr>
                      : rows.map((r, i) => (
                        <tr key={r.id || i}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                          <td style={{ fontWeight: 600, fontSize: 12 }}>{r.trackingCode}</td>
                          <td style={{ fontSize: 12 }}>{r.driver}</td>
                          <td style={{ fontSize: 12 }}>{r.shopName}</td>
                          <td style={{ fontSize: 12 }}>{r.receiverPhone}</td>
                          <td style={{ fontSize: 12 }}>{r.location}</td>
                          <td style={{ fontSize: 12 }}>{formatDateToDDMMYYYY(r.date)}</td>
                          <td>{statusBadge(r.status)}</td>
                          <td style={{ fontSize: 12 }}>{r.currency}</td>
                          <td style={{ fontWeight: 600 }}>${(r.codAmount || 0).toFixed(2)}</td>
                          <td style={{ color: 'var(--success)' }}>${(r.deliveryFee || 0).toFixed(2)}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.note}</td>
                        </tr>
                      ))
                    }
                    {rows.length > 0 && (
                      <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                        <td colSpan={9} style={{ textAlign: 'right' }}>{t('totalRow')}</td>
                        <td>${rows.reduce((s, r) => s + (r.codAmount || 0), 0).toFixed(2)}</td>
                        <td style={{ color: 'var(--success)' }}>${rows.reduce((s, r) => s + (r.deliveryFee || 0), 0).toFixed(2)}</td>
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
