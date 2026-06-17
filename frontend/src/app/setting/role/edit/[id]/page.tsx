'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

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

export default function EditRolePage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useLanguage();

  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);
  const [isSystemRole, setIsSystemRole] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
    const load = async () => {
      try {
        const [pRes, rRes] = await Promise.all([
          api.get('/roles/permissions'),
          api.get(`/roles/${params.id}`)
        ]);
        
        setAllPermissions(pRes.data);
        
        const roleData: Role = rRes.data;
        if (roleData) {
          setRoleName(roleData.name);
          setRoleDescription(roleData.description || '');
          setSelectedPermissionIds(roleData.permissions.map(p => p.id));
          setIsSystemRole(['admin', 'staff', 'driver'].includes(roleData.name));
        }
      } catch (err) {
        console.error('Failed to load role details', err);
        alert(t('failedToLoadRoleDetails'));
        router.push('/setting/role');
      }
      setLoading(false);
    };
    load();
  }, [params.id, router]);

  const handleTogglePermission = (id: number) => {
    setSelectedPermissionIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllGroup = (permissionNames: string[], select: boolean) => {
    const ids = allPermissions
      .filter(p => permissionNames.includes(p.name))
      .map(p => p.id);

    if (select) {
      setSelectedPermissionIds(prev => Array.from(new Set([...prev, ...ids])));
    } else {
      setSelectedPermissionIds(prev => prev.filter(id => !ids.includes(id)));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      alert(t('roleNameRequired'));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: roleName.trim().toLowerCase(),
        description: roleDescription.trim(),
        permissionIds: selectedPermissionIds,
      };

      await api.put(`/roles/${params.id}`, payload);
      router.push('/setting/role');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || t('errorSavingRole'));
    }
    setSaving(false);
  };

  // Group permissions by category (prefix before the dot)
  const groupedPermissions = () => {
    const groups: Record<string, Permission[]> = {};
    allPermissions.forEach(p => {
      const category = p.name.split('.')[0] || 'general';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(p);
    });
    return groups;
  };

  const permGroups = groupedPermissions();

  if (loading) return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('editRoleTitle')} subtitle={t('loadingData')} />
        <div className="loading-wrapper"><div className="spinner" /></div>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('editRoleTitle')} subtitle={`${t('editRoleSubtitle')}: ${roleName.toUpperCase()}`} />
        <div className="page-content">
          <div className="card">
            <div className="card-header">
              <span className="card-title">🛡️ {t('editRoleForm')}</span>
            </div>
            <div className="card-body">
              <form onSubmit={handleSave}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('roleName')} <span>*</span></label>
                    <input
                      className="form-control"
                      placeholder={t('roleNamePlaceholder')}
                      value={roleName}
                      onChange={e => setRoleName(e.target.value)}
                      required
                      disabled={isSystemRole}
                      style={{ textTransform: 'lowercase' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('roleDescription')}</label>
                    <input
                      className="form-control"
                      placeholder={t('roleDescriptionPlaceholderEdit')}
                      value={roleDescription}
                      onChange={e => setRoleDescription(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 24 }}>
                  <label className="form-label" style={{ marginBottom: 16, display: 'block', fontWeight: 700, fontSize: 14 }}>
                    {t('mapPermissions')}
                  </label>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {Object.entries(permGroups).map(([groupName, groupPerms]) => {
                      return (
                        <div key={groupName} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '12px' }}>
                            <span style={{ textTransform: 'uppercase', fontWeight: 800, fontSize: '12px', color: 'var(--accent)', letterSpacing: '0.5px' }}>
                              🔑 {t(('permGroup_' + groupName) as any) || groupName} {t('permissionsLabel')}
                            </span>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                style={{ fontSize: '11px', padding: '2px 8px' }}
                                onClick={() => handleSelectAllGroup(groupPerms.map(p => p.name), true)}
                              >
                                {t('selectAll')}
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                style={{ fontSize: '11px', padding: '2px 8px', color: 'var(--danger)' }}
                                onClick={() => handleSelectAllGroup(groupPerms.map(p => p.name), false)}
                              >
                                {t('clearAll')}
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                            {groupPerms.map(p => {
                              const isChecked = selectedPermissionIds.includes(p.id);
                              return (
                                <label
                                  key={p.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 8,
                                    cursor: 'pointer',
                                    fontSize: '12.5px',
                                    padding: '4px',
                                    borderRadius: '4px'
                                  }}
                                  title={t(('permDesc_' + p.name.replace('.', '_')) as any) || p.description}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTogglePermission(p.id)}
                                    style={{ width: 16, height: 16, cursor: 'pointer', marginTop: 1 }}
                                  />
                                  <div>
                                    <span style={{ fontWeight: 600, display: 'block' }}>
                                      {t(('permAction_' + p.name.split('.')[1]) as any) || p.name.split('.')[1]}
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                      {t(('permDesc_' + p.name.replace('.', '_')) as any) || p.description}
                                    </span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-outline" onClick={() => router.push('/setting/role')}>
                    {t('cancel')}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? t('savingRole') : t('saveChanges')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
