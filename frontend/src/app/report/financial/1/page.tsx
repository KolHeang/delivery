'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import { MdPrint, MdSearch, MdArrowBack } from 'react-icons/md';

interface LedgerRow { id: string; date: string; description: string; category: string; type: 'income' | 'expense'; amount: number; }

export default function Frpt1Page() {
  const router = useRouter();
  const { t } = useLanguage();
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, netProfit: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!isAuthenticated()) router.push('/'); }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (startDate) p.append('startDate', startDate);
    if (endDate) p.append('endDate', endDate);
    try {
      const res = await api.get(`/reports/financial?${p}`);
      const data = res.data;
      setSummary({ totalIncome: data.totalIncome || 0, totalExpense: data.totalExpense || 0, netProfit: data.netProfit || 0 });
      setRows((data.transactions || []).map((tx: any) => ({
        id: tx.id, date: tx.date, description: tx.description || '—',
        category: tx.category || '—', type: tx.type, amount: tx.amount || 0,
      })));
    } catch { setRows([]); }
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r => {
    const matchSearch = r.description.toLowerCase().includes(searchQuery.toLowerCase()) || r.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'all' || r.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('frpt1Title')} subtitle={t('financialReportTitle')} />
        <div className="page-content">
          <div className="print-only" style={{ marginBottom: 20, paddingBottom: 10, borderBottom: '2px solid #000', textAlign: 'center' }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>EBS Digital Solutions</h1>
            <h2 style={{ fontSize: 14, margin: '4px 0 0' }}>{t('frpt1Title')}</h2>
            <p style={{ fontSize: 11, margin: '4px 0 0', color: '#64748b' }}>{t('startDate')}: {startDate} — {t('endDate')}: {endDate}</p>
          </div>
          <div className="no-print" style={{ marginBottom: 14 }}>
            <button className="btn btn-outline btn-sm" onClick={() => router.push('/report')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MdArrowBack size={16} /> {t('report')}
            </button>
          </div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
            {[
              { emoji: '💵', label: t('incomeLabel'), value: `$${summary.totalIncome.toFixed(2)}`, color: '#10b981', bg: '#ecfdf5' },
              { emoji: '💸', label: t('expenseLabel'), value: `$${summary.totalExpense.toFixed(2)}`, color: '#ef4444', bg: '#fef2f2' },
              { emoji: summary.netProfit >= 0 ? '📈' : '📉', label: t('netProfitLabel'), value: `$${summary.netProfit.toFixed(2)}`, color: summary.netProfit >= 0 ? '#2f55a5' : '#ef4444', bg: summary.netProfit >= 0 ? '#eef2fa' : '#fef2f2' },
            ].map(({ emoji, label, value, color, bg }) => (
              <div key={label} style={{ padding: '14px 18px', borderRadius: 'var(--radius)', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{emoji}</div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card no-print" style={{ marginBottom: 18, padding: '14px 18px' }}>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('startDate')}</span>
                <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ minWidth: 140 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('endDate')}</span>
                <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ minWidth: 140 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('filterByType')}</span>
                <select className="form-control" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ minWidth: 130 }}>
                  <option value="all">{t('allTypes')}</option>
                  <option value="income">{t('incomeLabel')}</option>
                  <option value="expense">{t('expenseLabel')}</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('search')}</span>
                <input type="text" className="form-control" placeholder={`${t('search')}...`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
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
                      <th style={{ width: 50 }}>{t('colLedgerNo')}</th>
                      <th style={{ width: 120 }}>{t('colLedgerDate')}</th>
                      <th style={{ width: 140 }}>{t('category')}</th>
                      <th>{t('colLedgerDesc')}</th>
                      <th style={{ textAlign: 'right', width: 130 }}>{t('incomeLabel')} ($)</th>
                      <th style={{ textAlign: 'right', width: 130 }}>{t('expenseLabel')} ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0
                      ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>{t('noDataFound')}</td></tr>
                      : filtered.map((r, i) => (
                        <tr key={r.id}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                          <td style={{ fontSize: 12 }}>{new Date(r.date).toLocaleDateString()}</td>
                          <td style={{ fontWeight: 600, fontSize: 13 }}>{r.category}</td>
                          <td style={{ fontSize: 13 }}>{r.description}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: r.type === 'income' ? 'var(--success)' : 'var(--text-muted)' }}>
                            {r.type === 'income' ? `+$${r.amount.toFixed(2)}` : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: r.type === 'expense' ? 'var(--danger)' : 'var(--text-muted)' }}>
                            {r.type === 'expense' ? `-$${r.amount.toFixed(2)}` : '—'}
                          </td>
                        </tr>
                      ))
                    }
                    {filtered.length > 0 && (
                      <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                        <td colSpan={4} style={{ textAlign: 'right' }}>{t('totalRow')}</td>
                        <td style={{ textAlign: 'right', color: 'var(--success)' }}>${filtered.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--danger)' }}>${filtered.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0).toFixed(2)}</td>
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
