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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Row { label: string; income: number; expense: number; profit: number; }

export default function Frpt3Page() {
  const router = useRouter();
  const { t } = useLanguage();
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, netProfit: 0 });
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
      setRows((data.monthlySummary || []).map((m: any) => ({
        label: m.month, income: m.income, expense: m.expense, profit: m.profit,
      })));
    } catch { setRows([]); }
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => { load(); }, []);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('frpt3Title')} subtitle={t('financialReportTitle')} />
        <div className="page-content">
          <ReportHeader title={t('frpt3Title')} startDate={startDate} endDate={endDate} />
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
              { emoji: summary.netProfit >= 0 ? '📈' : '📉', label: t('netProfitLabel'), value: `$${summary.netProfit.toFixed(2)}`, color: summary.netProfit >= 0 ? '#2f55a5' : '#ef4444', bg: '#eef2fa' },
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
            <>
              {/* Chart */}
              <div className="card" style={{ marginBottom: 18 }}>
                <div className="card-header"><span className="card-title">📊 {t('frpt3Title')}</span></div>
                <div className="card-body" style={{ height: 280 }}>
                  {rows.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <BarChart data={rows} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="income" name={t('incomeLabel')} fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" name={t('expenseLabel')} fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="profit" name={t('netProfitLabel')} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="empty-state"><div className="empty-state-icon">📊</div><div className="empty-state-title">{t('noDataFound')}</div></div>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="card">
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>{t('colNo')}</th><th>{t('period')}</th>
                        <th style={{ textAlign: 'right' }}>{t('incomeLabel')} ($)</th>
                        <th style={{ textAlign: 'right' }}>{t('expenseLabel')} ($)</th>
                        <th style={{ textAlign: 'right' }}>{t('netProfitLabel')} ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0
                        ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>{t('noDataFound')}</td></tr>
                        : rows.map((r, i) => (
                          <tr key={i}>
                            <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                            <td style={{ fontWeight: 600 }}>{r.label}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>${r.income.toFixed(2)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>${r.expense.toFixed(2)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: r.profit >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
                              {r.profit >= 0 ? '+' : ''}${r.profit.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      }
                      {rows.length > 0 && (
                        <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                          <td colSpan={2} style={{ textAlign: 'right' }}>{t('grandTotal')}</td>
                          <td style={{ textAlign: 'right', color: 'var(--success)' }}>${rows.reduce((s, r) => s + r.income, 0).toFixed(2)}</td>
                          <td style={{ textAlign: 'right', color: 'var(--danger)' }}>${rows.reduce((s, r) => s + r.expense, 0).toFixed(2)}</td>
                          <td style={{ textAlign: 'right', color: rows.reduce((s, r) => s + r.profit, 0) >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
                            ${rows.reduce((s, r) => s + r.profit, 0).toFixed(2)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
