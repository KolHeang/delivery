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
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

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
    setEdit(i);
    setForm({ 
      name: i.name, 
      nameKh: i.nameKh || '', 
      contact: i.contact || '', 
      phone: i.phone, 
      email: i.email || '', 
      address: i.address || '', 
      pricingTier: i.pricingTier, 
      zoneId: i.zoneId || '' 
    });
    setModal(true);
  };
  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, zoneId: form.zoneId || undefined };
      if (edit) await api.patch(`/merchants/${edit.id}`, payload);
      else await api.post('/merchants', payload);
      setModal(false); await load();
    } catch (err: any) { alert(err.response?.data?.message || 'Error'); }
    setSaving(false);
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
      <Modal open={modal} onClose={() => setModal(false)} title={edit ? t('editShop') : t('addShop')}
        footer={<><button className="btn btn-outline" onClick={() => setModal(false)}>{t('cancel')}</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? t('saving') : t('save')}</button></>}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t('shopNameEn')} <span>*</span></label>
            <input className="form-control" value={form.name} onChange={f('name')} placeholder="e.g. Zando Shop" />
          </div>
          <div className="form-group">
            <label className="form-label">{t('shopNameKh')}</label>
            <input className="form-control" value={form.nameKh} onChange={f('nameKh')} placeholder="e.g. ហាងហ្សង់ដូ" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t('contact')}</label>
            <input className="form-control" value={form.contact} onChange={f('contact')} placeholder="e.g. Channy" />
          </div>
          <div className="form-group">
            <label className="form-label">{t('phone')} <span>*</span></label>
            <input className="form-control" value={form.phone} onChange={f('phone')} placeholder="e.g. 012-100-200" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t('email')}</label>
            <input type="email" className="form-control" value={form.email} onChange={f('email')} placeholder="e.g. contact@zando.com" />
          </div>
          <div className="form-group">
            <label className="form-label">{t('address')}</label>
            <input className="form-control" value={form.address} onChange={f('address')} placeholder="Full pickup address..." />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t('pricingTier')}</label>
            <select className="form-control" value={form.pricingTier} onChange={f('pricingTier')}>
              <option value="basic">Basic</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{t('zone')}</label>
            <select className="form-control" value={form.zoneId} onChange={f('zoneId')}>
              <option value="">{t('selectZone')}</option>
              {zones.map((z: any) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
