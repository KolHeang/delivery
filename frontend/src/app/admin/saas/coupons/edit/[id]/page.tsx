'use client';

import { SaasMasterLayout } from '@/components/layout/SaasMasterLayout';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { saasApi } from '@/lib/saas-api';
import { getUser, clearAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import { FlagKm, FlagEn } from '@/components/ui/Flags';
import { SaasCloudIcon } from '@/components/ui/SaasCloudIcon';
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
  MdReceiptLong,
  MdPayment,
} from 'react-icons/md';

export default function EditCouponPage() {
  const router = useRouter();
  const params = useParams();
  const couponId = Number(params.id);
  const { lang, setLang } = useLanguage();
  const tr = (km: string, en: string) => (lang === 'km' ? km : en);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const [couponForm, setCouponForm] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: 20,
    usageLimit: 100,
    expiresAt: '',
    status: 'active',
    isActive: true,
  });

  const handleExpireDateChange = (dateVal: string) => {
    let newStatus = couponForm.status;
    if (dateVal) {
      const selected = new Date(dateVal + 'T23:59:59');
      if (selected.getTime() < Date.now()) {
        newStatus = 'expired';
      } else if (couponForm.status === 'expired') {
        newStatus = 'active';
      }
    }
    setCouponForm(prev => ({
      ...prev,
      expiresAt: dateVal,
      status: newStatus,
      isActive: newStatus === 'active',
    }));
  };

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
          let expDateStr = '';
          if (data.expiresAt) {
            try {
              expDateStr = new Date(data.expiresAt).toISOString().split('T')[0];
            } catch (e) {
              expDateStr = String(data.expiresAt).slice(0, 10);
            }
          }
          let computedStatus = data.status || (data.isActive !== false ? 'active' : 'inactive');
          if (data.expiresAt && new Date(data.expiresAt).getTime() < Date.now()) {
            computedStatus = 'expired';
          }
          setCouponForm({
            code: data.code || '',
            discountType: data.discountType || 'percentage',
            discountValue: Number(data.discountValue) || 0,
            usageLimit: Number(data.usageLimit) || 100,
            expiresAt: expDateStr,
            status: computedStatus,
            isActive: computedStatus === 'active',
          });
        }
      } catch (err) {
        alert('បរាជ័យក្នុងការទាញយកព័ត៌មាន Coupon');
        router.push('/admin/saas/coupons');
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
      const payload: any = {
        code: couponForm.code.toUpperCase().trim(),
        discountType: couponForm.discountType,
        discountValue: Number(couponForm.discountValue),
        usageLimit: Number(couponForm.usageLimit),
        status: couponForm.status,
        isActive: couponForm.status === 'active',
        expiresAt: couponForm.expiresAt ? new Date(couponForm.expiresAt + 'T23:59:59').toISOString() : null,
      };
      await saasApi.updateCoupon(couponId, payload);
      alert('បានកែប្រែ Coupon ជោគជ័យ!');
      router.push('/admin/saas/coupons');
    } catch (err: any) {
      alert(err.response?.data?.message || 'បរាជ័យក្នុងការកែប្រែ Coupon');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SaasMasterLayout activeTab="coupons">
          {/* Back Button & Title */}
          <div style={{ marginBottom: 20 }}>
            <Link
              href="/admin/saas/coupons"
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

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      ថ្ងៃផុតកំណត់ (Expire Date)
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={couponForm.expiresAt}
                      onChange={(e) => handleExpireDateChange(e.target.value)}
                    />
                    {couponForm.expiresAt && new Date(couponForm.expiresAt + 'T23:59:59').getTime() < Date.now() && (
                      <div style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4, fontWeight: 600 }}>
                        ⚠️ កាលបរិច្ឆេទនេះបានផុតកំណត់ហើយ — ស្ថានភាពនឹងក្លាយជា Expired
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      ស្ថានភាព (Status) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      className="form-control"
                      value={couponForm.status}
                      onChange={(e) => setCouponForm({ ...couponForm, status: e.target.value, isActive: e.target.value === 'active' })}
                    >
                      <option value="active">សកម្ម (Active)</option>
                      <option value="inactive">អសកម្ម (Inactive)</option>
                      <option value="expired">ផុតកំណត់ (Expired)</option>
                    </select>
                  </div>
                </div>

                  {/* Submit Buttons */}
                  <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <Link
                      href="/admin/saas/coupons"
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
            </SaasMasterLayout>
  );
}
