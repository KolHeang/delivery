'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';

interface RolePermission {
  role: string;
  permissions: {
    manageShops: boolean;
    manageDelivery: boolean;
    paymentProcess: boolean;
    accounting: boolean;
    settings: boolean;
  };
}

export default function PermissionSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<RolePermission[]>([
    {
      role: 'admin',
      permissions: { manageShops: true, manageDelivery: true, paymentProcess: true, accounting: true, settings: true },
    },
    {
      role: 'staff',
      permissions: { manageShops: true, manageDelivery: true, paymentProcess: false, accounting: false, settings: false },
    },
  ]);
  const [savingRole, setSavingRole] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    setLoading(false);
  }, [router]);

  const handleToggle = (role: string, permKey: keyof RolePermission['permissions']) => {
    setRoles(prev => prev.map(r => {
      if (r.role === role) {
        return {
          ...r,
          permissions: {
            ...r.permissions,
            [permKey]: !r.permissions[permKey],
          },
        };
      }
      return r;
    }));
  };

  const handleSave = (role: string) => {
    setSavingRole(role);
    setTimeout(() => {
      setSavingRole(null);
      alert(`Permissions for '${role}' saved successfully!`);
    }, 800);
  };

  if (loading) return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="loading-wrapper"><div className="spinner" /></div>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Role Permissions" subtitle="Manage permissions and feature access for roles" />
        <div className="page-content">
          <div className="card">
            <div className="card-header"><span className="card-title">🛡️ System Permissions</span></div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                {roles.map(r => (
                  <div key={r.role} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <span className="badge badge-active" style={{ fontSize: 14, textTransform: 'uppercase', padding: '6px 12px' }}>
                        {r.role}
                      </span>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleSave(r.role)}
                        disabled={savingRole === r.role}
                      >
                        {savingRole === r.role ? 'Saving...' : 'Save Permissions'}
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                      {Object.keys(r.permissions).map(k => {
                        const label = k.replace(/([A-Z])/g, ' $1');
                        const isChecked = r.permissions[k as keyof RolePermission['permissions']];
                        return (
                          <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13.5 }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggle(r.role, k as any)}
                              style={{ width: 16, height: 16, cursor: 'pointer' }}
                              disabled={r.role === 'admin'} // Admin has all rights locked
                            />
                            <span style={{ textTransform: 'capitalize' }}>{label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
