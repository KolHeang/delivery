'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import api from '@/lib/api';
import { MdAdd, MdSearch, MdEdit, MdDelete, MdVisibility, MdFilterList, MdPrint } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';
import DateInput, { formatDateToDDMMYYYY, getLocalDateString } from '@/components/ui/DateInput';
import Pagination from '@/components/ui/Pagination';

const getLocalFirstDayOfMonthString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};
const STATUS_OPTIONS = ['all', 'pending', 'in-warehouse', 'assigned', 'picked-up', 'in-transit', 'delivered', 'failed', 'returned'];
const SIZE_OPTIONS = ['small', 'medium', 'large'];



const formatCOD = (cod: any, currency: string) => {
  if (currency === 'KHR') return `${parseInt(cod).toLocaleString()} ៛`;
  return `$${parseFloat(cod).toFixed(2)}`;
};

export default function DeliveriesPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState(() => getLocalFirstDayOfMonthString());
  const [endDate, setEndDate] = useState(() => getLocalDateString());
  const [driverFilter, setDriverFilter] = useState('');
  const [merchantFilter, setMerchantFilter] = useState('');
  const [viewModal, setViewModal] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleUpdatePickupDriver = async (orderId: number, driverId: string) => {
    try {
      const val = driverId ? parseInt(driverId) : null;
      await api.patch(`/orders/${orderId}`, { pickupDriverId: val });
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateDeliveryDriver = async (orderId: number, driverId: string) => {
    try {
      const val = driverId ? parseInt(driverId) : null;
      await api.patch(`/orders/${orderId}`, { driverId: val });
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleDeliveryStatus = async (orderId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'delivered' ? 'failed' : 'delivered';
    try {
      await api.patch(`/orders/${orderId}/status`, { status: nextStatus });
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');

    return `${day}/${month}/${year} ${hoursStr}:${minutes}:${seconds} ${ampm}`;
  };

  const getStatusLabel = (status: string) => {
    if (lang === 'en') {
      switch (status) {
        case 'pending': return 'Pending';
        case 'in-warehouse': return 'In Warehouse';
        case 'assigned': return 'Assigned';
        case 'picked-up': return 'Picked Up';
        case 'in-transit': return 'In Transit';
        case 'delivered': return 'Delivered';
        case 'failed': return 'Failed';
        case 'returned': return 'Returned';
        default: return status;
      }
    }
    switch (status) {
      case 'pending': return 'រង់ចាំ';
      case 'in-warehouse': return 'ក្នុងឃ្លាំង';
      case 'assigned': return 'បានចាត់ចែង';
      case 'picked-up': return 'បានប្រមូល';
      case 'in-transit': return 'កំពុងដឹក';
      case 'delivered': return 'បញ្ចប់(បុគ្គលិក)';
      case 'failed': return 'មិនជោគជ័យ';
      case 'returned': return 'បានត្រឡប់';
      default: return status;
    }
  };

  const toggleSelectRow = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (checked) {
      const idsToAdd = filtered.map(item => item.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...idsToAdd])));
    } else {
      const idsToRemove = filtered.map(item => item.id);
      setSelectedIds(prev => prev.filter(id => !idsToRemove.includes(id)));
    }
  };

  const [merchants, setMerchants] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const { lang, t } = useLanguage();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders', {
        params: {
          page: currentPage,
          limit: pageSize,
          search: debouncedSearch || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          driverId: driverFilter || undefined,
          merchantId: merchantFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }
      });
      if (res.data && res.data.data !== undefined) {
        setOrders(res.data.data);
        setTotalItems(res.data.total);
      } else {
        setOrders(res.data);
        setTotalItems(res.data.length);
      }
    } catch {}
    setLoading(false);
  }, [currentPage, pageSize, debouncedSearch, statusFilter, driverFilter, merchantFilter, startDate, endDate]);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    load();
    Promise.all([
      api.get('/merchants'), api.get('/customers'),
      api.get('/drivers'), api.get('/zones'),
    ]).then(([m, c, d, z]) => {
      setMerchants(m.data); setCustomers(c.data);
      setDrivers(d.data); setZones(z.data);
    }).catch(() => {});
  }, [router, load]);

  useEffect(() => {
    setFiltered(orders);
  }, [orders]);

  const openCreate = () => { router.push('/delivery/entry_data_item'); };
  const openEdit = (o: any) => {
    router.push(`/delivery/edit/${o.id}`);
  };



  const handleDelete = async (id: number) => {
    if (!confirm('Delete this delivery?')) return;
    try { await api.delete(`/orders/${id}`); await load(); } catch {}
  };

  const handleStatusChange = async (id: number, status: string) => {
    try { await api.patch(`/orders/${id}/status`, { status }); await load(); } catch {}
  };

  const handleBatchReceive = async () => {
    const pickedUpIds = selectedIds.filter(id => orders.find(o => o.id === id)?.status === 'picked-up');
    if (pickedUpIds.length === 0) return;
    if (!confirm(lang === 'km' ? `ទទួលកញ្ចប់អីវ៉ាន់ចំនួន ${pickedUpIds.length} ចូលឃ្លាំង?` : `Receive ${pickedUpIds.length} parcel(s) into warehouse?`)) return;
    setLoading(true);
    try {
      await Promise.all(pickedUpIds.map(id => api.patch(`/orders/${id}/status`, { status: 'in-warehouse' })));
      setSelectedIds(prev => prev.filter(id => !pickedUpIds.includes(id)));
      await load();
      alert(lang === 'km' ? 'បានទទួលចូលឃ្លាំងដោយជោគជ័យ!' : 'Received into warehouse successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to receive some orders.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('deliveryPageTitle')} subtitle={`${totalItems} ${t('deliveryPageSubtitle')}`} />
        <div className="page-content">
          {/* Filters */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Advanced Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Status</label>
                  <select className="form-control" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
                    <option value="all">{lang === 'km' ? 'ជ្រើសរើសស្ថានភាព' : 'Select Status'}</option>
                    {['pending', 'in-warehouse', 'in-transit', 'delivered', 'failed', 'returned'].map(s => (
                      <option key={s} value={s}>{getStatusLabel(s)}</option>
                    ))}
                  </select>
                </div>
                <DateInput
                  labelEn="Start Date"
                  labelKh="កាលបរិច្ឆេទបញ្ជូល"
                  value={startDate}
                  onChange={val => { setStartDate(val); setCurrentPage(1); }}
                />
                <DateInput
                  labelEn="End Date"
                  labelKh="កាលបរិច្ឆេទបញ្ចប់"
                  value={endDate}
                  onChange={val => { setEndDate(val); setCurrentPage(1); }}
                />
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>អ្នកដឹក</label>
                  <select className="form-control" value={driverFilter} onChange={e => { setDriverFilter(e.target.value); setCurrentPage(1); }}>
                    <option value="">-- {t('all') || 'All'} --</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name} {d.nameKh ? `(${d.nameKh})` : ''}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>ហាង</label>
                  <select className="form-control" value={merchantFilter} onChange={e => { setMerchantFilter(e.target.value); setCurrentPage(1); }}>
                    <option value="">-- {t('all') || 'All'} --</option>
                    {merchants.map(m => <option key={m.id} value={m.id}>{m.name} {m.nameKh ? `(${m.nameKh})` : ''}</option>)}
                  </select>
                </div>
              </div>

              {/* Search */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="search-input-wrapper" style={{ flex: 1, minWidth: 200 }}>
                  <MdSearch className="search-icon" />
                  <input className="form-control search-input" placeholder="Search by tracking, receiver, merchant..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📦 {t('deliveryParcels')}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => router.push(selectedIds.length > 0 ? `/delivery/print_invoice?id=${selectedIds.join(',')}` : '/delivery/print_invoice')}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, borderColor: '#7c3aed', color: '#7c3aed' }}
                >
                  <MdPrint size={14} /> {lang === 'km' ? 'វិក្កយបត្រ' : 'Invoice'}{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
                </button>
                {selectedIds.length > 0 && (
                  <button 
                    className="btn btn-success btn-sm" 
                    onClick={() => router.push(`/delivery/list_print_qrcode?id=${selectedIds.join(',')}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <MdPrint size={14} /> {lang === 'km' ? 'QR បោះពុម្ព' : 'Print QR'} ({selectedIds.length})
                  </button>
                )}
                {/* {selectedIds.length > 0 && selectedIds.some(id => orders.find(o => o.id === id)?.status === 'picked-up') && (
                  <button 
                    className="btn btn-sm" 
                    onClick={handleBatchReceive}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#0f766e', color: '#ffffff', border: 'none' }}
                  >
                    📥 {lang === 'km' ? 'ទទួលចូលឃ្លាំង' : 'Manual Receive'} ({selectedIds.filter(id => orders.find(o => o.id === id)?.status === 'picked-up').length})
                  </button>
                )} */}
                <button id="create-order-btn" className="btn btn-primary btn-sm" onClick={openCreate}><MdAdd size={14} /> {t('batchEntryData')}</button>
              </div>
            </div>
            {loading ? (
              <div className="loading-wrapper"><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📦</div>
                <div className="empty-state-title">No orders found</div>
                <div className="empty-state-text">Create your first order to get started</div>
              </div>
            ) : (
              <>
                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                  <table style={{ minWidth: 1600 }}>
                  <thead>
                    <tr>
                      <th>ល.រ</th>
                      <th>លេខ</th>
                      <th style={{ textAlign: 'center', width: 40 }}>
                        <input
                          type="checkbox"
                          checked={filtered.length > 0 && filtered.every(item => selectedIds.includes(item.id))}
                          onChange={handleSelectAll}
                          style={{ cursor: 'pointer', width: 16, height: 16 }}
                        />
                      </th>
                      <th>កាលបរិច្ឆេទ</th>
                      <th>ឈ្មោះហាង</th>
                      <th>អាសយដ្ឋានអ្នកទទួល</th>
                      <th>លេខទូរស័ព្ទ</th>
                      <th>ចំនួន$</th>
                      <th>ចំនួន៛</th>
                      <th style={{ minWidth: 130 }}>អ្នកយកកញ្ចប់</th>
                      <th style={{ minWidth: 130 }}>អ្នកដឹក</th>
                      <th style={{ textAlign: 'center', width: 80 }}>ស្ថានភាពដឹក ✓ ✕</th>
                      <th>ស្ថានភាព</th>
                      <th>ស្ថានភាពទូទាត់</th>
                      <th>បញ្ចូលដោយ</th>
                      <th>បញ្ចប់ដោយ</th>
                      <th>ធ្វើបច្ចុប្បន្នភាព</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((o: any, idx) => {
                      const isSelected = selectedIds.includes(o.id);
                      return (
                        <tr key={o.id} style={{ backgroundColor: isSelected ? '#eff6ff' : 'transparent', transition: 'background-color 0.15s ease' }}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(currentPage - 1) * pageSize + idx + 1}</td>
                          <td>
                            <span 
                              style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
                              onClick={() => openEdit(o)}
                            >
                              {o.trackingCode}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRow(o.id)}
                              style={{ cursor: 'pointer', width: 16, height: 16 }}
                            />
                          </td>
                          <td style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{formatDateTime(o.createdAt)}</td>
                          <td>
                            <span style={{ color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => router.push(`/client?search=${o.merchant?.name || ''}`)}>
                              {o.merchant?.nameKh || o.merchant?.name || '—'}
                            </span>
                          </td>
                          <td style={{ fontSize: 12 }}>{o.receiverAddress || '—'}</td>
                          <td style={{ fontWeight: 600 }}>{o.receiverPhone}</td>
                          <td>
                            <span style={{ color: 'var(--danger, #ef4444)', textDecoration: 'underline', fontWeight: 600 }}>
                              {o.codCurrency === 'USD' ? `$${parseFloat(o.cod || 0).toFixed(2)}` : '$0.00'}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: 'var(--danger, #ef4444)', textDecoration: 'underline', fontWeight: 600 }}>
                              {o.codCurrency === 'KHR' ? `៛${parseInt(o.cod || 0).toLocaleString()}` : '៛0'}
                            </span>
                          </td>
                          <td>
                            <select
                              className="form-control"
                              value={o.pickupDriverId || ''}
                              onChange={e => handleUpdatePickupDriver(o.id, e.target.value)}
                              style={{ height: '32px', padding: '2px 6px', fontSize: '12px', minWidth: '120px' }}
                            >
                              <option value="">--ជ្រើសរើស--</option>
                              {drivers.map(d => (
                                <option key={d.id} value={d.id}>
                                  {d.nameKh || d.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              className="form-control"
                              value={o.driverId || ''}
                              onChange={e => handleUpdateDeliveryDriver(o.id, e.target.value)}
                              style={{ height: '32px', padding: '2px 6px', fontSize: '12px', minWidth: '120px' }}
                            >
                              <option value="">--ជ្រើសរើស--</option>
                              {drivers.map(d => (
                                <option key={d.id} value={d.id}>
                                  {d.nameKh || d.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div 
                              onClick={() => handleToggleDeliveryStatus(o.id, o.status)}
                              style={{
                                width: 50,
                                height: 24,
                                borderRadius: 12,
                                background: o.status === 'delivered' ? 'var(--success, #10b981)' : '#e5e7eb',
                                position: 'relative',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '0 4px',
                                boxSizing: 'border-box',
                                transition: 'background-color 0.2s',
                                userSelect: 'none'
                              }}
                            >
                              <div 
                                style={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: '50%',
                                  background: '#fff',
                                  position: 'absolute',
                                  left: o.status === 'delivered' ? 30 : 4,
                                  transition: 'left 0.2s',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 9,
                                  fontWeight: 'bold',
                                  color: o.status === 'delivered' ? '#10b981' : '#9ca3af'
                                }}
                              >
                                {o.status === 'delivered' ? '✓' : '✕'}
                              </div>
                            </div>
                          </td>
                          <td>
                            <select
                              className="form-control"
                              value={o.status}
                              onChange={e => handleStatusChange(o.id, e.target.value)}
                              style={{ 
                                height: '32px', 
                                padding: '2px 6px', 
                                fontSize: '12px', 
                                minWidth: '130px',
                                fontWeight: 600,
                                color: o.status === 'delivered' ? 'var(--success, #10b981)' : o.status === 'failed' ? 'var(--danger, #ef4444)' : 'inherit'
                              }}
                            >
                              {Array.from(new Set([
                                o.status,
                                'pending',
                                'in-warehouse',
                                'in-transit',
                                'delivered',
                                'failed',
                                'returned'
                              ])).map(s => (
                                <option key={s} value={s}>
                                  {getStatusLabel(s)}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <Badge 
                              status={o.paymentStatus === 'paid' ? 'paid' : 'pending'} 
                              label={o.paymentStatus === 'paid' ? 'បង់លុយហើយ' : 'មិនទាន់បង់'} 
                            />
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {o.merchant?.nameKh || o.merchant?.name || o.senderName || 'admin'}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {['delivered', 'failed', 'returned'].includes(o.status) 
                              ? (o.driver?.nameKh || o.driver?.name || 'admin') 
                              : '—'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setViewModal(o)} title="View"><MdVisibility size={15} /></button>
                              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(o)} title="Edit"><MdEdit size={15} /></button>
                              <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(o.id)} title="Delete"><MdDelete size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalItems={totalItems}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              </>
            )}
          </div>
        </div>
      </div>



      {/* View Modal */}
      {viewModal && (
        <Modal open={!!viewModal} onClose={() => setViewModal(null)} title={`Order Details — ${viewModal.trackingCode}`} size="lg">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <h4 style={{ fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sender</h4>
              <p style={{ fontWeight: 600 }}>{viewModal.merchant?.name || viewModal.senderName}</p>
            </div>
            <div>
              <h4 style={{ fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Receiver</h4>
              <p style={{ fontWeight: 600 }}>{viewModal.receiverName}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{viewModal.receiverPhone}</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{viewModal.receiverAddress}</p>
            </div>
          </div>
          <hr className="divider" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16, marginBottom: 16 }}>
            {[
              { label: 'Status', value: <Badge status={viewModal.status} /> },
              { label: 'COD', value: formatCOD(viewModal.cod, viewModal.codCurrency || 'USD') },
              { label: 'Delivery Fee', value: `$${parseFloat(viewModal.deliveryFee).toFixed(2)}` },
              { label: 'Pickup Driver', value: viewModal.pickupDriver?.name || 'None' },
              { label: 'Delivery Driver', value: viewModal.driver?.name || 'Unassigned' },
              { label: 'Created', value: formatDateToDDMMYYYY(viewModal.createdAt) },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{value}</div>
              </div>
            ))}
          </div>
          {viewModal.note && (
            <div style={{ background: 'var(--bg-primary)', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 16 }}>
              📝 {viewModal.note}
            </div>
          )}
          {viewModal.histories && viewModal.histories.length > 0 && (
            <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <h4 style={{ fontWeight: 700, marginBottom: 16, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                📋 {lang === 'km' ? 'ប្រវត្តិស្ថានភាពលម្អិត' : 'Detailed Status History'}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingLeft: 8 }}>
                {[...viewModal.histories]
                  .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((h: any, idx: number) => {
                    const isLast = idx === viewModal.histories.length - 1;
                    let pointColor = '#cbd5e1';
                    if (h.status === 'delivered') pointColor = '#10b981';
                    else if (h.status === 'failed') pointColor = '#ef4444';
                    else if (h.status === 'returned') pointColor = '#6b7280';
                    else if (['in-transit', 'picked-up', 'assigned'].includes(h.status)) pointColor = '#f59e0b';
                    else if (h.status === 'in-warehouse') pointColor = '#10b981';
                    else pointColor = '#3b82f6';
                    
                    return (
                      <div key={h.id} style={{ display: 'flex', gap: 16, position: 'relative' }}>
                        {/* Vertical Line */}
                        {!isLast && (
                          <div style={{
                            position: 'absolute',
                            left: 7,
                            top: 20,
                            bottom: -20,
                            width: '2px',
                            background: '#e2e8f0',
                            zIndex: 1
                          }} />
                        )}
                        
                        {/* Bullet Point */}
                        <div style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          backgroundColor: '#fff',
                          border: `3px solid ${pointColor}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          zIndex: 2,
                          marginTop: 4
                        }} />

                        {/* Content Block */}
                        <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <Badge status={h.status} label={getStatusLabel(h.status)} />
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>
                              <span>{new Date(h.createdAt).toLocaleString(lang === 'km' ? 'kh-KH' : 'en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })}</span>
                            </div>
                          </div>

                          {/* Note / Remarks */}
                          {h.note && (
                            <div style={{ 
                              marginTop: 8, 
                              padding: '8px 12px', 
                              background: h.status === 'failed' || h.status === 'returned' ? '#fef2f2' : '#f8fafc',
                              borderLeft: `3px solid ${h.status === 'failed' || h.status === 'returned' ? '#ef4444' : '#cbd5e1'}`,
                              borderRadius: '0 6px 6px 0', 
                              fontSize: 12.5, 
                              color: '#334155',
                              fontWeight: 500,
                              maxWidth: '90%'
                            }}>
                              📝 {lang === 'km' ? 'សម្គាល់៖' : 'Remark:'} {h.note}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
