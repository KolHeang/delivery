'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import api from '@/lib/api';
import { formatDateToDDMMYYYY } from '@/components/ui/DateInput';
import { useSettings } from '@/lib/SettingsContext';
import { useTenant } from '@/lib/TenantContext';
import { applyBrandTheme } from '@/lib/theme';
import {
  MdPrint,
  MdSearch,
  MdClose,
  MdCheckCircle,
  MdLocalShipping,
  MdAssignmentReturn,
  MdPhone,
  MdLocationOn,
  MdCalendarToday,
  MdReceiptLong,
} from 'react-icons/md';

const getKhmerDateString = (date: Date = new Date()) => {
  const days = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
  const months = [
    'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
    'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
  ];
  const khmerNums = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  const toKhmerNum = (num: number) => {
    return String(num).split('').map(char => {
      const idx = parseInt(char);
      return isNaN(idx) ? char : khmerNums[idx];
    }).join('');
  };

  const dayName = days[date.getDay()];
  const day = toKhmerNum(date.getDate());
  const monthName = months[date.getMonth()];
  const year = toKhmerNum(date.getFullYear());

  return `ថ្ងៃ ${dayName} ទី ${day} ខែ ${monthName} ឆ្នាំ ${year}`;
};

const cleanText = (val: any): string => {
  if (!val) return '';
  const s = String(val).trim();
  if (s === '-' || s === '—' || s === 'null' || s === 'undefined') return '';
  return s;
};

const cleanNote = (val: any): string => {
  const s = cleanText(val);
  if (!s) return '';
  return s.replace(/\[Reason:\s*Other\]\s*/gi, '').trim();
};

type TabKey = 'all' | 'delivered' | 'transit' | 'returned';

