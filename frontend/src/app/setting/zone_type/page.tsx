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



export default function ZonesPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);


  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/zones'); setItems(r.data); } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { if (!isAuthenticated()) { router.push('/'); return; } load(); }, [router, load]);

  const openCreate = () => { router.push('/setting/zone_type/create'); };
  const openEdit = (i: any) => { router.push(`/setting/zone_type/edit/${i.id}`); };

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

    </div>
  );
}
