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

const emptyForm = {
  name: '',
  nameKh: '',
  phone: '',
  email: '',
  role: 'staff',
  active: true,
  status: 'offline',
  zoneId: '',
  vehicleId: '',
  joinDate: '',
  salary: '',
  password: ''
};

export default function StaffPage() {
  const router = useRouter();
  const currentUser = getUser();
  const { t } = useLanguage();

  const [items, setItems] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [zones, setZones] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [modal, setModal] = useState(false); // Using "modal" boolean as "showForm" state
  const [edit, setEdit] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, z, v] = await Promise.all([
        api.get('/users'),
        api.get('/zones'),
        api.get('/vehicles')
      ]);
      setItems(r.data);
      setZones(z.data);
      setVehicles(v.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
    load();
  }, [router, load]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q
        ? items.filter(
            i =>
              i.name?.toLowerCase().includes(q) ||
              i.nameKh?.toLowerCase().includes(q) ||
              i.phone?.includes(q) ||
              i.email?.toLowerCase().includes(q) ||
              i.role?.toLowerCase().includes(q)
          )
        : items
    );
  }, [items, search]);

  const openCreate = () => {
    setEdit(null);
    setForm(emptyForm);
    setModal(true);
  };

  const openEdit = (i: any) => {
    setEdit(i);
    setForm({
      name: i.name,
      nameKh: i.nameKh || '',
      phone: i.phone || '',
      email: i.email || '',
      role: i.role,
      active: i.active ?? true,
      status: i.status || 'offline',
      zoneId: i.zoneId || '',
      vehicleId: i.vehicleId || '',
      joinDate: i.joinDate || '',
      salary: i.salary !== undefined && i.salary !== null ? i.salary.toString() : '',
      password: ''
    });
    setModal(true);
  };

  const f = (k: string) => (e: any) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(p => ({ ...p, [k]: val }));
  };

  const save = async () => {
    if (!form.name.trim()) {
      alert('Full Name is required');
      return;
    }
    if (form.role !== 'driver' && !form.email.trim()) {
      alert('Email is required for Admin/Staff');
      return;
    }
    if (form.role === 'driver' && !form.phone.trim()) {
      alert('Phone number is required for Driver');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        nameKh: form.nameKh || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        role: form.role,
        active: form.active,
        status: form.role === 'driver' ? form.status : 'offline',
        zoneId: form.role === 'driver' && form.zoneId ? parseInt(form.zoneId) : undefined,
        vehicleId: form.role === 'driver' && form.vehicleId ? parseInt(form.vehicleId) : undefined,
        joinDate: form.joinDate || undefined,
        salary: form.salary ? parseFloat(form.salary) : 0.0
      };

      if (form.password) {
        payload.password = form.password;
      }

      if (edit) {
        await api.patch(`/users/${edit.id}`, payload);
      } else {
        await api.post('/users', payload);
      }
      setModal(false);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error saving staff');
    }
    setSaving(false);
  };

  const del = async (id: number) => {
    if (id === currentUser?.id) {
      return alert('Cannot delete your own account');
    }
    if (!confirm('Delete this staff member?')) return;
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
        <Topbar title={t('staffTitle')} subtitle={`${filtered.length} ${t('staffList')}`} />
        <div className="page-content">
          
          {modal ? (
            <div className="card">
              <div className="card-header">
                <span className="card-title">👥 {edit ? t('editStaff') : t('addStaff')}</span>
              </div>
              <div className="card-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select className="form-control" value={form.role} onChange={f('role')}>
                      <option value="admin">Admin</option>
                      <option value="staff">Staff</option>
                      <option value="driver">Driver</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('fullName')} <span>*</span></label>
                    <input
                      className="form-control"
                      value={form.name}
                      onChange={f('name')}
                      placeholder="e.g. Sok Dara"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('nameKh')}</label>
                    <input
                      className="form-control"
                      value={form.nameKh}
                      onChange={f('nameKh')}
                      placeholder="e.g. សុក ដារា"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      {form.role === 'driver' ? `${t('phone')} *` : t('phone')}
                    </label>
                    <input
                      className="form-control"
                      value={form.phone}
                      onChange={f('phone')}
                      placeholder="e.g. 012-345-678"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      {form.role !== 'driver' ? 'Email *' : 'Email'}
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      value={form.email}
                      onChange={f('email')}
                      placeholder="e.g. email@example.com"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      {edit ? 'New Password (leave blank to keep)' : 'Password'}
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      value={form.password}
                      onChange={f('password')}
                      placeholder={edit ? 'Min 6 characters' : 'Min 6 characters (default: 123456)'}
                    />
                  </div>
                </div>

                {/* Salary and Join Date are general employee fields for all roles */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('joinDate')}</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.joinDate}
                      onChange={f('joinDate')}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('monthly_salary')}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control"
                      placeholder="0.00"
                      value={form.salary}
                      onChange={f('salary')}
                    />
                  </div>
                </div>

                {form.role === 'driver' ? (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">{t('zone')}</label>
                        <select className="form-control" value={form.zoneId} onChange={f('zoneId')}>
                          <option value="">{t('selectZone')}</option>
                          {zones.map((z: any) => (
                            <option key={z.id} value={z.id}>
                              {z.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">{t('vehicle')}</label>
                        <select className="form-control" value={form.vehicleId} onChange={f('vehicleId')}>
                          <option value="">{t('selectVehicle')}</option>
                          {vehicles
                            .filter(v => v.status === 'active')
                            .map((v: any) => (
                              <option key={v.id} value={v.id}>
                                {v.brand} {v.model} ({v.plate})
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group" style={{ maxWidth: '50%' }}>
                        <label className="form-label">{t('status')}</label>
                        <select className="form-control" value={form.status} onChange={f('status')}>
                          <option value="available">Available</option>
                          <option value="on-delivery">On Delivery</option>
                          <option value="offline">Offline</option>
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="form-row">
                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                      <input
                        type="checkbox"
                        id="active-checkbox"
                        checked={form.active}
                        onChange={f('active')}
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                      />
                      <label htmlFor="active-checkbox" style={{ fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
                        {t('active')}
                      </label>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline" onClick={() => setModal(false)}>
                    {t('cancel')}
                  </button>
                  <button className="btn btn-primary" onClick={save} disabled={saving}>
                    {saving ? t('saving') : t('save')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
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
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>{t('name')}</th>
                          <th>{t('phone')}</th>
                          <th>Role</th>
                          <th>{t('zone')}</th>
                          <th>{t('vehicle')}</th>
                          <th>{t('status')}</th>
                          <th>{t('joinDate')}</th>
                          <th>{t('salary')}</th>
                          <th>{t('actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((d: any, idx) => (
                          <tr key={d.id}>
                            <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{idx + 1}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div className="sidebar-avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
                                  {d.name ? d.name.charAt(0) : 'S'}
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
                              {d.role === 'driver' ? d.zone?.name || '—' : '—'}
                            </td>
                            <td style={{ fontSize: 12 }}>
                              {d.role === 'driver' && d.vehicle
                                ? `${d.vehicle.brand} ${d.vehicle.model} (${d.vehicle.plate})`
                                : '—'}
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
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
