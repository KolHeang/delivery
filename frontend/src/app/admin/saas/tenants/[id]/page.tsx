'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { saasApi, Plan } from '@/lib/saas-api';
import { getUser, clearAuth } from '@/lib/auth';
import {
  MdDashboard,
  MdBusiness,
  MdArrowBack,
  MdWorkspacePremium,
  MdReceiptLong,
  MdOpenInNew,
  MdContentCopy,
  MdCheck,
  MdAdminPanelSettings,
  MdSpeed,
  MdAutorenew,
  MdDownload,
  MdCheckCircle,
  MdAccessTime,
  MdSearch,
  MdGroup,
  MdLocalOffer,
  MdAttachMoney,
  MdPayments,
  MdLanguage,
  MdEmail,
  MdPhone,
  MdLocationOn,
  MdCalendarToday,
  MdCreditCard,
  MdKeyboardArrowDown,
  MdLogout,
  MdPerson,
} from 'react-icons/md';
import { FaRegEdit } from 'react-icons/fa';
import { FiPlusCircle, FiCopy, FiCheck, FiExternalLink, FiClock, FiFileText, FiRefreshCw, FiArrowLeft, FiGlobe } from 'react-icons/fi';
import { SaasCloudIcon } from '@/components/ui/SaasCloudIcon';
import { FlagKm, FlagEn } from '@/components/ui/Flags';
import { useLanguage } from '@/lib/LanguageContext';
import { printInvoicePdf } from '@/lib/invoice-pdf';
import { getTenantWorkspaceUrl } from '@/lib/domain';

