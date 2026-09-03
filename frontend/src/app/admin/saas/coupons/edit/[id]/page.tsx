'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
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

export default function EditCouponPage() {
  const router = useRouter();
  const params = useParams();
  const couponId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const [couponForm, setCouponForm] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: 20,
    usageLimit: 100,
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

    const loadCoupon = async () => {
      try {
        setLoading(true);
        const data = await saasApi.getCouponById(couponId);
        if (data) {
          setCouponForm({
            code: data.code || '',
            discountType: data.discountType || 'percentage',
            discountValue: Number(data.discountValue) || 0,
            usageLimit: Number(data.usageLimit) || 100,
            isActive: data.isActive !== false,
          });
        }
      } catch (err) {
        alert('បរាជ័យក្នុងការទាញយកព័ត៌មាន Coupon');
        router.push('/admin/saas?tab=coupons');
      } finally {
        setLoading(false);
      }
    };

    if (couponId) {
      loadCoupon();
    }
  }, [couponId, router]);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleLogout = () => {
    if (confirm('តើអ្នកពិតជាចង់ចាកចេញពីប្រព័ន្ធ (Logout) មែនទេ?')) {
      clearAuth();
      localStorage.removeItem('saas_admin');
      router.push('/admin/saas/login');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};
    if (!couponForm.code.trim()) newErrors.code = 'សូមបញ្ចូល Coupon Code';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert('សូមបញ្ចូល Coupon Code');
      return;
    }

    try {
      setSaving(true);
      await saasApi.updateCoupon(couponId, couponForm);
      alert('បានកែប្រែ Coupon ជោគជ័យ!');
      router.push('/admin/saas?tab=coupons');
    } catch (err: any) {
      alert(err.response?.data?.message || 'បរាជ័យក្នុងការកែប្រែ Coupon');
    } finally {
      setSaving(false);
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
              background: 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              borderLeft: '4px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <MdGroup size={20} color="#bfdbfe" />
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
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 700,
              textDecoration: 'none',
              borderLeft: '4px solid #60a5fa',
              transition: 'all 0.15s',
            }}
          >
            <MdLocalOffer size={20} color="#60a5fa" />
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
                    boxShadow: '0 14px 35px -4px rgba(0,0,0,0.22)',
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
              href="/admin/saas?tab=coupons"
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
              <span>ត្រឡប់ទៅបញ្ជីគូប៉ុង</span>
            </Link>

            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              កែប្រែ Promo Coupon
            </h1>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
              កែប្រែកូដ ឬតម្លៃបញ្ចុះតម្លៃសម្រាប់អតិថិជនជាវ Subscription
            </p>
          </div>

          {/* Form Card */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">ព័ត៌មាន Promo Coupon</span>
            </div>

            <div className="card-body">
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>កំពុងទាញយកទិន្នន័យ...</div>
              ) : (
                <form onSubmit={handleSubmit} autoComplete="off">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        Coupon Code <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${errors.code ? 'is-invalid' : ''}`}
                        placeholder="ឧ. PROMO2026, SUMMER20"
                        value={couponForm.code}
                        onChange={(e) => {
                          setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() });
                          if (errors.code) setErrors(prev => { const n = { ...prev }; delete n.code; return n; });
                        }}
                      />
                      {errors.code && <div className="form-error-text" style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4, fontWeight: 600 }}>{errors.code}</div>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        ប្រភេទបញ្ចុះតម្លៃ <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <select
                        className="form-control"
                        value={couponForm.discountType}
                        onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value })}
                      >
                        <option value="percentage">ភាគរយ (%)</option>
                        <option value="fixed">ចំនួនទឹកប្រាក់ថេរ ($)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        តម្លៃបញ្ចុះ {couponForm.discountType === 'percentage' ? '(%)' : '($)'} <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={couponForm.discountType === 'percentage' ? 100 : 10000}
                        className="form-control"
                        value={couponForm.discountValue}
                        onChange={(e) => setCouponForm({ ...couponForm, discountValue: Number(e.target.value) })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        ចំនួនប្រើប្រាស់អតិបរមា
                      </label>
                      <input
                        type="number"
                        min={1}
                        className="form-control"
                        value={couponForm.usageLimit}
                        onChange={(e) => setCouponForm({ ...couponForm, usageLimit: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={couponForm.isActive}
                        onChange={(e) => setCouponForm({ ...couponForm, isActive: e.target.checked })}
                      />
                      <span>ដំណើរការសកម្ម</span>
                    </label>
                  </div>

                  {/* Submit Buttons */}
                  <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <Link
                      href="/admin/saas?tab=coupons"
                      className="btn btn-cancel"
                      style={{ background: '#dc2626', color: '#ffffff', border: '1px solid #dc2626', fontWeight: 700 }}
                    >
                      បោះបង់
                    </Link>
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn btn-primary"
                      style={{ background: '#2563eb', color: '#ffffff', border: '1px solid #2563eb', fontWeight: 700 }}
                    >
                      {saving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុក'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
