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
  MdReceiptLong,
  MdDownload,
  MdAutorenew,
  MdPublic,
  MdDns,
  MdStar,
  MdDeleteOutline,
  MdAdd,
  MdLink,
  MdInfoOutline,
  MdShield,
} from 'react-icons/md';
import { FaRegEdit, FaTrashAlt } from 'react-icons/fa';
import { FiPlusCircle } from 'react-icons/fi';
import { printInvoicePdf } from '@/lib/invoice-pdf';
import { FlagKm, FlagEn } from '@/components/ui/Flags';
import { SaasCloudIcon } from '@/components/ui/SaasCloudIcon';
import Pagination from '@/components/ui/Pagination';
import DateInput from '@/components/ui/DateInput';

export default function SaasMasterPortal() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const tr = (km: string, en: string) => (lang === 'km' ? km : en);

  const [activeMenu, setActiveMenu] = useState<'dashboard' | 'tenants' | 'invoices' | 'create-invoice' | 'users' | 'plans' | 'coupons' | 'partners' | 'create-tenant' | 'create-partner'>('dashboard');
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [saasAdminsList, setSaasAdminsList] = useState<any[]>([]);
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [adminRoleFilter, setAdminRoleFilter] = useState('all');
  const [partnerSearch, setPartnerSearch] = useState('');
  const [partnerStatusFilter, setPartnerStatusFilter] = useState('all');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Tab Pagination States
  const [subsPage, setSubsPage] = useState(1);
  const [subsLimit, setSubsLimit] = useState(10);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [invoicesLimit, setInvoicesLimit] = useState(10);
  const [adminsPage, setAdminsPage] = useState(1);
  const [adminsLimit, setAdminsLimit] = useState(10);
  const [plansPage, setPlansPage] = useState(1);
  const [plansLimit, setPlansLimit] = useState(10);
  const [couponsPage, setCouponsPage] = useState(1);
  const [couponsLimit, setCouponsLimit] = useState(10);
  const [partnersPage, setPartnersPage] = useState(1);
  const [partnersLimit, setPartnersLimit] = useState(10);
  const [commissionsPage, setCommissionsPage] = useState(1);
  const [commissionsLimit, setCommissionsLimit] = useState(10);

  // Modal: Renew / Extend Company Validity
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedTenantForRenew, setSelectedTenantForRenew] = useState<any>(null);
  const [renewDuration, setRenewDuration] = useState<'1y' | '6m' | '1m' | 'custom'>('1y');
  const [customEndDate, setCustomEndDate] = useState('');
  const [renewing, setRenewing] = useState(false);

  // Issue / Create Invoice State
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    subscriptionId: 0,
    planId: 2,
    billingCycle: 'yearly' as 'yearly' | 'monthly',
    subtotal: 490,
    discountAmount: 0,
    dueDate: '',
    status: 'pending' as 'pending' | 'paid',
  });

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

  // Modal 1.5: Edit Company / Tenant Info State
  const [showEditTenantModal, setShowEditTenantModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [savingTenant, setSavingTenant] = useState(false);
  const [editTenantForm, setEditTenantForm] = useState({
    id: 0,
    name: '',
    phone: '',
    email: '',
    address: '',
    planId: 1,
    status: 'active',
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
    password: '',
    phone: '',
    role: 'admin',
  });

  // Modal 5: Edit SaaS Admin Account
  const [showEditAdminModal, setShowEditAdminModal] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<number | null>(null);
  const [editAdminForm, setEditAdminForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'admin',
    isActive: true,
  });
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Modal 5 (Plan): Create / Edit Subscription Plan State
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

  // Modal 6: Multi-Domain Management Modal State
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [selectedTenantForDomains, setSelectedTenantForDomains] = useState<any>(null);
  const [tenantDomainsList, setTenantDomainsList] = useState<any[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [addingDomain, setAddingDomain] = useState(false);
  const [newDomainForm, setNewDomainForm] = useState({
    domain: '',
    domainType: 'custom',
    isPrimary: false,
  });
  const [copiedDns, setCopiedDns] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);

  // Modal 7: Create / Edit Affiliate Partner State
  const [partners, setPartners] = useState<any[]>([]);
  const [partnerSubTab, setPartnerSubTab] = useState<'partners' | 'commissions'>('partners');
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [editingPartnerId, setEditingPartnerId] = useState<number | null>(null);
  const [savingPartner, setSavingPartner] = useState(false);
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    email: '',
    phone: '',
    referralCode: '',
    commissionRate: 15,
    bankName: 'ABA Bank',
    accountNumber: '',
    accountName: '',
    isActive: true,
  });
  const [partnerErrors, setPartnerErrors] = useState<{ [key: string]: string }>({});

  const handleSelectMenu = (tab: 'dashboard' | 'tenants' | 'invoices' | 'users' | 'plans' | 'coupons' | 'partners') => {
    setActiveMenu(tab);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `?tab=${tab}`);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && ['dashboard', 'tenants', 'invoices', 'users', 'plans', 'coupons', 'partners'].includes(tab)) {
        setActiveMenu(tab as any);
      }
    }
    const currentUser = getUser();
    setUser(currentUser);
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [subsRes, plansRes, couponsRes, commsRes, adminsRes, partnersRes, invoicesRes] = await Promise.all([
        saasApi.getAllSubscriptions().catch(() => []),
        saasApi.getPlans().catch(() => []),
        saasApi.getCoupons().catch(() => []),
        saasApi.getAllCommissions().catch(() => []),
        saasApi.getSaasAdmins().catch(() => []),
        saasApi.getAllPartners().catch(() => []),
        saasApi.getAllInvoices().catch(() => []),
      ]);

      setSubscriptions(Array.isArray(subsRes) ? subsRes : (subsRes?.data || subsRes?.result || []));
      setPlans(Array.isArray(plansRes) ? plansRes : (plansRes?.data || plansRes?.result || []));
      setCoupons(Array.isArray(couponsRes) ? couponsRes : (couponsRes?.data || couponsRes?.result || []));
      setCommissions(Array.isArray(commsRes) ? commsRes : (commsRes?.data || commsRes?.result || commsRes?.recentCommissions || []));
      setSaasAdminsList(Array.isArray(adminsRes) ? adminsRes : (adminsRes?.data || adminsRes?.result || []));
      setPartners(Array.isArray(partnersRes) ? partnersRes : (partnersRes?.data || partnersRes?.result || []));
      setAllInvoices(Array.isArray(invoicesRes) ? invoicesRes : (invoicesRes?.data || invoicesRes?.result || []));
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

  const formatDate = (dateStr: any) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getTenantWorkspaceBaseUrl = (subdomain?: string) => {
    if (!subdomain) return '';
    const sub = subdomain.toLowerCase().trim();
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';
      const protocol = window.location.protocol;

      if (hostname.includes('localhost') || hostname === '127.0.0.1') {
        return `${protocol}//${sub}.localhost${port}`;
      } else {
        const parts = hostname.split('.');
        const rootDomain = parts.length > 2 ? parts.slice(-2).join('.') : hostname;
        return `${protocol}//${sub}.${rootDomain}${port}`;
      }
    }
    return `http://${sub}.localhost:3000`;
  };

  const handleOpenEditTenantModal = (tenantSub: any) => {
    const t = tenantSub.tenant || tenantSub;
    const tenantId = t.id || tenantSub.tenantId || tenantSub.id;
    if (tenantId) {
      router.push(`/admin/saas/tenants/edit/${tenantId}`);
    }
  };

  const handleSaveEditTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTenantForm.name.trim()) {
      alert(tr('សូមបញ្ចូលឈ្មោះក្រុមហ៊ុន', 'Please enter company name'));
      return;
    }
    try {
      setSavingTenant(true);
      await saasApi.updateTenant(editTenantForm.id, {
        name: editTenantForm.name,
        phone: editTenantForm.phone,
        email: editTenantForm.email,
        address: editTenantForm.address,
        planId: Number(editTenantForm.planId),
        status: editTenantForm.status,
      });
      alert(tr('បានកែប្រែព័ត៌មានក្រុមហ៊ុនជោគជ័យ!', 'Company information updated successfully!'));
      setShowEditTenantModal(false);
      loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការកែប្រែព័ត៌មានក្រុមហ៊ុន', 'Failed to update company information'));
    } finally {
      setSavingTenant(false);
    }
  };

  const handleOpenRenewModal = (tenantSub: any) => {
    setSelectedTenantForRenew(tenantSub);
    setRenewDuration('1y');
    setCustomEndDate('');
    setShowRenewModal(true);
  };

  const handleConfirmRenew = async () => {
    if (!selectedTenantForRenew) return;
    try {
      setRenewing(true);
      let nextEnd = new Date();
      if (selectedTenantForRenew.currentPeriodEnd) {
        const curr = new Date(selectedTenantForRenew.currentPeriodEnd);
        if (curr.getTime() > nextEnd.getTime()) {
          nextEnd = curr;
        }
      }

      if (renewDuration === '1y') {
        nextEnd.setFullYear(nextEnd.getFullYear() + 1);
      } else if (renewDuration === '6m') {
        nextEnd.setMonth(nextEnd.getMonth() + 6);
      } else if (renewDuration === '1m') {
        nextEnd.setMonth(nextEnd.getMonth() + 1);
      } else if (renewDuration === 'custom' && customEndDate) {
        nextEnd = new Date(customEndDate);
      }

      await saasApi.updateSubscriptionStatus(selectedTenantForRenew.id, 'active', nextEnd);
      alert(tr('បានបន្តសុពលភាពជោគជ័យ!', 'Subscription extended successfully!'));
      setShowRenewModal(false);
      loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការបន្តសុពលភាព', 'Failed to extend validity'));
    } finally {
      setRenewing(false);
    }
  };

  const handleMarkInvoicePaid = async (invId: number) => {
    if (!confirm(tr('តើអ្នកប្រាកដជាចង់កំណត់វិក្កយបត្រនេះជា «បង់រួច» មែនទេ?', 'Are you sure you want to mark this invoice as PAID?'))) return;
    try {
      await saasApi.updateInvoiceStatus(invId, 'paid');
      alert(tr('វិក្កយបត្រត្រូវបានកំណត់ជា «បង់រួច» និងបានបើកដំណើរការគម្រោងជោគជ័យ!', 'Invoice marked as PAID and subscription activated!'));
      loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការកែប្រែស្ថានភាព', 'Failed to update invoice status'));
    }
  };

  const formatLocalDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleAddPeriodToDueDate = (amount: number, unit: 'year' | 'month' | 'day') => {
    let base = new Date();
    if (invoiceForm.dueDate && invoiceForm.dueDate.includes('-')) {
      const parts = invoiceForm.dueDate.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          base = new Date(y, m, d);
        }
      }
    }
    if (unit === 'year') {
      base.setFullYear(base.getFullYear() + amount);
    } else if (unit === 'month') {
      base.setMonth(base.getMonth() + amount);
    } else if (unit === 'day') {
      base.setDate(base.getDate() + amount);
    }
    const nextDate = formatLocalDateStr(base);
    setInvoiceForm((prev) => ({ ...prev, dueDate: nextDate }));
  };

  const handleOpenCreateInvoice = (targetSubId?: number | React.MouseEvent) => {
    const subId = typeof targetSubId === 'number' ? targetSubId : undefined;
    const defaultSub = (subId ? subscriptions.find((s) => s.id === subId) : null) || subscriptions[0];
    const planId = defaultSub?.planId || defaultSub?.plan?.id || plans[0]?.id || 1;
    const defaultPlan = plans.find((p) => p.id === planId) || defaultSub?.plan || plans[0] || { priceYearly: 490, priceMonthly: 49, id: 2 };
    const cycle = (defaultSub?.billingCycle as 'yearly' | 'monthly') || 'yearly';
    const price = cycle === 'yearly' ? Number(defaultPlan.priceYearly || 0) : Number(defaultPlan.priceMonthly || 0);
    
    // Calculate accurate period end based on cycle (+1 year or +1 month)
    const base = defaultSub?.currentPeriodEnd && new Date(defaultSub.currentPeriodEnd).getTime() > Date.now()
      ? new Date(defaultSub.currentPeriodEnd)
      : new Date();
    if (cycle === 'yearly') {
      base.setFullYear(base.getFullYear() + 1);
    } else {
      base.setMonth(base.getMonth() + 1);
    }
    const defaultDueDate = formatLocalDateStr(base);

    setInvoiceForm({
      subscriptionId: defaultSub?.id || 1,
      planId: defaultPlan.id || planId,
      billingCycle: cycle,
      subtotal: price,
      discountAmount: 0,
      dueDate: defaultDueDate,
      status: 'pending',
    });
    setActiveMenu('create-invoice');
  };

  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingInvoice(true);
      const selectedSub = subscriptions.find((s) => s.id === Number(invoiceForm.subscriptionId)) || subscriptions[0];
      const total = Math.max(0, Number(invoiceForm.subtotal) - Number(invoiceForm.discountAmount));

      await saasApi.createInvoice({
        subscriptionId: Number(invoiceForm.subscriptionId) || undefined,
        userId: selectedSub?.userId || undefined,
        subtotal: Number(invoiceForm.subtotal),
        discountAmount: Number(invoiceForm.discountAmount) || 0,
        totalAmount: total,
        dueDate: invoiceForm.dueDate ? new Date(invoiceForm.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: invoiceForm.status,
        planId: Number(invoiceForm.planId) || undefined,
        billingCycle: invoiceForm.billingCycle,
      });

      alert(tr('បានចេញវិក្កយបត្រជូនក្រុមហ៊ុនជោគជ័យ!', 'Invoice issued to tenant company successfully!'));
      setActiveMenu('invoices');
      loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការចេញវិក្កយបត្រ', 'Failed to issue invoice'));
    } finally {
      setCreatingInvoice(false);
    }
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
    router.push('/admin/saas/tenants/new');
  };

  const handleOpenAdminModal = () => {
    setNewAdminForm({
      name: '',
      email: '',
      phone: '',
      password: '',
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

  const handleDeleteTenant = async (id: number, name: string, isSuspended?: boolean) => {
    if (isSuspended) {
      if (!confirm(tr(`តើអ្នកចង់បើកដំណើរការ (Reactivate) ក្រុមហ៊ុន "${name}" ឡើងវិញមែនទេ?`, `Are you sure you want to reactivate tenant "${name}"?`))) {
        return;
      }
      try {
        await saasApi.reactivateTenant(id);
        alert(tr('បានបើកដំណើរការក្រុមហ៊ុនឡើងវិញជោគជ័យ!', 'Tenant reactivated successfully!'));
        loadAllData();
      } catch (err: any) {
        alert(err.response?.data?.message || tr('បរាជ័យក្នុងការបើកដំណើរការ', 'Failed to reactivate tenant'));
      }
      return;
    }

    if (!confirm(tr(`តើអ្នកពិតជាចង់ផ្អាកដំណើរការ (Suspend) ក្រុមហ៊ុន "${name}" មែនទេ?\n(ទិន្នន័យទាំងអស់នឹងត្រូវបានរក្សាទុកដោយសុវត្ថិភាព ប៉ុន្តែបុគ្គលិកទាំងអស់នឹងមិនអាចចូល Login បានឡើយ)`, `Are you sure you want to suspend tenant "${name}"? All operational data will be safely archived, but users will be blocked from logging in.`))) {
      return;
    }
    try {
      await saasApi.deleteTenant(id);
      alert(tr('បានផ្អាកដំណើរការក្រុមហ៊ុនជោគជ័យ!', 'Tenant suspended successfully!'));
      loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការផ្អាកក្រុមហ៊ុន', 'Failed to suspend tenant'));
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

  const openNewPartnerModal = () => {
    setEditingPartnerId(null);
    setPartnerForm({
      name: '',
      email: '',
      phone: '',
      referralCode: `PARTNER${Math.floor(100 + Math.random() * 900)}`,
      commissionRate: 15,
      bankName: 'ABA Bank',
      accountNumber: '',
      accountName: '',
      isActive: true,
    });
    setPartnerErrors({});
    setActiveMenu('create-partner');
  };

  const handleEditPartner = (partner: any) => {
    setEditingPartnerId(partner.id);
    setPartnerErrors({});
    setPartnerForm({
      name: partner.name || '',
      email: partner.email || '',
      phone: partner.phone || '',
      referralCode: partner.referralCode || '',
      commissionRate: Number(partner.commissionRate) || 15,
      bankName: partner.bankAccountInfo?.bankName || 'ABA Bank',
      accountNumber: partner.bankAccountInfo?.accountNumber || '',
      accountName: partner.bankAccountInfo?.accountName || '',
      isActive: partner.isActive !== false,
    });
    setActiveMenu('create-partner');
  };

  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};
    if (!partnerForm.name.trim()) newErrors.name = tr('សូមបញ្ចូលឈ្មោះដៃគូសហការ', 'Please enter partner name');
    if (!partnerForm.email.trim()) newErrors.email = tr('សូមបញ្ចូលអ៊ីមែល', 'Please enter email');
    if (!partnerForm.referralCode.trim()) newErrors.referralCode = tr('សូមបញ្ចូលកូដណែនាំ', 'Please enter referral code');

    if (Object.keys(newErrors).length > 0) {
      setPartnerErrors(newErrors);
      alert(tr('សូមបំពេញឈ្មោះ, អ៊ីមែល និងកូដណែនាំ', 'Please fill in name, email, and referral code'));
      return;
    }

    try {
      setSavingPartner(true);
      const payload = {
        name: partnerForm.name.trim(),
        email: partnerForm.email.trim().toLowerCase(),
        phone: partnerForm.phone.trim(),
        referralCode: partnerForm.referralCode.trim().toUpperCase(),
        commissionRate: Number(partnerForm.commissionRate) || 15,
        bankAccountInfo: {
          bankName: partnerForm.bankName,
          accountNumber: partnerForm.accountNumber,
          accountName: partnerForm.accountName,
        },
        isActive: partnerForm.isActive,
      };

      if (editingPartnerId) {
        await saasApi.updatePartner(editingPartnerId, payload);
        alert(tr('បានកែប្រែដៃគូសហការជោគជ័យ!', 'Partner updated successfully!'));
      } else {
        await saasApi.createPartner(payload);
        alert(tr('បានបង្កើតដៃគូសហការថ្មីជោគជ័យ!', 'Partner created successfully!'));
      }
      setActiveMenu('partners');
      loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការរក្សាទុកដៃគូ', 'Failed to save partner'));
    } finally {
      setSavingPartner(false);
    }
  };

  const handleDeletePartner = async (id: number, name: string) => {
    if (!confirm(tr(`តើអ្នកពិតជាចង់លុបដៃគូ "${name}" មែនទេ?`, `Are you sure you want to delete partner "${name}"?`))) {
      return;
    }
    try {
      await saasApi.deletePartner(id);
      alert(tr('បានលុបដៃគូសហការជោគជ័យ!', 'Partner deleted successfully!'));
      loadAllData();
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការលុបដៃគូ', 'Failed to delete partner'));
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
        url: `http://${companyForm.subdomain}.localhost:3000`,
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

  // ── Dynamic Domains Management Handlers ──
  const handleOpenDomainModal = async (tenantOrSub: any) => {
    setSelectedTenantForDomains(tenantOrSub);
    setNewDomainForm({
      domain: '',
      domainType: 'custom',
      isPrimary: false,
    });
    setShowDomainModal(true);
    await loadTenantDomains(tenantOrSub.tenantId || tenantOrSub.id, tenantOrSub);
  };

  const loadTenantDomains = async (tenantId: number, tenantObj?: any) => {
    const currentTenant = tenantObj || selectedTenantForDomains;
    const defaultSub = currentTenant?.subdomain || currentTenant?.slug || currentTenant?.tenant?.slug || 'tenant';
    const fallbackList = [
      {
        id: 0,
        domain: `${defaultSub}.ebsexpress.com`,
        isPrimary: true,
        isVerified: true,
        domainType: 'subdomain',
        sslStatus: 'active',
      },
    ];

    try {
      setLoadingDomains(true);
      const res = await saasApi.getDomains(tenantId);
      const list = Array.isArray(res) ? res : res?.data || [];
      if (list.length > 0) {
        setTenantDomainsList(list);
      } else {
        setTenantDomainsList(fallbackList);
      }
    } catch (err) {
      console.warn('Tenant domains API returned error, showing default subdomain:', err);
      setTenantDomainsList(fallbackList);
    } finally {
      setLoadingDomains(false);
    }
  };

  const handleAddDomainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainForm.domain || !selectedTenantForDomains) return;

    try {
      setAddingDomain(true);
      const tenantId = selectedTenantForDomains.tenantId || selectedTenantForDomains.id;
      await saasApi.addDomain({
        tenantId,
        domain: newDomainForm.domain.trim(),
        domainType: newDomainForm.domainType,
        isPrimary: newDomainForm.isPrimary,
      });
      alert(tr('បានបន្ថែម Domain ដោយជោគជ័យ!', 'Domain added successfully!'));
      setNewDomainForm({ domain: '', domainType: 'custom', isPrimary: false });
      await loadTenantDomains(tenantId);
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការបន្ថែម Domain', 'Failed to add Domain'));
    } finally {
      setAddingDomain(false);
    }
  };

  const handleSetPrimaryDomain = async (domainId: number) => {
    try {
      await saasApi.setPrimaryDomain(domainId);
      const tenantId = selectedTenantForDomains.tenantId || selectedTenantForDomains.id;
      await loadTenantDomains(tenantId);
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យ', 'Failed to set primary domain'));
    }
  };

  const handleVerifyDomain = async (domainId: number) => {
    try {
      await saasApi.verifyDomain(domainId);
      alert(tr('បានផ្ទៀងផ្ទាត់ DNS & SSL ជោគជ័យ!', 'DNS & SSL Verified successfully!'));
      const tenantId = selectedTenantForDomains.tenantId || selectedTenantForDomains.id;
      await loadTenantDomains(tenantId);
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យ', 'Failed to verify domain'));
    }
  };

  const handleDeleteDomain = async (domainId: number) => {
    if (!confirm(tr('តើអ្នកពិតជាចង់លុប Domain នេះមែនទេ?', 'Are you sure you want to delete this domain?'))) return;

    try {
      await saasApi.deleteDomain(domainId);
      const tenantId = selectedTenantForDomains.tenantId || selectedTenantForDomains.id;
      await loadTenantDomains(tenantId);
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យ', 'Failed to delete domain'));
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
      (((s.subdomain || s.tenant?.slug) as string | undefined) && (s.subdomain || s.tenant?.slug)!.toLowerCase().includes(q)) ||
      (s.user?.email && s.user.email.toLowerCase().includes(q)) ||
      (s.user?.name && s.user.name.toLowerCase().includes(q))
    );
  });
  const paginatedSubscriptions = filteredSubscriptions.slice((subsPage - 1) * subsLimit, subsPage * subsLimit);

  const filteredAdmins = saasAdminsList.filter((a) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (a.name && a.name.toLowerCase().includes(q)) ||
      (a.email && a.email.toLowerCase().includes(q)) ||
      (a.phone && a.phone.includes(q));
    const matchesRole = adminRoleFilter === 'all' || a.role === adminRoleFilter;
    return matchesSearch && matchesRole;
  });
  const paginatedAdmins = filteredAdmins.slice((adminsPage - 1) * adminsLimit, adminsPage * adminsLimit);

  const filteredPlans = plans.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.slug && p.slug.toLowerCase().includes(q))
    );
  });
  const paginatedPlans = filteredPlans.slice((plansPage - 1) * plansLimit, plansPage * plansLimit);

  const filteredCoupons = coupons.filter((c) => {
    const q = searchQuery.toLowerCase();
    return c.code && c.code.toLowerCase().includes(q);
  });
  const paginatedCoupons = filteredCoupons.slice((couponsPage - 1) * couponsLimit, couponsPage * couponsLimit);

  const filteredPartners = partners.filter((p) => {
    const q = partnerSearch.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q)) ||
      (p.referralCode && p.referralCode.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q))
    );
  });
  const paginatedPartners = filteredPartners.slice((partnersPage - 1) * partnersLimit, partnersPage * partnersLimit);

  const filteredCommissions = commissions.filter((c) => {
    const q = partnerSearch.toLowerCase();
    const partnerName = (c.partner?.name || `Partner #${c.partnerId || c.id}`).toLowerCase();
    const matchesSearch = partnerName.includes(q) || String(c.calculatedAmount || c.amount || '').includes(q);
    const matchesStatus = partnerStatusFilter === 'all' || c.status === partnerStatusFilter;
    return matchesSearch && matchesStatus;
  });
  const paginatedCommissions = filteredCommissions.slice((commissionsPage - 1) * commissionsLimit, commissionsPage * commissionsLimit);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Kantumruy Pro', 'Inter', sans-serif", width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
      {/* 1. DEDICATED SAAS MASTER SIDEBAR */}
      <aside
        style={{
          width: 260,
          minWidth: 260,
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
        <div style={{ height: 64, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.12)', boxSizing: 'border-box' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
              padding: 2,
              boxSizing: 'border-box',
              flexShrink: 0,
            }}
          >
            <SaasCloudIcon size={34} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.2px', lineHeight: 1.2 }}>
              EBS Master SaaS
            </div>
            <div style={{ fontSize: 10.5, color: '#93c5fd', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
            onClick={() => handleSelectMenu('dashboard')}
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
            onClick={() => handleSelectMenu('tenants')}
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
            <span>{tr('ក្រុមហ៊ុនទាំងអស់', 'All Companies')}</span>
          </button>

          <button
            onClick={() => handleSelectMenu('invoices')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 10,
              border: 'none',
              background: (activeMenu === 'invoices' || activeMenu === 'create-invoice') ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: (activeMenu === 'invoices' || activeMenu === 'create-invoice') ? 900 : 600,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
              borderLeft: (activeMenu === 'invoices' || activeMenu === 'create-invoice') ? '4px solid #ffffff' : '4px solid transparent',
            }}
          >
            <MdReceiptLong size={20} color={(activeMenu === 'invoices' || activeMenu === 'create-invoice') ? '#ffffff' : '#bfdbfe'} />
            <span>{tr('ប្រវត្តិវិក្កយបត្រ', 'Billing Invoices')}</span>
          </button>

          <button
            onClick={() => handleSelectMenu('users')}
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
            <span>{tr('គណនី SaaS Admins', 'SaaS Admins')}</span>
          </button>

          <button
            onClick={() => handleSelectMenu('plans')}
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
            onClick={() => handleSelectMenu('coupons')}
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
            onClick={() => handleSelectMenu('partners')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 10,
              border: 'none',
              background: (activeMenu === 'partners' || activeMenu === 'create-partner') ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: (activeMenu === 'partners' || activeMenu === 'create-partner') ? 900 : 600,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
              borderLeft: (activeMenu === 'partners' || activeMenu === 'create-partner') ? '4px solid #ffffff' : '4px solid transparent',
            }}
          >
            <MdAttachMoney size={20} color={(activeMenu === 'partners' || activeMenu === 'create-partner') ? '#ffffff' : '#bfdbfe'} />
            <span>{tr('ដៃគូសហការ', 'Affiliate Partners')}</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA WITH DEDICATED TOPBAR */}
      <div style={{ flex: 1, marginLeft: 260, minWidth: 0, maxWidth: 'calc(100vw - 260px)', display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowX: 'hidden' }}>
        {/* Dedicated SaaS Master Topbar / Navbar */}
        <header
          style={{
            height: 64,
            background: '#2b529a',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            padding: '0 28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 80,
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            {/* Right Actions & Profile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Language Switcher Button */}
              <button
                onClick={() => setLang(lang === 'en' ? 'km' : 'en')}
                title={tr('ប្តូរភាសា (Switch Language)', 'Switch Language')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  height: 38,
                  padding: '0 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {lang === 'km' ? (
                  <>
                    <FlagKm size={22} />
                    <span>ភាសាខ្មែរ</span>
                  </>
                ) : (
                  <>
                    <FlagEn size={22} />
                    <span>English</span>
                  </>
                )}
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
        </div>
      </header>

        {/* 3. DYNAMIC DASHBOARD BODY */}
        <main style={{ flex: 1, padding: '24px 28px', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
          <style jsx global>{`
            .saas-custom-table {
              width: 100% !important;
              border-collapse: collapse !important;
              font-size: 13.5px !important;
            }
            .saas-custom-table thead th {
              background: #2f55a5 !important;
              color: #ffffff !important;
              border-bottom: 1px solid rgba(255, 255, 255, 0.15) !important;
              font-size: 12.5px !important;
              font-weight: 700 !important;
              white-space: nowrap !important;
              letter-spacing: 0.3px !important;
              padding: 12px 16px !important;
            }
            .saas-custom-table tbody tr {
              transition: background-color 0.15s ease !important;
              border-bottom: 1px solid #f1f5f9 !important;
            }
            .saas-custom-table tbody tr:nth-child(odd) {
              background: #f8fafc;
            }
            .saas-custom-table tbody tr:nth-child(even) {
              background: #ffffff;
            }
            .saas-custom-table tbody tr:hover td {
              background: #eef2fa !important;
            }
            .saas-custom-table tbody td {
              vertical-align: middle !important;
              padding: 12px 16px !important;
              color: #334155 !important;
            }
          `}</style>

          {/* Main Page Title Header */}
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              {activeMenu === 'dashboard' && tr('ផ្ទាំងគ្រប់គ្រងទិន្នន័យទូទៅ', 'SaaS Master Overview')}
              {activeMenu === 'tenants' && tr('បញ្ជីក្រុមហ៊ុនជាវសេវា', 'All Tenant Companies')}
              {activeMenu === 'invoices' && tr('ប្រវត្តិវិក្កយបត្រ & ការទូទាត់ទាំងអស់', 'All Billing Invoices & Payments')}
              {activeMenu === 'create-invoice' && tr('ចេញវិក្កយបត្រជូនក្រុមហ៊ុន (បង់តាមក្រោយ)', 'Issue Invoice to Tenant (Pay Later)')}
              {activeMenu === 'create-partner' && (editingPartnerId ? tr('កែប្រែដៃគូសហការ', 'Edit Affiliate Partner') : tr('បង្កើតដៃគូសហការថ្មី', 'Add New Affiliate Partner'))}
              {activeMenu === 'users' && tr('អ្នកគ្រប់គ្រងប្រព័ន្ធ SaaS', 'SaaS Platform Admins')}
              {activeMenu === 'plans' && tr('គម្រោងតម្លៃកញ្ចប់សេវា', 'Subscription Plans & Pricing')}
              {activeMenu === 'coupons' && tr('គូប៉ុងបញ្ចុះតម្លៃ', 'Promo Coupons & Discounts')}
              {activeMenu === 'partners' && tr('ដៃគូសហការ និងកម្រៃជើងសារ', 'Affiliate Partners & Commissions')}
            </h1>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
              {activeMenu === 'dashboard' && tr('ទិដ្ឋភាពរួមនៃប្រព័ន្ធ SaaS និងស្ថិតិចំណូលប្រចាំខែ', 'Overview of SaaS delivery platform and monthly recurring revenue')}
              {activeMenu === 'tenants' && tr('គ្រប់គ្រង Workspace Subdomains និងគណនី Admin របស់ក្រុមហ៊ុននីមួយៗ', 'Manage Workspace subdomains, plans, and Admin accounts for each company')}
              {activeMenu === 'invoices' && tr('តាមដានស្ថានភាពវិក្កយបត្ររបស់ក្រុមហ៊ុនទាំងអស់ និងកំណត់ការទូទាត់ប្រាក់', 'Track all tenant company invoices and manage payment verification')}
              {activeMenu === 'create-invoice' && tr('បង្កើត និងចេញវិក្កយបត្រផ្ញើជូនក្រុមហ៊ុនជាវសេវាដើម្បីឱ្យពួកគេទូទាត់តាមក្រោយ', 'Create and issue an invoice for a tenant company to pay later via KHQR or Bank Transfer')}
              {activeMenu === 'create-partner' && tr('ព័ត៌មានដៃគូណែនាំអតិថិជន និងការកំណត់កម្រៃជើងសារ', 'Referral partner details and commission settings')}
              {activeMenu === 'users' && tr('បញ្ជីគណនី Admin សម្រាប់គ្រប់គ្រងប្រព័ន្ធ Master SaaS', 'Platform Master Admins managing the multi-tenant SaaS delivery infrastructure')}
              {activeMenu === 'plans' && tr('កំណត់តម្លៃ និងដែនកំណត់សម្រាប់កញ្ចប់សេវាកម្ម', 'Configure quotas, features, limits and pricing for each tier')}
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
                    <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{tr('ក្រុមហ៊ុនជាវសេវា', 'Subscribed Companies')}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', marginTop: 2 }}>{subscriptions.length}</div>
                    <div style={{ fontSize: 11.5, color: '#10b981', fontWeight: 700, marginTop: 4 }}>● {tr('ដំណើរការសកម្ម ១០០%', '100% Active')}</div>
                  </div>
                </div>

                <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 16, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
                    💰
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{tr('ចំណូលប្រចាំខែ (MRR)', 'Monthly Revenue (MRR)')}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#059669', marginTop: 2 }}>${totalMonthlyRevenue.toFixed(2)}</div>
                    <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, marginTop: 4 }}>{tr('ចំណូលបន្តប្រចាំខែ', 'Recurring Monthly')}</div>
                  </div>
                </div>

                <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 16, background: '#fdf4ff', color: '#c026d3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
                    💎
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{tr('គម្រោងសេវាសកម្ម', 'Active Plans')}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', marginTop: 2 }}>{plans.length}</div>
                    <div style={{ fontSize: 11.5, color: '#6366f1', fontWeight: 600, marginTop: 4 }}>{tr('កញ្ចប់សេវាទាំងអស់', 'Starter / Pro / Enterprise')}</div>
                  </div>
                </div>

                <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 16, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
                    🤝
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{tr('ដៃគូសហការ', 'Affiliate Partners')}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#d97706', marginTop: 2 }}>{partners.length}</div>
                    <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, marginTop: 4 }}>{tr('ដៃគូសហការទាំងអស់', 'Registered Partners')}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ALL TENANTS SUBSCRIBERS */}
          {activeMenu === 'tenants' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <span className="card-title">{tr('បញ្ជីក្រុមហ៊ុនដែលបានចុះឈ្មោះ', 'Registered Companies')}</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {/* Search Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '5px 10px', width: 220 }}>
                    <MdSearch size={16} color="var(--text-muted)" />
                    <input
                      type="text"
                      placeholder={tr('ស្វែងរកក្រុមហ៊ុន...', 'Search companies...')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', paddingLeft: 6, fontSize: 12.5, width: '100%' }}
                    />
                  </div>

                  <Link
                    href="/admin/saas/tenants/new"
                    className="btn btn-primary btn-sm"
                  >
                    <FiPlusCircle size={14} />
                    <span>{tr('បង្កើតក្រុមហ៊ុនថ្មី', 'Add New Company')}</span>
                  </Link>
                </div>
              </div>

              <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                <table className="saas-custom-table" style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#2f55a5', color: '#ffffff' }}>
                      <th style={{ width: 44, textAlign: 'center', whiteSpace: 'nowrap' }}>{tr('ល.រ', 'No.')}</th>
                      <th style={{ whiteSpace: 'nowrap', minWidth: 150 }}>{tr('ឈ្មោះក្រុមហ៊ុន', 'Company')}</th>
                      <th style={{ whiteSpace: 'nowrap' }}>{tr('Workspace Subdomain', 'Workspace Subdomain')}</th>
                      <th style={{ whiteSpace: 'nowrap' }}>{tr('Email', 'Email')}</th>
                      <th style={{ whiteSpace: 'nowrap' }}>{tr('លេខទូរស័ព្ទ', 'Phone')}</th>
                      <th style={{ whiteSpace: 'nowrap' }}>{tr('កញ្ចប់សេវា', 'Plan Tier')}</th>
                      <th style={{ whiteSpace: 'nowrap' }}>{tr('វដ្តទូទាត់', 'Billing Cycle')}</th>
                      <th style={{ whiteSpace: 'nowrap' }}>{tr('ស្ថានភាព', 'Status')}</th>
                      <th style={{ whiteSpace: 'nowrap' }}>{tr('ថ្ងៃផុតកំណត់', 'Expires At')}</th>
                      <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{tr('សកម្មភាព', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSubscriptions.map((s, idx) => (
                      <tr
                        key={s.id}
                      >
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
                          {(subsPage - 1) * subsLimit + idx + 1}
                        </td>
                        <td style={{ minWidth: 160 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {s.companyName || `Company #${s.id}`}
                          </span>
                        </td>
                        <td>
                          {(s.subdomain || s.tenant?.slug) ? (
                            <a
                              href={getTenantWorkspaceBaseUrl(s.subdomain || s.tenant?.slug) + '/auth'}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
                            >
                              {getTenantWorkspaceBaseUrl(s.subdomain || s.tenant?.slug).replace(/^https?:\/\//, '')}
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td>
                          <div style={{ color: 'var(--text-primary)', fontSize: 12.5 }}>
                            {s.user?.email || (s.subdomain === 'main' ? 'sambath@mainexpress.com' : s.subdomain === 'speedpost' ? 'vicheka@speedpost.com' : s.subdomain === 'angkor' ? 'dara@angkorexpress.com' : `admin@${s.subdomain}.com`)}
                          </div>
                        </td>
                        <td>
                          <div style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>
                            {s.user?.phone || '-'}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 13.5 }}>
                            {s.plan?.name || `Plan #${s.planId}`}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            color: s.billingCycle === 'yearly' ? '#059669' : '#475569',
                            fontWeight: s.billingCycle === 'yearly' ? 600 : 500,
                            fontSize: 13,
                          }}>
                            {s.billingCycle === 'yearly' ? tr('ប្រចាំឆ្នាំ', 'Yearly') : tr('ប្រចាំខែ', 'Monthly')}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge badge-${s.status === 'active' ? 'active' : s.status === 'trialing' ? 'standard' : s.status === 'past_due' ? 'warning' : 'inactive'}`}
                            style={{ textTransform: 'uppercase', fontSize: 11 }}
                          >
                            ● {s.status}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                          {formatDate(s.currentPeriodEnd)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => handleOpenEditTenantModal(s)}
                              title={tr('កែប្រែព័ត៌មានក្រុមហ៊ុន', 'Edit Company')}
                              style={{ color: '#0284c7' }}
                            >
                              <FaRegEdit size={13} />
                            </button>
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => handleOpenRenewModal(s)}
                              title={tr('បន្តសុពលភាពក្រុមហ៊ុន', 'Extend Validity / Renew')}
                              style={{ color: '#2563eb' }}
                            >
                              <MdAutorenew size={16} />
                            </button>
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => handleOpenDomainModal(s)}
                              title={tr('គ្រប់គ្រង Domains', 'Manage Domains')}
                            >
                              <MdLanguage size={16} />
                            </button>
                            {(s.subdomain || s.tenant?.slug) && (
                              <a
                                href={getTenantWorkspaceBaseUrl(s.subdomain || s.tenant?.slug) + '/auth'}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-ghost btn-icon btn-sm"
                                title={tr('បើក Workspace', 'Open Workspace')}
                              >
                                <MdOpenInNew size={16} />
                              </a>
                            )}
                            {s.status === 'cancelled' || s.tenant?.status === 'suspended' ? (
                              <button
                                className="btn btn-ghost btn-icon btn-sm"
                                style={{ color: '#16a34a' }}
                                onClick={() => handleDeleteTenant(s.tenantId || s.tenant?.id || s.id, s.companyName || `Tenant #${s.id}`, true)}
                                title={tr('បើកដំណើរការក្រុមហ៊ុនឡើងវិញ (Reactivate)', 'Reactivate Tenant')}
                              >
                                <MdCheck size={16} />
                              </button>
                            ) : (
                              <button
                                className="btn btn-ghost btn-icon btn-sm"
                                style={{ color: 'var(--danger)' }}
                                onClick={() => handleDeleteTenant(s.tenantId || s.tenant?.id || s.id, s.companyName || `Tenant #${s.id}`, false)}
                                title={tr('ផ្អាកដំណើរការក្រុមហ៊ុន (Suspend)', 'Suspend Tenant')}
                              >
                                <FaTrashAlt size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tab 2 Pagination */}
              <Pagination
                currentPage={subsPage}
                totalItems={filteredSubscriptions.length}
                pageSize={subsLimit}
                onPageChange={(page) => setSubsPage(page)}
                onPageSizeChange={(size) => {
                  setSubsLimit(size);
                  setSubsPage(1);
                }}
              />
            </div>
          )}

          {/* TAB 2.5: CREATE TENANT WORKSPACE VIEW */}
          {activeMenu === 'create-tenant' && (
            <div>
              {createdCredentials ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px 30px' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 16px' }}>
                    ✓
                  </div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
                    {tr('បានបង្កើតក្រុមហ៊ុន & គណនីជោគជ័យ!', 'Company & Account Created Successfully!')}
                  </h2>
                  <p style={{ fontSize: 13.5, color: '#64748b', margin: '0 0 24px' }}>
                    {tr('ព័ត៌មាន Workspace និងគណនី Admin ត្រូវបានរៀបចំរួចរាល់។ សូមចម្លងព័ត៌មានខាងក្រោមផ្ញើជូនភ្ញៀវ៖', 'Workspace and Admin credentials are ready. Copy the information below to share with the client:')}
                  </p>

                  <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 12, padding: '20px', textAlign: 'left', marginBottom: 24, fontSize: 14, lineHeight: 2, maxWidth: 640, margin: '0 auto 24px' }}>
                    <div>🏢 <strong>{tr('ក្រុមហ៊ុន៖', 'Company:')}</strong> <span style={{ color: '#0f172a', fontWeight: 700, marginLeft: 6 }}>{createdCredentials.companyName}</span></div>
                    <div>🌐 <strong>{tr('តំណភ្ជាប់ Workspace:', 'Workspace URL:')}</strong> <a href={`${createdCredentials.url}/auth`} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none', marginLeft: 6 }}>{createdCredentials.url}/auth</a></div>
                    <div>👤 <strong>{tr('Email Login:', 'Login Email:')}</strong> <span style={{ color: '#0f172a', fontWeight: 700, marginLeft: 6 }}>{createdCredentials.email}</span></div>
                    <div>🔑 <strong>{tr('Password:', 'Password:')}</strong> <span style={{ color: '#16a34a', fontWeight: 800, background: '#dcfce7', padding: '2px 8px', borderRadius: 6, marginLeft: 6 }}>{createdCredentials.password}</span></div>
                    <div>🏷️ <strong>{tr('កញ្ចប់សេវា៖', 'Plan Tier:')}</strong> <span style={{ fontWeight: 700, color: '#4f46e5', marginLeft: 6 }}>{createdCredentials.planName}</span></div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={handleCopyCredentials}
                      className="btn btn-primary"
                    >
                      {copied ? <MdCheck size={16} /> : <MdContentCopy size={16} />}
                      <span>{copied ? tr('បានចម្លងរួចរាល់!', 'Copied Successfully!') : tr('ចម្លងព័ត៌មានផ្ញើឱ្យភ្ញៀវ', 'Copy Credentials')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCreatedCredentials(null);
                        setActiveMenu('tenants');
                      }}
                      className="btn btn-outline"
                    >
                      {tr('បញ្ចប់ & ទៅបញ្ជីក្រុមហ៊ុន', 'Done & Back to List')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">{tr('បង្កើតក្រុមហ៊ុន និង Workspace ថ្មី', 'Create New Company & Workspace')}</span>
                  </div>

                  <div className="card-body">
                    <form onSubmit={handleCreateCompanySubmit} autoComplete="off" noValidate>
                      {/* SECTION 1: Company & Workspace */}
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center' }}>
                        {tr('១. ព័ត៌មានក្រុមហ៊ុន និង Workspace', '1. Company & Workspace Details')}
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">
                            {tr('ឈ្មោះក្រុមហ៊ុន', 'Company Name')} <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder={tr('ឧ. Angkor Express Delivery', 'e.g. Angkor Express Delivery')}
                            value={companyForm.companyName}
                            onChange={handleCompanyNameChange}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">
                            {tr('ឈ្មោះ Subdomain សម្រាប់ Workspace', 'Workspace Subdomain')} <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <div style={{ display: 'flex' }}>
                            <input
                              type="text"
                              className="form-control"
                              style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                              placeholder="angkor"
                              value={companyForm.subdomain}
                              onChange={(e) => setCompanyForm({ ...companyForm, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                            />
                            <span
                              suppressHydrationWarning
                              style={{
                                padding: '0 12px',
                                background: '#f8fafc',
                                border: '1.5px solid var(--border)',
                                borderLeft: 'none',
                                borderTopRightRadius: 'var(--radius)',
                                borderBottomRightRadius: 'var(--radius)',
                                display: 'flex',
                                alignItems: 'center',
                                color: 'var(--text-secondary)',
                                fontSize: 12.5,
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {typeof window !== 'undefined' && window.location.host.includes('localhost') ? '.localhost:3000' : '.ebsexpress.com'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">
                            {tr('កញ្ចប់គម្រោងតម្លៃ', 'Subscription Plan')}
                          </label>
                          <select
                            className="form-control"
                            value={companyForm.planId}
                            onChange={(e) => setCompanyForm({ ...companyForm, planId: Number(e.target.value) })}
                          >
                            {plans.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} — ${Number(p.priceMonthly).toFixed(2)} / {tr('ខែ', 'month')}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">
                            {tr('វដ្តទូទាត់ប្រាក់', 'Billing Cycle')}
                          </label>
                          <select
                            className="form-control"
                            value={companyForm.billingCycle}
                            onChange={(e) => setCompanyForm({ ...companyForm, billingCycle: e.target.value as any })}
                          >
                            <option value="monthly">{tr('ទូទាត់ប្រចាំខែ', 'Monthly Billing')}</option>
                            <option value="yearly">{tr('ទូទាត់ប្រចាំឆ្នាំ', 'Yearly Billing')}</option>
                          </select>
                        </div>
                      </div>

                      {/* SECTION 2: Master Admin Credentials */}
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', margin: '20px 0 14px', display: 'flex', alignItems: 'center' }}>
                        {tr('២. គណនី Admin ដំបូងសម្រាប់ក្រុមហ៊ុន', '2. Primary Company Admin Account')}
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">
                            {tr('ឈ្មោះអ្នកគ្រប់គ្រង', 'Admin Full Name')} <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder={tr('ឧ. Sok Dara', 'e.g. Sok Dara')}
                            value={companyForm.adminName}
                            onChange={(e) => setCompanyForm({ ...companyForm, adminName: e.target.value })}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">
                            {tr('លេខទូរស័ព្ទ', 'Phone Number')} <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="012 345 678"
                            value={companyForm.phone}
                            onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">
                            {tr('អ៊ីមែលសម្រាប់ Login', 'Login Email')} <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="email"
                            name="new_tenant_admin_email"
                            id="new_tenant_admin_email"
                            autoComplete="off"
                            className="form-control"
                            placeholder="client@delivery.com"
                            value={companyForm.email}
                            onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">
                            {tr('ពាក្យសម្ងាត់', 'Password')} <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="password"
                            name="new_tenant_admin_password"
                            id="new_tenant_admin_password"
                            autoComplete="new-password"
                            className="form-control"
                            placeholder={tr('បញ្ចូលពាក្យសម្ងាត់...', 'Enter password...')}
                            value={companyForm.password}
                            onChange={(e) => setCompanyForm({ ...companyForm, password: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                        <button
                          type="button"
                          className="btn btn-cancel"
                          style={{ background: '#dc2626', color: '#ffffff', border: '1px solid #dc2626', fontWeight: 700 }}
                          onClick={() => setActiveMenu('tenants')}
                        >
                          {tr('បោះបង់', 'Cancel')}
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={creatingCompany}
                          style={{ background: '#2563eb', color: '#ffffff', border: '1px solid #2563eb', fontWeight: 700 }}
                        >
                          {creatingCompany ? tr('កំពុងរក្សាទុក...', 'Saving...') : tr('រក្សាទុក', 'Save')}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: BILLING INVOICES */}
          {activeMenu === 'invoices' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <span className="card-title">{tr('ប្រវត្តិវិក្កយបត្រ & ការទូទាត់ទាំងអស់', 'All Invoices & Payments')}</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {/* Search Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 12px', width: 230, height: 38 }}>
                    <MdSearch size={17} color="var(--text-muted)" />
                    <input
                      type="text"
                      placeholder={tr('ស្វែងរកវិក្កយបត្រ / ក្រុមហ៊ុន...', 'Search Invoice / Company...')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', paddingLeft: 6, fontSize: 13, width: '100%' }}
                    />
                  </div>

                  {/* Status Filter */}
                  <select
                    value={invoiceStatusFilter}
                    onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                    className="form-control"
                    style={{ width: 'auto', padding: '6px 12px', fontSize: 13, height: 38, borderRadius: 'var(--radius)', borderColor: 'var(--border)' }}
                  >
                    <option value="all">{tr('ស្ថានភាពទាំងអស់', 'All Statuses')}</option>
                    <option value="paid">{tr('បង់រួច', 'Paid')}</option>
                    <option value="pending">{tr('មិនទាន់បង់', 'Pending')}</option>
                    <option value="void">{tr('ទុកជាមោឃៈ', 'Void')}</option>
                  </select>

                  {/* Action Button */}
                  <button
                    type="button"
                    onClick={handleOpenCreateInvoice}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 16px', fontWeight: 700 }}
                  >
                    <FiPlusCircle size={15} />
                    <span>{tr('ចេញវិក្កយបត្រថ្មី', 'Issue Invoice')}</span>
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                <table className="saas-custom-table" style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#2f55a5', color: '#ffffff' }}>
                      <th style={{ width: 44, textAlign: 'center', whiteSpace: 'nowrap' }}>{tr('ល.រ', 'No.')}</th>
                      <th style={{ whiteSpace: 'nowrap' }}>{tr('លេខវិក្កយបត្រ', 'Invoice No.')}</th>
                      <th style={{ whiteSpace: 'nowrap' }}>{tr('ឈ្មោះក្រុមហ៊ុន', 'Company Name')}</th>
                      <th style={{ whiteSpace: 'nowrap' }}>{tr('អ៊ីមែល', 'Email')}</th>
                      <th style={{ whiteSpace: 'nowrap' }}>{tr('កាលបរិច្ឆេទបង្កើត', 'Created Date')}</th>
                      <th style={{ whiteSpace: 'nowrap' }}>{tr('ថ្ងៃផុតកំណត់', 'Due Date')}</th>
                      <th style={{ whiteSpace: 'nowrap' }}>{tr('តម្លៃដើម', 'Subtotal')}</th>
                      <th style={{ whiteSpace: 'nowrap' }}>{tr('បញ្ចុះតម្លៃ', 'Discount')}</th>
                      <th style={{ whiteSpace: 'nowrap' }}>{tr('ទឹកប្រាក់សរុប', 'Total Amount')}</th>
                      <th style={{ whiteSpace: 'nowrap' }}>{tr('ស្ថានភាព', 'Status')}</th>
                      <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{tr('សកម្មភាព', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allInvoices.filter((inv) => {
                      const matchStatus = invoiceStatusFilter === 'all' || inv.status === invoiceStatusFilter;
                      const term = searchQuery.toLowerCase();
                      const matchSearch = !searchQuery || 
                        inv.invoiceNumber?.toLowerCase().includes(term) ||
                        inv.subscription?.companyName?.toLowerCase().includes(term) ||
                        inv.user?.email?.toLowerCase().includes(term);
                      return matchStatus && matchSearch;
                    }).length === 0 ? (
                      <tr>
                        <td colSpan={11} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                          {tr('មិនមានទិន្នន័យវិក្កយបត្រត្រូវបង្ហាញទេ', 'No invoices found')}
                        </td>
                      </tr>
                    ) : (
                      allInvoices
                        .filter((inv) => {
                          const matchStatus = invoiceStatusFilter === 'all' || inv.status === invoiceStatusFilter;
                          const term = searchQuery.toLowerCase();
                          const matchSearch = !searchQuery || 
                            inv.invoiceNumber?.toLowerCase().includes(term) ||
                            inv.subscription?.companyName?.toLowerCase().includes(term) ||
                            inv.user?.email?.toLowerCase().includes(term);
                          return matchStatus && matchSearch;
                        })
                        .slice((invoicesPage - 1) * invoicesLimit, invoicesPage * invoicesLimit)
                        .map((inv, idx) => (
                          <tr key={inv.id}>
                            <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
                              {(invoicesPage - 1) * invoicesLimit + idx + 1}
                            </td>
                            <td style={{ fontWeight: 800, color: 'var(--accent)', fontFamily: 'monospace' }}>
                              {inv.invoiceNumber}
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {inv.subscription?.companyName || `Company #${inv.subscriptionId || '-'}`}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                                {inv.user?.email || '-'}
                              </span>
                            </td>
                            <td style={{ color: 'var(--text-secondary)' }}>
                              {formatDate(inv.createdAt)}
                            </td>
                            <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                              {formatDate(inv.dueDate || inv.subscription?.currentPeriodEnd)}
                            </td>
                            <td style={{ color: 'var(--text-secondary)' }}>
                              ${Number(inv.subtotal).toFixed(2)}
                            </td>
                            <td style={{ color: 'var(--success)', fontWeight: 700 }}>
                              -${Number(inv.discountAmount).toFixed(2)}
                            </td>
                            <td style={{ fontWeight: 900, color: 'var(--text-primary)' }}>
                              ${Number(inv.totalAmount).toFixed(2)}
                            </td>
                            <td>
                              <span
                                className={`badge badge-${inv.status === 'paid' ? 'active' : inv.status === 'pending' ? 'warning' : 'inactive'}`}
                                style={{ textTransform: 'uppercase', fontSize: 11 }}
                              >
                                ● {inv.status === 'paid' ? tr('បង់រួច', 'PAID') : inv.status}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                                {inv.status !== 'paid' && (
                                  <button
                                    onClick={() => handleMarkInvoicePaid(inv.id)}
                                    className="btn btn-primary btn-sm"
                                    style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 10px' }}
                                  >
                                    ✓ {tr('កំណត់ជា «បង់រួច»', 'Mark Paid')}
                                  </button>
                                )}
                                <button
                                  onClick={() => printInvoicePdf(inv)}
                                  className="btn btn-ghost btn-sm"
                                  style={{ fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  title={tr('បោះពុម្ព / ទាញយកជា PDF', 'Print / Download PDF')}
                                >
                                  <MdDownload size={14} /> PDF
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={invoicesPage}
                totalItems={allInvoices.filter((inv) => {
                  const matchStatus = invoiceStatusFilter === 'all' || inv.status === invoiceStatusFilter;
                  const term = searchQuery.toLowerCase();
                  const matchSearch = !searchQuery || 
                    inv.invoiceNumber?.toLowerCase().includes(term) ||
                    inv.subscription?.companyName?.toLowerCase().includes(term) ||
                    inv.user?.email?.toLowerCase().includes(term);
                  return matchStatus && matchSearch;
                }).length}
                pageSize={invoicesLimit}
                onPageChange={(page) => setInvoicesPage(page)}
                onPageSizeChange={(size) => {
                  setInvoicesLimit(size);
                  setInvoicesPage(1);
                }}
              />
            </div>
          )}

          {/* TAB: CREATE / ISSUE INVOICE DEDICATED PAGE */}
          {activeMenu === 'create-invoice' && (
            <div className="card" style={{ width: '100%' }}>
              <div className="card-header">
                <span className="card-title">{tr('ចេញវិក្កយបត្រជូនក្រុមហ៊ុន (បង់តាមក្រោយ)', 'Issue Invoice to Tenant (Pay Later)')}</span>
              </div>

              <div className="card-body" style={{ padding: '24px 28px' }}>
                <form onSubmit={handleCreateInvoiceSubmit}>
                  {/* 1. Select Tenant Company */}
                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label">
                      {tr('ជ្រើសរើសក្រុមហ៊ុនជាវសេវា', 'Select Tenant Company')} <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <select
                      required
                      value={invoiceForm.subscriptionId}
                      onChange={(e) => {
                        const subId = Number(e.target.value);
                        const sub = subscriptions.find((s) => s.id === subId);
                        const cycle = (sub?.billingCycle as 'yearly' | 'monthly') || 'monthly';
                        const planId = sub?.planId || sub?.plan?.id || plans[0]?.id || 1;
                        const pl = plans.find((p) => p.id === planId) || sub?.plan || plans[0];
                        const price = cycle === 'yearly' ? Number(pl?.priceYearly || 0) : Number(pl?.priceMonthly || 0);

                        setInvoiceForm({
                          ...invoiceForm,
                          subscriptionId: subId,
                          planId: pl?.id || planId,
                          billingCycle: cycle,
                          subtotal: price,
                        });
                      }}
                      className="form-control"
                    >
                      {subscriptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.companyName || `Company #${s.id}`} ({s.subdomain || 'app'}.ebsexpress.com)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Plan & Billing Cycle */}
                  <div className="form-row" style={{ marginBottom: 16 }}>
                    <div className="form-group" style={{ flex: 1.2 }}>
                      <label className="form-label">
                        {tr('កញ្ចប់សេវា', 'Plan Tier')} <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <select
                        value={invoiceForm.planId}
                        onChange={(e) => {
                          const pId = Number(e.target.value);
                          const pl = plans.find((p) => p.id === pId) || plans[0];
                          const price = invoiceForm.billingCycle === 'yearly' ? Number(pl?.priceYearly || 0) : Number(pl?.priceMonthly || 0);
                          setInvoiceForm({ ...invoiceForm, planId: pId, subtotal: price });
                        }}
                        className="form-control"
                      >
                        {plans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (${Number(p.priceMonthly).toFixed(2)}/mo, ${Number(p.priceYearly).toFixed(2)}/yr)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">
                        {tr('វដ្តគិតប្រាក់', 'Billing Cycle')}
                      </label>
                      <select
                        value={invoiceForm.billingCycle}
                        onChange={(e) => {
                          const cycle = e.target.value as 'yearly' | 'monthly';
                          const pl = plans.find((p) => p.id === Number(invoiceForm.planId)) || plans[0];
                          const price = cycle === 'yearly' ? Number(pl?.priceYearly || 0) : Number(pl?.priceMonthly || 0);

                          const d = new Date();
                          if (cycle === 'yearly') {
                            d.setFullYear(d.getFullYear() + 1);
                          } else {
                            d.setMonth(d.getMonth() + 1);
                          }

                          setInvoiceForm({
                            ...invoiceForm,
                            billingCycle: cycle,
                            subtotal: price,
                            dueDate: formatLocalDateStr(d),
                          });
                        }}
                        className="form-control"
                      >
                        <option value="yearly">{tr('ប្រចាំឆ្នាំ', 'Yearly')}</option>
                        <option value="monthly">{tr('ប្រចាំខែ', 'Monthly')}</option>
                      </select>
                    </div>
                  </div>

                  {/* 3. Subtotal & Discount */}
                  <div className="form-row" style={{ marginBottom: 16 }}>
                    <div className="form-group">
                      <label className="form-label">
                        {tr('តម្លៃដើម ($)', 'Subtotal Amount ($)')} <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        step="0.01"
                        className="form-control"
                        value={invoiceForm.subtotal}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, subtotal: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        {tr('ទឹកប្រាក់បញ្ចុះតម្លៃ ($)', 'Discount Amount ($)')}
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="form-control"
                        value={invoiceForm.discountAmount}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, discountAmount: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  {/* 4. Due Date & Status */}
                  <div className="form-row" style={{ marginBottom: 20 }}>
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <label className="form-label" style={{ margin: 0 }}>
                          {tr('ថ្ងៃផុតកំណត់', 'Due Date')}
                        </label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => handleAddPeriodToDueDate(1, 'year')}
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11, padding: '3px 10px', height: 'auto', background: '#eff6ff', color: '#1d4ed8', fontWeight: 800, borderRadius: 6, border: '1px solid #bfdbfe' }}
                          >
                            +1 ឆ្នាំ
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddPeriodToDueDate(1, 'month')}
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11, padding: '3px 10px', height: 'auto', background: '#eff6ff', color: '#1d4ed8', fontWeight: 800, borderRadius: 6, border: '1px solid #bfdbfe' }}
                          >
                            +1 ខែ
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddPeriodToDueDate(7, 'day')}
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11, padding: '3px 10px', height: 'auto', background: '#eff6ff', color: '#1d4ed8', fontWeight: 800, borderRadius: 6, border: '1px solid #bfdbfe' }}
                          >
                            +7 ថ្ងៃ
                          </button>
                        </div>
                      </div>
                      <DateInput
                        value={invoiceForm.dueDate}
                        onChange={(val) => setInvoiceForm({ ...invoiceForm, dueDate: val })}
                        inputStyle={{ width: '100%', height: 42 }}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        {tr('ស្ថានភាពដំបូង', 'Initial Status')}
                      </label>
                      <select
                        value={invoiceForm.status}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, status: e.target.value as any })}
                        className="form-control"
                        style={{ fontWeight: 700 }}
                      >
                        <option value="pending">{tr('មិនទាន់បង់', 'Pending')}</option>
                        <option value="paid">{tr('បង់រួច', 'Paid')}</option>
                      </select>
                    </div>
                  </div>

                  {/* 5. Total Due Banner */}
                  <div
                    style={{
                      background: '#f8fafc',
                      borderRadius: 14,
                      padding: '16px 20px',
                      border: '1.5px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 24,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, color: '#64748b', fontWeight: 700 }}>
                        {tr('ទឹកប្រាក់សរុបដែលក្រុមហ៊ុនត្រូវទូទាត់:', 'Total Amount Due:')}
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                        {tr('ក្រុមហ៊ុននឹងឃើញវិក្កយបត្រនេះក្នុងទំព័រ Billing ដើម្បីបង់ប្រាក់តាមក្រោយ។', 'Client can pay via Bakong KHQR or Bank Transfer.')}
                      </div>
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: '#2563eb' }}>
                      ${Math.max(0, Number(invoiceForm.subtotal) - Number(invoiceForm.discountAmount)).toFixed(2)} USD
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => setActiveMenu('invoices')}
                      className="btn btn-cancel"
                      style={{ background: '#dc2626', color: '#ffffff', border: '1px solid #dc2626', fontWeight: 700 }}
                    >
                      {tr('បោះបង់', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={creatingInvoice}
                      className="btn btn-primary"
                      style={{ padding: '10px 24px', fontWeight: 700, background: '#2563eb', color: '#ffffff', border: '1px solid #2563eb' }}
                    >
                      {creatingInvoice ? tr('កំពុងរក្សាទុក...', 'Saving...') : tr('រក្សាទុក', 'Save')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: SAAS PLATFORM ADMINS */}
          {activeMenu === 'users' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <span className="card-title">{tr('បញ្ជីគណនី SaaS Platform Admins', 'SaaS Platform Admins')}</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <select
                    value={adminRoleFilter}
                    onChange={(e) => setAdminRoleFilter(e.target.value)}
                    className="form-control"
                    style={{ width: 'auto', padding: '5px 10px', fontSize: 12.5, height: 34 }}
                  >
                    <option value="all">{tr('តួនាទីទាំងអស់', 'All Roles')}</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="finance_admin">{tr('Finance Admin', 'Finance Admin')}</option>
                    <option value="support_admin">{tr('Support Admin', 'Support Admin')}</option>
                  </select>

                  <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '5px 10px', width: 200 }}>
                    <MdSearch size={16} color="var(--text-muted)" />
                    <input
                      type="text"
                      placeholder={tr('ស្វែងរក Admin...', 'Search Admin...')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', paddingLeft: 6, fontSize: 12.5, width: '100%' }}
                    />
                  </div>

                  <Link
                    href="/admin/saas/users/create"
                    className="btn btn-primary btn-sm"
                  >
                    <FiPlusCircle size={14} />
                    <span>{tr('បង្កើត SaaS Admin ថ្មី', 'Add SaaS Admin')}</span>
                  </Link>
                </div>
              </div>

              <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                <table className="saas-custom-table" style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#2f55a5', color: '#ffffff' }}>
                      <th style={{ width: 44, textAlign: 'center', whiteSpace: 'nowrap' }}>{tr('ល.រ', 'No.')}</th>
                      <th>{tr('ឈ្មោះ', 'Name')}</th>
                      <th>{tr('Email សម្រាប់ Login', 'Login Email')}</th>
                      <th>{tr('លេខទូរស័ព្ទ', 'Phone')}</th>
                      <th>{tr('តួនាទី', 'Role')}</th>
                      <th>{tr('ស្ថានភាព', 'Status')}</th>
                      <th style={{ textAlign: 'right' }}>{tr('កាលបរិច្ឆេទបង្កើត', 'Created At')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAdmins.map((a, idx) => (
                      <tr key={a.id}>
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
                          {(adminsPage - 1) * adminsLimit + idx + 1}
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {a.name}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-primary)' }}>
                          {a.email}
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {a.phone || '-'}
                        </td>
                        <td>
                          <span className="badge badge-admin" style={{ textTransform: 'uppercase', fontSize: 11 }}>
                            {a.role}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${a.isActive !== false ? 'active' : 'inactive'}`} style={{ fontSize: 11 }}>
                            ● {a.isActive !== false ? tr('សកម្ម', 'Active') : tr('បិទ', 'Disabled')}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <Link
                              href={`/admin/saas/users/edit/${a.id}`}
                              className="btn btn-ghost btn-icon btn-sm"
                              title={tr('កែប្រែ SaaS Admin', 'Edit SaaS Admin')}
                            >
                              <FaRegEdit size={14} />
                            </Link>
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => handleDeleteAdmin(a.id, a.name)}
                              title={tr('លុប SaaS Admin', 'Delete SaaS Admin')}
                            >
                              <FaTrashAlt size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tab 3 Pagination */}
              <Pagination
                currentPage={adminsPage}
                totalItems={filteredAdmins.length}
                pageSize={adminsLimit}
                onPageChange={(page) => setAdminsPage(page)}
                onPageSizeChange={(size) => {
                  setAdminsLimit(size);
                  setAdminsPage(1);
                }}
              />
            </div>
          )}

          {/* TAB 4: SUBSCRIPTION PLANS */}
          {activeMenu === 'plans' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <span className="card-title">{tr('បញ្ជីកញ្ចប់សេវា', 'Subscription Plans')}</span>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '5px 10px', width: 220 }}>
                    <MdSearch size={16} color="var(--text-muted)" />
                    <input
                      type="text"
                      placeholder={tr('ស្វែងរក Plan...', 'Search Plan...')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', paddingLeft: 6, fontSize: 12.5, width: '100%' }}
                    />
                  </div>

                  <Link
                    href="/admin/saas/plans/create"
                    className="btn btn-primary btn-sm"
                  >
                    <FiPlusCircle size={14} />
                    <span>{tr('បង្កើតកញ្ចប់ Plan ថ្មី', 'Add New Plan')}</span>
                  </Link>
                </div>
              </div>

              <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                <table className="saas-custom-table" style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#2f55a5', color: '#ffffff' }}>
                      <th style={{ width: 44, textAlign: 'center', whiteSpace: 'nowrap' }}>{tr('ល.រ', 'No.')}</th>
                      <th>{tr('ឈ្មោះកញ្ចប់សេវា', 'Plan Name')}</th>
                      <th>Slug</th>
                      <th>{tr('តម្លៃប្រចាំខែ', 'Monthly Price')}</th>
                      <th>{tr('តម្លៃប្រចាំឆ្នាំ', 'Yearly Price')}</th>
                      <th>Drivers</th>
                      <th>Merchants</th>
                      <th>Parcels/ខែ</th>
                      <th>យានយន្ត</th>
                      <th>{tr('ស្ថានភាព', 'Status')}</th>
                      <th style={{ textAlign: 'right' }}>{tr('សកម្មភាព', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPlans.map((p, idx) => (
                      <tr key={p.id}>
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
                          {(plansPage - 1) * plansLimit + idx + 1}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {p.name}
                            </span>
                            {p.isPopular && (
                              <span className="badge badge-warning" style={{ fontSize: 10 }}>
                                ★ Popular
                              </span>
                            )}
                          </div>
                          {p.description && (
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                              {p.description}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-standard" style={{ textTransform: 'uppercase', fontSize: 11 }}>
                            {p.slug}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--accent)' }}>
                          ${Number(p.priceMonthly).toFixed(2)}
                        </td>
                        <td style={{ fontWeight: 600, color: '#059669' }}>
                          ${Number(p.priceYearly).toFixed(2)}
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {p.maxDrivers || 10}
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {p.maxMerchants || 50}
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {p.maxOrdersPerMonth || 1000}
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {p.maxVehicles || 10}
                        </td>
                        <td>
                          <span className={`badge badge-${p.isActive !== false ? 'active' : 'inactive'}`} style={{ fontSize: 11 }}>
                            ● {p.isActive !== false ? tr('សកម្ម', 'Active') : tr('បិទ', 'Disabled')}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <Link
                              href={`/admin/saas/plans/edit/${p.id}`}
                              className="btn btn-ghost btn-icon btn-sm"
                              title={tr('កែប្រែ Plan', 'Edit Plan')}
                            >
                              <FaRegEdit size={14} />
                            </Link>
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => handleDeletePlan(p.id, p.name)}
                              title={tr('លុប Plan', 'Delete Plan')}
                            >
                              <FaTrashAlt size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tab 4 Pagination */}
              <Pagination
                currentPage={plansPage}
                totalItems={filteredPlans.length}
                pageSize={plansLimit}
                onPageChange={(page) => setPlansPage(page)}
                onPageSizeChange={(size) => {
                  setPlansLimit(size);
                  setPlansPage(1);
                }}
              />
            </div>
          )}

          {/* TAB 5: COUPONS */}
          {activeMenu === 'coupons' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <span className="card-title">{tr('គូប៉ុងបញ្ចុះតម្លៃ Promo Coupons', 'Promo Coupons & Discounts')}</span>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '5px 10px', width: 220 }}>
                    <MdSearch size={16} color="var(--text-muted)" />
                    <input
                      type="text"
                      placeholder={tr('ស្វែងរក Coupon...', 'Search Coupon...')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', paddingLeft: 6, fontSize: 12.5, width: '100%' }}
                    />
                  </div>

                  <Link
                    href="/admin/saas/coupons/create"
                    className="btn btn-primary btn-sm"
                  >
                    <FiPlusCircle size={14} />
                    <span>{tr('បង្កើត Coupon ថ្មី', 'Add Coupon')}</span>
                  </Link>
                </div>
              </div>

              <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                <table className="saas-custom-table" style={{ width: '100%', minWidth: 750, borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#2f55a5', color: '#ffffff' }}>
                      <th style={{ width: 44, textAlign: 'center', whiteSpace: 'nowrap' }}>{tr('ល.រ', 'No.')}</th>
                      <th>Coupon Code</th>
                      <th>{tr('ប្រភេទបញ្ចុះតម្លៃ', 'Discount Type')}</th>
                      <th>{tr('តម្លៃបញ្ចុះ', 'Discount Value')}</th>
                      <th>{tr('ចំនួនប្រើប្រាស់', 'Usage / Limit')}</th>
                      <th>{tr('ស្ថានភាព', 'Status')}</th>
                      <th style={{ textAlign: 'right' }}>{tr('សកម្មភាព', 'Action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCoupons.map((c, idx) => (
                      <tr key={c.id}>
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
                          {(couponsPage - 1) * couponsLimit + idx + 1}
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                            {c.code}
                          </span>
                        </td>
                        <td style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                          {c.discountType === 'percentage' ? tr('ភាគរយ (%)', 'Percentage (%)') : tr('ចំនួនថេរ ($)', 'Fixed ($)')}
                        </td>
                        <td style={{ fontWeight: 600, color: '#059669' }}>
                          {c.discountType === 'percentage' ? `${c.discountValue}%` : `$${Number(c.discountValue).toFixed(2)}`}
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>
                          {c.usageCount || 0} / {c.usageLimit || '∞'}
                        </td>
                        <td>
                          <span className={`badge badge-${c.isActive !== false ? 'active' : 'inactive'}`} style={{ fontSize: 11 }}>
                            ● {c.isActive !== false ? tr('សកម្ម', 'Active') : tr('អសកម្ម', 'Inactive')}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <Link
                              href={`/admin/saas/coupons/edit/${c.id}`}
                              className="btn btn-ghost btn-icon btn-sm"
                              title={tr('កែប្រែ Coupon', 'Edit Coupon')}
                            >
                              <FaRegEdit size={14} />
                            </Link>
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => handleDeleteCoupon(c.id, c.code)}
                              title={tr('លុប Coupon', 'Delete Coupon')}
                            >
                              <FaTrashAlt size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tab 5 Pagination */}
              <Pagination
                currentPage={couponsPage}
                totalItems={filteredCoupons.length}
                pageSize={couponsLimit}
                onPageChange={(page) => setCouponsPage(page)}
                onPageSizeChange={(size) => {
                  setCouponsLimit(size);
                  setCouponsPage(1);
                }}
              />
            </div>
          )}

          {/* TAB 6: PARTNERS & COMMISSIONS */}
          {activeMenu === 'partners' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <span className="card-title">
                  {partnerSubTab === 'partners' ? tr('បញ្ជីដៃគូសហការ', 'Partners List') : tr('បញ្ជីកម្រៃជើងសារ', 'Commissions List')}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {/* Sub Tab Switcher */}
                  <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 3, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <button
                      type="button"
                      onClick={() => setPartnerSubTab('partners')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        border: 'none',
                        fontSize: 12.5,
                        fontWeight: partnerSubTab === 'partners' ? 800 : 600,
                        background: partnerSubTab === 'partners' ? '#ffffff' : 'transparent',
                        color: partnerSubTab === 'partners' ? '#1e3b75' : '#64748b',
                        boxShadow: partnerSubTab === 'partners' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      👥 {tr('បញ្ជីដៃគូសហការ', 'Partners')} ({partners.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPartnerSubTab('commissions')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        border: 'none',
                        fontSize: 12.5,
                        fontWeight: partnerSubTab === 'commissions' ? 800 : 600,
                        background: partnerSubTab === 'commissions' ? '#ffffff' : 'transparent',
                        color: partnerSubTab === 'commissions' ? '#1e3b75' : '#64748b',
                        boxShadow: partnerSubTab === 'commissions' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      💰 {tr('កម្រៃជើងសារ', 'Commissions')} ({commissions.length})
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '5px 10px', width: 200 }}>
                    <MdSearch size={16} color="var(--text-muted)" />
                    <input
                      type="text"
                      placeholder={tr('ស្វែងរក...', 'Search...')}
                      value={partnerSearch}
                      onChange={(e) => setPartnerSearch(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', paddingLeft: 6, fontSize: 12.5, width: '100%' }}
                    />
                  </div>

                  {partnerSubTab === 'partners' && (
                    <button
                      type="button"
                      onClick={openNewPartnerModal}
                      className="btn btn-primary btn-sm"
                    >
                      <FiPlusCircle size={14} />
                      <span>{tr('បង្កើតដៃគូថ្មី', 'Add Partner')}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* VIEW 1: PARTNERS LIST */}
              {partnerSubTab === 'partners' && (
                <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                  <table className="saas-custom-table" style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#2f55a5', color: '#ffffff' }}>
                        <th style={{ width: 44, textAlign: 'center', whiteSpace: 'nowrap' }}>{tr('ល.រ', 'No.')}</th>
                        <th>{tr('ឈ្មោះដៃគូ', 'Partner Name')}</th>
                        <th>{tr('Email', 'Email')}</th>
                        <th>{tr('លេខទូរស័ព្ទ', 'Phone')}</th>
                        <th>{tr('កូដណែនាំ', 'Referral Code')}</th>
                        <th>{tr('កម្រៃ', 'Commission Rate')}</th>
                        <th>{tr('គណនីធនាគារ', 'Payout Info')}</th>
                        <th>{tr('ស្ថានភាព', 'Status')}</th>
                        <th style={{ textAlign: 'right' }}>{tr('សកម្មភាព', 'Action')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPartners.map((p, idx) => (
                        <tr key={p.id}>
                          <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
                            {(partnersPage - 1) * partnersLimit + idx + 1}
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</div>
                          </td>
                          <td>
                            <div style={{ color: 'var(--text-primary)', fontSize: 12.5 }}>{p.email || '-'}</div>
                          </td>
                          <td>
                            <div style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>{p.phone || '-'}</div>
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-block',
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                fontSize: 12.5,
                                background: '#eff6ff',
                                color: '#2563eb',
                                padding: '3px 8px',
                                borderRadius: 6,
                                border: '1px solid #bfdbfe',
                              }}
                            >
                              {p.referralCode}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 800, color: '#059669', fontSize: 13 }}>
                              {Number(p.commissionRate || 15)}%
                            </span>
                          </td>
                          <td>
                            {p.bankAccountInfo?.accountNumber ? (
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e3b75' }}>
                                  {p.bankAccountInfo.bankName || 'Bank'}
                                </div>
                                <div style={{ fontSize: 11.5, color: '#64748b' }}>
                                  {p.bankAccountInfo.accountNumber} ({p.bankAccountInfo.accountName || p.name})
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>-</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge badge-${p.isActive !== false ? 'active' : 'inactive'}`} style={{ textTransform: 'uppercase', fontSize: 11 }}>
                              ● {p.isActive !== false ? tr('សកម្ម', 'Active') : tr('អសកម្ម', 'Inactive')}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                              <button
                                className="btn btn-ghost btn-icon btn-sm"
                                onClick={() => handleEditPartner(p)}
                                title={tr('កែប្រែដៃគូ', 'Edit Partner')}
                              >
                                <FaRegEdit size={14} />
                              </button>
                              <button
                                className="btn btn-ghost btn-icon btn-sm"
                                style={{ color: 'var(--danger)' }}
                                onClick={() => handleDeletePartner(p.id, p.name)}
                                title={tr('លុបដៃគូ', 'Delete Partner')}
                              >
                                <FaTrashAlt size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {filteredPartners.length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '48px 16px', color: '#64748b' }}>
                            <div style={{ fontSize: 36, marginBottom: 8 }}>🤝</div>
                            <div style={{ fontSize: 14.5, fontWeight: 700, color: '#334155' }}>
                              {tr('មិនមានទិន្នន័យដៃគូសហការ', 'No affiliate partners found')}
                            </div>
                            <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 4, marginBottom: 14 }}>
                              {tr('ចុចប៊ូតុងខាងក្រោមដើម្បីបង្កើតដៃគូសហការថ្មីដំបូង', 'Click the button below to register your first affiliate partner')}
                            </div>
                            <button
                              type="button"
                              onClick={openNewPartnerModal}
                              className="btn btn-primary btn-sm"
                            >
                              <FiPlusCircle size={14} />
                              <span>{tr('បង្កើតដៃគូថ្មី', 'Add Partner')}</span>
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {/* Partners Pagination */}
                  <Pagination
                    currentPage={partnersPage}
                    totalItems={filteredPartners.length}
                    pageSize={partnersLimit}
                    onPageChange={(page) => setPartnersPage(page)}
                    onPageSizeChange={(size) => {
                      setPartnersLimit(size);
                      setPartnersPage(1);
                    }}
                  />
                </div>
              )}

              {/* VIEW 2: COMMISSIONS LIST */}
              {partnerSubTab === 'commissions' && (
                <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                  <table className="saas-custom-table" style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#2f55a5', color: '#ffffff' }}>
                        <th style={{ width: 44, textAlign: 'center', whiteSpace: 'nowrap' }}>{tr('ល.រ', 'No.')}</th>
                        <th>Partner Name</th>
                        <th>{tr('ទឹកប្រាក់កម្រៃ', 'Commission Amount')}</th>
                        <th>{tr('ស្ថានភាព', 'Status')}</th>
                        <th style={{ textAlign: 'right' }}>{tr('សកម្មភាព', 'Action')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCommissions.map((c, idx) => (
                        <tr key={c.id}>
                          <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
                            {(commissionsPage - 1) * commissionsLimit + idx + 1}
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {c.partner?.name || `Partner #${c.partnerId || c.id}`}
                          </td>
                          <td style={{ fontWeight: 600, color: '#059669' }}>
                            +${Number(c.calculatedAmount || c.amount || 0).toFixed(2)}
                          </td>
                          <td>
                            <span className={`badge badge-${c.status === 'paid' ? 'active' : 'warning'}`} style={{ textTransform: 'uppercase', fontSize: 11 }}>
                              ● {c.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {c.status !== 'paid' && (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleApproveCommission(c.id, 'paid')}
                              >
                                {tr('ទូទាត់ប្រាក់ Payout', 'Payout')}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}

                      {filteredCommissions.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '48px 16px', color: '#64748b' }}>
                            <div style={{ fontSize: 36, marginBottom: 8 }}>🤝</div>
                            <div style={{ fontSize: 14.5, fontWeight: 700, color: '#334155' }}>
                              {tr('មិនមានទិន្នន័យកម្រៃជើងសារដៃគូសហការ', 'No affiliate commission records found')}
                            </div>
                            <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 4 }}>
                              {tr('ទិន្នន័យកម្រៃជើងសារនឹងបង្ហាញនៅពេលមានដៃគូណែនាំអតិថិជនថ្មីចូលមកក្នុងប្រព័ន្ធ', 'Commissions will appear here when affiliate partners refer new subscribers')}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {/* Commissions Pagination */}
                  <Pagination
                    currentPage={commissionsPage}
                    totalItems={filteredCommissions.length}
                    pageSize={commissionsLimit}
                    onPageChange={(page) => setCommissionsPage(page)}
                    onPageSizeChange={(size) => {
                      setCommissionsLimit(size);
                      setCommissionsPage(1);
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB: CREATE / EDIT AFFILIATE PARTNER DEDICATED PAGE */}
          {activeMenu === 'create-partner' && (
            <div className="card" style={{ width: '100%' }}>
              <div className="card-header">
                <span className="card-title">
                  {editingPartnerId ? tr('កែប្រែដៃគូសហការ', 'Edit Affiliate Partner') : tr('បង្កើតដៃគូសហការថ្មី', 'Add New Affiliate Partner')}
                </span>
              </div>

              <div className="card-body" style={{ padding: '24px 28px' }}>
                <form onSubmit={handlePartnerSubmit} autoComplete="off" noValidate>
                  {/* Section 1: Partner Basic Details */}
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center' }}>
                    {tr('១. ព័ត៌មានដៃគូសហការ', '1. Affiliate Partner Details')}
                  </div>

                  <div className="form-row" style={{ marginBottom: 16 }}>
                    <div className="form-group">
                      <label className="form-label">
                        {tr('ឈ្មោះដៃគូសហការ', 'Partner Name')} <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${partnerErrors.name ? 'is-invalid' : ''}`}
                        placeholder={tr('ឧ. Sok Tech Partner', 'e.g. Sok Tech Partner')}
                        value={partnerForm.name}
                        onChange={(e) => {
                          setPartnerForm({ ...partnerForm, name: e.target.value });
                          if (partnerErrors.name) setPartnerErrors(prev => { const n = { ...prev }; delete n.name; return n; });
                        }}
                      />
                      {partnerErrors.name && <div className="form-error-text" style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4, fontWeight: 600 }}>{partnerErrors.name}</div>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        {tr('អ៊ីមែល', 'Email')} <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="email"
                        className={`form-control ${partnerErrors.email ? 'is-invalid' : ''}`}
                        placeholder="partner@company.com"
                        value={partnerForm.email}
                        onChange={(e) => {
                          setPartnerForm({ ...partnerForm, email: e.target.value });
                          if (partnerErrors.email) setPartnerErrors(prev => { const n = { ...prev }; delete n.email; return n; });
                        }}
                      />
                      {partnerErrors.email && <div className="form-error-text" style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4, fontWeight: 600 }}>{partnerErrors.email}</div>}
                    </div>
                  </div>

                  <div className="form-row" style={{ marginBottom: 16 }}>
                    <div className="form-group">
                      <label className="form-label">
                        {tr('លេខទូរស័ព្ទ', 'Phone Number')}
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="012 345 678"
                        value={partnerForm.phone}
                        onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        {tr('កូដណែនាំ', 'Referral Code')} <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${partnerErrors.referralCode ? 'is-invalid' : ''}`}
                        placeholder="PARTNER15"
                        value={partnerForm.referralCode}
                        onChange={(e) => {
                          setPartnerForm({ ...partnerForm, referralCode: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') });
                          if (partnerErrors.referralCode) setPartnerErrors(prev => { const n = { ...prev }; delete n.referralCode; return n; });
                        }}
                        style={{ fontFamily: 'monospace', fontWeight: 800, textTransform: 'uppercase' }}
                      />
                      {partnerErrors.referralCode && <div className="form-error-text" style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4, fontWeight: 600 }}>{partnerErrors.referralCode}</div>}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 24, maxWidth: 360 }}>
                    <label className="form-label">
                      {tr('ភាគរយកម្រៃជើងសារ (%)', 'Commission Rate (%)')} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="0.5"
                        className="form-control"
                        style={{ width: 120, fontWeight: 700 }}
                        value={partnerForm.commissionRate}
                        onChange={(e) => setPartnerForm({ ...partnerForm, commissionRate: Number(e.target.value) })}
                      />
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>
                        % {tr('នៃថ្លៃជាវគម្រោង', 'of Subscription Fee')}
                      </span>
                    </div>
                  </div>

                  {/* Section 2: Payout Account */}
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center' }}>
                    {tr('២. ព័ត៌មានគណនីធនាគារសម្រាប់ទទួលប្រាក់', '2. Payout Bank Account Details')}
                  </div>

                  <div className="form-row" style={{ marginBottom: 16 }}>
                    <div className="form-group">
                      <label className="form-label">
                        {tr('ធនាគារ', 'Bank Name')}
                      </label>
                      <select
                        className="form-control"
                        value={partnerForm.bankName}
                        onChange={(e) => setPartnerForm({ ...partnerForm, bankName: e.target.value })}
                      >
                        <option value="ABA Bank">ABA Bank</option>
                        <option value="Bakong">Bakong (KHQR)</option>
                        <option value="ACLEDA Bank">ACLEDA Bank</option>
                        <option value="Wing Bank">Wing Bank</option>
                        <option value="Canadia Bank">Canadia Bank</option>
                        <option value="Other">Other Bank</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        {tr('លេខគណនី', 'Account Number')}
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="000 123 456"
                        value={partnerForm.accountNumber}
                        onChange={(e) => setPartnerForm({ ...partnerForm, accountNumber: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 24 }}>
                    <label className="form-label">
                      {tr('ឈ្មោះម្ចាស់គណនី', 'Account Name')}
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="SOK DARA"
                      value={partnerForm.accountName}
                      onChange={(e) => setPartnerForm({ ...partnerForm, accountName: e.target.value.toUpperCase() })}
                      style={{ textTransform: 'uppercase', fontWeight: 700 }}
                    />
                  </div>

                  {/* Section 3: Status Toggle */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={partnerForm.isActive}
                        onChange={(e) => setPartnerForm({ ...partnerForm, isActive: e.target.checked })}
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                      />
                      <span>{tr('បើកដំណើរការគណនីដៃគូសហការ', 'Enable Partner Account')}</span>
                    </label>
                  </div>

                  {/* Form Footer Action Buttons */}
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <button
                      type="button"
                      className="btn btn-cancel"
                      style={{ background: '#dc2626', color: '#ffffff', border: '1px solid #dc2626', fontWeight: 700 }}
                      onClick={() => setActiveMenu('partners')}
                    >
                      {tr('បោះបង់', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={savingPartner}
                      style={{ background: '#2563eb', color: '#ffffff', border: '1px solid #2563eb', fontWeight: 700 }}
                    >
                      {savingPartner ? tr('កំពុងរក្សាទុក...', 'Saving...') : tr('រក្សាទុក', 'Save')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>



      {/* MODAL 4: Manage Dynamic Domains Modal (saas_domains) */}
      {showDomainModal && selectedTenantForDomains && (
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
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              width: '100%',
              maxWidth: 560,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px -10px rgba(15, 23, 42, 0.25)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
            }}
          >
            {/* ── 1. Clean Minimal Header ── */}
            <div
              style={{
                padding: '20px 24px 16px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  <MdPublic size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    {tr('គ្រប់គ្រង Domain', 'Manage Domains')}
                  </h3>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: 600 }}>
                    🏢 {selectedTenantForDomains.companyName || `Tenant #${selectedTenantForDomains.id}`}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowDomainModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: 'none',
                  background: '#f1f5f9',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>

            {/* ── 2. Modal Body ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Add Domain Input (Inline Clean Form) */}
              <form onSubmit={handleAddDomainSubmit} noValidate>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    type="text"
                    placeholder="e.g. app.mycompany.com"
                    value={newDomainForm.domain}
                    onChange={(e) => setNewDomainForm({ ...newDomainForm, domain: e.target.value.toLowerCase().trim() })}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1.5px solid #cbd5e1',
                      fontSize: 13,
                      fontWeight: 600,
                      outline: 'none',
                      background: '#ffffff',
                      fontFamily: 'monospace',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={addingDomain}
                    style={{
                      padding: '10px 18px',
                      borderRadius: 10,
                      border: 'none',
                      background: '#2563eb',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: addingDomain ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {addingDomain ? '...' : '+ ' + tr('បន្ថែម', 'Add')}
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#475569',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={newDomainForm.isPrimary}
                      onChange={(e) => setNewDomainForm({ ...newDomainForm, isPrimary: e.target.checked })}
                      style={{ width: 14, height: 14, accentColor: '#2563eb', cursor: 'pointer' }}
                    />
                    <span>{tr('កំណត់ជា Domain ចម្បង (Primary)', 'Set as Primary Domain')}</span>
                  </label>

                  <select
                    value={newDomainForm.domainType}
                    onChange={(e) => setNewDomainForm({ ...newDomainForm, domainType: e.target.value })}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: '#64748b',
                      background: '#f8fafc',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="custom">Custom Domain</option>
                    <option value="subdomain">Subdomain</option>
                  </select>
                </div>
              </form>

              {/* Connected Domains List */}
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#334155', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{tr('Domains ដែលបានភ្ជាប់', 'Connected Domains')} ({tenantDomainsList.length})</span>
                  {loadingDomains && <span style={{ fontSize: 11, color: '#2563eb' }}>{tr('កំពុងទាញ...', 'Loading...')}</span>}
                </div>

                {tenantDomainsList.length === 0 && !loadingDomains ? (
                  <div
                    style={{
                      padding: '24px',
                      textAlign: 'center',
                      background: '#f8fafc',
                      borderRadius: 12,
                      border: '1px dashed #cbd5e1',
                      color: '#64748b',
                      fontSize: 12.5,
                    }}
                  >
                    {tr('មិនទាន់មាន Domain បន្ថែមទេ។', 'No custom domains added yet.')}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tenantDomainsList.map((d) => {
                      const domainUrl = d.domain.startsWith('http') ? d.domain : `https://${d.domain}`;
                      const isCopied = copiedDomain === d.domain;

                      return (
                        <div
                          key={d.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 14px',
                            borderRadius: 12,
                            background: d.isPrimary ? '#eff6ff' : '#f8fafc',
                            border: d.isPrimary ? '1.5px solid #bfdbfe' : '1px solid #e2e8f0',
                            gap: 10,
                          }}
                        >
                          {/* Domain Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <a
                                href={domainUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  fontFamily: 'monospace',
                                  fontWeight: 800,
                                  fontSize: 13.5,
                                  color: '#0f172a',
                                  textDecoration: 'none',
                                  wordBreak: 'break-all',
                                }}
                              >
                                {d.domain}
                              </a>

                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(d.domain);
                                  setCopiedDomain(d.domain);
                                  setTimeout(() => setCopiedDomain(null), 2000);
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: isCopied ? '#15803d' : '#94a3b8',
                                  cursor: 'pointer',
                                  padding: 0,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                                title="Copy"
                              >
                                {isCopied ? <MdCheck size={14} color="#15803d" /> : <MdContentCopy size={14} />}
                              </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 11 }}>
                              {d.isPrimary && (
                                <span style={{ fontWeight: 800, color: '#2563eb' }}>
                                  👑 {tr('ចម្បង', 'Primary')}
                                </span>
                              )}
                              <span style={{ color: d.isVerified ? '#15803d' : '#b45309', fontWeight: 700 }}>
                                ● {d.isVerified ? tr('SSL សកម្ម', 'SSL Active') : tr('រង់ចាំ DNS', 'Pending DNS')}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            {!d.isPrimary && (
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryDomain(d.id)}
                                style={{
                                  padding: '5px 9px',
                                  borderRadius: 6,
                                  background: '#ffffff',
                                  color: '#2563eb',
                                  border: '1px solid #bfdbfe',
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                {tr('ដាក់ជាចម្បង', 'Set Primary')}
                              </button>
                            )}

                            {!d.isPrimary && (
                              <button
                                type="button"
                                onClick={() => handleDeleteDomain(d.id)}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 6,
                                  background: 'transparent',
                                  color: '#ef4444',
                                  border: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                }}
                                title={tr('លុប Domain', 'Delete Domain')}
                              >
                                <MdDeleteOutline size={17} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Minimal DNS Guide Footer */}
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  padding: '10px 14px',
                  fontSize: 11.5,
                  color: '#475569',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                  <div>
                    <strong>CNAME:</strong> <code style={{ color: '#2563eb' }}>cname.ebsexpress.com</code>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('cname.ebsexpress.com');
                      setCopiedDns('cname');
                      setTimeout(() => setCopiedDns(null), 2000);
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#2563eb', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}
                  >
                    {copiedDns === 'cname' ? '✓ Copied' : 'Copy CNAME'}
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  <div>
                    <strong>A Record:</strong> <code style={{ color: '#059669' }}>76.76.21.21</code>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('76.76.21.21');
                      setCopiedDns('a-record');
                      setTimeout(() => setCopiedDns(null), 2000);
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#059669', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}
                  >
                    {copiedDns === 'a-record' ? '✓ Copied' : 'Copy A Record'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: Create / Edit Affiliate Partner Modal */}


      {/* MODAL 8: Renew / Extend Company Validity Modal */}
      {showRenewModal && selectedTenantForRenew && (() => {
        // Calculate live new expiry date preview
        let baseDate = new Date();
        if (selectedTenantForRenew.currentPeriodEnd) {
          const curr = new Date(selectedTenantForRenew.currentPeriodEnd);
          if (curr.getTime() > baseDate.getTime()) {
            baseDate = curr;
          }
        }
        const calcNewEnd = new Date(baseDate);
        if (renewDuration === '1y') calcNewEnd.setFullYear(calcNewEnd.getFullYear() + 1);
        else if (renewDuration === '6m') calcNewEnd.setMonth(calcNewEnd.getMonth() + 6);
        else if (renewDuration === '1m') calcNewEnd.setMonth(calcNewEnd.getMonth() + 1);
        else if (renewDuration === 'custom' && customEndDate) {
          const cDate = new Date(customEndDate);
          if (!isNaN(cDate.getTime())) calcNewEnd.setTime(cDate.getTime());
        }

        const daysRemaining = selectedTenantForRenew.currentPeriodEnd
          ? Math.ceil((new Date(selectedTenantForRenew.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : 0;

        return (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.7)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 16,
              fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: 24,
                width: '100%',
                maxWidth: 520,
                boxShadow: '0 25px 70px -12px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(226, 232, 240, 0.8)',
                overflow: 'hidden',
              }}
            >
              {/* ── 1. Header ── */}
              <div
                style={{
                  padding: '22px 26px 18px',
                  borderBottom: '1px solid #f1f5f9',
                  background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 6px 16px rgba(59, 130, 246, 0.28)',
                      flexShrink: 0,
                    }}
                  >
                    <MdAutorenew size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.2px' }}>
                      {tr('បន្តសុពលភាពក្រុមហ៊ុន', 'Extend Subscription Validity')}
                    </h3>
                    <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>🏢</span>
                      <strong style={{ color: '#1e293b' }}>
                        {selectedTenantForRenew.companyName || `Company #${selectedTenantForRenew.id}`}
                      </strong>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowRenewModal(false)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 16,
                    fontWeight: 700,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fee2e2';
                    e.currentTarget.style.color = '#ef4444';
                    e.currentTarget.style.borderColor = '#fecaca';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.color = '#64748b';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  ✕
                </button>
              </div>

              {/* ── 2. Modal Body ── */}
              <div style={{ padding: '22px 26px' }}>
                {/* Current Status Overview Card */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    borderRadius: 16,
                    padding: '16px 18px',
                    border: '1px solid #e2e8f0',
                    marginBottom: 20,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 12.5, color: '#64748b', fontWeight: 700 }}>
                      {tr('កញ្ចប់បច្ចុប្បន្ន', 'Current Plan')}:
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: 8,
                        background: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      👑 {selectedTenantForRenew.plan?.name || 'Professional'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12.5, color: '#64748b', fontWeight: 700 }}>
                      {tr('ថ្ងៃផុតកំណត់បច្ចុប្បន្ន', 'Current Expiry')}:
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                        {formatDate(selectedTenantForRenew.currentPeriodEnd)}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: daysRemaining > 0 ? '#dcfce7' : '#fee2e2',
                          color: daysRemaining > 0 ? '#15803d' : '#dc2626',
                        }}
                      >
                        {daysRemaining > 0 ? `នៅសល់ ${daysRemaining} ថ្ងៃ` : 'ផុតកំណត់ហើយ'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Duration Option Cards */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 900, color: '#0f172a', marginBottom: 10 }}>
                    {tr('ជ្រើសរើសរយៈពេលបន្តសុពលភាព', 'Select Extension Period')}
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    {[
                      { key: '1y', title: '+1 ឆ្នាំ', subtitle: '12 ខែពេញ', badge: '🔥 សន្សំ 20%', popular: true },
                      { key: '6m', title: '+6 ខែ', subtitle: 'ពាក់កណ្តាលឆ្នាំ', badge: null, popular: false },
                      { key: '1m', title: '+1 ខែ', subtitle: '30 ថ្ងៃ', badge: null, popular: false },
                    ].map((dur) => {
                      const isSelected = renewDuration === dur.key;

                      return (
                        <button
                          key={dur.key}
                          type="button"
                          onClick={() => setRenewDuration(dur.key as any)}
                          style={{
                            position: 'relative',
                            padding: '14px 10px 12px',
                            borderRadius: 16,
                            border: isSelected ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
                            background: isSelected
                              ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
                              : '#ffffff',
                            color: isSelected ? '#1d4ed8' : '#334155',
                            cursor: 'pointer',
                            textAlign: 'center',
                            boxShadow: isSelected ? '0 6px 18px rgba(37, 99, 235, 0.18)' : '0 2px 4px rgba(0,0,0,0.02)',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {dur.badge && (
                            <span
                              style={{
                                position: 'absolute',
                                top: -8,
                                fontSize: 9.5,
                                fontWeight: 800,
                                padding: '1px 6px',
                                borderRadius: 10,
                                background: '#f59e0b',
                                color: '#ffffff',
                                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)',
                              }}
                            >
                              {dur.badge}
                            </span>
                          )}
                          <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 2 }}>{dur.title}</div>
                          <div style={{ fontSize: 11, color: isSelected ? '#2563eb' : '#64748b', fontWeight: 600 }}>
                            {dur.subtitle}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Date Option */}
                <div style={{ marginBottom: 18 }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: '#475569',
                      cursor: 'pointer',
                      userSelect: 'none',
                      marginBottom: renewDuration === 'custom' ? 8 : 0,
                    }}
                  >
                    <input
                      type="radio"
                      name="renewDurationSelect"
                      checked={renewDuration === 'custom'}
                      onChange={() => setRenewDuration('custom')}
                      style={{ width: 16, height: 16, accentColor: '#2563eb', cursor: 'pointer' }}
                    />
                    <span>{tr('ឬ កំណត់កាលបរិច្ឆេទជាក់លាក់ (Custom Expiry Date)', 'Or set custom expiry date')}</span>
                  </label>

                  {renewDuration === 'custom' && (
                    <div style={{ marginTop: 8 }}>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: 12,
                          border: '1.5px solid #cbd5e1',
                          fontSize: 13,
                          outline: 'none',
                          boxSizing: 'border-box',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* ── Live New Expiration Preview Box ── */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    borderRadius: 14,
                    padding: '12px 16px',
                    border: '1px solid #bbf7d0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 20,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>📅</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#15803d', textTransform: 'uppercase' }}>
                        {tr('ថ្ងៃផុតកំណត់ថ្មីបន្ទាប់ពីបន្ត', 'New Expiration Date')}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: '#14532d', fontFamily: 'monospace' }}>
                        {formatDate(calcNewEnd)}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', background: '#ffffff', padding: '3px 8px', borderRadius: 6, border: '1px solid #bbf7d0' }}>
                    + {renewDuration === '1y' ? '1 Year' : renewDuration === '6m' ? '6 Months' : renewDuration === '1m' ? '1 Month' : 'Custom'}
                  </span>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowRenewModal(false)}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      color: '#64748b',
                      fontSize: 13.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                  >
                    {tr('បោះបង់', 'Cancel')}
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmRenew}
                    disabled={renewing}
                    style={{
                      flex: 2,
                      padding: '12px 20px',
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                      color: '#ffffff',
                      fontSize: 13.5,
                      fontWeight: 800,
                      border: 'none',
                      cursor: renewing ? 'not-allowed' : 'pointer',
                      boxShadow: '0 6px 18px rgba(37,99,235,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      transition: 'all 0.15s',
                    }}
                  >
                    {renewing ? (
                      <span>⏳ {tr('កំពុងបន្ត...', 'Extending...')}</span>
                    ) : (
                      <>
                        <MdCheck size={18} />
                        <span>{tr('បន្តសុពលភាពភ្លាមៗ', 'Confirm & Extend Validity')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: Edit Tenant / Company Information Modal */}
      {showEditTenantModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
            fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              width: '100%',
              maxWidth: 520,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 70px -12px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(226, 232, 240, 0.8)',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '20px 24px 16px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: '#e0f2fe',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  <FaRegEdit size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16.5, fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    {tr('កែប្រែព័ត៌មានក្រុមហ៊ុន', 'Edit Company Information')}
                  </h3>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    🏢 ID: #{editTenantForm.id}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowEditTenantModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEditTenantSubmit} style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    {tr('ឈ្មោះក្រុមហ៊ុន', 'Company Name')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={editTenantForm.name}
                    onChange={(e) => setEditTenantForm({ ...editTenantForm, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1.5px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontWeight: 600,
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      {tr('លេខទូរស័ព្ទ', 'Phone Number')}
                    </label>
                    <input
                      type="text"
                      value={editTenantForm.phone}
                      onChange={(e) => setEditTenantForm({ ...editTenantForm, phone: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1.5px solid #cbd5e1',
                        fontSize: 13,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      {tr('អ៊ីមែល', 'Email')}
                    </label>
                    <input
                      type="email"
                      value={editTenantForm.email}
                      onChange={(e) => setEditTenantForm({ ...editTenantForm, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1.5px solid #cbd5e1',
                        fontSize: 13,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      {tr('កញ្ចប់គម្រោង (Plan)', 'Subscription Plan')}
                    </label>
                    <select
                      value={editTenantForm.planId}
                      onChange={(e) => setEditTenantForm({ ...editTenantForm, planId: Number(e.target.value) })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1.5px solid #cbd5e1',
                        fontSize: 13,
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: '#ffffff',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (${p.priceMonthly}/m - ${p.priceYearly}/y)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      {tr('ស្ថានភាព', 'Status')}
                    </label>
                    <select
                      value={editTenantForm.status}
                      onChange={(e) => setEditTenantForm({ ...editTenantForm, status: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1.5px solid #cbd5e1',
                        fontSize: 13,
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: '#ffffff',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <option value="active">Active (សកម្ម)</option>
                      <option value="suspended">Suspended (ផ្អាក)</option>
                      <option value="trial">Trial (សាកល្បង)</option>
                      <option value="expired">Expired (ផុតកំណត់)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    {tr('អាសយដ្ឋាន', 'Address')}
                  </label>
                  <textarea
                    rows={2}
                    value={editTenantForm.address}
                    onChange={(e) => setEditTenantForm({ ...editTenantForm, address: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1.5px solid #cbd5e1',
                      fontSize: 13,
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      resize: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: 22, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setShowEditTenantModal(false)}
                  style={{
                    flex: 1,
                    padding: '11px 16px',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#64748b',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {tr('បោះបង់', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={savingTenant}
                  style={{
                    flex: 2,
                    padding: '11px 16px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#0284c7',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: savingTenant ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  {savingTenant ? tr('កំពុងរក្សាទុក...', 'Saving...') : tr('រក្សាទុកការកែប្រែ', 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