export default function TenantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = Number(params.id);

  const { lang, setLang } = useLanguage();
  const [tenant, setTenant] = useState<any>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const handleLogout = () => {
    clearAuth();
    router.push('/admin/saas/login');
  };

  // Invoices Filter & Search State
  const [activeDetailTab, setActiveDetailTab] = useState<'invoices' | 'company' | 'quotas'>('invoices');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'paid' | 'pending' | 'void'>('all');
  const [invoiceSearch, setInvoiceSearch] = useState('');

  // Renewal Modal State
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewDuration, setRenewDuration] = useState<'1y' | '6m' | '1m' | 'custom'>('1y');
  const [customEndDate, setCustomEndDate] = useState('');
  const [renewing, setRenewing] = useState(false);
  const [renewAmount, setRenewAmount] = useState<number>(490);
  const [renewCreateInvoice, setRenewCreateInvoice] = useState(true);
  const [renewInvoiceStatus, setRenewInvoiceStatus] = useState<'paid' | 'pending'>('paid');
  const [renewPaymentMethod, setRenewPaymentMethod] = useState('aba_khqr');

  // Create Invoice Modal State
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    billingCycle: 'monthly',
    amount: 49,
    dueDate: '',
  });

  const tr = (km: string, en: string) => (lang === 'km' ? km : en);

  const formatLocalDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadData = async () => {
    if (!tenantId || isNaN(tenantId)) return;
    try {
      setLoading(true);
      const [plansRes, tenantRes, allInvoicesRes] = await Promise.all([
        saasApi.getPlans(true).catch(() => []),
        saasApi.getTenantById(tenantId).catch(() => null),
        saasApi.getAllInvoices().catch(() => []),
      ]);

      setPlans(plansRes || []);

      if (tenantRes) {
        setTenant(tenantRes);

        // Filter invoices belonging to this tenant/subscription
        const subIds = (tenantRes.subscriptions || []).map((s: any) => s.id);
        const tenantSlug = tenantRes.slug?.toLowerCase();
        const tenantName = tenantRes.name?.toLowerCase();

        const rawInvoices = Array.isArray(allInvoicesRes)
          ? allInvoicesRes
          : Array.isArray((allInvoicesRes as any)?.data)
          ? (allInvoicesRes as any).data
          : Array.isArray((allInvoicesRes as any)?.result)
          ? (allInvoicesRes as any).result
          : [];

        const invList = rawInvoices.filter((inv: any) => {
          if (inv.subscriptionId && subIds.includes(inv.subscriptionId)) return true;
          if (inv.subscription?.tenantId === tenantId) return true;
          if (inv.subscription?.tenant?.id === tenantId) return true;
          if (inv.tenant?.id === tenantId) return true;
          if (tenantSlug && inv.subscription?.subdomain?.toLowerCase() === tenantSlug) return true;
          if (tenantName && inv.subscription?.companyName?.toLowerCase() === tenantName) return true;
          return false;
        });

        // Also check if tenant.subscriptions has embedded invoices
        let combined = [...invList];
        if (tenantRes.subscriptions) {
          tenantRes.subscriptions.forEach((s: any) => {
            if (Array.isArray(s.invoices)) {
              s.invoices.forEach((sInv: any) => {
                if (!combined.some((c) => c.id === sInv.id)) {
                  combined.push({ ...sInv, subscription: s });
                }
              });
            }
          });
        }

        // Sort descending by created date
        combined.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setInvoices(combined);
      } else {
        alert(tr('រកមិនឃើញព័ត៌មានក្រុមហ៊ុននេះទេ', 'Company not found'));
        router.push('/admin/saas?tab=tenants');
      }
    } catch (err: any) {
      console.error('Failed to load tenant:', err);
      alert(tr('បរាជ័យក្នុងការទាញយកព័ត៌មានក្រុមហ៊ុន', 'Failed to load company info'));
      router.push('/admin/saas?tab=tenants');
    } finally {
      setLoading(false);
    }
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
      } catch (e) {}
    }

    if (adminObj) {
      setUser(adminObj);
    } else if (currentUser) {
      setUser(currentUser);
    } else {
      setUser({ name: 'Master Super Admin', email: 'superadmin@ebsexpress.com', role: 'super_admin' });
    }

    if (tenantId) {
      loadData();
    }
  }, [tenantId, router]);

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
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

  const activeSub = (tenant?.subscriptions && tenant?.subscriptions[0]) || null;
  const currentPlan = tenant?.plan || plans.find((p) => p.id === tenant?.planId) || activeSub?.plan || {};
  const adminUser = tenant?.adminUser || activeSub?.user || {};
  const subdomain = tenant?.slug || activeSub?.subdomain || '';

  const getWorkspaceUrl = (sub: string) => {
    if (!sub) return '';
    return getTenantWorkspaceUrl(sub);
  };

  const workspaceUrl = getWorkspaceUrl(subdomain);
  const adminEmail = adminUser.email || tenant?.email || (subdomain ? `admin@${subdomain}.com` : '-');

  const daysRemaining = activeSub?.currentPeriodEnd
    ? Math.ceil((new Date(activeSub.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // Filter Invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchStatus = invoiceStatusFilter === 'all' || inv.status === invoiceStatusFilter;
    const term = invoiceSearch.toLowerCase().trim();
    const matchSearch =
      !term ||
      inv.invoiceNumber?.toLowerCase().includes(term) ||
      inv.paymentMethod?.toLowerCase().includes(term) ||
      String(inv.totalAmount || inv.amount).includes(term);
    return matchStatus && matchSearch;
  });

  // Financial Stats
  const totalPaidRevenue = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + Number(inv.totalAmount || inv.amount || 0), 0);

  const pendingInvoicesCount = invoices.filter((inv) => inv.status === 'pending').length;

  // Handle Mark Invoice Paid
  const handleMarkInvoicePaid = async (invId: number) => {
    if (!confirm(tr('តើអ្នកប្រាកដជាចង់កំណត់វិក្កយបត្រនេះជា «បង់រួច» មែនទេ?', 'Are you sure you want to mark this invoice as PAID?'))) return;
    try {
      await saasApi.updateInvoiceStatus(invId, 'paid');
      alert(tr('វិក្កយបត្រត្រូវបានកំណត់ជា «បង់រួច» ជោគជ័យ!', 'Invoice marked as PAID successfully!'));
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការកែប្រែស្ថានភាព', 'Failed to update status'));
    }
  };

  // Open Renew Modal with precalculated amounts
  const handleOpenRenewModal = () => {
    const monthly = Number(currentPlan.priceMonthly || 49);
    const yearly = Number(currentPlan.priceYearly || (monthly * 10));
    setRenewDuration('1y');
    setRenewAmount(yearly);
    setRenewCreateInvoice(true);
    setRenewInvoiceStatus('paid');
    setRenewPaymentMethod('aba_khqr');
    setShowRenewModal(true);
  };

  const handleSelectDuration = (key: '1y' | '6m' | '1m' | 'custom') => {
    setRenewDuration(key);
    const monthly = Number(currentPlan.priceMonthly || 49);
    const yearly = Number(currentPlan.priceYearly || (monthly * 10));
    if (key === '1y') setRenewAmount(yearly);
    else if (key === '6m') setRenewAmount(monthly * 6);
    else if (key === '1m') setRenewAmount(monthly);
    else if (key === 'custom') setRenewAmount(monthly);
  };

  // Handle Extend / Renew Subscription
  const handleConfirmRenew = async () => {
    if (!activeSub) {
      alert(tr('មិនមាន Subscription សកម្មសម្រាប់បន្តទេ', 'No active subscription found to renew'));
      return;
    }
    try {
      setRenewing(true);
      let nextEnd = new Date();
      if (activeSub.currentPeriodEnd) {
        const curr = new Date(activeSub.currentPeriodEnd);
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

      // 1. Update Subscription validity & ensure active status
      await saasApi.updateSubscriptionStatus(activeSub.id, 'active', nextEnd);

      // 2. Automatically generate new invoice if enabled
      if (renewCreateInvoice) {
        const finalAmount = Number(renewAmount || 0);
        try {
          await saasApi.createInvoice({
            subscriptionId: activeSub.id,
            tenantId: tenantId,
            userId: activeSub.userId || adminUser?.id || undefined,
            subtotal: finalAmount,
            discountAmount: 0,
            totalAmount: finalAmount,
            status: renewInvoiceStatus,
            dueDate: nextEnd,
            paidAt: renewInvoiceStatus === 'paid' ? new Date() : undefined,
            paymentMethod: renewPaymentMethod,
          });
        } catch (invErr: any) {
          console.warn('First invoice attempt failed, trying clean fallback:', invErr);
          await saasApi.createInvoice({
            subscriptionId: activeSub.id,
            tenantId: tenantId,
            subtotal: finalAmount,
            totalAmount: finalAmount,
            status: renewInvoiceStatus,
            dueDate: nextEnd,
          });
        }
      }

      alert(
        renewCreateInvoice
          ? tr(
              `បានបន្តសុពលភាព និងបង្កើតវិក្កយបត្រថ្មីជោគជ័យ ($${renewAmount})!`,
              `Subscription extended and new invoice issued successfully ($${renewAmount})!`,
            )
          : tr('បានបន្តសុពលភាពជោគជ័យ!', 'Subscription extended successfully!')
      );
      setShowRenewModal(false);
      await loadData();
    } catch (err: any) {
      console.error('Failed to renew subscription:', err);
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការបន្តសុពលភាព', 'Failed to extend validity'));
    } finally {
      setRenewing(false);
    }
  };

  // Open Create Invoice Modal
  const handleOpenCreateInvoice = () => {
    const cycle = activeSub?.billingCycle || 'monthly';
    const price = cycle === 'yearly' ? Number(currentPlan.priceYearly || 490) : Number(currentPlan.priceMonthly || 49);
    const base = new Date();
    if (cycle === 'yearly') base.setFullYear(base.getFullYear() + 1);
    else base.setMonth(base.getMonth() + 1);

    setInvoiceForm({
      billingCycle: cycle,
      amount: price,
      dueDate: formatLocalDateStr(base),
    });
    setShowCreateInvoiceModal(true);
  };

  // Handle Submit New Invoice
  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSub) {
      alert(tr('មិនមាន Subscription សម្រាប់ក្រុមហ៊ុននេះទេ', 'No subscription found for this company'));
      return;
    }
    try {
      setCreatingInvoice(true);
      await saasApi.createInvoice({
        subscriptionId: activeSub.id,
        planId: currentPlan.id || activeSub.planId || 1,
        billingCycle: invoiceForm.billingCycle,
        subtotal: Number(invoiceForm.amount),
        discountAmount: 0,
        totalAmount: Number(invoiceForm.amount),
        dueDate: invoiceForm.dueDate,
        status: 'pending',
      });
      alert(tr('បានចេញវិក្កយបត្រថ្មីជោគជ័យ!', 'Invoice created successfully!'));
      setShowCreateInvoiceModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការចេញវិក្កយបត្រ', 'Failed to issue invoice'));
    } finally {
      setCreatingInvoice(false);
    }
  };

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

          <Link
            href="/admin/saas?tab=dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 10,
              border: 'none',
              background: 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.15s',
              borderLeft: '4px solid transparent',
              boxSizing: 'border-box',
            }}
          >
            <MdDashboard size={20} color="#bfdbfe" />
            <span>{tr('ផ្ទាំងគ្រប់គ្រង', 'Dashboard')}</span>
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
              border: 'none',
              background: 'rgba(255, 255, 255, 0.18)',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 900,
              textDecoration: 'none',
              transition: 'all 0.15s',
              borderLeft: '4px solid #ffffff',
              boxSizing: 'border-box',
            }}
          >
            <MdBusiness size={20} color="#ffffff" />
            <span>{tr('ក្រុមហ៊ុនទាំងអស់', 'All Companies')}</span>
          </Link>

          <Link
            href="/admin/saas?tab=invoices"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 10,
              border: 'none',
              background: 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.15s',
              borderLeft: '4px solid transparent',
              boxSizing: 'border-box',
            }}
          >
            <MdReceiptLong size={20} color="#bfdbfe" />
            <span>{tr('ប្រវត្តិវិក្កយបត្រ', 'Billing Invoices')}</span>
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
              border: 'none',
              background: 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.15s',
              borderLeft: '4px solid transparent',
              boxSizing: 'border-box',
            }}
          >
            <MdGroup size={20} color="#bfdbfe" />
            <span>{tr('គណនី SaaS Admins', 'SaaS Admins')}</span>
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
              border: 'none',
              background: 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.15s',
              borderLeft: '4px solid transparent',
              boxSizing: 'border-box',
            }}
          >
            <MdWorkspacePremium size={20} color="#bfdbfe" />
            <span>{tr('កញ្ចប់សេវា', 'Subscription Plans')}</span>
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
              border: 'none',
              background: 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.15s',
              borderLeft: '4px solid transparent',
              boxSizing: 'border-box',
            }}
          >
            <MdLocalOffer size={20} color="#bfdbfe" />
            <span>{tr('គូប៉ុងបញ្ចុះតម្លៃ', 'Promo Coupons')}</span>
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
              border: 'none',
              background: 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.15s',
              borderLeft: '4px solid transparent',
              boxSizing: 'border-box',
            }}
          >
            <MdAttachMoney size={20} color="#bfdbfe" />
            <span>{tr('ដៃគូសហការ', 'Affiliate Partners')}</span>
          </Link>
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
            justifyContent: 'flex-end',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 80,
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
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
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'M'}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#ffffff', lineHeight: 1.2 }}>{user?.name || 'Master Super Admin'}</div>
                  <div style={{ fontSize: 11, color: '#bfdbfe', fontWeight: 600 }}>{user?.email || 'superadmin@gmail.com'}</div>
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
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>{user?.email || 'superadmin@gmail.com'}</div>
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
                        <span>{tr('ចាកចេញ', 'Logout')}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* 3. DYNAMIC CONTENT BODY */}
        <main style={{ flex: 1, padding: '24px 28px 80px', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
          {/* Breadcrumbs & Page Header */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Link
                href="/admin/saas?tab=tenants"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#2563eb',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: 'rgba(37, 99, 235, 0.08)',
                  border: '1px solid rgba(37, 99, 235, 0.15)',
                  transition: 'all 0.15s',
                }}
              >
                <FiArrowLeft size={14} />
                <span>{tr('ត្រឡប់ក្រោយ', 'Back')}</span>
              </Link>
              <span style={{ color: '#cbd5e1', fontSize: 13 }}>/</span>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                {tr('ក្រុមហ៊ុនទាំងអស់', 'All Companies')}
              </span>
              <span style={{ color: '#cbd5e1', fontSize: 13 }}>/</span>
              <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 800 }}>
                {tenant?.name || tr('ព័ត៌មានលម្អិតក្រុមហ៊ុន', 'Company Details')}
              </span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
              {tenant?.name || tr('ព័ត៌មានលម្អិតក្រុមហ៊ុន', 'Company Details')}
            </h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              {tr('គ្រប់គ្រង Workspace Subdomains គណនី Admin និងប្រវត្តិវិក្កយបត្រ', 'Manage workspace subdomains, admin accounts, and billing invoices')}
            </p>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '100px 0', color: '#64748b' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{tr('កំពុងទាញយកទិន្នន័យក្រុមហ៊ុន...', 'Loading company details...')}</div>
            </div>
          ) : !tenant ? (
            <div style={{ textAlign: 'center', padding: '100px 0', color: '#ef4444' }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{tr('រកមិនឃើញក្រុមហ៊ុននេះទេ', 'Company not found')}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* 1. HERO HEADER CARD — CLEAN, SOPHISTICATED, EXECUTIVE SAAS */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: 16,
                  padding: '22px 26px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 18,
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 280 }}>
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 14,
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      fontWeight: 800,
                      boxShadow: '0 3px 10px rgba(37, 99, 235, 0.2)',
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}
                  >
                    {tenant.logo ? (
                      <img src={tenant.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      (tenant.name || 'C').charAt(0).toUpperCase()
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
                        {tenant.name}
                      </h1>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2.5px 8px',
                          borderRadius: 20,
                          background: tenant.status === 'active' ? '#ecfdf5' : '#fffbeb',
                          color: tenant.status === 'active' ? '#047857' : '#b45309',
                          border: `1px solid ${tenant.status === 'active' ? '#a7f3d0' : '#fde68a'}`,
                          textTransform: 'uppercase',
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: tenant.status === 'active' ? '#10b981' : '#f59e0b' }} />
                        {tenant.status || 'ACTIVE'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Link
                    href={`/admin/saas/tenants/edit/${tenant.id}`}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#334155',
                      fontSize: 12.5,
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.15s',
                    }}
                  >
                    <FaRegEdit size={13} color="#64748b" />
                    <span>{tr('កែប្រែក្រុមហ៊ុន', 'Edit Company')}</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleOpenRenewModal}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#334155',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.15s',
                    }}
                  >
                    <MdAutorenew size={16} color="#64748b" />
                    <span>{tr('បន្តសុពលភាព', 'Extend Validity')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenCreateInvoice}
                    style={{
                      padding: '8px 15px',
                      borderRadius: 8,
                      background: '#2563eb',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <FiPlusCircle size={15} />
                    <span>{tr('ចេញវិក្កយបត្រ', 'Issue Invoice')}</span>
                  </button>

                  {workspaceUrl && (
                    <a
                      href={`${workspaceUrl}/auth`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        background: '#0f172a',
                        color: '#ffffff',
                        fontSize: 12.5,
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)',
                        transition: 'all 0.15s',
                      }}
                    >
                      <FiExternalLink size={14} />
                      <span>{tr('បើក Workspace ↗', 'Open Portal ↗')}</span>
                    </a>
                  )}
                </div>
              </div>

              {/* 2. FOUR KPI METRIC CARDS — CLEAN, UNIFORM */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14, width: '100%' }}>
                {/* Metric 1: Plan Tier */}
                <div style={{ background: '#ffffff', borderRadius: 14, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {tr('កញ្ចប់គម្រោង', 'Plan Tier')}
                    </div>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MdWorkspacePremium size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
                    {currentPlan.name || 'Professional'}
                  </div>
                  <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, marginTop: 6 }}>
                    ${activeSub?.billingCycle === 'yearly' ? (currentPlan.priceYearly || 490) : (currentPlan.priceMonthly || 49)} / {activeSub?.billingCycle === 'yearly' ? tr('ឆ្នាំ', 'Year') : tr('ខែ', 'Month')}
                  </div>
                </div>

                {/* Metric 2: Validity */}
                <div style={{ background: '#ffffff', borderRadius: 14, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {tr('ថ្ងៃផុតកំណត់', 'Expires On')}
                    </div>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MdAccessTime size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
                    {formatDate(activeSub?.currentPeriodEnd)}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    {daysRemaining !== null ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 12,
                          background: daysRemaining > 30 ? '#ecfdf5' : daysRemaining > 7 ? '#fffbeb' : '#fef2f2',
                          color: daysRemaining > 30 ? '#047857' : daysRemaining > 7 ? '#b45309' : '#b91c1c',
                          border: `1px solid ${daysRemaining > 30 ? '#a7f3d0' : daysRemaining > 7 ? '#fde68a' : '#fecaca'}`,
                        }}
                      >
                        {daysRemaining > 0 ? tr(`នៅសល់ ${daysRemaining} ថ្ងៃ`, `${daysRemaining} days left`) : tr('ផុតកំណត់', 'Expired')}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: '#64748b' }}>-</span>
                    )}
                  </div>
                </div>

                {/* Metric 3: Total Paid Revenue */}
                <div style={{ background: '#ffffff', borderRadius: 14, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {tr('ចំណូលបានបង់សរុប', 'Total Paid')}
                    </div>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MdPayments size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#059669', marginTop: 8 }}>
                    ${totalPaidRevenue.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                    {invoices.filter((i) => i.status === 'paid').length} {tr('វិក្កយបត្របានបង់រួច', 'paid invoices')}
                  </div>
                </div>

                {/* Metric 4: Total Invoices */}
                <div style={{ background: '#ffffff', borderRadius: 14, padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {tr('វិក្កយបត្រទាំងអស់', 'Invoices')}
                    </div>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MdReceiptLong size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 8 }}>
                    {invoices.length}
                  </div>
                  <div style={{ fontSize: 12, color: pendingInvoicesCount > 0 ? '#b45309' : '#059669', fontWeight: 600, marginTop: 6 }}>
                    {pendingInvoicesCount > 0
                      ? tr(`⚠️ មិនទាន់បង់: ${pendingInvoicesCount}`, `⚠️ Pending: ${pendingInvoicesCount}`)
                      : tr('✓ គ្មានបំណុលនៅសល់', '✓ All settled')}
                  </div>
                </div>
              </div>

              {/* 3. MODERN SEGMENTED TAB BAR */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: '#f1f5f9',
                  padding: 4,
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  width: 'fit-content',
                  maxWidth: '100%',
                  overflowX: 'auto',
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveDetailTab('invoices')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontWeight: activeDetailTab === 'invoices' ? 700 : 600,
                    transition: 'all 0.15s ease',
                    background: activeDetailTab === 'invoices' ? '#ffffff' : 'transparent',
                    color: activeDetailTab === 'invoices' ? '#0f172a' : '#64748b',
                    boxShadow: activeDetailTab === 'invoices' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <MdReceiptLong size={16} color={activeDetailTab === 'invoices' ? '#2563eb' : '#64748b'} />
                  <span>{tr('ប្រវត្តិបង់លុយ និងវិក្កយបត្រ', 'Payment & Invoices')}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 10,
                      background: activeDetailTab === 'invoices' ? '#eff6ff' : '#e2e8f0',
                      color: activeDetailTab === 'invoices' ? '#2563eb' : '#64748b',
                    }}
                  >
                    {invoices.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDetailTab('company')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontWeight: activeDetailTab === 'company' ? 700 : 600,
                    transition: 'all 0.15s ease',
                    background: activeDetailTab === 'company' ? '#ffffff' : 'transparent',
                    color: activeDetailTab === 'company' ? '#0f172a' : '#64748b',
                    boxShadow: activeDetailTab === 'company' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <MdBusiness size={16} color={activeDetailTab === 'company' ? '#2563eb' : '#64748b'} />
                  <span>{tr('ព័ត៌មានក្រុមហ៊ុន & Admin', 'Company & Admin Profile')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDetailTab('quotas')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontWeight: activeDetailTab === 'quotas' ? 700 : 600,
                    transition: 'all 0.15s ease',
                    background: activeDetailTab === 'quotas' ? '#ffffff' : 'transparent',
                    color: activeDetailTab === 'quotas' ? '#0f172a' : '#64748b',
                    boxShadow: activeDetailTab === 'quotas' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <MdSpeed size={16} color={activeDetailTab === 'quotas' ? '#2563eb' : '#64748b'} />
                  <span>{tr('ដែនកំណត់ធនធានប្រព័ន្ធ', 'Plan Quotas & Features')}</span>
                </button>
              </div>

              {/* 4. TAB CONTENTS */}
              {/* === TAB 1: PAYMENT & INVOICES HISTORY === */}
              {activeDetailTab === 'invoices' && (
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: 16,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    width: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12,
                      padding: '18px 22px',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <div>
                      <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {tr('ប្រវត្តិបង់លុយ និងវិក្កយបត្រ', 'Payment & Invoice History')}
                      </h2>
                      <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>
                        {tr('តាមដានរាល់ប្រតិបត្តិការបង់ប្រាក់ និងវិក្កយបត្ររបស់ក្រុមហ៊ុននេះ', 'Track all payment transactions and invoices issued to this company')}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {/* Status Filter */}
                      <select
                        value={invoiceStatusFilter}
                        onChange={(e) => setInvoiceStatusFilter(e.target.value as any)}
                        style={{
                          padding: '7px 12px',
                          borderRadius: 8,
                          border: '1px solid #cbd5e1',
                          fontSize: 12,
                          outline: 'none',
                          background: '#ffffff',
                          color: '#334155',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <option value="all">{tr('ស្ថានភាពទាំងអស់', 'All Statuses')}</option>
                        <option value="paid">{tr('បង់រួច', 'Paid')}</option>
                        <option value="pending">{tr('មិនទាន់បង់', 'Pending')}</option>
                      </select>

                      {/* Search */}
                      <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '5px 10px', width: 200 }}>
                        <MdSearch size={16} color="#64748b" />
                        <input
                          type="text"
                          placeholder={tr('ស្វែងរកវិក្កយបត្រ...', 'Search invoice...')}
                          value={invoiceSearch}
                          onChange={(e) => setInvoiceSearch(e.target.value)}
                          style={{ border: 'none', background: 'transparent', outline: 'none', paddingLeft: 6, fontSize: 12, width: '100%', color: '#0f172a' }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleOpenCreateInvoice}
                        style={{
                          padding: '7px 14px',
                          borderRadius: 8,
                          border: 'none',
                          background: '#2563eb',
                          color: '#ffffff',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                        }}
                      >
                        <FiPlusCircle size={14} />
                        <span>{tr('ចេញវិក្កយបត្រថ្មី', 'Issue Invoice')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Table — Clean, Light Slate Header */}
                  <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', minWidth: 840, borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                          <th style={{ padding: '11px 14px', textAlign: 'center', width: 44, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.03em' }}>{tr('ល.រ', 'No.')}</th>
                          <th style={{ padding: '11px 14px', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.03em' }}>{tr('លេខវិក្កយបត្រ', 'Invoice No.')}</th>
                          <th style={{ padding: '11px 14px', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.03em' }}>{tr('ថ្ងៃចេញវិក្កយបត្រ', 'Issued Date')}</th>
                          <th style={{ padding: '11px 14px', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.03em' }}>{tr('ថ្ងៃផុតកំណត់', 'Due Date')}</th>
                          <th style={{ padding: '11px 14px', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.03em' }}>{tr('តម្លៃដើម', 'Subtotal')}</th>
                          <th style={{ padding: '11px 14px', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.03em' }}>{tr('បញ្ចុះតម្លៃ', 'Discount')}</th>
                          <th style={{ padding: '11px 14px', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.03em' }}>{tr('ទឹកប្រាក់សរុប', 'Total Amount')}</th>
                          <th style={{ padding: '11px 14px', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.03em' }}>{tr('ស្ថានភាព', 'Status')}</th>
                          <th style={{ padding: '11px 14px', textAlign: 'right', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.03em' }}>{tr('សកម្មភាព', 'Action')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInvoices.length === 0 ? (
                          <tr>
                            <td colSpan={9} style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                              <div style={{ fontSize: 26, marginBottom: 8 }}>📄</div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{tr('មិនមានប្រវត្តិបង់លុយ ឬវិក្កយបត្រនៅឡើយទេ', 'No payment history or invoices found for this company')}</div>
                              <button
                                type="button"
                                onClick={handleOpenCreateInvoice}
                                style={{
                                  marginTop: 14,
                                  padding: '7px 14px',
                                  borderRadius: 8,
                                  border: '1px solid #bfdbfe',
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                + {tr('ចេញវិក្កយបត្រដំបូង', 'Issue First Invoice')}
                              </button>
                            </td>
                          </tr>
                        ) : (
                          filteredInvoices.map((inv, idx) => (
                            <tr
                              key={inv.id}
                              style={{
                                borderBottom: '1px solid #f1f5f9',
                                transition: 'background 0.15s',
                                background: '#ffffff',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                            >
                              <td style={{ padding: '12px 14px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                                {idx + 1}
                              </td>
                              <td style={{ padding: '12px 14px', fontWeight: 700, color: '#2563eb', fontFamily: 'monospace', fontSize: 12.5 }}>
                                {inv.invoiceNumber || `INV-${inv.id}`}
                              </td>
                              <td style={{ padding: '12px 14px', color: '#475569' }}>
                                {formatDate(inv.createdAt)}
                              </td>
                              <td style={{ padding: '12px 14px', color: '#475569', fontWeight: 600 }}>
                                {formatDate(inv.dueDate || inv.subscription?.currentPeriodEnd)}
                              </td>
                              <td style={{ padding: '12px 14px', color: '#64748b' }}>
                                ${Number(inv.subtotal || inv.totalAmount || inv.amount || 0).toFixed(2)}
                              </td>
                              <td style={{ padding: '12px 14px', color: '#059669', fontWeight: 600 }}>
                                -${Number(inv.discountAmount || 0).toFixed(2)}
                              </td>
                              <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a', fontSize: 13.5 }}>
                                ${Number(inv.totalAmount || inv.amount || 0).toFixed(2)}
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: 14,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    background: inv.status === 'paid' ? '#ecfdf5' : inv.status === 'pending' ? '#fffbeb' : '#fef2f2',
                                    color: inv.status === 'paid' ? '#047857' : inv.status === 'pending' ? '#b45309' : '#b91c1c',
                                    border: `1px solid ${inv.status === 'paid' ? '#a7f3d0' : inv.status === 'pending' ? '#fde68a' : '#fecaca'}`,
                                  }}
                                >
                                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: inv.status === 'paid' ? '#10b981' : inv.status === 'pending' ? '#f59e0b' : '#ef4444' }} />
                                  {inv.status === 'paid' ? tr('បង់រួច', 'PAID') : inv.status.toUpperCase()}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                                  {inv.status !== 'paid' && (
                                    <button
                                      type="button"
                                      onClick={() => handleMarkInvoicePaid(inv.id)}
                                      style={{
                                        padding: '5px 9px',
                                        borderRadius: 6,
                                        border: '1px solid #a7f3d0',
                                        background: '#ecfdf5',
                                        color: '#047857',
                                        fontSize: 11.5,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      ✓ {tr('បង់រួច', 'Mark Paid')}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => printInvoicePdf({
                                      ...inv,
                                      subscription: inv.subscription || activeSub,
                                      tenant,
                                    })}
                                    style={{
                                      padding: '5px 9px',
                                      borderRadius: 6,
                                      border: '1px solid #e2e8f0',
                                      background: '#ffffff',
                                      color: '#334155',
                                      fontSize: 11.5,
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      transition: 'all 0.15s',
                                    }}
                                    title={tr('បោះពុម្ពជា PDF', 'Print / Download PDF')}
                                  >
                                    <MdDownload size={14} color="#64748b" /> PDF
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

              {/* === TAB 2: COMPANY & ADMIN PROFILE === */}
              {activeDetailTab === 'company' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, width: '100%' }}>
                  {/* Left Column: Workspace Portal & Company Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Card: Workspace Portal Link */}
                    {workspaceUrl && (
                      <div
                        style={{
                          background: '#ffffff',
                          borderRadius: 16,
                          padding: '18px 20px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <FiGlobe size={16} />
                            </div>
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                              {tr('Workspace Subdomain & Login Portal', 'Workspace Portal')}
                            </span>
                          </div>
                          <span style={{ fontSize: 10.5, fontWeight: 700, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: 10 }}>
                            ACTIVE
                          </span>
                        </div>

                        <div style={{ background: '#f8fafc', borderRadius: 8, padding: '9px 12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <a
                            href={`${workspaceUrl}/auth`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: 12.5, fontWeight: 600, color: '#2563eb', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}
                          >
                            {workspaceUrl}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopy(`${workspaceUrl}/auth`, 'tabPortal')}
                            style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', display: 'flex', flexShrink: 0 }}
                            title={tr('ចម្លង Link', 'Copy Link')}
                          >
                            {copiedKey === 'tabPortal' ? <FiCheck size={13} color="#16a34a" /> : <FiCopy size={13} color="#64748b" />}
                          </button>
                        </div>

                        <a
                          href={`${workspaceUrl}/auth`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            width: '100%',
                            padding: '9px',
                            borderRadius: 8,
                            background: '#0f172a',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: 12.5,
                            textDecoration: 'none',
                            boxSizing: 'border-box',
                            transition: 'all 0.15s',
                          }}
                        >
                          <FiExternalLink size={14} />
                          <span>{tr('ចូលប្រើប្រាស់ Workspace', 'Launch Workspace')}</span>
                        </a>
                      </div>
                    )}

                    {/* Card: Company Profile Details */}
                    <div style={{ background: '#ffffff', borderRadius: 16, padding: '20px 22px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <MdBusiness size={16} />
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                            {tr('ព័ត៌មានក្រុមហ៊ុនទូទៅ', 'Company Profile')}
                          </span>
                        </div>
                        <Link
                          href={`/admin/saas/tenants/edit/${tenant.id}`}
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#2563eb',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <FaRegEdit size={12} />
                          <span>{tr('កែប្រែ', 'Edit')}</span>
                        </Link>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, fontSize: 12.5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b' }}>{tr('ឈ្មោះក្រុមហ៊ុន', 'Company Name')}</span>
                          <strong style={{ color: '#0f172a' }}>{tenant.name}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b' }}>{tr('កូដក្រុមហ៊ុន', 'Tenant Code')}</span>
                          <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: 6, fontWeight: 700, color: '#334155', fontSize: 12, fontFamily: 'monospace' }}>
                            {tenant.code || `TENANT-${tenant.id}`}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b' }}>{tr('លេខទូរស័ព្ទ', 'Phone')}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <strong style={{ color: '#0f172a' }}>{tenant.phone || '-'}</strong>
                            {tenant.phone && (
                              <button
                                type="button"
                                onClick={() => handleCopy(tenant.phone, 'phone')}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, display: 'flex' }}
                              >
                                {copiedKey === 'phone' ? <FiCheck size={12} color="#16a34a" /> : <FiCopy size={12} color="#94a3b8" />}
                              </button>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b' }}>{tr('អ៊ីមែល', 'Email')}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ color: '#0f172a', fontWeight: 600 }}>{tenant.email || '-'}</span>
                            {tenant.email && (
                              <button
                                type="button"
                                onClick={() => handleCopy(tenant.email, 'email')}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, display: 'flex' }}
                              >
                                {copiedKey === 'email' ? <FiCheck size={12} color="#16a34a" /> : <FiCopy size={12} color="#94a3b8" />}
                              </button>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ color: '#64748b' }}>{tr('អាសយដ្ឋាន', 'Address')}</span>
                          <span style={{ color: '#334155', maxWidth: 220, textAlign: 'right' }}>{tenant.address || '-'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b' }}>{tr('កាលបរិច្ឆេទបង្កើត', 'Created Date')}</span>
                          <span style={{ color: '#334155' }}>{formatDate(tenant.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Tenant Admin Account & Plan Summary */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Card: Tenant Admin Account */}
                    <div style={{ background: '#ffffff', borderRadius: 16, padding: '20px 22px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <MdAdminPanelSettings size={18} />
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                          {tr('គណនី Admin ប្រព័ន្ធ', 'Tenant Administrator')}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, fontSize: 12.5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b' }}>{tr('ឈ្មោះអ្នកគ្រប់គ្រង', 'Admin Name')}</span>
                          <strong style={{ color: '#0f172a' }}>{adminUser.name || 'Company Administrator'}</strong>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b' }}>{tr('អ៊ីមែល Login', 'Login Email')}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: '#2563eb', fontWeight: 600 }}>{adminEmail}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(adminEmail, 'adminEmail')}
                              style={{
                                border: 'none',
                                background: '#f1f5f9',
                                borderRadius: 5,
                                padding: '3px 6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                              title={tr('ចម្លង Email', 'Copy Email')}
                            >
                              {copiedKey === 'adminEmail' ? <FiCheck size={12} color="#16a34a" /> : <FiCopy size={12} color="#64748b" />}
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b' }}>{tr('លេខទូរស័ព្ទ Login', 'Phone')}</span>
                          <strong style={{ color: '#0f172a' }}>{adminUser.phone || tenant.phone || '-'}</strong>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b' }}>{tr('តួនាទី', 'Assigned Role')}</span>
                          <span style={{ background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe', padding: '2px 8px', borderRadius: 6, fontWeight: 700, fontSize: 11.5 }}>
                            {adminUser.role || 'COMPANY ADMIN'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b' }}>{tr('ស្ថានភាព', 'Status')}</span>
                          <span style={{ color: '#059669', fontWeight: 700 }}>● {tr('ដំណើរការធម្មតា', 'Active')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Subscription Overview Card */}
                    <div style={{ background: '#f8fafc', borderRadius: 16, padding: '18px 20px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
                        {tr('ព័ត៌មានកញ្ចប់សេវាបច្ចុប្បន្ន', 'Current Subscription Plan')}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 12.5 }}>
                        <span style={{ color: '#64748b' }}>{tr('កញ្ចប់សេវា', 'Plan Tier')}</span>
                        <strong style={{ color: '#2563eb' }}>{currentPlan.name || 'Professional'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 12.5 }}>
                        <span style={{ color: '#64748b' }}>{tr('វដ្តទូទាត់', 'Billing Cycle')}</span>
                        <span style={{ color: '#0f172a', fontWeight: 600 }}>
                          {activeSub?.billingCycle === 'yearly' ? tr('ប្រចាំឆ្នាំ', 'Yearly') : tr('ប្រចាំខែ', 'Monthly')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
                        <span style={{ color: '#64748b' }}>{tr('កាលបរិច្ឆេទផុតកំណត់', 'Expiry Date')}</span>
                        <span style={{ color: '#b45309', fontWeight: 700 }}>{formatDate(activeSub?.currentPeriodEnd)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* === TAB 3: PLAN QUOTAS & SPECS === */}
              {activeDetailTab === 'quotas' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
                  <div style={{ background: '#ffffff', borderRadius: 16, padding: '22px 24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #f1f5f9' }}>
                      <div>
                        <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                          {tr('ដែនកំណត់ធនធានប្រព័ន្ធ', 'Plan Quotas & System Limits')}
                        </h2>
                        <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>
                          {tr(`អនុញ្ញាតសម្រាប់កញ្ចប់សេវា ${currentPlan.name || 'Professional'}`, `Allowed quota limits for ${currentPlan.name || 'Professional'} plan`)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleOpenRenewModal}
                        style={{
                          padding: '7px 14px',
                          borderRadius: 8,
                          border: 'none',
                          background: '#2563eb',
                          color: '#ffffff',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                        }}
                      >
                        <MdAutorenew size={15} />
                        <span>{tr('បន្តសុពលភាព / ដំឡើងកញ្ចប់', 'Renew / Extend Quota')}</span>
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                      <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>{tr('បុគ្គលិក', 'Staff Users')}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                          {currentPlan.maxUsers || tr('មិនកំណត់', 'Unlimited')}
                        </div>
                      </div>

                      <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>{tr('អ្នកដឹកជញ្ជូន', 'Drivers')}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                          {currentPlan.maxDrivers || tr('មិនកំណត់', 'Unlimited')}
                        </div>
                      </div>

                      <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>{tr('ហាងដៃគូ', 'Merchants')}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                          {currentPlan.maxMerchants || tr('មិនកំណត់', 'Unlimited')}
                        </div>
                      </div>

                      <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>{tr('ការបញ្ជាទិញ/ខែ', 'Orders / Month')}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                          {currentPlan.maxOrdersPerMonth || tr('មិនកំណត់', 'Unlimited')}
                        </div>
                      </div>

                      <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>{tr('យានយន្ត', 'Vehicles')}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                          {currentPlan.maxVehicles || tr('មិនកំណត់', 'Unlimited')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* RENEW SUBSCRIPTION MODAL */}
      {showRenewModal && activeSub && (
        <div
          onClick={() => setShowRenewModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 460,
              boxShadow: '0 20px 40px -12px rgba(15, 23, 42, 0.25)',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MdAutorenew size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                    {tr('បន្តសុពលភាពក្រុមហ៊ុន', 'Extend Subscription Validity')}
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
                    {tenant?.name}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRenewModal(false)}
                style={{ border: 'none', background: 'transparent', fontSize: 18, color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px 22px' }}>
              <div style={{ fontSize: 12.5, color: '#334155', marginBottom: 10, fontWeight: 600 }}>
                {tr('ជ្រើសរើសរយៈពេលបន្ត៖', 'Select Extension Duration:')}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {[
                  { key: '1y', label: tr('១ ឆ្នាំ', '+1 Year') },
                  { key: '6m', label: tr('៦ ខែ', '+6 Months') },
                  { key: '1m', label: tr('១ ខែ', '+1 Month') },
                  { key: 'custom', label: tr('កំណត់ថ្ងៃខ្លួនឯង', 'Custom Date') },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleSelectDuration(opt.key as any)}
                    style={{
                      padding: '9px',
                      borderRadius: 8,
                      border: renewDuration === opt.key ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                      background: renewDuration === opt.key ? '#eff6ff' : '#ffffff',
                      color: renewDuration === opt.key ? '#1d4ed8' : '#334155',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {renewDuration === 'custom' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    {tr('ថ្ងៃផុតកំណត់ថ្មី', 'New Expiration Date')}
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              {/* Invoice Generation Box */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px', border: '1px solid #e2e8f0', marginTop: 10, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: renewCreateInvoice ? 10 : 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontWeight: 700, fontSize: 12.5, color: '#0f172a', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={renewCreateInvoice}
                      onChange={(e) => setRenewCreateInvoice(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: '#2563eb', cursor: 'pointer' }}
                    />
                    <span>{tr('បង្កើតវិក្កយបត្រថ្មី', 'Generate New Invoice')}</span>
                  </label>
                  <span style={{ fontSize: 10.5, background: renewCreateInvoice ? '#ecfdf5' : '#f1f5f9', color: renewCreateInvoice ? '#047857' : '#64748b', border: `1px solid ${renewCreateInvoice ? '#a7f3d0' : '#e2e8f0'}`, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                    {renewCreateInvoice ? tr('✓ បង្កើតស្វ័យប្រវត្តិ', '✓ Enabled') : tr('✕ មិនបង្កើត', '✕ Off')}
                  </span>
                </div>

                {renewCreateInvoice && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10, borderTop: '1px dashed #cbd5e1' }}>
                    {/* Amount */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <label style={{ fontSize: 11.5, fontWeight: 600, color: '#475569' }}>
                          {tr('ទឹកប្រាក់វិក្កយបត្រ', 'Invoice Amount ($)')}
                        </label>
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          Plan: {currentPlan.name || 'Professional'}
                        </span>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#64748b', fontSize: 13 }}>$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={renewAmount}
                          onChange={(e) => setRenewAmount(parseFloat(e.target.value) || 0)}
                          style={{ width: '100%', padding: '8px 10px 8px 24px', borderRadius: 7, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>

                    {/* Status & Payment Method */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                          {tr('ស្ថានភាពវិក្កយបត្រ', 'Invoice Status')}
                        </label>
                        <select
                          value={renewInvoiceStatus}
                          onChange={(e) => setRenewInvoiceStatus(e.target.value as any)}
                          style={{ width: '100%', padding: '7px 8px', borderRadius: 7, border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 600, outline: 'none', background: '#fff', cursor: 'pointer' }}
                        >
                          <option value="paid">{tr('បង់រួច', 'PAID')}</option>
                          <option value="pending">{tr('មិនទាន់បង់', 'PENDING')}</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                          {tr('វិធីសាស្ត្រទូទាត់', 'Payment Method')}
                        </label>
                        <select
                          value={renewPaymentMethod}
                          onChange={(e) => setRenewPaymentMethod(e.target.value)}
                          style={{ width: '100%', padding: '7px 8px', borderRadius: 7, border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 600, outline: 'none', background: '#fff', cursor: 'pointer' }}
                        >
                          <option value="aba_khqr">KHQR / ABA Bank</option>
                          <option value="bank_transfer">{tr('ផ្ទេរប្រាក់ធនាគារ', 'Bank Transfer')}</option>
                          <option value="cash">{tr('សាច់ប្រាក់សុទ្ធ', 'Cash')}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setShowRenewModal(false)}
                  style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}
                >
                  {tr('បោះបង់', 'Cancel')}
                </button>
                <button
                  type="button"
                  disabled={renewing}
                  onClick={handleConfirmRenew}
                  style={{ flex: 2, padding: '9px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: 12.5, cursor: renewing ? 'not-allowed' : 'pointer' }}
                >
                  {renewing ? tr('កំពុងបន្ត...', 'Extending...') : tr('បញ្ជាក់ការបន្ត', 'Confirm Renewal')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE INVOICE MODAL */}
      {showCreateInvoiceModal && (
        <div
          onClick={() => setShowCreateInvoiceModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: 16,
              width: '100%',
              maxWidth: 460,
              boxShadow: '0 20px 40px -12px rgba(15, 23, 42, 0.25)',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MdReceiptLong size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                    {tr('ចេញវិក្កយបត្រថ្មីជូនក្រុមហ៊ុន', 'Issue New Invoice')}
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
                    {tenant?.name}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateInvoiceModal(false)}
                style={{ border: 'none', background: 'transparent', fontSize: 18, color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit} style={{ padding: '20px 22px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                    {tr('វដ្តទូទាត់', 'Billing Cycle')}
                  </label>
                  <select
                    value={invoiceForm.billingCycle}
                    onChange={(e) => {
                      const cycle = e.target.value;
                      const price = cycle === 'yearly' ? Number(currentPlan.priceYearly || 490) : Number(currentPlan.priceMonthly || 49);
                      setInvoiceForm((prev) => ({ ...prev, billingCycle: cycle, amount: price }));
                    }}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5, outline: 'none', background: '#fff', fontWeight: 600 }}
                  >
                    <option value="monthly">{tr('ប្រចាំខែ', 'Monthly')}</option>
                    <option value="yearly">{tr('ប្រចាំឆ្នាំ', 'Yearly')}</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                    {tr('ទឹកប្រាក់សរុប', 'Total Amount (USD)')} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={invoiceForm.amount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13.5, fontWeight: 800, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                    {tr('ថ្ងៃផុតកំណត់បង់ប្រាក់', 'Due Date')} *
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateInvoiceModal(false)}
                  style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}
                >
                  {tr('បោះបង់', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={creatingInvoice}
                  style={{ flex: 2, padding: '9px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: 12.5, cursor: creatingInvoice ? 'not-allowed' : 'pointer' }}
                >
                  {creatingInvoice ? tr('កំពុងបង្កើត...', 'Creating...') : tr('ចេញវិក្កយបត្រ', 'Issue Invoice')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
