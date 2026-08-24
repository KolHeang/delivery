'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { saasApi, SubscriptionInfo, SaasInvoice } from '@/lib/saas-api';
import {
  MdWorkspacePremium,
  MdAutorenew,
  MdReceiptLong,
  MdDownload,
  MdCheckCircle,
  MdWarning,
  MdPeople,
  MdDirectionsCar,
  MdLocalShipping,
  MdCancel,
  MdOpenInNew,
  MdShield,
  MdCreditCard,
  MdCalendarToday,
} from 'react-icons/md';

export default function BillingPage() {
  const router = useRouter();
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [invoices, setInvoices] = useState<SaasInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subData, invData] = await Promise.all([
        saasApi.getMySubscription(),
        saasApi.getMyInvoices(),
      ]);
      setSubInfo(subData);
      setInvoices(invData);
    } catch (err) {
      console.error('Failed to fetch billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('តើអ្នកប្រាកដជាចង់ Cancel Subscription នេះមែនទេ?')) return;
    try {
      setCancelling(true);
      await saasApi.cancelSubscription();
      alert('Subscription ត្រូវបាន Cancel រួចរាល់។');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'បរាជ័យក្នុងការ Cancel');
    } finally {
      setCancelling(false);
    }
  };

  const handleUpdateInvoiceStatus = async (invoiceId: number, status: string) => {
    try {
      await saasApi.updateInvoiceStatus(invoiceId, status);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'បរាជ័យក្នុងការ Update Status');
    }
  };

  return (
    <MainLayout>
      <div style={{ width: '100%', paddingBottom: 40 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: '#eff6ff', color: '#3b82f6', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
              <MdWorkspacePremium size={15} /> SaaS Billing & Subscriptions
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
              ការគ្រប់គ្រងគម្រោង & វិក្កយបត្រ
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
              ពិនិត្យមើលស្ថានភាពនៃការជាវសេវា ដែនកំណត់ និងប្រវត្តិវិក្កយបត្ររបស់អ្នក
            </p>
          </div>

          <button
            onClick={() => router.push('/pricing')}
            style={{
              padding: '12px 22px',
              borderRadius: 14,
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#fff',
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(99,102,241,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
            }}
          >
            <MdAutorenew size={18} />
            <span>ដំឡើង ឬប្តូរគម្រោង (Upgrade Plan)</span>
          </button>
        </div>

        {/* Current Plan Overview Card (Clean White Aesthetic) */}
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
                    <span>គម្រោងបច្ចុប្បន្ន (CURRENT PLAN)</span>
                  </div>

                  <h2 style={{ fontSize: 32, fontWeight: 900, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
                    {subInfo.plan?.name || 'Pro Plan'}
                  </h2>
                  <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
                    {subInfo.plan?.description || 'កញ្ចប់ពេញនិយមបំផុត សម្រាប់ក្រុមហ៊ុនដឹកជញ្ជូនដែលកំពុងរីកចម្រើន'}
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 700 }}>ស្ថានភាព</div>
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
                    {subInfo.status}
                  </span>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 8, fontWeight: 700 }}>
                    នៅសល់ <strong style={{ color: '#0f172a' }}>{subInfo.daysRemaining || 30} ថ្ងៃ</strong> ទៀត
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
                        WORKSPACE ក្រុមហ៊ុន & DOMAIN:
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', marginTop: 2 }}>
                        {subInfo.companyName || 'Ankor Express'}{' '}
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
                    <span>បើក Workspace</span>
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
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    background: '#f8fafc',
                    padding: '18px 22px',
                    borderRadius: 18,
                    border: '1.5px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4f46e5', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                    <MdLocalShipping size={18} />
                    <span>Orders Limit</span>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a' }}>
                    {subInfo.limits?.maxOrdersPerMonth || 3000} <span style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>/ ខែ</span>
                  </div>
                </div>

                <div
                  style={{
                    background: '#f8fafc',
                    padding: '18px 22px',
                    borderRadius: 18,
                    border: '1.5px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4f46e5', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                    <MdPeople size={18} />
                    <span>Staff Accounts</span>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a' }}>
                    {subInfo.limits?.maxUsers || 10} <span style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>នាក់</span>
                  </div>
                </div>

                <div
                  style={{
                    background: '#f8fafc',
                    padding: '18px 22px',
                    borderRadius: 18,
                    border: '1.5px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4f46e5', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                    <MdDirectionsCar size={18} />
                    <span>Drivers Limit</span>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a' }}>
                    {subInfo.limits?.maxDrivers || 25} <span style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}>នាក់</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {cancelling ? 'កំពុង Cancel...' : 'Cancel Subscription'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: '#fff',
              borderRadius: 24,
              padding: '48px 32px',
              textAlign: 'center',
              border: '1px solid #e2e8f0',
              marginBottom: 36,
              boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 30,
                margin: '0 auto 16px',
              }}
            >
              ⚠️
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              មិនទាន់មាន Subscription នៅឡើយទេ
            </h3>
            <p style={{ fontSize: 14, color: '#64748b', maxWidth: 450, margin: '0 auto 24px' }}>
              សូមជ្រើសរើសកញ្ចប់សេវាកម្មដើម្បីបើកដំណើរការមុខងារប្រព័ន្ធគ្រប់គ្រងដឹកជញ្ជូនពេញលេញ។
            </p>
            <button
              onClick={() => router.push('/pricing')}
              style={{
                padding: '12px 28px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#fff',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
              }}
            >
              មើលកញ្ចប់សេវា (View Plans)
            </button>
          </div>
        )}

        {/* Billing History / Receipts Table */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 24,
            padding: '30px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#eff6ff',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MdReceiptLong size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                ប្រវត្តិវិក្កយបត្រ (Billing History & Receipts)
              </h3>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontSize: 13, fontWeight: 700 }}>
                  <th style={{ padding: '14px 16px', borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }}>លេខវិក្កយបត្រ</th>
                  <th style={{ padding: '14px 16px' }}>កាលបរិច្ឆេទ</th>
                  <th style={{ padding: '14px 16px' }}>តម្លៃដើម</th>
                  <th style={{ padding: '14px 16px' }}>បញ្ចុះតម្លៃ</th>
                  <th style={{ padding: '14px 16px' }}>ទឹកប្រាក់បង់</th>
                  <th style={{ padding: '14px 16px' }}>ស្ថានភាព</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right', borderTopRightRadius: 10, borderBottomRightRadius: 10 }}>ទាញយក</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 14 }}>
                      មិនទាន់មានប្រវត្តិវិក្កយបត្រនៅឡើយទេ
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        fontSize: 14,
                        transition: 'background 0.15s',
                      }}
                    >
                      <td style={{ padding: '16px', fontWeight: 800, color: '#4f46e5', fontFamily: 'monospace' }}>
                        {inv.invoiceNumber}
                      </td>
                      <td style={{ padding: '16px', color: '#64748b' }}>
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '16px', color: '#64748b' }}>
                        ${Number(inv.subtotal).toFixed(2)}
                      </td>
                      <td style={{ padding: '16px', color: '#10b981', fontWeight: 700 }}>
                        -${Number(inv.discountAmount).toFixed(2)}
                      </td>
                      <td style={{ padding: '16px', fontWeight: 900, color: '#0f172a' }}>
                        ${Number(inv.totalAmount).toFixed(2)}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <select
                            value={inv.status}
                            onChange={(e) => handleUpdateInvoiceStatus(inv.id, e.target.value)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              cursor: 'pointer',
                              border: inv.status === 'paid' ? '1.5px solid #10b981' : '1.5px solid #f59e0b',
                              background: inv.status === 'paid' ? '#ecfdf5' : '#fef3c7',
                              color: inv.status === 'paid' ? '#059669' : '#d97706',
                              outline: 'none',
                            }}
                          >
                            <option value="pending">⏳ PENDING</option>
                            <option value="paid">✓ PAID</option>
                            <option value="cancelled">✕ CANCELLED</option>
                            <option value="refunded">↩ REFUNDED</option>
                          </select>

                          {inv.status !== 'paid' && (
                            <button
                              onClick={() => handleUpdateInvoiceStatus(inv.id, 'paid')}
                              style={{
                                padding: '5px 10px',
                                borderRadius: 8,
                                border: 'none',
                                background: '#10b981',
                                color: '#fff',
                                fontSize: 11.5,
                                fontWeight: 800,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 2px 6px rgba(16,185,129,0.3)',
                              }}
                              title="Mark as Paid"
                            >
                              ✓ បង់រួច
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <button
                          onClick={() => alert(`ទាញយកវិក្កយបត្រ #${inv.invoiceNumber} (PDF)`)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 10,
                            border: '1px solid #e2e8f0',
                            background: '#f8fafc',
                            color: '#334155',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <MdDownload size={14} /> PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
