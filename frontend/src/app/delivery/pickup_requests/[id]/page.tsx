'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import type { Language } from '@/lib/i18n';
import {
  getPickupRequestStatusLabel,
  getParcelStatusLabel,
  getParcelStatusBadgeColor,
} from '@/lib/status';
import {
  sanitizePhoneInput,
  isPhoneExceedingMaxDigits,
  getPhoneMaxDigitsError,
} from '@/lib/phone-util';
import {
  MdArrowBack, MdRefresh, MdDirectionsBike, MdClose,
  MdDelete, MdPrint, MdCheckCircle, MdAdd, MdHourglassEmpty,
  MdLocalShipping, MdWarehouse, MdPhone, MdWarningAmber,
  MdInventory2, MdLock, MdBolt, MdPhotoCamera, MdSync,
} from 'react-icons/md';

/* ────────────────────────────────── helpers ── */
function formatDate(d?: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
function formatCOD(cod: any, currency = 'USD') {
  if (!cod || +cod === 0) return '';
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

function StatusBadge({ status, lang }: { status: string; lang: Language }) {
  const c = STATUS_COLORS[status] ?? { bg: '#f3f4f6', color: '#6b7280' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: c.bg, color: c.color }}>
      {status === 'pending' && <MdHourglassEmpty size={13} />}
      {status === 'assigned' && <MdDirectionsBike size={13} />}
      {status === 'picked-up' && <MdLocalShipping size={13} />}
      {status === 'completed' && <MdCheckCircle size={13} />}
      {getPickupRequestStatusLabel(status, lang)}
    </span>
  );
}

/* ────────────────────────────────── initial form state ── */
const emptyForm = () => ({
  receiverName: '', receiverPhone: '', receiverAddress: '',
  zoneId: '', cod: '0', codCurrency: 'USD', deliveryFee: '',
  note: '', packageName: '', weight: '', size: '',
});

const emptyBatchRow = (defaults?: { deliveryFee?: string; pickupDriverId?: string }) => ({
  receiverAddress: '', receiverPhone: '',
  deliveryFee: defaults?.deliveryFee ?? '', amountUSD: '0', amountKHR: '0',
  pickupDriverId: defaults?.pickupDriverId ?? '', deliveryDriverId: '',
  note: '', zoneId: '',
});

