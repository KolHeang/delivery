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
  joinDate: '',
  salary: '',
  password: '',
  dob: '',
  gender: ''
};

export default function EditStaffPage() {
  const router = useRouter();
  const params = useParams();
  const { lang, t } = useLanguage();

  const [zones, setZones] = useState<any[]>([]);
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
        const [z, userRes, r] = await Promise.all([
          api.get('/select/zones'),
          api.get(`/users/${params.id}`),
          api.get('/select/roles')
        ]);
        setZones(Array.isArray(z.data) ? z.data : (z.data?.result || []));
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
            zoneId: i.zoneId ? String(i.zoneId) : '',
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
      errs.name = lang === 'km' ? 'សូមបំពេញឈ្មោះជាភាសាអង់គ្លេស' : 'Full name is required';
    }
    if (!form.phone.trim()) {
      errs.phone = lang === 'km' ? 'សូមបំពេញលេខទូរស័ព្ទ' : 'Phone is required';
    }
    if (form.role !== 'driver') {
      if (!form.email.trim()) {
        errs.email = lang === 'km' ? 'សូមបំពេញអ៊ីម៉ែល' : 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        errs.email = lang === 'km' ? 'សូមបំពេញអ៊ីម៉ែលឱ្យបានត្រឹមត្រូវ' : 'Invalid email';
      }
    } else if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = lang === 'km' ? 'សូមបំពេញអ៊ីម៉ែលឱ្យបានត្រឹមត្រូវ' : 'Invalid email';
    }
    if (form.password && form.password.length < 6) {
      errs.password = lang === 'km' ? 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៦ តួអក្សរ' : 'Min 6 characters';
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
      alert(err.response?.data?.message || 'Error updating user');
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('editStaff')} subtitle={t('loading')} />
        <div className="loading-wrapper"><div className="spinner" /></div>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('editStaff')} subtitle="កែប្រែព័ត៌មានបុគ្គលិក ឬអ្នកដឹកជញ្ជូន" />
        <div className="page-content">
          <div className="card">
            <div className="card-header">
              <span className="card-title">✏️ {t('editStaff')}</span>
            </div>
            <div className="card-body" style={{ padding: '24px 28px' }}>
              <form onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
                {/* Photo Upload Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
                  <div style={{
                    width: 76,
                    height: 76,
                    borderRadius: '50%',
                    border: '2px dashed var(--accent, #2563eb)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    background: 'var(--bg-primary, #f8fafc)',
                    flexShrink: 0
                  }}>
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 32, color: 'var(--text-muted)' }}>👤</span>
                    )}
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, marginBottom: 6 }}>{t('profilePhoto') || 'រូបថតគណនី'}</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      style={{ fontSize: 13 }}
                    />
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      {lang === 'km' ? 'គាំទ្រទម្រង់ JPG, PNG (រូបភាពទំហំសមរម្យ)' : 'Supports JPG, PNG images'}
                    </div>
                  </div>
                </div>

                {/* Row 1: Role & Zone */}
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '18px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      {t('role') || 'តួនាទី'} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
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

                  {form.role === 'driver' ? (
                    <div className="form-group">
                      <label className="form-label">
                        {lang === 'km' ? 'តំបន់ប្រចាំការ' : 'Delivery Zone'}
                      </label>
                      <select className="form-control" value={form.zoneId} onChange={f('zoneId')}>
                        <option value="">{lang === 'km' ? '-- ជ្រើសរើសតំបន់ --' : '-- Select Zone --'}</option>
                        {zones.map(z => (
                          <option key={z.id} value={z.id}>
                            {z.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>{t('joinDate') || 'កាលបរិច្ឆេទចូល'}</label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.joinDate}
                        onChange={f('joinDate')}
                      />
                    </div>
                  )}
                </div>

                {/* Row 2: English Name & Khmer Name */}
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '18px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      {lang === 'km' ? 'ឈ្មោះជាភាសាអង់គ្លេស' : 'English Name'} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                      value={form.name}
                      onChange={f('name')}
                      placeholder="e.g. Sok Dara"
                    />
                    {errors.name && <div className="form-error-text">{errors.name}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      {lang === 'km' ? 'ឈ្មោះជាភាសាខ្មែរ' : 'Khmer Name'}
                    </label>
                    <input
                      className="form-control"
                      value={form.nameKh}
                      onChange={f('nameKh')}
                      placeholder="e.g. សុក ដារ៉ា"
                    />
                  </div>
                </div>

                {/* Row 3: Phone & Email */}
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '18px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      {t('phone') || 'ទូរស័ព្ទ'} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                      value={form.phone}
                      onChange={f('phone')}
                      placeholder="e.g. 012-345-678"
                    />
                    {errors.phone && <div className="form-error-text">{errors.phone}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      {t('email') || 'អ៊ីមែល'} {form.role !== 'driver' && <span style={{ color: '#ef4444' }}>*</span>}
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
                </div>

                {/* Row 4: Password & Salary */}
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '18px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      {t('password') || 'ពាក្យសម្ងាត់ថ្មី (ទុកទំនេរបើមិនប្តូរ)'}
                    </label>
                    <input
                      type="password"
                      className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                      value={form.password}
                      onChange={f('password')}
                      placeholder={t('passwordPlaceholderEdit') || 'ទុកទំនេរបើមិនចង់ប្តូរ'}
                    />
                    {errors.password && <div className="form-error-text">{errors.password}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>{t('monthly_salary') || 'ប្រាក់ខែ'}</label>
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

                {/* Row 5: Dates & Personal info */}
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '18px' }}>
                  {form.role === 'driver' ? (
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>{t('joinDate') || 'កាលបរិច្ឆេទចូល'}</label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.joinDate}
                        onChange={f('joinDate')}
                      />
                    </div>
                  ) : (
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>{t('dob') || 'ថ្ងៃខែឆ្នាំកំណើត'}</label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.dob}
                        onChange={f('dob')}
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>{t('gender') || 'ភេទ'}</label>
                    <select className="form-control" value={form.gender} onChange={f('gender')}>
                      <option value="">{t('selectGender') || '-- ជ្រើសរើសភេទ --'}</option>
                      <option value="male">{t('male') || 'ប្រុស'}</option>
                      <option value="female">{t('female') || 'ស្រី'}</option>
                      <option value="other">{t('otherGender') || 'ផ្សេងៗ'}</option>
                    </select>
                  </div>
                </div>

                {/* Row 6: DOB (for driver) & Active status */}
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '18px', alignItems: 'center' }}>
                  {form.role === 'driver' ? (
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>{t('dob') || 'ថ្ងៃខែឆ្នាំកំណើត'}</label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.dob}
                        onChange={f('dob')}
                      />
                    </div>
                  ) : <div></div>}

                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: form.role === 'driver' ? 24 : 8 }}>
                    <input
                      type="checkbox"
                      id="active-checkbox-edit"
                      checked={form.active}
                      onChange={f('active')}
                      style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--accent, #2563eb)' }}
                    />
                    <label htmlFor="active-checkbox-edit" style={{ fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
                      {t('active') || 'សកម្ម (Active)'}
                    </label>
                  </div>
                </div>

                {/* Form Buttons */}
                <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', gap: 14, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-cancel"
                    style={{ background: '#ef4444', color: '#ffffff', border: 'none', fontWeight: 700, padding: '10px 24px', borderRadius: 8, cursor: 'pointer' }}
                    onClick={() => router.push('/user')}
                  >
                    {t('cancel') || 'បោះបង់'}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ background: '#2563eb', color: '#ffffff', border: 'none', fontWeight: 700, padding: '10px 28px', borderRadius: 8, cursor: 'pointer' }}
                    disabled={saving}
                  >
                    {saving ? (t('saving') || 'កំពុងរក្សា...') : (t('save') || 'រក្សាទុក')}
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
