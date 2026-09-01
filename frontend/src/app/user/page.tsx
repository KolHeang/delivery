'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getUser } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { MdSearch } from 'react-icons/md';
import { FaRegEdit, FaTrashAlt } from 'react-icons/fa';
import { FiPlusCircle } from 'react-icons/fi';
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
      const res = await api.get('/users', {
        params: {
          page: currentPage,
          limit: pageSize,
          search: debouncedSearch || undefined,
        },
      });

      if (res.data && (res.data.results !== undefined || res.data.result !== undefined)) {
        setItems(res.data.results || res.data.result || []);
        setTotalItems(res.data.total ?? 0);
      } else {
        setItems(Array.isArray(res.data) ? res.data : []);
        setTotalItems(Array.isArray(res.data) ? res.data.length : 0);
      }
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
    setFiltered(Array.isArray(items) ? items : []);
  }, [items]);

  const openCreate = () => { router.push('/user/create'); };
  const openEdit = (i: any) => { router.push(`/user/edit/${i.id}`); };

  const del = async (id: number) => {
    if (id === currentUser?.id) {
      return alert('មិនអាចលុបគណនីផ្ទាល់ខ្លួនរបស់អ្នកបានទេ (Cannot delete your own account)');
    }
    if (!confirm('តើអ្នកពិតជាចង់លុបបុគ្គលិកនេះមែនទេ? (Delete this user?)')) return;
    try {
      await api.delete(`/users/${id}`);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error deleting user');
    }
  };

  const formatDate = (dateVal?: string | Date | null) => {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('staffTitle') || 'បុគ្គលិក'} subtitle={`${totalItems} ${t('staffList') || 'អ្នកប្រើប្រាស់'}`} />
        <div className="page-content">

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px' }}>
              <div className="search-input-wrapper">
                <MdSearch className="search-icon" />
                <input
                  className="form-control search-input"
                  placeholder={t('searchStaff') || 'ស្វែងរកអ្នកប្រើប្រាស់ (ឈ្មោះ, លេខទូរស័ព្ទ, អ៊ីមែល)...'}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">👥 {t('staffListTitle') || 'បញ្ជីអ្នកប្រើប្រាស់'}</span>
              <button className="btn btn-primary btn-sm" onClick={openCreate}>
                <FiPlusCircle size={14} /> {t('addStaff') || 'បន្ថែមអ្នកប្រើប្រាស់'}
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>{t('colNo') || 'ល.រ'}</th>
                    <th>{t('name') || 'ឈ្មោះ'}</th>
                    <th>{t('phone') || 'ទូរស័ព្ទ'}</th>
                    <th>{t('email') || 'អ៊ីមែល'}</th>
                    <th>{t('role') || 'តួនាទី'}</th>
                    <th>{t('gender') || 'ភេទ'}</th>
                    <th>{t('dob') || 'ថ្ងៃខែឆ្នាំកំណើត'}</th>
                    <th>{t('joinDate') || 'កាលបរិច្ឆេទចូល'}</th>
                    <th>{t('salary') || 'ប្រាក់ខែ'}</th>
                    <th>{t('status') || 'ស្ថានភាព'}</th>
                    <th>{t('actions') || 'សកម្មភាព'}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={11} style={{ padding: '40px 0', textAlign: 'center' }}>
                        <div className="loading-wrapper"><div className="spinner" /></div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        {t('noDataFound') || 'គ្មានទិន្នន័យ'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((d: any, idx) => {
                      const roleName = d.roleRelation?.name || d.role || 'Staff';
                      const isMale = d.gender === 'male' || d.gender === 'ប្រុស';
                      const isFemale = d.gender === 'female' || d.gender === 'ស្រី';
                      const genderText = isMale ? 'ប្រុស' : isFemale ? 'ស្រី' : (d.gender || '');

                      return (
                        <tr key={d.id}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                            {(currentPage - 1) * pageSize + idx + 1}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  background: 'var(--primary-light, #e0e7ff)',
                                  color: 'var(--primary, #3b82f6)',
                                  fontSize: 13,
                                  fontWeight: 600,
                                  overflow: 'hidden',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {d.photo ? (
                                  <img src={d.photo} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  (d.name?.[0] || 'U').toUpperCase()
                                )}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600 }}>{d.name}</div>
                                {d.nameKh && d.nameKh !== d.name && (
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.nameKh}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>{d.phone || ''}</td>
                          <td>{d.email || ''}</td>
                          <td>
                            <span className="badge badge-assigned" style={{ textTransform: 'capitalize' }}>
                              {roleName}
                            </span>
                          </td>
                          <td>{genderText}</td>
                          <td>{formatDate(d.dob || d.dateOfBirth)}</td>
                          <td>{formatDate(d.joinDate || d.joinedDate || d.join_date)}</td>
                          <td style={{ fontWeight: 600 }}>
                            {d.salary != null && d.salary !== '' && !isNaN(Number(d.salary)) && Number(d.salary) > 0
                              ? `$${Number(d.salary).toFixed(2)}`
                              : ''}
                          </td>
                          <td>
                            <span className={`badge ${d.isActive !== false ? 'badge-delivered' : 'badge-failed'}`}>
                              {d.isActive !== false ? (t('active') || 'សកម្ម') : (t('inactive') || 'អសកម្ម')}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(d)} title="កែប្រែ">
                                <FaRegEdit size={14} />
                              </button>
                              <button
                                className="btn btn-ghost btn-icon btn-sm"
                                style={{ color: 'var(--danger)' }}
                                onClick={() => del(d.id)}
                                disabled={d.id === currentUser?.id}
                                title="លុប"
                              >
                                <FaTrashAlt size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
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
