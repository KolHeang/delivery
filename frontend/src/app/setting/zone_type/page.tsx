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

const empty = { name: '', code: '', price: 0, description: '', active: true };

export default function ZonesPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/zones'); setItems(r.data); } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { if (!isAuthenticated()) { router.push('/'); return; } load(); }, [router, load]);

  const openCreate = () => { setEdit(null); setForm(empty); setModal(true); };
  const openEdit = (i: any) => { setEdit(i); setForm({ name: i.name, code: i.code, price: i.price, description: i.description || '', active: i.active }); setModal(true); };
  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: k === 'price' ? parseFloat(e.target.value) : k === 'active' ? e.target.checked : e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      if (edit) await api.patch(`/zones/${edit.id}`, form);
      else await api.post('/zones', form);
      setModal(false); await load();
    } catch (err: any) { alert(err.response?.data?.message || 'Error'); }
    setSaving(false);
  };

  const del = async (id: number) => {
    if (!confirm('Delete this zone?')) return;
    try { await api.delete(`/zones/${id}`); await load(); } catch {}
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Zone Type" subtitle={`${items.length} zones configured`} />
        <div className="page-content">
          <div className="card">
            <div className="card-header">
              <span className="card-title">🗺️ Zones Configured</span>
              <button className="btn btn-primary btn-sm" onClick={openCreate}><MdAdd size={14} /> Add Zone</button>
            </div>
            {loading ? <div className="loading-wrapper"><div className="spinner" /></div> :
              items.length === 0 ? <div className="empty-state"><div className="empty-state-icon">🗺️</div><div className="empty-state-title">No zones configured</div></div> :
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead><tr><th>#</th><th>Zone Name</th><th>Code</th><th>Delivery Fee</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {items.map((z: any, i) => (
                      <tr key={z.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                        <td style={{ fontWeight: 700 }}>{z.name}</td>
                        <td><code style={{ fontSize: 12, background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: 4 }}>{z.code}</code></td>
                        <td style={{ fontWeight: 600, color: 'var(--success)' }}>${parseFloat(z.price).toFixed(2)}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{z.description || '—'}</td>
                        <td><Badge status={z.active ? 'active' : 'inactive'} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(z)}><MdEdit size={15} /></button>
                            <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => del(z.id)}><MdDelete size={15} /></button>
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
      <Modal open={modal} onClose={() => setModal(false)} title={edit ? 'Edit Zone' : 'Add Zone'} size="sm"
        footer={<><button className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></>}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Zone Name <span>*</span></label><input className="form-control" value={form.name} onChange={f('name')} /></div>
          <div className="form-group"><label className="form-label">Code <span>*</span></label><input className="form-control" value={form.code} onChange={f('code')} placeholder="e.g. PPC" /></div>
        </div>
        <div className="form-group"><label className="form-label">Delivery Fee ($) <span>*</span></label><input type="number" step="0.5" min="0" className="form-control" value={form.price} onChange={f('price')} /></div>
        <div className="form-group"><label className="form-label">Description</label><input className="form-control" value={form.description} onChange={f('description')} /></div>
        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" id="zone-active" checked={form.active} onChange={f('active')} style={{ width: 16, height: 16 }} />
          <label htmlFor="zone-active" className="form-label" style={{ margin: 0 }}>Active Zone</label>
        </div>
      </Modal>
    </div>
  );
}
