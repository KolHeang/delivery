'use client';

import { SaasMasterLayout } from '@/components/layout/SaasMasterLayout';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { saasApi } from '@/lib/saas-api';
import { getUser, clearAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import { MdArrowBack } from 'react-icons/md';

export default function EditSaasAdminPage() {
  const router = useRouter();
  const params = useParams();
  const adminId = Number(params.id);
  const { lang } = useLanguage();
  const tr = (km: string, en: string) => (lang === 'km' ? km : en);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'super_admin',
    password: '',
    isActive: true,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('access_token');
    const saasAdminRaw = localStorage.getItem('saas_admin');
    const currentUser = getUser();

    if (!token && !saasAdminRaw && !currentUser) {
      router.push('/admin/saas/login');
      return;
    }

    const loadAdmin = async () => {
      try {
        setLoading(true);
        const data = await saasApi.getSaasAdminById(adminId);
        if (data) {
          setAdminForm({
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            role: data.role || 'super_admin',
            password: '',
            isActive: data.isActive !== false,
          });
        }
      } catch (err) {
        alert(tr('បរាជ័យក្នុងការទាញយកព័ត៌មាន SaaS Admin', 'Failed to load SaaS Admin details'));
        router.push('/admin/saas/users');
      } finally {
        setLoading(false);
      }
    };

    if (adminId) {
      loadAdmin();
    }
  }, [adminId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminForm.name.trim() || !adminForm.email.trim()) {
      alert(tr('សូមបំពេញព័ត៌មានចាំបាច់ឱ្យបានគ្រប់គ្រាន់', 'Please fill in required fields'));
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        name: adminForm.name.trim(),
        email: adminForm.email.trim().toLowerCase(),
        phone: adminForm.phone.trim() || undefined,
        role: adminForm.role,
        isActive: adminForm.isActive,
      };
      if (adminForm.password) {
        payload.password = adminForm.password;
      }

      await saasApi.updateSaasAdmin(adminId, payload);
      alert(tr('បានកែប្រែ SaaS Platform Admin ជោគជ័យ!', 'SaaS Platform Admin updated successfully!'));
      router.push('/admin/saas/users');
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការកែប្រែ SaaS Admin', 'Failed to update SaaS Admin'));
    } finally {
      setSaving(false);
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
          {tr('កែប្រែព័ត៌មាន SaaS Platform Admin', 'Edit SaaS Platform Admin')}
        </h1>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
          {tr('កែសម្រួលព័ត៌មានគណនី Admin ឬផ្លាស់ប្តូរពាក្យសម្ងាត់', 'Update Admin account credentials or reset password')}
        </p>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          {tr('កំពុងទាញយកព័ត៌មាន...', 'Loading admin information...')}
        </div>
      ) : (
        /* Full Width Card */
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
                    required
                    className="form-control"
                    placeholder={tr('ឧ. John SuperAdmin', 'e.g. John SuperAdmin')}
                    value={adminForm.name}
                    onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                  />
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
                    required
                    className="form-control"
                    placeholder="admin@ebsexpress.com"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {tr('ពាក្យសម្ងាត់ថ្មី • ទុកទទេបើមិនប្តូរ', 'New Password • Leave empty to keep current')}
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    className="form-control"
                    placeholder={tr('ទុកទទេ ប្រសិនបើមិនចង់ប្តូរ...', 'Leave blank to keep unchanged...')}
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  />
                </div>
              </div>

              {/* Row 3: Role & Status */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    {tr('តួនាទី', 'Admin Role')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    className="form-control"
                    value={adminForm.role}
                    onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value })}
                  >
                    <option value="super_admin">{tr('Super Admin — សិទ្ធិពេញលេញលើ SaaS', 'Super Admin — Full SaaS Access')}</option>
                    <option value="finance_admin">{tr('Finance Admin — គ្រប់គ្រងការទូទាត់ & គម្រោង', 'Finance Admin — Billing & Plans')}</option>
                    <option value="support_admin">{tr('Support Admin — ជំនួយការបច្ចេកទេស', 'Support Admin — Technical Support')}</option>
                  </select>
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
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ background: '#2563eb', color: '#ffffff', border: '1px solid #2563eb', fontWeight: 700 }}
                >
                  {saving ? tr('កំពុងរក្សាទុក...', 'Saving...') : tr('រក្សាទុក', 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SaasMasterLayout>
  );
}
