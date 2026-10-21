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
  MdReceiptLong,
  MdPayment,
} from 'react-icons/md';

export default function EditPlanPage() {
  const router = useRouter();
  const params = useParams();
  const planId = Number(params.id);
  const { lang, setLang } = useLanguage();
  const tr = (km: string, en: string) => (lang === 'km' ? km : en);

  const [loading, setLoading] = useState(true);
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

    const loadPlan = async () => {
      try {
        setLoading(true);
        const data = await saasApi.getPlanById(planId);
        if (data) {
          setPlanForm({
            name: data.name || '',
            slug: data.slug || '',
            description: data.description || '',
            priceMonthly: Number(data.priceMonthly) || 0,
            priceYearly: Number(data.priceYearly) || 0,
            maxUsers: data.maxUsers != null ? Number(data.maxUsers) : 10,
            maxDrivers: data.maxDrivers != null ? Number(data.maxDrivers) : 15,
            maxMerchants: data.maxMerchants != null ? Number(data.maxMerchants) : 50,
            maxOrdersPerMonth: data.maxOrdersPerMonth != null ? Number(data.maxOrdersPerMonth) : 2000,
            maxVehicles: data.maxVehicles != null ? Number(data.maxVehicles) : 15,
            isPopular: !!data.isPopular,
            isActive: data.isActive !== false,
            features: {
              dashboard: data.features?.dashboard !== false,
              summary: data.features?.summary !== false,
              delivery: data.features?.delivery !== false,
              shops: data.features?.shops !== false,
              staff: data.features?.staff !== false,
              payment: data.features?.payment !== false,
              accounting: data.features?.accounting !== false,
              reports: data.features?.reports !== false,
              settings: data.features?.settings !== false,
              customDomain: Boolean(data.features?.customDomain),
              telegramBot: data.features?.telegramBot !== false && data.features?.telegramNotifications !== false,
              apiAccess: Boolean(data.features?.apiAccess),
            },
          });
        }
      } catch (err) {
        alert('បរាជ័យក្នុងការទាញយកព័ត៌មាន Plan');
        router.push('/admin/saas/plans');
      } finally {
        setLoading(false);
      }
    };

    if (planId) {
      loadPlan();
    }
  }, [planId, router]);

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
    if (!planForm.name.trim()) newErrors.name = 'សូមបញ្ចូលឈ្មោះកញ្ចប់សេវា';
    if (!planForm.slug.trim()) newErrors.slug = 'សូមបញ្ចូល Slug សម្គាល់';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert('សូមបំពេញឈ្មោះ និង Slug របស់ Plan');
      return;
    }

    try {
      setSaving(true);
      await saasApi.updatePlan(planId, planForm);
      alert('បានកែប្រែ Plan ជោគជ័យ!');
      router.push('/admin/saas/plans');
    } catch (err: any) {
      alert(err.response?.data?.message || 'បរាជ័យក្នុងការកែប្រែ Plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SaasMasterLayout activeTab="plans">
          {/* Back Button & Title */}
          <div style={{ marginBottom: 20 }}>
            <Link
              href="/admin/saas/plans"
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
              កែប្រែកញ្ចប់សេវា (Subscription Plan)
            </h1>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
              កែប្រែតម្លៃ ដែនកំណត់ Quota និងស្ថានភាពដំណើរការរបស់ Plan
            </p>
          </div>

          {/* Form Card */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">ព័ត៌មាន Plan</span>
            </div>

            <div className="card-body">
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>កំពុងទាញយកទិន្នន័យ...</div>
              ) : (
                <form onSubmit={handleSubmit} autoComplete="off">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        ឈ្មោះកញ្ចប់សេវា <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                        placeholder="ឧ. Starter Express, Pro Plan"
                        value={planForm.name}
                        onChange={(e) => {
                          setPlanForm({ ...planForm, name: e.target.value });
                          if (errors.name) setErrors(prev => { const n = { ...prev }; delete n.name; return n; });
                        }}
                      />
                      {errors.name && <div className="form-error-text" style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4, fontWeight: 600 }}>{errors.name}</div>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Slug សម្គាល់ <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${errors.slug ? 'is-invalid' : ''}`}
                        placeholder="starter-express"
                        value={planForm.slug}
                        onChange={(e) => {
                          setPlanForm({ ...planForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') });
                          if (errors.slug) setErrors(prev => { const n = { ...prev }; delete n.slug; return n; });
                        }}
                      />
                      {errors.slug && <div className="form-error-text" style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4, fontWeight: 600 }}>{errors.slug}</div>}
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
                        តម្លៃប្រចាំខែ ($) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        value={planForm.priceMonthly}
                        onChange={(e) => setPlanForm({ ...planForm, priceMonthly: Number(e.target.value) })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        តម្លៃប្រចាំឆ្នាំ ($) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        value={planForm.priceYearly}
                        onChange={(e) => setPlanForm({ ...planForm, priceYearly: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label className="form-label" style={{ margin: 0 }}>
                          ចំនួនអ្នកដឹកជញ្ជូន <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: Number(planForm.maxDrivers) === 0 ? '#10b981' : '#64748b' }}>
                          {Number(planForm.maxDrivers) === 0 ? '✨ 0 = មិនកំណត់ (Unlimited)' : '0 = មិនកំណត់'}
                        </span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        className="form-control"
                        placeholder="0 = មិនកំណត់ (Unlimited)"
                        value={planForm.maxDrivers}
                        onChange={(e) => setPlanForm({ ...planForm, maxDrivers: e.target.value === '' ? 0 : Number(e.target.value) })}
                        style={Number(planForm.maxDrivers) === 0 ? { borderColor: '#10b981', background: '#f0fdf4' } : undefined}
                      />
                      {Number(planForm.maxDrivers) === 0 && (
                        <div style={{ fontSize: 11.5, color: '#059669', fontWeight: 600, marginTop: 4 }}>
                          ✓ មិនកំណត់ចំនួនអ្នកដឹកជញ្ជូន (Unlimited Drivers)
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label className="form-label" style={{ margin: 0 }}>
                          ចំនួនហាងទំនិញ <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: Number(planForm.maxMerchants) === 0 ? '#10b981' : '#64748b' }}>
                          {Number(planForm.maxMerchants) === 0 ? '✨ 0 = មិនកំណត់ (Unlimited)' : '0 = មិនកំណត់'}
                        </span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        className="form-control"
                        placeholder="0 = មិនកំណត់ (Unlimited)"
                        value={planForm.maxMerchants}
                        onChange={(e) => setPlanForm({ ...planForm, maxMerchants: e.target.value === '' ? 0 : Number(e.target.value) })}
                        style={Number(planForm.maxMerchants) === 0 ? { borderColor: '#10b981', background: '#f0fdf4' } : undefined}
                      />
                      {Number(planForm.maxMerchants) === 0 && (
                        <div style={{ fontSize: 11.5, color: '#059669', fontWeight: 600, marginTop: 4 }}>
                          ✓ មិនកំណត់ចំនួនហាងទំនិញ (Unlimited Merchants)
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label className="form-label" style={{ margin: 0 }}>
                          ចំនួនកញ្ចប់ឥវ៉ាន់ប្រចាំខែ <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: Number(planForm.maxOrdersPerMonth) === 0 ? '#10b981' : '#64748b' }}>
                          {Number(planForm.maxOrdersPerMonth) === 0 ? '✨ 0 = មិនកំណត់ (Unlimited)' : '0 = មិនកំណត់'}
                        </span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        className="form-control"
                        placeholder="0 = មិនកំណត់ (Unlimited)"
                        value={planForm.maxOrdersPerMonth}
                        onChange={(e) => setPlanForm({ ...planForm, maxOrdersPerMonth: e.target.value === '' ? 0 : Number(e.target.value) })}
                        style={Number(planForm.maxOrdersPerMonth) === 0 ? { borderColor: '#10b981', background: '#f0fdf4' } : undefined}
                      />
                      {Number(planForm.maxOrdersPerMonth) === 0 && (
                        <div style={{ fontSize: 11.5, color: '#059669', fontWeight: 600, marginTop: 4 }}>
                          ✓ មិនកំណត់ចំនួនកញ្ចប់ឥវ៉ាន់ (Unlimited Monthly Orders)
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label className="form-label" style={{ margin: 0 }}>
                          ចំនួនយានយន្ត <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: Number(planForm.maxVehicles) === 0 ? '#10b981' : '#64748b' }}>
                          {Number(planForm.maxVehicles) === 0 ? '✨ 0 = មិនកំណត់ (Unlimited)' : '0 = មិនកំណត់'}
                        </span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        className="form-control"
                        placeholder="0 = មិនកំណត់ (Unlimited)"
                        value={planForm.maxVehicles}
                        onChange={(e) => setPlanForm({ ...planForm, maxVehicles: e.target.value === '' ? 0 : Number(e.target.value) })}
                        style={Number(planForm.maxVehicles) === 0 ? { borderColor: '#10b981', background: '#f0fdf4' } : undefined}
                      />
                      {Number(planForm.maxVehicles) === 0 && (
                        <div style={{ fontSize: 11.5, color: '#059669', fontWeight: 600, marginTop: 4 }}>
                          ✓ មិនកំណត់ចំនួនយានយន្ត (Unlimited Vehicles)
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 20, margin: '14px 0 20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={planForm.isPopular}
                        onChange={(e) => setPlanForm({ ...planForm, isPopular: e.target.checked })}
                      />
                      <span>កញ្ចប់ពេញនិយម</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={planForm.isActive}
                        onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                      />
                      <span>ដំណើរការសកម្ម</span>
                    </label>
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
                      href="/admin/saas/plans"
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
