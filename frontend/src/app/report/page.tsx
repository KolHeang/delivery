'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import { MdPrint, MdSearch, MdFilterList } from 'react-icons/md';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

export default function ReportsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'deliveries' | 'financial'>('financial');
  const [period, setPeriod] = useState<'daily' | 'monthly'>('monthly');
  const [revenue, setRevenue] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [financial, setFinancial] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Date range filters
  const [rangeType, setRangeType] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Local filters for transaction history
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => { if (!isAuthenticated()) { router.push('/'); return; } }, [router]);

  const getDates = useCallback((type: string) => {
    const today = new Date();
    let start = '';
    let end = '';

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    if (type === 'today') {
      start = formatDate(today);
      end = formatDate(today);
    } else if (type === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      start = formatDate(yesterday);
      end = formatDate(yesterday);
    } else if (type === 'last7') {
      const last7 = new Date();
      last7.setDate(today.getDate() - 6);
      start = formatDate(last7);
      end = formatDate(today);
    } else if (type === 'last30') {
      const last30 = new Date();
      last30.setDate(today.getDate() - 29);
      start = formatDate(last30);
      end = formatDate(today);
    } else if (type === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      start = formatDate(firstDay);
      end = formatDate(today);
    } else if (type === 'custom') {
      start = customStart;
      end = customEnd;
    }
    return { start, end };
  }, [customStart, customEnd]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let query = '';
        if (rangeType === 'custom') {
          if (customStart && customEnd) {
            query = `?startDate=${customStart}&endDate=${customEnd}`;
          } else {
            setLoading(false);
            return;
          }
        } else {
          const { start, end } = getDates(rangeType);
          const params = new URLSearchParams();
          if (start) params.append('startDate', start);
          if (end) params.append('endDate', end);
          query = params.toString() ? `?${params.toString()}` : '';
        }

        if (activeTab === 'deliveries') {
          const [r, d, s] = await Promise.all([
            api.get(`/reports/revenue?period=${period}`),
            api.get('/reports/driver-performance'),
            api.get('/reports/order-summary'),
          ]);
          setRevenue(r.data); setDrivers(d.data); setSummary(s.data);
        } else {
          const res = await api.get(`/reports/financial${query}`);
          setFinancial(res.data);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [period, activeTab, rangeType, customStart, customEnd, getDates]);

  // Filter transactions locally
  const filteredTransactions = financial?.transactions?.filter((t: any) => {
    const matchesSearch = t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' ? true : t.type === typeFilter;
    const matchesCategory = categoryFilter === 'all' ? true : t.category === categoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  }) || [];

  const uniqueCategories = Array.from(new Set(financial?.transactions?.map((t: any) => t.category) || [])) as string[];

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Reports & Analytics" subtitle="Business performance overview" />
        <div className="page-content">
          
          {/* Print-only Header */}
          <div className="print-only" style={{ marginBottom: 24, paddingBottom: 12, borderBottom: '2px solid #000' }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, fontFamily: 'Kantumruy Pro, Inter, sans-serif' }}>EBS Digital Solutions</h1>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: '4px 0 0', color: '#475569', fontFamily: 'Kantumruy Pro, Inter, sans-serif' }}>
              {activeTab === 'financial' ? t('financialReport') : t('revenueReport')}
            </h2>
            <p style={{ fontSize: 12, margin: '6px 0 0', color: '#64748b', fontFamily: 'Kantumruy Pro, Inter, sans-serif' }}>
              {t('dateRange')}: {rangeType === 'all' ? t('allTime') : `${getDates(rangeType).start || customStart} ${t('toDate')} ${getDates(rangeType).end || customEnd}`}
            </p>
          </div>

          {/* Tab Selection */}
          <div className="no-print" style={{ display: 'flex', gap: 12, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
            <button 
              onClick={() => setActiveTab('financial')}
              className={`btn btn-sm ${activeTab === 'financial' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}
            >
              💵 {t('financialReport')}
            </button>
            <button 
              onClick={() => setActiveTab('deliveries')}
              className={`btn btn-sm ${activeTab === 'deliveries' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}
            >
              📊 {t('revenueReport')}
            </button>
          </div>

          {/* Date Filter & Print controls */}
          <div className="card no-print" style={{ marginBottom: 20, padding: '12px 16px' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('dateRange')}</span>
                  <select 
                    className="form-control" 
                    value={rangeType} 
                    onChange={e => setRangeType(e.target.value)}
                    style={{ minWidth: 160 }}
                  >
                    <option value="all">{t('allTime')}</option>
                    <option value="today">{t('todayDate')}</option>
                    <option value="yesterday">{t('yesterdayDate')}</option>
                    <option value="last7">{t('last7Days')}</option>
                    <option value="last30">{t('last30Days')}</option>
                    <option value="thisMonth">{t('thisMonth')}</option>
                    <option value="custom">{t('customRange')}</option>
                  </select>
                </div>

                {rangeType === 'custom' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('fromDate')}</span>
                      <input 
                        type="date" 
                        className="form-control" 
                        value={customStart} 
                        onChange={e => setCustomStart(e.target.value)} 
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('toDate')}</span>
                      <input 
                        type="date" 
                        className="form-control" 
                        value={customEnd} 
                        onChange={e => setCustomEnd(e.target.value)} 
                      />
                    </div>
                  </>
                )}

                {activeTab === 'deliveries' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t('type')}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {(['daily', 'monthly'] as const).map(p => (
                        <button key={p} onClick={() => setPeriod(p)}
                          className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-outline'}`}
                          style={{ textTransform: 'capitalize', padding: '8px 12px' }}>{p}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Print button */}
              <button 
                className="btn btn-primary"
                onClick={() => window.print()}
                style={{ height: 'fit-content', alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <MdPrint size={16} /> {t('printReport')}
              </button>
            </div>
          </div>

          {loading ? <div className="loading-wrapper"><div className="spinner" /></div> : 
            activeTab === 'deliveries' ? (
              <>
                {/* Revenue Chart */}
                <div className="card" style={{ marginBottom: 20 }}>
                  <div className="card-header"><span className="card-title">💰 {t('revenueReport')} ({period})</span></div>
                  <div className="card-body" style={{ height: 280 }}>
                    {revenue.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenue} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="revenue" name="Revenue ($)" fill="#10b981" radius={[4,4,0,0]} />
                          <Bar dataKey="totalOrders" name="Total Orders" fill="#3b82f6" radius={[4,4,0,0]} />
                          <Bar dataKey="delivered" name="Delivered" fill="#8b5cf6" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div className="empty-state"><div className="empty-state-icon">📊</div><div className="empty-state-title">No revenue data yet</div></div>}
                  </div>
                </div>

                <div className="charts-grid">
                  {/* Zone Revenue */}
                  <div className="card">
                    <div className="card-header"><span className="card-title">🗺️ Revenue by Zone</span></div>
                    <div style={{ overflowX: 'auto' }}>
                      <table>
                        <thead><tr><th>Zone</th><th>Orders</th><th>Delivered</th><th>Revenue</th></tr></thead>
                        <tbody>
                          {summary?.zoneRevenue?.length === 0 ? (
                            <tr><td colSpan={4} className="text-center text-muted" style={{ padding: 24 }}>No data</td></tr>
                          ) : summary?.zoneRevenue?.map((z: any, i: number) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 600 }}>{z.zone}</td>
                              <td>{z.count}</td>
                              <td style={{ color: 'var(--success)' }}>{z.delivered}</td>
                              <td style={{ fontWeight: 700, color: 'var(--success)' }}>${parseFloat(z.revenue || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Status Breakdown */}
                  <div className="card">
                    <div className="card-header"><span className="card-title">📊 Status Breakdown</span></div>
                    <div style={{ overflowX: 'auto' }}>
                      <table>
                        <thead><tr><th>Status</th><th>Count</th><th>Revenue</th></tr></thead>
                        <tbody>
                          {summary?.statusCounts?.map((s: any, i: number) => (
                            <tr key={i}>
                              <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{s.status}</td>
                              <td>{s.count}</td>
                              <td style={{ color: 'var(--success)' }}>${parseFloat(s.revenue || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Driver Performance */}
                <div className="card" style={{ marginTop: 20 }}>
                  <div className="card-header"><span className="card-title">🧑‍💼 Driver Performance</span></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead><tr><th>Rank</th><th>Driver</th><th>Zone</th><th>Status</th><th>Rating</th><th>Total Deliveries</th></tr></thead>
                      <tbody>
                        {drivers.length === 0 ? (
                          <tr><td colSpan={6} className="text-center text-muted" style={{ padding: 24 }}>No driver data</td></tr>
                        ) : drivers.map((d: any, i) => (
                          <tr key={d.id}>
                            <td>
                              <div style={{
                                width: 28, height: 28, borderRadius: '50%',
                                background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : 'var(--bg-primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: 12, color: i < 3 ? '#fff' : 'var(--text-secondary)',
                              }}>{i + 1}</div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div className="sidebar-avatar" style={{ width: 30, height: 30, fontSize: 12 }}>{d.name.charAt(0)}</div>
                                <div>
                                  <div style={{ fontWeight: 600 }}>{d.name}</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.phone}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ fontSize: 12 }}>{d.zone?.name || '—'}</td>
                            <td style={{ textTransform: 'capitalize', fontSize: 12 }}>{d.status}</td>
                            <td>
                              <span className="rating-stars">{'★'.repeat(Math.round(d.rating))}</span>
                              <span style={{ fontSize: 12, marginLeft: 4 }}>{d.rating}</span>
                            </td>
                            <td style={{ fontWeight: 700, textAlign: 'center', fontSize: 16 }}>{d.totalDeliveries}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Financial Stats Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
                  <div className="stats-card" style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderRadius: 'var(--radius)', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginRight: 16 }}>💵</div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{t('incomeLabel')} ({t('total')} / ចំណូលសរុប)</div>
                      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: 'var(--success)' }}>${parseFloat(financial?.totalIncome || 0).toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="stats-card" style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderRadius: 'var(--radius)', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginRight: 16 }}>💸</div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{t('expenseLabel')} ({t('total')} / ចំណាយសរុប)</div>
                      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: 'var(--danger)' }}>${parseFloat(financial?.totalExpense || 0).toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="stats-card" style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderRadius: 'var(--radius)', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: (financial?.netProfit >= 0) ? '#eef2fa' : '#fef2f2', color: (financial?.netProfit >= 0) ? '#2f55a5' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginRight: 16 }}>{(financial?.netProfit >= 0) ? '📈' : '📉'}</div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{t('netProfitLabel')} (ចំណេញសុទ្ធ)</div>
                      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: (financial?.netProfit >= 0) ? 'var(--accent)' : 'var(--danger)' }}>${parseFloat(financial?.netProfit || 0).toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                {/* Financial Monthly Chart */}
                <div className="card" style={{ marginBottom: 20 }}>
                  <div className="card-header"><span className="card-title">💵 {t('financialReport')}</span></div>
                  <div className="card-body" style={{ height: 280 }}>
                    {financial?.monthlySummary?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={financial.monthlySummary} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="income" name={t('incomeLabel')} fill="#10b981" radius={[4,4,0,0]} />
                          <Bar dataKey="expense" name={t('expenseLabel')} fill="#ef4444" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div className="empty-state"><div className="empty-state-icon">💵</div><div className="empty-state-title">No financial data yet</div></div>}
                  </div>
                </div>

                {/* Breakdown tables */}
                <div className="charts-grid" style={{ marginBottom: 20 }}>
                  {/* Income by category */}
                  <div className="card">
                    <div className="card-header"><span className="card-title">📈 {t('incomeLabel')} (តាមប្រភេទ)</span></div>
                    <div style={{ overflowX: 'auto' }}>
                      <table>
                        <thead><tr><th>{t('category')}</th><th>{t('totalLabel')}</th></tr></thead>
                        <tbody>
                          {financial?.incomeByCategory?.length === 0 ? (
                            <tr><td colSpan={2} className="text-center text-muted" style={{ padding: 24 }}>No data</td></tr>
                          ) : financial?.incomeByCategory?.map((item: any, i: number) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 600 }}>{item.category}</td>
                              <td style={{ fontWeight: 700, color: 'var(--success)' }}>${parseFloat(item.total || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Expense by category */}
                  <div className="card">
                    <div className="card-header"><span className="card-title">📉 {t('expenseLabel')} (តាមប្រភេទ)</span></div>
                    <div style={{ overflowX: 'auto' }}>
                      <table>
                        <thead><tr><th>{t('category')}</th><th>{t('totalLabel')}</th></tr></thead>
                        <tbody>
                          {financial?.expenseByCategory?.length === 0 ? (
                            <tr><td colSpan={2} className="text-center text-muted" style={{ padding: 24 }}>No data</td></tr>
                          ) : financial?.expenseByCategory?.map((item: any, i: number) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 600 }}>{item.category}</td>
                              <td style={{ fontWeight: 700, color: 'var(--danger)' }}>${parseFloat(item.total || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Transaction History Log */}
                <div className="card">
                  <div className="card-header no-print">
                    <span className="card-title">📜 {t('transactionHistory')} ({t('all')} / ប្រវត្តិប្រតិបត្តិការ)</span>
                    
                    {/* Filters Bar */}
                    <div className="filter-bar" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', width: '100%', marginTop: 12 }}>
                      <div className="search-input-wrapper" style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                        <span className="search-icon" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}><MdSearch size={18} /></span>
                        <input 
                          type="text" 
                          className="form-control search-input" 
                          placeholder={`${t('search')}...`} 
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          style={{ paddingLeft: 34 }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {/* Type Filter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('filterByType')}:</span>
                          <select 
                            className="form-control form-control-sm" 
                            value={typeFilter} 
                            onChange={e => setTypeFilter(e.target.value)}
                            style={{ width: 130, padding: '6px 10px' }}
                          >
                            <option value="all">{t('allTypes')}</option>
                            <option value="income">{t('incomeLabel')}</option>
                            <option value="expense">{t('expenseLabel')}</option>
                          </select>
                        </div>

                        {/* Category Filter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('filterByCategory')}:</span>
                          <select 
                            className="form-control form-control-sm" 
                            value={categoryFilter} 
                            onChange={e => setCategoryFilter(e.target.value)}
                            style={{ width: 150, padding: '6px 10px' }}
                          >
                            <option value="all">{t('all')}</option>
                            {uniqueCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: 60 }}>#</th>
                          <th style={{ width: 120 }}>{t('date')}</th>
                          <th style={{ width: 120 }}>{t('type')}</th>
                          <th style={{ width: 180 }}>{t('category')}</th>
                          <th>{t('description')}</th>
                          <th style={{ textAlign: 'right', width: 150 }}>{t('amount')} ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.length === 0 ? (
                          <tr><td colSpan={6} className="text-center text-muted" style={{ padding: 32 }}>{t('noDataFound')}</td></tr>
                        ) : filteredTransactions.map((tx: any, idx: number) => {
                          const isInc = tx.type === 'income';
                          return (
                            <tr key={tx.id}>
                              <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{idx + 1}</td>
                              <td style={{ fontSize: 12 }}>{new Date(tx.date).toLocaleDateString()}</td>
                              <td>
                                <span className={`badge ${isInc ? 'badge-delivered' : 'badge-failed'}`} style={{ textTransform: 'capitalize' }}>
                                  {isInc ? t('incomeLabel') : t('expenseLabel')}
                                </span>
                              </td>
                              <td style={{ fontWeight: 600, fontSize: 13 }}>{tx.category}</td>
                              <td style={{ fontSize: 13 }}>{tx.description}</td>
                              <td style={{ 
                                fontWeight: 700, 
                                textAlign: 'right', 
                                color: isInc ? 'var(--success)' : 'var(--danger)' 
                              }}>
                                {isInc ? `+$${tx.amount.toFixed(2)}` : `-$${tx.amount.toFixed(2)}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )
          }
        </div>
      </div>
    </div>
  );
}
