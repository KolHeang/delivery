'use client';

import { SaasMasterLayout } from '@/components/layout/SaasMasterLayout';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saasApi } from '@/lib/saas-api';
import { getUser } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import { MdArrowBack } from 'react-icons/md';

export default function CreateSaasAdminPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const tr = (km: string, en: string) => (lang === 'km' ? km : en);

  const [creating, setCreating] = useState(false);

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
  }, [router]);

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
          }}
        >
          <MdArrowBack size={16} />
          <span>{tr('ត្រឡប់ទៅបញ្ជី SaaS Admins', 'Back to SaaS Admins List')}</span>
        </Link>

        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
          {tr('បង្កើត SaaS Platform Admin ថ្មី', 'Create New SaaS Platform Admin')}
        </h1>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
          {tr('គណនី Admin សម្រាប់គ្រប់គ្រងប្រព័ន្ធ Master SaaS', 'Platform Admin account for managing Master SaaS delivery infrastructure')}
        </p>
      </div>

      {/* Full Width Card */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            {tr('ព័ត៌មានគណនី SaaS Admin', 'SaaS Admin Account Information')}
          </span>
        </div>

        <div className="card-body">
          <form onSubmit={handleSubmit} autoComplete="off">
            {/* Row 1: Name & Phone */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  {tr('ឈ្មោះអ្នកគ្រប់គ្រង', 'Admin Full Name')} <span style={{ color: '#ef4444' }}>*</span>
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
                />
                {errors.name && <div style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4 }}>{errors.name}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  {tr('លេខទូរស័ព្ទ', 'Phone Number')}
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="012 345 678"
                  value={adminForm.phone}
                  onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
                />
              </div>
            </div>

            {/* Row 2: Email & Password */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  {tr('Email សម្រាប់ Login', 'Login Email')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email"
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  placeholder="admin@ebsexpress.com"
                  value={adminForm.email}
                  onChange={(e) => {
                    setAdminForm({ ...adminForm, email: e.target.value });
                    if (errors.email) setErrors((prev) => { const n = { ...prev }; delete n.email; return n; });
                  }}
                />
                {errors.email && <div style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4 }}>{errors.email}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  {tr('ពាក្យសម្ងាត់', 'Password')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                  placeholder={tr('បញ្ចូលពាក្យសម្ងាត់យ៉ាងតិច ៦ ខ្ទង់...', 'Enter password (min 6 chars)...')}
                  value={adminForm.password}
                  onChange={(e) => {
                    setAdminForm({ ...adminForm, password: e.target.value });
                    if (errors.password) setErrors((prev) => { const n = { ...prev }; delete n.password; return n; });
                  }}
                />
                {errors.password && <div style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4 }}>{errors.password}</div>}
              </div>
            </div>

            {/* Row 3: Role & Status */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  {tr('តួនាទី', 'Admin Role')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  className={`form-control ${errors.role ? 'is-invalid' : ''}`}
                  value={adminForm.role}
                  onChange={(e) => {
                    setAdminForm({ ...adminForm, role: e.target.value });
                    if (errors.role) setErrors((prev) => { const n = { ...prev }; delete n.role; return n; });
                  }}
                >
                  <option value="super_admin">{tr('Super Admin — សិទ្ធិពេញលេញលើ SaaS', 'Super Admin — Full SaaS Access')}</option>
                  <option value="finance_admin">{tr('Finance Admin — គ្រប់គ្រងការទូទាត់ & គម្រោង', 'Finance Admin — Billing & Plans')}</option>
                  <option value="support_admin">{tr('Support Admin — ជំនួយការបច្ចេកទេស', 'Support Admin — Technical Support')}</option>
                </select>
                {errors.role && <div style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4 }}>{errors.role}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  {tr('ស្ថានភាពគណនី', 'Account Status')}
                </label>
                <select
                  className="form-control"
                  value={adminForm.isActive ? 'true' : 'false'}
                  onChange={(e) => setAdminForm({ ...adminForm, isActive: e.target.value === 'true' })}
                >
                  <option value="true">{tr('● សកម្ម', '● Active')}</option>
                  <option value="false">{tr('● ផ្អាកដំណើរការ', '● Inactive')}</option>
                </select>
              </div>
            </div>

            {/* Form Action Buttons */}
            <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <Link
                href="/admin/saas/users"
                className="btn btn-cancel"
                style={{ background: '#dc2626', color: '#ffffff', border: '1px solid #dc2626', fontWeight: 700 }}
              >
                {tr('បោះបង់', 'Cancel')}
              </Link>
              <button
                type="submit"
                disabled={creating}
                className="btn btn-primary"
                style={{ background: '#2563eb', color: '#ffffff', border: '1px solid #2563eb', fontWeight: 700 }}
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
