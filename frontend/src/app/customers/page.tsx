'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Modal from '@/components/ui/Modal';
import api from '@/lib/api';
import { MdAdd, MdSearch, MdEdit, MdDelete } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';
import Pagination from '@/components/ui/Pagination';



export default function CustomersPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { t } = useLanguage();

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
      const r = await api.get('/customers', {
        params: {
          page: currentPage,
          limit: pageSize,
          search: debouncedSearch || undefined,
        },
      });
      if (r.data && r.data.data !== undefined) {
        setItems(r.data.data);
        setTotalItems(r.data.total);
      } else {
        setItems(r.data);
        setTotalItems(r.data.length);
      }
    } catch {}
    setLoading(false);
  }, [currentPage, pageSize, debouncedSearch]);

  useEffect(() => { if (!isAuthenticated()) { router.push('/'); return; } load(); }, [router, load]);

  useEffect(() => {
    setFiltered(items);
  }, [items]);

  const openCreate = () => { router.push('/customers/create'); };
  const openEdit = (i: any) => { router.push(`/customers/edit/${i.id}`); };

  const del = async (id: number) => {
    if (!confirm('Delete this customer?')) return;
    try { await api.delete(`/customers/${id}`); await load(); } catch {}
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('customersTitle')} subtitle={`${totalItems} ${t('customer')}`} />
        <div className="page-content">
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px' }}>
              <div className="search-input-wrapper">
                <MdSearch className="search-icon" />
                <input className="form-control search-input" placeholder={t('searchCustomers')} value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">👥 {t('customersListTitle')}</span>
              <button className="btn btn-primary btn-sm" onClick={openCreate}><MdAdd size={14} /> {t('addCustomer')}</button>
            </div>
            {loading ? <div className="loading-wrapper"><div className="spinner" /></div> :
              filtered.length === 0 ? <div className="empty-state"><div className="empty-state-icon">👥</div><div className="empty-state-title">{t('noCustomersFound')}</div></div> :
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead><tr><th>#</th><th>{t('name')}</th><th>{t('phone')}</th><th>{t('email')}</th><th>{t('address')}</th><th>{t('date')}</th><th>{t('actions')}</th></tr></thead>
                    <tbody>
                      {filtered.map((c: any, i) => (
                        <tr key={c.id}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(currentPage - 1) * pageSize + i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{c.name}</td>
                          <td style={{ fontSize: 12 }}>{c.phone}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.email || '—'}</td>
                          <td style={{ fontSize: 12, maxWidth: 200 }}>{c.address || '—'}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(c)}><MdEdit size={15} /></button>
                              <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => del(c.id)}><MdDelete size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
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
            }
          </div>
        </div>
      </div>

    </div>
  );
}
