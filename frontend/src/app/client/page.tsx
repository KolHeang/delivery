'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';
import { MdAdd, MdSearch, MdEdit, MdDelete } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';

const empty = { name: '', nameKh: '', contact: '', phone: '', email: '', address: '', pricingTier: 'standard', zoneId: '' };

export default function ShopsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, z] = await Promise.all([api.get('/merchants'), api.get('/zones')]);
      setItems(r.data); setZones(z.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { if (!isAuthenticated()) { router.push('/'); return; } load(); }, [router, load]);
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(q ? items.filter(i => 
      i.name?.toLowerCase().includes(q) || 
      i.nameKh?.toLowerCase().includes(q) || 
      i.phone?.includes(q)
    ) : items);
  }, [items, search]);

  const openCreate = () => { router.push('/client/create'); };
  const openEdit = (i: any) => {
    router.push(`/client/edit/${i.id}`);
  };

  const del = async (id: number) => {
    if (!confirm(t('confirm') || 'Delete this shop?')) return;
    try { await api.delete(`/merchants/${id}`); await load(); } catch {}
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('shopsTitle')} subtitle={`${filtered.length} ${t('shopsTitle').toLowerCase()}`} />
        <div className="page-content">
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px' }}>
              <div className="search-input-wrapper">
                <MdSearch className="search-icon" />
                <input className="form-control search-input" placeholder={t('searchShops')} value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">🏪 {t('shopsListTitle')}</span>
              <button className="btn btn-primary btn-sm" onClick={openCreate}><MdAdd size={14} /> {t('addShop')}</button>
            </div>
            {loading ? <div className="loading-wrapper"><div className="spinner" /></div> :
              filtered.length === 0 ? <div className="empty-state"><div className="empty-state-icon">🏪</div><div className="empty-state-title">{t('noShopsFound')}</div></div> :
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t('shopsTitle')}</th>
                      <th>{t('contact')}</th>
                      <th>{t('phone')}</th>
                      <th>{t('zone')}</th>
                      <th>{t('pricingTier')}</th>
                      <th>{t('balance')}</th>
                      <th>{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((m: any, i) => (
                      <tr key={m.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{m.name}</div>
                          {m.nameKh && <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{m.nameKh}</div>}
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.email}</div>
                        </td>
                        <td style={{ fontSize: 12 }}>{m.contact || '—'}</td>
                        <td style={{ fontSize: 12 }}>{m.phone}</td>
                        <td style={{ fontSize: 12 }}>{m.zone?.name || '—'}</td>
                        <td><Badge status={m.pricingTier} /></td>
                        <td style={{ fontWeight: 600, color: 'var(--success)' }}>${parseFloat(m.balance).toFixed(2)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(m)}><MdEdit size={15} /></button>
                            <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => del(m.id)}><MdDelete size={15} /></button>
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
