'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saasApi } from '@/lib/saas-api';
import { getUser, clearAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdDashboard,
  MdBusiness,
  MdWorkspacePremium,
  MdLocalOffer,
  MdAttachMoney,
  MdReceipt,
  MdSettings,
  MdAdd,
  MdCheckCircle,
  MdRefresh,
  MdContentCopy,
  MdEmail,
  MdPhone,
  MdLanguage,
  MdShare,
  MdCheck,
  MdOpenInNew,
  MdLocalShipping,
  MdNotifications,
  MdPerson,
  MdLogout,
  MdTrendingUp,
  MdSpeed,
  MdSearch,
  MdCloudQueue,
  MdCheckCircleOutline,
  MdAccessTime,
  MdGroup,
  MdAdminPanelSettings,
  MdVpnKey,
  MdLock,
  MdKeyboardArrowDown,
  MdTranslate,
  MdEdit,
  MdDelete,
} from 'react-icons/md';

export default function SaasMasterPortal() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const tr = (km: string, en: string) => (lang === 'km' ? km : en);

  const [activeMenu, setActiveMenu] = useState<'dashboard' | 'tenants' | 'users' | 'plans' | 'coupons' | 'partners' | 'create-tenant'>('dashboard');
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [saasAdminsList, setSaasAdminsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [adminRoleFilter, setAdminRoleFilter] = useState('all');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Modal 1: Create Company / Tenant State
  const [showCreateCompanyModal, setShowCreateCompanyModal] = useState(false);
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    companyName: '',
    subdomain: '',
    planId: 2,
    billingCycle: 'monthly' as 'monthly' | 'yearly',
    adminName: '',
    email: '',
    phone: '',
    password: '',
  });

  // Modal 2: Success Shareable Credentials State
  const [createdCredentials, setCreatedCredentials] = useState<{
    companyName: string;
    subdomain: string;
    url: string;
    adminName: string;
    email: string;
    password: string;
    planName: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Modal 3: Create Coupon State
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: 20,
    usageLimit: 100,
  });

  // Modal 4: Create SaaS Admin Account (Dedicated saas_admins table)
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'super_admin',
  });

  // Modal 5: Create / Edit Subscription Plan State
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
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
  });

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [subsRes, plansRes, couponsRes, commsRes, adminsRes] = await Promise.all([
        saasApi.getAllSubscriptions().catch(() => []),
        saasApi.getPlans().catch(() => []),
        saasApi.getCoupons().catch(() => []),
        saasApi.getPartnerStats().catch(() => ({ recentCommissions: [] })),
        saasApi.getSaasAdmins().catch(() => []),
      ]);

      setSubscriptions(Array.isArray(subsRes) ? subsRes : []);
      setPlans(Array.isArray(plansRes) ? plansRes : []);
      setCoupons(Array.isArray(couponsRes) ? couponsRes : []);
      setCommissions(commsRes?.recentCommissions || (Array.isArray(commsRes) ? commsRes : []));
      setSaasAdminsList(Array.isArray(adminsRes) ? adminsRes : []);
    } catch (err) {
      console.error('Error loading SaaS data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push('/admin/saas/login');
  };

  const generateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const handleOpenCreateModal = () => {
    const autoPass = generateRandomPassword();
    setCompanyForm({
      companyName: '',
      subdomain: '',
      planId: plans[0]?.id || 2,
      billingCycle: 'monthly',
      adminName: '',
      email: '',
      phone: '',
      password: autoPass,
    });
    setActiveMenu('create-tenant');
  };

  const handleOpenAdminModal = () => {
    setNewAdminForm({
      name: '',
      email: '',
      phone: '',
      password: generateRandomPassword(),
      role: 'super_admin',
    });
    setShowAdminModal(true);
  };

  const handleOpenCreatePlan = () => {
    setEditingPlanId(null);
    setPlanForm({
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
    });
    setShowPlanModal(true);
  };

  const handleOpenEditPlan = (plan: any) => {
    setEditingPlanId(plan.id);
    setPlanForm({
      name: plan.name || '',
      slug: plan.slug || '',
      description: plan.description || '',
      priceMonthly: Number(plan.priceMonthly) || 0,
      priceYearly: Number(plan.priceYearly) || 0,
      maxUsers: plan.maxUsers || 10,
      maxDrivers: plan.maxDrivers || 15,
      maxMerchants: plan.maxMerchants || 50,
      maxOrdersPerMonth: plan.maxOrdersPerMonth || 2000,
      maxVehicles: plan.maxVehicles || 15,
      isPopular: !!plan.isPopular,
      isActive: plan.isActive !== false,
    });
    setShowPlanModal(true);
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.name || !planForm.slug) {
      alert(tr('សូមបំពេញឈ្មោះ និង Slug របស់ Plan', 'Please enter Plan Name and Slug'));
      return;
    }

    try {
      setSavingPlan(true);
      if (editingPlanId) {
        await saasApi.updatePlan(editingPlanId, planForm);
        alert(tr('បានកែប្រែ Plan ជោគជ័យ!', 'Plan updated successfully!'));
      } else {
        await saasApi.createPlan(planForm);
        alert(tr('បានបង្កើត Plan ថ្មីជោគជ័យ!', 'Plan created successfully!'));
      }
      setShowPlanModal(false);
      loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការរក្សាទុក Plan', 'Failed to save Plan'));
    } finally {
      setSavingPlan(false);
    }
  };

  const handleDeletePlan = async (id: number, name: string) => {
    if (!confirm(tr(`តើអ្នកពិតជាចង់លុប Plan "${name}" មែនទេ?`, `Are you sure you want to delete plan "${name}"?`))) {
      return;
    }
    try {
      await saasApi.deletePlan(id);
      alert(tr('បានលុប Plan ជោគជ័យ!', 'Plan deleted successfully!'));
      loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការលុប Plan', 'Failed to delete Plan'));
    }
  };

  const handleDeleteTenant = async (id: number, name: string) => {
    if (!confirm(tr(`តើអ្នកពិតជាចង់លុបក្រុមហ៊ុន "${name}" មែនទេ?`, `Are you sure you want to remove tenant "${name}"?`))) {
      return;
    }
    try {
      await saasApi.deleteTenant(id);
      alert(tr('បានលុបក្រុមហ៊ុនជោគជ័យ!', 'Tenant removed successfully!'));
      loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការលុបក្រុមហ៊ុន', 'Failed to remove tenant'));
    }
  };

  const handleDeleteAdmin = async (id: number, name: string) => {
    if (user?.id === id) {
      alert(tr('មិនអាចលុបគណនីដែលកំពុង Login ផ្ទាល់ខ្លួនបានទេ', 'Cannot delete your own active account'));
      return;
    }
    if (!confirm(tr(`តើអ្នកពិតជាចង់លុប SaaS Admin "${name}" មែនទេ?`, `Are you sure you want to remove SaaS Admin "${name}"?`))) {
      return;
    }
    try {
      await saasApi.deleteSaasAdmin(id);
      alert(tr('បានលុប SaaS Admin ជោគជ័យ!', 'SaaS Admin removed successfully!'));
      loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការលុប Admin', 'Failed to remove admin'));
    }
  };

  const handleDeleteCoupon = async (id: number, code: string) => {
    if (!confirm(tr(`តើអ្នកពិតជាចង់លុប Coupon "${code}" មែនទេ?`, `Are you sure you want to delete coupon "${code}"?`))) {
      return;
    }
    try {
      await saasApi.deleteCoupon(id);
      alert(tr('បានលុប Coupon ជោគជ័យ!', 'Coupon removed successfully!'));
      loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការលុប Coupon', 'Failed to delete coupon'));
    }
  };

  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const cleanSub = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    setCompanyForm(prev => ({
      ...prev,
      companyName: name,
      subdomain: cleanSub,
    }));
  };

  const handleCreateCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.companyName || !companyForm.subdomain || !companyForm.email || !companyForm.password) {
      alert(tr('សូមបំពេញព័ត៌មានចាំបាច់ឱ្យបានគ្រប់គ្រាន់ (*)', 'Please fill in all required fields (*)'));
      return;
    }

    try {
      setCreatingCompany(true);
      const res = await saasApi.registerAndCheckout({
        companyName: companyForm.companyName.trim(),
        subdomain: companyForm.subdomain.trim().toLowerCase(),
        planId: Number(companyForm.planId),
        billingCycle: companyForm.billingCycle,
        adminName: companyForm.adminName.trim() || companyForm.companyName.trim(),
        email: companyForm.email.trim().toLowerCase(),
        phone: companyForm.phone.trim() || undefined,
        password: companyForm.password,
      });

      const selectedPlan = plans.find(p => p.id === Number(companyForm.planId));
      const planName = selectedPlan ? selectedPlan.name : 'Professional Plan';

      setCreatedCredentials({
        companyName: companyForm.companyName,
        subdomain: companyForm.subdomain,
        url: res?.workspace?.url || `https://${companyForm.subdomain}.ebsexpress.com`,
        adminName: companyForm.adminName || companyForm.companyName,
        email: companyForm.email,
        password: companyForm.password,
        planName,
      });

      setShowCreateCompanyModal(false);
      loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការបង្កើតក្រុមហ៊ុន', 'Failed to create company'));
    } finally {
      setCreatingCompany(false);
    }
  };

  const handleCreateAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminForm.name || !newAdminForm.email || !newAdminForm.password) {
      alert(tr('សូមបំពេញព័ត៌មានឱ្យបានគ្រប់គ្រាន់', 'Please fill in all required fields'));
      return;
    }

    try {
      setCreatingAdmin(true);
      await saasApi.createSaasAdmin({
        name: newAdminForm.name.trim(),
        email: newAdminForm.email.trim().toLowerCase(),
        phone: newAdminForm.phone.trim() || undefined,
        password: newAdminForm.password,
        role: newAdminForm.role,
      });

      alert(tr('បានបង្កើត SaaS Master Admin ជោគជ័យក្នុងតារាង saas_admins!', 'SaaS Master Admin created successfully!'));
      setShowAdminModal(false);
      loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការបង្កើត SaaS Admin', 'Failed to create SaaS Admin'));
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleUpdateSubscriptionStatus = async (id: number, status: string) => {
    try {
      await saasApi.updateSubscriptionStatus(id, status);
      await loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការ Update Status', 'Failed to update status'));
    }
  };

  const getShareableText = () => {
    if (!createdCredentials) return '';
    return `📦 ${tr('ព័ត៌មានគណនីប្រើប្រាស់ប្រព័ន្ធដឹកជញ្ជូន', 'Delivery System Account Credentials')} (EBS Express)
-----------------------------------------
🏢 ${tr('ក្រុមហ៊ុន', 'Company')}: ${createdCredentials.companyName}
🌐 ${tr('តំណភ្ជាប់ចូលប្រើប្រាស់', 'Login Portal')}: ${createdCredentials.url}/auth
👤 ${tr('អ៊ីមែល (Email)', 'Email')}: ${createdCredentials.email}
🔑 ${tr('ពាក្យសម្ងាត់ (Password)', 'Password')}: ${createdCredentials.password}
🏷️ ${tr('កញ្ចប់សេវា', 'Plan')}: ${createdCredentials.planName}
-----------------------------------------
${tr('សូមចូលប្រើប្រាស់ និងផ្លាស់ប្តូរពាក្យសម្ងាត់តាមការគួរ។', 'Please login and change your password as recommended.')}`;
  };

  const handleCopyCredentials = () => {
    navigator.clipboard.writeText(getShareableText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saasApi.createCoupon(newCoupon);
      alert(tr('បានបង្កើត Coupon ជោគជ័យ!', 'Coupon created successfully!'));
      setShowCouponModal(false);
      setNewCoupon({ code: '', discountType: 'percentage', discountValue: 20, usageLimit: 100 });
      loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការបង្កើត Coupon', 'Failed to create Coupon'));
    }
  };

  const handleApproveCommission = async (id: number, status: 'approved' | 'paid') => {
    const ref = status === 'paid' ? prompt(tr('សូមបញ្ចូលលេខយោងផ្ទេរប្រាក់ (Payout Reference):', 'Enter Payout Reference:'), 'ABA-TRX-' + Date.now()) : undefined;
    if (status === 'paid' && !ref) return;

    try {
      await saasApi.updateCommissionStatus(id, status, ref || undefined);
      alert(tr(`Commission #${id} ត្រូវបានប្តូរទៅជា ${status}!`, `Commission #${id} updated to ${status}!`));
      loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យ', 'Failed'));
    }
  };

  const totalMonthlyRevenue = subscriptions.reduce((acc, s) => {
    const price = s.billingCycle === 'yearly' ? Number(s.plan?.priceYearly || 0) / 12 : Number(s.plan?.priceMonthly || 0);
    return acc + price;
  }, 0);

  const filteredSubscriptions = subscriptions.filter(s => {
    const q = searchQuery.toLowerCase();
    return (
      (s.companyName && s.companyName.toLowerCase().includes(q)) ||
      (s.subdomain && s.subdomain.toLowerCase().includes(q)) ||
      (s.user?.email && s.user.email.toLowerCase().includes(q)) ||
      (s.user?.name && s.user.name.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Kantumruy Pro', 'Inter', sans-serif" }}>
      {/* 1. DEDICATED SAAS MASTER SIDEBAR */}
      <aside
        style={{
          width: 270,
          background: '#2b529a',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 90,
          boxShadow: '4px 0 20px rgba(0,0,0,0.1)',
        }}
      >
        {/* Brand Header */}
        <div style={{ padding: '22px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              color: '#fff',
              boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
            }}
          >
            👑
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.2px' }}>
              EBS Master SaaS
            </div>
            <div style={{ fontSize: 11, color: '#93c5fd', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ● {tr('ផ្ទាំងគ្រប់គ្រង SUPER ADMIN', 'SUPER ADMIN PORTAL')}
            </div>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#93c5fd', padding: '8px 12px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            {tr('ម៉ឺនុយមេ', 'Main Menu')}
          </div>

          <button
            onClick={() => setActiveMenu('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 10,
              border: 'none',
              background: activeMenu === 'dashboard' ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: activeMenu === 'dashboard' ? 900 : 600,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
              borderLeft: activeMenu === 'dashboard' ? '4px solid #ffffff' : '4px solid transparent',
            }}
          >
            <MdDashboard size={20} color={activeMenu === 'dashboard' ? '#ffffff' : '#bfdbfe'} />
            <span>{tr('ផ្ទាំងគ្រប់គ្រង', 'Dashboard')}</span>
          </button>

          <button
            onClick={() => setActiveMenu('tenants')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 10,
              border: 'none',
              background: (activeMenu === 'tenants' || activeMenu === 'create-tenant') ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: (activeMenu === 'tenants' || activeMenu === 'create-tenant') ? 900 : 600,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
              borderLeft: (activeMenu === 'tenants' || activeMenu === 'create-tenant') ? '4px solid #ffffff' : '4px solid transparent',
            }}
          >
            <MdBusiness size={20} color={(activeMenu === 'tenants' || activeMenu === 'create-tenant') ? '#ffffff' : '#bfdbfe'} />
            <span>{tr('ក្រុមហ៊ុនទាំងអស់', 'All Companies')} ({subscriptions.length})</span>
          </button>

          <button
            onClick={() => setActiveMenu('users')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 10,
              border: 'none',
              background: activeMenu === 'users' ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: activeMenu === 'users' ? 900 : 600,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
              borderLeft: activeMenu === 'users' ? '4px solid #ffffff' : '4px solid transparent',
            }}
          >
            <MdGroup size={20} color={activeMenu === 'users' ? '#ffffff' : '#bfdbfe'} />
            <span>{tr('គណនី SaaS Admins', 'SaaS Admins')} ({saasAdminsList.length})</span>
          </button>

          <button
            onClick={() => setActiveMenu('plans')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 10,
              border: 'none',
              background: activeMenu === 'plans' ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: activeMenu === 'plans' ? 900 : 600,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
              borderLeft: activeMenu === 'plans' ? '4px solid #ffffff' : '4px solid transparent',
            }}
          >
            <MdWorkspacePremium size={20} color={activeMenu === 'plans' ? '#ffffff' : '#bfdbfe'} />
            <span>{tr('កញ្ចប់សេវា', 'Subscription Plans')}</span>
          </button>

          <button
            onClick={() => setActiveMenu('coupons')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 10,
              border: 'none',
              background: activeMenu === 'coupons' ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: activeMenu === 'coupons' ? 900 : 600,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
              borderLeft: activeMenu === 'coupons' ? '4px solid #ffffff' : '4px solid transparent',
            }}
          >
            <MdLocalOffer size={20} color={activeMenu === 'coupons' ? '#ffffff' : '#bfdbfe'} />
            <span>{tr('គូប៉ុងបញ្ចុះតម្លៃ', 'Promo Coupons')}</span>
          </button>

          <button
            onClick={() => setActiveMenu('partners')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 10,
              border: 'none',
              background: activeMenu === 'partners' ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: activeMenu === 'partners' ? 900 : 600,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
              borderLeft: activeMenu === 'partners' ? '4px solid #ffffff' : '4px solid transparent',
            }}
          >
            <MdAttachMoney size={20} color={activeMenu === 'partners' ? '#ffffff' : '#bfdbfe'} />
            <span>{tr('ដៃគូសហការ', 'Affiliate Partners')}</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA WITH DEDICATED TOPBAR */}
      <div style={{ flex: 1, marginLeft: 270, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Dedicated SaaS Master Topbar / Navbar */}
        <header
          style={{
            height: 64,
            background: 'linear-gradient(135deg, #1e3b75 0%, #2b529a 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            padding: '0 32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 80,
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          {/* Topbar Left Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />
            <span style={{ fontSize: 13, color: '#ffffff', fontWeight: 700 }}>
              {tr('ប្រព័ន្ធគ្រប់គ្រង EBS Cloud', 'EBS Cloud Administration')}
            </span>
          </div>

          {/* Right Actions & Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Language Switcher Button */}
            <button
              onClick={() => setLang(lang === 'en' ? 'km' : 'en')}
              title={tr('ប្តូរភាសា (Switch Language)', 'Switch Language')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                height: 38,
                padding: '0 12px',
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.25)',
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontSize: 12.5,
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <MdLanguage size={18} />
              <span>{lang === 'en' ? '🇰🇭 ភាសាខ្មែរ' : '🇬🇧 English'}</span>
            </button>

            {/* Refresh */}
            <button
              onClick={loadAllData}
              title={tr('ទាញយកទិន្នន័យឡើងវិញ', 'Refresh Data')}
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.25)',
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <MdRefresh size={20} />
            </button>

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
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#ffffff', lineHeight: 1.2 }}>{user?.name || 'Master Super Admin'}</div>
                  <div style={{ fontSize: 11, color: '#bfdbfe', fontWeight: 600 }}>{user?.email || 'superadmin@ebsexpress.com'}</div>
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

              {/* Dropdown Menu Card */}
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
                      <div style={{ fontSize: 13.5, fontWeight: 900, color: '#0f172a' }}>{user?.name || 'Master Super Admin'}</div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>{user?.email || 'superadmin@ebsexpress.com'}</div>
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: 6,
                          background: '#eff6ff',
                          color: '#2563eb',
                          fontSize: 10.5,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 6,
                          border: '1px solid #dbeafe',
                        }}
                      >
                        👑 {tr('Super Admin ពេញសិទ្ធិ', 'Full Super Admin')}
                      </span>
                    </div>

                    <div style={{ padding: '6px 4px 2px' }}>
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
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#dc2626';
                          e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#fef2f2';
                          e.currentTarget.style.color = '#dc2626';
                        }}
                      >
                        <MdLogout size={18} />
                        <span>{tr('ចាកចេញ (Logout)', 'Logout')}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* 3. DYNAMIC DASHBOARD BODY */}
        <main style={{ flex: 1, padding: '32px' }}>
          {/* Main Page Title Header */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
              {activeMenu === 'dashboard' && tr('📊 ផ្ទាំងគ្រប់គ្រងទិន្នន័យទូទៅ', '📊 SaaS Master Overview')}
              {activeMenu === 'tenants' && tr('🏢 បញ្ជីក្រុមហ៊ុន Subscribers ទាំងអស់', '🏢 All Tenant Companies')}
              {activeMenu === 'users' && tr('👑 គ្រប់គ្រង SaaS Platform Admins', '👑 SaaS Platform Admins')}
              {activeMenu === 'plans' && tr('💎 កំណត់គម្រោងតម្លៃកញ្ចប់សេវា', '💎 Subscription Plans & Pricing')}
              {activeMenu === 'coupons' && tr('🏷️ គ្រប់គ្រង Promo Coupons & Discounts', '🏷️ Promo Coupons & Discounts')}
              {activeMenu === 'partners' && tr('🤝 ដៃគូសហការ & កម្រៃជើងសារ', '🤝 Affiliate Partners & Commissions')}
            </h1>
            <p style={{ fontSize: 13.5, color: '#64748b', margin: 0 }}>
              {activeMenu === 'dashboard' && tr('ទិដ្ឋភាពរួមនៃប្រព័ន្ធ SaaS និងស្ថិតិចំណូលប្រចាំខែ', 'Overview of SaaS delivery platform and monthly recurring revenue')}
              {activeMenu === 'tenants' && tr('គ្រប់គ្រង Workspace Subdomains និងគណនី Admin របស់ក្រុមហ៊ុននីមួយៗ', 'Manage Workspace subdomains, plans, and Admin accounts for each company')}
              {activeMenu === 'users' && tr('បញ្ជីគណនី Admin សម្រាប់គ្រប់គ្រងប្រព័ន្ធ Master SaaS (តារាង saas_admins ដាច់ដោយឡែក)', 'Platform Master Admins managing the multi-tenant SaaS delivery infrastructure')}
              {activeMenu === 'plans' && tr('កំណត់តម្លៃ និង Limit សម្រាប់កញ្ចប់សេវាកម្ម', 'Configure quotas, features, limits and pricing for each tier')}
              {activeMenu === 'coupons' && tr('បង្កើត និងគ្រប់គ្រងកូដបញ្ចុះតម្លៃសម្រាប់អតិថិជន', 'Create and monitor promotional discount coupons')}
              {activeMenu === 'partners' && tr('តាមដាន និងទូទាត់ប្រាក់កម្រៃជើងសារដៃគូសហការ', 'Track referral affiliate partners and commission payouts')}
            </p>
          </div>

          {/* TAB 1: MASTER DASHBOARD VIEW */}
          {activeMenu === 'dashboard' && (
            <div>
              {/* 4 Metric KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 32 }}>
                <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 16, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
                    🏢
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{tr('ក្រុមហ៊ុន Subscribers', 'Total Subscribers')}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', marginTop: 2 }}>{subscriptions.length}</div>
                    <div style={{ fontSize: 11.5, color: '#10b981', fontWeight: 700, marginTop: 4 }}>● {tr('ដំណើរការសកម្ម ១០០%', '100% Active Operational')}</div>
                  </div>
                </div>

                <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 16, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
                    💰
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{tr('ចំណូលប្រចាំខែ (MRR)', 'Monthly Revenue (MRR)')}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#059669', marginTop: 2 }}>${totalMonthlyRevenue.toFixed(2)}</div>
                    <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, marginTop: 4 }}>Recurring Monthly</div>
                  </div>
                </div>

                <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 16, background: '#fdf4ff', color: '#c026d3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
                    💎
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{tr('គម្រោង Plans សកម្ម', 'Active Plans')}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', marginTop: 2 }}>{plans.length}</div>
                    <div style={{ fontSize: 11.5, color: '#6366f1', fontWeight: 600, marginTop: 4 }}>Starter / Pro / Enterprise</div>
                  </div>
                </div>

                <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 16, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
                    🤝
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{tr('ដៃគូសហការ (Affiliates)', 'Affiliate Partners')}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#d97706', marginTop: 2 }}>{commissions.length}</div>
                    <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, marginTop: 4 }}>Commissions Ledger</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ALL TENANTS SUBSCRIBERS */}
          {activeMenu === 'tenants' && (
            <div style={{ background: '#fff', borderRadius: 24, padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    {tr('បញ្ជីក្រុមហ៊ុន Subscribers ទាំងអស់', 'All Tenant Companies')} ({subscriptions.length})
                  </h3>
                  <p style={{ fontSize: 13.5, color: '#64748b', margin: '4px 0 0' }}>
                    {tr('គ្រប់គ្រង Workspace Subdomains និងគណនី Admin របស់ក្រុមហ៊ុននីមួយៗ', 'Manage workspace subdomains, active subscriptions, and company admins')}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Search Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '8px 14px', width: 280 }}>
                    <MdSearch size={20} color="#94a3b8" />
                    <input
                      type="text"
                      placeholder={tr('ស្វែងរកក្រុមហ៊ុន...', 'Search companies...')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', paddingLeft: 8, fontSize: 13.5, width: '100%' }}
                    />
                  </div>

                  <button
                    onClick={handleOpenCreateModal}
                    style={{
                      padding: '10px 18px',
                      borderRadius: 12,
                      border: 'none',
                      background: '#2f55a5',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 4px 14px rgba(47,85,165,0.25)',
                    }}
                  >
                    <MdAdd size={18} />
                    <span>{tr('បង្កើតក្រុមហ៊ុនថ្មី', '+ Add New Company')}</span>
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontSize: 13, fontWeight: 700 }}>
                      <th style={{ padding: '14px 16px', borderTopLeftRadius: 10, borderBottomLeftRadius: 10, width: 50 }}>#</th>
                      <th style={{ padding: '14px 16px' }}>{tr('ក្រុមហ៊ុន / Workspace', 'Company / Workspace')}</th>
                      <th style={{ padding: '14px 16px' }}>{tr('Admin / អ៊ីមែល', 'Admin / Email')}</th>
                      <th style={{ padding: '14px 16px' }}>{tr('កញ្ចប់សេវា (Plan)', 'Plan & Cycle')}</th>
                      <th style={{ padding: '14px 16px' }}>{tr('ស្ថានភាព', 'Status')}</th>
                      <th style={{ padding: '14px 16px' }}>{tr('ថ្ងៃផុតកំណត់', 'Expires At')}</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right', borderTopRightRadius: 10, borderBottomRightRadius: 10 }}>{tr('សកម្មភាព', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '48px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                          {tr('គ្មានទិន្នន័យក្រុមហ៊ុនទេ', 'No companies found')}
                        </td>
                      </tr>
                    ) : (
                      filteredSubscriptions.map((s, idx) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 14 }}>
                          <td style={{ padding: '16px', color: '#94a3b8', fontWeight: 600, fontSize: 13 }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, border: '1px solid #bfdbfe' }}>
                                🏢
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14.5 }}>
                                  {s.companyName || `Workspace #${s.id}`}
                                </div>
                                <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 700 }}>
                                  {s.subdomain ? `${s.subdomain}.ebsexpress.com` : '-'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 13.5 }}>
                              {s.user?.name || (s.subdomain === 'main' ? 'Keo Sambath (Managing Director)' : s.subdomain === 'speedpost' ? 'Chan Vicheka (General Manager)' : s.subdomain === 'angkor' ? 'Sok Dara (Branch Owner)' : `Admin #${s.userId || s.id}`)}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>
                              {s.user?.email || (s.subdomain === 'main' ? 'sambath@mainexpress.com' : s.subdomain === 'speedpost' ? 'vicheka@speedpost.com' : s.subdomain === 'angkor' ? 'dara@angkorexpress.com' : `admin@${s.subdomain}.com`)}
                            </div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span style={{ fontWeight: 800, color: '#4f46e5' }}>
                              {s.plan?.name || `Plan #${s.planId}`}
                            </span>{' '}
                            <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>({s.billingCycle})</span>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <select
                              value={s.status}
                              onChange={(e) => handleUpdateSubscriptionStatus(s.id, e.target.value)}
                              style={{
                                padding: '5px 12px',
                                borderRadius: 20,
                                fontSize: 12,
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                                border:
                                  s.status === 'active'
                                    ? '1.5px solid #10b981'
                                    : s.status === 'trialing'
                                    ? '1.5px solid #3b82f6'
                                    : s.status === 'past_due'
                                    ? '1.5px solid #f59e0b'
                                    : '1.5px solid #ef4444',
                                background:
                                  s.status === 'active'
                                    ? '#ecfdf5'
                                    : s.status === 'trialing'
                                    ? '#eff6ff'
                                    : s.status === 'past_due'
                                    ? '#fef3c7'
                                    : '#fee2e2',
                                color:
                                  s.status === 'active'
                                    ? '#059669'
                                    : s.status === 'trialing'
                                    ? '#2563eb'
                                    : s.status === 'past_due'
                                    ? '#d97706'
                                    : '#dc2626',
                                outline: 'none',
                              }}
                            >
                              <option value="active">● ACTIVE</option>
                              <option value="trialing">● TRIALING</option>
                              <option value="past_due">● PAST_DUE</option>
                              <option value="cancelled">● CANCELLED</option>
                            </select>
                          </td>
                          <td style={{ padding: '16px', color: '#64748b', fontSize: 13 }}>
                            {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : '-'}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                              {s.subdomain && (
                                <a
                                  href={`http://${s.subdomain}.localhost:3000`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '7px 14px',
                                    borderRadius: 10,
                                    background: '#0f172a',
                                    color: '#ffffff',
                                    textDecoration: 'none',
                                    fontSize: 12,
                                    fontWeight: 800,
                                  }}
                                >
                                  <span>{tr('បើក Workspace', 'Open Workspace')}</span>
                                  <MdOpenInNew size={14} />
                                </a>
                              )}
                              <button
                                onClick={() => handleDeleteTenant(s.id, s.companyName || `Tenant #${s.id}`)}
                                style={{
                                  padding: '7px 10px',
                                  borderRadius: 10,
                                  border: '1px solid #fee2e2',
                                  background: '#fef2f2',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                title={tr('លុបក្រុមហ៊ុន', 'Remove Tenant')}
                              >
                                <MdDelete size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2.5: CREATE TENANT WORKSPACE VIEW */}
          {activeMenu === 'create-tenant' && (
            <div>
              <button
                onClick={() => setActiveMenu('tenants')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginBottom: 16,
                  padding: 0,
                }}
              >
                ← {tr('ត្រឡប់ទៅបញ្ជីក្រុមហ៊ុនទាំងអស់', 'Back to all companies')}
              </button>

              {createdCredentials ? (
                <div style={{ background: '#ffffff', borderRadius: 24, padding: '48px 40px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.06)', width: '100%', textAlign: 'center' }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 20px' }}>
                    🎉
                  </div>
                  <h2 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>
                    {tr('បានបង្កើតក្រុមហ៊ុន & គណនីជោគជ័យ!', 'Company & Account Created Successfully!')}
                  </h2>
                  <p style={{ fontSize: 14.5, color: '#64748b', margin: '0 0 32px' }}>
                    {tr('ព័ត៌មាន Workspace និងគណនី Admin ត្រូវបានរៀបចំរួចរាល់។ សូមចម្លងព័ត៌មានខាងក្រោមផ្ញើជូនភ្ញៀវ៖', 'Workspace and Admin credentials are ready. Copy the information below to share with the client:')}
                  </p>

                  <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 20, padding: '28px', textAlign: 'left', marginBottom: 32, fontSize: 15, lineHeight: 2.2, width: '100%' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                      <div>🏢 <strong>{tr('ក្រុមហ៊ុន៖', 'Company:')}</strong> <span style={{ color: '#0f172a', fontWeight: 900, marginLeft: 6 }}>{createdCredentials.companyName}</span></div>
                      <div>🌐 <strong>{tr('តំណភ្ជាប់ Workspace:', 'Workspace URL:')}</strong> <a href={`${createdCredentials.url}/auth`} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 800, textDecoration: 'none', marginLeft: 6 }}>{createdCredentials.url}/auth</a></div>
                      <div>👤 <strong>{tr('Email Login:', 'Login Email:')}</strong> <span style={{ color: '#0f172a', fontWeight: 800, marginLeft: 6 }}>{createdCredentials.email}</span></div>
                      <div>🔑 <strong>{tr('Password:', 'Password:')}</strong> <span style={{ color: '#16a34a', fontWeight: 900, background: '#dcfce7', padding: '3px 10px', borderRadius: 8, marginLeft: 6 }}>{createdCredentials.password}</span></div>
                      <div>🏷️ <strong>{tr('កញ្ចប់សេវា៖', 'Plan Tier:')}</strong> <span style={{ fontWeight: 700, color: '#4f46e5', marginLeft: 6 }}>{createdCredentials.planName}</span></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={handleCopyCredentials}
                      style={{
                        padding: '14px 30px',
                        borderRadius: 14,
                        border: 'none',
                        background: copied ? '#10b981' : '#0f172a',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: 14.5,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: '0 4px 14px rgba(15,23,42,0.2)',
                      }}
                    >
                      {copied ? <MdCheck size={18} /> : <MdContentCopy size={18} />}
                      <span>{copied ? tr('បានចម្លងរួចរាល់!', 'Copied Successfully!') : tr('ចម្លងព័ត៌មានផ្ញើឱ្យភ្ញៀវ', 'Copy Credentials')}</span>
                    </button>

                    <button
                      onClick={() => {
                        setCreatedCredentials(null);
                        setActiveMenu('tenants');
                      }}
                      style={{
                        padding: '14px 28px',
                        borderRadius: 14,
                        border: '1.5px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#334155',
                        fontWeight: 800,
                        fontSize: 14.5,
                        cursor: 'pointer',
                      }}
                    >
                      {tr('បញ្ចប់ & ទៅបញ្ជីក្រុមហ៊ុន', 'Done & Back to List')}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#ffffff', borderRadius: 24, padding: '40px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.04)', width: '100%' }}>
                  <div style={{ marginBottom: 28 }}>
                    <h3 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '0 0 6px' }}>
                      {tr('បង្កើតក្រុមហ៊ុនថ្មី (Setup New Tenant Workspace)', 'Create New Tenant Workspace')}
                    </h3>
                    <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
                      {tr('ប្រព័ន្ធនឹងបង្កើត Workspace Subdomain និងគណនី Admin ដោយស្វ័យប្រវត្តិ', 'The system will automatically provision the workspace subdomain and admin user account')}
                    </p>
                  </div>

                  <form onSubmit={handleCreateCompanySubmit}>
                    <div style={{ background: '#f8fafc', borderRadius: 20, padding: '28px', border: '1px solid #e2e8f0', marginBottom: 24 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 900, color: '#1e3b75', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        🏢 {tr('១. ព័ត៌មានក្រុមហ៊ុន & Workspace', '1. Company & Workspace Info')}
                      </h4>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 20 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 8 }}>
                            {tr('ឈ្មោះក្រុមហ៊ុន (Company Name)', 'Company Name')} <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={tr('ឧ. Angkor Express Delivery', 'e.g. Angkor Express Delivery')}
                            value={companyForm.companyName}
                            onChange={handleCompanyNameChange}
                            style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 14, outline: 'none', background: '#fff' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 8 }}>
                            {tr('Subdomain Workspace', 'Workspace Subdomain')} <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                              type="text"
                              required
                              placeholder="angkor"
                              value={companyForm.subdomain}
                              onChange={(e) => setCompanyForm({ ...companyForm, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                              style={{ width: '100%', padding: '13px 16px', paddingRight: 150, borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 14, outline: 'none', fontWeight: 800, color: '#2563eb', background: '#fff' }}
                            />
                            <span style={{ position: 'absolute', right: 14, fontSize: 13, fontWeight: 700, color: '#94a3b8', pointerEvents: 'none' }}>
                              .ebsexpress.com
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 8 }}>
                            {tr('ជ្រើសរើសកញ្ចប់ Plan', 'Subscription Plan')}
                          </label>
                          <select
                            value={companyForm.planId}
                            onChange={(e) => setCompanyForm({ ...companyForm, planId: Number(e.target.value) })}
                            style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 14, outline: 'none', fontWeight: 700, background: '#fff' }}
                          >
                            {plans.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} — ${Number(p.priceMonthly).toFixed(2)}/mo
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 8 }}>
                            {tr('វដ្តទូទាត់ប្រាក់ (Billing Cycle)', 'Billing Cycle')}
                          </label>
                          <select
                            value={companyForm.billingCycle}
                            onChange={(e) => setCompanyForm({ ...companyForm, billingCycle: e.target.value as any })}
                            style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 14, outline: 'none', fontWeight: 700, background: '#fff' }}
                          >
                            <option value="monthly">{tr('ប្រចាំខែ (Monthly)', 'Monthly')}</option>
                            <option value="yearly">{tr('ប្រចាំឆ្នាំ (Yearly - Discounted)', 'Yearly (Discounted)')}</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', borderRadius: 20, padding: '28px', border: '1px solid #e2e8f0', marginBottom: 28 }}>
                      <h4 style={{ fontSize: 16, fontWeight: 900, color: '#1e3b75', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        👤 {tr('២. គណនី Admin ដំបូងសម្រាប់ក្រុមហ៊ុន', '2. First Admin User Account')}
                      </h4>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 20 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 8 }}>
                            {tr('ឈ្មោះម្ចាស់ក្រុមហ៊ុន / Admin Name', 'Admin Full Name')}
                          </label>
                          <input
                            type="text"
                            placeholder={tr('ឧ. Sok Dara', 'e.g. Sok Dara')}
                            value={companyForm.adminName}
                            onChange={(e) => setCompanyForm({ ...companyForm, adminName: e.target.value })}
                            style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 14, outline: 'none', background: '#fff' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 8 }}>
                            {tr('លេខទូរស័ព្ទ (Phone)', 'Phone Number')}
                          </label>
                          <input
                            type="text"
                            placeholder="012 345 678"
                            value={companyForm.phone}
                            onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                            style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 14, outline: 'none', background: '#fff' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 8 }}>
                            {tr('Email សម្រាប់ Login', 'Login Email')} <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="email"
                            required
                            placeholder="client@delivery.com"
                            value={companyForm.email}
                            onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                            style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 14, outline: 'none', background: '#fff' }}
                          />
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <label style={{ fontSize: 13, fontWeight: 800, color: '#334155' }}>
                              {tr('Password', 'Password')} <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => setCompanyForm(prev => ({ ...prev, password: generateRandomPassword() }))}
                              style={{ fontSize: 12, background: 'none', border: 'none', color: '#2563eb', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              <span>+ {tr('បង្កើត Password ថ្មី (Auto-Gen)', 'Auto-Gen')}</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            required
                            value={companyForm.password}
                            onChange={(e) => setCompanyForm({ ...companyForm, password: e.target.value })}
                            style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 14, fontWeight: 800, color: '#0f172a', outline: 'none', background: '#fff' }}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 14, justifyContent: 'flex-end', paddingTop: 16 }}>
                      <button
                        type="button"
                        onClick={() => setActiveMenu('tenants')}
                        style={{
                          padding: '13px 24px',
                          borderRadius: 12,
                          border: '1.5px solid #cbd5e1',
                          background: '#fff',
                          color: '#64748b',
                          fontWeight: 800,
                          fontSize: 14,
                          cursor: 'pointer',
                        }}
                      >
                        {tr('បោះបង់', 'Cancel')}
                      </button>
                      <button
                        type="submit"
                        disabled={creatingCompany}
                        style={{
                          padding: '13px 32px',
                          borderRadius: 12,
                          border: 'none',
                          background: '#2f55a5',
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: 14,
                          cursor: creatingCompany ? 'not-allowed' : 'pointer',
                          boxShadow: '0 6px 18px rgba(47,85,165,0.3)',
                          transition: 'all 0.15s',
                        }}
                      >
                        {creatingCompany ? tr('កំពុងបង្កើត Workspace...', 'Creating Workspace...') : tr('🚀 បង្កើតក្រុមហ៊ុន & Setup Workspace', '🚀 Create Company & Setup')}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SAAS PLATFORM ADMINS */}
          {activeMenu === 'users' && (
            <div style={{ background: '#fff', borderRadius: 24, padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <h3 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>
                      {tr('បញ្ជីគណនី SaaS Platform Admins', 'SaaS Platform Admins')} ({saasAdminsList.length})
                    </h3>
                    <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: 12, fontWeight: 800 }}>
                      🛡️ {tr('តារាង saas_admins ដាច់ដោយឡែក', 'saas_admins table')}
                    </span>
                  </div>
                  <p style={{ fontSize: 13.5, color: '#64748b', margin: 0 }}>
                    {tr('គណនី Admin សម្រាប់គ្រប់គ្រងប្រព័ន្ធ Master SaaS (មិនប៉ះពាល់ជាមួយទិន្នន័យ Users ដឹកជញ្ជូនឡើយ)', 'Dedicated master admins for SaaS infrastructure management')}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <select
                    value={adminRoleFilter}
                    onChange={(e) => setAdminRoleFilter(e.target.value)}
                    style={{
                      padding: '9px 14px',
                      borderRadius: 12,
                      border: '1.5px solid #e2e8f0',
                      background: '#f8fafc',
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#334155',
                    }}
                  >
                    <option value="all">{tr('តួនាទីទាំងអស់ (All Roles)', 'All Admin Roles')}</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="finance_admin">{tr('Finance Admin (គណនេយ្យ)', 'Finance Admin')}</option>
                    <option value="support_admin">{tr('Support Admin (បច្ចេកទេស)', 'Support Admin')}</option>
                  </select>

                  <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '8px 14px', width: 240 }}>
                    <MdSearch size={20} color="#94a3b8" />
                    <input
                      type="text"
                      placeholder={tr('ស្វែងរក Admin...', 'Search Admin...')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', paddingLeft: 8, fontSize: 13.5, width: '100%' }}
                    />
                  </div>

                  <button
                    onClick={handleOpenAdminModal}
                    style={{
                      padding: '10px 18px',
                      borderRadius: 12,
                      border: 'none',
                      background: '#2f55a5',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 4px 14px rgba(47,85,165,0.25)',
                    }}
                  >
                    <MdAdd size={18} />
                    <span>{tr('+ បង្កើត SaaS Admin ថ្មី', '+ Add SaaS Admin')}</span>
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontSize: 13, fontWeight: 700 }}>
                      <th style={{ padding: '14px 16px', borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }}>{tr('SaaS Admin Profile', 'Admin Profile')}</th>
                      <th style={{ padding: '14px 16px' }}>{tr('Email សម្រាប់ Login', 'Login Email')}</th>
                      <th style={{ padding: '14px 16px' }}>{tr('លេខទូរស័ព្ទ', 'Phone')}</th>
                      <th style={{ padding: '14px 16px' }}>{tr('តួនាទី (Role)', 'Role')}</th>
                      <th style={{ padding: '14px 16px' }}>{tr('ស្ថានភាព', 'Status')}</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right', borderTopRightRadius: 10, borderBottomRightRadius: 10 }}>{tr('កាលបរិច្ឆេទបង្កើត', 'Created At')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saasAdminsList
                      .filter((a) => {
                        const q = searchQuery.toLowerCase();
                        const matchesSearch =
                          (a.name && a.name.toLowerCase().includes(q)) ||
                          (a.email && a.email.toLowerCase().includes(q)) ||
                          (a.phone && a.phone.includes(q));
                        const matchesRole = adminRoleFilter === 'all' || a.role === adminRoleFilter;
                        return matchesSearch && matchesRole;
                      })
                      .map((a) => (
                        <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 14 }}>
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 12,
                                  background: '#eff6ff',
                                  color: '#2563eb',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 900,
                                  fontSize: 18,
                                  border: '1.5px solid #bfdbfe',
                                }}
                              >
                                👑
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14.5 }}>
                                  {a.name}
                                </div>
                                <div style={{ fontSize: 11.5, color: '#6366f1', fontWeight: 600 }}>
                                  SaaS Admin #{a.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '16px', fontWeight: 800, color: '#0f172a' }}>
                            {a.email}
                          </td>
                          <td style={{ padding: '16px', color: '#64748b' }}>
                            {a.phone || '-'}
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: '#eff6ff',
                                color: '#2563eb',
                                border: '1px solid #bfdbfe',
                                padding: '4px 10px',
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              🛡️ {a.role}
                            </span>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: a.isActive !== false ? '#ecfdf5' : '#fee2e2',
                                color: a.isActive !== false ? '#059669' : '#dc2626',
                                border: a.isActive !== false ? '1px solid #a7f3d0' : '1px solid #fca5a5',
                                padding: '4px 10px',
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              ● {a.isActive !== false ? tr('សកម្ម (Active)', 'Active') : tr('បិទ (Disabled)', 'Disabled')}
                            </span>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ color: '#64748b', fontSize: 13 }}>
                                {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '-'}
                              </span>
                              <button
                                onClick={() => handleDeleteAdmin(a.id, a.name)}
                                style={{
                                  padding: '6px 8px',
                                  borderRadius: 8,
                                  border: '1px solid #fee2e2',
                                  background: '#fef2f2',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                title={tr('លុប SaaS Admin', 'Remove Admin')}
                              >
                                <MdDelete size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: SUBSCRIPTION PLANS */}
          {activeMenu === 'plans' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    {tr('កំណត់គម្រោងតម្លៃកញ្ចប់សេវា (Subscription Plans)', 'Subscription Plans & Pricing')} ({plans.length})
                  </h3>
                  <p style={{ fontSize: 13.5, color: '#64748b', margin: '4px 0 0' }}>
                    {tr('គ្រប់គ្រងតម្លៃ កំណត់កម្រិត Quota និង Feature សម្រាប់ក្រុមហ៊ុននីមួយៗ', 'Manage pricing tiers, driver/merchant limits, and features')}
                  </p>
                </div>

                <button
                  onClick={handleOpenCreatePlan}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 12,
                    border: 'none',
                    background: '#2f55a5',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 4px 14px rgba(47,85,165,0.25)',
                  }}
                >
                  <MdAdd size={18} />
                  <span>{tr('+ បង្កើតកញ្ចប់ Plan ថ្មី', '+ Add New Plan')}</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
                {plans.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: '#fff',
                      borderRadius: 24,
                      padding: '32px',
                      border: p.isPopular ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                      boxShadow: p.isPopular ? '0 12px 30px -8px rgba(59,130,246,0.2)' : '0 4px 14px rgba(0,0,0,0.03)',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {p.isPopular && (
                      <span style={{ position: 'absolute', top: -12, right: 24, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', fontSize: 11, fontWeight: 900, padding: '4px 12px', borderRadius: 20 }}>
                        ★ {tr('ពេញនិយមបំផុត', 'MOST POPULAR')}
                      </span>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <h3 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>{p.name}</h3>
                      <span style={{ fontSize: 11, background: p.isActive !== false ? '#ecfdf5' : '#fee2e2', color: p.isActive !== false ? '#059669' : '#dc2626', padding: '2px 8px', borderRadius: 8, fontWeight: 800 }}>
                        {p.isActive !== false ? tr('សកម្ម', 'Active') : tr('បិទ', 'Disabled')}
                      </span>
                    </div>

                    <div style={{ fontSize: 11.5, color: '#6366f1', fontWeight: 800, marginBottom: 8, textTransform: 'uppercase' }}>
                      Slug: {p.slug}
                    </div>

                    <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px', minHeight: 38 }}>
                      {p.description || tr('កញ្ចប់សេវាដឹកជញ្ជូនស្ដង់ដារ', 'Standard delivery management plan')}
                    </p>

                    <div style={{ marginBottom: 20, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 36, fontWeight: 900, color: '#0f172a' }}>${Number(p.priceMonthly).toFixed(0)}</span>
                      <span style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>/{tr('ខែ', 'mo')}</span>
                      <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>(${Number(p.priceYearly).toFixed(0)}/{tr('ឆ្នាំ', 'yr')})</span>
                    </div>

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13.5, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#334155' }}>
                        <MdCheckCircle color="#10b981" size={18} />
                        <span><strong>{p.maxDrivers || 10}</strong> {tr('Drivers ដឹកជញ្ជូន', 'Active Drivers')}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#334155' }}>
                        <MdCheckCircle color="#10b981" size={18} />
                        <span><strong>{p.maxMerchants || 50}</strong> {tr('Merchants / ហាង', 'Merchant Shops')}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#334155' }}>
                        <MdCheckCircle color="#10b981" size={18} />
                        <span><strong>{p.maxOrdersPerMonth || 1000}</strong> {tr('Parcels / ខែ', 'Parcels / Month')}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#334155' }}>
                        <MdCheckCircle color="#10b981" size={18} />
                        <span><strong>{p.maxVehicles || 10}</strong> {tr('យានយន្ត Vehicles', 'Vehicles')}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: 10, marginTop: 24, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                      <button
                        onClick={() => handleOpenEditPlan(p)}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: 10,
                          border: '1.5px solid #cbd5e1',
                          background: '#fff',
                          color: '#334155',
                          fontSize: 13,
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <MdEdit size={16} />
                        <span>{tr('កែប្រែ', 'Edit')}</span>
                      </button>
                      <button
                        onClick={() => handleDeletePlan(p.id, p.name)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 10,
                          border: '1.5px solid #fee2e2',
                          background: '#fef2f2',
                          color: '#dc2626',
                          fontSize: 13,
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title={tr('លុប Plan', 'Delete Plan')}
                      >
                        <MdDelete size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: COUPONS */}
          {activeMenu === 'coupons' && (
            <div style={{ background: '#fff', borderRadius: 24, padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    {tr('គូប៉ុងបញ្ចុះតម្លៃ Promo Coupons', 'Promo Coupons & Discounts')} ({coupons.length})
                  </h3>
                  <p style={{ fontSize: 13.5, color: '#64748b', margin: '4px 0 0' }}>
                    {tr('កូដបញ្ចុះតម្លៃសម្រាប់អតិថិជនពេល Checkout ជាវ Subscription', 'Discounts applied during tenant checkout registration')}
                  </p>
                </div>

                <button
                  onClick={() => setShowCouponModal(true)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 12,
                    border: 'none',
                    background: '#2f55a5',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 4px 14px rgba(47,85,165,0.25)',
                  }}
                >
                  <MdAdd size={18} />
                  <span>{tr('បង្កើត Coupon ថ្មី', '+ Create Coupon')}</span>
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontSize: 13, fontWeight: 700 }}>
                      <th style={{ padding: '14px 16px', borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }}>Coupon Code</th>
                      <th style={{ padding: '14px 16px' }}>{tr('ប្រភេទបញ្ចុះតម្លៃ', 'Discount Type')}</th>
                      <th style={{ padding: '14px 16px' }}>{tr('តម្លៃបញ្ចុះ', 'Discount Value')}</th>
                      <th style={{ padding: '14px 16px' }}>{tr('ចំនួនប្រើប្រាស់', 'Usage / Limit')}</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right', borderTopRightRadius: 10, borderBottomRightRadius: 10 }}>{tr('ស្ថានភាព', 'Status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((c) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 14 }}>
                        <td style={{ padding: '16px', fontWeight: 900, color: '#4f46e5', letterSpacing: '0.5px' }}>
                          🏷️ {c.code}
                        </td>
                        <td style={{ padding: '16px', textTransform: 'capitalize', color: '#334155' }}>
                          {c.discountType === 'percentage' ? tr('ភាគរយ (%)', 'Percentage (%)') : tr('ចំនួនថេរ ($)', 'Fixed ($)')}
                        </td>
                        <td style={{ padding: '16px', fontWeight: 800, color: '#059669' }}>
                          {c.discountType === 'percentage' ? `${c.discountValue}%` : `$${c.discountValue}`}
                        </td>
                        <td style={{ padding: '16px', color: '#64748b' }}>
                          {c.usageCount || 0} / {c.usageLimit || '∞'}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ background: c.isActive !== false ? '#ecfdf5' : '#fee2e2', color: c.isActive !== false ? '#059669' : '#dc2626', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 800 }}>
                              {c.isActive !== false ? tr('សកម្ម', 'Active') : tr('អសកម្ម', 'Inactive')}
                            </span>
                            <button
                              onClick={() => handleDeleteCoupon(c.id, c.code)}
                              style={{
                                padding: '6px 8px',
                                borderRadius: 8,
                                border: '1px solid #fee2e2',
                                background: '#fef2f2',
                                color: '#dc2626',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title={tr('លុប Coupon', 'Delete Coupon')}
                            >
                              <MdDelete size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: PARTNERS */}
          {activeMenu === 'partners' && (
            <div style={{ background: '#fff', borderRadius: 24, padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.04)' }}>
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  {tr('កម្រៃជើងសារដៃគូសហការ (Affiliate Commissions)', 'Affiliate Partner Commissions')}
                </h3>
                <p style={{ fontSize: 13.5, color: '#64748b', margin: '4px 0 0' }}>
                  {tr('តាមដាន និងទូទាត់ប្រាក់កម្រៃជើងសារជូនដៃគូណែនាំអតិថិជន', 'Monitor and process commission payouts for referral partners')}
                </p>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontSize: 13, fontWeight: 700 }}>
                      <th style={{ padding: '14px 16px', borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }}>Partner Name</th>
                      <th style={{ padding: '14px 16px' }}>{tr('ទឹកប្រាក់កម្រៃ', 'Commission Amount')}</th>
                      <th style={{ padding: '14px 16px' }}>{tr('ស្ថានភាព', 'Status')}</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right', borderTopRightRadius: 10, borderBottomRightRadius: 10 }}>{tr('សកម្មភាព', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((c) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 14 }}>
                        <td style={{ padding: '16px', fontWeight: 800, color: '#0f172a' }}>
                          {c.partner?.name || `Partner #${c.partnerId || c.id}`}
                        </td>
                        <td style={{ padding: '16px', fontWeight: 900, color: '#059669', fontSize: 15 }}>
                          +${Number(c.calculatedAmount || c.amount || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ background: c.status === 'paid' ? '#ecfdf5' : '#fef3c7', color: c.status === 'paid' ? '#059669' : '#d97706', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>
                            ● {c.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          {c.status !== 'paid' && (
                            <button
                              onClick={() => handleApproveCommission(c.id, 'paid')}
                              style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                            >
                              {tr('ទូទាត់ប្រាក់ Payout', 'Payout')}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: Create / Edit Subscription Plan Modal */}
      {showPlanModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: 16,
          }}
        >
          <div style={{ background: '#fff', borderRadius: 24, padding: 36, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', marginBottom: 6 }}>
              {editingPlanId ? tr('កែប្រែកញ្ចប់ Plan', 'Edit Subscription Plan') : tr('+ បង្កើតកញ្ចប់ Plan ថ្មី', '+ Add New Subscription Plan')}
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 22 }}>
              {tr('កំណត់ឈ្មោះ តម្លៃ និងកូតាប្រើប្រាស់សម្រាប់អតិថិជន', 'Configure pricing, quotas, and limits for this plan tier')}
            </p>

            <form onSubmit={handlePlanSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                    {tr('ឈ្មោះកញ្ចប់ (Plan Name)', 'Plan Name')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={tr('ឧ. Starter Express', 'e.g. Starter Express')}
                    value={planForm.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPlanForm({
                        ...planForm,
                        name: val,
                        slug: planForm.slug || val.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                      });
                    }}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                    Slug (Unique) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="starter-express"
                    value={planForm.slug}
                    onChange={(e) => setPlanForm({ ...planForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 800, color: '#2563eb' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                  {tr('ការពិពណ៌នាសង្ខេប (Description)', 'Description')}
                </label>
                <input
                  type="text"
                  placeholder={tr('ឧ. សម្រាប់ក្រុមហ៊ុនដឹកជញ្ជូនខ្នាតតូច', 'e.g. Perfect for small courier fleets')}
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                    {tr('តម្លៃប្រចាំខែ ($/Month)', 'Monthly Price ($)')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={planForm.priceMonthly}
                    onChange={(e) => setPlanForm({ ...planForm, priceMonthly: Number(e.target.value) })}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 800 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                    {tr('តម្លៃប្រចាំឆ្នាំ ($/Year)', 'Yearly Price ($)')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={planForm.priceYearly}
                    onChange={(e) => setPlanForm({ ...planForm, priceYearly: Number(e.target.value) })}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 800 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                    {tr('ចំនួន Drivers អតិបរមា', 'Max Drivers')}
                  </label>
                  <input
                    type="number"
                    required
                    value={planForm.maxDrivers}
                    onChange={(e) => setPlanForm({ ...planForm, maxDrivers: Number(e.target.value) })}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                    {tr('ចំនួន Merchants / ហាង', 'Max Merchants')}
                  </label>
                  <input
                    type="number"
                    required
                    value={planForm.maxMerchants}
                    onChange={(e) => setPlanForm({ ...planForm, maxMerchants: Number(e.target.value) })}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                    {tr('ចំនួន Parcels / ខែ', 'Max Parcels/Month')}
                  </label>
                  <input
                    type="number"
                    required
                    value={planForm.maxOrdersPerMonth}
                    onChange={(e) => setPlanForm({ ...planForm, maxOrdersPerMonth: Number(e.target.value) })}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                    {tr('ចំនួនយានយន្ត Vehicles', 'Max Vehicles')}
                  </label>
                  <input
                    type="number"
                    required
                    value={planForm.maxVehicles}
                    onChange={(e) => setPlanForm({ ...planForm, maxVehicles: Number(e.target.value) })}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 20, marginBottom: 28, background: '#f8fafc', padding: '14px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={planForm.isPopular}
                    onChange={(e) => setPlanForm({ ...planForm, isPopular: e.target.checked })}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <span>★ {tr('កញ្ចប់ពេញនិយម (Popular Badge)', 'Most Popular Badge')}</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={planForm.isActive}
                    onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <span>● {tr('ដំណើរការសកម្ម (Active)', 'Active Status')}</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  style={{ padding: '12px 22px', borderRadius: 12, border: '1px solid #cbd5e1', background: '#fff', fontWeight: 800, cursor: 'pointer' }}
                >
                  {tr('បោះបង់', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  style={{
                    padding: '12px 26px',
                    borderRadius: 12,
                    border: 'none',
                    background: '#2f55a5',
                    color: '#fff',
                    fontWeight: 800,
                    cursor: savingPlan ? 'not-allowed' : 'pointer',
                    boxShadow: '0 6px 18px rgba(47,85,165,0.3)',
                  }}
                >
                  {savingPlan ? tr('កំពុងរក្សាទុក...', 'Saving...') : editingPlanId ? tr('ធ្វើបច្ចុប្បន្នភាព Plan', 'Update Plan') : tr('បង្កើត Plan ថ្មី', 'Create Plan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create SaaS Admin Modal */}
      {showAdminModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: 16,
          }}
        >
          <div style={{ background: '#fff', borderRadius: 24, padding: 36, width: '100%', maxWidth: 520, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', marginBottom: 6 }}>
              {tr('+ បង្កើត SaaS Platform Admin ថ្មី', '+ Add New SaaS Platform Admin')}
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>
              {tr('គណនីនេះនឹងត្រូវបញ្ចូលក្នុងតារាង saas_admins សម្រាប់គ្រប់គ្រង Master Portal', 'This account is stored in saas_admins table for master portal management')}
            </p>

            <form onSubmit={handleCreateAdminSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                  {tr('ឈ្មោះ Admin (Full Name)', 'Admin Full Name')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={tr('ឧ. John SuperAdmin', 'e.g. John SuperAdmin')}
                  value={newAdminForm.name}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, name: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                    {tr('Email សម្រាប់ Login', 'Login Email')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="admin@ebsexpress.com"
                    value={newAdminForm.email}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                    {tr('លេខទូរស័ព្ទ (Phone)', 'Phone Number')}
                  </label>
                  <input
                    type="text"
                    placeholder="012 345 678"
                    value={newAdminForm.phone}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 28 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                    {tr('តួនាទី SaaS Role', 'SaaS Role')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={newAdminForm.role}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, role: e.target.value })}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 700 }}
                  >
                    <option value="super_admin">Super Admin ({tr('គ្រប់គ្រងទាំងស្រុង', 'Full Access')})</option>
                    <option value="finance_admin">Finance Admin ({tr('គណនេយ្យ SaaS', 'Finance')})</option>
                    <option value="support_admin">Support Admin ({tr('បច្ចេកទេស', 'Technical Support')})</option>
                  </select>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 800, color: '#334155' }}>
                      {tr('Password', 'Password')} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewAdminForm({ ...newAdminForm, password: generateRandomPassword() })}
                      style={{ fontSize: 11.5, background: 'none', border: 'none', color: '#2f55a5', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Auto-Gen
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={newAdminForm.password}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, password: e.target.value })}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 800, color: '#0f172a' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  style={{ padding: '12px 22px', borderRadius: 12, border: '1px solid #cbd5e1', background: '#fff', fontWeight: 800, cursor: 'pointer' }}
                >
                  {tr('បោះបង់', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={creatingAdmin}
                  style={{
                    padding: '12px 26px',
                    borderRadius: 12,
                    border: 'none',
                    background: '#2f55a5',
                    color: '#fff',
                    fontWeight: 800,
                    cursor: creatingAdmin ? 'not-allowed' : 'pointer',
                    boxShadow: '0 6px 18px rgba(47,85,165,0.3)',
                  }}
                >
                  {creatingAdmin ? tr('កំពុងបង្កើត...', 'Creating...') : tr('បង្កើត SaaS Admin', 'Create SaaS Admin')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Create Coupon Modal */}
      {showCouponModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: 16,
          }}
        >
          <div style={{ background: '#fff', borderRadius: 24, padding: 36, width: '100%', maxWidth: 450, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', marginBottom: 20 }}>
              {tr('បង្កើត Promo Coupon ថ្មី', 'Create New Promo Coupon')}
            </h3>
            <form onSubmit={handleCreateCoupon}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, marginBottom: 6 }}>Coupon Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FLASH50"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #cbd5e1', fontWeight: 800 }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, marginBottom: 6 }}>{tr('ប្រភេទបញ្ចុះតម្លៃ', 'Discount Type')}</label>
                <select
                  value={newCoupon.discountType}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discountType: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #cbd5e1', fontWeight: 700 }}
                >
                  <option value="percentage">{tr('ភាគរយ Percentage (%)', 'Percentage (%)')}</option>
                  <option value="fixed_amount">{tr('ចំនួនថេរ Fixed Amount ($)', 'Fixed Amount ($)')}</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, marginBottom: 6 }}>{tr('តម្លៃបញ្ចុះ (Discount Value)', 'Discount Value')}</label>
                <input
                  type="number"
                  required
                  value={newCoupon.discountValue}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: Number(e.target.value) })}
                  style={{ width: '100%', padding: '12px 10px', borderRadius: 10, border: '1px solid #cbd5e1', fontWeight: 800 }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, marginBottom: 6 }}>{tr('ចំនួនកំណត់ប្រើប្រាស់ (Usage Limit)', 'Usage Limit')}</label>
                <input
                  type="number"
                  required
                  value={newCoupon.usageLimit}
                  onChange={(e) => setNewCoupon({ ...newCoupon, usageLimit: Number(e.target.value) })}
                  style={{ width: '100%', padding: '12px 10px', borderRadius: 10, border: '1px solid #cbd5e1', fontWeight: 800 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCouponModal(false)}
                  style={{ padding: '11px 20px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 800 }}
                >
                  {tr('បោះបង់', 'Cancel')}
                </button>
                <button
                  type="submit"
                  style={{ padding: '11px 22px', borderRadius: 10, border: 'none', background: '#2f55a5', color: '#fff', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(47,85,165,0.35)' }}
                >
                  {tr('បង្កើត Coupon', 'Create Coupon')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
