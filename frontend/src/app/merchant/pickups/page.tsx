'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import api from '@/lib/api';
import Link from 'next/link';
import {
  MdRefresh, MdAdd, MdCheckCircle, MdHourglassEmpty,
  MdDirectionsBike, MdLocalShipping, MdSchedule, MdStorefront,
} from 'react-icons/md';

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
};

const STATUS_CFG: Record<string, { bg: string; color: string; label: string; icon: any }> = {
  pending:     { bg: '#fef3c7', color: '#d97706', label: 'Pending',    icon: MdHourglassEmpty },
  assigned:    { bg: '#dbeafe', color: '#2563eb', label: 'Assigned',   icon: MdDirectionsBike },
  'picked-up': { bg: '#f3e8ff', color: '#7c3aed', label: 'Picked Up', icon: MdLocalShipping },
  completed:   { bg: '#dcfce7', color: '#16a34a', label: 'Completed', icon: MdCheckCircle },
  cancelled:   { bg: '#fee2e2', color: '#dc2626', label: 'Cancelled', icon: MdHourglassEmpty },
};

export default function MerchantPickupsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'done'>('active');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/mobile/merchant/pickup-requests');
      setRequests(res.data);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/merchant/login'); return; }
    load();
  }, [router, load]);

  const active = requests.filter(r => r.status !== 'completed' && r.status !== 'cancelled');
  const done   = requests.filter(r => r.status === 'completed' || r.status === 'cancelled');
  const shown  = tab === 'active' ? active : done;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#2f55a5,#4f46e5)', padding: '20px 20px 16px', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>📦 Pickup Requests</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>{active.length} active · {done.length} completed</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={load} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: '8px 10px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <MdRefresh size={20} />
            </button>
            <Link href="/merchant/pickups/create" style={{ background: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', color: '#2f55a5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>
              <MdAdd size={18} /> New
            </Link>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['active', 'done'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '8px', borderRadius: 10, border: 'none',
              background: tab === t ? '#fff' : 'rgba(255,255,255,0.15)',
              color: tab === t ? '#2f55a5' : '#fff',
              fontWeight: tab === t ? 800 : 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
            }}>
              {t === 'active' ? `Active (${active.length})` : `History (${done.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#2f55a5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : shown.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>📭</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#334155', marginBottom: 8 }}>
              {tab === 'active' ? 'No active pickup requests' : 'No history yet'}
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>
              {tab === 'active' ? 'Request a pickup and our rider will collect your parcels.' : 'Completed requests will appear here.'}
            </div>
            {tab === 'active' && (
              <Link href="/merchant/pickups/create" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, background: 'linear-gradient(135deg,#2f55a5,#4f46e5)', color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: 14, boxShadow: '0 4px 14px rgba(47,85,165,0.35)' }}>
                <MdAdd size={18} /> Request Pickup
              </Link>
            )}
          </div>
        ) : (
          shown.map((r: any) => {
            const cfg = STATUS_CFG[r.status] ?? { bg: '#f1f5f9', color: '#64748b', label: r.status, icon: MdHourglassEmpty };
            const Icon = cfg.icon;
            const parcelsCount = r.orders?.length ?? null;
            return (
              <div key={r.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
                {/* Top bar */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>Request #{r.id}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MdSchedule size={12} /> {fmtDate(r.pickupTime)}
                    </div>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color }}>
                    <Icon size={13} /> {cfg.label}
                  </span>
                </div>

                {/* Stats row */}
                <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  <StatBox label="Declared" value={r.declaredQuantity ?? '—'} color="#d97706" />
                  <StatBox label="Actual" value={r.actualQuantity ?? '—'} color="#7c3aed" />
                  <StatBox label="Parcels" value={parcelsCount ?? '—'} color="#16a34a" />
                </div>

                {/* Driver */}
                {r.pickupDriver && (
                  <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                      {r.pickupDriver.name?.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Pickup Driver</div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{r.pickupDriver.name}</div>
                    </div>
                  </div>
                )}

                {/* Address */}
                {r.pickupAddress && (
                  <div style={{ padding: '0 16px 14px', fontSize: 12, color: '#64748b' }}>
                    <MdStorefront size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {r.pickupAddress}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* FAB */}
      <Link href="/merchant/pickups/create" style={{
        position: 'fixed', bottom: 80, right: 20,
        width: 52, height: 52, borderRadius: '50%',
        background: 'linear-gradient(135deg,#2f55a5,#4f46e5)',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 6px 20px rgba(47,85,165,0.45)', textDecoration: 'none', zIndex: 50,
        transition: 'transform 0.2s',
      }}>
        <MdAdd size={26} />
      </Link>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: 10, padding: '8px', textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{label}</div>
    </div>
  );
}