/* ════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════ */
export default function PickupRequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const { t, lang } = useLanguage();

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
  const [previewModalImg, setPreviewModalImg] = useState<string | null>(null);

  /* ── batch entry state ── */
  const [entryTab, setEntryTab]               = useState<'single' | 'batch'>('single');
  const [batchRows, setBatchRows]             = useState<any[]>([emptyBatchRow()]);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchResults, setBatchResults]       = useState<{ idx: number; success: boolean; msg: string }[]>([]);
  const [defaultFeeStr, setDefaultFeeStr]     = useState('');
  const didAutoInitBatchRef                   = useRef(false);

  /* ── assign driver modal ── */
  const [showAssign, setShowAssign]       = useState(false);
  const [assignDriverId, setAssignDriver] = useState<number | null>(null);
  const [assigning, setAssigning]         = useState(false);

  /* ── update status modal ── */
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [nextStatus, setNextStatus]           = useState<string>('picked-up');
  const [actualQtyInput, setActualQtyInput]   = useState<string>('');
  const [statusNote, setStatusNote]           = useState<string>('');
  const [updatingStatus, setUpdatingStatus]   = useState(false);

  /* ── print ref ── */
  const printRef = useRef<HTMLDivElement>(null);

  /* ── printed-at timestamp (client-only to avoid hydration mismatch) ── */
  const [printedAt, setPrintedAt] = useState('');
  useEffect(() => { setPrintedAt(new Date().toLocaleString()); }, []);

  /* ────────────────────────────── load ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, drvRes, zoneRes] = await Promise.all([
        api.get(`/parcels/pickup-requests/${id}`),
        api.get('/drivers/available'),
        api.get('/zones'),
      ]);
      const reqData = reqRes.data;
      const zonesData: any[] = zoneRes.data?.data ?? zoneRes.data ?? [];
      const existingParcels = reqData.parcels ?? reqData.orders ?? [];
      setRequest(reqData);
      setParcels(existingParcels);
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
      let resolvedFeeStr = '';
      if (fee !== '' && fee != null) {
        const num = parseFloat(String(fee));
        resolvedFeeStr = !isNaN(num) ? num.toFixed(2) : String(fee);
        setDefaultFeeStr(resolvedFeeStr);
        setForm(f => ({ ...f, deliveryFee: resolvedFeeStr }));
      }

      const assignedPickupId = reqData.pickupDriverId
        ? String(reqData.pickupDriverId)
        : (reqData.pickupDriver?.id ? String(reqData.pickupDriver.id) : '');

      /* Option 1: Auto-open Batch Entry & auto-generate pre-filled rows when pickup succeeded */
      const targetQty = reqData.actualQuantity || reqData.declaredQuantity || 0;
      const remaining = Math.max(0, targetQty - existingParcels.length);

      if (!didAutoInitBatchRef.current && reqData.status === 'picked-up' && remaining > 0) {
        didAutoInitBatchRef.current = true;
        const count = Math.min(remaining, 30);
        setEntryTab('batch');
        setBatchRows(
          Array.from({ length: count }, () =>
            emptyBatchRow({ deliveryFee: resolvedFeeStr, pickupDriverId: assignedPickupId }),
          ),
        );
      } else {
        setBatchRows(rows =>
          rows.map((r, i) =>
            i === 0
              ? {
                  ...r,
                  deliveryFee: r.deliveryFee || resolvedFeeStr,
                  pickupDriverId: r.pickupDriverId || assignedPickupId,
                }
              : r,
          ),
        );
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
      await api.patch(`/parcels/pickup-requests/${id}/assign-driver`, { pickupDriverId: assignDriverId });
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
    if (isPhoneExceedingMaxDigits(form.receiverPhone)) { setFormError(getPhoneMaxDigitsError(lang)); return; }
    if (!form.receiverAddress.trim()) { setFormError('Receiver address is required'); return; }
    if (!form.zoneId) { setFormError('Zone is required'); return; }
    // capacity check
    const declaredQty = request?.declaredQuantity ?? 0;
    if (declaredQty > 0 && parcels.length >= declaredQty) {
      setFormError(`Cannot add more parcels — declared quantity is ${declaredQty} and all slots are filled.`);
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      await api.post(`/parcels/pickup-requests/${id}/parcels`, {
        receiverName:    form.receiverName.trim(),
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
  const getBatchDefaults = () => ({
    deliveryFee: defaultFeeStr,
    pickupDriverId: request?.pickupDriverId
      ? String(request.pickupDriverId)
      : (request?.pickupDriver?.id ? String(request.pickupDriver.id) : ''),
  });

  const addBatchRow = () => {
    const declaredQty = request?.declaredQuantity ?? 0;
    if (declaredQty > 0 && parcels.length + batchRows.length >= declaredQty) {
      alert(
        lang === 'km'
          ? `មិនអាចបន្ថែមជួរបានទៀតទេ — នៅសល់តែ ${Math.max(0, declaredQty - parcels.length)} កញ្ចប់ប៉ុណ្ណោះ។`
          : `Cannot add more rows — only ${Math.max(0, declaredQty - parcels.length)} slot(s) remaining.`,
      );
      return;
    }
    setBatchRows(r => [...r, emptyBatchRow(getBatchDefaults())]);
  };

  const generateRemainingBatchRows = () => {
    const targetQty = request?.actualQuantity || request?.declaredQuantity || 0;
    const remaining = Math.max(1, Math.min(targetQty - parcels.length, 30));
    const defaults = getBatchDefaults();
    setBatchRows(Array.from({ length: remaining }, () => emptyBatchRow(defaults)));
    setBatchResults([]);
  };

  const removeBatchRow = (idx: number) =>
    setBatchRows(r => r.length === 1 ? r : r.filter((_, i) => i !== idx));

  const updateBatchRow = (idx: number, field: string, value: string) => {
    const nextValue = field === 'receiverPhone' ? sanitizePhoneInput(value) : value;
    setBatchRows(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      const updated = { ...row, [field]: nextValue };
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
    const exceeding = batchRows.findIndex(r => isPhoneExceedingMaxDigits(r.receiverPhone));
    if (exceeding !== -1) {
      alert(`Row ${exceeding + 1}: ${getPhoneMaxDigitsError(lang)}`);
      return;
    }
    // capacity check
    const declaredQty = request?.declaredQuantity ?? 0;
    if (declaredQty > 0 && parcels.length + batchRows.length > declaredQty) {
      const remaining = declaredQty - parcels.length;
      alert(`Cannot save — only ${remaining} slot(s) remaining out of declared ${declaredQty}. Please remove ${batchRows.length - remaining} row(s).`);
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
        await api.post(`/parcels/pickup-requests/${id}/parcels`, {
          receiverName:    '',
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
      await api.delete(`/parcels/pickup-requests/${id}/parcels/${parcelId}`);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete parcel');
    }
  };

  /* ────────────────────────────── update status (admin) ── */
  const openStatusModal = () => {
    if (!request) return;
    const defaultNext =
      request.status === 'pending' || request.status === 'assigned'
        ? 'picked-up'
        : request.status;
    setNextStatus(defaultNext);
    setActualQtyInput(
      request.actualQuantity != null
        ? String(request.actualQuantity)
        : request.declaredQuantity != null
          ? String(request.declaredQuantity)
          : '',
    );
    setStatusNote(request.driverNote || '');
    setShowStatusModal(true);
  };

  const handleUpdateStatus = async () => {
    if (!nextStatus) return;
    setUpdatingStatus(true);
    try {
      const payload: Record<string, any> = {
        status: nextStatus,
        driverNote: statusNote.trim() || undefined,
      };
      if (actualQtyInput !== '' && !isNaN(Number(actualQtyInput))) {
        payload.actualQuantity = Math.max(0, Math.floor(Number(actualQtyInput)));
      }
      await api.patch(`/parcels/pickup-requests/${id}/status`, payload);
      setShowStatusModal(false);
      if (nextStatus === 'picked-up') {
        didAutoInitBatchRef.current = false;
      }
      setSuccessMsg(
        lang === 'km'
          ? 'បានធ្វើបច្ចុប្បន្នភាពស្ថានភាពសំណើប្រមូលដោយជោគជ័យ!'
          : 'Pickup request status updated successfully!',
      );
      setTimeout(() => setSuccessMsg(''), 4000);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message || (lang === 'km' ? 'មិនអាចធ្វើបច្ចុប្បន្នភាពស្ថានភាពបានទេ' : 'Failed to update status'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  /* ────────────────────────────── print ── */
  const handlePrint = () => {
    const el = document.getElementById('waybill-print');
    if (!el) return;

    const existingRoot = document.getElementById('waybill-print-root');
    if (existingRoot) existingRoot.remove();

    const printRoot = document.createElement('div');
    printRoot.id = 'waybill-print-root';
    printRoot.innerHTML = el.innerHTML;
    document.body.appendChild(printRoot);

    const style = document.createElement('style');
    style.id = 'waybill-print-style';
    style.textContent = `
      @media screen {
        #waybill-print-root { display: none !important; }
      }
      @media print {
        body > *:not(#waybill-print-root) { display: none !important; }
        #waybill-print-root { display: block !important; width: 100% !important; background: #ffffff !important; }
        @page { size: A4 portrait; margin: 10mm; }
      }
    `;
    document.head.appendChild(style);

    const cleanup = () => {
      printRoot.remove();
      style.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
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
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-outline" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MdRefresh size={16} /> {lang === 'km' ? 'ផ្ទុកឡើងវិញ' : 'Refresh'}
              </button>
              {(request?.status === 'pending' || request?.status === 'assigned') && (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setShowAssign(true)}
                  >
                    <MdDirectionsBike size={16} /> {t('assignDriverTitle')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={openStatusModal}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0f766e', borderColor: '#0f766e' }}
                  >
                    <MdSync size={16} /> {lang === 'km' ? 'ប្តូរស្ថានភាព' : 'Update Status'}
                  </button>
                </>
              )}
              <button
                type="button"
                className="btn btn-outline"
                onClick={handlePrint}
              >
                <MdPrint size={16} /> {t('printWaybill')}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-wrapper"><div className="spinner" /></div>
          ) : !request ? (
            <div className="empty-state"><div className="empty-state-title">{lang === 'km' ? 'រកមិនឃើញសំណើនេះទេ' : 'Request not found'}</div></div>
          ) : (
            <>
              {/* ── Success toast ── */}
              {successMsg && (
                <div style={{ marginBottom: 16, padding: '12px 18px', borderRadius: 10, background: '#dcfce7', color: '#16a34a', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MdCheckCircle size={18} /> {successMsg}
                </div>
              )}

              {/* ── Clean Balanced Summary Card ── */}
              <div className="card" style={{ marginBottom: 20, padding: '20px 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, alignItems: 'start' }}>
                  {/* 1. Request Info */}
                  <div style={{ paddingRight: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.03em', marginBottom: 12 }}>
                      {lang === 'km' ? 'ព័ត៌មានសំណើ' : 'REQUEST INFO'}
                    </div>
                    <InfoRow label={lang === 'km' ? 'លេខសំណើ' : 'Request ID'} value={<span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent, #1565D8)' }}>#{request.id}</span>} />
                    <InfoRow label={t('status')} value={<StatusBadge status={request.status} lang={lang} />} />
                    <InfoRow label={t('merchant')} value={<><span style={{ fontWeight: 700 }}>{request.merchant?.name}</span>{request.merchant?.nameKh && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>({request.merchant.nameKh})</span>}</>} />
                    <InfoRow label={t('location')} value={request.pickupAddress && request.pickupAddress.trim() !== '=' ? request.pickupAddress : '—'} />
                    <InfoRow label={t('scheduledAt')} value={formatDate(request.pickupTime) || '—'} />
                    {request.pickedUpAt && <InfoRow label={t('pickedUpAt')} value={formatDate(request.pickedUpAt)} />}
                    {request.note && <InfoRow label={t('note')} value={request.note} />}
                    {request.driverNote && <InfoRow label={lang === 'km' ? 'កំណត់ចំណាំអ្នកប្រមូលកញ្ចប់' : 'Pickup Rider Note'} value={<span style={{ color: '#16a34a' }}>{request.driverNote}</span>} />}
                  </div>

                  {/* 2. Pickup Driver */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.03em', marginBottom: 12 }}>
                      {lang === 'km' ? 'អ្នកប្រមូលកញ្ចប់' : 'PICKUP RIDER'}
                    </div>
                    {request.pickupDriver ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--accent, #1565D8)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 17, flexShrink: 0 }}>
                          {request.pickupDriver.name?.charAt(0)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14.5, color: '#0f172a' }}>{request.pickupDriver.name}</div>
                          {request.pickupDriver.nameKh && <div style={{ fontSize: 12, color: '#64748b' }}>{request.pickupDriver.nameKh}</div>}
                          {request.pickupDriver.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
                              <MdPhone size={13} color="#94a3b8" />
                              <span>{request.pickupDriver.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px', borderRadius: 12, background: '#fffbeb', border: '1px dashed #fcd34d', color: '#b45309', fontSize: 13.5, fontWeight: 600 }}>
                        <MdWarningAmber size={18} style={{ flexShrink: 0 }} />
                        <span>{lang === 'km' ? 'មិនទាន់មានអ្នកប្រមូលកញ្ចប់' : 'No pickup rider assigned'}</span>
                      </div>
                    )}
                  </div>

                  {/* 3. Progress */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.03em', marginBottom: 12 }}>
                      {t('batchProgress')}
                    </div>
                    <div style={{ padding: '16px 18px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                          {lang === 'km' ? 'បានទទួល / ប្រកាស' : 'Inbounded / Declared'}
                        </span>
                        <span style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>{completed} / {declared || '—'}</span>
                      </div>
                      <div style={{ height: 7, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden', marginBottom: 10 }}>
                        <div style={{ width: `${progress}%`, height: '100%', borderRadius: 999, background: progress >= 100 ? '#16a34a' : 'var(--accent, #1565D8)', transition: 'width 0.4s' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                        <span style={{ color: '#64748b' }}>
                          {lang === 'km' ? `សម្រេចបាន ${progress}%` : `${progress}% complete`}
                        </span>
                        {request.actualQuantity && (
                          <span style={{ color: 'var(--accent, #1565D8)', fontWeight: 700 }}>
                            {lang === 'km' ? `ជាក់ស្តែង: ${request.actualQuantity}` : `Actual: ${request.actualQuantity}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 4. Package / Goods Photos */}
                  {(request.photo || (request.photos && request.photos.length > 0)) && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.03em', marginBottom: 12 }}>
                        {lang === 'km' ? 'រូបភាពកញ្ចប់' : 'PACKAGE PHOTOS'}
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '12px 14px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0', flex: 1, alignItems: 'center' }}>
                        {(request.photos && request.photos.length > 0 ? request.photos : [request.photo]).map((src: string, idx: number) => (
                          <div
                            key={idx}
                            onClick={() => setPreviewModalImg(src)}
                            style={{
                              width: 64,
                              height: 64,
                              borderRadius: 10,
                              overflow: 'hidden',
                              border: '1.5px solid #e2e8f0',
                              cursor: 'pointer',
                              background: '#ffffff',
                            }}
                            title={lang === 'km' ? 'ចុចដើម្បីពង្រីក' : 'Click to view'}
                          >
                            <img src={src} alt={`Goods ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5. Driver Pickup Proof Photos */}
                  {(request.pickupProofPhoto || (request.pickupProofPhotos && request.pickupProofPhotos.length > 0)) && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#16a34a', letterSpacing: '0.03em', marginBottom: 12 }}>
                        <MdPhotoCamera size={14} />
                        <span>{lang === 'km' ? 'រូបភាពភស្តុតាងទៅយក' : 'PICKUP PROOF'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '12px 14px', borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', flex: 1, alignItems: 'center' }}>
                        {(request.pickupProofPhotos && request.pickupProofPhotos.length > 0 ? request.pickupProofPhotos : [request.pickupProofPhoto]).map((src: string, idx: number) => (
                          <div
                            key={idx}
                            onClick={() => setPreviewModalImg(src)}
                            style={{
                              width: 64,
                              height: 64,
                              borderRadius: 10,
                              overflow: 'hidden',
                              border: '1.5px solid #86efac',
                              cursor: 'pointer',
                              background: '#ffffff',
                            }}
                            title={lang === 'km' ? 'ចុចដើម្បីពង្រីក' : 'Click to view driver proof'}
                          >
                            <img src={src} alt={`Proof ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Layout: full-width when completed/cancelled/full or batch; side-by-side when entering single ── */}
              {(() => {
                const isFullOrClosed =
                  (declared > 0 && completed >= declared) ||
                  request.status === 'completed' ||
                  request.status === 'cancelled';
                return (
              <div style={{ display: 'grid', gridTemplateColumns: (entryTab === 'batch' || isFullOrClosed) ? '1fr' : '1fr 380px', gap: 20, alignItems: 'start' }}>

                {/* ── Parcels list ── */}
                <div className="card" style={{ overflow: 'hidden' }}>
                  <div className="card-header" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--accent-light, #eff6ff)', color: 'var(--accent, #1565D8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MdWarehouse size={18} />
                      </div>
                      <div>
                        <span className="card-title" style={{ fontSize: 15 }}>{t('parcelsInBatch')}</span>
                        <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 1 }}>
                          {lang === 'km' ? `បានចុះឈ្មោះ ${completed} កញ្ចប់` : `${completed} parcel(s) registered`}
                        </div>
                      </div>
                    </div>
                    {isFullOrClosed && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '5px 12px',
                          borderRadius: 999,
                          fontSize: 12.5,
                          fontWeight: 700,
                          background: request.status === 'cancelled' ? '#fee2e2' : '#dcfce7',
                          color: request.status === 'cancelled' ? '#dc2626' : '#16a34a',
                        }}
                      >
                        {request.status === 'cancelled' ? (
                          <><MdLock size={14} /> {lang === 'km' ? 'បានលុបចោល' : 'Cancelled'}</>
                        ) : (
                          <><MdCheckCircle size={15} /> {lang === 'km' ? `គ្រប់ចំនួន (${completed}/${declared || completed})` : `Completed (${completed}/${declared || completed})`}</>
                        )}
                      </span>
                    )}
                  </div>

                  {parcels.length === 0 ? (
                    <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                      <div style={{ width: 52, height: 52, borderRadius: 14, background: '#f1f5f9', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                        <MdInventory2 size={26} />
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 4 }}>{t('noParcelsYet')}</div>
                      <div style={{ fontSize: 13.5, color: '#64748b' }}>{t('noParcelsYetText')}</div>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg-primary)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                          <tr>
                            <th style={{ width: 60, textAlign: 'center' }}>{t('colNo')}</th>
                            <th>{t('trackingCode')}</th>
                            <th>{t('receiverName')}</th>
                            <th>{t('receiverPhone')}</th>
                            <th>{t('zone')}</th>
                            <th style={{ textAlign: 'right' }}>{t('cod')}</th>
                            <th style={{ textAlign: 'right' }}>{t('deliveryFee')}</th>
                            <th style={{ textAlign: 'center' }}>{t('status')}</th>
                            <th style={{ width: 70, textAlign: 'center' }}>{t('actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parcels.map((p: any, idx: number) => (
                            <tr key={p.id}>
                              <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: 12.5 }}>{idx + 1}</td>
                              <td>
                                <code style={{ fontSize: 12, background: 'var(--accent-light, #eff6ff)', color: 'var(--accent, #1565D8)', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                                  {p.trackingCode}
                                </code>
                              </td>
                              <td style={{ fontWeight: 600, fontSize: 13, color: p.receiverName ? '#0f172a' : '#94a3b8' }}>
                                {p.receiverName || '—'}
                              </td>
                              <td style={{ fontWeight: 600, fontSize: 13, fontFamily: 'monospace' }}>{p.receiverPhone || '—'}</td>
                              <td style={{ fontSize: 12.5, color: p.zone?.name ? '#334155' : '#94a3b8' }}>
                                {p.zone?.name || '—'}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13 }}>
                                {formatCOD(p.cod, p.codCurrency) || <span style={{ color: '#94a3b8', fontWeight: 500 }}>—</span>}
                              </td>
                              <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 700, fontSize: 13 }}>
                                ${parseFloat(p.deliveryFee || 0).toFixed(2)}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: 11.5, padding: '3px 10px', borderRadius: 999, fontWeight: 700, background: getParcelStatusBadgeColor(p.status), color: '#fff', display: 'inline-block' }}>
                                  {getParcelStatusLabel(p.status, lang)}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  onClick={() => handleDeleteParcel(p.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 6, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                  title={lang === 'km' ? 'លុបកញ្ចប់' : 'Delete parcel'}
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

                {/* ── Tabbed panel: Single / Batch Entry (hidden when completed/cancelled/full) ── */}
                {!isFullOrClosed && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

                  {declared > 0 && completed >= declared ? (
                    /* ── CAPACITY FULL BANNER ── */
                    <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                      <div style={{ width: 52, height: 52, borderRadius: 14, background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                        <MdLock size={24} />
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 15.5, color: '#dc2626', marginBottom: 6 }}>
                        {lang === 'km' ? 'គ្រប់ចំនួនកញ្ចប់ដែលបានប្រកាសហើយ' : 'Declared Quantity Reached'}
                      </div>
                      <div style={{ fontSize: 13, color: '#64748b', maxWidth: 280, margin: '0 auto', lineHeight: 1.6 }}>
                        {lang === 'km'
                          ? `បានចុះឈ្មោះគ្រប់ ${declared} កញ្ចប់ហើយ។ សូមលុបកញ្ចប់ណាមួយសិន ប្រសិនបើចង់បន្ថែមថ្មី។`
                          : `All ${declared} declared parcel(s) have been registered. Remove an existing parcel first to add a new one.`}
                      </div>
                    </div>
                  ) : (
                    <>
                  {/* Tab switcher */}
                  <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
                    {(['single', 'batch'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => { setEntryTab(tab); setBatchResults([]); }}
                        style={{
                          flex: 1,
                          padding: '13px 0',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: 13.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          background: entryTab === tab ? '#ffffff' : '#f8fafc',
                          color: entryTab === tab ? 'var(--accent, #1565D8)' : '#64748b',
                          borderBottom: entryTab === tab ? '2.5px solid var(--accent, #1565D8)' : '2.5px solid transparent',
                          transition: 'all 0.2s',
                        }}
                      >
                        {tab === 'single' ? (
                          <>
                            <MdAdd size={16} />
                            <span>{lang === 'km' ? 'បន្ថែមម្តងមួយ' : 'Add Single'}</span>
                          </>
                        ) : (
                          <>
                            <MdBolt size={16} />
                            <span>{lang === 'km' ? 'បញ្ចូលជាបណ្តុំ' : 'Batch Entry'}</span>
                          </>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* ── SINGLE TAB ── */}
                  {entryTab === 'single' && (
                    <div style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-light, #eff6ff)', color: 'var(--accent, #1565D8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <MdAdd size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{t('addParcelTitle')}</div>
                          <div style={{ fontSize: 12.5, color: '#64748b' }}>
                            {lang === 'km' ? 'បំពេញព័ត៌មានកញ្ចប់ខាងក្រោម' : 'Fill in parcel details below'}
                          </div>
                        </div>
                      </div>

                      {formError && (
                        <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: '#fee2e2', color: '#dc2626', fontWeight: 600, fontSize: 13 }}>
                          {formError}
                        </div>
                      )}

                      <form onSubmit={handleAddParcel} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <FormField label={t('receiverName')}>
                          <input type="text" value={form.receiverName} onChange={e => setForm(f => ({ ...f, receiverName: e.target.value }))} placeholder={lang === 'km' ? 'បញ្ចូលឈ្មោះអ្នកទទួល' : 'Customer name'} style={inputStyle} />
                        </FormField>
                        <FormField label={`${t('receiverPhone')} *`}>
                          <input type="text" inputMode="tel" value={form.receiverPhone} onChange={e => setForm(f => ({ ...f, receiverPhone: sanitizePhoneInput(e.target.value) }))} placeholder={lang === 'km' ? 'ឧ. 012345678' : 'e.g. 012345678'} required style={inputStyle} />
                        </FormField>
                        <FormField label={`${t('receiverAddress')} *`}>
                          <input type="text" value={form.receiverAddress} onChange={e => setForm(f => ({ ...f, receiverAddress: e.target.value }))} placeholder={lang === 'km' ? 'បញ្ចូលអាសយដ្ឋានដឹកជញ្ជូន' : 'Delivery address'} required style={inputStyle} />
                        </FormField>

                        <FormField label={`${t('deliveryFee')} ($)`}>
                          <input type="number" min="0" step="0.01" value={form.deliveryFee} onChange={e => setForm(f => ({ ...f, deliveryFee: e.target.value }))} placeholder="0.00" style={inputStyle} />
                        </FormField>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <FormField label={t('cod')}>
                            <input type="number" min="0" step="0.01" value={form.cod} onChange={e => setForm(f => ({ ...f, cod: e.target.value }))} placeholder="0" style={inputStyle} />
                          </FormField>
                          <FormField label={lang === 'km' ? 'រូបិយប័ណ្ណ' : 'Currency'}>
                            <select value={form.codCurrency} onChange={e => setForm(f => ({ ...f, codCurrency: e.target.value }))} style={inputStyle}>
                              <option value="USD">USD</option>
                              <option value="KHR">KHR</option>
                            </select>
                          </FormField>
                        </div>
                        <FormField label={t('note')}>
                          <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder={lang === 'km' ? 'ចំណាំបន្ថែម (ជាជម្រើស)' : 'Optional note'} style={inputStyle} />
                        </FormField>
                        <button type="submit" className="btn btn-primary w-full" disabled={submitting} style={{ marginTop: 4, padding: '12px', borderRadius: 10, fontWeight: 700, fontSize: 14.5 }}>
                          <MdAdd size={18} />{submitting ? (lang === 'km' ? 'កំពុងបន្ថែម...' : 'Adding...') : t('addParcel')}
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
                            <tr style={{ background: 'var(--sidebar-bg, #1565D8)' }}>
                              {[
                                { label: lang === 'km' ? 'ល.រ' : 'No.', w: 44 },
                                { label: lang === 'km' ? 'អាសយដ្ឋានអ្នកទទួល *' : 'Receiver Address *', w: undefined },
                                { label: lang === 'km' ? 'ទូរស័ព្ទអ្នកទទួល *' : 'Receiver Phone *', w: 150 },
                                { label: lang === 'km' ? 'សេវាដឹក ($)' : 'Delivery Fee', w: 110 },
                                { label: lang === 'km' ? 'COD ($)' : 'Amount ($)', w: 100 },
                                { label: lang === 'km' ? 'COD (៛)' : 'Amount (៛)', w: 100 },
                                { label: lang === 'km' ? 'អ្នកប្រមូលកញ្ចប់' : 'Pickup Person', w: 160 },
                                { label: lang === 'km' ? 'អ្នកដឹកជញ្ជូន' : 'Delivery Person', w: 160 },
                                { label: lang === 'km' ? 'ចំណាំ' : 'Note', w: undefined },
                                { label: lang === 'km' ? 'លុប' : 'Actions', w: 64 },
                              ].map(({ label, w }) => (
                                <th key={label} style={{ padding: '11px 10px', fontSize: 12.5, fontWeight: 700, color: '#fff', textAlign: 'left', whiteSpace: 'nowrap', width: w }}>{label}</th>
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
                                      type="text" inputMode="tel" value={row.receiverPhone}
                                      onChange={e => updateBatchRow(idx, 'receiverPhone', sanitizePhoneInput(e.target.value))}
                                      placeholder="e.g. 012345678"
                                      style={{ ...batchCellStyle, width: '100%', borderColor: (!row.receiverPhone.trim() || isPhoneExceedingMaxDigits(row.receiverPhone)) ? '#fca5a5' : '#cbd5e1' }}
                                    />
                                  </td>
                                  {/* Delivery Fee */}
                                  <td style={{ padding: '6px 6px' }}>
                                    <input
                                      type="number" min="0" step="0.01" value={row.deliveryFee}
                                      onChange={e => updateBatchRow(idx, 'deliveryFee', e.target.value)}
                                      onBlur={e => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) updateBatchRow(idx, 'deliveryFee', val.toFixed(2));
                                      }}
                                      placeholder="1.25"
                                      style={{ ...batchCellStyle, width: '100%' }}
                                    />
                                  </td>
                                  {/* Amount USD */}
                                  <td style={{ padding: '6px 6px' }}>
                                    <input
                                      type="number" min="0" step="0.01" value={row.amountUSD}
                                      onChange={e => updateBatchRow(idx, 'amountUSD', e.target.value)}
                                      onBlur={e => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) updateBatchRow(idx, 'amountUSD', val.toFixed(2));
                                      }}
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
                                      <option value="">{lang === 'km' ? '— ជ្រើសរើសអ្នកប្រមូលកញ្ចប់ —' : '— Select Pickup Rider —'}</option>
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
                                      <option value="">{lang === 'km' ? '— ជ្រើសរើសអ្នកដឹកជញ្ជូន —' : '— Select Rider —'}</option>
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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={addBatchRow}
                            style={{ padding: '9px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13 }}
                          >
                            <MdAdd size={16} /> {lang === 'km' ? 'បន្ថែមជួរថ្មី' : 'Add Row'}
                          </button>
                          {((request?.actualQuantity || request?.declaredQuantity || 0) - parcels.length) > 1 && (
                            <button
                              type="button"
                              className="btn btn-outline"
                              onClick={generateRemainingBatchRows}
                              style={{ padding: '9px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, color: 'var(--accent, #1565D8)', borderColor: 'var(--accent, #1565D8)' }}
                            >
                              <MdBolt size={16} />{' '}
                              {lang === 'km'
                                ? `បង្កើតជួរតាមចំនួននៅសល់ (${Math.min((request?.actualQuantity || request?.declaredQuantity || 0) - parcels.length, 30)})`
                                : `Fill Remaining (${Math.min((request?.actualQuantity || request?.declaredQuantity || 0) - parcels.length, 30)} rows)`}
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleBatchSubmit}
                          disabled={batchSubmitting}
                          style={{ padding: '9px 32px', borderRadius: 8, fontWeight: 700, fontSize: 13.5 }}
                        >
                          {batchSubmitting
                            ? (lang === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...')
                            : (lang === 'km' ? `រក្សាទុកទាំងអស់ (${batchRows.length})` : `Save All (${batchRows.length})`)}
                        </button>
                      </div>
                    </div>
                  )}
                    </>
                  )}
                </div>
                )}
              </div>
                );
              })()}
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
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{lang === 'km' ? `ជ្រើសរើសអ្នកប្រមូលកញ្ចប់សម្រាប់សំណើ #${id}` : `Select a pickup rider for pickup request #${id}`}</div>
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
              type="button"
              className="btn btn-primary w-full"
              onClick={handleAssignDriver}
              disabled={!assignDriverId || assigning}
              style={{ marginTop: 20, width: '100%', padding: '13px', borderRadius: 10, fontWeight: 700, fontSize: 14 }}
            >
              {assigning ? 'Assigning...' : t('assignDriver')}
            </button>
          </div>
        </div>
      )}

      {/* ════════════════ Update Status Modal ════════════════ */}
      {showStatusModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(0,0,0,0.2)', position: 'relative' }}>
            <button
              onClick={() => setShowStatusModal(false)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
            >
              <MdClose size={22} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ccfbf1', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MdSync size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17 }}>
                  {lang === 'km' ? 'ប្តូរស្ថានភាពសំណើប្រមូល' : 'Update Pickup Request Status'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {lang === 'km' ? `សំណើលេខ #${id}` : `Pickup Request #${id}`}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {(['pending', 'assigned', 'picked-up', 'in-warehouse', 'completed', 'cancelled'] as const).map((st) => {
                const selected = nextStatus === st;
                const sc = STATUS_COLORS[st] ?? { bg: '#f1f5f9', color: '#475569' };
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setNextStatus(st)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: `2px solid ${selected ? sc.color : 'var(--border)'}`,
                      background: selected ? sc.bg : 'var(--bg-primary)',
                      color: selected ? sc.color : 'var(--text-primary)',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span>{getPickupRequestStatusLabel(st, lang)}</span>
                    {selected && <MdCheckCircle size={18} />}
                  </button>
                );
              })}
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label" style={{ fontSize: 12.5, fontWeight: 600 }}>
                {lang === 'km' ? 'ចំនួនកញ្ចប់ជាក់ស្តែង (Actual Quantity)' : 'Actual Quantity'}
              </label>
              <input
                type="number"
                min={0}
                className="form-control"
                value={actualQtyInput}
                onChange={(e) => setActualQtyInput(e.target.value)}
                placeholder={String(request?.declaredQuantity ?? 0)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontSize: 12.5, fontWeight: 600 }}>
                {lang === 'km' ? 'កំណត់ចំណាំ (ស្រេចចិត្ត)' : 'Note (Optional)'}
              </label>
              <input
                type="text"
                className="form-control"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder={lang === 'km' ? 'ឧ. ហាងយកមកដាក់ឃ្លាំងផ្ទាល់...' : 'e.g. Dropped off at warehouse...'}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={handleUpdateStatus}
              disabled={updatingStatus}
              style={{ width: '100%', padding: '12px', borderRadius: 10, fontWeight: 700, fontSize: 14 }}
            >
              {updatingStatus
                ? (lang === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...')
                : (lang === 'km' ? 'រក្សាទុកស្ថានភាពថ្មី' : 'Save Status')}
            </button>
          </div>
        </div>
      )}

      {/* ════════════════ Hidden Waybill Print ════════════════ */}
      <div id="waybill-print" style={{ display: 'none' }} ref={printRef}>
        <div style={{ fontFamily: "'Inter', 'Battambang', sans-serif", padding: 12, color: '#0f172a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: 10, marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>
                {lang === 'km' ? `បញ្ជីវិក្កយបត្រសំណើប្រមូល — #${id}` : `Pickup Request Waybills — #${id}`}
              </h2>
              <div style={{ fontSize: 12.5, color: '#475569' }}>
                {lang === 'km' ? 'ហាង៖' : 'Merchant:'} <strong>{request?.merchant?.nameKh || request?.merchant?.name || '—'}</strong>
                {request?.pickupDriver && (
                  <> · {lang === 'km' ? 'អ្នកប្រមូល៖' : 'Rider:'} <strong>{request.pickupDriver.nameKh || request.pickupDriver.name}</strong></>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, color: '#475569' }}>
              <div>{lang === 'km' ? 'ចំនួនប្រកាស៖' : 'Declared:'} <strong>{declared}</strong> · {lang === 'km' ? 'បានចុះឈ្មោះ៖' : 'Registered:'} <strong>{completed}</strong></div>
              <div>{lang === 'km' ? 'បោះពុម្ពនៅ៖' : 'Printed:'} {printedAt}</div>
            </div>
          </div>

          {parcels.length === 0 ? (
            <div style={{ border: '1.5px dashed #cbd5e1', borderRadius: 10, padding: '24px 16px', textAlign: 'center', fontSize: 13.5, color: '#64748b' }}>
              {lang === 'km'
                ? 'មិនទាន់មានកញ្ចប់ត្រូវបានចុះឈ្មោះក្នុងសំណើនេះទេ។'
                : 'No parcels have been registered in this pickup request yet.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {parcels.map((p: any, idx: number) => (
                <div key={p.id} style={{ border: '1.5px solid #cbd5e1', borderRadius: 10, padding: 14, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: 800, fontSize: 15 }}>#{idx + 1}</span>
                    <code style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace' }}>{p.trackingCode}</code>
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>
                    <div><b>{lang === 'km' ? 'ពីហាង៖' : 'From:'}</b> {request?.merchant?.nameKh || request?.merchant?.name || '—'}</div>
                    <div><b>{lang === 'km' ? 'អ្នកទទួល៖' : 'To:'}</b> {[p.receiverName, p.receiverPhone].filter(Boolean).join(' · ')}</div>
                    <div><b>{lang === 'km' ? 'អាសយដ្ឋាន៖' : 'Address:'}</b> {p.receiverAddress}</div>
                    {p.zone?.name && <div><b>{lang === 'km' ? 'តំបន់៖' : 'Zone:'}</b> {p.zone.name}</div>}
                    <div><b>COD:</b> {formatCOD(p.cod, p.codCurrency)} · <b>{lang === 'km' ? 'សេវាដឹក៖' : 'Fee:'}</b> ${parseFloat(p.deliveryFee || 0).toFixed(2)}</div>
                    {p.note && <div><b>{lang === 'km' ? 'ចំណាំ៖' : 'Note:'}</b> {p.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox / Zoom Modal */}
      {previewModalImg && (
        <div
          onClick={() => setPreviewModalImg(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '85vh',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewModalImg}
              alt="Enlarged Goods"
              style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', display: 'block' }}
            />
            <button
              onClick={() => setPreviewModalImg(null)}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MdClose size={22} />
            </button>
          </div>
        </div>
      )}
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
