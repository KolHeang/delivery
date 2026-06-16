'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { MdCheckCircle, MdCancel, MdSearch } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';

const formatCOD = (cod: any, currency: string) => {
  if (currency === 'KHR') return `${parseInt(cod).toLocaleString()} ៛`;
  return `$${parseFloat(cod).toFixed(2)}`;
};

export default function CompletePackagePage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const { t } = useLanguage();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders');
      // only show non-final statuses
      const activeOrders = (res.data || []).filter((o: any) =>
        o.status === 'in-transit' || o.status === 'picked-up' || o.status === 'pending' || o.status === 'assigned'
      );
      setOrders(activeOrders);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    load();
  }, [router]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(q ? orders.filter(o =>
      o.trackingCode?.toLowerCase().includes(q) ||
      o.receiverName?.toLowerCase().includes(q) ||
      o.merchant?.name?.toLowerCase().includes(q) ||
      o.merchant?.nameKh?.toLowerCase().includes(q)
    ) : orders);
  }, [orders, search]);

  const handleUpdateStatus = async (id: number, status: 'delivered' | 'failed') => {
    setUpdatingId(id);
    try {
      await api.patch(`/orders/${id}/status`, { status });
      // update state
      setOrders(prev => prev.filter(o => o.id !== id));
    } catch {
      alert('Failed to update status');
    }
    setUpdatingId(null);
  };

  if (loading) return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="loading-wrapper"><div className="spinner" /></div>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('completePackageTitle')} subtitle={t('completePackageSubtitle')} />
        <div className="page-content">
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px' }}>
              <div className="search-input-wrapper">
                <MdSearch className="search-icon" />
                <input
                  className="form-control search-input"
                  placeholder="Search active packages by tracking, receiver, shop..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="table-wrapper">
            {filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">✅</div>
                <div className="empty-state-title">No packages to complete</div>
                <div className="empty-state-text">All active packages have been processed or resolved</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t('trackingCode')}</th>
                    <th>{t('receiver')}</th>
                    <th>{t('shopMerchant')}</th>
                    <th>{t('zone')}</th>
                    <th>{t('cod')}</th>
                    <th>{t('status')}</th>
                    <th style={{ width: 220, textAlign: 'center' }}>{t('completeActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o: any, idx) => (
                    <tr key={o.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{idx + 1}</td>
                      <td><code>{o.trackingCode}</code></td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{o.receiverName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.receiverPhone}</div>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {o.merchant?.name || '—'}
                        {o.merchant?.nameKh && <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{o.merchant.nameKh}</div>}
                      </td>
                      <td style={{ fontSize: 12 }}>{o.zone?.name || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{formatCOD(o.cod, o.codCurrency || 'USD')}</td>
                      <td><Badge status={o.status} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleUpdateStatus(o.id, 'delivered')}
                            disabled={updatingId === o.id}
                          >
                            <MdCheckCircle size={14} /> {t('delivered')}
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleUpdateStatus(o.id, 'failed')}
                            disabled={updatingId === o.id}
                          >
                            <MdCancel size={14} /> {t('failed')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
