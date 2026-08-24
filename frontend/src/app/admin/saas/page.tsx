'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saasApi } from '@/lib/saas-api';
import { getUser, clearAuth } from '@/lib/auth';
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
} from 'react-icons/md';

export default function SaasMasterPortal() {
  const router = useRouter();
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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('access_token');
    const saasAdminRaw = localStorage.getItem('saas_admin');
    const currentUser = getUser();

    // If not authenticated, redirect to SaaS Master Admin Login page
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

    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const tab = searchParams.get('tab');
      if (tab === 'tenants' || tab === 'users' || tab === 'plans' || tab === 'coupons' || tab === 'partners') {
        setActiveMenu(tab as any);
      }
    }

    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [subsRes, plansRes, couponsRes, commsRes, adminsRes] = await Promise.all([
        saasApi.getAllSubscriptions().catch(() => []),
        saasApi.getPlans(true).catch(() => []),
        saasApi.getCoupons().catch(() => []),
        saasApi.getAllCommissions().catch(() => []),
        saasApi.getSaasAdmins().catch(() => []),
      ]);
      setSubscriptions(subsRes || []);
      setPlans(plansRes || []);
      setCoupons(couponsRes || []);
      setCommissions(commsRes || []);
      setSaasAdminsList(adminsRes || []);
    } catch (err) {
      console.error('Failed to load SaaS master data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('តើអ្នកពិតជាចង់ចាកចេញពីប្រព័ន្ធ (Logout) មែនទេ?')) {
      clearAuth();
      localStorage.removeItem('saas_admin');
      router.push('/admin/saas/login');
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass + '@2026';
  };

  const handleOpenCreateModal = () => {
    const defaultPass = generateRandomPassword();
    setCompanyForm({
      companyName: '',
      subdomain: '',
      planId: plans[1]?.id || 2,
      billingCycle: 'monthly',
      adminName: '',
      email: '',
      phone: '',
      password: defaultPass,
    });
    setCreatedCredentials(null);
    setActiveMenu('create-tenant');
  };

  const handleOpenAdminModal = () => {
    const defaultPass = generateRandomPassword();
    setNewAdminForm({
      name: '',
      email: '',
      phone: '',
      password: defaultPass,
      role: 'super_admin',
    });
    setShowAdminModal(true);
  };

  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const slug = val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    setCompanyForm(prev => ({
      ...prev,
      companyName: val,
      subdomain: slug,
    }));
  };

  const handleCreateCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.companyName || !companyForm.subdomain || !companyForm.email) {
      alert('សូមបញ្ចូលព័ត៌មានចាំបាច់ឱ្យបានគ្រប់គ្រាន់');
      return;
    }

    try {
      setCreatingCompany(true);
      const selectedPlan = plans.find(p => p.id === Number(companyForm.planId));

      await saasApi.registerAndCheckout({
        planId: Number(companyForm.planId),
        billingCycle: companyForm.billingCycle,
        companyName: companyForm.companyName.trim(),
        subdomain: companyForm.subdomain.trim(),
        adminName: companyForm.adminName.trim() || companyForm.companyName.trim(),
        email: companyForm.email.trim().toLowerCase(),
        phone: companyForm.phone.trim() || undefined,
        password: companyForm.password || '123456',
      });

      setShowCreateCompanyModal(false);
      setActiveMenu('tenants');
      await loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'បរាជ័យក្នុងការបង្កើតក្រុមហ៊ុន');
    } finally {
      setCreatingCompany(false);
    }
  };

  const handleCreateAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminForm.name || !newAdminForm.email || !newAdminForm.password) {
      alert('សូមបំពេញព័ត៌មានឱ្យបានគ្រប់គ្រាន់');
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

      alert('បានបង្កើត SaaS Master Admin ជោគជ័យក្នុងតារាង saas_admins!');
      setShowAdminModal(false);
      loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'បរាជ័យក្នុងការបង្កើត SaaS Admin');
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleUpdateSubscriptionStatus = async (id: number, status: string) => {
    try {
      await saasApi.updateSubscriptionStatus(id, status);
      await loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'បរាជ័យក្នុងការ Update Status');
    }
  };

  const getShareableText = () => {
    if (!createdCredentials) return '';
    return `📦 ព័ត៌មានគណនីប្រើប្រាស់ប្រព័ន្ធដឹកជញ្ជូន (EBS Delivery System)
-----------------------------------------
🏢 ក្រុមហ៊ុន: ${createdCredentials.companyName}
🌐 តំណភ្ជាប់ចូលប្រើប្រាស់: ${createdCredentials.url}/auth
👤 អ៊ីមែល (Email): ${createdCredentials.email}
🔑 ពាក្យសម្ងាត់ (Password): ${createdCredentials.password}
🏷️ កញ្ចប់សេវា: ${createdCredentials.planName}
-----------------------------------------
សូមចូលប្រើប្រាស់ និងផ្លាស់ប្តូរពាក្យសម្ងាត់តាមការគួរ។`;
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
      alert('បានបង្កើត Coupon ជោគជ័យ!');
      setShowCouponModal(false);
      setNewCoupon({ code: '', discountType: 'percentage', discountValue: 20, usageLimit: 100 });
      loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'បរាជ័យក្នុងការបង្កើត Coupon');
    }
  };

  const handleApproveCommission = async (id: number, status: 'approved' | 'paid') => {
    const ref = status === 'paid' ? prompt('សូមបញ្ចូលលេខយោងផ្ទេរប្រាក់ (Payout Reference):', 'ABA-TRX-' + Date.now()) : undefined;
    if (status === 'paid' && !ref) return;

    try {
      await saasApi.updateCommissionStatus(id, status, ref || undefined);
      alert(`Commission #${id} ត្រូវបានប្តូរទៅជា ${status}!`);
      loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'បរាជ័យ');
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
              flexShrink: 0,
            }}
          >
            👑
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
              EBS Master SaaS
            </div>
            <div style={{ fontSize: 11, color: '#93c5fd', fontWeight: 800, marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />
              SUPER ADMIN PORTAL
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <div style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#bfdbfe', textTransform: 'uppercase', padding: '8px 12px 6px', letterSpacing: '0.8px' }}>
            Main Menu
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
            <span>ផ្ទាំងគ្រប់គ្រង</span>
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
            <span>ក្រុមហ៊ុនទាំងអស់ ({subscriptions.length})</span>
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
            <span>គណនី SaaS Admins ({saasAdminsList.length})</span>
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
            <span>កញ្ចប់សេវា</span>
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
            <span>គូប៉ុងបញ្ចុះតម្លៃ</span>
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
            <span>ដៃគូសហការ</span>
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
            <span style={{ fontSize: 13, color: '#ffffff', fontWeight: 700 }}>EBS Cloud Administration</span>
          </div>

          {/* Right Actions & Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Refresh */}
            <button
              onClick={loadAllData}
              title="Refresh Data"
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

              {/* Dropdown Menu Card */}
              {showProfileDropdown && (
                <>
                  {/* Invisible backdrop to close on outside click */}
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
                    {/* Dropdown Header */}
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: 13.5, fontWeight: 900, color: '#0f172a' }}>{user?.name || 'Admin User'}</div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>{user?.email || 'admin@gmail.com'}</div>
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
                        }}
                      >
                        👑 Super Administrator
                      </span>
                    </div>

                    {/* Dropdown Menu Links */}
                    <div style={{ padding: '6px 0' }}>
                      <button
                        onClick={() => {
                          setActiveMenu('users');
                          setShowProfileDropdown(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          width: '100%',
                          padding: '9px 12px',
                          border: 'none',
                          background: 'transparent',
                          color: '#334155',
                          fontSize: 13,
                          fontWeight: 700,
                          borderRadius: 10,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <MdGroup size={18} color="#64748b" />
                        <span>គណនី SaaS Admins</span>
                      </button>
                    </div>

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
                      {/* Logout Action */}
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
                        <span>ចាកចេញ (Logout)</span>
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
              {activeMenu === 'dashboard' && '📊 ផ្ទាំងគ្រប់គ្រងទិន្នន័យទូទៅ'}
              {activeMenu === 'tenants' && '🏢 បញ្ជីក្រុមហ៊ុន Subscribers ទាំងអស់'}
              {activeMenu === 'users' && '👑 គ្រប់គ្រង SaaS Platform Admins'}
              {activeMenu === 'plans' && '💎 កំណត់គម្រោងតម្លៃកញ្ចប់សេវា'}
              {activeMenu === 'coupons' && '🏷️ គ្រប់គ្រង Promo Coupons & Discounts'}
              {activeMenu === 'partners' && '🤝 ដៃគូសហការ & កម្រៃជើងសារ'}
            </h1>
            <p style={{ fontSize: 13.5, color: '#64748b', margin: 0 }}>
              {activeMenu === 'dashboard' && 'ទិដ្ឋភាពរួមនៃប្រព័ន្ធ SaaS និងស្ថិតិចំណូលប្រចាំខែ'}
              {activeMenu === 'tenants' && 'គ្រប់គ្រង Workspace Subdomains និងគណនី Admin របស់ក្រុមហ៊ុននីមួយៗ'}
              {activeMenu === 'users' && 'បញ្ជីគណនី Admin សម្រាប់គ្រប់គ្រងប្រព័ន្ធ Master SaaS (តារាង saas_admins ដាច់ដោយឡែក)'}
              {activeMenu === 'plans' && 'កំណត់តម្លៃ និង Limit សម្រាប់កញ្ចប់សេវាកម្ម'}
              {activeMenu === 'coupons' && 'បង្កើត និងគ្រប់គ្រងកូដបញ្ចុះតម្លៃសម្រាប់អតិថិជន'}
              {activeMenu === 'partners' && 'តាមដាន និងទូទាត់ប្រាក់កម្រៃជើងសារដៃគូសហការ'}
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
                    <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>ក្រុមហ៊ុន Subscribers</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', marginTop: 2 }}>{subscriptions.length}</div>
                    <div style={{ fontSize: 11.5, color: '#10b981', fontWeight: 700, marginTop: 4 }}>● ដំណើរការសកម្ម ១០០%</div>
                  </div>
                </div>

                <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 16, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
                    💰
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>ចំណូលប្រចាំខែ (MRR)</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#059669', marginTop: 2 }}>${totalMonthlyRevenue.toFixed(2)}</div>
                    <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, marginTop: 4 }}>Recurring Monthly</div>
                  </div>
                </div>

                <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 16, background: '#fdf4ff', color: '#c026d3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
                    💎
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>គម្រោង Plans សកម្ម</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', marginTop: 2 }}>{plans.length}</div>
                    <div style={{ fontSize: 11.5, color: '#6366f1', fontWeight: 600, marginTop: 4 }}>Starter / Pro / Enterprise</div>
                  </div>
                </div>

                <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 16, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
                    🤝
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>ដៃគូសហការ (Affiliates)</div>
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
                    បញ្ជីក្រុមហ៊ុន Subscribers ទាំងអស់ ({subscriptions.length})
                  </h3>
                  <p style={{ fontSize: 13.5, color: '#64748b', margin: '4px 0 0' }}>
                    គ្រប់គ្រង Workspace Subdomains និងគណនី Admin របស់ក្រុមហ៊ុននីមួយៗ
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Search Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '8px 14px', width: 280 }}>
                    <MdSearch size={20} color="#94a3b8" />
                    <input
                      type="text"
                      placeholder="ស្វែងរកក្រុមហ៊ុន..."
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
                    <span>បង្កើតក្រុមហ៊ុនថ្មី</span>
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontSize: 13, fontWeight: 700 }}>
                      <th style={{ padding: '14px 16px', borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }}>ក្រុមហ៊ុន / Workspace</th>
                      <th style={{ padding: '14px 16px' }}>Admin / Email</th>
                      <th style={{ padding: '14px 16px' }}>កញ្ចប់សេវា (Plan)</th>
                      <th style={{ padding: '14px 16px' }}>ស្ថានភាព</th>
                      <th style={{ padding: '14px 16px' }}>ថ្ងៃផុតកំណត់</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right', borderTopRightRadius: 10, borderBottomRightRadius: 10 }}>សកម្មភាព</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubscriptions.map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 14 }}>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18 }}>
                              🏢
                            </div>
                            <div>
                              <div style={{ fontWeight: 900, color: '#0f172a', fontSize: 15, textTransform: 'capitalize' }}>
                                {s.companyName || `Workspace #${s.id}`}
                              </div>
                              <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 700 }}>
                                {s.subdomain ? `${s.subdomain}.ebsexpress.com` : '-'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: 700, color: '#334155' }}>{s.user?.name || `User #${s.userId}`}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{s.user?.email || '-'}</div>
                        </td>
                        <td style={{ padding: '16px', fontWeight: 800, color: '#4f46e5' }}>
                          {s.plan?.name || `Plan #${s.planId}`}{' '}
                          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>({s.billingCycle})</span>
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
                        <td style={{ padding: '16px', color: '#64748b' }}>
                          {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : '-'}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          {s.subdomain && (
                            <a
                              href={`http://${s.subdomain}.localhost:3000`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 16px',
                                borderRadius: 10,
                                background: '#0f172a',
                                color: '#ffffff',
                                textDecoration: 'none',
                                fontSize: 12.5,
                                fontWeight: 800,
                              }}
                            >
                              <span>បើក Workspace</span>
                              <MdOpenInNew size={14} />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2.5: DEDICATED FULL-PAGE CREATE TENANT WORKSPACE VIEW */}
          {activeMenu === 'create-tenant' && (
            <div>
              {/* Back Button */}
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
                ← ត្រឡប់ទៅបញ្ជីក្រុមហ៊ុនទាំងអស់
              </button>

              {/* If Success Created */}
              {createdCredentials ? (
                <div style={{ background: '#ffffff', borderRadius: 24, padding: '40px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.06)', textAlign: 'center' }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 20px' }}>
                    🎉
                  </div>
                  <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>
                    បានបង្កើតក្រុមហ៊ុន & គណនីជោគជ័យ!
                  </h2>
                  <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 28px' }}>
                    ព័ត៌មាន Workspace និងគណនី Admin ត្រូវបានរៀបចំរួចរាល់។ សូមចម្លងព័ត៌មានខាងក្រោមផ្ញើជូនភ្ញៀវ៖
                  </p>

                  <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 20, padding: '24px', textAlign: 'left', marginBottom: 28, fontSize: 14.5, lineHeight: 2, maxWidth: 600, margin: '0 auto 28px' }}>
                    <div>🏢 <strong>ក្រុមហ៊ុន៖</strong> <span style={{ color: '#0f172a', fontWeight: 900 }}>{createdCredentials.companyName}</span></div>
                    <div>🌐 <strong>តំណភ្ជាប់ Workspace:</strong> <a href={`${createdCredentials.url}/auth`} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 800, textDecoration: 'none' }}>{createdCredentials.url}/auth</a></div>
                    <div>👤 <strong>Email Login:</strong> <span style={{ color: '#0f172a', fontWeight: 800 }}>{createdCredentials.email}</span></div>
                    <div>🔑 <strong>Password:</strong> <span style={{ color: '#16a34a', fontWeight: 900, background: '#dcfce7', padding: '3px 10px', borderRadius: 8 }}>{createdCredentials.password}</span></div>
                    <div>🏷️ <strong>កញ្ចប់សេវា៖</strong> <span style={{ fontWeight: 700, color: '#4f46e5' }}>{createdCredentials.planName}</span></div>
                  </div>

                  <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={handleCopyCredentials}
                      style={{
                        padding: '13px 26px',
                        borderRadius: 14,
                        border: 'none',
                        background: copied ? '#10b981' : '#0f172a',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 14px rgba(15,23,42,0.15)',
                      }}
                    >
                      {copied ? <MdCheck size={18} /> : <MdContentCopy size={18} />}
                      <span>{copied ? 'បានចម្លងរួចរាល់!' : 'ចម្លងព័ត៌មានផ្ញើឱ្យភ្ញៀវ'}</span>
                    </button>

                    <a
                      href={`https://t.me/share/url?url=${encodeURIComponent(createdCredentials.url)}&text=${encodeURIComponent(getShareableText())}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '13px 22px',
                        borderRadius: 14,
                        border: '1px solid #cbd5e1',
                        background: '#fff',
                        color: '#0088cc',
                        fontWeight: 800,
                        fontSize: 14,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <MdShare size={18} /> ផ្ញើតាម Telegram
                    </a>

                    <button
                      onClick={() => {
                        setCreatedCredentials(null);
                        setActiveMenu('tenants');
                      }}
                      style={{
                        padding: '13px 22px',
                        borderRadius: 14,
                        border: '1px solid #cbd5e1',
                        background: '#fff',
                        color: '#64748b',
                        fontWeight: 800,
                        fontSize: 14,
                        cursor: 'pointer',
                      }}
                    >
                      ត្រឡប់ទៅបញ្ជីក្រុមហ៊ុន
                    </button>
                  </div>
                </div>
              ) : (
                /* Full Form View */
                <form onSubmit={handleCreateCompanySubmit} style={{ background: '#ffffff', borderRadius: 24, padding: '36px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.04)' }}>
                  {/* Section 1: Company & Subdomain */}
                  <div style={{ marginBottom: 32 }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 28, height: 28, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>1</span>
                      <span>ព័ត៌មានក្រុមហ៊ុន & Workspace Subdomain</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 8 }}>
                          ឈ្មោះក្រុមហ៊ុន / អាជីវកម្មដឹកជញ្ជូន <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="ឧ. Angkor Express, Battambang Logistics"
                          value={companyForm.companyName}
                          onChange={handleCompanyNameChange}
                          style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 14, outline: 'none' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 8 }}>
                          Workspace Subdomain <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ background: '#f1f5f9', border: '1.5px solid #cbd5e1', borderRight: 'none', padding: '13px 14px', borderTopLeftRadius: 12, borderBottomLeftRadius: 12, color: '#64748b', fontSize: 13 }}>https://</span>
                          <input
                            type="text"
                            required
                            placeholder="angkorexpress"
                            value={companyForm.subdomain}
                            onChange={(e) => setCompanyForm({ ...companyForm, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                            style={{ flex: 1, padding: '13px 14px', border: '1.5px solid #cbd5e1', borderRadius: 0, fontSize: 14, fontWeight: 800, color: '#2563eb', outline: 'none' }}
                          />
                          <span style={{ background: '#f1f5f9', border: '1.5px solid #cbd5e1', borderLeft: 'none', padding: '13px 14px', borderTopRightRadius: 12, borderBottomRightRadius: 12, color: '#64748b', fontSize: 13 }}>.ebsexpress.com</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', marginBottom: 32 }} />

                  {/* Section 2: Plan & Billing */}
                  <div style={{ marginBottom: 32 }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 28, height: 28, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>2</span>
                      <span>កញ្ចប់សេវាកម្ម & វដ្តបង់ប្រាក់</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 8 }}>កញ្ចប់សេវា (Plan Tier)</label>
                        <select
                          value={companyForm.planId}
                          onChange={(e) => setCompanyForm({ ...companyForm, planId: Number(e.target.value) })}
                          style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 14, fontWeight: 700, outline: 'none', background: '#fff' }}
                        >
                          {plans.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} (${p.priceMonthly}/m - {p.maxOrdersPerMonth} orders/m)</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 8 }}>វដ្តបង់ប្រាក់ (Billing Cycle)</label>
                        <select
                          value={companyForm.billingCycle}
                          onChange={(e) => setCompanyForm({ ...companyForm, billingCycle: e.target.value as any })}
                          style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 14, fontWeight: 700, outline: 'none', background: '#fff' }}
                        >
                          <option value="monthly">បង់ប្រចាំខែ (Monthly)</option>
                          <option value="yearly">បង់ប្រចាំឆ្នាំ (Yearly - ទទួល Discount ពិសេស)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', marginBottom: 32 }} />

                  {/* Section 3: Admin User Credentials */}
                  <div style={{ marginBottom: 36 }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 28, height: 28, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>3</span>
                      <span>ព័ត៌មានគណនី Admin សម្រាប់ Login</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 8 }}>
                          ឈ្មោះម្ចាស់ក្រុមហ៊ុន / Admin Name
                        </label>
                        <input
                          type="text"
                          placeholder="ឧ. Sok Dara"
                          value={companyForm.adminName}
                          onChange={(e) => setCompanyForm({ ...companyForm, adminName: e.target.value })}
                          style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 14, outline: 'none' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 8 }}>
                          លេខទូរស័ព្ទ (Phone)
                        </label>
                        <input
                          type="text"
                          placeholder="012 345 678"
                          value={companyForm.phone}
                          onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                          style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 14, outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 8 }}>
                          Email សម្រាប់ Login <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="client@gmail.com"
                          value={companyForm.email}
                          onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                          style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 14, outline: 'none' }}
                        />
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <label style={{ fontSize: 13, fontWeight: 800, color: '#334155' }}>
                            Password <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setCompanyForm(prev => ({ ...prev, password: generateRandomPassword() }))}
                            style={{ fontSize: 12, background: 'none', border: 'none', color: '#2563eb', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <span>+ បង្កើត Password ថ្មី (Auto-Gen)</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          required
                          value={companyForm.password}
                          onChange={(e) => setCompanyForm({ ...companyForm, password: e.target.value })}
                          style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 14, fontWeight: 800, color: '#0f172a', outline: 'none' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Buttons */}
                  <div style={{ display: 'flex', gap: 14, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
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
                      បោះបង់
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
                      {creatingCompany ? 'កំពុងបង្កើត Workspace...' : '🚀 បង្កើតក្រុមហ៊ុន & Setup Workspace'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: SAAS PLATFORM ADMINS (Dedicated saas_admins Table) */}
          {activeMenu === 'users' && (
            <div style={{ background: '#fff', borderRadius: 24, padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <h3 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>
                      បញ្ជីគណនី SaaS Platform Admins ({saasAdminsList.length})
                    </h3>
                    <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: 12, fontWeight: 800 }}>
                      🛡️ តារាង saas_admins ដាច់ដោយឡែក
                    </span>
                  </div>
                  <p style={{ fontSize: 13.5, color: '#64748b', margin: 0 }}>
                    គណនី Admin សម្រាប់គ្រប់គ្រងប្រព័ន្ធ Master SaaS (មិនប៉ះពាល់ជាមួយទិន្នន័យ Users ដឹកជញ្ជូនឡើយ)
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {/* Role Filter */}
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
                    <option value="all">តួនាទីទាំងអស់ (All Admin Roles)</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="finance_admin">Finance Admin (គណនេយ្យ SaaS)</option>
                    <option value="support_admin">Support Admin (បច្ចេកទេស)</option>
                  </select>

                  {/* Search Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '8px 14px', width: 240 }}>
                    <MdSearch size={20} color="#94a3b8" />
                    <input
                      type="text"
                      placeholder="ស្វែងរក Admin..."
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
                    <span>+ បង្កើត SaaS Admin ថ្មី</span>
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontSize: 13, fontWeight: 700 }}>
                      <th style={{ padding: '14px 16px', borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }}>SaaS Admin Profile</th>
                      <th style={{ padding: '14px 16px' }}>Email សម្រាប់ Master Login</th>
                      <th style={{ padding: '14px 16px' }}>លេខទូរស័ព្ទ</th>
                      <th style={{ padding: '14px 16px' }}>តួនាទី (Role)</th>
                      <th style={{ padding: '14px 16px' }}>ស្ថានភាព</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right', borderTopRightRadius: 10, borderBottomRightRadius: 10 }}>Created At</th>
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
                                padding: '4px 12px',
                                borderRadius: 20,
                                fontSize: 12,
                                fontWeight: 800,
                                textTransform: 'uppercase',
                              }}
                            >
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563eb' }} />
                              {a.role}
                            </span>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                background: '#ecfdf5',
                                color: '#059669',
                                padding: '4px 10px',
                                borderRadius: 12,
                                fontSize: 11.5,
                                fontWeight: 800,
                              }}
                            >
                              Active
                            </span>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right', color: '#64748b', fontSize: 13 }}>
                            {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PLANS */}
          {activeMenu === 'plans' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
              {plans.map((p) => (
                <div key={p.id} style={{ background: '#fff', borderRadius: 24, padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px -6px rgba(15, 23, 42, 0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>{p.name}</h4>
                    {p.isPopular && (
                      <span style={{ fontSize: 11, background: '#6366f1', color: '#fff', padding: '3px 10px', borderRadius: 20, fontWeight: 800 }}>POPULAR</span>
                    )}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>
                    ${p.priceMonthly} <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>/ ខែ</span>
                  </div>
                  <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.5, marginBottom: 20 }}>{p.description}</p>
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13.5, color: '#334155', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MdCheckCircle color="#10b981" /> Max Orders: <strong>{p.maxOrdersPerMonth}</strong></li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MdCheckCircle color="#10b981" /> Max Users: <strong>{p.maxUsers}</strong></li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MdCheckCircle color="#10b981" /> Max Drivers: <strong>{p.maxDrivers}</strong></li>
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: COUPONS */}
          {activeMenu === 'coupons' && (
            <div style={{ background: '#fff', borderRadius: 24, padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>បញ្ជី Coupons & Promo Codes</h3>
                <button
                  onClick={() => setShowCouponModal(true)}
                  style={{ padding: '9px 18px', borderRadius: 12, border: 'none', background: '#2f55a5', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <MdAdd size={16} /> បង្កើត Coupon ថ្មី
                </button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontSize: 13, fontWeight: 700 }}>
                    <th style={{ padding: '14px 16px', borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }}>Code</th>
                    <th style={{ padding: '14px 16px' }}>Discount</th>
                    <th style={{ padding: '14px 16px' }}>Usage / Limit</th>
                    <th style={{ padding: '14px 16px', borderTopRightRadius: 10, borderBottomRightRadius: 10 }}>ដៃគូសហការ</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 14 }}>
                      <td style={{ padding: '16px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>{c.code}</td>
                      <td style={{ padding: '16px', fontWeight: 800, color: '#059669' }}>
                        {c.discountType === 'percentage' ? `${c.discountValue}%` : `$${c.discountValue}`}
                      </td>
                      <td style={{ padding: '16px', color: '#64748b' }}>{c.usedCount} / {c.usageLimit}</td>
                      <td style={{ padding: '16px', color: '#4f46e5', fontWeight: 700 }}>{c.partner ? c.partner.name : 'System Global'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 6: PARTNERS */}
          {activeMenu === 'partners' && (
            <div style={{ background: '#fff', borderRadius: 24, padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: '0 0 20px' }}>កម្រៃជើងសារដៃគូសហការ (Affiliate Commissions)</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontSize: 13, fontWeight: 700 }}>
                    <th style={{ padding: '14px 16px', borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }}>Partner Name</th>
                    <th style={{ padding: '14px 16px' }}>ទឹកប្រាក់កម្រៃ</th>
                    <th style={{ padding: '14px 16px' }}>ស្ថានភាព</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', borderTopRightRadius: 10, borderBottomRightRadius: 10 }}>សកម្មភាព</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((cm) => (
                    <tr key={cm.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 14 }}>
                      <td style={{ padding: '16px', fontWeight: 700, color: '#0f172a' }}>{cm.partner?.name || `Partner #${cm.partnerId}`}</td>
                      <td style={{ padding: '16px', fontWeight: 900, color: '#059669', fontSize: 15 }}>${Number(cm.calculatedAmount).toFixed(2)}</td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: cm.status === 'paid' ? '#ecfdf5' : '#eff6ff', color: cm.status === 'paid' ? '#059669' : '#2563eb', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>
                          {cm.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        {cm.status === 'pending' && (
                          <button onClick={() => handleApproveCommission(cm.id, 'approved')} style={{ padding: '6px 14px', borderRadius: 10, background: '#eff6ff', color: '#2563eb', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', marginRight: 8 }}>
                            Approve
                          </button>
                        )}
                        {cm.status === 'approved' && (
                          <button onClick={() => handleApproveCommission(cm.id, 'paid')} style={{ padding: '6px 14px', borderRadius: 10, background: '#ecfdf5', color: '#059669', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                            Mark as Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 2: Create SaaS Admin Account Modal (Dedicated saas_admins Table) */}
      {showAdminModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: 16,
          }}
        >
          <div style={{ background: '#fff', borderRadius: 24, padding: '36px', width: '100%', maxWidth: 520, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#2f55a5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(47,85,165,0.3)' }}>
                <MdAdminPanelSettings size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>បង្កើត SaaS Platform Admin ថ្មី</h3>
                <span style={{ fontSize: 12.5, color: '#64748b' }}>បន្ថែមក្នុងតារាង <strong>saas_admins</strong> ដាច់ដោយឡែកពីប្រព័ន្ធដឹកជញ្ជូន</span>
              </div>
            </div>

            <form onSubmit={handleCreateAdminSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                  ឈ្មោះ SaaS Admin (Full Name) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ឧ. Master Admin, Support Lead"
                  value={newAdminForm.name}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, name: e.target.value })}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                    Email Login <span style={{ color: '#ef4444' }}>*</span>
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
                    លេខទូរស័ព្ទ (Phone)
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
                    តួនាទី SaaS Role <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={newAdminForm.role}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, role: e.target.value })}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 700 }}
                  >
                    <option value="super_admin">Super Admin (គ្រប់គ្រងទាំងស្រុង)</option>
                    <option value="finance_admin">Finance Admin (គណនេយ្យ SaaS)</option>
                    <option value="support_admin">Support Admin (បច្ចេកទេស)</option>
                  </select>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 800, color: '#334155' }}>
                      Password <span style={{ color: '#ef4444' }}>*</span>
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
                  បោះបង់
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
                  {creatingAdmin ? 'កំពុងបង្កើត...' : 'បង្កើត SaaS Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Success Shareable Credentials Modal */}
      {createdCredentials && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div style={{ background: '#fff', borderRadius: 28, padding: '40px 36px', width: '100%', maxWidth: 520, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', textAlign: 'center' }}>
            <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, margin: '0 auto 18px' }}>
              🎉
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
              បានបង្កើតក្រុមហ៊ុន & គណនីជោគជ័យ!
            </h3>
            <p style={{ fontSize: 13.5, color: '#64748b', margin: '0 0 24px' }}>
              សូមចម្លងព័ត៌មានខាងក្រោមដើម្បីផ្ញើជូនម្ចាស់ក្រុមហ៊ុន ឬបុគ្គលិកហាង៖
            </p>

            <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 18, padding: '22px', textAlign: 'left', marginBottom: 24, fontSize: 14, lineHeight: 1.8 }}>
              <div>🏢 <strong>ក្រុមហ៊ុន៖</strong> <span style={{ color: '#0f172a', fontWeight: 900 }}>{createdCredentials.companyName}</span></div>
              <div>🌐 <strong>តំណភ្ជាប់ Workspace:</strong> <span style={{ color: '#4f46e5', fontWeight: 800 }}>{createdCredentials.url}/auth</span></div>
              <div>👤 <strong>Email Login:</strong> <span style={{ color: '#0f172a', fontWeight: 800 }}>{createdCredentials.email}</span></div>
              <div>🔑 <strong>Password:</strong> <span style={{ color: '#16a34a', fontWeight: 900, background: '#dcfce7', padding: '2px 8px', borderRadius: 6 }}>{createdCredentials.password}</span></div>
              <div>🏷️ <strong>កញ្ចប់សេវា៖</strong> <span style={{ fontWeight: 700 }}>{createdCredentials.planName}</span></div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleCopyCredentials}
                style={{ padding: '13px 24px', borderRadius: 14, border: 'none', background: copied ? '#10b981' : '#0f172a', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(15,23,42,0.15)' }}
              >
                {copied ? <MdCheck size={18} /> : <MdContentCopy size={18} />}
                <span>{copied ? 'បានចម្លងរួចរាល់!' : 'ចម្លងព័ត៌មានផ្ញើឱ្យភ្ញៀវ'}</span>
              </button>

              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(createdCredentials.url)}&text=${encodeURIComponent(getShareableText())}`}
                target="_blank"
                rel="noreferrer"
                style={{ padding: '13px 20px', borderRadius: 14, border: '1px solid #cbd5e1', background: '#fff', color: '#0088cc', fontWeight: 800, fontSize: 14, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <MdShare size={18} /> ផ្ញើតាម Telegram
              </a>

              <button
                onClick={() => setCreatedCredentials(null)}
                style={{ padding: '13px 20px', borderRadius: 14, border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
              >
                បិទ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Create Coupon Modal */}
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
            <h3 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', marginBottom: 20 }}>បង្កើត Promo Coupon ថ្មី</h3>
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
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, marginBottom: 6 }}>Discount Type</label>
                <select
                  value={newCoupon.discountType}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discountType: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #cbd5e1', fontWeight: 700 }}
                >
                  <option value="percentage">ភាគរយ Percentage (%)</option>
                  <option value="fixed_amount">ចំនួនថេរ Fixed Amount ($)</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, marginBottom: 6 }}>Discount Value</label>
                <input
                  type="number"
                  required
                  value={newCoupon.discountValue}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: Number(e.target.value) })}
                  style={{ width: '100%', padding: '12px 10px', borderRadius: 10, border: '1px solid #cbd5e1', fontWeight: 800 }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, marginBottom: 6 }}>Usage Limit (ចំនួនដង)</label>
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
                  បោះបង់
                </button>
                <button
                  type="submit"
                  style={{ padding: '11px 22px', borderRadius: 10, border: 'none', background: '#2f55a5', color: '#fff', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(47,85,165,0.35)' }}
                >
                  បង្កើត Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
