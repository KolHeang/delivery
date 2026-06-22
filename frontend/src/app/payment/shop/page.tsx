'use client';

import { useEffect, useState, Fragment } from 'react';
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

export default function PaymentWithShopPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();

  const [merchants, setMerchants] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters State
  const [merchantFilter, setMerchantFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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
  const [confirmMerchantId, setConfirmMerchantId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [merchantRes, orderRes] = await Promise.all([
        api.get('/merchants'),
        api.get('/orders'),
      ]);
      setMerchants(merchantRes.data || []);
      setOrders(orderRes.data || []);
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

    const handleAfterPrint = () => document.body.classList.remove('receipt-print-active');
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

      // Filtered orders for payouts (status: delivered, matching shop payout status: unpaid)
      const paymentOrders = mOrders.filter(o => 
        o.status === 'delivered' && 
        o.merchantPaymentStatus === 'unpaid'
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
      if (statusFilter) {
        mOrders = mOrders.filter(o => o.status === statusFilter);
      }

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
      // Only show merchants with relevant payments or orders
      return row.paymentOrders.length > 0 || row.orders.length > 0;
    });

  // Toggle expanded details row
  const toggleDetailRow = (id: number) => {
    setExpandedMerchantId(prev => (prev === id ? null : id));
  };

  // Checkbox Confirm click
  const handleToggleConfirm = (mId: number, checked: boolean) => {
    if (checked) {
      setConfirmMerchantId(mId);
      setShowConfirmModal(true);
    }
  };

  // Save/Confirm action inside Modal
  const handleConfirmSettlement = async () => {
    if (!confirmMerchantId) return;
    const item = groupedData.find(g => g.merchant.id === confirmMerchantId);
    if (!item || item.paymentOrders.length === 0) return;

    setSaving(true);
    try {
      const orderIds = item.paymentOrders.map(o => o.id);
      await api.post('/payments/shop', {
        merchantId: confirmMerchantId,
        amount: item.financials.payableUSD,
        date: new Date().toISOString(),
        reference: `SETTLE-SHOP-${Date.now().toString().slice(-6)}`,
        note: `Settle shop payout. USD: $${item.financials.payableUSD.toFixed(2)}, KHR: ${item.financials.payableKHR.toLocaleString()} KHR`,
        orderIds,
      });

      alert(lang === 'km' ? 'រក្សាទុកការទូទាត់បានជោគជ័យ!' : 'Payment settled successfully!');
      setShowConfirmModal(false);
      setConfirmMerchantId(null);
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
          
          <Topbar title="Payment with Shop" subtitle="ទូទាត់ប្រាក់ជាមួយហាង" />

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
                    {lang === 'km' ? 'ស្ថានភាព' : 'Status'}
                  </span>
                  <select
                    className="form-control"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    style={{ width: '200px', height: '38px', padding: '6px 12px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}
                  >
                    <option value="">{lang === 'km' ? 'ជ្រើសរើសស្ថានភាព' : 'Select Status'}</option>
                    <option value="pending">{lang === 'km' ? 'កំពុងរង់ចាំ (Pending)' : 'Pending'}</option>
                    <option value="in-warehouse">{lang === 'km' ? 'ក្នុងឃ្លាំង (In-Warehouse)' : 'In-Warehouse'}</option>
                    <option value="assigned">{lang === 'km' ? 'បានចាត់តាំង (Assigned)' : 'Assigned'}</option>
                    <option value="picked-up">{lang === 'km' ? 'បានយក (Picked-Up)' : 'Picked-Up'}</option>
                    <option value="in-transit">{lang === 'km' ? 'កំពុងដឹកជញ្ជូន (In-Transit)' : 'In-Transit'}</option>
                    <option value="delivered">{lang === 'km' ? 'បានបញ្ជូន (Delivered)' : 'Delivered'}</option>
                    <option value="failed">{lang === 'km' ? 'បរាជ័យ (Failed)' : 'Failed'}</option>
                    <option value="returned">{lang === 'km' ? 'ត្រឡប់មកវិញ (Returned)' : 'Returned'}</option>
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

            {/* Merchant Payment Grid Card */}
            <div className="card" style={{ padding: '20px', backgroundColor: '#fff', border: '1px solid #e5e7eb' }}>
              <div className="table-responsive" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #dee2e6' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ padding: '12px 8px', border: '1px solid #dee2e6', textAlign: 'center', fontSize: '13px', width: '40px' }}>ល.រ</th>
                      <th style={{ padding: '12px 8px', border: '1px solid #dee2e6', textAlign: 'left', fontSize: '13px', width: '220px' }}>អតិថិជន</th>
                      <th style={{ padding: '12px 8px', border: '1px solid #dee2e6', textAlign: 'left', fontSize: '13px', width: '200px' }}>ចំនួនកញ្ចប់</th>
                      <th style={{ padding: '12px 8px', border: '1px solid #dee2e6', textAlign: 'left', fontSize: '13px', width: '160px' }}>ទឹកប្រាក់សរុបរួម</th>
                      <th style={{ padding: '12px 8px', border: '1px solid #dee2e6', textAlign: 'left', fontSize: '13px', width: '160px' }}>ទឹកប្រាក់ (QR ហាង)</th>
                      <th style={{ padding: '12px 8px', border: '1px solid #dee2e6', textAlign: 'left', fontSize: '13px' }}>ទឹកប្រាក់ (POD)</th>
                      <th style={{ padding: '12px 8px', border: '1px solid #dee2e6', textAlign: 'center', fontSize: '13px', width: '180px' }}>បញ្ជាក់ (✓/X)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedData.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#6b7280', fontSize: '14px' }}>
                          No data available in table
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
                                    onClick={() => toggleDetailRow(m.id)}
                                    style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}
                                  >
                                    Click Detail
                                  </span>
                                </div>
                              </td>

                              {/* 3. Package counts */}
                              <td style={{ padding: '12px 8px', border: '1px solid #dee2e6', fontSize: '13px' }}>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <li>• សរុប ៖ {stats.totalCount} ({stats.newCount} ថ្មី) / ({stats.oldCount} ចាស់)</li>
                                  <li style={{ color: '#16a34a', fontWeight: '600' }}>• ជោគជ័យ ៖ {stats.successCount}</li>
                                  <li style={{ color: '#2563eb' }}>• កំពុងដំណើរការ ៖ {stats.inProgressCount}</li>
                                  <li style={{ color: '#dc2626' }}>• បោះបង់ ៖ {stats.failedCount}</li>
                                  <li style={{ color: '#7c3aed' }}>• ត្រឡប់ ៖ {stats.returnedCount}</li>
                                  <li style={{ color: '#eab308' }}>• ក្នុងស្តុក ៖ {stats.pendingCount}</li>
                                </ul>
                              </td>

                              {/* 4. Total overall amount */}
                              <td style={{ padding: '12px 8px', border: '1px solid #dee2e6', fontSize: '13px' }}>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <li>• សរុប ៖ $ {financials.totalUSD.toFixed(2)}</li>
                                  <li>• ដុល្លារ ៖ $ {financials.totalUSD.toFixed(2)}</li>
                                  <li>• ខ្មែរ ៖ {financials.totalKHR.toLocaleString()} រៀល</li>
                                </ul>
                              </td>

                              {/* 5. Shop QR payments (bank) */}
                              <td style={{ padding: '12px 8px', border: '1px solid #dee2e6', fontSize: '13px' }}>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <li>• សរុប ៖ $ {financials.qrUSD.toFixed(2)}</li>
                                  <li>• ដុល្លារ ៖ $ {financials.qrUSD.toFixed(2)}</li>
                                  <li>• ខ្មែរ ៖ {financials.qrKHR.toLocaleString()} រៀល</li>
                                </ul>
                              </td>

                              {/* 6. Pay on Delivery payments (cash) */}
                              <td style={{ padding: '12px 8px', border: '1px solid #dee2e6', fontSize: '13px' }}>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <li>• សរុប ៖ $ {financials.podUSD.toFixed(2)}</li>
                                  <li>• ដុល្លារ ៖ $ {financials.podUSD.toFixed(2)}</li>
                                  <li>• ខ្មែរ ៖ {financials.podKHR.toLocaleString()} រៀល</li>
                                  <div style={{ height: '1px', background: '#dee2e6', margin: '4px 0' }} />
                                  <li style={{ color: '#2563eb', fontWeight: 'bold' }}>• ប្រាក់ទូទាត់ជាដុល្លារ ៖ $ {financials.payableUSD.toFixed(2)}</li>
                                  <li style={{ color: '#2563eb', fontWeight: 'bold' }}>• ប្រាក់ទូទាត់ជាខ្មែរ ៖ {financials.payableKHR.toLocaleString()} ៛</li>
                                  <li style={{ color: '#dc2626' }}>• សេវាដឹកត្រូវទទួល ៖ $ {financials.deliveryFee.toFixed(2)}</li>
                                  
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
                                ) : row.paymentOrders.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                    <input
                                      type="checkbox"
                                      checked={false}
                                      onChange={e => handleToggleConfirm(m.id, e.target.checked)}
                                      style={{ width: '22px', height: '22px', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '12px', fontWeight: '600' }}>Is Confirm</span>
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
                                      {row.orders.length === 0 ? (
                                        <tr>
                                          <td colSpan={7} style={{ textAlign: 'center', padding: '12px', color: '#6b7280' }}>
                                            No orders matching status filter
                                          </td>
                                        </tr>
                                      ) : (
                                        row.orders.map((o: any) => (
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
              {lang === 'km' ? 'បញ្ជាក់ប្រតិបត្តិការ' : 'Confirm Operation'}
            </h3>
            <p style={{ fontSize: '15px', color: '#4b5563', marginBottom: '24px', lineHeight: '1.5' }}>
              {lang === 'km' ? 'តើលោកអ្នកប្រាកដទេ មុនពេលប្រតិបត្ដិការនេះ?' : 'Are you sure before this operation?'}
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
        const isUnpaid = !merchantFilter || (groupedData.length > 0 && groupedData[0].paymentOrders.length > 0);
        return (
          <div className="receipt-print-container" style={{ fontFamily: 'Kantumruy Pro, Inter, sans-serif' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>{t('companyName') || 'EBS Digital Solutions'}</h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>Delivery Management System</p>
              <h3 style={{ margin: '14px 0 0', fontSize: 14, borderBottom: '2px solid #000', paddingBottom: 6 }}>
                {isUnpaid ? 'Settlement Quotation' : t('settlementReceipt')}
              </h3>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 16 }}>
              <div>
                <div><strong>Date:</strong> {getLocalDateString()}</div>
                <div><strong>Status:</strong> {statusFilter ? statusFilter.toUpperCase() : 'ALL'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div><strong>Receipt No:</strong> {isUnpaid ? 'DRAFT' : 'SETTLED'}</div>
              </div>
            </div>

            {merchantFilter && groupedData.length > 0 ? (
              (() => {
                const row = groupedData[0];
                const deliveredOrders = row.orders.filter((o: any) => o.status === 'delivered');
                const inTransitOrders = row.orders.filter((o: any) => o.status === 'in-transit' || o.status === 'picked-up' || o.status === 'pending');
                const returnedOrders = row.orders.filter((o: any) => o.status === 'returned' || o.status === 'failed');

                const delUSD = deliveredOrders.filter((o: any) => o.codCurrency === 'USD').reduce((sum: number, o: any) => sum + parseFloat(o.cod || 0), 0);
                const delKHR = deliveredOrders.filter((o: any) => o.codCurrency === 'KHR').reduce((sum: number, o: any) => sum + parseFloat(o.cod || 0), 0);
                const delFee = deliveredOrders.reduce((sum: number, o: any) => sum + parseFloat(o.deliveryFee || 0), 0);

                const payableUSD = Math.max(0, delUSD - delFee);
                const payableKHR = delKHR;

                return (
                  <>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 12 }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                          <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000' }}>ល.រ</th>
                          <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000' }}>កាលបរិច្ឆេទ</th>
                          <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000' }}>បរិយាយ</th>
                          <th colSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000' }}>ទឹកប្រាក់ដើមមាន<br/>(ដុល្លារ / ៛)</th>
                          <th colSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000' }}>ទឹកប្រាក់ទទួលបាន<br/>(ដុល្លារ / ៛)</th>
                          <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000' }}>សេវាដឹក</th>
                          <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000' }}>ផ្សេងៗ</th>
                        </tr>
                        <tr></tr>
                      </thead>
                      <tbody>
                        {/* Delivered Section */}
                        {deliveredOrders.length > 0 && (
                          <>
                            <tr>
                              <td colSpan={9} style={{ backgroundColor: '#2ecc71', color: '#fff', fontWeight: 'bold', padding: '6px', border: '1px solid #000' }}>អីវ៉ាន់ដឹកបានជោគជ័យ</td>
                            </tr>
                            {deliveredOrders.map((o: any, idx: number) => {
                              const isUSD = o.codCurrency === 'USD';
                              const codVal = parseFloat(o.cod || 0);
                              return (
                                <tr key={o.id}>
                                  <td style={{ textAlign: 'center', padding: '6px 4px', border: '1px solid #000' }}>{idx + 1}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}>{formatDateToDDMMYYYY(o.createdAt)}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000' }}>{o.trackingCode} {o.receiverPhone ? `(${o.receiverPhone})` : ''}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000', borderRight: '1px dashed #000', width: '60px' }}>$ {isUSD ? codVal.toFixed(2) : '0.00'}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000', borderLeft: 'none', width: '70px' }}>{!isUSD ? codVal.toLocaleString() : '0'} ៛</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000', borderRight: '1px dashed #000', width: '60px' }}>$ {isUSD ? codVal.toFixed(2) : '0.00'}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000', borderLeft: 'none', width: '70px' }}>{!isUSD ? codVal.toLocaleString() : '0'} ៛</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>$ {parseFloat(o.deliveryFee || 0).toFixed(2)}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}></td>
                                </tr>
                              );
                            })}
                            <tr>
                              <td colSpan={3} style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000' }}>សរុប</td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000', borderRight: '1px dashed #000' }}>$ {delUSD.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000', borderLeft: 'none' }}>{delKHR.toLocaleString()} ៛</td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000', borderRight: '1px dashed #000' }}>$ {delUSD.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000', borderLeft: 'none' }}>{delKHR.toLocaleString()} ៛</td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000' }}>$ {delFee.toFixed(2)}</td>
                              <td style={{ border: '1px solid #000' }}></td>
                            </tr>
                          </>
                        )}

                        {/* In Transit Section */}
                        {inTransitOrders.length > 0 && (
                          <>
                            <tr>
                              <td colSpan={9} style={{ backgroundColor: '#1abc9c', color: '#fff', fontWeight: 'bold', padding: '6px', border: '1px solid #000' }}>អីវ៉ាន់កំពុងដឹក</td>
                            </tr>
                            {inTransitOrders.map((o: any, idx: number) => {
                              const isUSD = o.codCurrency === 'USD';
                              const codVal = parseFloat(o.cod || 0);
                              return (
                                <tr key={o.id}>
                                  <td style={{ textAlign: 'center', padding: '6px 4px', border: '1px solid #000' }}>{idx + 1}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}>{formatDateToDDMMYYYY(o.createdAt)}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000' }}>{o.trackingCode} {o.receiverPhone ? `(${o.receiverPhone})` : ''}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000', borderRight: '1px dashed #000', width: '60px' }}>$ {isUSD ? codVal.toFixed(2) : '0.00'}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000', borderLeft: 'none', width: '70px' }}>{!isUSD ? codVal.toLocaleString() : '0'} ៛</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000', borderRight: '1px dashed #000', width: '60px' }}></td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000', borderLeft: 'none', width: '70px' }}></td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>$ {parseFloat(o.deliveryFee || 0).toFixed(2)}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}>{o.status}</td>
                                </tr>
                              );
                            })}
                          </>
                        )}

                        {/* Returned Section */}
                        {returnedOrders.length > 0 && (
                          <>
                            <tr>
                              <td colSpan={9} style={{ backgroundColor: '#e74c3c', color: '#fff', fontWeight: 'bold', padding: '6px', border: '1px solid #000' }}>អីវ៉ាន់ត្រឡប់ទៅហាង</td>
                            </tr>
                            {returnedOrders.map((o: any, idx: number) => {
                              const isUSD = o.codCurrency === 'USD';
                              const codVal = parseFloat(o.cod || 0);
                              return (
                                <tr key={o.id}>
                                  <td style={{ textAlign: 'center', padding: '6px 4px', border: '1px solid #000' }}>{idx + 1}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}>{formatDateToDDMMYYYY(o.createdAt)}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000' }}>{o.trackingCode} {o.receiverPhone ? `(${o.receiverPhone})` : ''}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000', borderRight: '1px dashed #000', width: '60px' }}>$ {isUSD ? codVal.toFixed(2) : '0.00'}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000', borderLeft: 'none', width: '70px' }}>{!isUSD ? codVal.toLocaleString() : '0'} ៛</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000', borderRight: '1px dashed #000', width: '60px' }}></td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000', borderLeft: 'none', width: '70px' }}></td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>$ {parseFloat(o.deliveryFee || 0).toFixed(2)}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}>ភ្ញៀវសុំថយ</td>
                                </tr>
                              );
                            })}
                          </>
                        )}
                      </tbody>
                    </table>

                    {/* Financial summaries Box */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                      <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
                        <tbody>
                          <tr>
                            <td style={{ padding: '6px 12px', border: '1px solid #000', textAlign: 'right' }}>ប្រាក់សរុប</td>
                            <td style={{ padding: '6px 12px', border: '1px solid #000', fontWeight: 'bold' }}>$ {delUSD.toFixed(2)} / {delKHR.toLocaleString()} ៛</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '6px 12px', border: '1px solid #000', textAlign: 'right' }}>សេវាដឹក</td>
                            <td style={{ padding: '6px 12px', border: '1px solid #000', fontWeight: 'bold' }}>$ {delFee.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '6px 12px', border: '1px solid #000', textAlign: 'right' }}>ប្រាក់ត្រូវទទួលបាន</td>
                            <td style={{ padding: '6px 12px', border: '1px solid #000', fontWeight: 'bold', color: '#dc2626' }}>${payableUSD.toFixed(2)} / {payableKHR.toLocaleString()} ៛</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #000' }}>
                    <th style={{ textAlign: 'left', padding: '6px 0', background: 'transparent', border: 'none' }}>Merchant Shop</th>
                    <th style={{ textAlign: 'right', padding: '6px 0', background: 'transparent', border: 'none' }}>Net Payable Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedData.map((row) => (
                    <tr key={row.merchant.id} style={{ borderBottom: '1px solid #cbd5e1' }}>
                      <td style={{ padding: '6px 0', border: 'none' }}>
                        {row.merchant.name} ({row.merchant.phone})
                      </td>
                      <td style={{ textAlign: 'right', padding: '6px 0', border: 'none', fontWeight: 'bold' }}>
                        ${row.financials.payableUSD.toFixed(2)} / {row.financials.payableKHR.toLocaleString()} ៛
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, marginTop: 45, textAlign: 'center', fontSize: 12 }}>
              <div>
                <div style={{ fontWeight: 600 }}>Authorized Signature</div>
                <div style={{ marginTop: 50, borderTop: '1px solid #000', display: 'inline-block', width: '80%' }} />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Merchant Signature</div>
                <div style={{ marginTop: 50, borderTop: '1px solid #000', display: 'inline-block', width: '80%' }} />
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
