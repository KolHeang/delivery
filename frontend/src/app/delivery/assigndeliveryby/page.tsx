'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';
import { MdAssignmentTurnedIn, MdPerson, MdRefresh } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';

const formatCOD = (cod: any, currency: string) => {
  if (currency === 'KHR') return `${parseInt(cod).toLocaleString()} ៛`;
  return `$${parseFloat(cod).toFixed(2)}`;
};

export default function AssignDeliveryPage() {
  const router = useRouter();
  const [unassigned, setUnassigned] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const { t } = useLanguage();
  const [selected, setSelected] = useState<number[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orders, drvs] = await Promise.all([
        api.get('/orders/unassigned'),
        api.get('/drivers/available'),
      ]);
      setUnassigned(orders.data);
      setDrivers(drvs.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    load();
  }, [router, load]);

  const toggleOrder = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleAssign = async () => {
    if (!selectedDriver || selected.length === 0) return;
    setAssigning(true);
    try {
      await Promise.all(selected.map(id => api.post(`/orders/${id}/assign`, { driverId: selectedDriver })));
      setSelected([]);
      setSelectedDriver(null);
      await load();
      alert(`✅ ${selected.length} order(s) assigned successfully!`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error assigning orders');
    }
    setAssigning(false);
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('assignTitle')} subtitle={t('assignSubtitle')} />
        <div className="page-content">
          <div className="assign-layout">
            {/* Orders panel */}
            <div>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">📦 {t('unassignedParcels')} ({unassigned.length})</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selected.length} selected</span>
                    <button className="btn btn-outline btn-sm" onClick={load}><MdRefresh size={14} /> Refresh</button>
                  </div>
                </div>
                {loading ? (
                  <div className="loading-wrapper"><div className="spinner" /></div>
                ) : unassigned.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">✅</div>
                    <div className="empty-state-title">All orders assigned!</div>
                    <div className="empty-state-text">No pending unassigned orders</div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}>
                            <input type="checkbox"
                              checked={selected.length === unassigned.length && unassigned.length > 0}
                              onChange={e => setSelected(e.target.checked ? unassigned.map(o => o.id) : [])}
                            />
                          </th>
                          <th>{t('trackingCode')}</th>
                          <th>{t('merchant')}</th>
                          <th>{t('receiver')}</th>
                          <th>{t('zone')}</th>
                          <th>{t('cod')}</th>
                          <th>{t('deliveryFee')}</th>
                          <th>{t('date')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unassigned.map((o: any) => (
                          <tr key={o.id} onClick={() => toggleOrder(o.id)}
                            style={{ cursor: 'pointer', background: selected.includes(o.id) ? 'var(--accent-light)' : '' }}>
                            <td><input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggleOrder(o.id)} onClick={e => e.stopPropagation()} /></td>
                            <td><code style={{ fontSize: 11 }}>{o.trackingCode}</code></td>
                            <td style={{ fontSize: 12 }}>{o.merchant?.name || '—'}</td>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{o.receiverName}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.receiverPhone}</div>
                            </td>
                            <td>
                              {o.zone ? (
                                <span className="badge badge-standard">{o.zone.name}</span>
                              ) : '—'}
                            </td>
                            <td style={{ fontWeight: 600 }}>{formatCOD(o.cod, o.codCurrency || 'USD')}</td>
                            <td style={{ color: 'var(--success)', fontWeight: 600 }}>${parseFloat(o.deliveryFee).toFixed(2)}</td>
                            <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {new Date(o.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Driver panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Selected summary */}
              <div className="card">
                <div className="card-header"><span className="card-title">📋 Assignment Summary</span></div>
                <div className="card-body">
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                    <strong style={{ color: 'var(--accent)' }}>{selected.length}</strong> order(s) selected
                  </p>
                  <div className="form-group">
                    <label className="form-label">Assign to Driver <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <select className="form-control" value={selectedDriver ?? ''} onChange={e => setSelectedDriver(+e.target.value || null)}>
                      <option value="">— Select Driver —</option>
                      {drivers.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.name}{d.nameKh ? ` / ${d.nameKh}` : ''} — {d.zone?.name || 'No zone'}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    id="assign-btn"
                    className="btn btn-primary w-full"
                    onClick={handleAssign}
                    disabled={assigning || selected.length === 0 || !selectedDriver}
                    style={{ justifyContent: 'center' }}>
                    <MdAssignmentTurnedIn size={18} />
                    {assigning ? 'Assigning...' : `Assign ${selected.length} Order(s)`}
                  </button>
                </div>
              </div>

              {/* Available Drivers */}
              <div className="card">
                <div className="card-header"><span className="card-title">🧑‍💼 Available Drivers ({drivers.length})</span></div>
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {drivers.length === 0 ? (
                    <div className="empty-state" style={{ padding: '24px 16px' }}>
                      <div className="empty-state-title">No available drivers</div>
                    </div>
                  ) : drivers.map((d: any) => (
                    <div key={d.id}
                      onClick={() => setSelectedDriver(d.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 12px', borderRadius: 'var(--radius)',
                        border: `1.5px solid ${selectedDriver === d.id ? 'var(--accent)' : 'var(--border)'}`,
                        background: selectedDriver === d.id ? 'var(--accent-light)' : 'var(--bg-card)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}>
                      <div className="sidebar-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>
                        {d.name.charAt(0)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                        {d.nameKh && <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{d.nameKh}</div>}
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.zone?.name || 'No zone'} · {d.vehicle?.plate || 'No vehicle'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>⭐ {d.rating}</div>
                        <Badge status={d.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
