'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, hasPermission } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import { MdSecurity } from 'react-icons/md';
import { FaRegEdit, FaTrashAlt } from 'react-icons/fa';
import { FiPlusCircle } from 'react-icons/fi';
import Pagination from '@/components/ui/Pagination';

interface Permission {
  id: number;
  name: string;
  description: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  tenantId?: number | null;
  permissions: Permission[];
}

export default function RolesListPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();

  const [roles, setRoles] = useState<Role[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/roles', {
        params: { page: currentPage, limit: pageSize }
      });
      if (res.data && (res.data.results !== undefined || res.data.result !== undefined)) {
        setRoles(res.data.results || res.data.result || []);
        setTotalItems(res.data.total || 0);
      } else {
        setRoles(Array.isArray(res.data) ? res.data : []);
        setTotalItems(Array.isArray(res.data) ? res.data.length : 0);
      }
    } catch (err) {
      console.error('Failed to load roles', err);
    }
    setLoading(false);
  }, [currentPage, pageSize]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
    loadData();
  }, [router, loadData]);

  const openCreate = () => {
    router.push('/setting/role/create');
  };

  const openEdit = (id: number) => {
    router.push(`/setting/role/edit/${id}`);
  };

  const handleDelete = async (role: Role) => {
    const systemRoles = ['admin', 'staff', 'driver', 'merchant'];
    if (role.tenantId === null || systemRoles.includes(role.name)) {
      alert(`${t('cannotDeleteSystemRole') || 'Cannot delete system default role'}: ${role.name}`);
      return;
    }

    if (!confirm(`${t('deleteRoleConfirmPrefix') || 'Are you sure you want to delete role'} "${role.name}"${t('deleteRoleConfirmSuffix') || '?'}`)) {
      return;
    }

    try {
      await api.delete(`/roles/${role.id}`);
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || t('errorDeletingRole'));
    }
  };

  if (loading) return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('rolesTitle')} subtitle={t('loadingRoles')} />
        <div className="loading-wrapper"><div className="spinner" /></div>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar
          title={t('rolesTitle')}
          subtitle={t('rolesSubtitle')}
        />

        <div className="page-content">
          <div className="card">
            <div className="card-header">
              <span className="card-title">{t('systemRoles')}</span>
              {hasPermission(['roles.create', 'settings.role']) && (
                <button className="btn btn-primary btn-sm" onClick={() => router.push('/setting/role/create')}>
                  <FiPlusCircle size={14} /> {t('addRole')}
                </button>
              )}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>{t('colNo')}</th>
                    <th style={{ width: '180px' }}>{t('roleName')}</th>
                    <th>{t('roleDescription')}</th>
                    <th style={{ width: '180px' }}>{t('permissionsCount')}</th>
                    <th style={{ width: '120px' }}>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '40px 0', textAlign: 'center' }}>
                        <div className="loading-wrapper"><div className="spinner" /></div>
                      </td>
                    </tr>
                  ) : roles.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        {t('noDataFound') || 'គ្មានទិន្នន័យ'}
                      </td>
                    </tr>
                  ) : (
                    roles.map((d: Role, idx) => {
                      const isDefaultRole = ['admin', 'staff', 'driver', 'merchant'].includes(d.name.toLowerCase());

                      return (
                        <tr key={d.id}>
                          <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
                            {(currentPage - 1) * pageSize + idx + 1}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <MdSecurity size={16} style={{ color: '#2b529a' }} />
                              <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 13.5, color: '#0f172a' }}>
                                {d.name}
                              </span>
                            </div>
                          </td>
                          <td style={{ fontSize: 13, color: '#475569' }}>
                            {d.description || '—'}
                          </td>
                          <td>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '3px 10px',
                              borderRadius: 12,
                              fontSize: 12.5,
                              fontWeight: 700,
                              background: '#eff6ff',
                              color: '#2563eb',
                            }}>
                              {d.permissions ? d.permissions.length : 0} {lang === 'km' ? 'សិទ្ធិ' : 'Permissions'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <button
                                className="btn btn-ghost btn-icon btn-sm"
                                onClick={() => openEdit(d.id)}
                                title={t('edit') || 'កែប្រែសិទ្ធិ'}
                                style={{ color: '#2563eb' }}
                              >
                                <FaRegEdit size={14} />
                              </button>
                              {!isDefaultRole && (
                                <button
                                  className="btn btn-ghost btn-icon btn-sm"
                                  style={{ color: 'var(--danger)' }}
                                  onClick={() => handleDelete(d)}
                                  title={t('delete') || 'លុប'}
                                >
                                  <FaTrashAlt size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {roles.length > 0 && (
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
