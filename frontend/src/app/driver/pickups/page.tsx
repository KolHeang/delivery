'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import api from '@/lib/api';
import {
  MdRefresh, MdCheckCircle, MdHourglassEmpty, MdClose,
  MdInventory2, MdStorefront, MdSchedule,
} from 'react-icons/md';

/* ─── helpers ─── */
const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
};

const STATUS_CFG: Record<string, { bg: string; color: string; label: string }> = {
  pending:     { bg: '#fef3c7', color: '#d97706', label: 'Pending Pickup' },
  assigned:    { bg: '#dbeafe', color: '#2563eb', label: 'Assigned to You' },
  'picked-up': { bg: '#dcfce7', color: '#16a34a', label: 'Picked Up ✓' },
  completed:   { bg: '#f0fdf4', color: '#15803d', label: 'Completed' },
};

/* ════════════════════════════════════ PAGE ═══════════════════════════════════ */
export default function DriverPickupsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* confirm modal */
  const [confirmModal, setConfirmModal] = useState<any | null>(null);
  const [actualQty, setActualQty] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [successId, setSuccessId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/mobile/driver/pickup-requests');
      setRequests(res.data);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/driver/login'); return; }
    load();
  }, [router, load]);

  const handleConfirm = async () => {
    if (!confirmModal) return;
    const qty = parseInt(actualQty);
    if (isNaN(qty) || qty < 0) return;
    setConfirming(true);
    try {
      await api.patch(`/mobile/driver/pickup-requests/${confirmModal.id}/pickup`, { actualQuantity: qty });
      setSuccessId(confirmModal.id);
      setConfirmModal(null);
      setActualQty('');
      await load();
      setTimeout(() => setSuccessId(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to confirm pickup');
    }
    setConfirming(false);
  };

  /* ─── split by tab ─── */
  const active   = requests.filter(r => r.status !== 'picked-up' && r.status !== 'completed');
  const done     = requests.filter(r => r.status === 'picked-up' || r.status === 'completed');

  const [tab, setTab] = useState<'active' | 'done'>('active');
  const shown = tab === 'active' ? active : done;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc' }}>

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e40af 0%, #2f55a5 100%)',
        padding: '20px 20px 16px', color: '#fff',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>📦 Pickup Requests</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
              {active.length} pending · {done.length} done
            </div>
          </div>
          <button onClick={load} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: '8px 12px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
            <MdRefresh size={18} /> Refresh
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          {(['active', 'done'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '8px', borderRadius: 10, border: 'none',
              background: tab === t ? '#fff' : 'rgba(255,255,255,0.15)',
              color: tab === t ? '#1e40af' : '#fff',
              fontWeight: tab === t ? 800 : 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
            }}>
              {t === 'active' ? `Active (${active.length})` : `Done (${done.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, padding: '16px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#2f55a5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : shown.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{tab === 'active' ? '🎉' : '📋'}</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#334155', marginBottom: 6 }}>
              {tab === 'active' ? 'No active pickups' : 'No completed pickups'}
            </div>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              {tab === 'active' ? 'You have no pickup requests assigned.' : 'Completed requests will appear here.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {shown.map((r: any) => {
              const cfg = STATUS_CFG[r.status] ?? { bg: '#f1f5f9', color: '#64748b', label: r.status };
              const isNew = successId === r.id;
              return (
                <div key={r.id} style={{
                  background: '#fff', borderRadius: 16, overflow: 'hidden',
                  border: isNew ? '2px solid #16a34a' : '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(15,23,42,0.05)', transition: 'border-color 0.3s',
                }}>
                  {/* Card header */}
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>Request #{r.id}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        <MdSchedule size={12} style={{ verticalAlign: 'middle' }} /> {fmtDate(r.pickupTime)}
                      </div>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color }}>
                      {r.status === 'picked-up' ? <MdCheckCircle size={12} /> : <MdHourglassEmpty size={12} />}
                      {cfg.label}
                    </span>
                  </div>

                  {/* Merchant info */}
                  <div style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                      <MdStorefront />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{r.merchant?.name || '—'}</div>
                      {r.merchant?.nameKh && <div style={{ fontSize: 12, color: '#64748b' }}>{r.merchant.nameKh}</div>}
                      {r.merchant?.phone && <div style={{ fontSize: 12, color: '#64748b' }}>📞 {r.merchant.phone}</div>}
                    </div>
                  </div>

                  {/* Details */}
                  <div style={{ padding: '0 16px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <DetailChip label="Shop Address" value={r.pickupAddress || '—'} />
                    <DetailChip label="Declared Qty" value={r.declaredQuantity ?? '—'} highlight />
                    {r.actualQuantity != null && <DetailChip label="Actual Qty" value={r.actualQuantity} highlight />}
                  </div>

                  {/* Confirm button */}
                  {(r.status === 'pending' || r.status === 'assigned') && (
                    <div style={{ padding: '0 16px 16px' }}>
                      <button
                        onClick={() => { setConfirmModal(r); setActualQty(String(r.declaredQuantity ?? '')); }}
                        style={{
                          width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                          background: 'linear-gradient(135deg,#1e40af,#2f55a5)', color: '#fff',
                          fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(30,64,175,0.3)',
                        }}
                      >
                        <MdInventory2 size={18} /> Confirm Pickup
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════ Confirm Modal ═══════ */}
      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 16px' }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 16px 16px', width: '100%', maxWidth: 480, padding: '24px 24px 20px', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#1e293b' }}>Confirm Pickup</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Request #{confirmModal.id} · {confirmModal.merchant?.name}</div>
              </div>
              <button onClick={() => { setConfirmModal(null); setActualQty(''); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                <MdClose size={20} />
              </button>
            </div>

            <div style={{ background: '#fef3c7', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#92400e', fontWeight: 600 }}>Declared quantity:</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#d97706' }}>{confirmModal.declaredQuantity}</span>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 8 }}>
                Actual Quantity Counted *
              </label>
              <input
                type="number" min="0" inputMode="numeric"
                value={actualQty} onChange={e => setActualQty(e.target.value)}
                placeholder="Enter actual count..."
                style={{ width: '100%', padding: '14px 16px', border: '2px solid #e2e8f0', borderRadius: 12, fontSize: 20, fontWeight: 800, textAlign: 'center', outline: 'none', boxSizing: 'border-box', color: '#1e293b', background: '#f8fafc' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#2f55a5')}
                onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                autoFocus
              />
            </div>

            <button
              onClick={handleConfirm}
              disabled={confirming || !actualQty}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                background: (!actualQty || confirming) ? '#e2e8f0' : 'linear-gradient(135deg,#16a34a,#22c55e)',
                color: (!actualQty || confirming) ? '#94a3b8' : '#fff',
                fontWeight: 800, fontSize: 16, cursor: (!actualQty || confirming) ? 'not-allowed' : 'pointer',
                boxShadow: (!actualQty || confirming) ? 'none' : '0 4px 14px rgba(22,163,74,0.35)',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}
            >
              <MdCheckCircle size={20} />
              {confirming ? 'Confirming...' : 'Confirm Pickup'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailChip({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  return (
    <div style={{ background: highlight ? '#eff6ff' : '#f8fafc', borderRadius: 10, padding: '8px 12px' }}>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: highlight ? '#1e40af' : '#334155', wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}
