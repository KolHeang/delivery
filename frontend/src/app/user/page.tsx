'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getUser } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';
import { MdAdd, MdSearch, MdEdit, MdDelete } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';
import Pagination from '@/components/ui/Pagination';



export default function StaffPage() {
  const router = useRouter();
  const currentUser = getUser();
  const { t, lang } = useLanguage();

  const [items, setItems] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const [zones, setZones] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
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
      const [r, z, v] = await Promise.all([
        api.get('/users', {
          params: {
            page: currentPage,
            limit: pageSize,
            search: debouncedSearch || undefined,
          },
        }),
        api.get('/zones'),
        api.get('/vehicles')
      ]);
      if (r.data && r.data.data !== undefined) {
        setItems(r.data.data);
        setTotalItems(r.data.total);
      } else {
        setItems(r.data);
        setTotalItems(r.data.length);
      }
      setZones(z.data);
      setVehicles(v.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [currentPage, pageSize, debouncedSearch]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
    load();
  }, [router, load]);

  useEffect(() => {
    setFiltered(items);
  }, [items]);

  const openCreate = () => { router.push('/user/create'); };
  const openEdit = (i: any) => { router.push(`/user/edit/${i.id}`); };

  const del = async (id: number) => {
    if (id === currentUser?.id) {
      return alert('Cannot delete your own account');
    }
    if (!confirm('Delete this Usermember?')) return;
    try {
      await api.delete(`/users/${id}`);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error deleting staff');
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('staffTitle')} subtitle={`${totalItems} ${t('staffList')}`} />
        <div className="page-content">

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px' }}>
              <div className="search-input-wrapper">
                <MdSearch className="search-icon" />
                <input
                  className="form-control search-input"
                  placeholder={t('searchStaff')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">👥 {t('staffListTitle')}</span>
              <button className="btn btn-primary btn-sm" onClick={openCreate}>
                <MdAdd size={14} /> {t('addStaff')}
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>{t('colNo')}</th>
                    <th>{t('name')}</th>
                    <th>{t('phone')}</th>
                    <th>{t('email')}</th>
                    <th>Role</th>
                    <th>{t('gender')}</th>
                    <th>{t('dob')}</th>
                    <th>{t('joinDate')}</th>
                    <th>{t('salary')}</th>
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
                    filtered.map((d: any, idx) => (
                      <tr key={d.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(currentPage - 1) * pageSize + idx + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="sidebar-avatar" style={{ width: 32, height: 32, fontSize: 13, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {d.photo ? (
                                <img src={d.photo} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                (d.name?.[0] || 'U').toUpperCase()
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{d.name}</div>
                              {d.nameKh && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.nameKh}</div>}
                            </div>
                          </div>
                        </td>
                        <td>{d.phone || '—'}</td>
                        <td>{d.email || '—'}</td>
                        <td>
                          <span className="badge badge-assigned" style={{ textTransform: 'capitalize' }}>
                            {d.role || 'User'}
                          </span>
                        </td>
                        <td>{d.gender || '—'}</td>
                        <td>{d.dateOfBirth ? new Date(d.dateOfBirth).toLocaleDateString() : '—'}</td>
                        <td>{d.joinedDate ? new Date(d.joinedDate).toLocaleDateString() : '—'}</td>
                        <td style={{ fontWeight: 600 }}>
                          {d.salary != null && d.salary !== '' && !isNaN(Number(d.salary))
                            ? `$${Number(d.salary).toFixed(2)}`
                            : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(d)}>
                              <MdEdit size={15} />
                            </button>
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => del(d.id)}
                              disabled={d.id === currentUser?.id}
                            >
                              <MdDelete size={15} />
                            </button>
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
