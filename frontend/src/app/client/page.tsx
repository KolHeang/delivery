'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';
import { MdAdd, MdSearch, MdEdit, MdDelete, MdPerson, MdLocationOn } from 'react-icons/md';
import { FaTelegramPlane } from 'react-icons/fa';
import { useLanguage } from '@/lib/LanguageContext';
import Pagination from '@/components/ui/Pagination';

const empty = { name: '', nameKh: '', contact: '', phone: '', email: '', address: '', pricingTier: 'standard', zoneId: '' };

export default function ShopsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, z] = await Promise.all([
        api.get('/merchants', {
          params: {
            page: currentPage,
            limit: pageSize,
            search: debouncedSearch || undefined,
          },
        }),
        api.get('/zones')
      ]);
      if (r.data && r.data.data !== undefined) {
        setItems(r.data.data);
        setTotalItems(r.data.total);
      } else {
        setItems(r.data);
        setTotalItems(r.data.length);
      }
      setZones(z.data);
    } catch {}
    setLoading(false);
  }, [currentPage, pageSize, debouncedSearch]);

  useEffect(() => { if (!isAuthenticated()) { router.push('/'); return; } load(); }, [router, load]);

  useEffect(() => {
    setFiltered(items);
  }, [items]);

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
        <Topbar title={t('shopsTitle')} subtitle={`${totalItems} ${t('shopsTitle').toLowerCase()}`} />
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
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>{t('colNo')}</th>
                    <th>{t('code')}</th>
                    <th>{t('name')}</th>
                    <th>{t('phone')}</th>
                    <th>{t('telegram')}</th>
                    <th>{t('mapsLocation')}</th>
                    <th>{t('serviceLabel')}</th>
                    <th>{t('branch')}</th>
                    <th>{t('status')}</th>
                    <th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '40px 0', textAlign: 'center' }}>
                        <div className="loading-wrapper"><div className="spinner" /></div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        {t('noDataFound') || 'គ្មានទិន្នន័យ'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((m: any, i) => (
                      <tr key={m.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(currentPage - 1) * pageSize + i + 1}</td>
                        <td><code style={{ fontSize: 12, background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: 4 }}>{String(m.id).padStart(6, '0')}</code></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: '#e2e8f0', color: '#94a3b8',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 18, flexShrink: 0, overflow: 'hidden'
                            }}>
                              {m.photo ? (
                                <img src={m.photo} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ fontSize: 16 }}>🏪</span>
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{m.name}</div>
                              {m.nameKh && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.nameKh}</div>}
                            </div>
                          </div>
                        </td>
                        <td>{m.phone}</td>
                        <td>
                          {m.telegramPhone ? (
                            <a
                              href={`https://t.me/${m.telegramPhone.replace(/[^0-9+]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#0088cc', textDecoration: 'none', fontWeight: 500, fontSize: 12 }}
                            >
                              <FaTelegramPlane size={14} /> {m.telegramPhone}
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td>
                          {m.mapsLocation ? (
                            <a
                              href={m.mapsLocation}
                              target="_blank"
                              rel="noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500, fontSize: 12 }}
                            >
                              <MdLocationOn size={14} /> Maps
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td>
                          <span style={{
                            padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                            background: m.serviceLabel === 'vip' ? '#fef3c7' : m.serviceLabel === 'special' ? '#e0e7ff' : '#f1f5f9',
                            color: m.serviceLabel === 'vip' ? '#b45309' : m.serviceLabel === 'special' ? '#4338ca' : '#475569',
                            textTransform: 'uppercase'
                          }}>
                            {m.serviceLabel || 'NORMAL'}
                          </span>
                        </td>
                        <td style={{ fontSize: 12 }}>{m.contact || 'EBS Express'}</td>
                        <td>
                          <Badge status={m.active ? 'active' : 'inactive'} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(m)}><MdEdit size={15} /></button>
                            <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => del(m.id)}><MdDelete size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filtered.length > 0 && (
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
