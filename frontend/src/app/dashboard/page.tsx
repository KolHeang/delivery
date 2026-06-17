'use client';
// force rebuild
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import Topbar from '@/components/layout/Topbar';
import StatsCard from '@/components/ui/StatsCard';
import Badge from '@/components/ui/Badge';
import { useLanguage } from '@/lib/LanguageContext';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { MdHome, MdLocalPostOffice, MdSearch } from 'react-icons/md';

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b', assigned: '#6366f1', 'picked-up': '#3b82f6', 'in-transit': '#8b5cf6',
  delivered: '#10b981', failed: '#ef4444', returned: '#6b7280',
};

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topDrivers, setTopDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Date range filters
  const [rangeType, setRangeType] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

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

  const load = useCallback(async (start?: string, end?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (start) params.append('startDate', start);
      if (end) params.append('endDate', end);
      const query = params.toString() ? `?${params.toString()}` : '';

      const [s, c, r, d] = await Promise.all([
        api.get(`/dashboard/stats${query}`),
        api.get(`/dashboard/chart-data${query}`),
        api.get(`/dashboard/recent-orders${query}`),
        api.get(`/dashboard/top-drivers${query}`),
      ]);
      setStats(s.data);
      setChartData(c.data);
      setRecentOrders(r.data);
      setTopDrivers(d.data);
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }

    if (rangeType === 'custom') {
      if (customStart && customEnd) {
        load(customStart, customEnd);
      }
    } else {
      const { start, end } = getDates(rangeType);
      load(start, end);
    }
  }, [rangeType, customStart, customEnd, router, load, getDates]);

  if (loading) return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="loading-wrapper"><div className="spinner" /></div>
      </div>
    </div>
  );

  const pieData = chartData?.statusBreakdown?.map((s: any) => ({
    name: s.status, value: parseInt(s.count),
  })) || [];

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Dashboard" subtitle="Welcome back! Here's what's happening today." />
        <div className="page-content">
          {/* Date Filter */}
          <div className="card" style={{ marginBottom: 20, padding: '12px 16px' }}>
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
            </div>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <StatsCard icon="📦" label={t('totalParcelDashboard')} value={stats?.totalOrders ?? 0} color="#2f55a5" bg="#eef2fa" />
            <StatsCard icon="✅" label={t('totalCompleteParcel')} value={stats?.delivered ?? 0} color="#10b981" bg="#ecfdf5" />
            <StatsCard icon="🚚" label={t('totalProcessParcel')} value={stats?.inTransit ?? 0} color="#8b5cf6" bg="#f5f3ff" />
            <StatsCard icon="❌" label={t('totalCanceledParcel')} value={stats?.failed ?? 0} color="#ef4444" bg="#fef2f2" />
            <StatsCard icon="🔄" label={t('totalReturnParcel')} value={stats?.returned ?? 0} color="#6b7280" bg="#f3f4f6" />
            <StatsCard icon="💵" label={t('totalDeliveryFeeDashboard')} value={`$${(stats?.totalDeliveryFee ?? 0).toFixed(2)}`} color="#10b981" bg="#ecfdf5" />
            <StatsCard icon="💰" label={t('amountCollectedUSD')} value={`$${(stats?.collectedCashUSD ?? 0).toFixed(2)}`} color="#2f55a5" bg="#eef2fa" />
            <StatsCard icon="🇰🇭" label={t('amountCollectedKHR')} value={`${(stats?.collectedCashKHR ?? 0).toLocaleString()} ៛`} color="#f16222" bg="#fef4ef" />
            <StatsCard icon="🚴" label={t('totalDrivers')} value={stats?.totalDrivers ?? 0} color="#8b5cf6" bg="#f5f3ff" />
            <StatsCard icon="👥" label={t('totalStaff')} value={stats?.totalUser ?? 0} color="#2f55a5" bg="#eef2fa" />
          </div>

          {/* Charts */}
          <div className="charts-grid">
            {/* Area Chart */}
            <div className="card">
              <div className="card-header"><span className="card-title">📊 Daily Deliveries (Last 30 Days)</span></div>
              <div className="card-body" style={{ height: 240 }}>
                {chartData?.dailyData?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData.dailyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="delivered" stroke="#10b981" fill="url(#colorDelivered)" name="Delivered" />
                      <Area type="monotone" dataKey="failed" stroke="#ef4444" fill="rgba(239,68,68,0.1)" name="Failed" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">📊</div>
                    <div className="empty-state-title">No chart data yet</div>
                    <div className="empty-state-text">Data will appear as orders are created</div>
                  </div>
                )}
              </div>
            </div>

            {/* Pie Chart */}
            <div className="card">
              <div className="card-header"><span className="card-title">🥧 Order Status Breakdown</span></div>
              <div className="card-body" style={{ height: 240 }}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                        paddingAngle={3} dataKey="value">
                        {pieData.map((entry: any, i: number) => (
                          <Cell key={i} fill={STATUS_COLORS[entry.name] || '#6b7280'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any, n: any) => [v, n]} />
                      <Legend iconSize={10} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">🥧</div>
                    <div className="empty-state-title">No status data yet</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
            {/* Recent Orders */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">🕐 Recent Orders</span>
                <a href="/orders" className="btn btn-outline btn-sm">View All</a>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Tracking</th>
                      <th>Receiver</th>
                      <th>Merchant</th>
                      <th>Zone</th>
                      <th>Fee</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.length === 0 ? (
                      <tr><td colSpan={6} className="text-center text-muted" style={{ padding: 32 }}>No orders yet</td></tr>
                    ) : recentOrders.map((o: any) => (
                      <tr key={o.id}>
                        <td><code style={{ fontSize: 12 }}>{o.trackingCode}</code></td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{o.receiverPhone}</div>
                        </td>
                        <td style={{ fontSize: 12 }}>{o.merchant?.name || '—'}</td>
                        <td style={{ fontSize: 12 }}>{o.zone?.name || '—'}</td>
                        <td style={{ fontWeight: 600 }}>${o.deliveryFee}</td>
                        <td><Badge status={o.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Drivers */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">🏆 Top Drivers</span>
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {topDrivers.length === 0 ? (
                  <div className="empty-state"><div className="empty-state-text">No driver data</div></div>
                ) : topDrivers.map((d: any, i: number) => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : 'var(--accent-light)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: i < 3 ? '#fff' : 'var(--accent)',
                      fontWeight: 700, fontSize: 13, flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.zone?.name || 'No zone'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{d.totalDeliveries}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>deliveries</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
