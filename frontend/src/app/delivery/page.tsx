'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import api from '@/lib/api';
import { MdAdd, MdSearch, MdEdit, MdDelete, MdVisibility, MdFilterList } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';

const STATUS_OPTIONS = ['all', 'pending', 'picked-up', 'in-transit', 'delivered', 'failed', 'returned'];
const SIZE_OPTIONS = ['small', 'medium', 'large'];

const emptyForm = {
  senderName: '', senderPhone: '', receiverName: '', receiverPhone: '',
  receiverAddress: '', weight: 0.5, size: 'small', cod: 0, codCurrency: 'USD', deliveryFee: 0,
  note: '', merchantId: '', customerId: '', driverId: '', zoneId: '',
};

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
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  const [merchantFilter, setMerchantFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModal, setViewModal] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const { t } = useLanguage();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders');
      setOrders(res.data);
    } catch {}
    setLoading(false);
  }, []);

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
    let list = orders;
    if (statusFilter !== 'all') list = list.filter(o => o.status === statusFilter);
    if (driverFilter) list = list.filter(o => o.driverId === parseInt(driverFilter));
    if (merchantFilter) list = list.filter(o => o.merchantId === parseInt(merchantFilter));
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      list = list.filter(o => new Date(o.createdAt) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      list = list.filter(o => new Date(o.createdAt) <= end);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.trackingCode?.toLowerCase().includes(q) ||
        o.receiverName?.toLowerCase().includes(q) ||
        o.receiverPhone?.includes(q) ||
        o.merchant?.name?.toLowerCase().includes(q) ||
        o.merchant?.nameKh?.toLowerCase().includes(q) ||
        o.driver?.name?.toLowerCase().includes(q) ||
        o.driver?.nameKh?.toLowerCase().includes(q)
      );
    }
    setFiltered(list);
  }, [orders, search, statusFilter, driverFilter, merchantFilter, startDate, endDate]);

  const openCreate = () => { router.push('/delivery/entry_data_item'); };
  const openEdit = (o: any) => {
    setEditItem(o);
    setForm({
      senderName: o.senderName, senderPhone: o.senderPhone,
      receiverName: o.receiverName, receiverPhone: o.receiverPhone,
      receiverAddress: o.receiverAddress, weight: o.weight, size: o.size,
      cod: o.cod, codCurrency: o.codCurrency || 'USD', deliveryFee: o.deliveryFee, note: o.note || '',
      merchantId: o.merchantId || '', customerId: o.customerId || '',
      driverId: o.driverId || '', zoneId: o.zoneId || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, merchantId: form.merchantId || undefined, customerId: form.customerId || undefined, driverId: form.driverId || undefined, zoneId: form.zoneId || undefined, codCurrency: form.codCurrency || 'USD' };
      if (editItem) await api.patch(`/orders/${editItem.id}`, payload);
      else await api.post('/orders', payload);
      setModalOpen(false);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error saving delivery');
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this delivery?')) return;
    try { await api.delete(`/orders/${id}`); await load(); } catch {}
  };

  const handleStatusChange = async (id: number, status: string) => {
    try { await api.patch(`/orders/${id}/status`, { status }); await load(); } catch {}
  };

  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('deliveryPageTitle')} subtitle={`${filtered.length} ${t('deliveryPageSubtitle')}`} />
        <div className="page-content">
          {/* Filters */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Advanced Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Status</label>
                  <select className="form-control" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">Select Status</option>
                    {STATUS_OPTIONS.filter(s => s !== 'all').map(s => (
                      <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>កាលបរិច្ឆេទបញ្ជូល</label>
                  <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>កាលបរិច្ឆេទបញ្ចប់</label>
                  <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>អ្នកដឹក</label>
                  <select className="form-control" value={driverFilter} onChange={e => setDriverFilter(e.target.value)}>
                    <option value="">-- ទាំងអស់ --</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name} {d.nameKh ? `(${d.nameKh})` : ''}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>ហាង</label>
                  <select className="form-control" value={merchantFilter} onChange={e => setMerchantFilter(e.target.value)}>
                    <option value="">-- ទាំងអស់ --</option>
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
              <button id="create-order-btn" className="btn btn-primary btn-sm" onClick={openCreate}><MdAdd size={14} /> {t('batchEntryData')}</button>
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
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t('trackingCode')}</th>
                    <th>{t('sender')}</th>
                    <th>{t('receiver')}</th>
                    <th>{t('zone')}</th>
                    <th>{t('driver')}</th>
                    <th>{t('cod')}</th>
                    <th>{t('deliveryFee')}</th>
                    <th>{t('status')}</th>
                    <th>{t('date')}</th>
                    <th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o: any, idx) => (
                    <tr key={o.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{idx + 1}</td>
                      <td><code style={{ fontSize: 11, background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: 4 }}>{o.trackingCode}</code></td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{o.senderName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {o.merchant?.name}
                          {o.merchant?.nameKh && <span style={{ color: 'var(--accent)', fontWeight: 600 }}> ({o.merchant.nameKh})</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{o.receiverName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.receiverPhone}</div>
                      </td>
                      <td style={{ fontSize: 12 }}>{o.zone?.name || '—'}</td>
                      <td style={{ fontSize: 12 }}>
                        {o.driver ? (
                          <>
                            <div>{o.driver.name}</div>
                            {o.driver.nameKh && <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{o.driver.nameKh}</div>}
                          </>
                        ) : <span style={{ color: 'var(--warning)' }}>Unassigned</span>}
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatCOD(o.cod, o.codCurrency || 'USD')}</td>
                      <td style={{ fontWeight: 600, color: 'var(--success)' }}>${parseFloat(o.deliveryFee).toFixed(2)}</td>
                      <td>
                        <select value={o.status} onChange={e => handleStatusChange(o.id, e.target.value)}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12 }}>
                          {['pending','picked-up','in-transit','delivered','failed','returned'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <Badge status={o.status} />
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(o.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setViewModal(o)} title="View"><MdVisibility size={15} /></button>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(o)} title="Edit"><MdEdit size={15} /></button>
                          <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(o.id)} title="Delete"><MdDelete size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editItem ? `Edit Order #${editItem.id}` : 'Create New Order'}
        size="lg"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editItem ? 'Save Changes' : 'Create Order'}
            </button>
          </>
        }>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Sender Name <span>*</span></label>
            <input className="form-control" value={form.senderName} onChange={f('senderName')} />
          </div>
          <div className="form-group">
            <label className="form-label">Sender Phone <span>*</span></label>
            <input className="form-control" value={form.senderPhone} onChange={f('senderPhone')} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Receiver Name <span>*</span></label>
            <input className="form-control" value={form.receiverName} onChange={f('receiverName')} />
          </div>
          <div className="form-group">
            <label className="form-label">Receiver Phone <span>*</span></label>
            <input className="form-control" value={form.receiverPhone} onChange={f('receiverPhone')} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Receiver Address <span>*</span></label>
          <input className="form-control" value={form.receiverAddress} onChange={f('receiverAddress')} />
        </div>
        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">Weight (kg)</label>
            <input type="number" step="0.1" min="0" className="form-control" value={form.weight} onChange={f('weight')} />
          </div>
          <div className="form-group">
            <label className="form-label">Size</label>
            <select className="form-control" value={form.size} onChange={f('size')}>
              {SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Zone</label>
            <select className="form-control" value={form.zoneId} onChange={f('zoneId')}>
              <option value="">— Select Zone —</option>
              {zones.map((z: any) => <option key={z.id} value={z.id}>{z.name} (${z.price})</option>)}
            </select>
          </div>
        </div>
          <div className="form-row">
          <div className="form-group">
            <label className="form-label">COD Amount</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="form-control" style={{ maxWidth: 90 }} value={form.codCurrency} onChange={f('codCurrency')}>
                <option value="USD">$ USD</option>
                <option value="KHR">៛ KHR</option>
              </select>
              <input type="number" step={form.codCurrency === 'KHR' ? '1000' : '0.01'} min="0" className="form-control" value={form.cod} onChange={f('cod')} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Delivery Fee ($)</label>
            <input type="number" step="0.01" min="0" className="form-control" value={form.deliveryFee} onChange={f('deliveryFee')} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t('merchant')}</label>
            <select className="form-control" value={form.merchantId} onChange={f('merchantId')}>
              <option value="">{t('selectMerchant')}</option>
              {merchants.map((m: any) => <option key={m.id} value={m.id}>{m.name}{m.nameKh ? ` / ${m.nameKh}` : ''}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{t('customer')}</label>
            <select className="form-control" value={form.customerId} onChange={f('customerId')}>
              <option value="">{t('selectCustomer')}</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Note</label>
          <input className="form-control" value={form.note} onChange={f('note')} placeholder="Optional note..." />
        </div>
      </Modal>

      {/* View Modal */}
      {viewModal && (
        <Modal open={!!viewModal} onClose={() => setViewModal(null)} title={`Order Details — ${viewModal.trackingCode}`} size="lg">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <h4 style={{ fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sender</h4>
              <p style={{ fontWeight: 600 }}>{viewModal.senderName}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{viewModal.senderPhone}</p>
              {viewModal.merchant && <p style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4 }}>{viewModal.merchant.name}</p>}
            </div>
            <div>
              <h4 style={{ fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Receiver</h4>
              <p style={{ fontWeight: 600 }}>{viewModal.receiverName}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{viewModal.receiverPhone}</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{viewModal.receiverAddress}</p>
            </div>
          </div>
          <hr className="divider" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
            {[
              { label: 'Status', value: <Badge status={viewModal.status} /> },
              { label: 'Size', value: viewModal.size },
              { label: 'Weight', value: `${viewModal.weight} kg` },
              { label: 'Zone', value: viewModal.zone?.name || '—' },
              { label: 'COD', value: formatCOD(viewModal.cod, viewModal.codCurrency || 'USD') },
              { label: 'Delivery Fee', value: `$${parseFloat(viewModal.deliveryFee).toFixed(2)}` },
              { label: 'Driver', value: viewModal.driver?.name || 'Unassigned' },
              { label: 'Created', value: new Date(viewModal.createdAt).toLocaleDateString() },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{value}</div>
              </div>
            ))}
          </div>
          {viewModal.note && (
            <div style={{ background: 'var(--bg-primary)', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: 13 }}>
              📝 {viewModal.note}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
