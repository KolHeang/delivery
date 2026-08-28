'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';
import { FaRegEdit, FaTrashAlt } from 'react-icons/fa';
import { FiPlusCircle } from 'react-icons/fi';
import Pagination from '@/components/ui/Pagination';
import { useLanguage } from '@/lib/LanguageContext';

const TYPES = ['motorbike', 'car', 'van', 'truck', 'tuk-tuk'];

export default function VehiclesPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/vehicles', {
        params: { page: currentPage, limit: pageSize }
      });
      if (r.data && r.data.result !== undefined) {
        setItems(r.data.result);
        setTotalItems(r.data.total);
      } else {
        setItems(Array.isArray(r.data) ? r.data : []);
        setTotalItems(Array.isArray(r.data) ? r.data.length : 0);
      }
    } catch {}
    setLoading(false);
  }, [currentPage, pageSize]);

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
        <Topbar title="Vehicles" subtitle={`${totalItems} vehicles in fleet`} />
        <div className="page-content">
          <div className="card">
            <div className="card-header">
              <span className="card-title">🚗 Vehicles List</span>
              <button className="btn btn-primary btn-sm" onClick={openCreate}><FiPlusCircle size={14} /> Add Vehicle</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 60, textAlign: 'center' }}>{lang === 'km' ? 'ល.រ' : 'No.'}</th>
                    <th>Type</th>
                    <th>Plate</th>
                    <th>Brand & Model</th>
                    <th>Year</th>
                    <th>Status</th>
                    <th style={{ width: 100, textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '40px 0', textAlign: 'center' }}>
                        <div className="loading-wrapper"><div className="spinner" /></div>
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        {t('noDataFound') || 'គ្មានទិន្នន័យ'}
                      </td>
                    </tr>
                  ) : (
                    items.map((v: any, i) => (
                      <tr key={v.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>{(currentPage - 1) * pageSize + i + 1}</td>
                        <td>
                          <span style={{ fontSize: 20 }}>{TYPE_ICONS[v.type] || '🚗'}</span>
                          <span style={{ fontSize: 12, marginLeft: 6, textTransform: 'capitalize' }}>{v.type}</span>
                        </td>
                        <td><code style={{ fontSize: 12, background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: 4 }}>{v.plate}</code></td>
                        <td style={{ fontWeight: 600 }}>{v.brand} {v.model}</td>
                        <td style={{ fontSize: 12 }}>{v.year}</td>
                        <td><Badge status={v.status} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(v)}><FaRegEdit size={14} /></button>
                            <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => del(v.id)}><FaTrashAlt size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {items.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
