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
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
              <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div className="card-header" style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                      📦
                    </div>
                    <div>
                      <span className="card-title" style={{ fontSize: 16 }}>{t('unassignedParcels')}</span>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{unassigned.length} orders waiting for assignment</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {selected.length > 0 && (
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-light)', padding: '4px 12px', borderRadius: 999 }}>
                        {selected.length} Selected
                      </span>
                    )}
                    <button className="btn btn-outline" onClick={load}><MdRefresh size={16} /> Refresh</button>
                  </div>
                </div>
                
                {loading ? (
                  <div className="loading-wrapper"><div className="spinner" /></div>
                ) : unassigned.length === 0 ? (
                  <div className="empty-state" style={{ margin: 'auto' }}>
                    <div className="empty-state-icon">✅</div>
                    <div className="empty-state-title">All orders assigned!</div>
                    <div className="empty-state-text">No pending unassigned orders</div>
                  </div>
                ) : (
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    <table>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-primary)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <tr>
                          <th style={{ width: 40, paddingLeft: 24 }}>
                            <input type="checkbox"
                              style={{ width: 16, height: 16, cursor: 'pointer' }}
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
                        </tr>
                      </thead>
                      <tbody>
                        {unassigned.map((o: any) => (
                          <tr key={o.id} onClick={() => toggleOrder(o.id)}
                            style={{ 
                              cursor: 'pointer', 
                              background: selected.includes(o.id) ? 'var(--accent-light)' : '',
                              borderLeft: selected.includes(o.id) ? '4px solid var(--accent)' : '4px solid transparent',
                              transition: 'all 0.2s'
                            }}>
                            <td style={{ paddingLeft: 20 }}>
                              <input type="checkbox" 
                                style={{ width: 16, height: 16, cursor: 'pointer' }}
                                checked={selected.includes(o.id)} 
                                onChange={() => toggleOrder(o.id)} 
                                onClick={e => e.stopPropagation()} 
                              />
                            </td>
                            <td><code style={{ fontSize: 12, background: 'rgba(0,0,0,0.05)', padding: '4px 8px', borderRadius: 6, fontWeight: 600 }}>{o.trackingCode}</code></td>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{o.merchant?.name || '—'}</div>
                              {o.merchant?.phone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.merchant.phone}</div>}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{o.receiverPhone}</div>
                            </td>
                            <td>
                              {o.zone ? (
                                <span className="badge badge-standard">{o.zone.name}</span>
                              ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                            </td>
                            <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCOD(o.cod, o.codCurrency || 'USD')}</td>
                            <td style={{ color: 'var(--success)', fontWeight: 600 }}>${parseFloat(o.deliveryFee).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Driver panel */}
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
              <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div className="card-header" style={{ padding: '20px 24px', background: 'var(--bg-primary)' }}>
                  <span className="card-title" style={{ fontSize: 16 }}>🧑‍💼 Select Driver</span>
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                  {drivers.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px 16px' }}>
                      <div className="empty-state-title">No available drivers</div>
                      <div className="empty-state-text">All drivers might be busy or offline.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {drivers.map((d: any) => (
                        <div key={d.id}
                          onClick={() => setSelectedDriver(d.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 14,
                            padding: '14px 16px', borderRadius: '12px',
                            border: `2px solid ${selectedDriver === d.id ? 'var(--accent)' : 'var(--border)'}`,
                            background: selectedDriver === d.id ? 'var(--accent-light)' : 'var(--bg-card)',
                            boxShadow: selectedDriver === d.id ? '0 4px 12px rgba(59,130,246,0.15)' : 'none',
                            cursor: 'pointer', transition: 'all 0.2s ease',
                            transform: selectedDriver === d.id ? 'translateY(-2px)' : 'none'
                          }}>
                          <div style={{ 
                            width: 44, height: 44, borderRadius: '50%', 
                            background: selectedDriver === d.id ? 'var(--accent)' : 'var(--bg-primary)',
                            color: selectedDriver === d.id ? '#fff' : 'var(--text-secondary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: 16, transition: 'all 0.2s'
                          }}>
                            {d.name.charAt(0)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: selectedDriver === d.id ? 'var(--accent-dark)' : 'var(--text-primary)' }}>
                              {d.name} {d.nameKh && <span style={{ fontWeight: 500, fontSize: 13 }}>({d.nameKh})</span>}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                📍 {d.zone?.name || 'No zone'}
                              </span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <Badge status={d.status} />
                            {selectedDriver === d.id && (
                              <div style={{ marginTop: 6, color: 'var(--accent)', fontSize: 18 }}>
                                <MdAssignmentTurnedIn />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Assignment Action Bottom Bar */}
                <div style={{ 
                  padding: '20px 24px', 
                  borderTop: '1px solid var(--border)', 
                  background: 'var(--bg-card)',
                  boxShadow: '0 -4px 12px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Selected Orders</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: selected.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {selected.length}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Driver Assigned</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: selectedDriver ? 'var(--accent)' : 'var(--danger)' }}>
                        {selectedDriver ? drivers.find(d => d.id === selectedDriver)?.name : 'None selected'}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    className="btn btn-primary w-full"
                    onClick={handleAssign}
                    disabled={assigning || selected.length === 0 || !selectedDriver}
                    style={{ 
                      justifyContent: 'center', 
                      padding: '14px', 
                      fontSize: 15,
                      borderRadius: 12,
                      boxShadow: (selected.length > 0 && selectedDriver) ? '0 8px 16px rgba(59,130,246,0.25)' : 'none'
                    }}>
                    <MdAssignmentTurnedIn size={20} />
                    {assigning ? 'Assigning Orders...' : 'Confirm Assignment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
