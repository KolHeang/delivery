'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  password: '',
  dob: '',
  gender: ''
};

export default function CreateStaffPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [zones, setZones] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
    const load = async () => {
      try {
        const [z, v, r] = await Promise.all([
          api.get('/zones'),
          api.get('/vehicles'),
          api.get('/roles')
        ]);
        setZones(z.data);
        setVehicles(v.data);
        setRoles(r.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    load();
  }, [router]);

  const f = (k: string) => (e: any) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(p => ({ ...p, [k]: val }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
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

    const selectedRole = roles.find(r => r.name === form.role);
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      if (form.nameKh) formData.append('nameKh', form.nameKh);
      if (form.phone) formData.append('phone', form.phone);
      if (form.email) formData.append('email', form.email);
      formData.append('role', form.role);
      if (selectedRole?.id) formData.append('roleId', selectedRole.id.toString());
      formData.append('active', form.active.toString());
      formData.append('status', form.role === 'driver' ? form.status : 'offline');
      if (form.role === 'driver' && form.zoneId) formData.append('zoneId', form.zoneId);
      if (form.role === 'driver' && form.vehicleId) formData.append('vehicleId', form.vehicleId);
      if (form.joinDate) formData.append('joinDate', form.joinDate);
      if (form.salary) formData.append('salary', form.salary);
      if (form.dob) formData.append('dob', form.dob);
      if (form.gender) formData.append('gender', form.gender);
      if (form.password) formData.append('password', form.password);
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      await api.post('/users', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      router.push('/user');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error saving staff');
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('addStaff')} subtitle="Loading data..." />
        <div className="loading-wrapper"><div className="spinner" /></div>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('addStaff')} subtitle="Create a new Userprofile" />
        <div className="page-content">
          <div className="card">
            <div className="card-header">
              <span className="card-title">👥 {t('addStaff')}</span>
            </div>
            <div className="card-body">
              <div className="form-row" style={{ alignItems: 'center', marginBottom: 20 }}>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    border: '2px dashed var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    background: 'var(--card-bg)'
                  }}>
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 28, color: 'var(--text-muted)' }}>👤</span>
                    )}
                  </div>
                  <div>
                    <label className="form-label" style={{ marginBottom: 4 }}>{t('profilePhoto')}</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      style={{ fontSize: 13 }}
                    />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-control" value={form.role} onChange={f('role')}>
                    {roles.map((r: any) => (
                      <option key={r.id} value={r.name} style={{ textTransform: 'capitalize' }}>
                        {r.name.charAt(0).toUpperCase() + r.name.slice(1)}
                      </option>
                    ))}
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
                  <label className="form-label">{t('password')}</label>
                  <input
                    type="password"
                    className="form-control"
                    value={form.password}
                    onChange={f('password')}
                    placeholder={t('passwordPlaceholder')}
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

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('dob')}</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.dob}
                    onChange={f('dob')}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('gender')}</label>
                  <select className="form-control" value={form.gender} onChange={f('gender')}>
                    <option value="">{t('selectGender')}</option>
                    <option value="male">{t('male')}</option>
                    <option value="female">{t('female')}</option>
                    <option value="other">{t('otherGender')}</option>
                  </select>
                </div>
              </div>

              {form.role === 'driver' ? (
                <>
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
                <button className="btn btn-outline" onClick={() => router.push('/user')}>
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
