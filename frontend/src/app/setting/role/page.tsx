'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import { MdAdd, MdEdit, MdDelete, MdSecurity } from 'react-icons/md';
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
  permissions: Permission[];
}

export default function RolesListPage() {
  const router = useRouter();
  const { t } = useLanguage();

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
      if (res.data && res.data.data !== undefined) {
        setRoles(res.data.data || []);
        setTotalItems(res.data.total || 0);
      } else {
        setRoles(res.data || []);
        setTotalItems(res.data?.length || 0);
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
    const systemRoles = ['admin', 'staff', 'driver'];
    if (systemRoles.includes(role.name)) {
      alert(`${t('cannotDeleteSystemRole')}: ${role.name}`);
      return;
    }

    if (!confirm(`${t('deleteRoleConfirmPrefix')} "${role.name}"${t('deleteRoleConfirmSuffix')}`)) {
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
              <span className="card-title">🛡️ {t('systemRoles')}</span>
              <button className="btn btn-primary btn-sm" onClick={openCreate}>
                <MdAdd size={14} /> {t('addRole')}
              </button>
            </div>

            {roles.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🛡️</div>
                <div className="empty-state-title">{t('noRolesFound')}</div>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>#</th>
                        <th style={{ width: '150px' }}>{t('roleName')}</th>
                        <th>{t('roleDescription')}</th>
                        <th style={{ width: '180px' }}>{t('permissionsCount')}</th>
                        <th style={{ width: '120px' }}>{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roles.map((d: Role, idx) => {
                        const isSystemRole = ['admin', 'staff', 'driver'].includes(d.name);
                        return (
                          <tr key={d.id}>
                            <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(currentPage - 1) * pageSize + idx + 1}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <MdSecurity size={16} style={{ color: 'var(--accent)' }} />
                                <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 13.5 }}>
                                  {d.name}
                                </span>
                                {isSystemRole && (
                                  <span style={{ fontSize: '9px', background: 'rgba(59,130,246,0.12)', color: 'var(--accent)', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>
                                    System
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                              {d.description || '—'}
                            </td>
                            <td style={{ fontSize: 13, fontWeight: 600, color: d.permissions.length > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
                              {d.permissions.length} {t('permissionsLabel').toLowerCase()}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(d.id)}>
                                  <MdEdit size={15} />
                                </button>
                                {!isSystemRole && (
                                  <button
                                    className="btn btn-ghost btn-icon btn-sm"
                                    style={{ color: 'var(--danger)' }}
                                    onClick={() => handleDelete(d)}
                                  >
                                    <MdDelete size={15} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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
