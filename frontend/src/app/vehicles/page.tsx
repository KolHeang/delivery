'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';
import { MdAdd, MdEdit, MdDelete } from 'react-icons/md';

const empty = { plate: '', type: 'motorbike', brand: '', model: '', year: new Date().getFullYear(), status: 'active' };
const TYPES = ['motorbike', 'car', 'van', 'truck', 'tuk-tuk'];

export default function VehiclesPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/vehicles'); setItems(r.data); } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { if (!isAuthenticated()) { router.push('/'); return; } load(); }, [router, load]);

  const openCreate = () => { setEdit(null); setForm(empty); setModal(true); };
  const openEdit = (i: any) => { setEdit(i); setForm({ plate: i.plate, type: i.type, brand: i.brand, model: i.model, year: i.year, status: i.status }); setModal(true); };
  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: k === 'year' ? parseInt(e.target.value) : e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      if (edit) await api.patch(`/vehicles/${edit.id}`, form);
      else await api.post('/vehicles', form);
      setModal(false); await load();
    } catch (err: any) { alert(err.response?.data?.message || 'Error'); }
    setSaving(false);
  };

  const del = async (id: number) => {
    if (!confirm('Delete this vehicle?')) return;
    try { await api.delete(`/vehicles/${id}`); await load(); } catch {}
  };

  const TYPE_ICONS: Record<string, string> = { motorbike: '🏍️', car: '🚗', van: '🚐', truck: '🚚', 'tuk-tuk': '🛺' };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Vehicles" subtitle={`${items.length} vehicles in fleet`} />
        <div className="page-content">
          <div className="card">
            <div className="card-header">
              <span className="card-title">🚗 Vehicles List</span>
              <button className="btn btn-primary btn-sm" onClick={openCreate}><MdAdd size={14} /> Add Vehicle</button>
            </div>
            {loading ? <div className="loading-wrapper"><div className="spinner" /></div> :
              items.length === 0 ? <div className="empty-state"><div className="empty-state-icon">🚗</div><div className="empty-state-title">No vehicles found</div></div> :
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead><tr><th>#</th><th>Type</th><th>Plate</th><th>Brand & Model</th><th>Year</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {items.map((v: any, i) => (
                      <tr key={v.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                        <td>
                          <span style={{ fontSize: 20 }}>{TYPE_ICONS[v.type] || '🚗'}</span>
                          <span style={{ fontSize: 12, marginLeft: 6, textTransform: 'capitalize' }}>{v.type}</span>
                        </td>
                        <td><code style={{ fontSize: 12, background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: 4 }}>{v.plate}</code></td>
                        <td style={{ fontWeight: 600 }}>{v.brand} {v.model}</td>
                        <td style={{ fontSize: 12 }}>{v.year}</td>
                        <td><Badge status={v.status} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(v)}><MdEdit size={15} /></button>
                            <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => del(v.id)}><MdDelete size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            }
          </div>
        </div>
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title={edit ? 'Edit Vehicle' : 'Add Vehicle'} size="sm"
        footer={<><button className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></>}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Plate Number <span>*</span></label><input className="form-control" value={form.plate} onChange={f('plate')} placeholder="e.g. 2A-4532" /></div>
          <div className="form-group">
            <label className="form-label">Type <span>*</span></label>
            <select className="form-control" value={form.type} onChange={f('type')}>
              {TYPES.map(t => <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Brand <span>*</span></label><input className="form-control" value={form.brand} onChange={f('brand')} /></div>
          <div className="form-group"><label className="form-label">Model <span>*</span></label><input className="form-control" value={form.model} onChange={f('model')} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Year</label><input type="number" min="2000" max="2030" className="form-control" value={form.year} onChange={f('year')} /></div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-control" value={form.status} onChange={f('status')}>
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
