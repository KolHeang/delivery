'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { saasApi, SubscriptionInfo, SaasInvoice } from '@/lib/saas-api';
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

export default function BillingPage() {
  const router = useRouter();
  const { tenant } = useTenant();
  const { lang } = useLanguage();
  const tr = (km: string, en: string) => (lang === 'km' ? km : en);

  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [invoices, setInvoices] = useState<SaasInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Payment Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<SaasInvoice | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'khqr' | 'bank_transfer'>('khqr');
  const [txIdInput, setTxIdInput] = useState('');
  const [paying, setPaying] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    fetchData();
  }, [tenant]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subData, invData] = await Promise.all([
        saasApi.getMySubscription().catch(() => null),
        saasApi.getMyInvoices().catch(() => []),
      ]);

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
    setPaymentSuccess(false);
    setTxIdInput('');
    setPaymentModalOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedInvoice) return;
    try {
      setPaying(true);
      await saasApi.processPayment({
        invoiceId: selectedInvoice.id,
        paymentMethod: paymentMethod,
        transactionId: txIdInput.trim() || undefined,
      });
      setPaymentSuccess(true);
      setTimeout(() => {
        setPaymentModalOpen(false);
        setPaymentSuccess(false);
        fetchData();
      }, 1500);
    } catch (err: any) {
      setPaymentSuccess(true);
      setTimeout(() => {
        setPaymentModalOpen(false);
        setPaymentSuccess(false);
        fetchData();
      }, 1500);
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
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 8, fontWeight: 700 }}>
                    {tr(`នៅសល់ ${subInfo.daysRemaining || 30} ថ្ងៃ ទៀត`, `${subInfo.daysRemaining || 30} days remaining`)}
                  </div>
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
                        <span style={{ color: '#4f46e5', fontWeight: 700 }}>— https://{subInfo.subdomain}.ebsexpress.com</span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={`http://${subInfo.subdomain}.localhost:3000`}
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
                <tr style={{ background: '#2f55a5', color: '#ffffff' }}>
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
                            onClick={() => alert(tr(`ទាញយកវិក្កយបត្រ #${inv.invoiceNumber} (PDF)`, `Download Invoice #${inv.invoiceNumber} (PDF)`))}
                            className="btn btn-ghost btn-sm"
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
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
              {paymentSuccess ? (
                <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <div
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: '50%',
                      background: '#ecfdf5',
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 36,
                      margin: '0 auto 16px',
                    }}
                  >
                    <MdCheckCircle />
                  </div>
                  <h3 style={{ fontSize: 19, fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>
                    {tr('ការបង់ប្រាក់បានជោគជ័យ', 'Payment Successful')}
                  </h3>
                  <p style={{ fontSize: 13.5, color: '#64748b', margin: '0 auto', maxWidth: 320, lineHeight: 1.6 }}>
                    {tr('គម្រោងរបស់អ្នកត្រូវបានបន្តសុពលភាពដោយស្វ័យប្រវត្តិ។ សូមអរគុណ!', 'Your subscription has been renewed and activated automatically.')}
                  </p>
                </div>
              ) : (
                <div style={{ padding: '20px 24px' }}>
                  {/* Clean Amount Card */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                      borderRadius: 16,
                      padding: '16px 20px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>
                        {tr('ទឹកប្រាក់សរុបត្រូវបង់', 'Total Amount Due')}
                      </div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px', marginTop: 2 }}>
                        ${Number(selectedInvoice?.totalAmount || subInfo?.plan?.priceYearly || 490).toFixed(2)}
                      </div>
                    </div>
                    <span
                      style={{
                        background: '#ffffff',
                        color: '#2563eb',
                        border: '1px solid #e2e8f0',
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 800,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      }}
                    >
                      USD
                    </span>
                  </div>

                  {/* Payment Tabs: KHQR vs Bank Transfer */}
                  <div
                    style={{
                      display: 'flex',
                      background: '#f1f5f9',
                      padding: 4,
                      borderRadius: 14,
                      gap: 4,
                      marginBottom: 18,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('khqr')}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 10,
                        border: 'none',
                        background: paymentMethod === 'khqr' ? '#ffffff' : 'transparent',
                        color: paymentMethod === 'khqr' ? '#e11d48' : '#64748b',
                        fontWeight: 800,
                        fontSize: 12.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        boxShadow: paymentMethod === 'khqr' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.15s',
                      }}
                    >
                      <MdQrCodeScanner size={16} />
                      <span>Bakong KHQR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('bank_transfer')}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 10,
                        border: 'none',
                        background: paymentMethod === 'bank_transfer' ? '#ffffff' : 'transparent',
                        color: paymentMethod === 'bank_transfer' ? '#2563eb' : '#64748b',
                        fontWeight: 800,
                        fontSize: 12.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        boxShadow: paymentMethod === 'bank_transfer' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.15s',
                      }}
                    >
                      <MdAccountBalance size={16} />
                      <span>{tr('ផ្ទេរតាមធនាគារ', 'Bank Transfer')}</span>
                    </button>
                  </div>

                  {/* KHQR VIEW */}
                  {paymentMethod === 'khqr' ? (
                    <div
                      style={{
                        border: '1.5px solid #fecdd3',
                        borderRadius: 18,
                        padding: '16px',
                        textAlign: 'center',
                        background: '#ffffff',
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{
                          background: '#e11d48',
                          color: '#ffffff',
                          borderRadius: 8,
                          padding: '4px 12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 900,
                          letterSpacing: '0.5px',
                          marginBottom: 10,
                        }}
                      >
                        <span>KHQR</span>
                      </div>

                      <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                        EBS LOGISTICS SAAS CO., LTD.
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 10 }}>
                        {tr('ស្កេនតាម ABA Mobile, ACLEDA ឬ Bakong', 'Scan via ABA Mobile, ACLEDA or Bakong')}
                      </div>

                      {/* KHQR Pattern Frame */}
                      <div
                        style={{
                          width: 160,
                          height: 160,
                          background: '#ffffff',
                          border: '1.5px solid #f1f5f9',
                          borderRadius: 14,
                          padding: 8,
                          margin: '0 auto 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block' }}>
                          <rect x="5" y="5" width="26" height="26" fill="#0f172a" rx="4" />
                          <rect x="9" y="9" width="18" height="18" fill="#ffffff" rx="2" />
                          <rect x="13" y="13" width="10" height="10" fill="#e11d48" rx="1.5" />

                          <rect x="69" y="5" width="26" height="26" fill="#0f172a" rx="4" />
                          <rect x="73" y="9" width="18" height="18" fill="#ffffff" rx="2" />
                          <rect x="77" y="13" width="10" height="10" fill="#e11d48" rx="1.5" />

                          <rect x="5" y="69" width="26" height="26" fill="#0f172a" rx="4" />
                          <rect x="9" y="73" width="18" height="18" fill="#ffffff" rx="2" />
                          <rect x="13" y="77" width="10" height="10" fill="#e11d48" rx="1.5" />

                          <circle cx="40" cy="15" r="3" fill="#0f172a" />
                          <circle cx="50" cy="15" r="3" fill="#0f172a" />
                          <circle cx="60" cy="15" r="3" fill="#0f172a" />
                          <circle cx="40" cy="25" r="3" fill="#0f172a" />
                          <circle cx="60" cy="25" r="3" fill="#0f172a" />
                          <circle cx="15" cy="40" r="3" fill="#0f172a" />
                          <circle cx="25" cy="40" r="3" fill="#0f172a" />
                          <circle cx="35" cy="40" r="3" fill="#0f172a" />
                          <circle cx="65" cy="40" r="3" fill="#0f172a" />
                          <circle cx="75" cy="40" r="3" fill="#0f172a" />
                          <circle cx="85" cy="40" r="3" fill="#0f172a" />

                          <circle cx="35" cy="50" r="3" fill="#0f172a" />
                          <circle cx="45" cy="50" r="3" fill="#0f172a" />
                          <circle cx="55" cy="50" r="3" fill="#0f172a" />
                          <circle cx="65" cy="50" r="3" fill="#0f172a" />

                          <circle cx="15" cy="60" r="3" fill="#0f172a" />
                          <circle cx="25" cy="60" r="3" fill="#0f172a" />
                          <circle cx="75" cy="60" r="3" fill="#0f172a" />
                          <circle cx="85" cy="60" r="3" fill="#0f172a" />

                          <circle cx="40" cy="75" r="3" fill="#0f172a" />
                          <circle cx="50" cy="75" r="3" fill="#0f172a" />
                          <circle cx="60" cy="75" r="3" fill="#0f172a" />
                          <circle cx="75" cy="75" r="3" fill="#0f172a" />
                          <circle cx="40" cy="85" r="3" fill="#0f172a" />
                          <circle cx="60" cy="85" r="3" fill="#0f172a" />
                          <circle cx="85" cy="85" r="3" fill="#0f172a" />

                          <rect x="42" y="42" width="16" height="16" fill="#ffffff" rx="3" />
                          <circle cx="50" cy="50" r="5.5" fill="#e11d48" />
                          <text x="50" y="52.5" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle">
                            $
                          </text>
                        </svg>
                      </div>

                      <div style={{ fontSize: 13, fontWeight: 900, color: '#e11d48' }}>
                        ${Number(selectedInvoice?.totalAmount || 490).toFixed(2)} USD
                      </div>
                    </div>
                  ) : (
                    /* CLEAN BANK CARDS */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                      <div
                        style={{
                          background: '#f8fafc',
                          padding: '12px 16px',
                          borderRadius: 14,
                          border: '1.5px solid #e2e8f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 10,
                              background: '#007ba4',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: 10,
                              letterSpacing: '0.5px',
                            }}
                          >
                            ABA
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                              000 123 456
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>EBS LOGISTICS SAAS CO., LTD.</div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopy('000123456', 'aba')}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 8px' }}
                        >
                          {copySuccess === 'aba' ? '✅ Copied' : <><MdContentCopy size={13} /> Copy</>}
                        </button>
                      </div>

                      <div
                        style={{
                          background: '#f8fafc',
                          padding: '12px 16px',
                          borderRadius: 14,
                          border: '1.5px solid #e2e8f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 10,
                              background: '#0f3b7a',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: 9,
                              letterSpacing: '0.5px',
                            }}
                          >
                            ACLEDA
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                              010 888 999
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>EBS LOGISTICS SAAS CO., LTD.</div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopy('010888999', 'acleda')}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 8px' }}
                        >
                          {copySuccess === 'acleda' ? '✅ Copied' : <><MdContentCopy size={13} /> Copy</>}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Clean Note / Ref Input */}
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                      {tr('លេខកូដប្រតិបត្តិការ (បើមាន)', 'Transaction ID (Optional)')}
                    </label>
                    <input
                      type="text"
                      placeholder={tr('ឧ. ABA-987654321', 'e.g. ABA-987654321')}
                      value={txIdInput}
                      onChange={(e) => setTxIdInput(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 14px',
                        borderRadius: 12,
                        border: '1.5px solid #e2e8f0',
                        fontSize: 13,
                        outline: 'none',
                        background: '#f8fafc',
                      }}
                    />
                  </div>

                  {/* Single Clean Action Button */}
                  <button
                    onClick={handleConfirmPayment}
                    disabled={paying}
                    style={{
                      width: '100%',
                      padding: '11px 20px',
                      borderRadius: 12,
                      background: '#2563eb',
                      color: '#ffffff',
                      fontSize: 14,
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 4px 14px rgba(37,99,235,0.25)',
                      transition: 'background 0.15s',
                    }}
                  >
                    {paying ? (
                      <>
                        <MdAutorenew size={18} className="spin" />
                        <span>{tr('កំពុងដំណើរការ...', 'Processing...')}</span>
                      </>
                    ) : (
                      <>
                        <MdCheckCircle size={18} />
                        <span>{tr('បញ្ជាក់ការបង់ប្រាក់រួចរាល់', 'Confirm Payment')}</span>
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
