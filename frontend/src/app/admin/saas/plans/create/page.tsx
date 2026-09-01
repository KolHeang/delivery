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
  MdBarChart,
  MdLocalShipping,
  MdStorefront,
  MdPeople,
  MdAccountBalanceWallet,
  MdReceipt,
  MdSettings,
  MdLanguage,
  MdNotifications,
  MdVpnKey,
} from 'react-icons/md';

export default function CreatePlanPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const [planForm, setPlanForm] = useState({
    name: '',
    slug: '',
    description: '',
    priceMonthly: 29,
    priceYearly: 290,
    maxUsers: 10,
    maxDrivers: 15,
    maxMerchants: 50,
    maxOrdersPerMonth: 2000,
    maxVehicles: 15,
    isPopular: false,
    isActive: true,
    features: {
      dashboard: true,
      summary: true,
      delivery: true,
      shops: true,
      staff: true,
      payment: true,
      accounting: true,
      reports: true,
      settings: true,
      customDomain: false,
      telegramBot: true,
      apiAccess: false,
    },
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
    if (!planForm.name || !planForm.slug) {
      alert('សូមបំពេញឈ្មោះ និង Slug របស់ Plan');
      return;
    }

    try {
      setSaving(true);
      await saasApi.createPlan(planForm);
      alert('បានបង្កើត Plan ថ្មីជោគជ័យ!');
      router.push('/admin/saas?tab=plans');
    } catch (err: any) {
      alert(err.response?.data?.message || 'បរាជ័យក្នុងការបង្កើត Plan');
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
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 700,
              textDecoration: 'none',
              borderLeft: '4px solid #60a5fa',
              transition: 'all 0.15s',
            }}
          >
            <MdWorkspacePremium size={20} color="#60a5fa" />
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
              href="/admin/saas?tab=plans"
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
              <span>ត្រឡប់ទៅបញ្ជីកញ្ចប់សេវា</span>
            </Link>

            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              បង្កើតកញ្ចប់សេវា (Subscription Plan) ថ្មី
            </h1>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
              កំណត់តម្លៃ កម្រិត Quota និង Features សម្រាប់ក្រុមហ៊ុនជាវសេវា
            </p>
          </div>

          {/* Form Card */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">ព័ត៌មាន Plan</span>
            </div>

            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      ឈ្មោះកញ្ចប់សេវា <span>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      placeholder="ឧ. Starter Express, Pro Plan"
                      value={planForm.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPlanForm({
                          ...planForm,
                          name: val,
                          slug: planForm.slug || val.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                        });
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Slug សម្គាល់ <span>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      placeholder="starter-express"
                      value={planForm.slug}
                      onChange={(e) => setPlanForm({ ...planForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    ការពិពណ៌នាសង្ខេប
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ឧ. សមស្របសម្រាប់ក្រុមហ៊ុនដឹកជញ្ជូនខ្នាតតូច"
                    value={planForm.description}
                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      តម្លៃប្រចាំខែ ($) <span>*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      className="form-control"
                      value={planForm.priceMonthly}
                      onChange={(e) => setPlanForm({ ...planForm, priceMonthly: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      តម្លៃប្រចាំឆ្នាំ ($) <span>*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      className="form-control"
                      value={planForm.priceYearly}
                      onChange={(e) => setPlanForm({ ...planForm, priceYearly: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      ចំនួនអ្នកដឹកជញ្ជូន <span>*</span>
                    </label>
                    <input
                      type="number"
                      required
                      className="form-control"
                      value={planForm.maxDrivers}
                      onChange={(e) => setPlanForm({ ...planForm, maxDrivers: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      ចំនួនហាងទំនិញ <span>*</span>
                    </label>
                    <input
                      type="number"
                      required
                      className="form-control"
                      value={planForm.maxMerchants}
                      onChange={(e) => setPlanForm({ ...planForm, maxMerchants: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      ចំនួនកញ្ចប់ឥវ៉ាន់ប្រចាំខែ <span>*</span>
                    </label>
                    <input
                      type="number"
                      required
                      className="form-control"
                      value={planForm.maxOrdersPerMonth}
                      onChange={(e) => setPlanForm({ ...planForm, maxOrdersPerMonth: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      ចំនួនយានយន្ត <span>*</span>
                    </label>
                    <input
                      type="number"
                      required
                      className="form-control"
                      value={planForm.maxVehicles}
                      onChange={(e) => setPlanForm({ ...planForm, maxVehicles: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Feature Permissions / Module Access Controls */}
                <div style={{ marginTop: 28, marginBottom: 20, background: '#f8fafc', padding: '20px 22px', borderRadius: 16, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                        សិទ្ធិ និងមុខងារម៉ូឌុល
                      </div>
                      <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
                        កំណត់សិទ្ធិបើក ឬបិទម៉ូឌុលនីមួយៗនៅលើ Sidebar សម្រាប់ក្រុមហ៊ុនជាវកញ្ចប់នេះ
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setPlanForm({
                            ...planForm,
                            features: {
                              dashboard: true, summary: true, delivery: true, shops: true,
                              staff: true, payment: true, accounting: true, reports: true,
                              settings: true, customDomain: true, telegramBot: true, apiAccess: true,
                            },
                          });
                        }}
                        style={{
                          fontSize: 12.5,
                          padding: '6px 14px',
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontWeight: 700,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        ✓ ជ្រើសទាំងអស់
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPlanForm({
                            ...planForm,
                            features: {
                              dashboard: true, summary: false, delivery: true, shops: true,
                              staff: false, payment: false, accounting: false, reports: false,
                              settings: false, customDomain: false, telegramBot: false, apiAccess: false,
                            },
                          });
                        }}
                        style={{
                          fontSize: 12.5,
                          padding: '6px 14px',
                          background: '#ffffff',
                          color: '#64748b',
                          border: '1px solid #cbd5e1',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontWeight: 600,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        ✕ មូលដ្ឋាន
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginTop: 16 }}>
                    {[
                      { key: 'dashboard', icon: MdDashboard, label: 'ផ្ទាំងគ្រប់គ្រង', desc: 'ទិដ្ឋភាពទូទៅនៃប្រព័ន្ធ ស្ថិតិកញ្ចប់ និងក្រាហ្វ', color: '#2563eb', bg: '#eff6ff' },
                      { key: 'summary', icon: MdBarChart, label: 'តារាងសង្ខេប', desc: 'សង្ខេបហាង សង្ខេបការដឹក និងសង្ខេបការទៅយក', color: '#7c3aed', bg: '#f5f3ff' },
                      { key: 'delivery', icon: MdLocalShipping, label: 'គ្រប់គ្រងការដឹក', desc: 'កត់ត្រាទិន្នន័យ បញ្ជីដឹក វិក្កយបត្រ ទទួលកញ្ចប់ ចែកអ្នកដឹក', color: '#059669', bg: '#ecfdf5' },
                      { key: 'shops', icon: MdStorefront, label: 'គ្រប់គ្រងហាង', desc: 'បញ្ជីហាងទំនិញ ព័ត៌មានហាង និងកម្រៃសេវាដឹក', color: '#d97706', bg: '#fffbeb' },
                      { key: 'staff', icon: MdPeople, label: 'គ្រប់គ្រងអ្នកប្រើប្រាស់', desc: 'បញ្ជីអ្នកប្រើប្រាស់ អ្នកគ្រប់គ្រង បុគ្គលិក និងអ្នកដឹក', color: '#4f46e5', bg: '#eef2ff' },
                      { key: 'payment', icon: MdAccountBalanceWallet, label: 'ការទូទាត់ប្រាក់', desc: 'ទូទាត់ប្រាក់ជាមួយអ្នកដឹក និងទូទាត់ប្រាក់ជាមួយហាង', color: '#0d9488', bg: '#f0fdfa' },
                      { key: 'accounting', icon: MdReceipt, label: 'គណនេយ្យ', desc: 'បញ្ជីចំណាយ បញ្ជីចំណូល ប្រភេទចំណូល និងក្រុមចំណាយ', color: '#0284c7', bg: '#f0f9ff' },
                      { key: 'reports', icon: MdBarChart, label: 'របាយការណ៍', desc: 'របាយការណ៍ហិរញ្ញវត្ថុ និងប្រតិបត្តិការដឹកជញ្ជូន', color: '#b45309', bg: '#fffbeb' },
                      { key: 'settings', icon: MdSettings, label: 'ការកំណត់ផ្សេងៗ', desc: 'តំបន់ដឹក សិទ្ធិអ្នកប្រើប្រាស់ ការកំណត់អង្គភាព និងទូទៅ', color: '#475569', bg: '#f1f5f9' },
                      { key: 'customDomain', icon: MdLanguage, label: 'ភ្ជាប់ Domain ផ្ទាល់ខ្លួន', desc: 'អនុញ្ញាតឱ្យប្រើប្រាស់ Domain ផ្ទាល់ខ្លួនរបស់ក្រុមហ៊ុន', color: '#2563eb', bg: '#eff6ff' },
                      { key: 'telegramBot', icon: MdNotifications, label: 'ការជូនដំណឹង Telegram', desc: 'ការជូនដំណឹងស្វ័យប្រវត្តិតាម Telegram Bot', color: '#0284c7', bg: '#f0f9ff' },
                      { key: 'apiAccess', icon: MdVpnKey, label: 'ប្រព័ន្ធភ្ជាប់ API', desc: 'សិទ្ធិភ្ជាប់ជាមួយ Website ឬប្រព័ន្ធខាងក្រៅ', color: '#e11d48', bg: '#fff1f2' },
                    ].map((f) => {
                      const Icon = f.icon;
                      const isChecked = Boolean((planForm.features as any)?.[f.key] !== false);
                      return (
                        <div
                          key={f.key}
                          onClick={() => {
                            setPlanForm({
                              ...planForm,
                              features: {
                                ...planForm.features,
                                [f.key]: !isChecked,
                              },
                            });
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '14px 16px',
                            background: isChecked ? '#ffffff' : '#f8fafc',
                            border: `1.5px solid ${isChecked ? '#2563eb' : '#e2e8f0'}`,
                            borderRadius: 14,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: isChecked ? '0 4px 12px rgba(37, 99, 235, 0.08)' : 'none',
                            userSelect: 'none',
                          }}
                        >
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 10,
                              background: isChecked ? f.bg : '#f1f5f9',
                              color: isChecked ? f.color : '#94a3b8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Icon size={20} />
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: isChecked ? '#0f172a' : '#64748b' }}>
                              {f.label}
                            </div>
                            <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {f.desc}
                            </div>
                          </div>

                          {/* Custom Toggle / Checkbox */}
                          <div
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 6,
                              border: `2px solid ${isChecked ? '#2563eb' : '#cbd5e1'}`,
                              background: isChecked ? '#2563eb' : '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontSize: 13,
                              fontWeight: 900,
                              flexShrink: 0,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {isChecked && '✓'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Buttons */}
                <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <Link
                    href="/admin/saas?tab=plans"
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
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
