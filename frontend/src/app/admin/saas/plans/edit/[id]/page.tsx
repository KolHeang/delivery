'use client';

import { SaasMasterLayout } from '@/components/layout/SaasMasterLayout';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { saasApi } from '@/lib/saas-api';
import { getUser } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdArrowBack,
  MdStar,
  MdCheckCircle,
  MdPeople,
  MdLocalShipping,
  MdStorefront,
  MdDirectionsCar,
  MdInventory2,
  MdDashboard,
  MdBarChart,
  MdReceipt,
  MdAccountBalanceWallet,
  MdSettings,
  MdNotifications,
  MdVpnKey,
  MdLanguage,
} from 'react-icons/md';

export default function EditPlanPage() {
  const router = useRouter();
  const params = useParams();
  const planId = Number(params.id);
  const { lang } = useLanguage();
  const tr = (km: string, en: string) => (lang === 'km' ? km : en);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [, setUser] = useState<any>(null);

  const [planForm, setPlanForm] = useState({
    name: '',
    slug: '',
    description: '',
    priceMonthly: 29,
    priceYearly: 290,
    maxUsers: 5,
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
      telegramBot: true,
      apiAccess: false,
      customDomain: false,
    },
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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
            maxUsers: data.maxUsers != null ? Number(data.maxUsers) : 5,
            maxDrivers: data.maxDrivers != null ? Number(data.maxDrivers) : 15,
            maxMerchants: data.maxMerchants != null ? Number(data.maxMerchants) : 50,
            maxOrdersPerMonth: data.maxOrdersPerMonth != null ? Number(data.maxOrdersPerMonth) : 2000,
            maxVehicles: data.maxVehicles != null ? Number(data.maxVehicles) : 15,
            isPopular: Boolean(data.isPopular),
            isActive: data.isActive !== false,
            features: {
              dashboard: data.features?.dashboard !== false,
              summary: data.features?.summary !== false,
              delivery: data.features?.delivery !== false,
              shops: data.features?.shops !== false,
              staff: data.features?.staff !== false,
              payment: data.features?.payment !== false,
              accounting: data.features?.accounting !== false,
              reports: data.features?.reports !== false && data.features?.customReports !== false,
              settings: data.features?.settings !== false,
              telegramBot: data.features?.telegramBot !== false && data.features?.telegramNotifications !== false,
              apiAccess: Boolean(data.features?.apiAccess),
              customDomain: Boolean(data.features?.customDomain || data.features?.customBranding),
            },
          });
        }
      } catch (err) {
        alert(tr('បរាជ័យក្នុងការទាញយកព័ត៌មាន Plan', 'Failed to load Plan details'));
        router.push('/admin/saas/plans');
      } finally {
        setLoading(false);
      }
    };

    if (planId) {
      loadPlan();
    }
  }, [planId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};
    if (!planForm.name.trim()) newErrors.name = tr('សូមបញ្ចូលឈ្មោះកញ្ចប់សេវា', 'Plan name is required');
    if (!planForm.slug.trim()) newErrors.slug = tr('សូមបញ្ចូល Slug សម្គាល់', 'Slug is required');

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert(tr('សូមបំពេញឈ្មោះ និង Slug របស់ Plan', 'Please enter Plan Name and Slug'));
      return;
    }

    try {
      setSaving(true);
      await saasApi.updatePlan(planId, {
        ...planForm,
        features: {
          ...planForm.features,
          customReports: Boolean(planForm.features.reports),
          telegramNotifications: Boolean(planForm.features.telegramBot),
          customBranding: Boolean(planForm.features.customDomain),
        },
      });
      alert(tr('បានកែប្រែ Plan ជោគជ័យ!', 'Successfully updated SaaS Plan!'));
      router.push('/admin/saas/plans');
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការកែប្រែ Plan', 'Failed to update Plan'));
    } finally {
      setSaving(false);
    }
  };

  const moduleList = [
    {
      key: 'dashboard',
      icon: MdDashboard,
      label: tr('ផ្ទាំងគ្រប់គ្រង', 'Dashboard'),
      desc: tr('ទិដ្ឋភាពទូទៅនៃប្រព័ន្ធ ស្ថិតិកញ្ចប់ និងក្រាហ្វ', 'System overview, metrics and chart statistics'),
    },
    {
      key: 'summary',
      icon: MdBarChart,
      label: tr('តារាងសង្ខេប', 'Summary Overview'),
      desc: tr('សង្ខេបហាង សង្ខេបការដឹក និងសង្ខេបការទៅយក', 'Shop overview, delivery and pickup summaries'),
    },
    {
      key: 'delivery',
      icon: MdLocalShipping,
      label: tr('គ្រប់គ្រងការដឹក', 'Delivery Operations'),
      desc: tr('កត់ត្រាទំនិញ បញ្ជីដឹក វិក្កយបត្រ បាកូដ និងចែកអ្នកដឹក', 'Parcels, delivery list, barcode labels and driver dispatch'),
    },
    {
      key: 'shops',
      icon: MdStorefront,
      label: tr('គ្រប់គ្រងហាងដៃគូ', 'Merchant Management'),
      desc: tr('បញ្ជីហាងទំនិញ ព័ត៌មានហាង សាខា និងកម្រៃសេវា', 'Partner merchant shops, branches, and pricing tiers'),
    },
    {
      key: 'staff',
      icon: MdPeople,
      label: tr('គ្រប់គ្រងបុគ្គលិក & យានយន្ត', 'Staff & Fleet Management'),
      desc: tr('បញ្ជីបុគ្គលិក អ្នកដឹកជញ្ជូន និងបញ្ជីយានយន្ត', 'Staff accounts, drivers directory, and vehicle fleet'),
    },
    {
      key: 'payment',
      icon: MdAccountBalanceWallet,
      label: tr('ការទូទាត់ប្រាក់ COD', 'Payment Settlement'),
      desc: tr('ទូទាត់ប្រាក់ជាមួយអ្នកដឹក និងទូទាត់ប្រាក់ជូនហាង', 'Cash settlements with delivery drivers and merchant shops'),
    },
    {
      key: 'accounting',
      icon: MdReceipt,
      label: tr('គណនេយ្យ ចំណូល-ចំណាយ', 'Accounting Ledger'),
      desc: tr('កត់ត្រាចំណាយទូទៅ ចំណូលផ្សេងៗ និងតារាងតុល្យការ', 'Income tracking, operational expense records, and ledgers'),
    },
    {
      key: 'reports',
      icon: MdBarChart,
      label: tr('របាយការណ៍ & Export', 'Reports & Analytics'),
      desc: tr('របាយការណ៍ប្រតិបត្តិការ ហិរញ្ញវត្ថុ និងទាញយក Excel', 'Operational analytics, financial reports, and Excel export'),
    },
    {
      key: 'settings',
      icon: MdSettings,
      label: tr('ការកំណត់ផ្សេងៗ', 'System Settings'),
      desc: tr('តំបន់ដឹក សិទ្ធិអ្នកប្រើប្រាស់ ការកំណត់អង្គភាព និងទូទៅ', 'Delivery zones, user roles, organisation and system setup'),
    },
    {
      key: 'telegramBot',
      icon: MdNotifications,
      label: tr('ការជូនដំណឹង Telegram', 'Telegram Bot Alerts'),
      desc: tr('ផ្ញើសារជូនដំណឹងស្វ័យប្រវត្តិតាម Telegram Bot', 'Instant notifications when orders arrive or completed'),
    },
    {
      key: 'apiAccess',
      icon: MdVpnKey,
      label: tr('ប្រព័ន្ធភ្ជាប់ REST API', 'REST API & Webhooks'),
      desc: tr('សិទ្ធិភ្ជាប់ជាមួយ eCommerce, WooCommerce, Shopify', 'External developer API for eCommerce integration'),
    },
    {
      key: 'customDomain',
      icon: MdLanguage,
      label: tr('ភ្ជាប់ Domain ផ្ទាល់ខ្លួន', 'Custom Domain Mapping'),
      desc: tr('អនុញ្ញាតឱ្យប្រើប្រាស់ Domain ផ្ទាល់ខ្លួនរបស់ក្រុមហ៊ុន', 'Allow tenant to map company custom domain / URL'),
    },
  ];

  if (loading) {
    return (
      <SaasMasterLayout activeTab="plans">
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{tr('កំពុងទាញយកព័ត៌មាន Plan...', 'Loading Plan details...')}</div>
        </div>
      </SaasMasterLayout>
    );
  }

  return (
    <SaasMasterLayout activeTab="plans">
      <div style={{ width: '100%', paddingBottom: 48 }}>
        {/* Navigation & Header */}
        <div style={{ marginBottom: 20 }}>
          <Link
            href="/admin/saas/plans"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: '#64748b',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 10,
            }}
          >
            <MdArrowBack size={16} />
            <span>{tr('ត្រឡប់ទៅបញ្ជីកញ្ចប់សេវា', 'Back to Plans')}</span>
          </Link>

          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
            {tr('កែប្រែកញ្ចប់សេវា', 'Edit Subscription Plan')}
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            {tr('កែប្រែព័ត៌មាន តម្លៃ ដែនកំណត់ Quota និងសិទ្ធិបើកមើលម៉ូឌុលនៅលើ Sidebar សម្រាប់កញ្ចប់នេះ', 'Update plan details, pricing, quotas, and sidebar module permissions')}
          </p>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off">
          {/* Card 1: ព័ត៌មានទូទៅ & តម្លៃ */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              padding: '24px 28px',
              marginBottom: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
              {tr('ព័ត៌មានទូទៅ និងតម្លៃ', 'General Info & Pricing')}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  {tr('ឈ្មោះកញ្ចប់សេវា', 'Plan Name')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                  placeholder={tr('ឧ. Starter, Professional, Enterprise', 'e.g. Starter, Professional')}
                  value={planForm.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPlanForm({ ...planForm, name: val });
                    if (errors.name) setErrors((prev) => { const n = { ...prev }; delete n.name; return n; });
                  }}
                  style={{ height: 40, borderRadius: 8, fontSize: 13.5 }}
                />
                {errors.name && <div style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4 }}>{errors.name}</div>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  {tr('Slug សម្គាល់', 'Plan Slug')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className={`form-control ${errors.slug ? 'is-invalid' : ''}`}
                  placeholder="starter, pro, enterprise"
                  value={planForm.slug}
                  onChange={(e) => {
                    setPlanForm({ ...planForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') });
                    if (errors.slug) setErrors((prev) => { const n = { ...prev }; delete n.slug; return n; });
                  }}
                  style={{ height: 40, borderRadius: 8, fontSize: 13.5 }}
                />
                {errors.slug && <div style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4 }}>{errors.slug}</div>}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                {tr('ការពិពណ៌នា', 'Description')}
              </label>
              <input
                type="text"
                className="form-control"
                placeholder={tr('ឧ. ស័ក្តិសមសម្រាប់ក្រុមហ៊ុនដឹកជញ្ជូនខ្នាតតូច ឬទើបចាប់ផ្តើម', 'e.g. Suitable for small or growing delivery services')}
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                style={{ height: 40, borderRadius: 8, fontSize: 13.5 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  {tr('តម្លៃប្រចាំខែ', 'Monthly Price')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: 10, fontWeight: 700, color: '#94a3b8' }}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    className="form-control"
                    style={{ paddingLeft: 28, height: 40, borderRadius: 8, fontWeight: 700, fontSize: 14 }}
                    value={planForm.priceMonthly}
                    onChange={(e) => setPlanForm({ ...planForm, priceMonthly: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  {tr('តម្លៃប្រចាំឆ្នាំ', 'Yearly Price')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: 10, fontWeight: 700, color: '#94a3b8' }}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    className="form-control"
                    style={{ paddingLeft: 28, height: 40, borderRadius: 8, fontWeight: 700, fontSize: 14 }}
                    value={planForm.priceYearly}
                    onChange={(e) => setPlanForm({ ...planForm, priceYearly: Number(e.target.value) })}
                  />
                </div>
                {planForm.priceMonthly > 0 && planForm.priceYearly < planForm.priceMonthly * 12 && (
                  <div style={{ fontSize: 11.5, color: '#059669', fontWeight: 600, marginTop: 4 }}>
                    ✨ {tr(`ចំណេញ $${(planForm.priceMonthly * 12 - planForm.priceYearly).toFixed(2)}/ឆ្នាំ`, `Save $${(planForm.priceMonthly * 12 - planForm.priceYearly).toFixed(2)}/yr`)}
                  </div>
                )}
              </div>
            </div>

            {/* Badges / Options */}
            <div style={{ display: 'flex', gap: 16, paddingTop: 16, borderTop: '1px solid #f8fafc', flexWrap: 'wrap' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: planForm.isPopular ? '#fffbeb' : '#f8fafc',
                  border: `1px solid ${planForm.isPopular ? '#fde68a' : '#e2e8f0'}`,
                  color: planForm.isPopular ? '#b45309' : '#475569',
                  fontSize: 12.5,
                  fontWeight: 600,
                  userSelect: 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="checkbox"
                  checked={planForm.isPopular}
                  onChange={(e) => setPlanForm({ ...planForm, isPopular: e.target.checked })}
                  style={{ accentColor: '#d97706', cursor: 'pointer' }}
                />
                <MdStar size={16} color={planForm.isPopular ? '#d97706' : '#94a3b8'} />
                <span>{tr('កញ្ចប់ពេញនិយម', 'Mark as Popular')}</span>
              </label>

              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: planForm.isActive ? '#f0fdf4' : '#f8fafc',
                  border: `1px solid ${planForm.isActive ? '#bbf7d0' : '#e2e8f0'}`,
                  color: planForm.isActive ? '#15803d' : '#475569',
                  fontSize: 12.5,
                  fontWeight: 600,
                  userSelect: 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="checkbox"
                  checked={planForm.isActive}
                  onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                  style={{ accentColor: '#16a34a', cursor: 'pointer' }}
                />
                <MdCheckCircle size={16} color={planForm.isActive ? '#16a34a' : '#94a3b8'} />
                <span>{tr('បើកដំណើរការ', 'Active Plan')}</span>
              </label>
            </div>
          </div>

          {/* Card 2: កម្រិតធនធាន & Quota */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              padding: '24px 28px',
              marginBottom: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                  {tr('កម្រិតធនធាន និង Quota', 'Resource Quotas & Limits')}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {tr('កំណត់កម្រិតប្រើប្រាស់ • ដាក់លេខ 0 ដើម្បីមិនកំណត់', 'Set resource limits per tenant • Set 0 for Unlimited')}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              {/* Users */}
              <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#334155' }}>
                    <MdPeople size={17} color="#2563eb" />
                    <span>{tr('ចំនួនគណនីបុគ្គលិក', 'Staff Accounts')}</span>
                  </div>
                  {Number(planForm.maxUsers) === 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>∞ Unlimited</span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min={0}
                    className="form-control"
                    value={planForm.maxUsers}
                    onChange={(e) => setPlanForm({ ...planForm, maxUsers: e.target.value === '' ? 0 : Number(e.target.value) })}
                    style={{ height: 38, borderRadius: 8, paddingRight: 55, fontWeight: 700 }}
                  />
                  <span style={{ position: 'absolute', right: 12, top: 10, fontSize: 11.5, color: '#94a3b8', fontWeight: 600 }}>
                    {tr('គណនី', 'staff')}
                  </span>
                </div>
              </div>

              {/* Drivers */}
              <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#334155' }}>
                    <MdLocalShipping size={17} color="#059669" />
                    <span>{tr('ចំនួនអ្នកដឹកជញ្ជូន', 'Delivery Drivers')}</span>
                  </div>
                  {Number(planForm.maxDrivers) === 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>∞ Unlimited</span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min={0}
                    className="form-control"
                    value={planForm.maxDrivers}
                    onChange={(e) => setPlanForm({ ...planForm, maxDrivers: e.target.value === '' ? 0 : Number(e.target.value) })}
                    style={{ height: 38, borderRadius: 8, paddingRight: 55, fontWeight: 700 }}
                  />
                  <span style={{ position: 'absolute', right: 12, top: 10, fontSize: 11.5, color: '#94a3b8', fontWeight: 600 }}>
                    {tr('នាក់', 'drivers')}
                  </span>
                </div>
              </div>

              {/* Merchants */}
              <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#334155' }}>
                    <MdStorefront size={17} color="#d97706" />
                    <span>{tr('ចំនួនហាងទំនិញដៃគូ', 'Partner Shops')}</span>
                  </div>
                  {Number(planForm.maxMerchants) === 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>∞ Unlimited</span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min={0}
                    className="form-control"
                    value={planForm.maxMerchants}
                    onChange={(e) => setPlanForm({ ...planForm, maxMerchants: e.target.value === '' ? 0 : Number(e.target.value) })}
                    style={{ height: 38, borderRadius: 8, paddingRight: 55, fontWeight: 700 }}
                  />
                  <span style={{ position: 'absolute', right: 12, top: 10, fontSize: 11.5, color: '#94a3b8', fontWeight: 600 }}>
                    {tr('ហាង', 'shops')}
                  </span>
                </div>
              </div>

              {/* Monthly Orders */}
              <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#334155' }}>
                    <MdInventory2 size={17} color="#7c3aed" />
                    <span>{tr('កញ្ចប់ឥវ៉ាន់ប្រចាំខែ', 'Monthly Orders')}</span>
                  </div>
                  {Number(planForm.maxOrdersPerMonth) === 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>∞ Unlimited</span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min={0}
                    className="form-control"
                    value={planForm.maxOrdersPerMonth}
                    onChange={(e) => setPlanForm({ ...planForm, maxOrdersPerMonth: e.target.value === '' ? 0 : Number(e.target.value) })}
                    style={{ height: 38, borderRadius: 8, paddingRight: 65, fontWeight: 700 }}
                  />
                  <span style={{ position: 'absolute', right: 12, top: 10, fontSize: 11.5, color: '#94a3b8', fontWeight: 600 }}>
                    {tr('កញ្ចប់', 'orders')}
                  </span>
                </div>
              </div>

              {/* Vehicles */}
              <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#334155' }}>
                    <MdDirectionsCar size={17} color="#475569" />
                    <span>{tr('ចំនួនយានយន្ត', 'Vehicles')}</span>
                  </div>
                  {Number(planForm.maxVehicles) === 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>∞ Unlimited</span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min={0}
                    className="form-control"
                    value={planForm.maxVehicles}
                    onChange={(e) => setPlanForm({ ...planForm, maxVehicles: e.target.value === '' ? 0 : Number(e.target.value) })}
                    style={{ height: 38, borderRadius: 8, paddingRight: 55, fontWeight: 700 }}
                  />
                  <span style={{ position: 'absolute', right: 12, top: 10, fontSize: 11.5, color: '#94a3b8', fontWeight: 600 }}>
                    {tr('គ្រឿង', 'units')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: សិទ្ធិប្រើប្រាស់ម៉ូឌុល (Module Permissions & Features) */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              padding: '24px 28px',
              marginBottom: 24,
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                  {tr('សិទ្ធិប្រើប្រាស់ម៉ូឌុលនៅលើ Sidebar', 'Sidebar Module Permissions')}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {tr('កំណត់បើក ឬបិទម៉ូឌុលនីមួយៗនៅលើ Sidebar សម្រាប់ក្រុមហ៊ុនជាវកញ្ចប់សេវានេះ', 'Select which sidebar modules are accessible to tenant companies subscribed to this plan')}
                </div>
              </div>

              {/* Presets */}
              <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 3, borderRadius: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setPlanForm({
                      ...planForm,
                      features: {
                        dashboard: true,
                        summary: false,
                        delivery: true,
                        shops: true,
                        staff: true,
                        payment: true,
                        accounting: false,
                        reports: false,
                        settings: false,
                        telegramBot: false,
                        apiAccess: false,
                        customDomain: false,
                      },
                    });
                  }}
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: 'transparent',
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {tr('មូលដ្ឋាន', 'Starter')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlanForm({
                      ...planForm,
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
                        telegramBot: true,
                        apiAccess: true,
                        customDomain: false,
                      },
                    });
                  }}
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#ffffff',
                    color: '#2563eb',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                    cursor: 'pointer',
                  }}
                >
                  {tr('ស្តង់ដារ', 'Pro')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlanForm({
                      ...planForm,
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
                        telegramBot: true,
                        apiAccess: true,
                        customDomain: true,
                      },
                    });
                  }}
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: 'transparent',
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {tr('ទាំងអស់', 'Enterprise')}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 12 }}>
              {moduleList.map((f) => {
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
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: `1px solid ${isChecked ? '#93c5fd' : '#e2e8f0'}`,
                      background: isChecked ? '#f8faff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.12s ease',
                      userSelect: 'none',
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: isChecked ? '#eff6ff' : '#f1f5f9',
                        color: isChecked ? '#2563eb' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={18} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isChecked ? '#0f172a' : '#475569' }}>
                        {f.label}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {f.desc}
                      </div>
                    </div>

                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        border: `1.5px solid ${isChecked ? '#2563eb' : '#cbd5e1'}`,
                        background: isChecked ? '#2563eb' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontSize: 11,
                        fontWeight: 900,
                        flexShrink: 0,
                      }}
                    >
                      {isChecked && '✓'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Link
              href="/admin/saas/plans"
              className="btn btn-cancel"
              style={{
                background: '#ffffff',
                color: '#64748b',
                border: '1px solid #cbd5e1',
                fontWeight: 600,
                fontSize: 13,
                padding: '9px 20px',
                borderRadius: 8,
              }}
            >
              {tr('បោះបង់', 'Cancel')}
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: 13,
                padding: '9px 24px',
                borderRadius: 8,
                boxShadow: '0 2px 6px rgba(37,99,235,0.2)',
              }}
            >
              {saving ? tr('កំពុងរក្សាទុក...', 'Saving...') : tr('រក្សាទុកការកែប្រែ', 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </SaasMasterLayout>
  );
}
