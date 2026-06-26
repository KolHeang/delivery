'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdArrowBack, MdRefresh, MdDirectionsBike, MdClose,
  MdDelete, MdPrint, MdCheckCircle, MdAdd, MdHourglassEmpty,
  MdLocalShipping, MdWarehouse,
} from 'react-icons/md';

/* ────────────────────────────────── helpers ── */
function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
function formatCOD(cod: any, currency = 'USD') {
  if (!cod || +cod === 0) return '—';
  return currency === 'KHR'
    ? `${parseInt(cod).toLocaleString()} ៛`
    : `$${parseFloat(cod).toFixed(2)}`;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:     { bg: '#fef3c7', color: '#d97706' },
  assigned:    { bg: '#dbeafe', color: '#2563eb' },
  'picked-up': { bg: '#f3e8ff', color: '#7c3aed' },
  completed:   { bg: '#dcfce7', color: '#16a34a' },
  cancelled:   { bg: '#fee2e2', color: '#dc2626' },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? { bg: '#f3f4f6', color: '#6b7280' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: c.bg, color: c.color }}>
      {status === 'pending' && <MdHourglassEmpty size={13} />}
      {status === 'assigned' && <MdDirectionsBike size={13} />}
      {status === 'picked-up' && <MdLocalShipping size={13} />}
      {status === 'completed' && <MdCheckCircle size={13} />}
      {status}
    </span>
  );
}

/* ────────────────────────────────── initial form state ── */
const emptyForm = () => ({
  receiverName: '', receiverPhone: '', receiverAddress: '',
  zoneId: '', cod: '0', codCurrency: 'USD', deliveryFee: '',
  note: '', packageName: '', weight: '', size: '',
});

const emptyBatchRow = () => ({
  receiverAddress: '', receiverPhone: '',
  deliveryFee: '', amountUSD: '0', amountKHR: '0',
  pickupDriverId: '', deliveryDriverId: '',
  note: '', zoneId: '',
});

