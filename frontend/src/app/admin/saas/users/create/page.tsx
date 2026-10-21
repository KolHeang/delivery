'use client';

import { SaasMasterLayout } from '@/components/layout/SaasMasterLayout';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saasApi } from '@/lib/saas-api';
import { getUser, clearAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import { FlagKm, FlagEn } from '@/components/ui/Flags';
import { SaasCloudIcon } from '@/components/ui/SaasCloudIcon';
import {
  MdDashboard,
  MdBusiness,
  MdReceiptLong,
  MdPayment,
  MdGroup,
  MdWorkspacePremium,
  MdLocalOffer,
  MdAttachMoney,
  MdLogout,
  MdKeyboardArrowDown,
  MdArrowBack,
  MdPerson,
  MdEmail,
  MdPhone,
  MdVpnKey,
  MdSecurity,
  MdCheckCircle,
} from 'react-icons/md';

export default function CreateSaasAdminPage() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const tr = (km: string, en: string) => (lang === 'km' ? km : en);

  const [creating, setCreating] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'super_admin',
    password: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('access_token');
    const saasAdminRaw = localStorage.getItem('saas_admin');
    const currentUser = getUser();

    if (!token && !saasAdminRaw && !currentUser) {
      router.push('/admin/saas/login');
      return;
    }

    let adminObj = null;
    if (saasAdminRaw) {
      try {
        adminObj = JSON.parse(saasAdminRaw);
      } catch (e) {
        // ignore
      }
    }

    if (adminObj) {
      setUser(adminObj);
    } else if (currentUser) {
      setUser(currentUser);
    } else {
      setUser({ name: 'Master Super Admin', email: 'superadmin@ebsexpress.com', role: 'super_admin' });
    }
  }, [router]);

  const handleLogout = () => {
    if (confirm(tr('តើអ្នកពិតជាចង់ចាកចេញពីប្រព័ន្ធ (Logout) មែនទេ?', 'Are you sure you want to log out?'))) {
      clearAuth();
      localStorage.removeItem('saas_admin');
      router.push('/admin/saas/login');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!adminForm.name.trim()) {
      errs.name = tr('សូមបំពេញឈ្មោះអ្នកគ្រប់គ្រង', 'Please enter admin name');
    }
    if (!adminForm.email.trim()) {
      errs.email = tr('សូមបំពេញអ៊ីម៉ែល', 'Please enter email');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminForm.email.trim())) {
      errs.email = tr('សូមបំពេញអ៊ីម៉ែលត្រឹមត្រូវ', 'Please enter a valid email address');
    }
    if (!adminForm.password) {
      errs.password = tr('សូមបំពេញពាក្យសម្ងាត់', 'Please enter password');
    } else if (adminForm.password.length < 6) {
      errs.password = tr('ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៦ តួអក្សរ', 'Password must be at least 6 characters');
    }
    if (!adminForm.role) {
      errs.role = tr('សូមជ្រើសរើសតួនាទី', 'Please select a role');
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setErrors({});
    try {
      setCreating(true);
      await saasApi.createSaasAdmin({
        name: adminForm.name.trim(),
        email: adminForm.email.trim().toLowerCase(),
        phone: adminForm.phone.trim() || undefined,
        password: adminForm.password,
        role: adminForm.role,
      });

      alert(tr('បានបង្កើត SaaS Platform Admin ជោគជ័យ!', 'SaaS Platform Admin created successfully!'));
      router.push('/admin/saas/users');
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការបង្កើត SaaS Admin', 'Failed to create SaaS Admin'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <SaasMasterLayout activeTab="users">
          {/* Header & Back Button */}
          <div style={{ marginBottom: 20 }}>
            <Link
              href="/admin/saas/users"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--text-muted)',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 10,
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <MdArrowBack size={16} />
              <span>{tr('ត្រឡប់ទៅបញ្ជី SaaS Admins', 'Back to SaaS Admins List')}</span>
            </Link>

            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
              {tr('បង្កើត SaaS Platform Admin ថ្មី', 'Create New SaaS Platform Admin')}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              {tr('គណនី Admin សម្រាប់គ្រប់គ្រងប្រព័ន្ធ Master SaaS (តារាង saas_admins ដាច់ដោយឡែក)', 'Platform Admin account for managing Master SaaS delivery infrastructure (dedicated saas_admins table)')}
            </p>
          </div>

          {/* Form Card */}
          <div className="card" style={{ maxWidth: 860, background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
            <div className="card-header" style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MdPerson size={18} />
              </div>
              <span className="card-title" style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
                {tr('ព័ត៌មានគណនី SaaS Admin', 'SaaS Admin Account Information')}
              </span>
            </div>

            <div className="card-body" style={{ padding: '24px' }}>
              <form onSubmit={handleSubmit} autoComplete="off" noValidate>
                {/* Prevent autofill ghost inputs */}
                <input type="text" style={{ display: 'none' }} tabIndex={-1} readOnly />
                <input type="password" style={{ display: 'none' }} tabIndex={-1} readOnly />

                {/* Row 1: Name & Phone */}
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MdPerson size={15} color="#64748b" />
                      <span>{tr('ឈ្មោះអ្នកគ្រប់គ្រង', 'Admin Full Name')}</span>
                      <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                      placeholder={tr('ឧ. John SuperAdmin', 'e.g. John SuperAdmin')}
                      value={adminForm.name}
                      onChange={(e) => {
                        setAdminForm({ ...adminForm, name: e.target.value });
                        if (errors.name) setErrors((prev) => { const n = { ...prev }; delete n.name; return n; });
                      }}
                      style={{ height: 42, fontSize: 13.5 }}
                    />
                    {errors.name && <div className="form-error-text" style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4 }}>{errors.name}</div>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MdPhone size={15} color="#64748b" />
                      <span>{tr('លេខទូរស័ព្ទ', 'Phone Number')}</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="012 345 678"
                      value={adminForm.phone}
                      onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
                      style={{ height: 42, fontSize: 13.5 }}
                    />
                  </div>
                </div>

                {/* Row 2: Email & Password */}
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MdEmail size={15} color="#64748b" />
                      <span>{tr('Email សម្រាប់ Login', 'Login Email')}</span>
                      <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="email"
                      name="saas_new_admin_email_field"
                      id="saas_new_admin_email_field"
                      autoComplete="off"
                      className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                      placeholder="admin@ebsexpress.com"
                      value={adminForm.email}
                      onChange={(e) => {
                        setAdminForm({ ...adminForm, email: e.target.value });
                        if (errors.email) setErrors((prev) => { const n = { ...prev }; delete n.email; return n; });
                      }}
                      style={{ height: 42, fontSize: 13.5 }}
                    />
                    {errors.email && <div className="form-error-text" style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4 }}>{errors.email}</div>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MdVpnKey size={15} color="#64748b" />
                      <span>{tr('ពាក្យសម្ងាត់', 'Password')}</span>
                      <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="password"
                      name="saas_new_admin_password_field"
                      id="saas_new_admin_password_field"
                      autoComplete="new-password"
                      className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                      placeholder={tr('បញ្ចូលពាក្យសម្ងាត់យ៉ាងតិច ៦ ខ្ទង់...', 'Enter password (min 6 chars)...')}
                      value={adminForm.password}
                      onChange={(e) => {
                        setAdminForm({ ...adminForm, password: e.target.value });
                        if (errors.password) setErrors((prev) => { const n = { ...prev }; delete n.password; return n; });
                      }}
                      style={{ height: 42, fontSize: 13.5 }}
                    />
                    {errors.password && <div className="form-error-text" style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4 }}>{errors.password}</div>}
                  </div>
                </div>

                {/* Row 3: Role & Status */}
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MdSecurity size={15} color="#64748b" />
                      <span>{tr('តួនាទី', 'Admin Role')}</span>
                      <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      className={`form-control ${errors.role ? 'is-invalid' : ''}`}
                      value={adminForm.role}
                      onChange={(e) => {
                        setAdminForm({ ...adminForm, role: e.target.value });
                        if (errors.role) setErrors((prev) => { const n = { ...prev }; delete n.role; return n; });
                      }}
                      style={{ height: 42, fontSize: 13.5, fontWeight: 600 }}
                    >
                      <option value="super_admin">{tr('Super Admin (សិទ្ធិពេញលេញលើ SaaS)', 'Super Admin (Full SaaS Access)')}</option>
                      <option value="finance_admin">{tr('Finance Admin (គ្រប់គ្រងការទូទាត់ & គម្រោង)', 'Finance Admin (Billing & Plans)')}</option>
                      <option value="support_admin">{tr('Support Admin (ជំនួយការបច្ចេកទេស)', 'Support Admin (Technical Support)')}</option>
                    </select>
                    {errors.role && <div className="form-error-text" style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4 }}>{errors.role}</div>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MdCheckCircle size={15} color="#64748b" />
                      <span>{tr('ស្ថានភាពគណនី', 'Account Status')}</span>
                    </label>
                    <select
                      className="form-control"
                      value={adminForm.isActive ? 'true' : 'false'}
                      onChange={(e) => setAdminForm({ ...adminForm, isActive: e.target.value === 'true' })}
                      style={{ height: 42, fontSize: 13.5, fontWeight: 600 }}
                    >
                      <option value="true">{tr('● សកម្ម (Active)', '● Active')}</option>
                      <option value="false">{tr('● ផ្អាកដំណើរការ (Inactive)', '● Inactive')}</option>
                    </select>
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: 18 }}>
                  <Link
                    href="/admin/saas/users"
                    className="btn btn-cancel"
                    style={{ background: '#dc2626', color: '#ffffff', border: '1px solid #dc2626', fontWeight: 700, padding: '9px 20px', borderRadius: 8, fontSize: 13.5 }}
                  >
                    {tr('បោះបង់', 'Cancel')}
                  </Link>
                  <button
                    type="submit"
                    disabled={creating}
                    className="btn btn-primary"
                    style={{ background: '#2563eb', color: '#ffffff', border: '1px solid #2563eb', fontWeight: 700, padding: '9px 24px', borderRadius: 8, fontSize: 13.5 }}
                  >
                    {creating ? tr('កំពុងរក្សាទុក...', 'Saving...') : tr('រក្សាទុក', 'Save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
            </SaasMasterLayout>
  );
}
