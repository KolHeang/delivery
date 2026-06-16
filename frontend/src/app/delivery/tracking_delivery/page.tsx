'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { MdSearch, MdLocationOn, MdAccessTime, MdLocalShipping } from 'react-icons/md';

export default function TrackingPage() {
  const [code, setCode] = useState('');
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setSearching(true);
    setError('');
    setOrder(null);
    try {
      const res = await api.get(`/orders/tracking/${code}`);
      if (res.data) {
        setOrder(res.data);
      } else {
        setError('No tracking record found for this code');
      }
    } catch {
      setError('No tracking record found for this code');
    }
    setSearching(false);
  };

  const getStepClass = (stepStatus: string) => {
    if (!order) return 'disabled';
    const status = order.status;
    const statuses = ['pending', 'assigned', 'picked-up', 'in-transit', 'delivered', 'failed', 'returned'];
    const activeIdx = statuses.indexOf(status);
    const stepIdx = statuses.indexOf(stepStatus);

    if (status === 'failed' && stepStatus === 'failed') return 'failed';
    if (status === 'returned' && stepStatus === 'returned') return 'returned';
    if (stepIdx <= activeIdx && activeIdx >= 0) return 'active';
    return 'disabled';
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Tracking" subtitle="Track the real-time status of a delivery" />
        <div className="page-content">
          {/* Tracking box */}
          <div className="card" style={{ marginBottom: 20, padding: 24 }}>
            <form onSubmit={handleTrack} style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter Tracking Code (e.g. TRK...)"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  style={{ paddingLeft: 16, height: 44, fontSize: 15 }}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ height: 44, padding: '0 24px' }} disabled={searching}>
                <MdSearch size={20} /> {searching ? 'Tracking...' : 'Track'}
              </button>
            </form>
          </div>

          {/* Results section */}
          {error && (
            <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          {order && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Main details */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>TRACKING CODE</div>
                    <h3 style={{ fontWeight: 800, fontSize: 18, fontFamily: 'monospace', marginTop: 2 }}>{order.trackingCode}</h3>
                  </div>
                  <Badge status={order.status} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>From</h4>
                    <p style={{ fontWeight: 600 }}>{order.senderName}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{order.senderPhone}</p>
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>To</h4>
                    <p style={{ fontWeight: 600 }}>{order.receiverName}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{order.receiverPhone}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{order.receiverAddress}</p>
                  </div>
                </div>
              </div>

              {/* Timeline tracking */}
              <div className="card" style={{ padding: 24 }}>
                <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 20 }}>📍 Status Timeline</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingLeft: 12, position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: 23, top: 12, bottom: 12, width: 2, background: 'var(--border)', zIndex: 1
                  }} />

                  {[
                    { key: 'pending', title: 'Package Registered', desc: 'The merchant has registered the package details.' },
                    { key: 'assigned', title: 'Driver Assigned', desc: 'A driver has been assigned to this package.' },
                    { key: 'picked-up', title: 'Picked Up', desc: 'Driver has picked up the package from the merchant.' },
                    { key: 'in-transit', title: 'In Transit', desc: 'Package is on the way to the delivery address.' },
                    { key: 'delivered', title: 'Delivered / Complete', desc: 'Package has been successfully received.', optionalKey: 'failed', optionalTitle: 'Delivery Failed' },
                  ].map(s => {
                    const statusVal = order.status;
                    let isCurrent = statusVal === s.key || (s.optionalKey && statusVal === s.optionalKey);
                    let title = s.title;
                    let desc = s.desc;
                    let cl = 'var(--text-muted)';
                    let bg = '#e2e8f0';

                    if (statusVal === 'failed' && s.key === 'delivered') {
                      title = s.optionalTitle || title;
                      desc = order.note || 'Package delivery failed.';
                    }

                    const isActive = getStepClass(s.key) === 'active' || (s.optionalKey && getStepClass(s.optionalKey) === 'active');
                    const isFailed = statusVal === 'failed' && s.key === 'delivered';

                    if (isActive) {
                      cl = 'var(--text-primary)';
                      bg = isFailed ? 'var(--danger)' : 'var(--success)';
                    }

                    return (
                      <div key={s.key} style={{ display: 'flex', gap: 16, zIndex: 2, position: 'relative' }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%',
                          background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 12, fontWeight: 'bold', flexShrink: 0
                        }}>
                          {isActive ? '✓' : ''}
                        </div>
                        <div>
                          <h5 style={{ fontWeight: 700, fontSize: 13.5, color: cl }}>{title}</h5>
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{desc}</p>
                          {isCurrent && (
                            <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                              <MdAccessTime size={14} /> Current Status
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