/* ════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════ */
export default function PickupRequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const { t } = useLanguage();

  const [request, setRequest]   = useState<any>(null);
  const [parcels, setParcels]   = useState<any[]>([]);
  const [drivers, setDrivers]   = useState<any[]>([]);
  const [zones, setZones]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  /* ── local state ── */
  const [form, setForm]             = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  /* ── batch entry state ── */
  const [entryTab, setEntryTab]               = useState<'single' | 'batch'>('single');
  const [batchRows, setBatchRows]             = useState<any[]>([emptyBatchRow()]);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchResults, setBatchResults]       = useState<{ idx: number; success: boolean; msg: string }[]>([]);

  /* ── assign driver modal ── */
  const [showAssign, setShowAssign]       = useState(false);
  const [assignDriverId, setAssignDriver] = useState<number | null>(null);
  const [assigning, setAssigning]         = useState(false);

  /* ── print ref ── */
  const printRef = useRef<HTMLDivElement>(null);

  /* ────────────────────────────── load ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, drvRes, zoneRes] = await Promise.all([
        api.get(`/orders/pickup-requests/${id}`),
        api.get('/drivers/available'),
        api.get('/zones'),
      ]);
      const reqData = reqRes.data;
      const zonesData: any[] = zoneRes.data?.data ?? zoneRes.data ?? [];
      setRequest(reqData);
      setParcels(reqData.orders ?? []);
      setDrivers(drvRes.data);
      setZones(zonesData);

      /* auto-fill delivery fee from merchant */
      const merchant = reqData.merchant;
      const directFee = merchant?.defaultDeliveryFee ?? merchant?.deliveryFee;
      let fee: string | number = directFee ?? '';
      if ((fee === '' || fee == null) && zonesData.length) {
        const zone = zonesData[0];
        const tier = merchant?.pricingTier?.toLowerCase();
        fee = (tier && zone[tier] != null) ? zone[tier] : zone.deliveryFee ?? zone.price ?? '';
      }
      if (fee !== '' && fee != null) {
        const feeStr = String(fee);
        setForm(f => ({ ...f, deliveryFee: feeStr }));
        setBatchRows(rows => rows.map((r, i) => i === 0 && !r.deliveryFee ? { ...r, deliveryFee: feeStr } : r));
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    load();
  }, [router, load]);



  /* ────────────────────────────── assign driver ── */
  const handleAssignDriver = async () => {
    if (!assignDriverId) return;
    setAssigning(true);
    try {
      await api.patch(`/orders/pickup-requests/${id}/assign-driver`, { pickupDriverId: assignDriverId });
      setShowAssign(false);
      setAssignDriver(null);
      setSuccessMsg(t('assignSuccess'));
      setTimeout(() => setSuccessMsg(''), 3000);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to assign driver');
    }
    setAssigning(false);
  };

  /* ────────────────────────────── add parcel (single) ── */
  const handleAddParcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.receiverPhone.trim()) { setFormError('Receiver phone is required'); return; }
    if (!form.receiverAddress.trim()) { setFormError('Receiver address is required'); return; }
    if (!form.zoneId) { setFormError('Zone is required'); return; }
    setFormError('');
    setSubmitting(true);
    try {
      await api.post(`/orders/pickup-requests/${id}/parcels`, {
        receiverName:    form.receiverName.trim() || undefined,
        receiverPhone:   form.receiverPhone.trim(),
        receiverAddress: form.receiverAddress.trim(),
        zoneId:          Number(form.zoneId),
        cod:             parseFloat(form.cod) || 0,
        codCurrency:     form.codCurrency,
        deliveryFee:     parseFloat(form.deliveryFee) || 0,
        note:            form.note.trim() || undefined,
        packageName:     form.packageName.trim() || undefined,
        weight:          form.weight ? parseFloat(form.weight) : undefined,
        size:            form.size.trim() || undefined,
      });
      setForm(emptyForm());
      setSuccessMsg(t('inboundSuccess'));
      setTimeout(() => setSuccessMsg(''), 3000);
      await load();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to add parcel');
    }
    setSubmitting(false);
  };

  /* ────────────────────────────── batch helpers ── */
  const addBatchRow = () => setBatchRows(r => [...r, emptyBatchRow()]);

  const removeBatchRow = (idx: number) =>
    setBatchRows(r => r.length === 1 ? r : r.filter((_, i) => i !== idx));

  const updateBatchRow = (idx: number, field: string, value: string) => {
    setBatchRows(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      const updated = { ...row, [field]: value };
      // auto-fill delivery fee when zone changes
      if (field === 'zoneId' && zones.length && request) {
        const zone = zones.find((z: any) => String(z.id) === value);
        if (zone) {
          const merchant = request.merchant;
          const tier = merchant?.pricingTier?.toLowerCase();
          const fee = tier && zone[tier] != null ? zone[tier] : zone.deliveryFee ?? zone.price ?? '';
          if (fee !== '') updated.deliveryFee = String(fee);
        }
      }
      return updated;
    }));
  };

  const handleBatchSubmit = async () => {
    const invalid = batchRows.findIndex(r => !r.receiverPhone.trim() || !r.receiverAddress.trim());
    if (invalid !== -1) {
      alert(`Row ${invalid + 1}: Address and Phone are required.`);
      return;
    }
    setBatchSubmitting(true);
    setBatchResults([]);
    const results: { idx: number; success: boolean; msg: string }[] = [];
    // resolve default zone from request merchant if available
    const defaultZoneId = zones.length === 1 ? zones[0].id : undefined;
    for (let i = 0; i < batchRows.length; i++) {
      const row = batchRows[i];
      const zoneId = row.zoneId ? Number(row.zoneId) : defaultZoneId;
      try {
        await api.post(`/orders/pickup-requests/${id}/parcels`, {
          receiverPhone:   row.receiverPhone.trim(),
          receiverAddress: row.receiverAddress.trim(),
          zoneId,
          deliveryFee:     parseFloat(row.deliveryFee) || 0,
          cod:             parseFloat(row.amountUSD) || 0,
          codCurrency:     'USD',
          note:            row.note.trim() || undefined,
          pickupDriverId:  row.pickupDriverId ? Number(row.pickupDriverId) : undefined,
          driverId:        row.deliveryDriverId ? Number(row.deliveryDriverId) : undefined,
        });
        results.push({ idx: i, success: true, msg: 'OK' });
      } catch (err: any) {
        results.push({ idx: i, success: false, msg: err.response?.data?.message || 'Failed' });
      }
    }
    setBatchResults(results);
    setBatchSubmitting(false);
    const allOk = results.every(r => r.success);
    if (allOk) {
      setSuccessMsg(`${results.length} parcel(s) added successfully!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setBatchRows([emptyBatchRow()]);
      setBatchResults([]);
    }
    await load();
  };

  /* ────────────────────────────── delete parcel ── */
  const handleDeleteParcel = async (parcelId: number) => {
    if (!confirm(t('deleteParcelConfirm'))) return;
    try {
      await api.delete(`/orders/pickup-requests/${id}/parcels/${parcelId}`);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete parcel');
    }
  };

  /* ────────────────────────────── print ── */
  const handlePrint = () => {
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        body > *:not(#print-root) { display: none !important; }
        #print-root { display: block !important; }
        @page { size: A4 portrait; margin: 15mm; }
      }
    `;
    document.head.appendChild(style);
    const el = document.getElementById('waybill-print');
    if (!el) return;
    const orig = el.style.display;
    el.style.display = 'block';
    window.print();
    el.style.display = orig;
    document.head.removeChild(style);
  };

  /* ────────────────────────────── derived ── */
  const completed = parcels.length;
  const declared  = request?.declaredQuantity ?? 0;
  const progress  = declared > 0 ? Math.min(100, Math.round((completed / declared) * 100)) : 0;

  /* ════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar
          title={`${t('inboundWorkspace')} — #${id}`}
          subtitle={t('inboundWorkspaceSubtitle')}
        />
        <div className="page-content" style={{ paddingBottom: 40 }}>

          {/* ── Back + actions bar ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <button className="btn btn-outline" onClick={() => router.push('/delivery/pickup_requests')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <MdArrowBack size={16} /> {t('pickupRequestList')}
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MdRefresh size={16} /> Refresh
              </button>
              <button
                onClick={() => setShowAssign(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1.5px solid #2563eb', background: '#dbeafe', color: '#2563eb', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                <MdDirectionsBike size={16} /> {t('assignDriverTitle')}
              </button>
              <button
                onClick={handlePrint}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1.5px solid #16a34a', background: '#dcfce7', color: '#16a34a', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                <MdPrint size={16} /> {t('printWaybill')}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-wrapper"><div className="spinner" /></div>
          ) : !request ? (
            <div className="empty-state"><div className="empty-state-title">Request not found</div></div>
          ) : (
            <>
              {/* ── Success toast ── */}
              {successMsg && (
                <div style={{ marginBottom: 16, padding: '12px 18px', borderRadius: 10, background: '#dcfce7', color: '#16a34a', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MdCheckCircle size={18} /> {successMsg}
                </div>
              )}

              {/* ── Summary card ── */}
              <div className="card" style={{ marginBottom: 20, padding: '20px 24px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
                  {/* Request info */}
                  <div style={{ flex: '1 1 280px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Request Info</div>
                    <InfoRow label="Request ID" value={`#${request.id}`} />
                    <InfoRow label={t('status')} value={<StatusBadge status={request.status} />} />
                    <InfoRow label={t('merchant')} value={<><span style={{ fontWeight: 700 }}>{request.merchant?.name}</span>{request.merchant?.nameKh && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>({request.merchant.nameKh})</span>}</>} />
                    <InfoRow label={t('location')} value={request.pickupAddress || '—'} />
                    <InfoRow label={t('scheduledAt')} value={formatDate(request.pickupTime)} />
                    <InfoRow label={t('pickedUpAt')} value={formatDate(request.pickedUpAt)} />
                    <InfoRow label={t('note')} value={request.note || '—'} />
                  </div>

                  {/* Driver */}
                  <div style={{ flex: '1 1 220px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Pickup Driver</div>
                    {request.pickupDriver ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: '#f0f9ff', border: '1.5px solid #bae6fd' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>
                          {request.pickupDriver.name?.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{request.pickupDriver.name}</div>
                          {request.pickupDriver.nameKh && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{request.pickupDriver.nameKh}</div>}
                          {request.pickupDriver.phone && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📞 {request.pickupDriver.phone}</div>}
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '14px 16px', borderRadius: 12, background: '#fef9c3', border: '1.5px dashed #fbbf24', color: '#92400e', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                        ⚠️ No driver assigned yet
                      </div>
                    )}
                  </div>

                  {/* Progress */}
                  <div style={{ flex: '1 1 220px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>{t('batchProgress')}</div>
                    <div style={{ padding: '16px 20px', borderRadius: 12, background: 'var(--bg-primary)', border: '1.5px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Inbounded / Declared</span>
                        <span style={{ fontWeight: 800, fontSize: 15 }}>{completed} / {declared || '?'}</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: 'var(--border)', overflow: 'hidden', marginBottom: 8 }}>
                        <div style={{ width: `${progress}%`, height: '100%', borderRadius: 999, background: progress >= 100 ? '#16a34a' : '#d97706', transition: 'width 0.5s' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-muted)' }}>{progress}% complete</span>
                        {request.actualQuantity && <span style={{ color: '#7c3aed', fontWeight: 600 }}>Actual picked: {request.actualQuantity}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Layout: side-by-side (single) or full-width (batch) ── */}
              <div style={{ display: 'grid', gridTemplateColumns: entryTab === 'batch' ? '1fr' : '1fr 380px', gap: 20, alignItems: 'start' }}>

                {/* ── Parcels list ── */}
                <div className="card" style={{ overflow: 'hidden' }}>
                  <div className="card-header" style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <MdWarehouse size={20} style={{ color: '#d97706' }} />
                      <div>
                        <span className="card-title" style={{ fontSize: 15 }}>{t('parcelsInBatch')}</span>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{completed} parcel(s) registered</div>
                      </div>
                    </div>
                  </div>

                  {parcels.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                      <div style={{ fontSize: 36, marginBottom: 10 }}>📪</div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 6 }}>{t('noParcelsYet')}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('noParcelsYetText')}</div>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg-primary)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                          <tr>
                            <th style={{ paddingLeft: 20 }}>#</th>
                            <th>{t('trackingCode')}</th>
                            <th>{t('receiverName')}</th>
                            <th>{t('receiverPhone')}</th>
                            <th>{t('zone')}</th>
                            <th>{t('cod')}</th>
                            <th>{t('deliveryFee')}</th>
                            <th>{t('status')}</th>
                            <th>{t('actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parcels.map((p: any, idx: number) => (
                            <tr key={p.id}>
                              <td style={{ paddingLeft: 20, fontWeight: 600, color: 'var(--text-muted)', fontSize: 12 }}>{idx + 1}</td>
                              <td>
                                <code style={{ fontSize: 11, background: 'rgba(0,0,0,0.05)', padding: '3px 7px', borderRadius: 6, fontWeight: 700 }}>
                                  {p.trackingCode}
                                </code>
                              </td>
                              <td style={{ fontWeight: 600, fontSize: 13 }}>{p.receiverName || '—'}</td>
                              <td style={{ fontWeight: 600, fontSize: 13 }}>{p.receiverPhone}</td>
                              <td style={{ fontSize: 12 }}>{p.zone?.name || '—'}</td>
                              <td style={{ fontWeight: 700, fontSize: 13 }}>{formatCOD(p.cod, p.codCurrency)}</td>
                              <td style={{ color: 'var(--success)', fontWeight: 700, fontSize: 13 }}>${parseFloat(p.deliveryFee || 0).toFixed(2)}</td>
                              <td>
                                <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 999, fontWeight: 700, background: '#dcfce7', color: '#16a34a' }}>
                                  {p.status}
                                </span>
                              </td>
                              <td>
                                <button
                                  onClick={() => handleDeleteParcel(p.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}
                                  title="Delete parcel"
                                >
                                  <MdDelete size={17} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* ── Tabbed panel: Single / Batch Entry ── */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

                  {/* Tab switcher */}
                  <div style={{ display: 'flex', borderBottom: '1.5px solid var(--border)' }}>
                    {(['single', 'batch'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => { setEntryTab(tab); setBatchResults([]); }}
                        style={{
                          flex: 1, padding: '13px 0', border: 'none', cursor: 'pointer',
                          fontWeight: 700, fontSize: 13,
                          background: entryTab === tab ? 'var(--bg-card)' : 'var(--bg-primary)',
                          color: entryTab === tab ? '#1e3a8a' : 'var(--text-muted)',
                          borderBottom: entryTab === tab ? '2.5px solid #1e3a8a' : '2.5px solid transparent',
                          transition: 'all 0.2s',
                        }}
                      >
                        {tab === 'single' ? '+ Add Single' : '⚡ Batch Entry'}
                      </button>
                    ))}
                  </div>

                  {/* ── SINGLE TAB ── */}
                  {entryTab === 'single' && (
                    <div style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <MdAdd size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{t('addParcelTitle')}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fill in parcel details below</div>
                        </div>
                      </div>

                      {formError && (
                        <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: '#fee2e2', color: '#dc2626', fontWeight: 600, fontSize: 13 }}>
                          {formError}
                        </div>
                      )}

                      <form onSubmit={handleAddParcel} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <FormField label={t('receiverName')}>
                          <input type="text" value={form.receiverName} onChange={e => setForm(f => ({ ...f, receiverName: e.target.value }))} placeholder="Customer name" style={inputStyle} />
                        </FormField>
                        <FormField label={`${t('receiverPhone')} *`}>
                          <input type="text" value={form.receiverPhone} onChange={e => setForm(f => ({ ...f, receiverPhone: e.target.value }))} placeholder="Phone number" required style={inputStyle} />
                        </FormField>
                        <FormField label={`${t('receiverAddress')} *`}>
                          <input type="text" value={form.receiverAddress} onChange={e => setForm(f => ({ ...f, receiverAddress: e.target.value }))} placeholder="Delivery address" required style={inputStyle} />
                        </FormField>

                        <FormField label={`${t('deliveryFee')} ($)`}>
                          <input type="number" min="0" step="0.01" value={form.deliveryFee} onChange={e => setForm(f => ({ ...f, deliveryFee: e.target.value }))} placeholder="0.00" style={inputStyle} />
                        </FormField>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <FormField label={t('cod')}>
                            <input type="number" min="0" step="0.01" value={form.cod} onChange={e => setForm(f => ({ ...f, cod: e.target.value }))} placeholder="0" style={inputStyle} />
                          </FormField>
                          <FormField label="Currency">
                            <select value={form.codCurrency} onChange={e => setForm(f => ({ ...f, codCurrency: e.target.value }))} style={inputStyle}>
                              <option value="USD">USD</option>
                              <option value="KHR">KHR</option>
                            </select>
                          </FormField>
                        </div>
                        <FormField label={t('note')}>
                          <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Optional note" style={inputStyle} />
                        </FormField>
                        <button type="submit" disabled={submitting} style={{ marginTop: 4, padding: '12px', borderRadius: 10, border: 'none', background: submitting ? 'var(--border)' : 'linear-gradient(135deg,#1e3a8a,#2563eb)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: submitting ? 'none' : '0 4px 14px rgba(30,58,138,0.3)', transition: 'all 0.2s' }}>
                          <MdAdd size={18} />{submitting ? 'Adding...' : t('addParcel')}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* ── BATCH TAB ── */}
                  {entryTab === 'batch' && (
                    <div style={{ padding: '16px 20px' }}>

                      {/* Results banner */}
                      {batchResults.length > 0 && (
                        <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: batchResults.every(r => r.success) ? '#dcfce7' : '#fef9c3', border: `1px solid ${batchResults.every(r => r.success) ? '#86efac' : '#fde68a'}` }}>
                          {batchResults.map(r => (
                            <div key={r.idx} style={{ fontSize: 12, color: r.success ? '#16a34a' : '#dc2626', fontWeight: 600, marginBottom: 2 }}>
                              {r.success ? '✅' : '❌'} Row {r.idx + 1}: {r.success ? 'Added successfully' : r.msg}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Table */}
                      <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #cbd5e1', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                          <thead>
                            <tr style={{ background: '#1e3a8a' }}>
                              {[
                                { label: 'No.', w: 44 },
                                { label: 'Receiver Address *', w: undefined },
                                { label: 'Receiver Phone *', w: 150 },
                                { label: 'Delivery Fee', w: 110 },
                                { label: 'Amount ($)', w: 100 },
                                { label: 'Amount (៛)', w: 100 },
                                { label: 'Pickup Person', w: 160 },
                                { label: 'Delivery Person', w: 160 },
                                { label: 'Note', w: undefined },
                                { label: 'Actions', w: 70 },
                              ].map(({ label, w }) => (
                                <th key={label} style={{ padding: '11px 10px', fontSize: 12, fontWeight: 700, color: '#fff', textAlign: 'left', whiteSpace: 'nowrap', width: w }}>{label}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {batchRows.map((row, idx) => {
                              const res = batchResults.find(r => r.idx === idx);
                              const rowBg = res
                                ? (res.success ? 'rgba(22,163,74,0.07)' : 'rgba(220,38,38,0.07)')
                                : (idx % 2 === 0 ? '#fff' : '#f8fafc');
                              return (
                                <tr key={idx} style={{ background: rowBg, borderBottom: '1px solid #e2e8f0' }}>
                                  {/* No. */}
                                  <td style={{ padding: '8px 10px', fontWeight: 700, fontSize: 13, color: '#64748b', textAlign: 'center' }}>
                                    {res ? (res.success ? '✅' : '❌') : idx + 1}
                                  </td>
                                  {/* Address */}
                                  <td style={{ padding: '6px 6px' }}>
                                    <input
                                      type="text" value={row.receiverAddress}
                                      onChange={e => updateBatchRow(idx, 'receiverAddress', e.target.value)}
                                      placeholder="Address location"
                                      style={{ ...batchCellStyle, width: '100%', borderColor: !row.receiverAddress.trim() ? '#fca5a5' : '#cbd5e1' }}
                                    />
                                  </td>
                                  {/* Phone */}
                                  <td style={{ padding: '6px 6px' }}>
                                    <input
                                      type="text" value={row.receiverPhone}
                                      onChange={e => updateBatchRow(idx, 'receiverPhone', e.target.value)}
                                      placeholder="e.g. 012345678"
                                      style={{ ...batchCellStyle, width: '100%', borderColor: !row.receiverPhone.trim() ? '#fca5a5' : '#cbd5e1' }}
                                    />
                                  </td>
                                  {/* Delivery Fee */}
                                  <td style={{ padding: '6px 6px' }}>
                                    <input
                                      type="number" min="0" step="0.01" value={row.deliveryFee}
                                      onChange={e => updateBatchRow(idx, 'deliveryFee', e.target.value)}
                                      placeholder="1.25"
                                      style={{ ...batchCellStyle, width: '100%' }}
                                    />
                                  </td>
                                  {/* Amount USD */}
                                  <td style={{ padding: '6px 6px' }}>
                                    <input
                                      type="number" min="0" step="0.01" value={row.amountUSD}
                                      onChange={e => updateBatchRow(idx, 'amountUSD', e.target.value)}
                                      placeholder="0"
                                      style={{ ...batchCellStyle, width: '100%' }}
                                    />
                                  </td>
                                  {/* Amount KHR */}
                                  <td style={{ padding: '6px 6px' }}>
                                    <input
                                      type="number" min="0" step="1" value={row.amountKHR}
                                      onChange={e => updateBatchRow(idx, 'amountKHR', e.target.value)}
                                      placeholder="0"
                                      style={{ ...batchCellStyle, width: '100%' }}
                                    />
                                  </td>
                                  {/* Pickup Person */}
                                  <td style={{ padding: '6px 6px' }}>
                                    <select
                                      value={row.pickupDriverId}
                                      onChange={e => updateBatchRow(idx, 'pickupDriverId', e.target.value)}
                                      style={{ ...batchCellStyle, width: '100%' }}
                                    >
                                      <option value="">— Select Driver —</option>
                                      {drivers.map((d: any) => (
                                        <option key={d.id} value={d.id}>{d.name}{d.nameKh ? ` (${d.nameKh})` : ''}</option>
                                      ))}
                                    </select>
                                  </td>
                                  {/* Delivery Person */}
                                  <td style={{ padding: '6px 6px' }}>
                                    <select
                                      value={row.deliveryDriverId}
                                      onChange={e => updateBatchRow(idx, 'deliveryDriverId', e.target.value)}
                                      style={{ ...batchCellStyle, width: '100%' }}
                                    >
                                      <option value="">— Select Driver —</option>
                                      {drivers.map((d: any) => (
                                        <option key={d.id} value={d.id}>{d.name}{d.nameKh ? ` (${d.nameKh})` : ''}</option>
                                      ))}
                                    </select>
                                  </td>
                                  {/* Note */}
                                  <td style={{ padding: '6px 6px' }}>
                                    <input
                                      type="text" value={row.note}
                                      onChange={e => updateBatchRow(idx, 'note', e.target.value)}
                                      placeholder="Note..."
                                      style={{ ...batchCellStyle, width: '100%' }}
                                    />
                                  </td>
                                  {/* Delete */}
                                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                    <button
                                      onClick={() => removeBatchRow(idx)}
                                      disabled={batchRows.length === 1}
                                      style={{ background: batchRows.length === 1 ? '#e2e8f0' : '#ef4444', border: 'none', borderRadius: 8, cursor: batchRows.length === 1 ? 'not-allowed' : 'pointer', color: '#fff', width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
                                    >
                                      <MdDelete size={16} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Bottom actions */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                        <div style={{ flex: 1 }} />
                        <button
                          onClick={addBatchRow}
                          style={{ padding: '9px 28px', borderRadius: 8, border: 'none', background: '#1e3a8a', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#1e40af')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#1e3a8a')}
                        >
                          <MdAdd size={16} /> Add New
                        </button>
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            onClick={handleBatchSubmit}
                            disabled={batchSubmitting}
                            style={{ padding: '9px 32px', borderRadius: 8, border: 'none', background: batchSubmitting ? '#94a3b8' : '#1e3a8a', color: '#fff', fontWeight: 700, fontSize: 13, cursor: batchSubmitting ? 'not-allowed' : 'pointer', transition: 'background 0.15s', boxShadow: batchSubmitting ? 'none' : '0 2px 8px rgba(30,58,138,0.25)' }}
                            onMouseEnter={e => { if (!batchSubmitting) e.currentTarget.style.background = '#1e40af'; }}
                            onMouseLeave={e => { if (!batchSubmitting) e.currentTarget.style.background = '#1e3a8a'; }}
                          >
                            {batchSubmitting ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ════════════════ Assign Driver Modal ════════════════ */}
      {showAssign && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(0,0,0,0.2)', position: 'relative' }}>
            <button onClick={() => { setShowAssign(false); setAssignDriver(null); }} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              <MdClose size={22} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                <MdDirectionsBike size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{t('assignDriverTitle')}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Select a driver for pickup request #{id}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
              {drivers.map((d: any) => (
                <div key={d.id}
                  onClick={() => setAssignDriver(d.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 12,
                    border: `2px solid ${assignDriverId === d.id ? '#2563eb' : 'var(--border)'}`,
                    background: assignDriverId === d.id ? '#dbeafe' : 'var(--bg-primary)',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: assignDriverId === d.id ? '#2563eb' : 'var(--bg-card)', color: assignDriverId === d.id ? '#fff' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, transition: 'all 0.2s' }}>
                    {d.name?.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{d.name}{d.nameKh && <span style={{ fontWeight: 500, fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>({d.nameKh})</span>}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>📞 {d.phone} · {d.zone?.name || 'No zone'}</div>
                  </div>
                  {assignDriverId === d.id && <MdCheckCircle size={22} style={{ color: '#2563eb', flexShrink: 0 }} />}
                </div>
              ))}
            </div>

            <button
              onClick={handleAssignDriver}
              disabled={!assignDriverId || assigning}
              style={{ marginTop: 20, width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: (!assignDriverId || assigning) ? 'var(--border)' : '#2563eb', color: '#fff', fontWeight: 700, fontSize: 14, cursor: (!assignDriverId || assigning) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: (!assignDriverId || assigning) ? 'none' : '0 4px 14px rgba(37,99,235,0.35)' }}
            >
              {assigning ? 'Assigning...' : t('assignDriver')}
            </button>
          </div>
        </div>
      )}

      {/* ════════════════ Hidden Waybill Print ════════════════ */}
      <div id="waybill-print" style={{ display: 'none' }} ref={printRef}>
        <div style={{ fontFamily: 'sans-serif', padding: 20 }}>
          <h2 style={{ marginBottom: 6 }}>Pickup Request Waybills — #{id}</h2>
          <p style={{ marginBottom: 20, fontSize: 13, color: '#555' }}>
            Merchant: {request?.merchant?.name} · Printed: {new Date().toLocaleString()}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {parcels.map((p: any, idx: number) => (
              <div key={p.id} style={{ border: '1.5px solid #ccc', borderRadius: 8, padding: 14, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: 16 }}>#{idx + 1}</span>
                  <code style={{ fontSize: 13, fontWeight: 800 }}>{p.trackingCode}</code>
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                  <div><b>From:</b> {request?.merchant?.name}</div>
                  <div><b>To:</b> {p.receiverName || '—'} · {p.receiverPhone}</div>
                  <div><b>Address:</b> {p.receiverAddress}</div>
                  <div><b>Zone:</b> {p.zone?.name || '—'}</div>
                  <div><b>COD:</b> {formatCOD(p.cod, p.codCurrency)}</div>
                  <div><b>Fee:</b> ${parseFloat(p.deliveryFee || 0).toFixed(2)}</div>
                  {p.note && <div><b>Note:</b> {p.note}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── tiny helpers ── */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 110, flexShrink: 0, marginTop: 2 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{value}</span>
    </div>
  );
}
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  );
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 11px', border: '1.5px solid var(--border)',
  borderRadius: 8, fontSize: 13, background: 'var(--bg-primary)',
  color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};
const batchCellStyle: React.CSSProperties = {
  padding: '6px 8px', border: '1.5px solid var(--border)',
  borderRadius: 6, fontSize: 12, background: 'var(--bg-primary)',
  color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};
