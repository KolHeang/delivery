'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { saasApi, Plan } from '@/lib/saas-api';
import { isAuthenticated, setAuth, getUser } from '@/lib/auth';
import {
  MdQrCodeScanner,
  MdCheckCircle,
  MdCreditCard,
  MdLocalOffer,
  MdArrowBack,
  MdLock,
  MdVerified,
  MdCardGiftcard,
  MdBusiness,
  MdLanguage,
  MdPerson,
  MdEmail,
  MdPhone,
  MdVpnKey,
  MdOpenInNew,
  MdBolt,
  MdShield,
} from 'react-icons/md';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planIdParam = searchParams.get('planId') || '1';
  const cycleParam = (searchParams.get('cycle') as 'monthly' | 'yearly') || 'monthly';
  const refParam = searchParams.get('ref') || searchParams.get('coupon') || '';

  const [plan, setPlan] = useState<Plan | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(cycleParam);
  const [couponCode, setCouponCode] = useState(refParam.toUpperCase());
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [isAutoApplied, setIsAutoApplied] = useState(false);

  // Business & Domain Form State
  const [companyName, setCompanyName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [paymentMethod, setPaymentMethod] = useState<'khqr' | 'card' | 'mock'>('khqr');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [workspaceData, setWorkspaceData] = useState<any>(null);

  const [existingSub, setExistingSub] = useState<any>(null);
  const [loadingSub, setLoadingSub] = useState(true);

  const loggedUser = typeof window !== 'undefined' ? getUser() : null;

  useEffect(() => {
    fetchPlan();
    checkExistingSubscription();
  }, [planIdParam]);

  const checkExistingSubscription = async () => {
    if (!isAuthenticated()) {
      setLoadingSub(false);
      return;
    }
    try {
      const res = await saasApi.getMySubscription();
      if (res && res.hasSubscription) {
        setExistingSub(res);
        setCompanyName(res.companyName || '');
        setSubdomain(res.subdomain || '');
        if (res.customDomain) setCustomDomain(res.customDomain);
      }
    } catch (e) {
      // not subscribed or guest
    } finally {
      setLoadingSub(false);
    }
  };

  // Pre-fill user details if already logged in
  useEffect(() => {
    if (loggedUser) {
      if (!adminName) setAdminName(loggedUser.name || '');
      if (!email) setEmail(loggedUser.email || '');
      if (!phone && loggedUser.phone) setPhone(loggedUser.phone);
    }
  }, [loggedUser]);

  const fetchPlan = async () => {
    try {
      const data = await saasApi.getPlanById(planIdParam);
      setPlan(data);
    } catch (err) {
      console.error('Failed to load plan:', err);
    }
  };

  const rawPrice = plan
    ? billingCycle === 'yearly'
      ? Number(plan.priceYearly)
      : Number(plan.priceMonthly)
    : 0;

  // Auto slugify company name to subdomain
  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCompanyName(val);
    if (!subdomain || subdomain === companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')) {
      const slug = val
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setSubdomain(slug);
    }
  };

  // Auto-apply referral code when plan and price are available
  useEffect(() => {
    if (rawPrice > 0 && refParam && !appliedCoupon && !isAutoApplied) {
      setIsAutoApplied(true);
      applyCoupon(refParam.toUpperCase(), rawPrice);
    }
  }, [rawPrice, refParam, appliedCoupon, isAutoApplied]);

  const applyCoupon = async (codeToApply: string, price: number) => {
    if (!codeToApply.trim() || price <= 0) return;
    try {
      setCouponLoading(true);
      setCouponError('');
      const res = await saasApi.validateCoupon(codeToApply.trim(), price);
      setAppliedCoupon(res);
      setCouponCode(codeToApply.trim().toUpperCase());
    } catch (err: any) {
      setCouponError(err.response?.data?.message || 'កូដបញ្ចុះតម្លៃមិនត្រឹមត្រូវ ឬផុតកំណត់');
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleManualApplyCoupon = () => {
    applyCoupon(couponCode, rawPrice);
  };

  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalTotal = Math.max(0, rawPrice - discountAmount);

  const validateForm = () => {
    // If upgrading an existing subscription, no need to re-validate registration fields
    if (existingSub && existingSub.hasSubscription) {
      return true;
    }

    const errors: Record<string, string> = {};
    if (!companyName.trim()) errors.companyName = 'សូមបញ្ចូលឈ្មោះក្រុមហ៊ុន ឬអាជីវកម្ម';
    if (!subdomain.trim()) errors.subdomain = 'សូមបញ្ចូល Subdomain សម្រាប់ប្រព័ន្ធរបស់អ្នក';
    if (!loggedUser) {
      if (!adminName.trim()) errors.adminName = 'សូមបញ្ចូលឈ្មោះអ្នកគ្រប់គ្រង';
      if (!email.trim()) errors.email = 'សូមបញ្ចូលអ៊ីមែល';
      if (!password.trim() || password.length < 6) errors.password = 'ពាក្យសម្ងាត់យ៉ាងតិច ៦ ខ្ទង់';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProcessCheckout = async () => {
    if (!plan) return;

    if (!validateForm()) {
      window.scrollTo({ top: 120, behavior: 'smooth' });
      return;
    }

    try {
      setIsProcessing(true);
      let checkoutRes: any;

      if (!isAuthenticated()) {
        // All-in-One: Register User + Create Subscription + Invoice in one step
        checkoutRes = await saasApi.registerAndCheckout({
          planId: plan.id,
          billingCycle,
          couponCode: appliedCoupon ? appliedCoupon.coupon.code : couponCode || undefined,
          companyName: companyName.trim(),
          subdomain: subdomain.trim(),
          customDomain: customDomain.trim() || undefined,
          adminName: adminName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          password: password || '123456',
        });

        // Auto-login with received token
        if (checkoutRes.access_token && checkoutRes.user) {
          setAuth(checkoutRes.access_token, checkoutRes.user);
        }
      } else {
        // Logged-in user checkout
        checkoutRes = await saasApi.checkout({
          planId: plan.id,
          billingCycle,
          couponCode: appliedCoupon ? appliedCoupon.coupon.code : couponCode || undefined,
          companyName: companyName.trim(),
          subdomain: subdomain.trim(),
          customDomain: customDomain.trim() || undefined,
        });
      }

      const invoice = checkoutRes.invoice;
      setInvoiceData(invoice);
      setWorkspaceData({
        companyName: companyName || 'My Delivery System',
        subdomain: subdomain || 'workspace',
        url: `https://${subdomain || 'workspace'}.ebsexpress.com`,
      });

      // 2. Process Payment immediately
      await saasApi.processPayment({
        invoiceId: invoice.id,
        paymentMethod,
        transactionId: 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      });

      setPaymentSuccess(true);
    } catch (err: any) {
      console.error('Checkout error:', err);
      alert(err.response?.data?.message || 'ការទូទាត់មានបញ្ហា សូមពិនិត្យព័ត៌មាន និងព្យាយាមម្តងទៀត');
    } finally {
      setIsProcessing(false);
    }
  };

  // SUCCESS SCREEN
  if (paymentSuccess) {
    return (
      <div style={{ maxWidth: 680, margin: '50px auto', padding: '0 16px', textAlign: 'center' }}>
        <div
          style={{
            background: '#fff',
            borderRadius: 24,
            padding: '48px 36px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.08)',
          }}
        >
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 10px 25px rgba(16,185,129,0.35)',
            }}
          >
            <MdVerified size={48} />
          </div>

          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>
            {existingSub && existingSub.hasSubscription
              ? 'បានប្តូរកញ្ចប់សេវាជោគជ័យ! 🎉'
              : 'Workspace ត្រូវបានបង្កើតជោគជ័យ! 🎉'}
          </h2>
          <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.6, marginBottom: 28 }}>
            {existingSub && existingSub.hasSubscription
              ? `កញ្ចប់សេវាថ្មីសម្រាប់ក្រុមហ៊ុន ${workspaceData?.companyName || existingSub.companyName} ត្រូវបាន Activate ជោគជ័យ!`
              : `សូមអបអរសាទរ! ប្រព័ន្ធគ្រប់គ្រងការដឹកជញ្ជូនសម្រាប់ក្រុមហ៊ុន ${workspaceData?.companyName} ត្រូវបានបើកដំណើរការរួចរាល់ហើយ។`}
          </p>

          {/* Workspace URL highlight box */}
          <div
            style={{
              background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
              border: '2px solid #86efac',
              borderRadius: 16,
              padding: '20px',
              marginBottom: 24,
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 800, color: '#15803d', textTransform: 'uppercase' }}>
              តំណភ្ជាប់ Workspace ផ្ទាល់ខ្លួន (Workspace URL):
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 6,
                background: '#fff',
                padding: '10px 16px',
                borderRadius: 10,
                border: '1px solid #bbf7d0',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 800, color: '#047857' }}>
                {workspaceData?.url}
              </span>
              <span style={{ fontSize: 12, background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                ONLINE
              </span>
            </div>
          </div>

          <div
            style={{
              background: '#f8fafc',
              borderRadius: 16,
              padding: '20px',
              marginBottom: 32,
              textAlign: 'left',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
              <span style={{ color: '#64748b' }}>កញ្ចប់សេវា៖</span>
              <strong style={{ color: '#0f172a' }}>{plan?.name} ({billingCycle})</strong>
            </div>
            {appliedCoupon && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
                <span style={{ color: '#64748b' }}>កូដបញ្ចុះតម្លៃពីដៃគូ ({appliedCoupon.coupon.code})៖</span>
                <strong style={{ color: '#16a34a' }}>-${discountAmount.toFixed(2)}</strong>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
              <span style={{ color: '#64748b' }}>ចំនួនទឹកប្រាក់បង់សរុប៖</span>
              <strong style={{ color: '#16a34a', fontSize: 18 }}>${finalTotal.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: '#64748b' }}>ស្ថានភាពវិក្កយបត្រ ({invoiceData?.invoiceNumber})៖</span>
              <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 10px', borderRadius: 12, fontWeight: 700, fontSize: 12 }}>
                PAID & ACTIVE
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                padding: '14px 32px',
                borderRadius: 14,
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#fff',
                fontWeight: 800,
                fontSize: 16,
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(99,102,241,0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>ចូលប្រើប្រាស់ Dashboard ឥឡូវនេះ</span>
              <MdOpenInNew size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1160, margin: '0 auto', padding: '32px 16px' }}>
      <button
        onClick={() => router.push(`/pricing${refParam ? `?ref=${refParam}` : ''}`)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          color: '#64748b',
          fontWeight: 600,
          fontSize: 14,
          cursor: 'pointer',
          marginBottom: 20,
        }}
      >
        <MdArrowBack size={18} /> ត្រឡប់ទៅកាន់ទំព័រតម្លៃ (Back to Pricing)
      </button>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
          ចុះឈ្មោះបង្កើត Workspace & ជាវកញ្ចប់សេវា (All-in-One Checkout)
        </h1>
        <p style={{ fontSize: 15, color: '#64748b', margin: 0 }}>
          បំពេញព័ត៌មានក្រុមហ៊ុន កំណត់ Domain ប្រព័ន្ធ និងទូទាត់ប្រាក់ដើម្បីបើកដំណើរការ Workspace ភ្លាមៗ
        </p>
      </div>

      {/* Auto Referral Notice Banner if applied */}
      {appliedCoupon && (
        <div
          style={{
            background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
            border: '1.5px solid #86efac',
            borderRadius: 16,
            padding: '16px 20px',
            marginBottom: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#10b981',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <MdCardGiftcard size={24} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#065f46' }}>
                កូដដៃគូសហការ ({appliedCoupon.coupon.code}) ត្រូវបានអនុវត្តរួចរាល់!
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#047857' }}>
                ទទួលបានការបញ្ចុះតម្លៃ{' '}
                <strong>
                  {appliedCoupon.coupon.discountType === 'percentage'
                    ? `${appliedCoupon.coupon.discountValue}%`
                    : `$${appliedCoupon.coupon.discountValue}`}
                </strong>{' '}
                {appliedCoupon.coupon.partner ? `តាមរយៈដៃគូ ${appliedCoupon.coupon.partner.name}` : ''}
              </p>
            </div>
          </div>
          <div
            style={{
              background: '#fff',
              color: '#15803d',
              padding: '6px 14px',
              borderRadius: 8,
              fontWeight: 800,
              fontSize: 13,
              border: '1px solid #a7f3d0',
            }}
          >
            សន្សំប្រាក់ ${discountAmount.toFixed(2)}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 32 }}>
        {/* Left Side: Business & Domain Setup + Payment Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* If already has workspace, show compact upgrade header instead of new setup form */}
          {existingSub && existingSub.hasSubscription ? (
            <div
              style={{
                background: '#fff',
                borderRadius: 20,
                padding: '24px 28px',
                border: '1.5px solid #bfdbfe',
                boxShadow: '0 4px 16px rgba(37,99,235,0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: '#eff6ff',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                    }}
                  >
                    🏢
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>
                        {existingSub.companyName || 'Workspace របស់អ្នក'}
                      </h3>
                      <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 12, fontWeight: 800 }}>
                        WORKSPACE បច្ចុប្បន្ន
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#6366f1', fontWeight: 700, marginTop: 2 }}>
                      {existingSub.subdomain ? `${existingSub.subdomain}.ebsexpress.com` : ''}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 12, color: '#64748b', display: 'block', fontWeight: 600 }}>ប្តូរពីគម្រោង៖</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#475569' }}>
                    {existingSub.plan?.name || 'Current Plan'} ➔ <strong style={{ color: '#2563eb' }}>{plan?.name}</strong>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Section 1: Business & Domain Setup (New Users) */}
              <div
                style={{
                  background: '#fff',
                  borderRadius: 20,
                  padding: '28px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: '#e0e7ff',
                      color: '#4f46e5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MdBusiness size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      ១. ព័ត៌មានក្រុមហ៊ុន & Workspace Domain
                    </h3>
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      កំណត់ឈ្មោះអាជីវកម្ម និង URL ប្រព័ន្ធគ្រប់គ្រងផ្ទាល់ខ្លួន
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Company Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      ឈ្មោះក្រុមហ៊ុន / អាជីវកម្មដឹកជញ្ជូន <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="ឧ. Angkor Express Delivery, Phnom Penh Logistics"
                      value={companyName}
                      onChange={handleCompanyNameChange}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: 10,
                        border: formErrors.companyName ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    />
                    {formErrors.companyName && (
                      <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{formErrors.companyName}</p>
                    )}
                  </div>

                  {/* Subdomain */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Workspace Subdomain (URL សម្រាប់បុគ្គលិកចូលប្រើ) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRight: 'none',
                          padding: '11px 12px',
                          borderTopLeftRadius: 10,
                          borderBottomLeftRadius: 10,
                          color: '#64748b',
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        https://
                      </span>
                      <input
                        type="text"
                        placeholder="angkorexpress"
                        value={subdomain}
                        onChange={(e) =>
                          setSubdomain(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9-]/g, '')
                          )
                        }
                        style={{
                          flex: 1,
                          padding: '11px 12px',
                          border: formErrors.subdomain ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                          borderRadius: 0,
                          fontSize: 14,
                          fontWeight: 700,
                          color: '#4f46e5',
                        }}
                      />
                      <span
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderLeft: 'none',
                          padding: '11px 12px',
                          borderTopRightRadius: 10,
                          borderBottomRightRadius: 10,
                          color: '#64748b',
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        .ebsexpress.com
                      </span>
                    </div>
                    {formErrors.subdomain && (
                      <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{formErrors.subdomain}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: Admin Account Registration (if not logged in) */}
              {!loggedUser && (
                <div
                  style={{
                    background: '#fff',
                    borderRadius: 20,
                    padding: '28px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: '#fef3c7',
                        color: '#d97706',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MdPerson size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        ២. បង្កើតគណនី Admin គ្រប់គ្រង Workspace
                      </h3>
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        ព័ត៌មានសម្រាប់ Login គ្រប់គ្រងការងារដឹកជញ្ជូន
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        ឈ្មោះអ្នកគ្រប់គ្រង (Admin Full Name) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }}>
                          <MdPerson size={18} />
                        </span>
                        <input
                          type="text"
                          placeholder="ឧ. Sok Dara"
                          value={adminName}
                          onChange={(e) => setAdminName(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '11px 12px 11px 38px',
                            borderRadius: 10,
                            border: formErrors.adminName ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                            fontSize: 14,
                          }}
                        />
                      </div>
                      {formErrors.adminName && (
                        <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{formErrors.adminName}</p>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                          អ៊ីមែល (Email) <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }}>
                            <MdEmail size={18} />
                          </span>
                          <input
                            type="email"
                            placeholder="admin@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '11px 12px 11px 38px',
                              borderRadius: 10,
                              border: formErrors.email ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                              fontSize: 14,
                            }}
                          />
                        </div>
                        {formErrors.email && (
                          <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{formErrors.email}</p>
                        )}
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                          លេខទូរស័ព្ទ (Phone)
                        </label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }}>
                            <MdPhone size={18} />
                          </span>
                          <input
                            type="text"
                            placeholder="012 345 678"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '11px 12px 11px 38px',
                              borderRadius: 10,
                              border: '1px solid #cbd5e1',
                              fontSize: 14,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        ពាក្យសម្ងាត់ (Password) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }}>
                          <MdVpnKey size={18} />
                        </span>
                        <input
                          type="password"
                          placeholder="យ៉ាងតិច ៦ ខ្ទង់"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '11px 12px 11px 38px',
                            borderRadius: 10,
                            border: formErrors.password ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                            fontSize: 14,
                          }}
                        />
                      </div>
                      {formErrors.password && (
                        <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>{formErrors.password}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Section 3: Payment Method */}
          <div
            style={{
              background: '#fff',
              borderRadius: 20,
              padding: '28px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MdQrCodeScanner size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {loggedUser ? '២' : '៣'}. ជ្រើសរើសវិធីសាស្ត្រទូទាត់ប្រាក់
                </h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  ទូទាត់រហ័ស និងមានសុវត្ថិភាព 100%
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <label
                onClick={() => setPaymentMethod('khqr')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '16px',
                  borderRadius: 14,
                  border: paymentMethod === 'khqr' ? '2px solid #6366f1' : '1px solid #cbd5e1',
                  background: paymentMethod === 'khqr' ? '#f5f3ff' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: '#e0e7ff',
                    color: '#6366f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MdQrCodeScanner size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                    Bakong KHQR (ABA, ACLEDA, Canadia, etc.)
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    ស្កេនទូទាត់ភ្លាមៗជាមួយគ្រប់ Mobile Banking App
                  </div>
                </div>
                {paymentMethod === 'khqr' && <MdCheckCircle color="#6366f1" size={22} />}
              </label>

              <label
                onClick={() => setPaymentMethod('card')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '16px',
                  borderRadius: 14,
                  border: paymentMethod === 'card' ? '2px solid #6366f1' : '1px solid #cbd5e1',
                  background: paymentMethod === 'card' ? '#f5f3ff' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: '#fef3c7',
                    color: '#d97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MdCreditCard size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                    Visa / Mastercard / Credit Card
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    ទូទាត់តាមកាតឥណទាន ឬឥណពន្ធអន្តរជាតិ
                  </div>
                </div>
                {paymentMethod === 'card' && <MdCheckCircle color="#6366f1" size={22} />}
              </label>
            </div>

            {/* KHQR Mock */}
            {paymentMethod === 'khqr' && (
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: 16,
                  padding: '20px',
                  textAlign: 'center',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div
                  style={{
                    display: 'inline-block',
                    padding: 12,
                    background: '#fff',
                    borderRadius: 12,
                    border: '1px solid #cbd5e1',
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      width: 130,
                      height: 130,
                      background: 'repeating-linear-gradient(45deg, #0f172a, #0f172a 10px, #ffffff 10px, #ffffff 20px)',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: 12,
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ background: '#0f172a', padding: '6px 10px', borderRadius: 6 }}>
                      KHQR DEMO<br />${finalTotal.toFixed(2)}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: '#64748b', fontWeight: 600, margin: 0 }}>
                  ស្កេន KHQR ដើម្បីទូទាត់ទឹកប្រាក់ <strong>${finalTotal.toFixed(2)}</strong>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Order Summary & Action */}
        <div>
          <div
            style={{
              background: '#fff',
              borderRadius: 20,
              padding: '28px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              position: 'sticky',
              top: 20,
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 20 }}>
              សង្ខេបកញ្ចប់សេវា (Order Summary)
            </h3>

            {plan ? (
              <div>
                <div
                  style={{
                    background: '#f8fafc',
                    borderRadius: 14,
                    padding: '16px',
                    marginBottom: 20,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <h4 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                          {plan.name}
                        </h4>
                        {plan.isPopular && (
                          <span style={{ fontSize: 10, background: '#6366f1', color: '#fff', padding: '2px 6px', borderRadius: 6, fontWeight: 800 }}>
                            POPULAR
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 12.5, color: '#64748b', margin: '4px 0 0' }}>
                        វដ្តបង់ប្រាក់៖{' '}
                        <strong>{billingCycle === 'yearly' ? 'ប្រចាំឆ្នាំ (Yearly - សន្សំ 20%)' : 'ប្រចាំខែ (Monthly)'}</strong>
                      </p>
                    </div>
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                      ${rawPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Coupon Input */}
                <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: 20, marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                    កូដបញ្ចុះតម្លៃ ឬ Promo Code
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <span style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }}>
                        <MdLocalOffer size={18} />
                      </span>
                      <input
                        type="text"
                        placeholder="ឧ. PARTNER15"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        style={{
                          width: '100%',
                          padding: '10px 12px 10px 38px',
                          borderRadius: 10,
                          border: '1px solid #cbd5e1',
                          fontSize: 14,
                          fontWeight: 700,
                        }}
                      />
                    </div>
                    <button
                      onClick={handleManualApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      style={{
                        padding: '10px 20px',
                        borderRadius: 10,
                        border: 'none',
                        background: '#0f172a',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      {couponLoading ? '...' : 'បញ្ចុះតម្លៃ'}
                    </button>
                  </div>

                  {couponError && (
                    <p style={{ fontSize: 12, color: '#ef4444', marginTop: 6, fontWeight: 600 }}>
                      {couponError}
                    </p>
                  )}

                  {appliedCoupon && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        color: '#065f46',
                        fontSize: 13,
                        fontWeight: 600,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MdCheckCircle color="#10b981" size={16} />
                        <span>
                          កូដ <strong>{appliedCoupon.coupon.code}</strong> ត្រូវបានបញ្ចូល!
                        </span>
                      </span>
                      <span style={{ fontWeight: 800, color: '#15803d' }}>
                        -${appliedCoupon.discountAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Price Breakdown */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16, marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14, color: '#64748b' }}>
                    <span>តម្លៃដើម (Subtotal)</span>
                    <span>${rawPrice.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14, color: '#10b981', fontWeight: 600 }}>
                      <span>ការបញ្ចុះតម្លៃ (Discount)</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0', fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                    <span>ទឹកប្រាក់ត្រូវទូទាត់សរុប (Total)</span>
                    <span style={{ color: '#4f46e5', fontSize: 22 }}>${finalTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Submit Checkout Button */}
                <button
                  onClick={handleProcessCheckout}
                  disabled={isProcessing}
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: 14,
                    border: 'none',
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 800,
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    boxShadow: '0 6px 20px rgba(99,102,241,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'all 0.2s',
                  }}
                >
                  <MdLock size={18} />
                  {isProcessing ? 'កំពុងបង្កើត Workspace & ទូទាត់...' : `បញ្ជាក់ការទូទាត់ $${finalTotal.toFixed(2)}`}
                </button>

                <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 14, lineHeight: 1.5 }}>
                  🔒 ការទូទាត់មានសុវត្ថិភាពខ្ពស់ តាមរយៈ SSL 256-bit Encryption<br />
                  ⚡ Workspace នឹងត្រូវបានបើកដំណើរការភ្លាមៗបន្ទាប់ពីទូទាត់
                </p>
              </div>
            ) : (
              <p style={{ color: '#64748b' }}>កំពុងទាញយកព័ត៌មានកញ្ចប់សេវា...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const [isLogged, setIsLogged] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setIsLogged(isAuthenticated());
  }, []);

  if (!isLogged) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
        <header
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              📦
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#0f172a' }}>
                EBSExpress
              </h2>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>SaaS Delivery Onboarding</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => router.push('/auth')}
              style={{
                padding: '8px 18px',
                borderRadius: 10,
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#334155',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              ចូលប្រព័ន្ធ (Login)
            </button>
          </div>
        </header>

        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>កំពុងទាញយក...</div>}>
          <CheckoutContent />
        </Suspense>
      </div>
    );
  }

  return (
    <MainLayout>
      <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>កំពុងទាញយក...</div>}>
        <CheckoutContent />
      </Suspense>
    </MainLayout>
  );
}