export default function ReportPaymentCustomerPage() {
  const { khrRate } = useSettings();
  const { tenant } = useTenant();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const hasAutoPrintedRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const clientId = params.get('client_id');
    const reference = params.get('reference');

    if (!token && (!clientId || !reference)) {
      setError('ខ្វះប៉ារ៉ាម៉ែត្រក្នុង URL (Missing token or credentials)');
      setLoading(false);
      return;
    }

    const queryUrl = token
      ? `/payments/public/invoice?token=${encodeURIComponent(token)}`
      : `/payments/public/invoice?client_id=${clientId}&reference=${reference}`;

    api.get(queryUrl)
      .then((res) => {
        if (res.data?.tenant?.primaryColor) {
          applyBrandTheme(res.data.tenant.primaryColor);
        }
        setData(res.data);
      })
      .catch((err) => {
        console.error('Error fetching public payment invoice:', err);
        setError('រកមិនឃើញរបាយការណ៍ទូទាត់ប្រាក់ទេ (Payment settlement report not found)');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Only auto-print when explicitly requested via ?print=1 or ?autoPrint=true
  // (Never pop up print dialog automatically when merchant opens link in Telegram on phone!)
  useEffect(() => {
    if (!loading && data && !error && !hasAutoPrintedRef.current) {
      const params = new URLSearchParams(window.location.search);
      const shouldPrint = params.get('print') === '1' || params.get('autoPrint') === 'true';
      if (shouldPrint) {
        hasAutoPrintedRef.current = true;
        const timer = setTimeout(() => {
          window.print();
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, data, error]);

  const orders: any[] = data?.parcels || data?.orders || [];

  const deliveredOrders = useMemo(
    () => orders.filter((o: any) => o.status === 'delivered'),
    [orders]
  );
  const inTransitOrders = useMemo(
    () => orders.filter((o: any) => ['in-transit', 'picked-up', 'pending', 'assigned', 'in-warehouse', 'failed'].includes(o.status)),
    [orders]
  );
  const returnedOrders = useMemo(
    () => orders.filter((o: any) => o.status === 'returned' || o.status === 'cancelled'),
    [orders]
  );

  const mobileFilteredOrders = useMemo(() => {
    let base: any[] = [];
    if (activeTab === 'delivered') base = deliveredOrders;
    else if (activeTab === 'transit') base = inTransitOrders;
    else if (activeTab === 'returned') base = returnedOrders;
    else base = [...deliveredOrders, ...inTransitOrders, ...returnedOrders];

    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((o: any) =>
      o.trackingCode?.toLowerCase().includes(q) ||
      o.receiverPhone?.toLowerCase().includes(q) ||
      o.receiverAddress?.toLowerCase().includes(q) ||
      cleanNote(o.note).toLowerCase().includes(q)
    );
  }, [activeTab, search, deliveredOrders, inTransitOrders, returnedOrders]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f8fafc',
        gap: 14,
        fontFamily: "'Kantumruy Pro', 'Inter', sans-serif"
      }}>
        <div style={{
          width: 42,
          height: 42,
          border: '3.5px solid #e2e8f0',
          borderTopColor: '#1565D8',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <div style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>
          កំពុងទាញយករបាយការណ៍ទូទាត់...
        </div>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: 20,
        background: '#f8fafc',
        fontFamily: "'Kantumruy Pro', 'Inter', sans-serif"
      }}>
        <div style={{
          background: '#ffffff',
          padding: '32px 24px',
          borderRadius: 16,
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
          border: '1px solid #e2e8f0',
          textAlign: 'center',
          maxWidth: 400,
          width: '100%'
        }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#dc2626', margin: '0 0 8px' }}>
            មិនអាចបើករបាយការណ៍បានទេ
          </h3>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0, lineHeight: 1.6 }}>{error}</p>
        </div>
      </div>
    );
  }

  const payment = data.payment || {};
  const orgInfo = data.orgInfo || {};
  const merchant = payment?.merchant || {};

  const dynamicLogo = orgInfo.logo || orgInfo.logoUrl || data.tenant?.logo || data.tenant?.logoUrl || tenant?.logoUrl;

  const getDynamicCompanyName = () => {
    if (orgInfo.name && orgInfo.name !== 'Delivery Express' && orgInfo.name !== 'EBS Digital Solutions') {
      return orgInfo.name;
    }
    if (data.tenant?.name) return data.tenant.name;
    if (tenant?.companyName) return tenant.companyName;
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      if (parts.length > 1 && parts[0] !== 'www' && parts[0] !== 'localhost') {
        return parts[0]
          .split('-')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }
    }
    return orgInfo.name || 'Delivery Express';
  };

  const dynamicCompanyName = getDynamicCompanyName();
  const dynamicAddress = cleanText(orgInfo.address || data.tenant?.address || tenant?.address) || 'Phnom Penh, Cambodia';
  const dynamicPhone = cleanText(orgInfo.phone || data.tenant?.phone || tenant?.phone) || '';

  const delUSD = deliveredOrders
    .filter((o: any) => o.codCurrency === 'USD')
    .reduce((sum: number, o: any) => sum + parseFloat(o.cod || 0), 0);
  const delKHR = deliveredOrders
    .filter((o: any) => o.codCurrency === 'KHR')
    .reduce((sum: number, o: any) => sum + parseFloat(o.cod || 0), 0);
  const delFee = deliveredOrders
    .reduce((sum: number, o: any) => sum + parseFloat(o.deliveryFee || 0), 0);

  const customerRate = merchant ? parseFloat(merchant.exchangeRate as any || (khrRate || 4100)) : (khrRate || 4100);
  const payableUSD = Math.max(0, delUSD - delFee);
  const remainingUSD = Math.max(0, delFee - delUSD);
  const payableKHR = Math.max(0, delKHR - (remainingUSD * customerRate));

  const formattedDate = payment.date
    ? formatDateToDDMMYYYY(payment.date)
    : formatDateToDDMMYYYY(new Date().toISOString());

  const getOrderLatestNote = (o: any, fallback = '') => {
    const timeline = o.events || o.histories;
    const timelineNote = Array.isArray(timeline)
      ? timeline
          .slice()
          .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          .find((h: any) => cleanNote(h.note) || cleanNote(h.description))
      : null;
    const resolvedTimeline = cleanNote(timelineNote?.note) || cleanNote(timelineNote?.description);
    const rawReason = cleanNote(o.reason);
    const safeReason = rawReason.toLowerCase() === 'other' ? '' : rawReason;
    return resolvedTimeline || cleanNote(o.note) || safeReason || fallback;
  };

  const getStatusMeta = (status: string) => {
    if (status === 'delivered') {
      return { label: 'ដឹកជោគជ័យ', bg: '#dcfce7', color: '#15803d', border: '#86efac', accent: '#16a34a' };
    }
    if (status === 'failed') {
      return { label: 'មិនជោគជ័យ', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5', accent: '#ef4444' };
    }
    if (status === 'returned' || status === 'cancelled') {
      return { label: 'ត្រឡប់ទៅហាង', bg: '#ffe4e6', color: '#be123c', border: '#fda4af', accent: '#e11d48' };
    }
    if (status === 'pending') {
      return { label: 'រង់ចាំ', bg: '#fef3c7', color: '#b45309', border: '#fcd34d', accent: '#f59e0b' };
    }
    if (status === 'picked-up' || status === 'in-warehouse') {
      return { label: 'ក្នុងឃ្លាំង', bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc', accent: '#0284c7' };
    }
    return { label: 'កំពុងដឹក', bg: '#fef3c7', color: '#b45309', border: '#fcd34d', accent: '#f59e0b' };
  };

  return (
    <div className="settlement-public-root" style={{
      minHeight: '100vh',
      background: '#f1f5f9',
      fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
      color: '#0f172a',
      boxSizing: 'border-box',
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: A4 portrait;
          margin: 9mm 8mm;
        }
        .settlement-public-root * {
          box-sizing: border-box;
        }

        /* Default Desktop (> 768px): show clean A4 invoice card, hide mobile card list */
        .mobile-settlement-view {
          display: none;
        }
        .desktop-settlement-view {
          display: block;
          padding: 24px 16px 48px;
        }

        /* Phone & Tablet Portrait (<= 768px): show clean Mobile App-style view! */
        @media screen and (max-width: 768px) {
          .mobile-settlement-view {
            display: block;
            padding-bottom: 36px;
          }
          .desktop-settlement-view {
            display: none;
          }
        }

        /* Print Mode (from BOTH phone & desktop): always print crisp A4 invoice! */
        @media print {
          html, body, .settlement-public-root {
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print, .mobile-settlement-view {
            display: none !important;
          }
          .desktop-settlement-view {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .desktop-invoice-sheet {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          th, td, tr, img, div, span {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          tr {
            page-break-inside: avoid;
          }
        }
      `}} />

      {/* ── Top Sticky Bar (Screen Only — Works great on Telegram Mobile & Desktop) ── */}
      <div className="no-print" style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #e2e8f0',
        padding: '10px 16px',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
      }}>
        <div style={{
          maxWidth: 920,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {dynamicLogo ? (
              <img
                src={dynamicLogo}
                alt="Logo"
                style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'contain', flexShrink: 0, border: '1px solid #e2e8f0', background: '#fff' }}
              />
            ) : (
              <div style={{
                width: 34, height: 34, borderRadius: 8,
                background: 'var(--sidebar-bg, #1565D8)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 15, flexShrink: 0
              }}>
                {dynamicCompanyName.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {dynamicCompanyName}
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 500 }}>
                របាយការណ៍ទូទាត់ប្រាក់ហាង
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--sidebar-bg, #1565D8)',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(21, 101, 216, 0.25)',
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}
          >
            <MdPrint size={17} />
            <span>បោះពុម្ព / PDF</span>
          </button>
        </div>
      </div>

      {/* ========================================================================
          1. MOBILE-FIRST VIEW (<= 768px — Optimized for Telegram In-App Browser)
         ======================================================================== */}
      <div className="mobile-settlement-view">
        <div style={{ padding: '14px 12px 0', maxWidth: 560, margin: '0 auto' }}>

          {/* Shop & Settlement Header Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
            marginBottom: 12
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, marginBottom: 2 }}>
                  ហាងទំនិញ / Merchant
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                  {cleanText(merchant.nameKh || merchant.name) || 'Merchant Shop'}
                </div>
                {cleanText(merchant.phone) && (
                  <div style={{ fontSize: 13, color: '#475569', marginTop: 2, fontWeight: 500 }}>
                    📞 {cleanText(merchant.phone)}
                  </div>
                )}
              </div>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 999,
                background: '#dcfce7',
                color: '#15803d',
                fontSize: 11.5,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}>
                <MdCheckCircle size={14} /> បានទូទាត់
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              paddingTop: 10,
              borderTop: '1px dashed #e2e8f0',
              fontSize: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
                <MdCalendarToday size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                <span>ថ្ងៃទី៖ <strong style={{ color: '#0f172a' }}>{formattedDate}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', justifyContent: 'flex-end' }}>
                <MdReceiptLong size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--sidebar-bg, #1565D8)', fontSize: 11.5 }}>
                  {cleanText(payment.reference) || `#${payment.id || ''}`}
                </span>
              </div>
            </div>
          </div>

          {/* Hero Net Payout Summary Card */}
          <div style={{
            background: 'var(--sidebar-bg, #1565D8)',
            borderRadius: 16,
            padding: '18px 16px',
            color: '#ffffff',
            boxShadow: '0 8px 20px rgba(21, 101, 216, 0.22)',
            marginBottom: 14
          }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 8 }}>
              💰 ប្រាក់ត្រូវទទួលបានសរុប (Net Payout)
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: 12,
              padding: '12px',
              marginBottom: 12,
              border: '1px solid rgba(255, 255, 255, 0.16)'
            }}>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 2 }}>ប្រាក់ដុល្លារ (USD)</div>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                  ${payableUSD.toFixed(2)}
                </div>
              </div>
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 2 }}>ប្រាក់រៀល (KHR)</div>
                <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>
                  {payableKHR.toLocaleString()} ៛
                </div>
              </div>
            </div>

            {/* Financial Breakdown Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'rgba(255,255,255,0.92)' }}>
                <span>ប្រាក់ COD ប្រមូលបានសរុប</span>
                <span style={{ fontWeight: 700 }}>
                  ${delUSD.toFixed(2)} / {delKHR.toLocaleString()} ៛
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'rgba(255,255,255,0.92)' }}>
                <span>ដកសេវាដឹកជញ្ជូនសរុប ({deliveredOrders.length} កញ្ចប់)</span>
                <span style={{ fontWeight: 700, color: '#fde68a' }}>
                  - ${delFee.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Status Summary Pills (Filter Tabs) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 6,
            marginBottom: 12
          }}>
            {[
              { key: 'all' as TabKey, label: 'ទាំងអស់', count: orders.length, activeBg: '#1e293b', activeColor: '#fff' },
              { key: 'delivered' as TabKey, label: 'ជោគជ័យ', count: deliveredOrders.length, activeBg: '#16a34a', activeColor: '#fff' },
              { key: 'transit' as TabKey, label: 'ដឹកបន្ត', count: inTransitOrders.length, activeBg: '#d97706', activeColor: '#fff' },
              { key: 'returned' as TabKey, label: 'ត្រឡប់', count: returnedOrders.length, activeBg: '#dc2626', activeColor: '#fff' },
            ].map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 12,
                    border: isActive ? `1.5px solid ${tab.activeBg}` : '1.5px solid #e2e8f0',
                    background: isActive ? tab.activeBg : '#ffffff',
                    color: isActive ? tab.activeColor : '#475569',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    boxShadow: isActive ? '0 3px 8px rgba(15,23,42,0.12)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.1 }}>{tab.count}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          {orders.length > 3 && (
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <MdSearch size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ស្វែងរកលេខកូដ ឬលេខទូរស័ព្ទអតិថិជន..."
                style={{
                  width: '100%',
                  height: 42,
                  paddingLeft: 38,
                  paddingRight: search ? 36 : 12,
                  borderRadius: 12,
                  border: '1.5px solid #e2e8f0',
                  background: '#ffffff',
                  fontSize: 13.5,
                  fontFamily: 'inherit',
                  color: '#0f172a',
                  outline: 'none'
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '50%',
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  <MdClose size={15} />
                </button>
              )}
            </div>
          )}

          {/* Parcel Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mobileFilteredOrders.length === 0 ? (
              <div style={{
                background: '#ffffff',
                borderRadius: 14,
                padding: '36px 20px',
                textAlign: 'center',
                border: '1px solid #e2e8f0',
                color: '#64748b',
                fontSize: 13.5
              }}>
                មិនមានកញ្ចប់ទំនិញក្នុងផ្នែកនេះទេ
              </div>
            ) : (
              mobileFilteredOrders.map((o: any, idx: number) => {
                const isUSD = o.codCurrency === 'USD';
                const codVal = parseFloat(o.cod || 0);
                const feeVal = (o.status === 'returned' || o.status === 'cancelled') ? 0 : parseFloat(o.deliveryFee || 0);
                const meta = getStatusMeta(o.status);
                const phone = cleanText(o.receiverPhone);
                const address = cleanText(o.receiverAddress);
                const note = getOrderLatestNote(o);

                return (
                  <div
                    key={o.id || idx}
                    style={{
                      background: '#ffffff',
                      borderRadius: 14,
                      border: '1px solid #e2e8f0',
                      borderLeft: `4px solid ${meta.accent}`,
                      overflow: 'hidden',
                      boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)'
                    }}
                  >
                    {/* Card Top: Index + Tracking Code + Status Pill */}
                    <div style={{
                      padding: '11px 14px 9px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      borderBottom: '1px solid #f1f5f9'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span style={{
                          minWidth: 24,
                          height: 24,
                          padding: '0 6px',
                          borderRadius: 6,
                          background: '#f1f5f9',
                          color: '#475569',
                          fontSize: 11.5,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          #{idx + 1}
                        </span>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: 14,
                          fontWeight: 800,
                          color: '#0f172a',
                          letterSpacing: '0.02em',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {o.trackingCode}
                        </span>
                      </div>

                      <span style={{
                        padding: '3px 9px',
                        borderRadius: 999,
                        background: meta.bg,
                        color: meta.color,
                        border: `1px solid ${meta.border}`,
                        fontSize: 11,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}>
                        {meta.label}
                      </span>
                    </div>

                    {/* Card Body: Receiver Phone, Address, Dates, Note */}
                    <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                      {phone && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ color: '#64748b', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <MdPhone size={14} style={{ color: '#2563eb' }} /> លេខអ្នកទទួល៖
                          </span>
                          <a
                            href={`tel:${phone}`}
                            style={{ fontWeight: 700, color: '#2563eb', textDecoration: 'none', fontSize: 13.5 }}
                          >
                            {phone}
                          </a>
                        </div>
                      )}

                      {address && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, color: '#334155', fontSize: 12.5, lineHeight: 1.45 }}>
                          <MdLocationOn size={15} style={{ color: '#64748b', marginTop: 2, flexShrink: 0 }} />
                          <span style={{ wordBreak: 'break-word' }}>{address}</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                        <span>បង្កើត៖ <strong>{formatDateToDDMMYYYY(o.createdAt)}</strong></span>
                        {o.deliveredAt && (
                          <span>បញ្ចប់៖ <strong style={{ color: '#15803d' }}>{formatDateToDDMMYYYY(o.deliveredAt)}</strong></span>
                        )}
                      </div>

                      {note && (
                        <div style={{
                          marginTop: 2,
                          padding: '6px 10px',
                          borderRadius: 8,
                          background: o.status === 'delivered' ? '#f8fafc' : '#fff7ed',
                          border: `1px solid ${o.status === 'delivered' ? '#e2e8f0' : '#fed7aa'}`,
                          color: o.status === 'delivered' ? '#475569' : '#c2410c',
                          fontSize: 12,
                          lineHeight: 1.4
                        }}>
                          💬 {note}
                        </div>
                      )}
                    </div>

                    {/* Card Bottom Strip: COD & Fee */}
                    <div style={{
                      padding: '9px 14px',
                      background: '#f8fafc',
                      borderTop: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 12.5
                    }}>
                      <div>
                        <span style={{ color: '#64748b' }}>ប្រាក់ COD៖ </span>
                        <strong style={{ fontSize: 14, color: '#0f172a' }}>
                          {codVal > 0
                            ? (isUSD ? `$${codVal.toFixed(2)}` : `${codVal.toLocaleString()} ៛`)
                            : (isUSD ? '$0.00' : '0 ៛')}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>សេវាដឹក៖ </span>
                        <strong style={{ color: '#dc2626', fontSize: 13 }}>
                          ${feeVal.toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Mobile Footer Contact Card */}
          <div style={{
            marginTop: 18,
            padding: '14px 16px',
            borderRadius: 14,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            textAlign: 'center',
            fontSize: 12,
            color: '#64748b',
            lineHeight: 1.6
          }}>
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
              {dynamicCompanyName}
            </div>
            <div>{dynamicAddress}</div>
            {dynamicPhone && (
              <div>
                ទំនាក់ទំនង៖ <a href={`tel:${dynamicPhone}`} style={{ color: '#1565D8', fontWeight: 700, textDecoration: 'none' }}>{dynamicPhone}</a>
              </div>
            )}
            <div style={{ marginTop: 6, fontSize: 11, fontStyle: 'italic', color: '#94a3b8' }}>
              {getKhmerDateString(payment.date ? new Date(payment.date) : new Date())}
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================
          2. DESKTOP & A4 PRINT INVOICE VIEW (> 768px & @media print)
         ======================================================================== */}
      <div className="desktop-settlement-view">
        <div className="desktop-invoice-sheet" style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: 920,
          margin: '0 auto',
          padding: '32px 36px',
          borderRadius: 14,
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
        }}>
          {/* A4 3-Column Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            marginBottom: 14,
            borderBottom: '2px solid #0f172a',
            paddingBottom: 12
          }}>
            {/* Left: Company Info */}
            <div style={{ fontSize: 11, lineHeight: 1.55, flex: 1 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
                {dynamicLogo ? (
                  <img
                    src={dynamicLogo}
                    alt="Logo"
                    style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{
                    width: 32, height: 32, borderRadius: 6,
                    background: 'var(--sidebar-bg, #1565D8)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 800
                  }}>
                    {dynamicCompanyName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--sidebar-bg, #1565D8)' }}>
                  {dynamicCompanyName}
                </span>
              </div>
              <div><strong>អាសយដ្ឋាន៖</strong> {dynamicAddress}</div>
              {dynamicPhone && <div><strong>ទូរស័ព្ទ៖</strong> {dynamicPhone}</div>}
            </div>

            {/* Center: Report Title */}
            <div style={{ textAlign: 'center', alignSelf: 'center', flex: 1.3 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                របាយការណ៍ទូទាត់ប្រចាំថ្ងៃ
              </h2>
              <div style={{ marginTop: 3, fontSize: 12, fontWeight: 700, color: 'var(--sidebar-bg, #1565D8)' }}>
                សម្រាប់ហាងទំនិញ
              </div>
            </div>

            {/* Right: Merchant & Reference */}
            <div style={{ fontSize: 11, textAlign: 'right', lineHeight: 1.55, flex: 1 }}>
              <div style={{ whiteSpace: 'nowrap' }}>
                <strong>ឈ្មោះហាង៖</strong>{' '}
                <span style={{ fontWeight: 700 }}>{cleanText(merchant.nameKh || merchant.name)}</span>
              </div>
              {cleanText(merchant.phone) && (
                <div style={{ whiteSpace: 'nowrap' }}><strong>ទូរស័ព្ទ៖</strong> {cleanText(merchant.phone)}</div>
              )}
              {cleanText(payment.reference) && (
                <div style={{ whiteSpace: 'nowrap' }}>
                  <strong>លេខយោង៖</strong>{' '}
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{cleanText(payment.reference)}</span>
                </div>
              )}
              <div style={{ whiteSpace: 'nowrap' }}><strong>កាលបរិច្ឆេទ៖</strong> {formattedDate}</div>
            </div>
          </div>

          {/* A4 Orders Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
            <thead style={{ border: '1px solid var(--sidebar-bg, #1565D8)' }}>
              <tr style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', color: '#ffffff' }}>
                <th rowSpan={2} style={{ width: 28, backgroundColor: 'var(--sidebar-bg, #1565D8)', padding: '6px 4px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.35)', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap' }}>ល.រ</th>
                <th colSpan={2} style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', padding: '5px 4px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.35)', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap' }}>កាលបរិច្ឆេទ</th>
                <th rowSpan={2} style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', padding: '6px 5px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.35)', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap' }}>លេខកូដ</th>
                <th rowSpan={2} style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', padding: '6px 5px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.35)', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap' }}>លេខអ្នកទទួល</th>
                <th rowSpan={2} style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', padding: '6px 6px', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.35)', fontWeight: 700, color: '#ffffff' }}>អាសយដ្ឋាន</th>
                <th colSpan={2} style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', padding: '5px 4px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.35)', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap' }}>ទឹកប្រាក់ដើមមាន (COD)</th>
                <th rowSpan={2} style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', padding: '6px 5px', textAlign: 'right', border: '1px solid rgba(255, 255, 255, 0.35)', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap' }}>សេវាដឹក</th>
                <th rowSpan={2} style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', padding: '6px 5px', textAlign: 'left', border: '1px solid rgba(255, 255, 255, 0.35)', fontWeight: 700, color: '#ffffff' }}>ផ្សេងៗ</th>
              </tr>
              <tr style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', color: '#ffffff' }}>
                <th style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', border: '1px solid rgba(255, 255, 255, 0.35)', padding: '4px 4px', fontSize: 9, fontWeight: 600, textAlign: 'center', color: '#ffffff', whiteSpace: 'nowrap' }}>បង្កើត</th>
                <th style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', border: '1px solid rgba(255, 255, 255, 0.35)', padding: '4px 4px', fontSize: 9, fontWeight: 600, textAlign: 'center', color: '#ffffff', whiteSpace: 'nowrap' }}>បញ្ចប់</th>
                <th style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', border: '1px solid rgba(255, 255, 255, 0.35)', padding: '4px 5px', fontSize: 9, fontWeight: 600, textAlign: 'right', color: '#ffffff', whiteSpace: 'nowrap' }}>ដុល្លារ ($)</th>
                <th style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', border: '1px solid rgba(255, 255, 255, 0.35)', padding: '4px 5px', fontSize: 9, fontWeight: 600, textAlign: 'right', color: '#ffffff', whiteSpace: 'nowrap' }}>ខ្មែរ (៛)</th>
              </tr>
            </thead>
            <tbody>
              {/* Section 1: Delivered */}
              {deliveredOrders.length > 0 && (
                <>
                  <tr>
                    <td colSpan={10} style={{ backgroundColor: '#ecfdf5', color: '#065f46', fontWeight: 700, padding: '6px 8px', border: '1px solid #94a3b8', fontSize: 10.5 }}>
                      ១. អីវ៉ាន់ដែលបានដឹកជោគជ័យ ({deliveredOrders.length} កញ្ចប់)
                    </td>
                  </tr>
                  {deliveredOrders.map((o: any, idx: number) => {
                    const isUSD = o.codCurrency === 'USD';
                    const codVal = parseFloat(o.cod || 0);
                    return (
                      <tr key={o.id}>
                        <td style={{ textAlign: 'center', padding: '5px 4px', border: '1px solid #cbd5e1' }}>{idx + 1}</td>
                        <td style={{ padding: '5px 4px', border: '1px solid #cbd5e1', textAlign: 'center', whiteSpace: 'nowrap' }}>{formatDateToDDMMYYYY(o.createdAt)}</td>
                        <td style={{ padding: '5px 4px', border: '1px solid #cbd5e1', textAlign: 'center', whiteSpace: 'nowrap' }}>{o.deliveredAt ? formatDateToDDMMYYYY(o.deliveredAt) : ''}</td>
                        <td style={{ padding: '5px 5px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>{o.trackingCode}</td>
                        <td style={{ padding: '5px 5px', border: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>{cleanText(o.receiverPhone)}</td>
                        <td style={{ padding: '5px 6px', border: '1px solid #cbd5e1', wordBreak: 'break-word' }}>{cleanText(o.receiverAddress)}</td>
                        <td style={{ textAlign: 'right', padding: '5px 5px', border: '1px solid #cbd5e1', whiteSpace: 'nowrap', fontWeight: isUSD && codVal > 0 ? 600 : 400 }}>{isUSD ? `$${codVal.toFixed(2)}` : '$0.00'}</td>
                        <td style={{ textAlign: 'right', padding: '5px 5px', border: '1px solid #cbd5e1', whiteSpace: 'nowrap', fontWeight: !isUSD && codVal > 0 ? 600 : 400 }}>{!isUSD ? `${codVal.toLocaleString()} ៛` : '0 ៛'}</td>
                        <td style={{ textAlign: 'right', padding: '5px 5px', border: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>${parseFloat(o.deliveryFee || 0).toFixed(2)}</td>
                        <td style={{ padding: '5px 5px', border: '1px solid #cbd5e1', fontSize: 9.5 }}>{cleanNote(o.note)}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <td colSpan={6} style={{ textAlign: 'right', fontWeight: 700, padding: '6px 8px', border: '1px solid #94a3b8' }}>សរុបផ្នែកដឹកជោគជ័យ</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, padding: '6px 5px', border: '1px solid #94a3b8', whiteSpace: 'nowrap' }}>${delUSD.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, padding: '6px 5px', border: '1px solid #94a3b8', whiteSpace: 'nowrap' }}>{delKHR.toLocaleString()} ៛</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, padding: '6px 5px', border: '1px solid #94a3b8', whiteSpace: 'nowrap' }}>${delFee.toFixed(2)}</td>
                    <td style={{ border: '1px solid #94a3b8' }}></td>
                  </tr>
                </>
              )}

              {/* Section 2: In Transit / Failed */}
              {inTransitOrders.length > 0 && (
                <>
                  <tr>
                    <td colSpan={10} style={{ backgroundColor: '#fffbeb', color: '#92400e', fontWeight: 700, padding: '6px 8px', border: '1px solid #94a3b8', fontSize: 10.5 }}>
                      ២. អីវ៉ាន់ដឹកបន្ត និងមានបញ្ហា ({inTransitOrders.length} កញ្ចប់)
                    </td>
                  </tr>
                  {inTransitOrders.map((o: any, idx: number) => {
                    const isUSD = o.codCurrency === 'USD';
                    const codVal = parseFloat(o.cod || 0);
                    const meta = getStatusMeta(o.status);
                    const latestNote = getOrderLatestNote(o, meta.label);
                    return (
                      <tr key={o.id}>
                        <td style={{ textAlign: 'center', padding: '5px 4px', border: '1px solid #cbd5e1' }}>{idx + 1}</td>
                        <td style={{ padding: '5px 4px', border: '1px solid #cbd5e1', textAlign: 'center', whiteSpace: 'nowrap' }}>{formatDateToDDMMYYYY(o.createdAt)}</td>
                        <td style={{ padding: '5px 4px', border: '1px solid #cbd5e1', textAlign: 'center', whiteSpace: 'nowrap' }}>{o.deliveredAt ? formatDateToDDMMYYYY(o.deliveredAt) : ''}</td>
                        <td style={{ padding: '5px 5px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>{o.trackingCode}</td>
                        <td style={{ padding: '5px 5px', border: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>{cleanText(o.receiverPhone)}</td>
                        <td style={{ padding: '5px 6px', border: '1px solid #cbd5e1', wordBreak: 'break-word' }}>{cleanText(o.receiverAddress)}</td>
                        <td style={{ textAlign: 'right', padding: '5px 5px', border: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>{isUSD ? `$${codVal.toFixed(2)}` : '$0.00'}</td>
                        <td style={{ textAlign: 'right', padding: '5px 5px', border: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>{!isUSD ? `${codVal.toLocaleString()} ៛` : '0 ៛'}</td>
                        <td style={{ textAlign: 'right', padding: '5px 5px', border: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>${parseFloat(o.deliveryFee || 0).toFixed(2)}</td>
                        <td style={{ padding: '5px 5px', border: '1px solid #cbd5e1', fontSize: 9.5, color: '#92400e' }}>{latestNote}</td>
                      </tr>
                    );
                  })}
                </>
              )}

              {/* Section 3: Returned */}
              {returnedOrders.length > 0 && (
                <>
                  <tr>
                    <td colSpan={10} style={{ backgroundColor: '#fef2f2', color: '#991b1b', fontWeight: 700, padding: '6px 8px', border: '1px solid #94a3b8', fontSize: 10.5 }}>
                      ៣. អីវ៉ាន់ត្រឡប់ទៅហាង ({returnedOrders.length} កញ្ចប់)
                    </td>
                  </tr>
                  {returnedOrders.map((o: any, idx: number) => {
                    const isUSD = o.codCurrency === 'USD';
                    const codVal = parseFloat(o.cod || 0);
                    const latestNote = getOrderLatestNote(o, 'ត្រឡប់ទៅហាង');
                    return (
                      <tr key={o.id}>
                        <td style={{ textAlign: 'center', padding: '5px 4px', border: '1px solid #cbd5e1' }}>{idx + 1}</td>
                        <td style={{ padding: '5px 4px', border: '1px solid #cbd5e1', textAlign: 'center', whiteSpace: 'nowrap' }}>{formatDateToDDMMYYYY(o.createdAt)}</td>
                        <td style={{ padding: '5px 4px', border: '1px solid #cbd5e1', textAlign: 'center', whiteSpace: 'nowrap' }}>{o.deliveredAt ? formatDateToDDMMYYYY(o.deliveredAt) : ''}</td>
                        <td style={{ padding: '5px 5px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>{o.trackingCode}</td>
                        <td style={{ padding: '5px 5px', border: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>{cleanText(o.receiverPhone)}</td>
                        <td style={{ padding: '5px 6px', border: '1px solid #cbd5e1', wordBreak: 'break-word' }}>{cleanText(o.receiverAddress)}</td>
                        <td style={{ textAlign: 'right', padding: '5px 5px', border: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>{isUSD ? `$${codVal.toFixed(2)}` : '$0.00'}</td>
                        <td style={{ textAlign: 'right', padding: '5px 5px', border: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>{!isUSD ? `${codVal.toLocaleString()} ៛` : '0 ៛'}</td>
                        <td style={{ textAlign: 'right', padding: '5px 5px', border: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>$0.00</td>
                        <td style={{ padding: '5px 5px', border: '1px solid #cbd5e1', fontSize: 9.5, color: '#b91c1c' }}>{latestNote}</td>
                      </tr>
                    );
                  })}
                </>
              )}

              {orders.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 16, border: '1px solid #cbd5e1', color: '#64748b' }}>
                    គ្មានទិន្នន័យ
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Financial Summary Box */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: 16 }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: 340, border: '1.5px solid #0f172a' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '6px 12px', border: '1px solid #94a3b8', textAlign: 'right', color: '#334155' }}>ប្រាក់ COD ប្រមូលបានសរុប</td>
                  <td style={{ padding: '6px 12px', border: '1px solid #94a3b8', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    ${delUSD.toFixed(2)} / {delKHR.toLocaleString()} ៛
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 12px', border: '1px solid #94a3b8', textAlign: 'right', color: '#334155' }}>ដកសេវាដឹកសរុប</td>
                  <td style={{ padding: '6px 12px', border: '1px solid #94a3b8', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap', color: '#dc2626' }}>
                    - ${delFee.toFixed(2)}
                  </td>
                </tr>
                <tr style={{ backgroundColor: '#eff6ff' }}>
                  <td style={{ padding: '7px 12px', border: '1px solid #94a3b8', textAlign: 'right', fontWeight: 800, color: 'var(--sidebar-bg, #1565D8)' }}>ប្រាក់ត្រូវទទួលបានសរុប (Net Payout)</td>
                  <td style={{ padding: '7px 12px', border: '1px solid #94a3b8', fontWeight: 800, color: 'var(--sidebar-bg, #1565D8)', textAlign: 'right', whiteSpace: 'nowrap', fontSize: 12 }}>
                    ${payableUSD.toFixed(2)} / {payableKHR.toLocaleString()} ៛
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: 8, fontSize: 10.5, fontWeight: 700, fontStyle: 'italic', color: '#334155' }}>
              {getKhmerDateString(payment.date ? new Date(payment.date) : new Date())}
            </div>
          </div>

          {/* 2-Column Signatures */}
          <div style={{
            marginTop: 32,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 40,
            textAlign: 'center',
            pageBreakInside: 'avoid'
          }}>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 48 }}>តំណាងហាងទំនិញ</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>................................................</div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 48 }}>គណនេយ្យករ / អ្នកប្រគល់ប្រាក់</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>................................................</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
