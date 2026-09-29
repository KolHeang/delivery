'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';
import api from '@/lib/api';
import {
  MdAssignmentReturn,
  MdCheckCircle,
  MdWarning,
  MdSearch,
  MdRefresh,
  MdRestore,
  MdDeleteForever,
} from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';

export default function ReturnsHubPage() {
  const router = useRouter();
  const { lang } = useLanguage();

  const [parcels, setParcels] = useState<any[]>([]);
  const [totalParcels, setTotalParcels] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Restock Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<any>(null);
  const [parcelItems, setParcelItems] = useState<any[]>([]);
  const [actionType, setActionType] = useState<'RESTOCK' | 'DAMAGED'>('RESTOCK');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/auth');
    }
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadReturns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/parcels', {
        params: {
          page: currentPage,
          limit: pageSize,
          search: debouncedSearch || undefined,
          status: 'failed',
        },
      });

      const data = res.data?.result || res.data || [];
      setParcels(Array.isArray(data) ? data : []);
      setTotalParcels(res.data?.total || (Array.isArray(data) ? data.length : 0));
    } catch (err) {
      console.error('Failed to load returned parcels:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch]);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  const handleOpenRestock = async (parcel: any) => {
    setSelectedParcel(parcel);
    setActionType('RESTOCK');
    setNote('');
    setModalOpen(true);
    try {
      const res = await api.get(`/inventory/parcels/${parcel.id}/items`);
      setParcelItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load items:', err);
      setParcelItems([]);
    }
  };

  const handleProcessRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParcel) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/inventory/parcels/${selectedParcel.id}/restock`, {
        action: actionType,
        note: note || undefined,
      });

      alert(
        res.data?.message ||
          (actionType === 'RESTOCK'
            ? (lang === 'km' ? 'បានបញ្ចូលទំនិញចូលស្តុកវិញដោយជោគជ័យ!' : 'Restocked successfully!')
            : (lang === 'km' ? 'បានកត់ត្រាទំនិញខូចខាត!' : 'Recorded as damaged!')),
      );

      setModalOpen(false);
      loadReturns();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to process restock');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar
          title={lang === 'km' ? 'ទទួលទំនិញត្រឡប់ចូលស្តុក (Returns & Restock)' : 'Returns & Restock Hub'}
          subtitle={lang === 'km' ? 'ត្រួតពិនិត្យ និងបញ្ចូលស្តុកឡើងវិញ' : 'Inspect and restock returned items'}
        />

        <div className="page-content">
          {/* Header Action Bar */}
          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">
                {lang === 'km' ? 'កញ្ចប់អីវ៉ាន់ត្រឡប់ & ដឹកមិនបាន' : 'Failed & Returned Parcels'}
              </h1>
              <p className="page-subtitle">
                {lang === 'km'
                  ? 'ត្រួតពិនិត្យកញ្ចប់អីវ៉ាន់ដែលដឹកមិនបានសម្រេច និងបញ្ចូលទំនិញមកក្នុងឃ្លាំងវិញ'
                  : 'Inspect failed deliveries and return items to inventory or record damages'}
              </p>
            </div>
            <div className="page-actions">
              <button
                className="btn btn-secondary"
                onClick={loadReturns}
              >
                <MdRefresh size={18} />
                {lang === 'km' ? 'ផ្ទុកឡើងវិញ' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Search Card */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-body" style={{ padding: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ position: 'relative' }}>
                  <MdSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 18 }} />
                  <input
                    type="text"
                    className="form-control"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={lang === 'km' ? 'ស្វែងរក Tracking, ឈ្មោះអតិថិជន, ឬលេខទូរស័ព្ទ...' : 'Search tracking code, receiver, phone...'}
                    style={{ paddingLeft: 38 }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Table Card */}
          <div className="card">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tracking Code</th>
                    <th>{lang === 'km' ? 'អ្នកទទួល' : 'Receiver'}</th>
                    <th>{lang === 'km' ? 'ហាង' : 'Merchant'}</th>
                    <th>{lang === 'km' ? 'អ្នកដឹក' : 'Driver'}</th>
                    <th style={{ textAlign: 'center' }}>{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                    <th>{lang === 'km' ? 'មូលហេតុមិនបាន' : 'Reason / Note'}</th>
                    <th style={{ textAlign: 'right' }}>{lang === 'km' ? 'សកម្មភាព' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '36px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                        {lang === 'km' ? 'កំពុងទាញយកទិន្នន័យ...' : 'Loading returned parcels...'}
                      </td>
                    </tr>
                  ) : parcels.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '36px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                        {lang === 'km' ? 'មិនមានកញ្ចប់ Return ឬដឹកមិនបានទេ' : 'No returned/failed parcels found'}
                      </td>
                    </tr>
                  ) : (
                    parcels.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          {p.trackingCode}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{p.receiverName}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.receiverPhone}</div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {p.merchant?.name || '—'}
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {p.driver?.name || '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <Badge status="danger" label={p.status} />
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                          {p.note || '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleOpenRestock(p)}
                          >
                            <MdAssignmentReturn size={16} />
                            {lang === 'km' ? 'ទទួលចូលស្តុក' : 'Receive / Restock'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalParcels > pageSize && (
              <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px' }}>
                <Pagination
                  currentPage={currentPage}
                  totalItems={totalParcels}
                  pageSize={pageSize}
                  onPageChange={(page) => setCurrentPage(page)}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Restock Inspection Modal */}
      {modalOpen && selectedParcel && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={`${lang === 'km' ? 'ត្រួតពិនិត្យទំនិញត្រឡប់' : 'Receive & Inspect Return'} - ${selectedParcel.trackingCode}`}
        >
          <form onSubmit={handleProcessRestock}>
            <div style={{ background: 'var(--bg-primary)', padding: 14, borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 16 }}>
              <div style={{ fontWeight: 700 }}>{selectedParcel.receiverName} ({selectedParcel.receiverPhone})</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{selectedParcel.receiverAddress}</div>
              {selectedParcel.note && (
                <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6, background: 'var(--danger-light)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                  <strong>{lang === 'km' ? 'កំណត់សម្គាល់បរាជ័យ:' : 'Failed Note:'}</strong> {selectedParcel.note}
                </div>
              )}
            </div>

            {/* Parcel Items */}
            <div style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontWeight: 700, marginBottom: 8, display: 'block' }}>
                {lang === 'km' ? 'មុខទំនិញក្នុងកញ្ចប់នេះ:' : 'Items in Parcel:'}
              </label>
              {parcelItems.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {lang === 'km' ? 'គ្មានទិន្នន័យទំនិញស្តុកភ្ជាប់ក្នុងកញ្ចប់នេះទេ' : 'No inventory items attached to this parcel'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {parcelItems.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: item.isRestocked ? 'var(--bg-primary)' : 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600 }}>{item.product?.name}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>(SKU: {item.product?.sku})</span>
                      </div>
                      <div style={{ fontWeight: 700, color: item.isRestocked ? 'var(--text-muted)' : 'var(--success)' }}>
                        {item.quantity} {item.product?.unit} {item.isRestocked && '• Restocked'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inspection Action Selection */}
            <div style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontWeight: 700, display: 'block', marginBottom: 8 }}>
                {lang === 'km' ? 'ជ្រើសរើសសកម្មភាពត្រួតពិនិត្យ (Inspection Action):' : 'Select Action:'}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div
                  onClick={() => setActionType('RESTOCK')}
                  style={{
                    padding: 12,
                    borderRadius: 'var(--radius)',
                    border: actionType === 'RESTOCK' ? '2px solid var(--success)' : '1px solid var(--border)',
                    background: actionType === 'RESTOCK' ? 'var(--success-light)' : 'var(--bg-card)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--success)' }}>
                    <MdRestore size={18} />
                    {lang === 'km' ? 'បញ្ចូលស្តុកវិញ (Restock)' : 'Restock to Inventory'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {lang === 'km' ? 'ទំនិញនៅមានសភាពល្អ អាចយកទៅលក់បន្តបាន' : 'Good condition, return to sellable stock'}
                  </div>
                </div>

                <div
                  onClick={() => setActionType('DAMAGED')}
                  style={{
                    padding: 12,
                    borderRadius: 'var(--radius)',
                    border: actionType === 'DAMAGED' ? '2px solid var(--danger)' : '1px solid var(--border)',
                    background: actionType === 'DAMAGED' ? 'var(--danger-light)' : 'var(--bg-card)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--danger)' }}>
                    <MdDeleteForever size={18} />
                    {lang === 'km' ? 'អីវ៉ាន់ខូចខាត (Damaged)' : 'Damaged / Write-Off'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {lang === 'km' ? 'ទំនិញបែកបាក់ ខូចខាត មិនអាចលក់បានទេ' : 'Damaged/broken, log as loss'}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                {lang === 'km' ? 'កំណត់សម្គាល់បន្ថែម' : 'Additional Notes'}
              </label>
              <textarea
                rows={2}
                className="form-control"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Received package from driver John, inspected packaging..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setModalOpen(false)}
              >
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`btn ${actionType === 'RESTOCK' ? 'btn-primary' : 'btn-danger'}`}
              >
                {submitting
                  ? (lang === 'km' ? 'កំពុងដំណើរការ...' : 'Processing...')
                  : actionType === 'RESTOCK'
                  ? (lang === 'km' ? 'បញ្ជាក់ការបញ្ចូលស្តុក' : 'Confirm Restock')
                  : (lang === 'km' ? 'បញ្ជាក់ទំនិញខូច' : 'Confirm Damaged')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
