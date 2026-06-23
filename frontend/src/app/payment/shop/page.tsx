'use client';

import { useEffect, useState, Fragment, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { MdPrint, MdSearch, MdArrowBack } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';
import DateInput, { formatDateToDDMMYYYY } from '@/components/ui/DateInput';

const getLocalDateString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

export default function PaymentWithShopPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();

  const [merchants, setMerchants] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters State
  const [merchantFilter, setMerchantFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('unpaid');

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Interactive UI State
  const [expandedMerchantId, setExpandedMerchantId] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [orgInfo, setOrgInfo] = useState<any>({
    name: 'E-Express',
    phone: '011609414',
    address: 'Phnom Penh',
  });
  const originalFilterRef = useRef<string | null>(null);
  const isPrintingDetailRef = useRef<boolean>(false);

  const [confirmMerchantId, setConfirmMerchantId] = useState<number | null>(null);
  const [selectedMerchantIds, setSelectedMerchantIds] = useState<number[]>([]);

  const hasAutoPrintedRef = useRef(false);

  useEffect(() => {
    setSelectedMerchantIds([]);
  }, [statusFilter, merchantFilter, startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [merchantRes, orderRes, orgRes] = await Promise.all([
        api.get('/merchants'),
        api.get('/orders'),
        api.get('/settings/organisation').catch(() => null),
      ]);
      setMerchants(merchantRes.data || []);
      setOrders(orderRes.data || []);
      if (orgRes && orgRes.data) {
        setOrgInfo({
          name: orgRes.data.name || 'E-Express',
          phone: orgRes.data.phone || '011609414',
          address: orgRes.data.address || 'Phnom Penh',
        });
      }
    } catch (err) {
      console.error('Error loading payments data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
    loadData();

    const handleAfterPrint = () => {
      document.body.classList.remove('receipt-print-active');
      if (isPrintingDetailRef.current) {
        setMerchantFilter(originalFilterRef.current || '');
        isPrintingDetailRef.current = false;
        originalFilterRef.current = null;
      }
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, [router]);

  // Aggregate and Group orders by merchant
  const groupedData = merchants
    .map(m => {
      let mOrders = orders.filter(o => o.merchantId === m.id);

      // Apply date filters
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        mOrders = mOrders.filter(o => {
          const d = o.deliveredAt ? new Date(o.deliveredAt) : new Date(o.createdAt);
          return d >= start;
        });
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        mOrders = mOrders.filter(o => {
          const d = o.deliveredAt ? new Date(o.deliveredAt) : new Date(o.createdAt);
          return d <= end;
        });
      }

      // Filtered orders for payouts (status: delivered, matching shop payout status)
      const paymentOrders = mOrders.filter(o => 
        o.status === 'delivered' && 
        o.merchantPaymentStatus === statusFilter
      );

      // Package counts stats (all orders)
      const totalCount = mOrders.length;
      const todayStr = getLocalDateString();
      const newCount = mOrders.filter(o => getLocalDateString(new Date(o.createdAt)) === todayStr).length;
      const oldCount = totalCount - newCount;

      const successCount = mOrders.filter(o => o.status === 'delivered').length;
      const inProgressCount = mOrders.filter(o => o.status === 'in-transit' || o.status === 'picked-up').length;
      const failedCount = mOrders.filter(o => o.status === 'failed').length;
      const returnedCount = mOrders.filter(o => o.status === 'returned').length;
      const pendingCount = mOrders.filter(o => o.status === 'pending').length;

      // Apply order status filter if not empty (affects detailed list)
      // if (statusFilter) {
      //   mOrders = mOrders.filter(o => o.status === statusFilter);
      // }

      // Financial statistics (delivered orders only)
      const totalUSD = paymentOrders.filter(o => o.codCurrency === 'USD').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);
      const totalKHR = paymentOrders.filter(o => o.codCurrency === 'KHR').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);

      const qrUSD = paymentOrders.filter(o => o.codCurrency === 'USD' && o.paymentMethod === 'bank').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);
      const qrKHR = paymentOrders.filter(o => o.codCurrency === 'KHR' && o.paymentMethod === 'bank').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);

      const podUSD = paymentOrders.filter(o => o.codCurrency === 'USD' && o.paymentMethod === 'cash').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);
      const podKHR = paymentOrders.filter(o => o.codCurrency === 'KHR' && o.paymentMethod === 'cash').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);

      const deliveryFee = paymentOrders.reduce((sum, o) => sum + parseFloat(o.deliveryFee || 0), 0);

      const payableUSD = Math.max(0, totalUSD - deliveryFee);
      const payableKHR = totalKHR;

      // Check if driver has settled payment with the company (driverPaymentStatus must be 'paid' for all delivered orders)
      const hasUnsettledDriver = paymentOrders.some(
        o => o.status === 'delivered' && o.driverPaymentStatus === 'unpaid'
      );

      return {
        merchant: m,
        orders: mOrders,
        paymentOrders,
        stats: { totalCount, newCount, oldCount, successCount, inProgressCount, failedCount, returnedCount, pendingCount },
        financials: { totalUSD, totalKHR, qrUSD, qrKHR, podUSD, podKHR, deliveryFee, payableUSD, payableKHR },
        hasUnsettledDriver,
      };
    })
    // Filter rows based on search / filter inputs
    .filter(row => {
      // Filter by selected merchant dropdown
      if (merchantFilter && String(row.merchant.id) !== merchantFilter) return false;
      // Only show merchants with relevant payments
      return row.paymentOrders.length > 0;
    });

  // 1. Hook to read query parameters and set states once data is loaded
  useEffect(() => {
    if (loading) return;

    const params = new URLSearchParams(window.location.search);
    const mId = params.get('merchantId');
    const status = params.get('status');
    const start = params.get('startDate');
    const end = params.get('endDate');

    if (mId) {
      setMerchantFilter(mId);
      if (status) {
        setStatusFilter(status);
      } else {
        setStatusFilter('paid');
      }
      if (start) {
        setStartDate(start);
      }
      if (end) {
        setEndDate(end);
      }
    }
  }, [loading]);

  // 2. Hook to trigger print once DOM has updated with the correct states and data
  useEffect(() => {
    if (loading) return;

    const params = new URLSearchParams(window.location.search);
    const mId = params.get('merchantId');
    const print = params.get('print') === 'true';
    const status = params.get('status') || 'paid';
    const start = params.get('startDate');
    const end = params.get('endDate');

    if (mId && print && !hasAutoPrintedRef.current) {
      const filterMatches = merchantFilter === mId && statusFilter === status;
      const startMatches = !start || startDate === start;
      const endMatches = !end || endDate === end;
      const dataReady = groupedData.length > 0 && String(groupedData[0].merchant.id) === mId;

      if (filterMatches && startMatches && endMatches && dataReady) {
        hasAutoPrintedRef.current = true;
        document.body.classList.add('receipt-print-active');
        const timer = setTimeout(() => {
          window.print();
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, merchantFilter, statusFilter, startDate, endDate, groupedData]);

  // Toggle expanded details row
  const toggleDetailRow = (id: number) => {
    setExpandedMerchantId(prev => (prev === id ? null : id));
  };

  const eligibleMerchants = groupedData.filter(row => row.paymentOrders.length > 0 && !row.hasUnsettledDriver);

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMerchantIds(eligibleMerchants.map(row => row.merchant.id));
    } else {
      setSelectedMerchantIds([]);
    }
  };

  const handleToggleSelectMerchant = (mId: number, checked: boolean) => {
    if (checked) {
      setSelectedMerchantIds(prev => [...prev, mId]);
    } else {
      setSelectedMerchantIds(prev => prev.filter(id => id !== mId));
    }
  };

  // Save/Confirm action inside Modal
  const handleConfirmSettlement = async () => {
    const merchantIdsToSettle = confirmMerchantId ? [confirmMerchantId] : selectedMerchantIds;
    if (merchantIdsToSettle.length === 0) return;

    setSaving(true);
    try {
      for (const mId of merchantIdsToSettle) {
        const item = groupedData.find(g => g.merchant.id === mId);
        if (!item || item.paymentOrders.length === 0) continue;

        const orderIds = item.paymentOrders.map(o => o.id);
        const reference = `SETTLE-SHOP-${Date.now().toString().slice(-6)}`;
        const detailUrl = `${window.location.origin}/report_payment_customer?client_id=${mId}&reference=${reference}`;

        await api.post('/payments/shop', {
          merchantId: mId,
          amount: item.financials.payableUSD,
          date: new Date().toISOString(),
          reference,
          note: lang === 'km' 
            ? `ទូទាត់ប្រាក់ហាង។ USD: $${item.financials.payableUSD.toFixed(2)}, KHR: ${item.financials.payableKHR.toLocaleString()} KHR`
            : `Settle shop payout. USD: $${item.financials.payableUSD.toFixed(2)}, KHR: ${item.financials.payableKHR.toLocaleString()} KHR`,
          orderIds,
          telegramReport: {
            totalCount: item.stats.totalCount,
            newCount: item.stats.newCount,
            oldCount: item.stats.oldCount,
            successCount: item.stats.successCount,
            inProgressCount: item.stats.inProgressCount,
            failedCount: item.stats.failedCount,
            returnedCount: item.stats.returnedCount,
            pendingCount: item.stats.pendingCount,
            totalUSD: item.financials.totalUSD,
            totalKHR: item.financials.totalKHR,
            deliveryFee: item.financials.deliveryFee,
            payableUSD: item.financials.payableUSD,
            payableKHR: item.financials.payableKHR,
            detailUrl,
          },
        });
      }

      alert(
        lang === 'km' 
          ? `រក្សាទុកការទូទាត់បានជោគជ័យសម្រាប់ ${merchantIdsToSettle.length} ហាង!` 
          : `Successfully settled payment for ${merchantIdsToSettle.length} shops!`
      );
      setShowConfirmModal(false);
      setConfirmMerchantId(null);
      setSelectedMerchantIds([]);
      await loadData();
    } catch (err: any) {
      alert(lang === 'km' ? 'មានបញ្ហាក្នុងការទូទាត់' : 'Error settling payment: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const triggerPrintReceipt = () => {
    document.body.classList.add('receipt-print-active');
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handlePrintMerchantDetail = (merchantId: number) => {
    originalFilterRef.current = merchantFilter;
    isPrintingDetailRef.current = true;
    setMerchantFilter(String(merchantId));
    document.body.classList.add('receipt-print-active');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // QR Link Builders
  const getDynamicPayLink = (baseUrl: string, amount: number) => {
    if (!baseUrl) return null;
    try {
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}amount=${amount.toFixed(2)}`;
    } catch {
      return baseUrl;
    }
  };

  const formatFee = (fee: any) => {
    if (!fee) return '0.00$';
    return `${parseFloat(fee).toFixed(2)}$`;
  };

  const formatCODDisplay = (cod: any, currency: string) => {
    if (currency === 'KHR') {
      return `${parseInt(cod || 0).toLocaleString()} KHR`;
    }
    return `${parseFloat(cod || 0).toFixed(2)} USD`;
  };

  if (loading) return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="loading-wrapper"><div className="spinner" /></div>
      </div>
    </div>
  );

  return (
    <>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content" style={{ background: '#f3f4f6', minHeight: '100vh' }}>
          
          <Topbar title={lang === 'km' ? 'ទូទាត់ប្រាក់ជាមួយហាង' : 'Payment with Shop'} subtitle={lang === 'km' ? 'គ្រប់គ្រងការទូទាត់ប្រាក់ជាមួយហាង' : 'Manage payout settlement with merchant shops'} />

          <div style={{ padding: '20px' }}>
            
            {/* Breadcrumb Action Panel */}
            <div className="card" style={{ padding: '12px 20px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#4b5563' }}>
                <span>🏠 {lang === 'km' ? 'ព័ត៌មានលម្អិត' : 'Information'}</span>
                <span>/</span>
                <span style={{ fontWeight: '600', color: '#111827' }}>
                  ⚙️ {lang === 'km' ? 'ការទូទាត់ប្រាក់ជាមួយហាង' : 'Payment with Shop'}
                </span>
              </div>
              <button
                className="btn btn-outline"
                onClick={() => router.push('/dashboard')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '34px',
                  padding: '0 14px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#fff',
                  backgroundColor: '#ef4444',
                  borderColor: '#ef4444',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                <MdArrowBack />
                <span>{lang === 'km' ? 'ត្រឡប់' : 'Back'}</span>
              </button>
            </div>

            {/* Filters Bar Card */}
            <div className="card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', backgroundColor: '#fff' }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563' }}>
                    {lang === 'km' ? 'ឈ្មោះហាង' : 'Shop Name'}
                  </span>
                  <select
                    className="form-control"
                    value={merchantFilter}
                    onChange={e => setMerchantFilter(e.target.value)}
                    style={{ width: '240px', height: '38px', padding: '6px 12px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}
                  >
                    <option value="">{lang === 'km' ? '— ទាំងអស់ —' : '— All Shops —'}</option>
                    {merchants.map(m => (
                      <option key={m.id} value={m.id}>
                        {lang === 'km' && m.nameKh ? m.nameKh : m.name} ({m.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563' }}>
                    {lang === 'km' ? 'ស្ថានភាពទូទាត់' : 'Payment Status'}
                  </span>
                  <select
                    className="form-control"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    style={{ width: '200px', height: '38px', padding: '6px 12px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}
                  >
                    <option value="unpaid">{lang === 'km' ? 'មិនទាន់ទូទាត់' : 'Unpaid'}</option>
                    <option value="paid">{lang === 'km' ? 'ទូទាត់រួច' : 'Paid'}</option>
                  </select>
                </div>

                <DateInput
                  labelEn="Start Date"
                  labelKh="ចាប់ពីថ្ងៃ"
                  value={startDate}
                  onChange={setStartDate}
                  style={{ minWidth: 220 }}
                />
                <DateInput
                  labelEn="End Date"
                  labelKh="ដល់"
                  value={endDate}
                  onChange={setEndDate}
                  style={{ minWidth: 220 }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {statusFilter === 'unpaid' && selectedMerchantIds.length > 0 && (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setConfirmMerchantId(null);
                      setShowConfirmModal(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      height: '38px',
                      padding: '0 16px',
                      fontSize: '13px',
                      fontWeight: '600',
                      borderRadius: '4px',
                      color: '#fff',
                      backgroundColor: '#10b981',
                      borderColor: '#10b981',
                      cursor: 'pointer'
                    }}
                  >
                    <span>{lang === 'km' ? `ទូទាត់ដែលបានជ្រើសរើស (${selectedMerchantIds.length})` : `Settle Selected (${selectedMerchantIds.length})`}</span>
                  </button>
                )}
                <button
                  className="btn btn-outline"
                  onClick={triggerPrintReceipt}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    height: '38px',
                    padding: '0 16px',
                    fontSize: '13px',
                    fontWeight: '600',
                    borderRadius: '4px',
                    borderColor: '#d1d5db',
                    backgroundColor: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <MdPrint size={18} />
                  <span>{lang === 'km' ? 'បោះពុម្ព' : 'Print'}</span>
                </button>
              </div>
            </div>

            {/* Merchant Payment Grid Card */}
            <div className="card" style={{ padding: '20px', backgroundColor: '#fff', border: '1px solid #e5e7eb' }}>
              <div className="table-responsive" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #dee2e6' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ padding: '12px 8px', border: '1px solid #dee2e6', textAlign: 'center', fontSize: '13px', width: '40px' }}>{lang === 'km' ? 'ល.រ' : 'No.'}</th>
                      <th style={{ padding: '12px 8px', border: '1px solid #dee2e6', textAlign: 'left', fontSize: '13px', width: '220px' }}>{lang === 'km' ? 'អតិថិជន' : 'Customer'}</th>
                      <th style={{ padding: '12px 8px', border: '1px solid #dee2e6', textAlign: 'left', fontSize: '13px', width: '200px' }}>{lang === 'km' ? 'ចំនួនកញ្ចប់' : 'Parcels'}</th>
                      <th style={{ padding: '12px 8px', border: '1px solid #dee2e6', textAlign: 'left', fontSize: '13px', width: '160px' }}>{lang === 'km' ? 'ទឹកប្រាក់សរុបរួម' : 'Total Amount'}</th>
                      <th style={{ padding: '12px 8px', border: '1px solid #dee2e6', textAlign: 'left', fontSize: '13px', width: '160px' }}>{lang === 'km' ? 'ទឹកប្រាក់ (QR ហាង)' : 'Amount (Shop QR)'}</th>
                      <th style={{ padding: '12px 8px', border: '1px solid #dee2e6', textAlign: 'left', fontSize: '13px' }}>{lang === 'km' ? 'ទឹកប្រាក់ (POD)' : 'Amount (POD)'}</th>
                      <th style={{ padding: '12px 8px', border: '1px solid #dee2e6', textAlign: 'center', fontSize: '13px', width: '180px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <span>{lang === 'km' ? 'បញ្ជាក់ (✓/X)' : 'Confirm (✓/X)'}</span>
                          {statusFilter === 'unpaid' && eligibleMerchants.length > 0 && (
                            <input
                              type="checkbox"
                              checked={eligibleMerchants.length > 0 && selectedMerchantIds.length === eligibleMerchants.length}
                              onChange={e => handleToggleSelectAll(e.target.checked)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedData.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#6b7280', fontSize: '14px' }}>
                          {lang === 'km' ? 'គ្មានទិន្នន័យក្នុងតារាងទេ' : 'No data available in table'}
                        </td>
                      </tr>
                    ) : (
                      groupedData.map((row, idx) => {
                        const m = row.merchant;
                        const stats = row.stats;
                        const financials = row.financials;
                        
                        return (
                          <Fragment key={m.id}>
                            {/* Merchant Summary Row */}
                            <tr style={{ borderBottom: '1px solid #dee2e6', verticalAlign: 'top', backgroundColor: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                              
                              {/* 1. Index */}
                              <td style={{ padding: '12px 8px', border: '1px solid #dee2e6', textAlign: 'center', fontWeight: '600' }}>
                                {idx + 1}
                              </td>

                              {/* 2. Customer details */}
                              <td style={{ padding: '12px 8px', border: '1px solid #dee2e6', fontSize: '13px' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#111827' }}>
                                  {lang === 'km' && m.nameKh ? m.nameKh : m.name}
                                </div>
                                <div style={{ color: '#6b7280', marginTop: '2px' }}>
                                  {getLocalDateString()}
                                </div>
                                <div style={{ color: '#4b5563', marginTop: '2px' }}>
                                  {m.phone}
                                </div>
                                <div style={{ marginTop: '8px' }}>
                                  <span
                                    onClick={() => handlePrintMerchantDetail(m.id)}
                                    style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}
                                  >
                                    {lang === 'km' ? 'មើលលម្អិត' : 'View Detail'}
                                  </span>
                                </div>
                              </td>

                              {/* 3. Package counts */}
                              <td style={{ padding: '12px 8px', border: '1px solid #dee2e6', fontSize: '13px' }}>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <li>• {lang === 'km' ? 'សរុប ៖' : 'Total:'} {stats.totalCount} ({stats.newCount} {lang === 'km' ? 'ថ្មី' : 'New'}) / ({stats.oldCount} {lang === 'km' ? 'ចាស់' : 'Old'})</li>
                                  <li style={{ color: '#16a34a', fontWeight: '600' }}>• {lang === 'km' ? 'ជោគជ័យ ៖' : 'Success:'} {stats.successCount}</li>
                                  <li style={{ color: '#2563eb' }}>• {lang === 'km' ? 'កំពុងដំណើរការ ៖' : 'In Transit:'} {stats.inProgressCount}</li>
                                  <li style={{ color: '#dc2626' }}>• {lang === 'km' ? 'បោះបង់ ៖' : 'Cancelled:'} {stats.failedCount}</li>
                                  <li style={{ color: '#7c3aed' }}>• {lang === 'km' ? 'ត្រឡប់ ៖' : 'Returned:'} {stats.returnedCount}</li>
                                  <li style={{ color: '#eab308' }}>• {lang === 'km' ? 'ក្នុងស្តុក ៖' : 'In Stock:'} {stats.pendingCount}</li>
                                </ul>
                              </td>

                              {/* 4. Total overall amount */}
                              <td style={{ padding: '12px 8px', border: '1px solid #dee2e6', fontSize: '13px' }}>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <li>• {lang === 'km' ? 'សរុប ៖' : 'Total:'} $ {financials.totalUSD.toFixed(2)}</li>
                                  <li>• {lang === 'km' ? 'ដុល្លារ ៖' : 'USD:'} $ {financials.totalUSD.toFixed(2)}</li>
                                  <li>• {lang === 'km' ? 'ខ្មែរ ៖' : 'KHR:'} {financials.totalKHR.toLocaleString()} {lang === 'km' ? 'រៀល' : 'KHR'}</li>
                                </ul>
                              </td>

                              {/* 5. Shop QR payments (bank) */}
                              <td style={{ padding: '12px 8px', border: '1px solid #dee2e6', fontSize: '13px' }}>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <li>• {lang === 'km' ? 'សរុប ៖' : 'Total:'} $ {financials.qrUSD.toFixed(2)}</li>
                                  <li>• {lang === 'km' ? 'ដុល្លារ ៖' : 'USD:'} $ {financials.qrUSD.toFixed(2)}</li>
                                  <li>• {lang === 'km' ? 'ខ្មែរ ៖' : 'KHR:'} {financials.qrKHR.toLocaleString()} {lang === 'km' ? 'រៀល' : 'KHR'}</li>
                                </ul>
                              </td>

                              {/* 6. Pay on Delivery payments (cash) */}
                              <td style={{ padding: '12px 8px', border: '1px solid #dee2e6', fontSize: '13px' }}>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <li>• {lang === 'km' ? 'សរុប ៖' : 'Total:'} $ {financials.podUSD.toFixed(2)}</li>
                                  <li>• {lang === 'km' ? 'ដុល្លារ ៖' : 'USD:'} $ {financials.podUSD.toFixed(2)}</li>
                                  <li>• {lang === 'km' ? 'ខ្មែរ ៖' : 'KHR:'} {financials.podKHR.toLocaleString()} {lang === 'km' ? 'រៀល' : 'KHR'}</li>
                                  <div style={{ height: '1px', background: '#dee2e6', margin: '4px 0' }} />
                                  <li style={{ color: '#2563eb', fontWeight: 'bold' }}>• {lang === 'km' ? 'ប្រាក់ទូទាត់ជាដុល្លារ ៖' : 'Payable USD:'} $ {financials.payableUSD.toFixed(2)}</li>
                                  <li style={{ color: '#2563eb', fontWeight: 'bold' }}>• {lang === 'km' ? 'ប្រាក់ទូទាត់ជាខ្មែរ ៖' : 'Payable KHR:'} {financials.payableKHR.toLocaleString()} {lang === 'km' ? '៛' : 'KHR'}</li>
                                  <li style={{ color: '#dc2626' }}>• {lang === 'km' ? 'សេវាដឹកត្រូវទទួល ៖' : 'Delivery Fee:'} $ {financials.deliveryFee.toFixed(2)}</li>
                                  
                                  {/* Dynamic payment links */}
                                  <div style={{ display: 'flex', gap: '6px', fontSize: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
                                    {m.qrLinkUsd ? (
                                      <a
                                        href={getDynamicPayLink(m.qrLinkUsd, financials.payableUSD) || '#'}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ color: '#2563eb', fontWeight: 'bold', textDecoration: 'underline' }}
                                      >
                                        Pay Base USD
                                      </a>
                                    ) : (
                                      <span style={{ color: '#9ca3af' }}>Pay Base USD</span>
                                    )}
                                    <span style={{ color: '#d1d5db' }}>|</span>
                                    
                                    {m.qrLinkUsd ? (
                                      <a
                                        href={getDynamicPayLink(m.qrLinkUsd, financials.payableUSD) || '#'}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ color: '#2563eb', fontWeight: 'bold', textDecoration: 'underline' }}
                                      >
                                        Pay USD
                                      </a>
                                    ) : (
                                      <span style={{ color: '#9ca3af' }}>Pay USD</span>
                                    )}
                                    <span style={{ color: '#d1d5db' }}>|</span>
                                    
                                    {m.qrLinkKhr ? (
                                      <a
                                        href={getDynamicPayLink(m.qrLinkKhr, financials.payableKHR) || '#'}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ color: '#2563eb', fontWeight: 'bold', textDecoration: 'underline' }}
                                      >
                                        Pay KHR
                                      </a>
                                    ) : (
                                      <span style={{ color: '#9ca3af' }}>Pay KHR</span>
                                    )}
                                  </div>
                                </ul>
                              </td>

                              {/* 7. Confirm checkboxes */}
                              <td style={{ padding: '12px 8px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                                {row.hasUnsettledDriver ? (
                                  <span style={{ display: 'inline-block', padding: '6px 10px', background: '#fee2e2', color: '#dc2626', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                                    {lang === 'km' ? 'មិនទាន់ធ្វើការទូទាត់ជាមួយអ្នកដឹក' : 'Not settled with Driver'}
                                  </span>
                                ) : (statusFilter === 'unpaid' && row.paymentOrders.length > 0) ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                    <input
                                      type="checkbox"
                                      checked={selectedMerchantIds.includes(m.id)}
                                      onChange={e => handleToggleSelectMerchant(m.id, e.target.checked)}
                                      style={{ width: '22px', height: '22px', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '12px', fontWeight: '600' }}>{lang === 'km' ? 'បញ្ជាក់' : 'Is Confirm'}</span>
                                  </div>
                                ) : (
                                  <span style={{ display: 'inline-block', padding: '6px 12px', background: '#dcfce7', color: '#15803d', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                                    {lang === 'km' ? 'ទូទាត់រួច' : 'Settled'}
                                  </span>
                                )}
                              </td>

                            </tr>

                            {/* Detailed Drill Expanded Section */}
                            {expandedMerchantId === m.id && (
                              <tr>
                                <td colSpan={7} style={{ backgroundColor: '#f9fafb', padding: '16px', border: '1px solid #dee2e6' }}>
                                  <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#374151' }}>
                                    📋 {lang === 'km' ? 'បញ្ជីទំនិញលម្អិត' : 'Detailed Order List'}
                                  </h4>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
                                    <thead>
                                      <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #d1d5db' }}>
                                        <th style={{ padding: '8px 6px', border: '1px solid #e5e7eb', textAlign: 'left' }}>{lang === 'km' ? 'កូដ' : 'Tracking Code'}</th>
                                        <th style={{ padding: '8px 6px', border: '1px solid #e5e7eb', textAlign: 'left' }}>{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                                        <th style={{ padding: '8px 6px', border: '1px solid #e5e7eb', textAlign: 'left' }}>{lang === 'km' ? 'លេខអ្នកទទួល' : 'Receiver Phone'}</th>
                                        <th style={{ padding: '8px 6px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{lang === 'km' ? 'សេវាដឹក' : 'Delivery Fee'}</th>
                                        <th style={{ padding: '8px 6px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{lang === 'km' ? 'ទឹកប្រាក់ត្រូវទូទាត់' : 'Amount/COD'}</th>
                                        <th style={{ padding: '8px 6px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{lang === 'km' ? 'វិធីសាស្ត្រទូទាត់' : 'Payment Method'}</th>
                                        <th style={{ padding: '8px 6px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{lang === 'km' ? 'ស្ថានភាពអ្នកដឹក' : 'Driver Status'}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {row.paymentOrders.length === 0 ? (
                                        <tr>
                                          <td colSpan={7} style={{ textAlign: 'center', padding: '12px', color: '#6b7280' }}>
                                            {lang === 'km' ? 'មិនមានការបញ្ជាទិញត្រូវនឹងតម្រងស្ថានភាពទេ' : 'No orders matching status filter'}
                                          </td>
                                        </tr>
                                      ) : (
                                        row.paymentOrders.map((o: any) => (
                                          <tr key={o.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                            <td style={{ padding: '8px 6px', border: '1px solid #e5e7eb' }}><code>{o.trackingCode}</code></td>
                                            <td style={{ padding: '8px 6px', border: '1px solid #e5e7eb' }}>{getLocalDateString(new Date(o.createdAt))}</td>
                                            <td style={{ padding: '8px 6px', border: '1px solid #e5e7eb', fontWeight: '600' }}>{o.receiverPhone}</td>
                                            <td style={{ padding: '8px 6px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{formatFee(o.deliveryFee)}</td>
                                            <td style={{ padding: '8px 6px', border: '1px solid #e5e7eb', textAlign: 'right', fontWeight: 'bold' }}>{formatCODDisplay(o.cod, o.codCurrency)}</td>
                                            <td style={{ padding: '8px 6px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                              <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                                                {o.paymentMethod === 'bank' ? (lang === 'km' ? 'ធនាគារ' : 'Bank') : (lang === 'km' ? 'សាច់ប្រាក់' : 'Cash')}
                                              </span>
                                            </td>
                                            <td style={{ padding: '8px 6px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                              <span style={{
                                                fontSize: '11px',
                                                background: o.driverPaymentStatus === 'paid' ? '#dcfce7' : '#fee2e2',
                                                color: o.driverPaymentStatus === 'paid' ? '#15803d' : '#b91c1c',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                fontWeight: '600'
                                              }}>
                                                {o.driverPaymentStatus === 'paid' ? (lang === 'km' ? 'ទូទាត់រួច' : 'Settled') : (lang === 'km' ? 'មិនទាន់ទូទាត់' : 'Unsettled')}
                                              </span>
                                            </td>
                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '24px',
            borderRadius: '8px',
            width: '420px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#111827' }}>
              {lang === 'km' ? 'បញ្ជាក់ការទូទាត់' : 'Confirm Payment'}
            </h3>
            <p style={{ fontSize: '15px', color: '#4b5563', marginBottom: '24px', lineHeight: '1.5' }}>
              {lang === 'km' 
                ? `តើអ្នកប្រាកដជាចង់រក្សាទុកការទូទាត់សម្រាប់ហាងចំនួន ${confirmMerchantId ? 1 : selectedMerchantIds.length} នេះមែនទេ?`
                : `Are you sure you want to settle payment for ${confirmMerchantId ? 1 : selectedMerchantIds.length} shops?`}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmMerchantId(null);
                }}
                style={{ height: '36px', padding: '0 16px', borderRadius: '4px', borderColor: '#d1d5db', cursor: 'pointer', fontSize: '13px' }}
              >
                {lang === 'km' ? 'បិទ' : 'Close'}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmSettlement}
                disabled={saving}
                style={{
                  height: '36px',
                  padding: '0 18px',
                  borderRadius: '4px',
                  backgroundColor: '#2563eb',
                  borderColor: '#2563eb',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                {saving ? (lang === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...') : (lang === 'km' ? 'រក្សាទុក' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Layout Container (Print-only) */}
      {(() => {
        return (
          <div className="receipt-print-container" style={{ fontFamily: 'Kantumruy Pro, Inter, sans-serif' }}>
            {/* Header Layout (Matches template) */}
            {(() => {
              const hasMerchant = merchantFilter && groupedData.length > 0;
              const activeMerchant = hasMerchant ? groupedData[0].merchant : null;
              
              return (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, borderBottom: '2px solid #000', paddingBottom: 15 }}>
                  {/* Left side: Company Info */}
                  <div style={{ fontSize: 11, lineHeight: '1.6', flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 6,
                        background: '#2563eb',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 15
                      }}>
                        📦
                      </div>
                      <span style={{ fontSize: 14, fontWeight: '800', color: '#1e3a8a', fontStyle: 'italic' }}>
                        {orgInfo.name}
                      </span>
                    </div>
                    <div><strong>{lang === 'km' ? 'អាសយដ្ឋាន៖' : 'Address:'}</strong> {orgInfo.address}</div>
                    <div><strong>{lang === 'km' ? 'ទូរស័ព្ទ៖' : 'Phone:'}</strong> {orgInfo.phone}</div>
                  </div>

                  {/* Center side: Title */}
                  <div style={{ textAlign: 'center', alignSelf: 'center', flex: 1.2 }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 'bold', fontFamily: 'Kantumruy Pro, sans-serif', color: '#000' }}>
                      {lang === 'km' ? 'របាយការណ៍ទូទាត់ប្រចាំថ្ងៃ' : 'Daily Settlement Report'}
                    </h2>
                  </div>

                  {/* Right side: Merchant & Date Info */}
                  <div style={{ fontSize: 11, textAlign: 'right', lineHeight: '1.6', flex: 1 }}>
                    <div><strong>{lang === 'km' ? 'ឈ្មោះហាង៖' : 'Shop Name:'}</strong> <span style={{ fontStyle: 'italic', fontWeight: 'bold' }}>{hasMerchant ? (lang === 'km' && activeMerchant.nameKh ? activeMerchant.nameKh : activeMerchant.name) : (lang === 'km' ? 'ទាំងអស់' : 'All Shops')}</span></div>
                    <div><strong>{lang === 'km' ? 'ទូរស័ព្ទ៖' : 'Phone:'}</strong> {hasMerchant ? activeMerchant.phone : '—'}</div>
                    <div><strong>{lang === 'km' ? 'កាលបរិច្ឆេទ៖' : 'Date:'}</strong> {formatDateToDDMMYYYY(new Date().toISOString())}</div>
                  </div>
                </div>
              );
            })()}

            {merchantFilter && groupedData.length > 0 ? (
              (() => {
                const row = groupedData[0];
                const deliveredOrders = row.paymentOrders;
                const inTransitOrders = row.orders.filter((o: any) => o.status === 'in-transit' || o.status === 'picked-up' || o.status === 'pending');
                const returnedOrders = row.orders.filter((o: any) => o.status === 'returned' || o.status === 'failed');

                const delUSD = deliveredOrders.filter((o: any) => o.codCurrency === 'USD').reduce((sum: number, o: any) => sum + parseFloat(o.cod || 0), 0);
                const delKHR = deliveredOrders.filter((o: any) => o.codCurrency === 'KHR').reduce((sum: number, o: any) => sum + parseFloat(o.cod || 0), 0);
                const delFee = deliveredOrders.reduce((sum: number, o: any) => sum + parseFloat(o.deliveryFee || 0), 0);

                const payableUSD = Math.max(0, delUSD - delFee);
                const payableKHR = delKHR;

                return (
                  <>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 11 }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                          <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold' }}>{lang === 'km' ? 'ល.រ' : 'No.'}</th>
                          <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold' }}>{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                          <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold' }}>{lang === 'km' ? 'បរិយាយ' : 'Description'}</th>
                          <th colSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold' }}>{lang === 'km' ? <>ទឹកប្រាក់ដើមមាន<br/>(ដុល្លារ / ខ្មែរ)</> : <>Original Amount<br/>(USD / KHR)</>}</th>
                          <th colSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold' }}>{lang === 'km' ? <>ទឹកប្រាក់ទទួលបាន<br/>(ដុល្លារ / ខ្មែរ)</> : <>Received Amount<br/>(USD / KHR)</>}</th>
                          <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold' }}>{lang === 'km' ? 'សេវាដឹក' : 'Delivery Fee'}</th>
                          <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold' }}>{lang === 'km' ? 'ផ្សេងៗ' : 'Remark'}</th>
                        </tr>
                        <tr>
                          <th style={{ border: '1px solid #000', borderTop: 'none', padding: '2px', fontSize: '9px', fontWeight: 'normal', textAlign: 'center' }}>{lang === 'km' ? 'ដុល្លារ' : 'USD'}</th>
                          <th style={{ border: '1px solid #000', borderTop: 'none', padding: '2px', fontSize: '9px', fontWeight: 'normal', textAlign: 'center' }}>{lang === 'km' ? 'ខ្មែរ' : 'KHR'}</th>
                          <th style={{ border: '1px solid #000', borderTop: 'none', padding: '2px', fontSize: '9px', fontWeight: 'normal', textAlign: 'center' }}>{lang === 'km' ? 'ដុល្លារ' : 'USD'}</th>
                          <th style={{ border: '1px solid #000', borderTop: 'none', padding: '2px', fontSize: '9px', fontWeight: 'normal', textAlign: 'center' }}>{lang === 'km' ? 'ខ្មែរ' : 'KHR'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Delivered Section */}
                        {deliveredOrders.length > 0 && (
                          <>
                            <tr>
                              <td colSpan={9} style={{ backgroundColor: '#2ecc71', color: '#fff', fontWeight: 'bold', padding: '6px', border: '1px solid #000' }}>{lang === 'km' ? 'អីវ៉ាន់ដែលបានជោគជ័យ' : 'Delivered Packages'}</td>
                            </tr>
                            {deliveredOrders.map((o: any, idx: number) => {
                              const isUSD = o.codCurrency === 'USD';
                              const codVal = parseFloat(o.cod || 0);
                              return (
                                <tr key={o.id}>
                                  <td style={{ textAlign: 'center', padding: '6px 4px', border: '1px solid #000' }}>{idx + 1}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}>{formatDateToDDMMYYYY(o.createdAt)}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000' }}>{o.trackingCode} {o.receiverPhone ? `(${o.receiverPhone})` : ''}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>{isUSD ? `$ ${codVal.toFixed(2)}` : '$ 0'}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>{!isUSD ? `${codVal.toLocaleString()} ៛` : '0 ៛'}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>{isUSD ? `$ ${codVal.toFixed(2)}` : '$ 0.00'}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>{!isUSD ? `${codVal.toLocaleString()} ៛` : '0 ៛'}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>$ {parseFloat(o.deliveryFee || 0).toFixed(2)}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}></td>
                                </tr>
                              );
                            })}
                            <tr>
                              <td colSpan={3} style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000' }}>{lang === 'km' ? 'សរុប' : 'Total'}</td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000' }}>$ {delUSD.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000' }}>{delKHR.toLocaleString()} {lang === 'km' ? 'រៀល' : 'KHR'}</td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000' }}>$ {delUSD.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000' }}>{delKHR.toLocaleString()} {lang === 'km' ? 'រៀល' : 'KHR'}</td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000' }}>$ {delFee.toFixed(2)}</td>
                              <td style={{ border: '1px solid #000' }}></td>
                            </tr>
                          </>
                        )}

                        {/* In Transit Section */}
                        {inTransitOrders.length > 0 && (
                          <>
                            <tr>
                              <td colSpan={9} style={{ backgroundColor: '#1abc9c', color: '#fff', fontWeight: 'bold', padding: '6px', border: '1px solid #000' }}>{lang === 'km' ? 'អីវ៉ាន់កំពុងដឹក' : 'In Transit Packages'}</td>
                            </tr>
                            {inTransitOrders.map((o: any, idx: number) => {
                              const isUSD = o.codCurrency === 'USD';
                              const codVal = parseFloat(o.cod || 0);
                              return (
                                <tr key={o.id}>
                                  <td style={{ textAlign: 'center', padding: '6px 4px', border: '1px solid #000' }}>{idx + 1}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}>{formatDateToDDMMYYYY(o.createdAt)}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000' }}>{o.trackingCode} {o.receiverPhone ? `(${o.receiverPhone})` : ''}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>{isUSD ? `$ ${codVal.toFixed(2)}` : '$ 0'}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>{!isUSD ? `${codVal.toLocaleString()} ៛` : '0'}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}></td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}></td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>$ {parseFloat(o.deliveryFee || 0).toFixed(2)}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}>{o.note || (o.status === 'returned' ? (lang === 'km' ? 'ត្រឡប់' : 'Returned') : (lang === 'km' ? 'មិនជោគជ័យ' : 'Failed'))}</td>
                                </tr>
                              );
                            })}
                          </>
                        )}

                        {/* Returned Section */}
                        {returnedOrders.length > 0 && (
                          <>
                            <tr>
                              <td colSpan={9} style={{ backgroundColor: '#e74c3c', color: '#fff', fontWeight: 'bold', padding: '6px', border: '1px solid #000' }}>{lang === 'km' ? 'អីវ៉ាន់ត្រឡប់ទៅហាង' : 'Returned Packages'}</td>
                            </tr>
                            {returnedOrders.map((o: any, idx: number) => {
                              const isUSD = o.codCurrency === 'USD';
                              const codVal = parseFloat(o.cod || 0);
                              return (
                                <tr key={o.id}>
                                  <td style={{ textAlign: 'center', padding: '6px 4px', border: '1px solid #000' }}>{idx + 1}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}>{formatDateToDDMMYYYY(o.createdAt)}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000' }}>{o.trackingCode} {o.receiverPhone ? `(${o.receiverPhone})` : ''}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>{isUSD ? `$ ${codVal.toFixed(2)}` : '$ 0'}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>{!isUSD ? `${codVal.toLocaleString()} ៛` : '0 ៛'}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}></td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}></td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>$ {parseFloat(o.deliveryFee || 0).toFixed(2)}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}>{o.note || (o.status === 'returned' ? (lang === 'km' ? 'ត្រឡប់' : 'Returned') : (lang === 'km' ? 'មិនជោគជ័យ' : 'Failed'))}</td>
                                </tr>
                              );
                            })}
                          </>
                        )}
                      </tbody>
                    </table>

                    {/* Financial summaries Box */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: 20 }}>
                      <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '280px', border: '1px solid #000' }}>
                        <tbody>
                          <tr>
                            <td style={{ padding: '6px 12px', border: '1px solid #000', textAlign: 'right' }}>{lang === 'km' ? 'ប្រាក់សរុប' : 'Total Amount'}</td>
                            <td style={{ padding: '6px 12px', border: '1px solid #000', fontWeight: 'bold', textAlign: 'right' }}>$ {delUSD.toFixed(2)} / {delKHR.toLocaleString()} {lang === 'km' ? 'រៀល' : 'KHR'}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '6px 12px', border: '1px solid #000', textAlign: 'right' }}>{lang === 'km' ? 'សេវាដឹក' : 'Delivery Fee'}</td>
                            <td style={{ padding: '6px 12px', border: '1px solid #000', fontWeight: 'bold', textAlign: 'right' }}>$ {delFee.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '6px 12px', border: '1px solid #000', textAlign: 'right' }}>{lang === 'km' ? 'ប្រាក់ត្រូវទទួលបាន' : 'Net Payable'}</td>
                            <td style={{ padding: '6px 12px', border: '1px solid #000', fontWeight: 'bold', color: '#dc2626', textAlign: 'right' }}>$ {payableUSD.toFixed(2)} / {payableKHR.toLocaleString()} {lang === 'km' ? 'រៀល' : 'KHR'}</td>
                          </tr>
                        </tbody>
                      </table>
                      
                      {/* Khmer Date */}
                      <div style={{ marginTop: 8, fontSize: 11, fontWeight: 'bold', fontStyle: 'italic', color: '#000' }}>
                        {lang === 'km' ? getKhmerDateString(new Date()) : new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>

                    {/* Signatures */}
                    <div style={{ marginTop: 30, display: 'flex', justifyContent: 'space-between', paddingLeft: 30 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 40 }}>{lang === 'km' ? 'បានឃើញ និងឯកភាព' : 'Approved By'}</div>
                        <div style={{ fontSize: 12, color: '#000' }}>..........................................</div>
                      </div>
                    </div>
                  </>
                );
              })()
            ) : (
              /* Summary list for all merchants */
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #000', backgroundColor: '#f8f9fa' }}>
                      <th style={{ textAlign: 'left', padding: '8px 6px', border: '1px solid #000', fontWeight: 'bold' }}>{lang === 'km' ? 'ហាងអតិថិជន' : 'Merchant Shop'}</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px', border: '1px solid #000', fontWeight: 'bold' }}>{lang === 'km' ? 'ទឹកប្រាក់ត្រូវទូទាត់សរុប' : 'Net Payable Amount'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedData.map((row) => (
                      <tr key={row.merchant.id} style={{ borderBottom: '1px solid #cbd5e1' }}>
                        <td style={{ padding: '8px 6px', border: '1px solid #000' }}>
                          {row.merchant.name} {row.merchant.nameKh ? `(${row.merchant.nameKh})` : ''} ({row.merchant.phone})
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 6px', border: '1px solid #000', fontWeight: 'bold' }}>
                          ${row.financials.payableUSD.toFixed(2)} / {row.financials.payableKHR.toLocaleString()} {lang === 'km' ? 'រៀល' : 'KHR'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Localized Date for Summary Print */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 15 }}>
                  <div style={{ fontSize: 11, fontWeight: 'bold', fontStyle: 'italic', color: '#000' }}>
                    {lang === 'km' ? getKhmerDateString(new Date()) : new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>

                <div style={{ marginTop: 30, display: 'flex', justifyContent: 'space-between', paddingLeft: 30 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 40 }}>{lang === 'km' ? 'បានឃើញ និងឯកភាព' : 'Approved By'}</div>
                    <div style={{ fontSize: 12, color: '#000' }}>..........................................</div>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })()}
    </>
  );
}
