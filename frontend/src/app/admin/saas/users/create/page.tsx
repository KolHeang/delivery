'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saasApi } from '@/lib/saas-api';
import { getUser, clearAuth } from '@/lib/auth';
import {
  MdDashboard,
  MdBusiness,
  MdArrowBack,
  MdGroup,
  MdWorkspacePremium,
  MdLocalOffer,
  MdAttachMoney,
  MdLogout,
  MdKeyboardArrowDown,
} from 'react-icons/md';

export default function CreateSaasAdminPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    password: '',
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
    if (confirm('តើអ្នកពិតជាចង់ចាកចេញពីប្រព័ន្ធ (Logout) មែនទេ?')) {
      clearAuth();
      localStorage.removeItem('saas_admin');
      router.push('/admin/saas/login');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!adminForm.name.trim()) {
      errs.name = 'សូមបំពេញឈ្មោះអ្នកគ្រប់គ្រង';
    }
    if (!adminForm.email.trim()) {
      errs.email = 'សូមបំពេញអ៊ីម៉ែល';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminForm.email.trim())) {
      errs.email = 'សូមបំពេញអ៊ីម៉ែលត្រឹមត្រូវ';
    }
    if (!adminForm.password) {
      errs.password = 'សូមបំពេញពាក្យសម្ងាត់';
    } else if (adminForm.password.length < 6) {
      errs.password = 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៦ តួអក្សរ';
    }
    if (!adminForm.role) {
      errs.role = 'សូមជ្រើសរើសតួនាទី';
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

      alert('បានបង្កើត SaaS Platform Admin ជោគជ័យ!');
      router.push('/admin/saas?tab=users');
    } catch (err: any) {
      alert(err.response?.data?.message || 'បរាជ័យក្នុងការបង្កើត SaaS Admin');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'inherit' }}>
      {/* 1. SIDEBAR */}
      <aside
        style={{
          width: 270,
          background: '#2b529a',
          borderRight: '1px solid rgba(255, 255, 255, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 100,
          boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#1e3b75', fontSize: 20 }}>
            EBS
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, color: '#ffffff' }}>EBS CLOUD</div>
            <div style={{ fontSize: 11, color: '#bfdbfe', fontWeight: 600 }}>SaaS Management</div>
          </div>
        </div>

        <div style={{ padding: '20px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Link
            href="/admin/saas?tab=dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 10,
              background: 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              borderLeft: '4px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <MdDashboard size={20} color="#bfdbfe" />
            <span>ផ្ទាំងគ្រប់គ្រងទូទៅ</span>
          </Link>

          <Link
            href="/admin/saas?tab=tenants"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 10,
              background: 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              borderLeft: '4px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <MdBusiness size={20} color="#bfdbfe" />
            <span>បញ្ជីក្រុមហ៊ុនជាវសេវា</span>
          </Link>

          <Link
            href="/admin/saas?tab=users"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 700,
              textDecoration: 'none',
              borderLeft: '4px solid #60a5fa',
              transition: 'all 0.15s',
            }}
          >
            <MdGroup size={20} color="#60a5fa" />
            <span>គណនី SaaS Admins</span>
          </Link>

          <Link
            href="/admin/saas?tab=plans"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 10,
              background: 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              borderLeft: '4px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <MdWorkspacePremium size={20} color="#bfdbfe" />
            <span>កញ្ចប់សេវា</span>
          </Link>

          <Link
            href="/admin/saas?tab=coupons"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 10,
              background: 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              borderLeft: '4px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <MdLocalOffer size={20} color="#bfdbfe" />
            <span>គូប៉ុងបញ្ចុះតម្លៃ</span>
          </Link>

          <Link
            href="/admin/saas?tab=partners"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 10,
              background: 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              borderLeft: '4px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <MdAttachMoney size={20} color="#bfdbfe" />
            <span>ដៃគូសហការ</span>
          </Link>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div style={{ flex: 1, marginLeft: 270, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Topbar */}
        <header
          style={{
            height: 64,
            background: '#2b529a',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            padding: '0 32px',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 80,
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          {/* User Profile Dropdown */}
          <div style={{ position: 'relative', paddingLeft: 14, borderLeft: '1px solid rgba(255, 255, 255, 0.2)' }}>
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: showProfileDropdown ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 12,
                padding: '6px 12px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: 14,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#ffffff', lineHeight: 1.2 }}>{user?.name || 'Admin User'}</div>
                <div style={{ fontSize: 11, color: '#bfdbfe', fontWeight: 600 }}>{user?.email || 'admin@gmail.com'}</div>
              </div>
              <MdKeyboardArrowDown
                size={20}
                color="#ffffff"
                style={{
                  marginLeft: 4,
                  transform: showProfileDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              />
            </button>

            {showProfileDropdown && (
              <>
                <div
                  onClick={() => setShowProfileDropdown(false)}
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: 250,
                    background: '#ffffff',
                    borderRadius: 16,
                    boxShadow: '0 14px 35px -4px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.08)',
                    border: '1px solid #e2e8f0',
                    padding: '8px',
                    zIndex: 95,
                  }}
                >
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 900, color: '#0f172a' }}>{user?.name || 'Admin User'}</div>
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>{user?.email || 'admin@gmail.com'}</div>
                  </div>

                  <div style={{ padding: '6px 0' }}>
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        handleLogout();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '9px 12px',
                        border: 'none',
                        background: '#fef2f2',
                        color: '#dc2626',
                        fontSize: 13,
                        fontWeight: 800,
                        borderRadius: 10,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <MdLogout size={18} />
                      <span>ចាកចេញ (Logout)</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page Content Body */}
        <main style={{ flex: 1, padding: '24px 32px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
          {/* Back Button & Title */}
          <div style={{ marginBottom: 20 }}>
              <Link
                href="/admin/saas?tab=users"
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
                <span>ត្រឡប់ទៅបញ្ជី SaaS Admins</span>
              </Link>

              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                បង្កើត SaaS Platform Admin ថ្មី
              </h1>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
                គណនី Admin សម្រាប់គ្រប់គ្រងប្រព័ន្ធ Master SaaS (តារាង saas_admins ដាច់ដោយឡែក)
              </p>
            </div>

            {/* Form Card */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">ព័ត៌មានគណនី Admin</span>
              </div>

              <div className="card-body">
                <form onSubmit={handleSubmit} autoComplete="off" noValidate>
                  {/* Invisible fake inputs to prevent aggressive browser autofill */}
                  <input type="text" style={{ display: 'none' }} tabIndex={-1} readOnly />
                  <input type="password" style={{ display: 'none' }} tabIndex={-1} readOnly />

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        ឈ្មោះអ្នកគ្រប់គ្រង <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                        placeholder="ឧ. John SuperAdmin"
                        value={adminForm.name}
                        onChange={(e) => {
                          setAdminForm({ ...adminForm, name: e.target.value });
                          if (errors.name) setErrors(prev => { const n = { ...prev }; delete n.name; return n; });
                        }}
                      />
                      {errors.name && <div className="form-error-text">{errors.name}</div>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        លេខទូរស័ព្ទ
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

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        អ៊ីមែលសម្រាប់ Login <span style={{ color: '#ef4444' }}>*</span>
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
                          if (errors.email) setErrors(prev => { const n = { ...prev }; delete n.email; return n; });
                        }}
                      />
                      {errors.email && <div className="form-error-text">{errors.email}</div>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        ពាក្យសម្ងាត់ <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="password"
                        name="saas_new_admin_password_field"
                        id="saas_new_admin_password_field"
                        autoComplete="new-password"
                        className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                        placeholder="បញ្ចូលពាក្យសម្ងាត់..."
                        value={adminForm.password}
                        onChange={(e) => {
                          setAdminForm({ ...adminForm, password: e.target.value });
                          if (errors.password) setErrors(prev => { const n = { ...prev }; delete n.password; return n; });
                        }}
                      />
                      {errors.password && <div className="form-error-text">{errors.password}</div>}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        តួនាទី <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <select
                        className={`form-control ${errors.role ? 'is-invalid' : ''}`}
                        value={adminForm.role}
                        onChange={(e) => {
                          setAdminForm({ ...adminForm, role: e.target.value });
                          if (errors.role) setErrors(prev => { const n = { ...prev }; delete n.role; return n; });
                        }}
                      >
                        <option value="">-- ជ្រើសរើសតួនាទី (Select Role) --</option>
                        <option value="super_admin">Super Admin (សិទ្ធិពេញលេញលើ SaaS)</option>
                        <option value="finance_admin">Finance Admin (គ្រប់គ្រងការទូទាត់ & គម្រោង)</option>
                        <option value="support_admin">Support Admin (ជំនួយការបច្ចេកទេស)</option>
                      </select>
                      {errors.role && <div className="form-error-text">{errors.role}</div>}
                    </div>
                  </div>

                  {/* Submit Buttons */}
                  <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <Link
                      href="/admin/saas?tab=users"
                      className="btn btn-cancel"
                      style={{ background: '#dc2626', color: '#ffffff', border: '1px solid #dc2626', fontWeight: 700 }}
                    >
                      បោះបង់
                    </Link>
                    <button
                      type="submit"
                      disabled={creating}
                      className="btn btn-primary"
                      style={{ background: '#2563eb', color: '#ffffff', border: '1px solid #2563eb', fontWeight: 700 }}
                    >
                      {creating ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
        </main>
      </div>
    </div>
  );
}
