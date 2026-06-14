'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { MdPrint } from 'react-icons/md';

const formatCOD = (cod: any, currency: string) => {
  if (currency === 'KHR') return `${parseInt(cod).toLocaleString()} ៛`;
  return `$${parseFloat(cod).toFixed(2)}`;
};

export default function PrintInvoicePage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    api.get('/orders')
      .then(res => {
        setOrders(res.data || []);
        // select all by default
        setSelectedIds((res.data || []).map((o: any) => o.id));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedIds.length === orders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(orders.map(o => o.id));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="loading-wrapper"><div className="spinner" /></div>
      </div>
    </div>
  );

  const selectedOrders = orders.filter(o => selectedIds.includes(o.id));

  return (
    <div className="app-layout">
      {/* Hide Sidebar & Topbar during print */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .sidebar, .topbar, .filter-section, .print-btn-container {
            display: none !important;
          }
          .main-content {
            margin-left: 0 !important;
          }
          body, .page-content {
            background: #fff !important;
            padding: 0 !important;
          }
          .invoice-card {
            break-inside: avoid !important;
            border: 1px solid #000 !important;
            box-shadow: none !important;
            margin-bottom: 20px !important;
          }
        }
      `}} />

      <Sidebar />
      <div className="main-content">
        <Topbar title="Print Invoice Delivery" subtitle="Generate printable package invoices and QR codes" />
        <div className="page-content">
          {/* Controls section */}
          <div className="card filter-section" style={{ marginBottom: 20, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === orders.length}
                    onChange={toggleAll}
                  />
                  Select All ({selectedIds.length}/{orders.length})
                </label>
              </div>
              <button className="btn btn-primary" onClick={handlePrint} disabled={selectedIds.length === 0}>
                <MdPrint size={18} /> Print Selected Invoices
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
            {/* Split layout: Selector List (left) vs Printable Previews (right) */}
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
              {/* Selector List */}
              <div className="card filter-section" style={{ height: 'calc(100vh - 220px)', overflowY: 'auto', padding: 16 }}>
                <h4 style={{ fontWeight: 700, marginBottom: 12, fontSize: 13, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                  📦 Select Parcels to Print
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {orders.map(o => (
                    <label
                      key={o.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: 10,
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        background: selectedIds.includes(o.id) ? 'var(--accent-light)' : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(o.id)}
                        onChange={() => toggleSelect(o.id)}
                        style={{ marginTop: 2 }}
                      />
                      <div style={{ fontSize: 12 }}>
                        <div style={{ fontWeight: 'bold' }}>{o.trackingCode}</div>
                        <div style={{ color: 'var(--text-secondary)' }}>To: {o.receiverName}</div>
                        <div style={{ color: 'var(--text-muted)' }}>COD: {formatCOD(o.cod, o.codCurrency || 'USD')}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Printable Previews */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {selectedOrders.length === 0 ? (
                  <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                    <div style={{ fontSize: 48, opacity: 0.3 }}>🖨️</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginTop: 8 }}>No invoices selected</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Select parcels from the list to display preview</div>
                  </div>
                ) : (
                  selectedOrders.map(o => (
                    <div
                      key={o.id}
                      className="card invoice-card"
                      style={{
                        padding: 24,
                        border: '1px dashed var(--border)',
                        background: '#fff',
                        maxWidth: 600,
                        margin: '0 auto',
                        width: '100%',
                      }}
                    >
                      {/* Logo and QR Code header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                        <div>
                          <img src="/ebs-logo.png" alt="EBS" style={{ maxHeight: 30, objectFit: 'contain' }} />
                          <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>EBS Digital Solutions Delivery</div>
                        </div>
                        {/* Mock QR Code block */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{
                            width: 70, height: 70, border: '2px solid #000', padding: 4, margin: '0 auto',
                            display: 'flex', flexWrap: 'wrap', gap: 2, background: '#fff'
                          }}>
                            {Array.from({ length: 49 }).map((_, idx) => (
                              <div key={idx} style={{
                                width: 6, height: 6,
                                background: Math.random() > 0.45 ? '#000' : '#fff'
                              }} />
                            ))}
                          </div>
                          <span style={{ fontSize: 9, fontFamily: 'monospace', display: 'block', marginTop: 2 }}>
                            {o.trackingCode}
                          </span>
                        </div>
                      </div>

                      {/* Sender vs Receiver grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, borderTop: '1px solid #eee', borderBottom: '1px solid #eee', padding: '12px 0', marginBottom: 16 }}>
                        <div>
                          <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', fontWeight: 'bold' }}>Sender</div>
                          <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>{o.senderName}</div>
                          <div style={{ fontSize: 11, color: '#444' }}>{o.senderPhone}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', fontWeight: 'bold' }}>Receiver</div>
                          <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>{o.receiverName}</div>
                          <div style={{ fontSize: 11, color: '#444' }}>{o.receiverPhone}</div>
                          <div style={{ fontSize: 11, color: '#666', marginTop: 4, lineHeight: 1.3 }}>{o.receiverAddress}</div>
                        </div>
                      </div>

                      {/* Package details */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                        <div>
                          <div style={{ fontSize: 10, color: '#888' }}>Zone</div>
                          <div style={{ fontWeight: 600, fontSize: 12 }}>{o.zone?.name || 'Phnom Penh'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#888' }}>Weight</div>
                          <div style={{ fontWeight: 600, fontSize: 12 }}>{o.weight} kg</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#888' }}>COD</div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#ef4444' }}>{formatCOD(o.cod, o.codCurrency || 'USD')}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: '#888' }}>Delivery Fee</div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#10b981' }}>${parseFloat(o.deliveryFee).toFixed(2)}</div>
                        </div>
                      </div>

                      {o.note && (
                        <div style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, fontSize: 11, color: '#555' }}>
                          <strong>Note:</strong> {o.note}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
