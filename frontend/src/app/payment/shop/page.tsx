'use client';

import { useEffect, useState, Fragment, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { MdPrint, MdSearch, MdArrowBack, MdEdit, MdDelete, MdClose, MdSave } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';
import DateInput, { formatDateToDDMMYYYY, getLocalDateString } from '@/components/ui/DateInput';
import Modal from '@/components/ui/Modal';



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
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Tabs & History states
  const [activeTab, setActiveTab] = useState<'settle' | 'history'>('settle');
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyMerchantId, setHistoryMerchantId] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState(() => getLocalDateString());
  const [historyEndDate, setHistoryEndDate] = useState(() => getLocalDateString());

  // Edit Payout Modal State
  const [editPayment, setEditPayment] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editReference, setEditReference] = useState('');

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/payments/shop');
      setHistoryData(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const handleEditPayment = (payment: any) => {
    setEditPayment(payment);
    setEditAmount(payment.amount.toString());
    setEditNote(payment.note || '');
    setEditDate(payment.date ? payment.date.split('T')[0] : '');
    setEditReference(payment.reference || '');
  };

  const handleUpdatePayment = async () => {
    if (!editPayment) return;
    try {
      await api.patch(`/payments/shop/${editPayment.id}`, {
        amount: parseFloat(editAmount) || 0,
        note: editNote,
        date: editDate || undefined,
        reference: editReference || undefined,
      });
      alert(lang === 'km' ? 'ធ្វើបច្ចុប្បន្នភាពបានជោគជ័យ!' : 'Updated successfully!');
      setEditPayment(null);
      loadHistory();
      loadData();
    } catch (err: any) {
      alert(lang === 'km' ? 'ធ្វើបច្ចុប្បន្នភាពបានបរាជ័យ' : 'Failed to update: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!confirm(lang === 'km' ? 'តើអ្នកប្រាកដជាចង់បង្វិលការទូទាត់នេះថយក្រោយវិញទេ? វានឹងកំណត់ស្ថានភាពកញ្ចប់អីវ៉ាន់ទាំងអស់ទៅជាមិនទាន់ទូទាត់ឡើងវិញ និងបន្ថែមប្រាក់ចូលក្នុងសមតុល្យរបស់ហាងវិញ។' : 'Are you sure you want to reverse this settlement? This will reset all associated orders back to unpaid and add the payout amount back to the shop balance.')) return;
    try {
      await api.delete(`/payments/shop/${paymentId}`);
      alert(lang === 'km' ? 'បានបង្វិលប្រតិបត្តិការដោយជោគជ័យ!' : 'Reversal completed successfully!');
      loadHistory();
      loadData();
    } catch (err: any) {
      alert(lang === 'km' ? 'ការបង្វិលប្រតិបត្តិការបានបរាជ័យ' : 'Failed to reverse payment: ' + (err.response?.data?.message || err.message));
    }
  };

  // Filters State
  const [merchantFilter, setMerchantFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('unpaid');

  const [startDate, setStartDate] = useState(() => getLocalDateString());
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
          let dateString = o.deliveredAt;
          if (!dateString && (o.status === 'failed' || o.status === 'returned')) {
            dateString = o.updatedAt || o.createdAt;
          }
          const d = dateString ? new Date(dateString) : new Date(o.createdAt);
          return d >= start;
        });
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        mOrders = mOrders.filter(o => {
          let dateString = o.deliveredAt;
          if (!dateString && (o.status === 'failed' || o.status === 'returned')) {
            dateString = o.updatedAt || o.createdAt;
          }
          const d = dateString ? new Date(dateString) : new Date(o.createdAt);
          return d <= end;
        });
      }

      // Filtered orders for payouts (status: delivered, failed, returned, matching shop payout status)
      const paymentOrders = mOrders.filter(o => 
        (o.status === 'delivered' || o.status === 'failed' || o.status === 'returned') && 
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

      // Financial statistics (delivered orders only for COD sum)
      const totalUSD = paymentOrders.filter(o => o.status === 'delivered' && o.codCurrency === 'USD').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);
      const totalKHR = paymentOrders.filter(o => o.status === 'delivered' && o.codCurrency === 'KHR').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);

      const qrUSD = paymentOrders.filter(o => o.status === 'delivered' && o.codCurrency === 'USD' && o.paymentMethod === 'bank').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);
      const qrKHR = paymentOrders.filter(o => o.status === 'delivered' && o.codCurrency === 'KHR' && o.paymentMethod === 'bank').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);

      const podUSD = paymentOrders.filter(o => o.status === 'delivered' && o.codCurrency === 'USD' && o.paymentMethod === 'cash').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);
      const podKHR = paymentOrders.filter(o => o.status === 'delivered' && o.codCurrency === 'KHR' && o.paymentMethod === 'cash').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);

      const deliveryFee = paymentOrders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + parseFloat(o.deliveryFee || 0), 0);

      const payableUSD = Math.max(0, totalUSD - deliveryFee);
      const payableKHR = totalKHR;

      // Check if driver has settled payment with the company (driverPaymentStatus must be 'paid' for all delivered/failed/returned orders)
      const hasUnsettledDriver = paymentOrders.some(
        o => o.driverPaymentStatus === 'unpaid'
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

  const filteredOrders = orders.filter(o => {
    if (o.status !== 'delivered' && o.status !== 'failed' && o.status !== 'returned') return false;
    if (o.merchantPaymentStatus !== statusFilter) return false;
    if (merchantFilter && String(o.merchantId) !== merchantFilter) return false;
    let dateStr = o.deliveredAt;
    if (!dateStr && (o.status === 'failed' || o.status === 'returned')) {
      dateStr = o.updatedAt || o.createdAt;
    }
    const orderDate = dateStr ? new Date(dateStr) : new Date(o.createdAt);
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (orderDate < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (orderDate > end) return false;
    }
    return true;
  });

  const eligibleOrders = filteredOrders.filter(o => o.status === 'delivered');

  const targetOrders = selectedIds.length > 0 
    ? eligibleOrders.filter(o => selectedIds.includes(o.id))
    : eligibleOrders;

  const totalUSD = targetOrders.filter(o => o.codCurrency === 'USD').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);
  const totalKHR = targetOrders.filter(o => o.codCurrency === 'KHR').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);
  const deliveryFee = targetOrders.reduce((sum, o) => sum + parseFloat(o.deliveryFee || 0), 0);

  const payableUSD = Math.max(0, totalUSD - deliveryFee);
  const payableKHR = totalKHR;

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

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(eligibleOrders.map(o => o.id));
    } else {
      setSelectedIds([]);
    }
  };


  const handleConfirmSettlement = async () => {
    const ordersToSettle = selectedIds.length > 0
      ? eligibleOrders.filter(o => selectedIds.includes(o.id))
      : eligibleOrders;

    if (ordersToSettle.length === 0) {
      alert(lang === 'km' ? 'សូមជ្រើសរើសយ៉ាងហោចណាស់កញ្ចប់អីវ៉ាន់មួយដើម្បីទូទាត់។' : 'Please select at least one order to settle.');
      return;
    }

    // Group ordersToSettle by merchantId
    const merchantGroups: { [key: number]: any[] } = {};
    ordersToSettle.forEach(o => {
      if (!merchantGroups[o.merchantId]) {
        merchantGroups[o.merchantId] = [];
      }
      merchantGroups[o.merchantId].push(o);
    });

    setSaving(true);
    try {
      for (const mIdStr of Object.keys(merchantGroups)) {
        const mId = parseInt(mIdStr);
        const groupOrders = merchantGroups[mId];
        
        // Sums for this merchant group
        const groupTotalUSD = groupOrders.filter(o => o.codCurrency === 'USD').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);
        const groupTotalKHR = groupOrders.filter(o => o.codCurrency === 'KHR').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);
        const groupDeliveryFee = groupOrders.reduce((sum, o) => sum + parseFloat(o.deliveryFee || 0), 0);
        
        const groupPayableUSD = Math.max(0, groupTotalUSD - groupDeliveryFee);
        const groupPayableKHR = groupTotalKHR;

        const reference = `SETTLE-SHOP-${Date.now().toString().slice(-6)}`;
        const detailUrl = `${window.location.origin}/report_payment_customer?client_id=${mId}&reference=${reference}`;

        // Also find any failed/returned orders for this merchant in the filter criteria to mark as settled
        const groupFailedOrders = filteredOrders.filter(
          o => o.merchantId === mId && (o.status === 'failed' || o.status === 'returned') && o.merchantPaymentStatus === 'unpaid'
        );
        const orderIds = [...groupOrders.map(o => o.id), ...groupFailedOrders.map(o => o.id)];

        await api.post('/payments/shop', {
          merchantId: mId,
          amount: groupPayableUSD,
          amountKHR: groupPayableKHR,
          date: new Date().toISOString(),
          reference,
          note: lang === 'km' 
            ? `ទូទាត់ប្រាក់ហាង។ USD: $${groupPayableUSD.toFixed(2)}, KHR: ${groupPayableKHR.toLocaleString()} KHR`
            : `Settle shop payout. USD: $${groupPayableUSD.toFixed(2)}, KHR: ${groupPayableKHR.toLocaleString()} KHR`,
          orderIds,
          telegramReport: {
            totalCount: groupOrders.length + groupFailedOrders.length,
            newCount: 0,
            oldCount: groupOrders.length + groupFailedOrders.length,
            successCount: groupOrders.length,
            inProgressCount: 0,
            failedCount: groupFailedOrders.filter(o => o.status === 'failed').length,
            returnedCount: groupFailedOrders.filter(o => o.status === 'returned').length,
            pendingCount: 0,
            totalUSD: groupTotalUSD,
            totalKHR: groupTotalKHR,
            deliveryFee: groupDeliveryFee,
            payableUSD: groupPayableUSD,
            payableKHR: groupPayableKHR,
            detailUrl,
          },
        });
      }

      alert(
        lang === 'km' 
          ? `រក្សាទុកការទូទាត់បានជោគជ័យសម្រាប់ ${Object.keys(merchantGroups).length} ហាង!` 
          : `Successfully settled payment for ${Object.keys(merchantGroups).length} shops!`
      );
      setSelectedIds([]);
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

  // Filter historyData client-side
  const filteredHistory = historyData.filter((h: any) => {
    // 1. Merchant filter
    if (historyMerchantId && String(h.merchantId) !== historyMerchantId) {
      return false;
    }
    // 2. Date filters
    const d = h.date ? new Date(h.date) : new Date(h.createdAt);
    if (historyStartDate) {
      const start = new Date(historyStartDate);
      start.setHours(0, 0, 0, 0);
      if (d < start) return false;
    }
    if (historyEndDate) {
      const end = new Date(historyEndDate);
      end.setHours(23, 59, 59, 999);
      if (d > end) return false;
    }
    // 3. Search filter (reference, note, merchant name)
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      const refMatch = h.reference?.toLowerCase().includes(q);
      const noteMatch = h.note?.toLowerCase().includes(q);
      const merchantNameMatch = h.merchant?.name?.toLowerCase().includes(q) || h.merchant?.nameKh?.toLowerCase().includes(q);
      if (!refMatch && !noteMatch && !merchantNameMatch) {
        return false;
      }
    }
    return true;
  });

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

          {/* Tabs Bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', padding: '0 20px', background: '#fff', gap: 20 }}>
            <button 
              onClick={() => setActiveTab('settle')}
              style={{ 
                padding: '12px 8px', 
                fontSize: 14, 
                fontWeight: 600, 
                color: activeTab === 'settle' ? '#2563eb' : '#64748b', 
                borderBottom: activeTab === 'settle' ? '2px solid #2563eb' : '2px solid transparent',
                background: 'transparent',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer'
              }}
            >
              {lang === 'km' ? 'ទូទាត់ប្រាក់' : 'Settle Payout'}
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              style={{ 
                padding: '12px 8px', 
                fontSize: 14, 
                fontWeight: 600, 
                color: activeTab === 'history' ? '#2563eb' : '#64748b', 
                borderBottom: activeTab === 'history' ? '2px solid #2563eb' : '2px solid transparent',
                background: 'transparent',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer'
              }}
            >
              {lang === 'km' ? 'ប្រវត្តិទូទាត់ប្រាក់' : 'Settlement History'}
            </button>
          </div>

          <div style={{ padding: '20px' }}>
            {activeTab === 'settle' ? (
              <>
            
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
                  <span>{lang === 'km' ? 'បោះពុម្ព' : 'Print'} {selectedIds.length > 0 ? '(' + selectedIds.length + ')' : ('(' + eligibleOrders.length + ' ' + (lang === 'km' ? 'ទាំងអស់' : 'All') + ')')}</span>
                </button>
                {statusFilter === 'unpaid' && (
                  <button
                    className="btn btn-primary"
                    onClick={handleConfirmSettlement}
                    disabled={saving || eligibleOrders.length === 0}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      height: '38px',
                      padding: '0 16px',
                      fontSize: '13px',
                      fontWeight: '600',
                      borderRadius: '4px',
                      backgroundColor: (saving || eligibleOrders.length === 0) ? '#6c757d' : '#2563eb',
                      borderColor: (saving || eligibleOrders.length === 0) ? '#6c757d' : '#2563eb',
                      color: '#fff',
                      cursor: (saving || eligibleOrders.length === 0) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <MdSave size={18} />
                    <span>{lang === 'km' ? 'រក្សាទុកការទូទាត់' : 'Save Settlement'}</span>
                  </button>
                )}
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    setMerchantFilter('');
                    setStatusFilter('unpaid');
                    setStartDate(getLocalDateString());
                    setEndDate(getLocalDateString());
                    setSelectedIds([]);
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
                    borderColor: '#d1d5db',
                    backgroundColor: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <span>{lang === 'km' ? 'សម្អាត' : 'Clear'}</span>
                </button>
              </div>
            </div>

            {/* ── Section 1: Successful Deliveries ── */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 4, height: 20, background: '#16a34a', borderRadius: 2 }} />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#16a34a' }}>
                  {lang === 'km' ? '១. ផ្នែកដឹកជោគជ័យ' : '1. Successful Deliveries'}
                </h3>
                <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                  {eligibleOrders.length} {lang === 'km' ? 'កញ្ចប់' : 'parcels'}
                </span>
              </div>
              <div style={{ border: '1px solid #dee2e6', borderRadius: 4, overflowX: 'auto', background: '#fff' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
                  <thead>
                    <tr style={{ background: '#f0fdf4', borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'center', width: 40 }}>{lang === 'km' ? 'ល.រ' : 'No.'}</th>
                      <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'center', width: 40 }}>
                        {statusFilter === 'unpaid' && (
                          <input
                            type="checkbox"
                            checked={eligibleOrders.length > 0 && selectedIds.length === eligibleOrders.length}
                            onChange={(e) => handleToggleSelectAll(e.target.checked)}
                            style={{ cursor: 'pointer' }}
                          />
                        )}
                      </th>
                      <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'left' }}>{lang === 'km' ? 'លេខកូដ' : 'Tracking Code'}</th>
                      <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'left' }}>{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                      <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'left' }}>{lang === 'km' ? 'ឈ្មោះហាង' : 'Shop Name'}</th>
                      <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'left' }}>{lang === 'km' ? 'លេខអ្នកទទួល' : 'Receiver Phone'}</th>
                      <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'left' }}>{lang === 'km' ? 'អាសយដ្ឋាន' : 'Address'}</th>
                      <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'right', width: 150 }}>{lang === 'km' ? 'ប្រាក់បានបញ្ចូល' : 'Collected COD'}</th>
                      <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'right', width: 140 }}>{lang === 'km' ? 'ប្រាក់កម្រៃដឹក' : 'Delivery Fee'}</th>
                      <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'center' }}>{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligibleOrders.length === 0 ? (
                      <tr><td colSpan={10} style={{ textAlign: 'center', padding: '24px 0', color: '#6c757d' }}>{lang === 'km' ? 'គ្មានទិន្នន័យ' : 'No data'}</td></tr>
                    ) : (
                      eligibleOrders.map((o, idx) => {
                        const isSelected = selectedIds.includes(o.id);
                        return (
                          <tr key={o.id} style={{ borderBottom: '1px solid #dee2e6', background: isSelected ? '#f0fdf4' : (idx % 2 === 0 ? '#fff' : '#f9fafb') }}>
                            <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                            <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                              {statusFilter === 'unpaid' && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelect(o.id)}
                                  style={{ cursor: 'pointer' }}
                                />
                              )}
                            </td>
                            <td style={{ padding: '8px', border: '1px solid #dee2e6', color: '#475569' }}>{o.trackingCode}</td>
                            <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{o.deliveredAt ? formatDateToDDMMYYYY(o.deliveredAt) : (o.updatedAt ? formatDateToDDMMYYYY(o.updatedAt) : '—')}</td>
                            <td style={{ padding: '8px', border: '1px solid #dee2e6', color: '#0d6efd', fontWeight: 600 }}>{o.merchant?.name || '—'}</td>
                            <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{o.receiverPhone}</td>
                            <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{o.zone?.name || o.receiverAddress || '—'}</td>
                            
                            {/* Editable Collected COD */}
                            <td style={{ padding: '6px 8px', border: '1px solid #dee2e6', textAlign: 'right' }}>
                              {statusFilter === 'unpaid' ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                                  <input
                                    type="number"
                                    className="form-control"
                                    defaultValue={o.cod}
                                    onBlur={async (e) => {
                                      const newVal = parseFloat(e.target.value) || 0;
                                      if (newVal !== parseFloat(o.cod)) {
                                        try {
                                          await api.patch('/orders/' + o.id, { cod: newVal });
                                          setOrders(prev => prev.map(item => item.id === o.id ? { ...item, cod: newVal } : item));
                                        } catch (err: any) {
                                          alert(lang === 'km' ? 'កែប្រែប្រាក់មិនបានសម្រេច' : 'Failed to update COD: ' + err.message);
                                        }
                                      }
                                    }}
                                    style={{ width: 80, height: 28, padding: '2px 6px', fontSize: 12, textAlign: 'right' }}
                                  />
                                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: '600', width: 26, textAlign: 'left' }}>
                                    {o.codCurrency === 'KHR' ? '៛' : '$'}
                                  </span>
                                </div>
                              ) : (
                                <span style={{ fontWeight: 600, color: '#334155' }}>
                                  {o.codCurrency === 'KHR' ? (parseInt(o.cod).toLocaleString() + ' ៛') : ('$ ' + parseFloat(o.cod).toFixed(2))}
                                </span>
                              )}
                            </td>

                            {/* Editable Delivery Fee */}
                            <td style={{ padding: '6px 8px', border: '1px solid #dee2e6', textAlign: 'right' }}>
                              {statusFilter === 'unpaid' ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                                  <input
                                    type="number"
                                    className="form-control"
                                    defaultValue={o.deliveryFee}
                                    onBlur={async (e) => {
                                      const newVal = parseFloat(e.target.value) || 0;
                                      if (newVal !== parseFloat(o.deliveryFee)) {
                                        try {
                                          await api.patch('/orders/' + o.id, { deliveryFee: newVal });
                                          setOrders(prev => prev.map(item => item.id === o.id ? { ...item, deliveryFee: newVal } : item));
                                        } catch (err: any) {
                                          alert(lang === 'km' ? 'កែប្រែថ្លៃសេវាដឹកមិនបានសម្រេច' : 'Failed to update Delivery Fee: ' + err.message);
                                        }
                                      }
                                    }}
                                    style={{ width: 70, height: 28, padding: '2px 6px', fontSize: 12, textAlign: 'right' }}
                                  />
                                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: '600', width: 14 }}>$</span>
                                </div>
                              ) : (
                                <span style={{ fontWeight: 600, color: '#334155' }}>$ {parseFloat(o.deliveryFee).toFixed(2)}</span>
                              )}
                            </td>

                            <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                              <span style={{ background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                                {lang === 'km' ? 'ជោគជ័យ' : 'Delivered'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}

                    {/* Totals Section */}
                    {eligibleOrders.length > 0 && (
                      <>
                        <tr style={{ background: '#f8f9fa' }}>
                          <td colSpan={7} style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 600, borderRight: '1px solid #dee2e6' }}>{lang === 'km' ? 'សរុបប្រាក់បានបញ្ចូលជារៀល (KHR Collected)' : 'Total KHR Collected'}</td>
                          <td colSpan={2} style={{ padding: '8px 12px', borderRight: '1px solid #dee2e6' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontWeight: 600, minWidth: 60, textAlign: 'right' }}>{totalKHR.toLocaleString()} ៛</span>
                              <div style={{ background: '#f59e0b', color: '#fff', padding: '5px 12px', borderRadius: 4, fontWeight: 600, flex: 1, textAlign: 'right' }}>{totalKHR.toLocaleString()} ៛</div>
                            </div>
                          </td>
                          <td />
                        </tr>
                        <tr style={{ background: '#f8f9fa' }}>
                          <td colSpan={7} style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 600, borderRight: '1px solid #dee2e6' }}>{lang === 'km' ? 'សរុបប្រាក់បានបញ្ចូលជាដុល្លារ (USD Collected)' : 'Total USD Collected'}</td>
                          <td colSpan={2} style={{ padding: '8px 12px', borderRight: '1px solid #dee2e6' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontWeight: 600, minWidth: 60, textAlign: 'right' }}>${totalUSD.toFixed(2)}</span>
                              <div style={{ background: '#f59e0b', color: '#fff', padding: '5px 12px', borderRadius: 4, fontWeight: 600, flex: 1, textAlign: 'right' }}>${totalUSD.toFixed(2)}</div>
                            </div>
                          </td>
                          <td />
                        </tr>
                        <tr style={{ background: '#f8f9fa' }}>
                          <td colSpan={7} style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 600, borderRight: '1px solid #dee2e6' }}>{lang === 'km' ? 'សរុបថ្លៃសេវាដឹក (Total Delivery Fee)' : 'Total Delivery Fee'}</td>
                          <td colSpan={2} style={{ padding: '8px 12px', borderRight: '1px solid #dee2e6' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontWeight: 600, minWidth: 60, textAlign: 'right' }}>${deliveryFee.toFixed(2)}</span>
                              <div style={{ background: '#dc2626', color: '#fff', padding: '5px 12px', borderRadius: 4, fontWeight: 600, flex: 1, textAlign: 'right' }}>-${deliveryFee.toFixed(2)}</div>
                            </div>
                          </td>
                          <td />
                        </tr>
                        <tr style={{ background: '#f0fdf4', borderTop: '2px solid #dee2e6' }}>
                          <td colSpan={7} style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 700, borderRight: '1px solid #dee2e6', color: '#16a34a' }}>{lang === 'km' ? 'ទឹកប្រាក់ត្រូវទូទាត់សរុប (Net Payable)' : 'Net Payable to Shop'}</td>
                          <td colSpan={2} style={{ padding: '8px 12px', borderRight: '1px solid #dee2e6' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontWeight: 700, minWidth: 60, textAlign: 'right', color: '#16a34a' }}>${payableUSD.toFixed(2)}</span>
                                <div style={{ background: '#16a34a', color: '#fff', padding: '5px 12px', borderRadius: 4, fontWeight: 700, flex: 1, textAlign: 'right' }}>${payableUSD.toFixed(2)}</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontWeight: 700, minWidth: 60, textAlign: 'right', color: '#16a34a' }}>{payableKHR.toLocaleString()} ៛</span>
                                <div style={{ background: '#16a34a', color: '#fff', padding: '5px 12px', borderRadius: 4, fontWeight: 700, flex: 1, textAlign: 'right' }}>{payableKHR.toLocaleString()} ៛</div>
                              </div>
                            </div>
                          </td>
                          <td />
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Section 2: Failed & Returned Deliveries ── */}
            {(() => {
              const failedOrders = filteredOrders.filter(
                (o) => (o.status === 'failed' || o.status === 'returned') && o.merchantPaymentStatus === statusFilter
              );
              return (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 4, height: 20, background: '#ef4444', borderRadius: 2 }} />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#ef4444' }}>
                      {lang === 'km' ? '២. ផ្នែកដឹកមិនជោគជ័យ និង ត្រឡប់' : '2. Failed & Returned Deliveries'}
                    </h3>
                    <span style={{ background: '#fee2e2', color: '#ef4444', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                      {failedOrders.length} {lang === 'km' ? 'កញ្ចប់' : 'parcels'}
                    </span>
                  </div>
                  <div style={{ border: '1px solid #dee2e6', borderRadius: 4, overflowX: 'auto', background: '#fff' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
                      <thead>
                        <tr style={{ background: '#fef2f2', borderBottom: '2px solid #dee2e6' }}>
                          <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'center', width: 40 }}>{lang === 'km' ? 'ល.រ' : 'No.'}</th>
                          <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'left' }}>{lang === 'km' ? 'លេខកូដ' : 'Tracking Code'}</th>
                          <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'left' }}>{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                          <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'left' }}>{lang === 'km' ? 'ឈ្មោះហាង' : 'Shop Name'}</th>
                          <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'left' }}>{lang === 'km' ? 'លេខអ្នកទទួល' : 'Receiver Phone'}</th>
                          <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'left' }}>{lang === 'km' ? 'អាសយដ្ឋាន' : 'Address'}</th>
                          <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'right' }}>{lang === 'km' ? 'ប្រាក់បានបញ្ចូល' : 'Collected COD'}</th>
                          <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'right' }}>{lang === 'km' ? 'ប្រាក់កម្រៃដឹក' : 'Delivery Fee'}</th>
                          <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'left', minWidth: 160 }}>{lang === 'km' ? 'មូលហេតុ (Note)' : 'Reason (Note)'}</th>
                          <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'center' }}>{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {failedOrders.length === 0 ? (
                          <tr><td colSpan={10} style={{ textAlign: 'center', padding: '24px 0', color: '#6c757d' }}>{lang === 'km' ? 'គ្មានទិន្នន័យ' : 'No failed/returned orders'}</td></tr>
                        ) : (
                          failedOrders.map((o, idx) => {
                            const latestNote = o.histories
                              ?.slice()
                              .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                              .find((h: any) => h.note)?.note || o.note || '—';
                            return (
                              <tr key={o.id} style={{ borderBottom: '1px solid #dee2e6', background: idx % 2 === 0 ? '#fff' : '#fff9f9' }}>
                                <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                                <td style={{ padding: '8px', border: '1px solid #dee2e6', color: '#475569' }}>{o.trackingCode}</td>
                                <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{o.deliveredAt ? formatDateToDDMMYYYY(o.deliveredAt) : (o.updatedAt ? formatDateToDDMMYYYY(o.updatedAt) : '—')}</td>
                                <td style={{ padding: '8px', border: '1px solid #dee2e6', color: '#0d6efd', fontWeight: 600 }}>{o.merchant?.name || '—'}</td>
                                <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{o.receiverPhone}</td>
                                <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{o.zone?.name || o.receiverAddress || '—'}</td>
                                <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right', color: '#6b7280', fontWeight: 600 }}>
                                  {o.codCurrency === 'KHR' ? (parseInt(o.cod).toLocaleString() + ' ៛') : ('$ ' + parseFloat(o.cod).toFixed(2))}
                                </td>
                                <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'right', color: '#6b7280', fontWeight: 600 }}>
                                  $ {parseFloat(o.deliveryFee).toFixed(2)}
                                </td>
                                <td style={{ padding: '8px', border: '1px solid #dee2e6', fontSize: 12, color: '#7c3aed', fontStyle: latestNote === '—' ? 'italic' : 'normal' }}>
                                  {latestNote !== '—' ? ('📝 ' + latestNote) : '—'}
                                </td>
                                <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                                  {o.status === 'failed' ? (
                                    <span style={{ background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                                      {lang === 'km' ? 'បរាជ័យ' : 'Failed'}
                                    </span>
                                  ) : (
                                    <span style={{ background: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                                      {lang === 'km' ? 'បង្វិលត្រឡប់' : 'Returned'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

              </>
          ) : (
            <div className="card" style={{ padding: '20px', backgroundColor: '#fff', border: '1px solid #e5e7eb' }}>
              
              {/* History Search & Filters Bar */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b', paddingLeft: 2 }}>
                    {lang === 'km' ? 'ស្វែងរក' : 'Search'}
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={lang === 'km' ? 'ស្វែងរកលេខយោង សម្គាល់...' : 'Search ref, note, shop...'}
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    style={{ width: '220px', height: '38px', padding: '6px 12px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b', paddingLeft: 2 }}>
                    {lang === 'km' ? 'ហាង / Merchant' : 'Merchant'}
                  </span>
                  <select
                    className="form-control"
                    value={historyMerchantId}
                    onChange={e => setHistoryMerchantId(e.target.value)}
                    style={{ width: '200px', height: '38px', padding: '6px 12px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff', cursor: 'pointer' }}
                  >
                    <option value="">{lang === 'km' ? '-- ទាំងអស់ --' : '-- All --'}</option>
                    {merchants.map(m => (
                      <option key={m.id} value={m.id}>
                        {lang === 'km' && m.nameKh ? m.nameKh : m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b', paddingLeft: 2 }}>
                    {lang === 'km' ? 'ចាប់ពីថ្ងៃ' : 'Start Date'}
                  </span>
                  <input
                    type="date"
                    className="form-control"
                    value={historyStartDate}
                    onChange={e => setHistoryStartDate(e.target.value)}
                    style={{ width: '160px', height: '38px', padding: '6px 12px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b', paddingLeft: 2 }}>
                    {lang === 'km' ? 'ដល់ថ្ងៃ' : 'End Date'}
                  </span>
                  <input
                    type="date"
                    className="form-control"
                    value={historyEndDate}
                    onChange={e => setHistoryEndDate(e.target.value)}
                    style={{ width: '160px', height: '38px', padding: '6px 12px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}
                  />
                </div>

                <button
                  className="btn btn-outline"
                  onClick={() => {
                    setHistorySearch('');
                    setHistoryMerchantId('');
                    setHistoryStartDate('');
                    setHistoryEndDate('');
                  }}
                  style={{ height: 38, padding: '0 16px', fontWeight: 600 }}
                >
                  {lang === 'km' ? 'សម្អាត' : 'Clear'}
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'center' }}>{lang === 'km' ? 'ល.រ' : 'No.'}</th>
                      <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'left' }}>{lang === 'km' ? 'ហាង' : 'Merchant'}</th>
                      <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'left' }}>{lang === 'km' ? 'លេខយោង' : 'Reference'}</th>
                      <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'left' }}>{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                      <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'right' }}>{lang === 'km' ? 'ទឹកប្រាក់ USD' : 'Amount USD'}</th>
                      <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'right' }}>{lang === 'km' ? 'ទឹកប្រាក់ KHR' : 'Amount KHR'}</th>
                      <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'left' }}>{lang === 'km' ? 'សម្គាល់' : 'Note'}</th>
                      <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'center', width: 120 }}>{lang === 'km' ? 'សកម្មភាព' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyLoading ? (
                      <tr><td colSpan={8} style={{ textAlign: 'center', padding: '20px 0' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
                    ) : filteredHistory.length === 0 ? (
                      <tr><td colSpan={8} style={{ textAlign: 'center', padding: '20px 0', color: '#64748b' }}>{lang === 'km' ? 'គ្មានទិន្នន័យប្រវត្តិទូទាត់ទេ' : 'No payout settlement history found'}</td></tr>
                    ) : (
                      filteredHistory.map((h, idx) => (
                        <tr key={h.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                          <td style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ padding: '10px 8px', border: '1px solid #dee2e6', fontWeight: 600 }}>{h.merchant?.nameKh || h.merchant?.name || '—'}</td>
                          <td style={{ padding: '10px 8px', border: '1px solid #dee2e6' }}><code>{h.reference || '—'}</code></td>
                          <td style={{ padding: '10px 8px', border: '1px solid #dee2e6' }}>{formatDateToDDMMYYYY(h.date)}</td>
                          <td style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>${parseFloat(h.amount).toFixed(2)}</td>
                          <td style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{h.amountKHR ? `៛${parseFloat(h.amountKHR).toLocaleString()}` : '៛0'}</td>
                          <td style={{ padding: '10px 8px', border: '1px solid #dee2e6' }}>{h.note || '—'}</td>
                          <td style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                              <button 
                                onClick={() => handleDeletePayment(h.id)}
                                style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                              >
                                <MdDelete size={14} /> {lang === 'km' ? 'បង្វិលការទូទាត់' : 'Reverse'}
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
        </div>
      </div>
      </div>

      {/* Edit Payment Modal */}
      {editPayment && (
        <Modal 
          open={!!editPayment} 
          onClose={() => setEditPayment(null)} 
          title={lang === 'km' ? 'កែប្រែប្រតិបត្តិការទូទាត់' : 'Edit Settlement Payout'} 
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">{lang === 'km' ? 'ចំនួនទឹកប្រាក់ ($)' : 'Amount ($)'}</label>
              <input 
                type="number" 
                step="0.01" 
                className="form-control" 
                value={editAmount} 
                onChange={e => setEditAmount(e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">{lang === 'km' ? 'លេខយោង' : 'Reference'}</label>
              <input 
                type="text" 
                className="form-control" 
                value={editReference} 
                onChange={e => setEditReference(e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</label>
              <input 
                type="date" 
                className="form-control" 
                value={editDate} 
                onChange={e => setEditDate(e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">{lang === 'km' ? 'សម្គាល់' : 'Note'}</label>
              <textarea 
                className="form-control" 
                value={editNote} 
                onChange={e => setEditNote(e.target.value)} 
                rows={3}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
              <button 
                className="btn btn-outline" 
                onClick={() => setEditPayment(null)}
                style={{ height: 38, padding: '0 18px', fontWeight: 600 }}
              >
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleUpdatePayment}
                style={{ height: 38, padding: '0 18px', fontWeight: 600 }}
              >
                {lang === 'km' ? 'រក្សាទុក' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}

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
                const baseOrders = selectedIds.length > 0 
                  ? row.orders.filter(o => selectedIds.includes(o.id) || (o.merchantPaymentStatus === 'unpaid' && (o.status === 'failed' || o.status === 'returned')))
                  : row.orders;
                
                const deliveredOrders = baseOrders.filter(o => o.status === 'delivered' && o.merchantPaymentStatus === statusFilter);
                const inTransitOrders = baseOrders.filter(o => (o.status === 'in-transit' || o.status === 'picked-up' || o.status === 'pending' || o.status === 'failed') && o.merchantPaymentStatus === statusFilter);
                const returnedOrders = baseOrders.filter(o => o.status === 'returned' && o.merchantPaymentStatus === statusFilter);

                const delUSD = deliveredOrders.filter(o => o.codCurrency === 'USD').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);
                const delKHR = deliveredOrders.filter(o => o.codCurrency === 'KHR').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);
                const delFee = deliveredOrders.reduce((sum, o) => sum + parseFloat(o.deliveryFee || 0), 0);

                const payableUSD = Math.max(0, delUSD - delFee);
                const payableKHR = delKHR;

                return (
                  <>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 11 }}>
                      <thead>
                        <tr style={{ backgroundColor: '#244f96', color: '#fff' }}>
                          <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold', color: '#fff' }}>{lang === 'km' ? 'ល.រ' : 'No.'}</th>
                          <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold', color: '#fff' }}>{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                          <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold', color: '#fff' }}>{lang === 'km' ? 'លេខកូដ (ហាង)' : 'Tracking Code (Shop)'}</th>
                          <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold', color: '#fff' }}>{lang === 'km' ? 'លេខអ្នកទទួល' : 'Receiver Phone'}</th>
                          <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold', color: '#fff' }}>{lang === 'km' ? 'អាសយដ្ឋាន' : 'Address'}</th>
                          <th colSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold', color: '#fff' }}>{lang === 'km' ? <>ទឹកប្រាក់ដើមមាន<br/>(ដុល្លារ / ខ្មែរ)</> : <>Original Amount<br/>(USD / KHR)</>}</th>
                          <th colSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold', color: '#fff' }}>{lang === 'km' ? <>ទឹកប្រាក់ទទួលបាន<br/>(ដុល្លារ / ខ្មែរ)</> : <>Received Amount<br/>(USD / KHR)</>}</th>
                          <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold', color: '#fff' }}>{lang === 'km' ? 'សេវាដឹក' : 'Delivery Fee'}</th>
                          <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold', color: '#fff' }}>{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                          <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold', color: '#fff' }}>{lang === 'km' ? 'ផ្សេងៗ' : 'Remark'}</th>
                        </tr>
                        <tr style={{ backgroundColor: '#3060a8', color: '#fff' }}>
                          <th style={{ border: '1px solid #000', borderTop: 'none', padding: '2px', fontSize: '9px', fontWeight: 'normal', textAlign: 'center', color: '#fff' }}>{lang === 'km' ? 'ដុល្លារ' : 'USD'}</th>
                          <th style={{ border: '1px solid #000', borderTop: 'none', padding: '2px', fontSize: '9px', fontWeight: 'normal', textAlign: 'center', color: '#fff' }}>{lang === 'km' ? 'ខ្មែរ' : 'KHR'}</th>
                          <th style={{ border: '1px solid #000', borderTop: 'none', padding: '2px', fontSize: '9px', fontWeight: 'normal', textAlign: 'center', color: '#fff' }}>{lang === 'km' ? 'ដុល្លារ' : 'USD'}</th>
                          <th style={{ border: '1px solid #000', borderTop: 'none', padding: '2px', fontSize: '9px', fontWeight: 'normal', textAlign: 'center', color: '#fff' }}>{lang === 'km' ? 'ខ្មែរ' : 'KHR'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Delivered Section */}
                        {deliveredOrders.length > 0 && (
                          <>
                            <tr>
                              <td colSpan={12} style={{ backgroundColor: '#10b981', color: '#fff', fontWeight: 'bold', padding: '7px 10px', border: '1px solid #000', fontSize: 12 }}>
                                {lang === 'km' ? 'អីវ៉ាន់ដឹកបានជោគជ័យ' : 'Successfully Delivered'} ({deliveredOrders.length} {lang === 'km' ? 'កញ្ចប់' : 'parcels'})
                              </td>
                            </tr>
                            {deliveredOrders.map((o, idx) => {
                              const isUSD = o.codCurrency === 'USD';
                              const codVal = parseFloat(o.cod || 0);
                              return (
                                <tr key={o.id}>
                                  <td style={{ textAlign: 'center', padding: '6px 4px', border: '1px solid #000' }}>{idx + 1}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}>{formatDateToDDMMYYYY(o.createdAt)}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000' }}>{o.trackingCode} ({o.merchant?.name || '—'})</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000' }}>{o.receiverPhone || '—'}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000' }}>{o.zone?.name || o.receiverAddress || '—'}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>{isUSD ? ('$ ' + codVal.toFixed(2)) : '$ 0'}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>{!isUSD ? (codVal.toLocaleString() + ' ៛') : '0 ៛'}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>{isUSD ? ('$ ' + codVal.toFixed(2)) : '$ 0.00'}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>{!isUSD ? (codVal.toLocaleString() + ' ៛') : '0 ៛'}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>$ {parseFloat(o.deliveryFee || 0).toFixed(2)}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center', color: '#16a34a', fontWeight: 'bold' }}>{lang === 'km' ? 'ជោគជ័យ' : 'Delivered'}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}>{o.note || ''}</td>
                                </tr>
                              );
                            })}
                            <tr>
                              <td colSpan={5} style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000' }}>{lang === 'km' ? 'សរុប' : 'Total'}</td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000' }}>$ {delUSD.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000' }}>{delKHR.toLocaleString()} {lang === 'km' ? 'រៀល' : 'KHR'}</td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000' }}>$ {delUSD.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000' }}>{delKHR.toLocaleString()} {lang === 'km' ? 'រៀល' : 'KHR'}</td>
                              <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000' }}>$ {delFee.toFixed(2)}</td>
                              <td style={{ border: '1px solid #000' }}></td>
                              <td style={{ border: '1px solid #000' }}></td>
                            </tr>
                          </>
                        )}

                        {/* In Transit / Failed Section */}
                        {inTransitOrders.length > 0 && (
                          <>
                            <tr>
                              <td colSpan={12} style={{ backgroundColor: '#f59e0b', color: '#000', fontWeight: 'bold', padding: '7px 10px', border: '1px solid #000', fontSize: 12 }}>
                                {lang === 'km' ? 'អីវ៉ាន់ដឹកបន្ត' : 'Failed / Carried Forward'} ({inTransitOrders.length} {lang === 'km' ? 'កញ្ចប់' : 'parcels'})
                              </td>
                            </tr>
                            {inTransitOrders.map((o, idx) => {
                              const isUSD = o.codCurrency === 'USD';
                              const codVal = parseFloat(o.cod || 0);

                              // Get Khmer status translation
                              let statusLabel = '';
                              if (o.status === 'failed') {
                                statusLabel = lang === 'km' ? 'មិនជោគជ័យ' : 'Failed';
                              } else if (o.status === 'pending') {
                                statusLabel = lang === 'km' ? 'រង់ចាំ' : 'Pending';
                              } else if (o.status === 'picked-up') {
                                statusLabel = lang === 'km' ? 'ក្នុងឃ្លាំង' : 'In Warehouse';
                              } else {
                                statusLabel = lang === 'km' ? 'កំពុងដឹក' : 'In Transit';
                              }

                              const latestNote = o.histories
                                ?.slice()
                                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                .find((h: any) => h.note)?.note || o.note || statusLabel;

                              return (
                                <tr key={o.id}>
                                  <td style={{ textAlign: 'center', padding: '6px 4px', border: '1px solid #000' }}>{idx + 1}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}>{formatDateToDDMMYYYY(o.createdAt)}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000' }}>{o.trackingCode} ({o.merchant?.name || '—'})</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000' }}>{o.receiverPhone || '—'}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000' }}>{o.zone?.name || o.receiverAddress || '—'}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>{isUSD ? ('$ ' + codVal.toFixed(2)) : '$ 0'}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>{!isUSD ? (codVal.toLocaleString() + ' ៛') : '0'}</td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}></td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}></td>
                                  <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>$ {parseFloat(o.deliveryFee || 0).toFixed(2)}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center', color: '#ef4444', fontWeight: 'bold' }}>{statusLabel}</td>
                                  <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}>{latestNote}</td>
                                </tr>
                              );
                            })}
                          </>
                        )}

                         {/* Returned Section */}
                         {returnedOrders.length > 0 && (
                           <>
                             <tr>
                               <td colSpan={12} style={{ backgroundColor: '#ef4444', color: '#fff', fontWeight: 'bold', padding: '7px 10px', border: '1px solid #000', fontSize: 12 }}>
                                 {lang === 'km' ? 'អីវ៉ាន់ត្រឡប់ទៅហាង (Return)' : 'Returned to Shop (Return)'} ({returnedOrders.length} {lang === 'km' ? 'កញ្ចប់' : 'parcels'})
                               </td>
                             </tr>
                             {returnedOrders.map((o, idx) => {
                               const isUSD = o.codCurrency === 'USD';
                               const codVal = parseFloat(o.cod || 0);
                               const latestNote = o.histories
                                 ?.slice()
                                 .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                 .find((h: any) => h.note)?.note || o.note || (lang === 'km' ? 'ត្រឡប់' : 'Returned');
                               return (
                                 <tr key={o.id} style={{ background: '#fff5f5' }}>
                                   <td style={{ textAlign: 'center', padding: '6px 4px', border: '1px solid #000' }}>{idx + 1}</td>
                                   <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}>{formatDateToDDMMYYYY(o.createdAt)}</td>
                                   <td style={{ padding: '6px 4px', border: '1px solid #000' }}>{o.trackingCode} ({o.merchant?.name || '—'})</td>
                                   <td style={{ padding: '6px 4px', border: '1px solid #000' }}>{o.receiverPhone || '—'}</td>
                                   <td style={{ padding: '6px 4px', border: '1px solid #000' }}>{o.zone?.name || o.receiverAddress || '—'}</td>
                                   <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>{isUSD ? ('$ ' + codVal.toFixed(2)) : '$ 0'}</td>
                                   <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>{!isUSD ? (codVal.toLocaleString() + ' ៛') : '0 ៛'}</td>
                                   <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}></td>
                                   <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}></td>
                                   <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>$ 0.00</td>
                                   <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center', color: '#ef4444', fontWeight: 'bold' }}>{lang === 'km' ? 'បង្វិលត្រឡប់' : 'Returned'}</td>
                                   <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'left', color: '#7c3aed', fontSize: 10 }}>{latestNote}</td>
                                 </tr>
                               );
                             })}
                           </>
                         )}
                      </tbody>
                    </table>

                    {/* Financial summaries Box */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: 20 }}>
                      <table className="summary-table" style={{ borderCollapse: 'collapse', fontSize: 11, width: '280px', border: '1px solid #000' }}>
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
