'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { saasApi, SubscriptionInfo, SaasInvoice, SaasPaymentOption } from '@/lib/saas-api';
import {
  MdWorkspacePremium,
  MdReceiptLong,
  MdDownload,
  MdPeople,
  MdDirectionsCar,
  MdLocalShipping,
  MdOpenInNew,
  MdPayment,
  MdCheckCircle,
  MdContentCopy,
  MdClose,
  MdQrCodeScanner,
  MdAccountBalance,
  MdAutorenew,
} from 'react-icons/md';

import { useTenant } from '@/lib/TenantContext';
import { useLanguage } from '@/lib/LanguageContext';
import { printInvoicePdf } from '@/lib/invoice-pdf';
import { getTenantWorkspaceUrl } from '@/lib/domain';
import { formatRemainingDuration } from '@/lib/date-utils';

export default function BillingPage() {
  const router = useRouter();
  const { tenant } = useTenant();
  const { lang } = useLanguage();
  const tr = (km: string, en: string) => (lang === 'km' ? km : en);

  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [invoices, setInvoices] = useState<SaasInvoice[]>([]);
  const [paymentOptions, setPaymentOptions] = useState<SaasPaymentOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Payment Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<SaasInvoice | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentFlowType, setPaymentFlowType] = useState<'offline' | 'aba'>('offline');
  const [offlineSubMethod, setOfflineSubMethod] = useState<'bank_transfer' | 'khqr'>('bank_transfer');
  const [txIdInput, setTxIdInput] = useState('');
  const [txIdError, setTxIdError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, [tenant]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subData, invData, optionsData] = await Promise.all([
        saasApi.getMySubscription().catch(() => null),
        saasApi.getMyInvoices().catch(() => []),
        saasApi.getPaymentOptions().catch(() => []),
      ]);
      setPaymentOptions(optionsData || []);

      if (subData && subData.hasSubscription) {
        setSubInfo(subData);
      } else {
        // Fallback: Check if there's a paid invoice or tenant plan to display active subscription
        const paidInvoice = (invData || []).find((inv: any) => inv.status === 'paid');
        if (paidInvoice || tenant?.plan) {
          const invSub = paidInvoice?.subscription;
          setSubInfo({
            hasSubscription: true,
            status: (invSub?.status || 'active') as any,
            billingCycle: invSub?.billingCycle || 'yearly',
            plan: invSub?.plan || {
              id: 1,
              name: tenant?.plan?.name || 'Professional Plan',
              slug: 'pro',
              description: tr('កញ្ចប់ពេញនិយមបំផុត សម្រាប់ក្រុមហ៊ុនដឹកជញ្ជូនដែលកំពុងរីកចម្រើន', 'Most popular package for growing logistics companies'),
              priceMonthly: 49,
              priceYearly: paidInvoice?.totalAmount || 490,
              maxUsers: tenant?.plan?.limits?.maxUsers || 10,
              maxOrdersPerMonth: tenant?.plan?.limits?.maxOrders || 5000,
              maxDrivers: tenant?.plan?.limits?.maxDrivers || 25,
              maxVehicles: 20,
              features: tenant?.plan?.features || {},
              isActive: true,
              isPopular: true,
            },
            companyName: tenant?.companyName || 'EBS Express',
            currentPeriodStart: invSub?.currentPeriodStart || paidInvoice?.createdAt || new Date().toISOString(),
            currentPeriodEnd: invSub?.currentPeriodEnd || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            daysRemaining: 365,
            limits: {
              maxUsers: tenant?.plan?.limits?.maxUsers || 10,
              maxDrivers: tenant?.plan?.limits?.maxDrivers || 25,
              maxVehicles: 20,
              maxOrdersPerMonth: tenant?.plan?.limits?.maxOrders || 5000,
            },
          });
        } else {
          setSubInfo(subData);
        }
      }
      setInvoices(invData || []);
    } catch (err) {
      console.error('Failed to fetch billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayment = (inv?: SaasInvoice) => {
    if (inv) {
      setSelectedInvoice(inv);
    } else {
      const pending = invoices.find((i) => i.status === 'pending');
      if (pending) {
        setSelectedInvoice(pending);
      } else if (invoices.length > 0) {
        setSelectedInvoice(invoices[0]);
      } else {
        setSelectedInvoice({
          id: 1,
          invoiceNumber: `INV-${new Date().getFullYear()}-00001`,
          subtotal: subInfo?.plan?.priceYearly || 490,
          discountAmount: 0,
          totalAmount: subInfo?.plan?.priceYearly || 490,
          status: 'pending',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        } as SaasInvoice);
      }
    }
    setPaymentFlowType('offline');
    setOfflineSubMethod('bank_transfer');
    setSubmissionMessage('');
    setPaymentSuccess(false);
    setTxIdInput('');
    setTxIdError(null);
    setPaymentModalOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedInvoice) return;
    if (!txIdInput.trim()) {
      setTxIdError(tr('សូមបញ្ចូលលេខកូដប្រតិបត្តិការ (Transaction ID)', 'Please enter Transaction ID'));
      return;
    }
    setTxIdError(null);
    try {
      setPaying(true);
      const res = await saasApi.processPayment({
        invoiceId: selectedInvoice.id,
        paymentMethod: 'offline',
        transactionId: txIdInput.trim(),
      });
      setPaymentSuccess(true);
      setSubmissionMessage(
        res?.message ||
          tr(
            'ការទូទាត់ត្រូវបានផ្ញើជោគជ័យ! សូមរង់ចាំ Admin ពិនិត្យនិងអនុម័ត (Payment submitted! Waiting for Admin SaaS approval).',
            'Payment submitted successfully! Waiting for Admin SaaS approval.'
          )
      );
      setTimeout(() => {
        fetchData();
      }, 1500);
    } catch (err: any) {
      alert(err.response?.data?.message || tr('បរាជ័យក្នុងការទូទាត់', 'Payment submission failed'));
    } finally {
      setPaying(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(label);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const formatDate = (dateStr?: string | Date | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <MainLayout>
      <div style={{ width: '100%', paddingBottom: 40 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: '#eff6ff', color: '#3b82f6', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
              <MdWorkspacePremium size={15} /> {tr('SaaS គម្រោង & វិក្កយបត្រ', 'SaaS Billing & Subscriptions')}
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
              {tr('ការគ្រប់គ្រងគម្រោង & វិក្កយបត្រ', 'Plans & Billing Management')}
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
              {tr('ពិនិត្យមើលស្ថានភាពនៃការជាវសេវា ដែនកំណត់ និងប្រវត្តិវិក្កយបត្ររបស់អ្នក', 'Review your subscription status, resource limits, and billing history')}
            </p>
          </div>

          <button
            onClick={() => handleOpenPayment()}
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 22px',
              fontSize: 13.5,
              fontWeight: 800,
              boxShadow: '0 4px 14px rgba(37,99,235,0.25)',
            }}
          >
            <MdPayment size={18} />
            <span>{tr('បង់ប្រាក់ / បន្តគម្រោង', 'Pay / Renew Plan')}</span>
          </button>
        </div>

        {/* Current Plan Overview Card */}
        {subInfo && subInfo.hasSubscription ? (
          <div
            style={{
              background: '#ffffff',
              borderRadius: 24,
              padding: '36px',
              color: '#0f172a',
              marginBottom: 36,
              boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05)',
              position: 'relative',
              border: '1.5px solid #e2e8f0',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 24 }}>
                <div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#eff6ff',
                      padding: '4px 14px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 800,
                      color: '#2563eb',
                      marginBottom: 12,
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    <MdWorkspacePremium size={14} />
                    <span>{tr('គម្រោងបច្ចុប្បន្ន', 'Current Plan')}</span>
                  </div>

                  <h2 style={{ fontSize: 32, fontWeight: 900, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
                    {subInfo.plan?.name || 'Professional Plan'}
                  </h2>
                  <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
                    {subInfo.plan?.description || tr('កញ្ចប់ពេញនិយមបំផុត សម្រាប់ក្រុមហ៊ុនដឹកជញ្ជូនដែលកំពុងរីកចម្រើន', 'Most popular package for growing logistics companies')}
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 700 }}>
                    {tr('ស្ថានភាព', 'Status')}
                  </div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: subInfo.status === 'active' ? '#ecfdf5' : '#fef2f2',
                      color: subInfo.status === 'active' ? '#059669' : '#dc2626',
                      border: subInfo.status === 'active' ? '1px solid #a7f3d0' : '1px solid #fecaca',
                      padding: '5px 16px',
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: subInfo.status === 'active' ? '#10b981' : '#ef4444' }} />
                    {subInfo.status === 'active' ? tr('សកម្ម', 'ACTIVE') : subInfo.status.toUpperCase()}
                  </span>
                  {(() => {
                    const isExpiringSoon = typeof subInfo.daysRemaining === 'number' && subInfo.daysRemaining <= 60;
                    return (
                      <div style={{ marginTop: 8 }}>
                        <div
                          style={{
                            fontSize: 13,
                            color: isExpiringSoon ? '#dc2626' : '#2563eb',
                            fontWeight: 800,
                          }}
                        >
                          {formatRemainingDuration(subInfo.daysRemaining, lang)}
                        </div>
                        {subInfo.currentPeriodEnd && (
                          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 3, fontWeight: 600 }}>
                            {tr('ផុតកំណត់៖', 'Expires:')}{' '}
                            <span style={{ color: isExpiringSoon ? '#dc2626' : '#0f172a', fontWeight: 700 }}>
                              {formatDate(subInfo.currentPeriodEnd)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Workspace / Domain Badge Card */}
              {subInfo.subdomain && (
                <div
                  style={{
                    background: '#f8fafc',
                    borderRadius: 18,
                    padding: '18px 22px',
                    border: '1.5px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 16,
                    marginBottom: 28,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: '#eff6ff',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        border: '1px solid #bfdbfe',
                      }}
                    >
                      🏢
                    </div>
                    <div>
                      <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {tr('WORKSPACE ក្រុមហ៊ុន & DOMAIN', 'COMPANY WORKSPACE & DOMAIN')}:
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', marginTop: 2 }}>
                        {subInfo.companyName || 'Angkor Express'}{' '}
                        <span style={{ color: '#4f46e5', fontWeight: 700 }}>— {getTenantWorkspaceUrl(subInfo.subdomain)}</span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={getTenantWorkspaceUrl(subInfo.subdomain)}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '10px 20px',
                      borderRadius: 12,
                      background: '#0f172a',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: 13.5,
                      textDecoration: 'none',
                      boxShadow: '0 4px 12px rgba(15,23,42,0.15)',
                    }}
                  >
                    <span>{tr('បើក Workspace', 'Open Workspace')}</span>
                    <MdOpenInNew size={15} />
                  </a>
                </div>
              )}

              {/* Limits Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 16,
                  marginTop: 16,
                }}
              >
                <div
                  style={{
                    background: '#f8fafc',
                    padding: '16px 20px',
                    borderRadius: 16,
                    border: '1.5px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4f46e5', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                    <MdLocalShipping size={18} />
                    <span>{tr('ដែនកំណត់ការដឹក', 'Orders Limit')}</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a' }}>
                    {subInfo.limits?.maxOrdersPerMonth || 3000} <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>{tr('/ ខែ', '/ mo')}</span>
                  </div>
                </div>

                <div
                  style={{
                    background: '#f8fafc',
                    padding: '16px 20px',
                    borderRadius: 16,
                    border: '1.5px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4f46e5', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                    <MdPeople size={18} />
                    <span>{tr('គណនីបុគ្គលិក', 'Staff Accounts')}</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a' }}>
                    {subInfo.limits?.maxUsers || 10} <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>{tr('នាក់', 'staff')}</span>
                  </div>
                </div>

                <div
                  style={{
                    background: '#f8fafc',
                    padding: '16px 20px',
                    borderRadius: 16,
                    border: '1.5px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4f46e5', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                    <MdDirectionsCar size={18} />
                    <span>{tr('ចំនួនអ្នកបើកបរ', 'Drivers Limit')}</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a' }}>
                    {subInfo.limits?.maxDrivers || 25} <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>{tr('នាក់', 'drivers')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: '#fff',
              borderRadius: 20,
              padding: '40px 24px',
              textAlign: 'center',
              border: '1px solid #e2e8f0',
              marginBottom: 32,
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                margin: '0 auto 14px',
              }}
            >
              ⚠️
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              {tr('មិនទាន់មាន Subscription នៅឡើយទេ', 'No Active Subscription Found')}
            </h3>
            <p style={{ fontSize: 13.5, color: '#64748b', maxWidth: 450, margin: '0 auto 18px' }}>
              {tr('សូមជ្រើសរើសកញ្ចប់សេវាកម្មដើម្បីបើកដំណើរការមុខងារប្រព័ន្ធគ្រប់គ្រងដឹកជញ្ជូនពេញលេញ។', 'Please contact Admin to activate your logistics system subscription.')}
            </p>
            <button
              onClick={() => handleOpenPayment()}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 22px',
                fontSize: 13.5,
                fontWeight: 800,
              }}
            >
              <MdPayment size={18} />
              <span>{tr('បង់ប្រាក់ / បើកដំណើរការ Subscription', 'Pay & Activate Subscription')}</span>
            </button>
          </div>
        )}

        {/* Standard Clean Billing History List */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title">🧾 {tr('ប្រវត្តិវិក្កយបត្រ', 'Billing History')}</span>
          </div>

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="saas-custom-table" style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#1565D8', color: '#ffffff' }}>
                  <th style={{ width: 44, textAlign: 'center', whiteSpace: 'nowrap' }}>{tr('ល.រ', 'No.')}</th>
                  <th style={{ whiteSpace: 'nowrap' }}>{tr('លេខវិក្កយបត្រ', 'Invoice No.')}</th>
                  <th style={{ whiteSpace: 'nowrap' }}>{tr('កាលបរិច្ឆេទបង្កើត', 'Created Date')}</th>
                  <th style={{ whiteSpace: 'nowrap' }}>{tr('ថ្ងៃផុតកំណត់', 'Due Date')}</th>
                  <th style={{ whiteSpace: 'nowrap' }}>{tr('តម្លៃដើម', 'Subtotal')}</th>
                  <th style={{ whiteSpace: 'nowrap' }}>{tr('បញ្ចុះតម្លៃ', 'Discount')}</th>
                  <th style={{ whiteSpace: 'nowrap' }}>{tr('ទឹកប្រាក់បង់', 'Total Paid')}</th>
                  <th style={{ whiteSpace: 'nowrap' }}>{tr('ស្ថានភាព', 'Status')}</th>
                  <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{tr('សកម្មភាព', 'Action')}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 13.5 }}>
                      {tr('មិនទាន់មានប្រវត្តិវិក្កយបត្រនៅឡើយទេ', 'No billing history records found')}
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv, idx) => (
                    <tr
                      key={inv.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        fontSize: 13.5,
                        transition: 'background 0.15s',
                      }}
                    >
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
                        {idx + 1}
                      </td>
                      <td style={{ fontWeight: 800, color: '#2563eb', fontFamily: 'monospace' }}>
                        {inv.invoiceNumber}
                      </td>
                      <td style={{ color: '#64748b' }}>
                        {formatDate(inv.createdAt)}
                      </td>
                      <td style={{ color: '#64748b', fontWeight: 600 }}>
                        {formatDate(inv.dueDate || inv.subscription?.currentPeriodEnd || new Date(new Date(inv.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000))}
                      </td>
                      <td style={{ color: '#64748b' }}>
                        ${Number(inv.subtotal).toFixed(2)}
                      </td>
                      <td style={{ color: '#10b981', fontWeight: 700 }}>
                        -${Number(inv.discountAmount).toFixed(2)}
                      </td>
                      <td style={{ fontWeight: 900, color: '#0f172a' }}>
                        ${Number(inv.totalAmount).toFixed(2)}
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '3px 10px',
                            borderRadius: 20,
                            fontSize: 11.5,
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            border: inv.status === 'paid' 
                              ? '1px solid #a7f3d0' 
                              : inv.status === 'pending' 
                                ? '1px solid #fde68a' 
                                : '1px solid #fecaca',
                            background: inv.status === 'paid' 
                              ? '#ecfdf5' 
                              : inv.status === 'pending' 
                                ? '#fef3c7' 
                                : '#fef2f2',
                            color: inv.status === 'paid' 
                              ? '#059669' 
                              : inv.status === 'pending' 
                                ? '#d97706' 
                                : '#dc2626',
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: inv.status === 'paid' 
                                ? '#10b981' 
                                : inv.status === 'pending' 
                                  ? '#f59e0b' 
                                  : '#ef4444',
                            }}
                          />
                          {inv.status === 'paid' ? tr('បង់រួច', 'PAID') : inv.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          {inv.status !== 'paid' && (
                            <button
                              onClick={() => handleOpenPayment(inv)}
                              className="btn btn-primary btn-sm"
                              style={{
                                fontSize: 11.5,
                                fontWeight: 800,
                                padding: '4px 10px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <MdPayment size={13} /> {tr('បង់ប្រាក់', 'Pay')}
                            </button>
                          )}
                          <button
                            onClick={() => printInvoicePdf(inv)}
                            className="btn btn-ghost btn-sm"
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
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
        </div>

        {/* ULTRA-CLEAN LUXURY PAYMENT MODAL */}
        {paymentModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(8px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: 24,
                width: '100%',
                maxWidth: 440,
                boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.2)',
                border: '1px solid #f1f5f9',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Clean Modal Header */}
              <div
                style={{
                  padding: '20px 24px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, margin: '0 0 2px', color: '#0f172a' }}>
                    {tr('ទូទាត់ប្រាក់ការជាវសេវា', 'Subscription Payment')}
                  </h3>
                  <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>
                    {selectedInvoice?.invoiceNumber || 'INV-2026-00001'}
                  </div>
                </div>

                <button
                  onClick={() => setPaymentModalOpen(false)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: '#64748b',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <MdClose size={16} />
                </button>
              </div>

              {/* Success Screen */}
              {/* Success Screen: Pending Admin Approval */}
              {paymentSuccess ? (
                <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <div
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: '50%',
                      background: '#fef3c7',
                      color: '#d97706',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 34,
                      margin: '0 auto 16px',
                      border: '2px solid #fde68a',
                    }}
                  >
                    ⏳
                  </div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 14px',
                      borderRadius: 20,
                      fontSize: 11.5,
                      fontWeight: 800,
                      background: '#ecfdf5',
                      color: '#059669',
                      border: '1px solid #a7f3d0',
                      marginBottom: 10,
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                    {tr('បានផ្ញើការទូទាត់ជោគជ័យ', 'SUBMITTED SUCCESSFULLY')}
                  </span>
                  <h3 style={{ fontSize: 19, fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>
                    {tr('រង់ចាំការពិនិត្យ និងអនុម័តពី Admin SAAS', 'Pending Admin SaaS Approval')}
                  </h3>
                  <p style={{ fontSize: 13, color: '#64748b', margin: '0 auto 20px', maxWidth: 360, lineHeight: 1.6 }}>
                    {submissionMessage ||
                      tr(
                        'យើងបានទទួលព័ត៌មានផ្ទេរប្រាក់របស់អ្នករួចហើយ។ ក្រុមការងារ Admin នឹងពិនិត្យផ្ទៀងផ្ទាត់ និងបើកដំណើរការគម្រោងរបស់អ្នកក្នុងពេលឆាប់ៗ។',
                        'We have received your payment details. Admin will verify and activate your subscription shortly.'
                      )}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentModalOpen(false);
                      setPaymentSuccess(false);
                      fetchData();
                    }}
                    className="btn btn-primary btn-sm"
                    style={{ padding: '8px 24px', borderRadius: 10, fontWeight: 700 }}
                  >
                    {tr('យល់ព្រម', 'Got it')}
                  </button>
                </div>
              ) : (
                <div style={{ padding: '24px' }}>
                  {/* Amount & Invoice Info Card */}
                  <div
                    style={{
                      background: '#f8fafc',
                      borderRadius: 14,
                      padding: '16px 20px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 18,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                        {tr('ទឹកប្រាក់សរុបត្រូវបង់', 'Total Amount Due')}
                      </div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px', marginTop: 2 }}>
                        {'$'}{Number(selectedInvoice?.totalAmount || subInfo?.plan?.priceYearly || 490).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          background: '#ffffff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: 11.5,
                          fontWeight: 800,
                          display: 'inline-block',
                          marginBottom: 4,
                        }}
                      >
                        USD
                      </span>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', fontFamily: 'monospace' }}>
                        {selectedInvoice?.invoiceNumber || '#INV-PENDING'}
                      </div>
                    </div>
                  </div>

                  {/* Bank Account Details */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                      {tr('ព័ត៌មានគណនីធនាគារសម្រាប់ផ្ទេរប្រាក់', 'Bank Account Transfer Details')}:
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {paymentOptions.filter((o) => o.status === 'active').length > 0 ? (
                        paymentOptions
                          .filter((o) => o.status === 'active')
                          .map((opt) => (
                            <div
                              key={opt.id}
                              style={{
                                background: '#ffffff',
                                padding: '14px 16px',
                                borderRadius: 12,
                                border: '1.5px solid #e2e8f0',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <div
                                    style={{
                                      width: 38,
                                      height: 38,
                                      borderRadius: 10,
                                      background: opt.bankName?.toLowerCase().includes('acleda') ? '#0f3b7a' : '#007ba4',
                                      color: '#ffffff',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 900,
                                      fontSize: 10,
                                      letterSpacing: '0.5px',
                                      textTransform: 'uppercase',
                                      flexShrink: 0,
                                    }}
                                  >
                                    {opt.bankName?.slice(0, 3) || 'BANK'}
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                                      {opt.bankName || opt.name} {opt.accountName && `• ${opt.accountName}`}
                                    </div>
                                    <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', marginTop: 1 }}>
                                      {opt.accountNumber || '-'}
                                    </div>
                                  </div>
                                </div>

                                {opt.accountNumber && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(opt.accountNumber!, `opt-${opt.id}`)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 5,
                                      padding: '6px 12px',
                                      borderRadius: 8,
                                      border: '1px solid #e2e8f0',
                                      background: copySuccess === `opt-${opt.id}` ? '#ecfdf5' : '#f8fafc',
                                      color: copySuccess === `opt-${opt.id}` ? '#059669' : '#2563eb',
                                      fontSize: 11.5,
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      transition: 'all 0.15s',
                                    }}
                                  >
                                    {copySuccess === `opt-${opt.id}` ? (
                                      '✅ Copied'
                                    ) : (
                                      <>
                                        <MdContentCopy size={13} />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>

                              {/* Clean QR Code Section */}
                              {opt.qrCodeUrl && (
                                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span>📱</span>
                                    <span>{tr('ស្កេនទូទាត់តាម KHQR / QR Code', 'Scan KHQR Code to Pay')}</span>
                                  </div>
                                  <div style={{ padding: 10, background: '#ffffff', borderRadius: 12, border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'inline-flex', justifyContent: 'center', alignItems: 'center' }}>
                                    <img
                                      src={opt.qrCodeUrl}
                                      alt="Payment QR Code"
                                      style={{ maxWidth: 200, maxHeight: 250, width: 'auto', height: 'auto', objectFit: 'contain', display: 'block', borderRadius: 6 }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                      ) : (
                        <div
                          style={{
                            background: '#ffffff',
                            padding: '14px 16px',
                            borderRadius: 12,
                            border: '1.5px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 10,
                                background: '#007ba4',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 900,
                                fontSize: 10,
                              }}
                            >
                              ABA
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                                ABA Bank • EBS LOGISTICS SAAS CO., LTD.
                              </div>
                              <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', marginTop: 1 }}>
                                000 123 456
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy('000123456', 'aba')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '6px 12px',
                              borderRadius: 8,
                              border: '1px solid #e2e8f0',
                              background: '#f8fafc',
                              color: '#2563eb',
                              fontSize: 11.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <MdContentCopy size={13} /> Copy
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clean Helper Note */}
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 18, lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>💡</span>
                    <span>{tr('សូមផ្ទេរប្រាក់តាមគណនីខាងលើ រួចបញ្ចូលលេខប្រតិបត្តិការ (Transaction ID)។', 'Please transfer to the bank account above and enter your Transaction ID.')}</span>
                  </div>

                  {/* Transaction ID Input */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      {tr('លេខកូដប្រតិបត្តិការ (Transaction ID)', 'Transaction ID / Reference')} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={tr('ឧ. 0987654321 ឬ លេខយោងផ្ទេរប្រាក់', 'e.g. 0987654321 or transfer reference')}
                      value={txIdInput}
                      onChange={(e) => {
                        setTxIdInput(e.target.value);
                        if (txIdError) setTxIdError(null);
                      }}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: 10,
                        border: txIdError ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                        fontSize: 13,
                        outline: 'none',
                        background: '#ffffff',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.15s',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = txIdError ? '#ef4444' : '#2563eb')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = txIdError ? '#ef4444' : '#cbd5e1')}
                    />
                    {txIdError && (
                      <div style={{ color: '#ef4444', fontSize: 11.5, fontWeight: 600, marginTop: 4 }}>
                        {txIdError}
                      </div>
                    )}
                  </div>

                  {/* Confirm Button */}
                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    disabled={paying}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      borderRadius: 10,
                      background: '#2563eb',
                      color: '#ffffff',
                      fontSize: 14,
                      fontWeight: 800,
                      border: 'none',
                      cursor: paying ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { if (!paying) e.currentTarget.style.background = '#1d4ed8'; }}
                    onMouseLeave={(e) => { if (!paying) e.currentTarget.style.background = '#2563eb'; }}
                  >
                    {paying ? (
                      <>
                        <MdAutorenew size={18} className="spin" />
                        <span>{tr('កំពុងផ្ញើ...', 'Submitting...')}</span>
                      </>
                    ) : (
                      <>
                        <MdCheckCircle size={18} />
                        <span>{tr('ផ្ញើការទូទាត់រង់ចាំការអនុម័ត', 'Submit Payment for Approval')}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
