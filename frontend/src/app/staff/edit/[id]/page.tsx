'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
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

export default function EditStaffPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useLanguage();

  const [zones, setZones] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
    const load = async () => {
      try {
        const [z, v, userRes] = await Promise.all([
          api.get('/zones'),
          api.get('/vehicles'),
          api.get(`/users/${params.id}`)
        ]);
        setZones(z.data);
        setVehicles(v.data);
        
        const i = userRes.data;
        if (i) {
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
        }
      } catch (err) {
        console.error('Failed to load staff details', err);
        alert('Failed to load staff details.');
        router.push('/staff');
      }
      setLoading(false);
    };
    load();
  }, [params.id, router]);

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

      await api.patch(`/users/${params.id}`, payload);
      router.push('/staff');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error saving staff');
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('editStaff')} subtitle="Loading data..." />
        <div className="loading-wrapper"><div className="spinner" /></div>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('editStaff')} subtitle="Update staff profile" />
        <div className="page-content">
          <div className="card">
            <div className="card-header">
              <span className="card-title">👥 {t('editStaff')}</span>
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
                  <label className="form-label">{t('newPasswordLabel')}</label>
                  <input
                    type="password"
                    className="form-control"
                    value={form.password}
                    onChange={f('password')}
                    placeholder={t('passwordPlaceholderEdit')}
                  />
                </div>
              </div>

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
                <button className="btn btn-outline" onClick={() => router.push('/staff')}>
                  {t('cancel')}
                </button>
                <button className="btn btn-primary" onClick={save} disabled={saving}>
                  {saving ? t('saving') : t('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
