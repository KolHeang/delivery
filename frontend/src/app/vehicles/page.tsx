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


const TYPES = ['motorbike', 'car', 'van', 'truck', 'tuk-tuk'];

export default function VehiclesPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);


  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/vehicles'); setItems(r.data); } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { if (!isAuthenticated()) { router.push('/'); return; } load(); }, [router, load]);

  const openCreate = () => { router.push('/vehicles/create'); };
  const openEdit = (i: any) => { router.push(`/vehicles/edit/${i.id}`); };

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

    </div>
  );
}
