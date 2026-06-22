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
import DateInput, { getLocalDateString } from '@/components/ui/DateInput';

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b', 'in-warehouse': '#0f766e', assigned: '#6366f1',
  'picked-up': '#3b82f6', 'in-transit': '#8b5cf6',
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Date range filters
  const [rangeType, setRangeType] = useState('all');
  const [customStart, setCustomStart] = useState(() => getLocalDateString());
  const [customEnd, setCustomEnd] = useState(() => getLocalDateString());

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
        <Topbar title={t('dashboard')} subtitle={t('dashboardSubtitle')} />
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
                  <DateInput
                    labelEn="Start Date"
                    labelKh="ចាប់ពីថ្ងៃ"
                    value={customStart}
                    onChange={setCustomStart}
                    style={{ background: '#f8f9fa', borderRadius: 4 }}
                  />
                  <DateInput
                    labelEn="End Date"
                    labelKh="ដល់"
                    value={customEnd}
                    onChange={setCustomEnd}
                    style={{ background: '#f8f9fa', borderRadius: 4 }}
                  />
                </>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <StatsCard icon="/3d/3d_box.png" label={t('totalParcelDashboard')} value={stats?.totalOrders ?? 0} color="#2f55a5" bg="#eef2fa" />
            <StatsCard icon="/3d/3d_check.png" label={t('totalCompleteParcel')} value={stats?.delivered ?? 0} color="#10b981" bg="#ecfdf5" />
            <StatsCard icon="/3d/3d_truck.png" label={t('totalProcessParcel')} value={stats?.inTransit ?? 0} color="#8b5cf6" bg="#f5f3ff" />
            <StatsCard icon="/3d/3d_cross.png" label={t('totalCanceledParcel')} value={stats?.failed ?? 0} color="#ef4444" bg="#fef2f2" />
            <StatsCard icon="/3d/3d_refresh.png" label={t('totalReturnParcel')} value={stats?.returned ?? 0} color="#6b7280" bg="#f3f4f6" />
            <StatsCard icon="/3d/3d_cash.png" label={t('totalDeliveryFeeDashboard')} value={`$${(stats?.totalDeliveryFee ?? 0).toFixed(2)}`} color="#10b981" bg="#ecfdf5" />
            <StatsCard icon="/3d/3d_money_bag.png" label={t('amountCollectedUSD')} value={`$${(stats?.collectedCashUSD ?? 0).toFixed(2)}`} color="#2f55a5" bg="#eef2fa" />
            <StatsCard icon="/3d/3d_khr_coin.png" label={t('amountCollectedKHR')} value={`${(stats?.collectedCashKHR ?? 0).toLocaleString()}៛`} color="#f16222" bg="#fef4ef" />
            <StatsCard icon="/3d/3d_scooter.png" label={t('totalDrivers')} value={stats?.totalDrivers ?? 0} color="#8b5cf6" bg="#f5f3ff" />
            <StatsCard icon="/3d/3d_shop.png" label={t('totalMerchants')} value={stats?.totalMerchants ?? 0} color="#2f55a5" bg="#eef2fa" />
          </div>

          {/* Delivery Flow Status Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20, alignItems: 'stretch' }}>
            {/* Pick-up Summary */}
            <a href="/summary/pickup" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(217,119,6,0.15)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}>
                <div style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 28 }}>🏪</span>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{t('pickupSummary')}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.7)', fontSize: 18 }}>→</div>
                </div>
                <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, flex: 1 }}>
                  <div style={{ textAlign: 'center', padding: '10px 2px', borderRadius: 10, background: '#fef3c7', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#d97706' }}>{stats?.pending ?? 0}</div>
                    <div style={{ fontSize: 10, color: '#92400e', fontWeight: 600 }}>{t('pending')}</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px 2px', borderRadius: 10, background: '#dbeafe', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#1e40af' }}>{stats?.pickedUp ?? 0}</div>
                    <div style={{ fontSize: 10, color: '#1e3a8a', fontWeight: 600 }}>{t('pickedUp')}</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px 2px', borderRadius: 10, background: '#d1fae5', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>{stats?.broughtToWarehouse ?? 0}</div>
                    <div style={{ fontSize: 10, color: '#064e3b', fontWeight: 600 }}>{t('broughtToWarehouse')}</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px 2px', borderRadius: 10, background: '#ccfbf1', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#0f766e' }}>{stats?.inWarehouse ?? 0}</div>
                    <div style={{ fontSize: 10, color: '#134e4a', fontWeight: 600 }}>{t('inWarehouse')}</div>
                  </div>
                </div>
              </div>
            </a>

            {/* Delivery Summary */}
            <a href="/summary/delivery" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(99,102,241,0.15)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}>
                <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 28 }}>🚚</span>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{t('deliverySummary')}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.7)', fontSize: 18 }}>→</div>
                </div>
                <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, flex: 1 }}>
                  <div style={{ textAlign: 'center', padding: '8px 2px', borderRadius: 10, background: '#e0e7ff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#4338ca' }}>{stats?.assigned ?? 0}</div>
                    <div style={{ fontSize: 10, color: '#3730a3', fontWeight: 600 }}>{t('assigned')}</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px 2px', borderRadius: 10, background: '#f3e8ff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#6b21a8' }}>{stats?.inTransit ?? 0}</div>
                    <div style={{ fontSize: 10, color: '#581c87', fontWeight: 600 }}>{t('inTransit')}</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px 2px', borderRadius: 10, background: '#ecfdf5', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#065f46' }}>{stats?.delivered ?? 0}</div>
                    <div style={{ fontSize: 10, color: '#064e3b', fontWeight: 600 }}>{t('delivered')}</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px 2px', borderRadius: 10, background: '#fef2f2', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#991b1b' }}>{stats?.failed ?? 0}</div>
                    <div style={{ fontSize: 10, color: '#7f1d1d', fontWeight: 600 }}>{t('failed')}</div>
                  </div>
                </div>
              </div>
            </a>

            {/* Shop Summary */}
            <a href="/summary/shop" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(16,185,129,0.15)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}>
                <div style={{ background: 'linear-gradient(135deg, #059669, #10b981)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 28 }}>🏪</span>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{t('shopSummary')}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.7)', fontSize: 18 }}>→</div>
                </div>
                <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, flex: 1 }}>
                  <div style={{ textAlign: 'center', padding: '8px 2px', borderRadius: 10, background: '#ecfdf5', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#065f46' }}>{stats?.totalOrders ?? 0}</div>
                    <div style={{ fontSize: 10, color: '#064e3b', fontWeight: 600 }}>{t('parcels')}</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px 2px', borderRadius: 10, background: '#ecfdf5', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#065f46' }}>{stats?.delivered ?? 0}</div>
                    <div style={{ fontSize: 10, color: '#064e3b', fontWeight: 600 }}>{t('delivered')}</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px 2px', borderRadius: 10, background: '#fef2f2', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#ef4444' }}>{stats?.failed ?? 0}</div>
                    <div style={{ fontSize: 10, color: '#991b1b', fontWeight: 600 }}>{t('failed')}</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '8px 2px', borderRadius: 10, background: '#fef2f2', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#991b1b' }}>{stats?.returned ?? 0}</div>
                    <div style={{ fontSize: 10, color: '#7f1d1d', fontWeight: 600 }}>{t('returned')}</div>
                  </div>
                </div>
              </div>
            </a>
          </div>

          {/* Charts */}
          <div className="charts-grid">
            {/* Area Chart */}
            <div className="card">
              <div className="card-header"><span className="card-title">📊 {t('dailyDeliveries')}</span></div>
              <div className="card-body" style={{ height: 240 }}>
                {chartData?.dailyData?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
              <div className="card-header"><span className="card-title">🥧 {t('orderStatusBreakdown')}</span></div>
              <div className="card-body" style={{ height: 240 }}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
                <span className="card-title">🕐 {t('recentOrders')}</span>
                <a href="/orders" className="btn btn-outline btn-sm">{t('viewAll')}</a>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>{t('trackingCode')}</th>
                      <th>{t('receiver')}</th>
                      <th>{t('merchant')}</th>
                      <th>{t('address')}</th>
                      <th>{t('fee')}</th>
                      <th>{t('status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.length === 0 ? (
                      <tr><td colSpan={6} className="text-center text-muted" style={{ padding: 32 }}>{t('noDataFound')}</td></tr>
                    ) : recentOrders.map((o: any) => (
                      <tr key={o.id}>
                        <td><code style={{ fontSize: 12 }}>{o.trackingCode}</code></td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{o.receiverPhone}</div>
                        </td>
                        <td style={{ fontSize: 12 }}>{o.merchant?.name || '—'}</td>
                        <td style={{ fontSize: 12 }}>{o.receiverAddress || '—'}</td>
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
                <span className="card-title">🏆 {t('topDriversTitle')}</span>
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
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.zone?.name || t('noZone')}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{d.totalDeliveries}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('deliveriesLabel')}</div>
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
