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
  zoneId: '',
  vehicleId: '',
  joinDate: '',
  salary: '',
  password: '',
  dob: '',
  gender: ''
};

export default function EditStaffPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useLanguage();

  const [zones, setZones] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
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
        const [z, v, userRes, r] = await Promise.all([
          api.get('/select/zones'),
          api.get('/select/vehicles'),
          api.get(`/users/${params.id}`),
          api.get('/select/roles')
        ]);
        setZones(Array.isArray(z.data) ? z.data : (z.data?.result || []));
        setVehicles(Array.isArray(v.data) ? v.data : (v.data?.result || []));
        const rawRoles = Array.isArray(r.data) ? r.data : (r.data?.result || []);
        const uniqueRoles = Array.from(
          new Map(rawRoles.map((item: any) => [item.name.toLowerCase(), item])).values()
        );
        setRoles(uniqueRoles);

        const i = userRes.data;
        if (i) {
          setForm({
            name: i.name,
            nameKh: i.nameKh || '',
            phone: i.phone || '',
            email: i.email || '',
            role: i.role || i.roleRelation?.name || 'staff',
            active: i.active ?? true,
            zoneId: i.zoneId || '',
            vehicleId: i.vehicleId || '',
            joinDate: i.joinDate || '',
            salary: i.salary !== undefined && i.salary !== null ? i.salary.toString() : '',
            password: '',
            dob: i.dob || '',
            gender: i.gender || ''
          });
          if (i.photo) {
            setPhotoPreview(i.photo);
          }
        }
      } catch (err) {
        console.error('Failed to load Userdetails', err);
        alert('Failed to load Userdetails.');
        router.push('/user');
      }
      setLoading(false);
    };
    load();
  }, [params.id, router]);

  const f = (k: string) => (e: any) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(p => ({ ...p, [k]: val }));
    if (errors[k]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[k];
        return next;
      });
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const save = async () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) {
      errs.name = 'សូមបំពេញឈ្មោះពេញ (Full Name)';
    }
    if (!form.phone.trim()) {
      errs.phone = 'សូមបំពេញលេខទូរស័ព្ទ';
    }
    if (form.role !== 'driver') {
      if (!form.email.trim()) {
        errs.email = 'សូមបំពេញអ៊ីម៉ែល';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        errs.email = 'សូមបំពេញអ៊ីម៉ែលត្រឹមត្រូវ';
      }
    } else if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = 'សូមបំពេញអ៊ីម៉ែលត្រឹមត្រូវ';
    }
    if (form.password && form.password.length < 6) {
      errs.password = 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៦ តួអក្សរ';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setErrors({});
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

      await api.patch(`/users/${params.id}`, formData, {
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
        <Topbar title={t('editStaff')} subtitle="Loading data..." />
        <div className="loading-wrapper"><div className="spinner" /></div>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('editStaff')} subtitle="កែប្រែព័ត៌មានគណនីបុគ្គលិក ឬអ្នកប្រើប្រាស់" />
        <div className="page-content">
          <div className="card">
            <div className="card-header">
              <span className="card-title">{t('editStaff')}</span>
            </div>
            <div className="card-body">
              <form onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
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
                    <label className="form-label">{t('role') || 'តួនាទី'} <span style={{ color: '#ef4444' }}>*</span></label>
                    <select className="form-control" value={form.role} onChange={f('role')}>
                      {roles.map((r: any) => {
                        const n = (r.name || '').toLowerCase();
                        const label = n === 'admin' ? 'អ្នកគ្រប់គ្រង (Admin)' : n === 'staff' ? 'បុគ្គលិក (Staff)' : n === 'driver' ? 'អ្នកដឹកជញ្ជូន (Driver)' : (r.name.charAt(0).toUpperCase() + r.name.slice(1));
                        return (
                          <option key={r.id} value={r.name}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('fullName')} <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                      value={form.name}
                      onChange={f('name')}
                      placeholder="e.g. Sok Dara"
                    />
                    {errors.name && <div className="form-error-text">{errors.name}</div>}
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
                      {t('phone')} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                      value={form.phone}
                      onChange={f('phone')}
                      placeholder="e.g. 012-345-678"
                    />
                    {errors.phone && <div className="form-error-text">{errors.phone}</div>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      {t('email')} {form.role !== 'driver' && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    <input
                      type="email"
                      className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                      value={form.email}
                      onChange={f('email')}
                      placeholder="e.g. email@example.com"
                    />
                    {errors.email && <div className="form-error-text">{errors.email}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('password')}</label>
                    <input
                      type="password"
                      className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                      value={form.password}
                      onChange={f('password')}
                      placeholder={t('passwordPlaceholderEdit')}
                    />
                    {errors.password && <div className="form-error-text">{errors.password}</div>}
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

                <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-cancel"
                    style={{ background: '#dc2626', color: '#ffffff', border: '1px solid #dc2626', fontWeight: 700 }}
                    onClick={() => router.push('/user')}
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ background: '#2563eb', color: '#ffffff', border: '1px solid #2563eb', fontWeight: 700 }}
                    disabled={saving}
                  >
                    {saving ? t('saving') : t('save')}
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
