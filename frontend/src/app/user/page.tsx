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
  const { t } = useLanguage();

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
            {loading ? (
              <div className="loading-wrapper">
                <div className="spinner" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👥</div>
                <div className="empty-state-title">{t('noStaffFound')}</div>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>{t('name')}</th>
                        <th>{t('phone')}</th>
                        <th>Role</th>
                        <th>{t('gender')}</th>
                        <th>{t('dob')}</th>
                        <th>{t('status')}</th>
                        <th>{t('joinDate')}</th>
                        <th>{t('salary')}</th>
                        <th>{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((d: any, idx) => (
                        <tr key={d.id}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(currentPage - 1) * pageSize + idx + 1}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div className="sidebar-avatar" style={{ width: 32, height: 32, fontSize: 13, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {d.photo ? (
                                  <img src={d.photo} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  d.name ? d.name.charAt(0).toUpperCase() : 'S'
                                )}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700 }}>
                                  {d.name}
                                  {d.id === currentUser?.id && (
                                    <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 6 }}>
                                      (You)
                                    </span>
                                  )}
                                </div>
                                {d.nameKh && (
                                  <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                                    {d.nameKh}
                                  </div>
                                )}
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  {d.email || '—'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontSize: 12 }}>{d.phone || '—'}</td>
                          <td>
                            <Badge status={d.role} />
                          </td>
                          <td style={{ fontSize: 12 }}>
                            {d.gender ? (d.gender === 'other' ? t('otherGender') : t(d.gender) || d.gender) : '—'}
                          </td>
                          <td style={{ fontSize: 12 }}>
                            {d.dob || '—'}
                          </td>
                          <td>
                            {d.role === 'driver' ? (
                              <Badge status={d.status} />
                            ) : (
                              <Badge status={d.active ? 'active' : 'inactive'} />
                            )}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.joinDate || '—'}</td>
                          <td style={{ fontSize: 12, fontWeight: 600 }}>
                            {d.salary !== undefined && d.salary !== null
                              ? `$${parseFloat(d.salary).toFixed(2)}`
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
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
