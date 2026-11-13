'use client';

import { useEffect, useState, Fragment, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getUser } from '@/lib/auth';
import { getTenantWorkspaceUrl, detectTenantSubdomain } from '@/lib/domain';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { MdPrint, MdSearch, MdArrowBack, MdEdit, MdDelete, MdClose, MdSave } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';
import { useTenant } from '@/lib/TenantContext';
import DateInput, { formatDateToDDMMYYYY, getLocalDateString } from '@/components/ui/DateInput';
import Modal from '@/components/ui/Modal';
import { TableSkeleton, Skeleton } from '@/components/ui/Skeleton';
import SearchableSelect from '@/components/ui/SearchableSelect';
import {
  filterMerchantSettlementOrders,
  isEligibleMerchantSettlementOrder,
  isInTransitSettlementStatus,
  isWithinSettlementDateRange,
  matchesMerchantPaymentStatus,
} from '@/lib/settlement-utils';



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

const cleanNote = (val: any): string => {
  if (!val) return '';
  return String(val).replace(/\[Reason:\s*Other\]\s*/gi, '').trim();
};

const getLatestParcelNote = (o: any, fallback = ''): string => {
  const timeline = o.events || o.histories;
  const timelineNote = Array.isArray(timeline)
    ? timeline
        .slice()
        .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .find((h: any) => cleanNote(h.note))
    : null;
  return cleanNote(timelineNote?.note) || cleanNote(o.note) || fallback;
};

export default function PaymentWithShopPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const { tenant } = useTenant();

  const [merchants, setMerchants] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgInfo, setOrgInfo] = useState<any>({
    name: 'E-Express',
    phone: '011609414',
    address: 'Phnom Penh',
  });

  const getDynamicCompanyName = () => {
    if (orgInfo?.name) return orgInfo.name;
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
    return 'Delivery Express';
  };

  const dynamicCompanyName = getDynamicCompanyName();

  // Tabs & History states
  const [activeTab, setActiveTab] = useState<'settle' | 'history'>('settle');
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyMerchantId, setHistoryMerchantId] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

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

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Interactive UI State
  const [expandedMerchantId, setExpandedMerchantId] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const originalFilterRef = useRef<string | null>(null);
  const isPrintingDetailRef = useRef<boolean>(false);

  const [confirmMerchantId, setConfirmMerchantId] = useState<number | null>(null);
  const [selectedMerchantIds, setSelectedMerchantIds] = useState<number[]>([]);

  const hasAutoPrintedRef = useRef(false);

  useEffect(() => {
    setSelectedMerchantIds([]);
    setSelectedIds([]);
  }, [statusFilter, merchantFilter, startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [merchantRes, orderRes, orgRes] = await Promise.all([
        api.get('/select/merchants'),
        api.get('/payments/merchant/settlement-parcels'),
        api.get('/settings/organisation').catch(() => null),
      ]);
      setMerchants(Array.isArray(merchantRes.data) ? merchantRes.data : (merchantRes.data?.results || merchantRes.data?.result || []));
      const rawOrders = Array.isArray(orderRes.data) ? orderRes.data : (orderRes.data?.results || orderRes.data?.result || []);
      const sanitizedOrders = rawOrders.map((item: any) => ({
        ...item,
        deliveryFee: item.deliveryFee != null ? parseFloat(item.deliveryFee).toFixed(2) : '0.00',
        cod: item.cod != null ? (item.codCurrency === 'KHR' ? parseInt(item.cod).toString() : parseFloat(item.cod).toFixed(2)) : '0.00',
      }));
      setOrders(sanitizedOrders);
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
      const mOrders = orders.filter(
        o => o.merchantId === m.id && isWithinSettlementDateRange(o, startDate, endDate),
      );

      // Filtered orders for payouts (status: delivered, failed, returned, matching shop payout status)
      // NOTE: For unpaid shop settlements, the driver MUST have settled the cash first (driverPaymentStatus === 'paid')
      const paymentOrders = mOrders.filter(o => isEligibleMerchantSettlementOrder(o, statusFilter));

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

      // Financial statistics (delivered orders only for COD sum)
      const totalUSD = paymentOrders.filter(o => o.status === 'delivered' && o.codCurrency === 'USD').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);
      const totalKHR = paymentOrders.filter(o => o.status === 'delivered' && o.codCurrency === 'KHR').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);

      const qrUSD = paymentOrders.filter(o => o.status === 'delivered' && o.codCurrency === 'USD' && o.paymentMethod === 'bank').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);
      const qrKHR = paymentOrders.filter(o => o.status === 'delivered' && o.codCurrency === 'KHR' && o.paymentMethod === 'bank').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);

      const podUSD = paymentOrders.filter(o => o.status === 'delivered' && o.codCurrency === 'USD' && o.paymentMethod === 'cash').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);
      const podKHR = paymentOrders.filter(o => o.status === 'delivered' && o.codCurrency === 'KHR' && o.paymentMethod === 'cash').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);

      const deliveryFee = paymentOrders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + parseFloat(o.deliveryFee || 0), 0);

      const rate = parseFloat(m.exchangeRate as any || 4100);
      const payableUSD = Math.max(0, totalUSD - deliveryFee);
      const remainingUSD = Math.max(0, deliveryFee - totalUSD);
      const payableKHR = Math.max(0, totalKHR - (remainingUSD * rate));

      // Check if driver has settled payment with the company (driverPaymentStatus must be 'paid' for all delivered/failed/returned orders)
      const hasUnsettledDriver = mOrders.some(
        o => (o.status === 'delivered' || o.status === 'failed' || o.status === 'returned') && o.driverPaymentStatus === 'unpaid'
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

  const filteredOrders = filterMerchantSettlementOrders(orders, {
    merchantId: merchantFilter,
    statusFilter,
    startDate,
    endDate,
  });

  const eligibleOrders = filteredOrders.filter(o => o.status === 'delivered');
  const activeSelectedIds = selectedIds.filter(id => eligibleOrders.some(o => o.id === id));

  const targetOrders = activeSelectedIds.length > 0 
    ? eligibleOrders.filter(o => activeSelectedIds.includes(o.id))
    : eligibleOrders;

  const totalUSD = targetOrders.filter(o => o.codCurrency === 'USD').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);
  const totalKHR = targetOrders.filter(o => o.codCurrency === 'KHR').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);
  const deliveryFee = targetOrders.reduce((sum, o) => sum + parseFloat(o.deliveryFee || 0), 0);

  const selectedMerchant = merchants.find(m => String(m.id) === merchantFilter);
  const rate = selectedMerchant ? parseFloat(selectedMerchant.exchangeRate as any || 4100) : 4100;
  const payableUSD = Math.max(0, totalUSD - deliveryFee);
  const remainingUSD = Math.max(0, deliveryFee - totalUSD);
  const payableKHR = Math.max(0, totalKHR - (remainingUSD * rate));

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
    const ordersToSettle = activeSelectedIds.length > 0
      ? eligibleOrders.filter(o => activeSelectedIds.includes(o.id))
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
        
        const merchantObj = merchants.find(m => m.id === mId);
        const groupRate = merchantObj ? parseFloat(merchantObj.exchangeRate as any || 4100) : 4100;
        const groupPayableUSD = Math.max(0, groupTotalUSD - groupDeliveryFee);
        const groupRemainingUSD = Math.max(0, groupDeliveryFee - groupTotalUSD);
        const groupPayableKHR = Math.max(0, groupTotalKHR - (groupRemainingUSD * groupRate));

        const reference = `SETTLE-SHOP-${Date.now().toString().slice(-6)}`;
        const token = (typeof crypto !== 'undefined' && crypto.randomUUID) 
          ? crypto.randomUUID() 
          : `sec_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        const activeSubdomain = tenant?.subdomain || getUser()?.tenantSubdomain || detectTenantSubdomain();
        const baseUrl = activeSubdomain ? getTenantWorkspaceUrl(activeSubdomain) : window.location.origin;
        const detailUrl = `${baseUrl}/report_payment_customer?token=${token}`;

        // Also find any failed/returned orders for this merchant in the filter criteria to mark as settled
        const groupFailedOrders = filteredOrders.filter(
          o => o.merchantId === mId && (o.status === 'failed' || o.status === 'returned') && matchesMerchantPaymentStatus(o, 'unpaid')
        );
        const parcelIds = [...groupOrders.map(o => o.id), ...groupFailedOrders.map(o => o.id)];

        await api.post('/payments/shop', {
          merchantId: mId,
          amount: groupPayableUSD,
          amountKHR: groupPayableKHR,
          date: new Date().toISOString(),
          reference,
          token,
          note: lang === 'km' 
            ? `ទូទាត់ប្រាក់ហាង។ USD: $${groupPayableUSD.toFixed(2)}, KHR: ${groupPayableKHR.toLocaleString()} KHR`
            : `Settle shop payout. USD: $${groupPayableUSD.toFixed(2)}, KHR: ${groupPayableKHR.toLocaleString()} KHR`,
          parcelIds,
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
      <div className="main-content" style={{ background: '#f3f4f6', minHeight: '100vh' }}>
        <Topbar title={lang === 'km' ? 'ទូទាត់ប្រាក់ជាមួយហាង' : 'Payment with Shop'} subtitle={lang === 'km' ? 'គ្រប់គ្រងការទូទាត់ប្រាក់ជាមួយហាង' : 'Manage payout settlement with merchant shops'} />
        <div className="page-content" style={{ padding: 20 }}>
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <Skeleton width={180} height={38} borderRadius={6} />
              <Skeleton width={180} height={38} borderRadius={6} />
              <Skeleton width={120} height={38} borderRadius={6} />
            </div>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%' }}>
              <tbody>
                <TableSkeleton columns={10} rows={8} hasThumbnail />
              </tbody>
            </table>
          </div>
        </div>
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
                color: activeTab === 'settle' ? 'var(--accent, #1565D8)' : '#64748b', 
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
                color: activeTab === 'history' ? 'var(--accent, #1565D8)' : '#64748b', 
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
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => router.push('/dashboard')}
                style={{ height: 34, minHeight: 34, padding: '0 14px', fontSize: 13 }}
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
                  <SearchableSelect
                    value={merchantFilter}
                    onChange={setMerchantFilter}
                    style={{ width: '240px', height: '38px', padding: '6px 12px', borderRadius: '4px', borderColor: '#d1d5db', backgroundColor: '#fff', fontSize: '13px' }}
                    placeholder={lang === 'km' ? '— ទាំងអស់ —' : '— All Shops —'}
                    options={[
                      { value: '', label: lang === 'km' ? '— ទាំងអស់ —' : '— All Shops —' },
                      ...merchants.map(m => ({
                        value: String(m.id),
                        label: (lang === 'km' && m.nameKh ? m.nameKh : m.name) + (m.phone ? ` (${m.phone})` : ''),
                      })),
                    ]}
                  />
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
                  allowEmpty={true}
                />
                <DateInput
                  labelEn="End Date"
                  labelKh="ដល់"
                  value={endDate}
                  onChange={setEndDate}
                  style={{ minWidth: 220 }}
                  allowEmpty={true}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-outline"
                  onClick={triggerPrintReceipt}
                  disabled={merchantFilter ? filteredOrders.length === 0 : groupedData.length === 0}
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
                    cursor: (merchantFilter ? filteredOrders.length === 0 : groupedData.length === 0) ? 'not-allowed' : 'pointer',
                    opacity: (merchantFilter ? filteredOrders.length === 0 : groupedData.length === 0) ? 0.6 : 1
                  }}
                >
                  <MdPrint size={18} />
                  <span>{lang === 'km' ? 'បោះពុម្ព' : 'Print'} {activeSelectedIds.length > 0 ? '(' + activeSelectedIds.length + ')' : ('(' + filteredOrders.length + ' ' + (lang === 'km' ? 'ទាំងអស់' : 'All') + ')')}</span>
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
                    setStartDate('');
                    setEndDate('');
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
                  {lang === 'km' ? '១. ផ្នែកបានដឹកជោគជ័យ' : '1. Successful Deliveries'}
                </h3>
                <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                  {eligibleOrders.length} {lang === 'km' ? 'កញ្ចប់' : 'parcels'}
                </span>
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <div style={{ maxHeight: '520px', overflowY: 'auto', overflowX: 'auto', position: 'relative' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr style={{ background: 'var(--sidebar-bg, #1565D8)' }}>
                        <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'center', width: 44, background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'ល.រ' : 'No.'}</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'center', width: 44, background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', border: 'none' }}>
                          {statusFilter === 'unpaid' && (
                            <input
                              type="checkbox"
                              checked={eligibleOrders.length > 0 && activeSelectedIds.length === eligibleOrders.length}
                              onChange={(e) => handleToggleSelectAll(e.target.checked)}
                              style={{ cursor: 'pointer', accentColor: 'var(--accent, #1565D8)' }}
                            />
                          )}
                        </th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'left', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'លេខកូដ' : 'Tracking Code'}</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'left', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'left', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'ឈ្មោះហាង' : 'Shop Name'}</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'left', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'លេខអ្នកទទួល' : 'Receiver Phone'}</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'left', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'អាសយដ្ឋាន' : 'Address'}</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'right', width: 150, background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'ប្រាក់បានបញ្ចូល' : 'Collected COD'}</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'right', width: 140, background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'ប្រាក់កម្រៃដឹក' : 'Delivery Fee'}</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'left', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none', minWidth: 140 }}>{lang === 'km' ? 'ចំណាំ / មូលហេតុ' : 'Notes / Reason'}</th>
                        <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'center', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                      </tr>
                    </thead>
                  <tbody>
                    {eligibleOrders.length === 0 ? (
                      <tr><td colSpan={11} style={{ textAlign: 'center', padding: '30px 0', color: '#64748b' }}>{lang === 'km' ? 'គ្មានទិន្នន័យ' : 'No data'}</td></tr>
                    ) : (
                      eligibleOrders.map((o, idx) => {
                        const isSelected = activeSelectedIds.includes(o.id);
                        return (
                          <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9', background: isSelected ? '#f0f7ff' : '#ffffff', transition: 'background-color 0.15s' }}>
                            <td style={{ padding: '12px 10px', textAlign: 'center', color: '#64748b', fontWeight: 'bold', border: 'none' }}>{idx + 1}</td>
                            <td style={{ padding: '12px 10px', textAlign: 'center', border: 'none' }}>
                              {statusFilter === 'unpaid' && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelect(o.id)}
                                  style={{ cursor: 'pointer', accentColor: 'var(--accent, #1565D8)' }}
                                />
                              )}
                            </td>
                            <td style={{ padding: '12px 10px', color: '#0f172a', fontWeight: '600', border: 'none' }}>{o.trackingCode}</td>
                            <td style={{ padding: '12px 10px', color: '#64748b', border: 'none' }}>{o.deliveredAt ? formatDateToDDMMYYYY(o.deliveredAt) : (o.updatedAt ? formatDateToDDMMYYYY(o.updatedAt) : '')}</td>
                            <td style={{ padding: '12px 10px', color: '#0f172a', fontWeight: 600, border: 'none' }}>{o.merchant?.name && o.merchant.name !== '-' && o.merchant.name !== '—' ? o.merchant.name : ''}</td>
                            <td style={{ padding: '12px 10px', color: '#475569', border: 'none' }}>{o.receiverPhone && o.receiverPhone !== '-' && o.receiverPhone !== '—' ? o.receiverPhone : ''}</td>
                            <td style={{ padding: '12px 10px', color: '#475569', border: 'none' }}>{o.zone?.name || ((o.receiverAddress && o.receiverAddress !== '-' && o.receiverAddress !== '—') ? o.receiverAddress : '')}</td>
                            
                            {/* Editable Collected COD */}
                            <td style={{ padding: '12px 10px', textAlign: 'right', border: 'none', color: '#dc2626', fontWeight: 700 }}>
                              {statusFilter === 'unpaid' ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                                  <input
                                    type="number"
                                    defaultValue={o.codCurrency === 'KHR' ? parseInt(o.cod || 0) : parseFloat(o.cod || 0).toFixed(2)}
                                    onBlur={async (e) => {
                                      const newVal = parseFloat(e.target.value) || 0;
                                      if (newVal !== parseFloat(o.cod)) {
                                        try {
                                          await api.patch('/parcels/' + o.id, { cod: newVal });
                                          setOrders(prev => prev.map(item => item.id === o.id ? { ...item, cod: newVal } : item));
                                        } catch (err: any) {
                                          alert(lang === 'km' ? 'កែប្រែប្រាក់មិនបានសម្រេច' : 'Failed to update COD: ' + err.message);
                                        }
                                      }
                                    }}
                                    style={{ width: o.codCurrency === 'KHR' ? 110 : 80, height: 28, padding: '2px 6px', fontSize: 13, textAlign: 'right', borderRadius: 6, border: '1px solid #cbd5e1', fontWeight: 700 }}
                                  />
                                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: '600', width: 24, textAlign: 'left' }}>
                                    {o.codCurrency === 'KHR' ? '៛' : '$'}
                                  </span>
                                </div>
                              ) : (
                                <span style={{ fontWeight: 700, color: '#dc2626' }}>
                                  {o.codCurrency === 'KHR' ? (parseInt(o.cod || 0).toLocaleString() + ' ៛') : ('$ ' + parseFloat(o.cod || 0).toFixed(2))}
                                </span>
                              )}
                            </td>

                            {/* Editable Delivery Fee */}
                            <td style={{ padding: '12px 10px', textAlign: 'right', border: 'none', color: '#0f172a', fontWeight: 600 }}>
                              {statusFilter === 'unpaid' ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                                  <input
                                    type="number"
                                    defaultValue={parseFloat(o.deliveryFee || 0).toFixed(2)}
                                    onBlur={async (e) => {
                                      const newVal = parseFloat(e.target.value) || 0;
                                      if (newVal !== parseFloat(o.deliveryFee)) {
                                        try {
                                          await api.patch('/parcels/' + o.id, { deliveryFee: newVal });
                                          setOrders(prev => prev.map(item => item.id === o.id ? { ...item, deliveryFee: newVal } : item));
                                        } catch (err: any) {
                                          alert(lang === 'km' ? 'កែប្រែថ្លៃសេវាដឹកមិនបានសម្រេច' : 'Failed to update Delivery Fee: ' + err.message);
                                        }
                                      }
                                    }}
                                    style={{ width: 70, height: 28, padding: '2px 6px', fontSize: 13, textAlign: 'right', borderRadius: 6, border: '1px solid #cbd5e1', fontWeight: 700 }}
                                  />
                                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: '600', width: 14 }}>$</span>
                                </div>
                              ) : (
                                <span style={{ fontWeight: 600, color: '#0f172a' }}>$ {parseFloat(o.deliveryFee || 0).toFixed(2)}</span>
                              )}
                            </td>

                            {/* Notes / Reason */}
                            <td style={{ padding: '12px 10px', border: 'none', fontSize: 12 }}>
                              {statusFilter === 'unpaid' ? (
                                <input
                                  type="text"
                                  defaultValue={cleanNote(o.note)}
                                  placeholder={lang === 'km' ? 'ចំណាំ...' : 'Note...'}
                                  onBlur={async (e) => {
                                    const newVal = e.target.value;
                                    if (newVal !== cleanNote(o.note)) {
                                      try {
                                        await api.patch('/parcels/' + o.id, { note: newVal });
                                        setOrders(prev => prev.map(item => item.id === o.id ? { ...item, note: newVal } : item));
                                      } catch (err: any) {
                                        console.error(err);
                                      }
                                    }
                                  }}
                                  style={{ width: 130, height: 28, padding: '2px 6px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
                                />
                              ) : cleanNote(o.note) ? (
                                <span style={{ color: '#0f172a', fontWeight: 500 }}>
                                  📝 {cleanNote(o.note)}
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8' }}></span>
                              )}
                            </td>

                            <td style={{ padding: '12px 10px', textAlign: 'center', border: 'none' }}>
                              <span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                                {lang === 'km' ? 'បានដឹកជោគជ័យ' : 'Delivered'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}

                  </tbody>
                </table>
              </div>

              {/* Sticky Totals Bar at bottom of table container */}
              <div style={{
                borderTop: '2px solid #e2e8f0',
                background: '#f8fafc',
                padding: '12px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
                boxShadow: '0 -2px 8px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <span style={{ fontWeight: 600, color: '#475569' }}>{lang === 'km' ? 'សរុបជាដុល្លារ៖' : 'Total USD:'}</span>
                    <span style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: 6, fontWeight: 800, fontSize: 13 }}>
                      ${totalUSD.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <span style={{ fontWeight: 600, color: '#475569' }}>{lang === 'km' ? 'សរុបជារៀល៖' : 'Total KHR:'}</span>
                    <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 12px', borderRadius: 6, fontWeight: 800, fontSize: 14 }}>
                      {totalKHR.toLocaleString()} ៛
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <span style={{ fontWeight: 600, color: '#475569' }}>{lang === 'km' ? 'សេវាដឹកសរុប៖' : 'Delivery Fee:'}</span>
                    <span style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 12px', borderRadius: 6, fontWeight: 800, fontSize: 14 }}>
                      -${deliveryFee.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '6px 14px', borderRadius: 8 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>
                      {lang === 'km' ? 'ទឹកប្រាក់ត្រូវទូទាត់សរុប' : 'Net Payable'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ background: '#16a34a', color: '#fff', padding: '5px 12px', borderRadius: 6, fontWeight: 800, fontSize: 14 }}>
                      ${payableUSD.toFixed(2)}
                    </span>
                    <span style={{ background: '#16a34a', color: '#fff', padding: '5px 12px', borderRadius: 6, fontWeight: 800, fontSize: 14 }}>
                      {payableKHR.toLocaleString()} ៛
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

            {/* ── Section 2: In-Transit / Carried Forward Deliveries (អីវ៉ាន់ដឹកបន្ត) ── */}
            {(() => {
              const inTransitOrders = filteredOrders.filter(
                (o) => isInTransitSettlementStatus(o.status) && matchesMerchantPaymentStatus(o, statusFilter)
              );
              return (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 4, height: 20, background: '#d97706', borderRadius: 2 }} />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#d97706' }}>
                      {lang === 'km' ? '២. ផ្នែកអីវ៉ាន់ដឹកបន្ត' : '2. Carried Forward / In-Transit Deliveries'}
                    </h3>
                    <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                      {inTransitOrders.length} {lang === 'km' ? 'កញ្ចប់' : 'parcels'}
                    </span>
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    <div style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'auto', position: 'relative' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                          <tr style={{ background: 'var(--sidebar-bg, #1565D8)' }}>
                            <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'center', width: 44, background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'ល.រ' : 'No.'}</th>
                            <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'left', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'លេខកូដ' : 'Tracking Code'}</th>
                            <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'left', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                            <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'left', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'ឈ្មោះហាង' : 'Shop Name'}</th>
                            <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'left', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'លេខអ្នកទទួល' : 'Receiver Phone'}</th>
                            <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'left', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'អាសយដ្ឋាន' : 'Address'}</th>
                            <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'right', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'ប្រាក់បានបញ្ចូល' : 'Collected COD'}</th>
                            <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'right', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'ប្រាក់កម្រៃដឹក' : 'Delivery Fee'}</th>
                            <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'left', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none', minWidth: 160 }}>{lang === 'km' ? 'មូលហេតុ / ចំណាំ' : 'Reason / Note'}</th>
                            <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'center', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inTransitOrders.length === 0 ? (
                            <tr><td colSpan={10} style={{ textAlign: 'center', padding: '30px 0', color: '#64748b' }}>{lang === 'km' ? 'គ្មានអីវ៉ាន់ដឹកបន្តទេ' : 'No carried forward orders'}</td></tr>
                          ) : (
                            inTransitOrders.map((o, idx) => {
                              const latestNote = getLatestParcelNote(o);
                              let statusBadge = (
                                <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                                  {lang === 'km' ? 'កំពុងដឹកជញ្ជូន' : 'In Transit'}
                                </span>
                              );
                              if (o.status === 'failed') {
                                statusBadge = (
                                  <span style={{ background: '#fee2e2', color: '#ef4444', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                                    {lang === 'km' ? 'បរាជ័យ' : 'Failed'}
                                  </span>
                                );
                              } else if (o.status === 'picked-up') {
                                statusBadge = (
                                  <span style={{ background: '#f3e8ff', color: '#7e22ce', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                                    {lang === 'km' ? 'បានប្រមូល' : 'Picked Up'}
                                  </span>
                                );
                              } else if (o.status === 'in-warehouse') {
                                statusBadge = (
                                  <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                                    {lang === 'km' ? 'ក្នុងឃ្លាំង' : 'In Warehouse'}
                                  </span>
                                );
                              } else if (o.status === 'assigned') {
                                statusBadge = (
                                  <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                                    {lang === 'km' ? 'បានចាត់តាំង' : 'Assigned'}
                                  </span>
                                );
                              } else if (o.status === 'pending') {
                                statusBadge = (
                                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                                    {lang === 'km' ? 'កំពុងរង់ចាំ' : 'Pending'}
                                  </span>
                                );
                              }
                              return (
                                <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9', background: '#ffffff', transition: 'background-color 0.15s' }}>
                                  <td style={{ padding: '12px 10px', textAlign: 'center', color: '#64748b', fontWeight: 'bold', border: 'none' }}>{idx + 1}</td>
                                  <td style={{ padding: '12px 10px', color: '#0f172a', fontWeight: '600', border: 'none' }}>{o.trackingCode}</td>
                                  <td style={{ padding: '12px 10px', color: '#64748b', border: 'none' }}>{o.deliveredAt ? formatDateToDDMMYYYY(o.deliveredAt) : (o.updatedAt ? formatDateToDDMMYYYY(o.updatedAt) : '')}</td>
                                  <td style={{ padding: '12px 10px', color: '#0f172a', fontWeight: 600, border: 'none' }}>{o.merchant?.nameKh || o.merchant?.name || ''}</td>
                                  <td style={{ padding: '12px 10px', color: '#475569', border: 'none' }}>{o.receiverPhone || ''}</td>
                                  <td style={{ padding: '12px 10px', color: '#475569', border: 'none' }}>{o.zone?.name || o.receiverAddress || ''}</td>
                                  <td style={{ padding: '12px 10px', textAlign: 'right', color: '#64748b', fontWeight: 600, border: 'none' }}>
                                    {o.codCurrency === 'KHR' ? `${parseInt(o.cod || 0).toLocaleString()} ៛` : `$ ${parseFloat(o.cod || 0).toFixed(2)}`}
                                  </td>
                                  <td style={{ padding: '12px 10px', textAlign: 'right', color: '#64748b', fontWeight: 600, border: 'none' }}>
                                    $ {parseFloat(o.deliveryFee || 0).toFixed(2)}
                                  </td>
                                  <td style={{ padding: '12px 10px', border: 'none', fontSize: 12, color: '#7c3aed' }}>
                                    {latestNote ? `📝 ${latestNote}` : ''}
                                  </td>
                                  <td style={{ padding: '12px 10px', textAlign: 'center', border: 'none' }}>
                                    {statusBadge}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                          {inTransitOrders.length > 0 && (
                            <tr style={{ background: '#fffbeb', borderTop: '2px solid #fef3c7' }}>
                              <td colSpan={10} style={{ padding: '12px 16px', fontWeight: 700, color: '#d97706', fontSize: 13, border: 'none' }}>
                                📦 {lang === 'km'
                                  ? `សរុបអីវ៉ាន់ដឹកបន្ត: ${inTransitOrders.length} កញ្ចប់`
                                  : `Total Carried Forward Parcels: ${inTransitOrders.length}`}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── Section 3: Returned Deliveries (អីវ៉ាន់ត្រឡប់ទៅហាង) ── */}
            {(() => {
              const returnedOrders = filteredOrders.filter(
                (o) => o.status === 'returned' && matchesMerchantPaymentStatus(o, statusFilter)
              );
              return (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 4, height: 20, background: '#ef4444', borderRadius: 2 }} />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#ef4444' }}>
                      {lang === 'km' ? '៣. ផ្នែកអីវ៉ាន់ត្រឡប់ទៅហាង (Return)' : '3. Returned to Shop (Return)'}
                    </h3>
                    <span style={{ background: '#fee2e2', color: '#ef4444', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                      {returnedOrders.length} {lang === 'km' ? 'កញ្ចប់' : 'parcels'}
                    </span>
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    <div style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'auto', position: 'relative' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                          <tr style={{ background: 'var(--sidebar-bg, #1565D8)' }}>
                            <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'center', width: 44, background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'ល.រ' : 'No.'}</th>
                            <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'left', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'លេខកូដ' : 'Tracking Code'}</th>
                            <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'left', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                            <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'left', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'ឈ្មោះហាង' : 'Shop Name'}</th>
                            <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'left', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'លេខអ្នកទទួល' : 'Receiver Phone'}</th>
                            <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'left', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'អាសយដ្ឋាន' : 'Address'}</th>
                            <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'right', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'ប្រាក់បានបញ្ចូល' : 'Collected COD'}</th>
                            <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'right', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'ប្រាក់កម្រៃដឹក' : 'Delivery Fee'}</th>
                            <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'left', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none', minWidth: 160 }}>{lang === 'km' ? 'មូលហេតុ / ចំណាំ' : 'Reason / Note'}</th>
                            <th style={{ position: 'sticky', top: 0, zIndex: 10, padding: '12px 10px', textAlign: 'center', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {returnedOrders.length === 0 ? (
                            <tr><td colSpan={10} style={{ textAlign: 'center', padding: '30px 0', color: '#64748b' }}>{lang === 'km' ? 'គ្មានអីវ៉ាន់ត្រឡប់ទេ' : 'No returned orders'}</td></tr>
                          ) : (
                            returnedOrders.map((o, idx) => {
                              const latestNote = getLatestParcelNote(o);
                              return (
                                <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9', background: '#ffffff', transition: 'background-color 0.15s' }}>
                                  <td style={{ padding: '12px 10px', textAlign: 'center', color: '#64748b', fontWeight: 'bold', border: 'none' }}>{idx + 1}</td>
                                  <td style={{ padding: '12px 10px', color: '#0f172a', fontWeight: '600', border: 'none' }}>{o.trackingCode}</td>
                                  <td style={{ padding: '12px 10px', color: '#64748b', border: 'none' }}>{o.deliveredAt ? formatDateToDDMMYYYY(o.deliveredAt) : (o.updatedAt ? formatDateToDDMMYYYY(o.updatedAt) : '')}</td>
                                  <td style={{ padding: '12px 10px', color: '#0f172a', fontWeight: 600, border: 'none' }}>{o.merchant?.nameKh || o.merchant?.name || ''}</td>
                                  <td style={{ padding: '12px 10px', color: '#475569', border: 'none' }}>{o.receiverPhone || ''}</td>
                                  <td style={{ padding: '12px 10px', color: '#475569', border: 'none' }}>{o.zone?.name || o.receiverAddress || ''}</td>
                                  <td style={{ padding: '12px 10px', textAlign: 'right', color: '#64748b', fontWeight: 600, border: 'none' }}>
                                    {o.codCurrency === 'KHR' ? `${parseInt(o.cod || 0).toLocaleString()} ៛` : `$ ${parseFloat(o.cod || 0).toFixed(2)}`}
                                  </td>
                                  <td style={{ padding: '12px 10px', textAlign: 'right', color: '#64748b', fontWeight: 600, border: 'none' }}>
                                    $ {parseFloat(o.deliveryFee || 0).toFixed(2)}
                                  </td>
                                  <td style={{ padding: '12px 10px', border: 'none', fontSize: 12, color: '#7c3aed' }}>
                                    {latestNote ? `📝 ${latestNote}` : ''}
                                  </td>
                                  <td style={{ padding: '12px 10px', textAlign: 'center', border: 'none' }}>
                                    <span style={{ background: '#fee2e2', color: '#ef4444', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                                      {lang === 'km' ? 'បានត្រឡប់' : 'Returned'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                          {returnedOrders.length > 0 && (
                            <tr style={{ background: '#fef2f2', borderTop: '2px solid #fee2e2' }}>
                              <td colSpan={10} style={{ padding: '12px 16px', fontWeight: 700, color: '#ef4444', fontSize: 13, border: 'none' }}>
                                📦 {lang === 'km'
                                  ? `សរុបកញ្ចប់ត្រឡប់ទៅហាង: ${returnedOrders.length} កញ្ចប់`
                                  : `Total Returned to Shop Parcels: ${returnedOrders.length}`}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
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
                  <SearchableSelect
                    value={historyMerchantId}
                    onChange={setHistoryMerchantId}
                    style={{ width: '200px', height: '38px', padding: '6px 12px', borderRadius: '4px', borderColor: '#d1d5db', backgroundColor: '#fff', fontSize: '13px' }}
                    placeholder={lang === 'km' ? '-- ទាំងអស់ --' : '-- All --'}
                    options={[
                      { value: '', label: lang === 'km' ? '-- ទាំងអស់ --' : '-- All --' },
                      ...merchants.map(m => ({
                        value: String(m.id),
                        label: (lang === 'km' && m.nameKh ? m.nameKh : m.name) + (m.phone ? ` (${m.phone})` : ''),
                      })),
                    ]}
                  />
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
                    <tr style={{ background: 'var(--sidebar-bg, #1565D8)' }}>
                      <th style={{ padding: '12px 10px', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none', textAlign: 'center', width: 50 }}>{lang === 'km' ? 'ល.រ' : 'No.'}</th>
                      <th style={{ padding: '12px 10px', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none', textAlign: 'left' }}>{lang === 'km' ? 'ហាង' : 'Merchant'}</th>
                      <th style={{ padding: '12px 10px', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none', textAlign: 'left' }}>{lang === 'km' ? 'លេខយោង' : 'Reference'}</th>
                      <th style={{ padding: '12px 10px', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none', textAlign: 'left' }}>{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                      <th style={{ padding: '12px 10px', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none', textAlign: 'right' }}>{lang === 'km' ? 'ទឹកប្រាក់ USD' : 'Amount USD'}</th>
                      <th style={{ padding: '12px 10px', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none', textAlign: 'right' }}>{lang === 'km' ? 'ទឹកប្រាក់ KHR' : 'Amount KHR'}</th>
                      <th style={{ padding: '12px 10px', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none', textAlign: 'left' }}>{lang === 'km' ? 'សម្គាល់' : 'Note'}</th>
                      <th style={{ padding: '12px 10px', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none', textAlign: 'center', width: 130 }}>{lang === 'km' ? 'សកម្មភាព' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyLoading ? (
                      <TableSkeleton columns={8} rows={5} />
                    ) : filteredHistory.length === 0 ? (
                      <tr><td colSpan={8} style={{ textAlign: 'center', padding: '30px 0', color: '#64748b', border: 'none' }}>{lang === 'km' ? 'គ្មានទិន្នន័យប្រវត្តិទូទាត់ទេ' : 'No payout settlement history found'}</td></tr>
                    ) : (
                      filteredHistory.map((h, idx) => (
                        <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9', background: '#ffffff', transition: 'background-color 0.15s' }}>
                          <td style={{ padding: '12px 10px', textAlign: 'center', color: '#64748b', fontWeight: 'bold', border: 'none' }}>{idx + 1}</td>
                          <td style={{ padding: '12px 10px', fontWeight: 600, color: '#0f172a', border: 'none' }}>{h.merchant?.nameKh || h.merchant?.name || ''}</td>
                          <td style={{ padding: '12px 10px', fontWeight: 600, color: 'var(--accent, #1565D8)', border: 'none' }}>{h.reference || ''}</td>
                          <td style={{ padding: '12px 10px', color: '#64748b', border: 'none' }}>{formatDateToDDMMYYYY(h.date)}</td>
                          <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--success)', border: 'none' }}>${parseFloat(h.amount).toFixed(2)}</td>
                          <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--success)', border: 'none' }}>{h.amountKHR ? `៛${parseFloat(h.amountKHR).toLocaleString()}` : '៛0'}</td>
                          <td style={{ padding: '12px 10px', color: '#475569', border: 'none' }}>{h.note || ''}</td>
                          <td style={{ padding: '12px 10px', textAlign: 'center', border: 'none' }}>
                            <button 
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeletePayment(h.id)}
                              style={{ minHeight: 30, padding: '4px 12px', fontSize: 12, borderRadius: 6 }}
                            >
                              <MdDelete size={14} /> {lang === 'km' ? 'បង្វិលការទូទាត់' : 'Rollback'}
                            </button>
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
                className="btn btn-cancel" 
                onClick={() => setEditPayment(null)}
                style={{ background: '#dc2626', color: '#ffffff', border: '1px solid #dc2626', height: 38, padding: '0 18px', fontWeight: 700 }}
              >
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleUpdatePayment}
                style={{ background: '#2563eb', color: '#ffffff', border: '1px solid #2563eb', height: 38, padding: '0 18px', fontWeight: 700 }}
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
                className="btn btn-cancel"
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmMerchantId(null);
                }}
                style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}
              >
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
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
        const hasMerchant = merchantFilter && groupedData.length > 0;
        const activeMerchant = hasMerchant ? groupedData[0].merchant : null;

        return (
          <div className="receipt-print-container" style={{ fontFamily: "'Kantumruy Pro', 'Inter', sans-serif", color: '#0f172a' }}>
            {/* Header Layout */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12, borderBottom: '2px solid #0f172a', paddingBottom: 10 }}>
              {/* Left side: Company Info */}
              <div style={{ fontSize: 10.5, lineHeight: 1.55, flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  {tenant?.logoUrl || orgInfo.logo ? (
                    <img
                      src={tenant?.logoUrl || orgInfo.logo}
                      alt="Logo"
                      style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: 'var(--sidebar-bg, #1565D8)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 14, fontWeight: 800
                    }}>
                      {dynamicCompanyName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--sidebar-bg, #1565D8)' }}>
                    {dynamicCompanyName}
                  </span>
                </div>
                <div><strong>{lang === 'km' ? 'អាសយដ្ឋាន៖' : 'Address:'}</strong> {orgInfo.address}</div>
                <div><strong>{lang === 'km' ? 'ទូរស័ព្ទ៖' : 'Phone:'}</strong> {orgInfo.phone}</div>
              </div>

              {/* Center side: Title */}
              <div style={{ textAlign: 'center', alignSelf: 'center', flex: 1.3 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, fontFamily: "'Kantumruy Pro', sans-serif", color: '#0f172a', whiteSpace: 'nowrap' }}>
                  {lang === 'km' ? 'របាយការណ៍ទូទាត់ប្រចាំថ្ងៃ' : 'Daily Settlement Report'}
                </h2>
                <div style={{ marginTop: 3, fontSize: 11.5, fontWeight: 700, color: 'var(--sidebar-bg, #1565D8)' }}>
                  {lang === 'km' ? 'សម្រាប់ហាងទំនិញ' : 'For Merchant Shop'}
                </div>
              </div>

              {/* Right side: Merchant & Date Info */}
              <div style={{ fontSize: 10.5, textAlign: 'right', lineHeight: 1.55, flex: 1 }}>
                <div style={{ whiteSpace: 'nowrap' }}>
                  <strong>{lang === 'km' ? 'ឈ្មោះហាង៖' : 'Shop Name:'}</strong>{' '}
                  <span style={{ fontWeight: 700 }}>
                    {hasMerchant ? (lang === 'km' && activeMerchant.nameKh ? activeMerchant.nameKh : activeMerchant.name) : (lang === 'km' ? 'ទាំងអស់' : 'All Shops')}
                  </span>
                </div>
                {hasMerchant && activeMerchant?.phone && (
                  <div style={{ whiteSpace: 'nowrap' }}><strong>{lang === 'km' ? 'ទូរស័ព្ទ៖' : 'Phone:'}</strong> {activeMerchant.phone}</div>
                )}
                <div style={{ whiteSpace: 'nowrap' }}><strong>{lang === 'km' ? 'លេខយោង៖' : 'Ref:'}</strong> <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>INV_SHOP_{getLocalDateString().replace(/-/g, '')}</span></div>
                <div style={{ whiteSpace: 'nowrap' }}><strong>{lang === 'km' ? 'កាលបរិច្ឆេទ៖' : 'Date:'}</strong> {formatDateToDDMMYYYY(new Date().toISOString())}</div>
              </div>
            </div>

            {merchantFilter && groupedData.length > 0 ? (
              (() => {
                const row = groupedData[0];
                const deliveredOrders = activeSelectedIds.length > 0
                  ? row.paymentOrders.filter(o => activeSelectedIds.includes(o.id) && o.status === 'delivered')
                  : row.paymentOrders.filter(o => o.status === 'delivered');

                const selectedInTransit = row.paymentOrders.filter(o =>
                  selectedIds.includes(o.id) && isInTransitSettlementStatus(o.status)
                );
                const inTransitOrders = selectedInTransit.length > 0
                  ? selectedInTransit
                  : row.paymentOrders.filter(o => isInTransitSettlementStatus(o.status));

                const selectedReturned = row.paymentOrders.filter(o => selectedIds.includes(o.id) && o.status === 'returned');
                const returnedOrders = selectedReturned.length > 0
                  ? selectedReturned
                  : row.paymentOrders.filter(o => o.status === 'returned');

                const delUSD = deliveredOrders.filter(o => o.codCurrency === 'USD').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);
                const delKHR = deliveredOrders.filter(o => o.codCurrency === 'KHR').reduce((sum, o) => sum + parseFloat(o.cod || 0), 0);
                const delFee = deliveredOrders.reduce((sum, o) => sum + parseFloat(o.deliveryFee || 0), 0);

                const printRate = row?.merchant ? parseFloat(row.merchant.exchangeRate as any || 4100) : 4100;
                const payableUSD = Math.max(0, delUSD - delFee);
                const remainingUSD = Math.max(0, delFee - delUSD);
                const payableKHR = Math.max(0, delKHR - (remainingUSD * printRate));

                return (
                  <>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10, fontSize: 9.5, color: '#0f172a' }}>
                      <thead style={{ border: '1px solid var(--sidebar-bg, #1565D8)' }}>
                        <tr style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', color: '#ffffff' }}>
                          <th rowSpan={2} style={{ width: 24, backgroundColor: 'var(--sidebar-bg, #1565D8)', padding: '5px 3px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.35)', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap' }}>{lang === 'km' ? 'ល.រ' : 'No.'}</th>
                          <th colSpan={2} style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', padding: '5px 4px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.35)', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap' }}>{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                          <th rowSpan={2} style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', padding: '5px 4px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.35)', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap' }}>{lang === 'km' ? 'លេខកូដ (ហាង)' : 'Tracking Code'}</th>
                          <th rowSpan={2} style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', padding: '5px 4px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.35)', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap' }}>{lang === 'km' ? 'លេខអ្នកទទួល' : 'Receiver'}</th>
                          <th rowSpan={2} style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', padding: '5px 4px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.35)', fontWeight: 700, color: '#ffffff' }}>{lang === 'km' ? 'អាសយដ្ឋាន' : 'Address'}</th>
                          <th colSpan={2} style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', padding: '4px 4px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.35)', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', lineHeight: 1.25 }}>{lang === 'km' ? <>ទឹកប្រាក់ COD<br />(ដុល្លារ / ខ្មែរ)</> : <>COD Amount<br />(USD / KHR)</>}</th>
                          <th rowSpan={2} style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', padding: '5px 4px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.35)', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap' }}>{lang === 'km' ? 'សេវាដឹក' : 'Fee'}</th>
                          <th rowSpan={2} style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', padding: '5px 4px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.35)', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap' }}>{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                          <th rowSpan={2} style={{ width: 68, backgroundColor: 'var(--sidebar-bg, #1565D8)', padding: '5px 4px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.35)', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap' }}>{lang === 'km' ? 'ផ្សេងៗ' : 'Remark'}</th>
                        </tr>
                        <tr style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', color: '#ffffff' }}>
                          <th style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', border: '1px solid rgba(255, 255, 255, 0.35)', padding: '3px 4px', fontSize: 8.5, fontWeight: 600, textAlign: 'center', color: '#ffffff', whiteSpace: 'nowrap' }}>{lang === 'km' ? 'បង្កើត' : 'Created'}</th>
                          <th style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', border: '1px solid rgba(255, 255, 255, 0.35)', padding: '3px 4px', fontSize: 8.5, fontWeight: 600, textAlign: 'center', color: '#ffffff', whiteSpace: 'nowrap' }}>{lang === 'km' ? 'បញ្ចប់' : 'Completed'}</th>
                          <th style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', border: '1px solid rgba(255, 255, 255, 0.35)', padding: '3px 4px', fontSize: 8.5, fontWeight: 600, textAlign: 'center', color: '#ffffff', whiteSpace: 'nowrap' }}>{lang === 'km' ? 'ដុល្លារ' : 'USD'}</th>
                          <th style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', border: '1px solid rgba(255, 255, 255, 0.35)', padding: '3px 4px', fontSize: 8.5, fontWeight: 600, textAlign: 'center', color: '#ffffff', whiteSpace: 'nowrap' }}>{lang === 'km' ? 'ខ្មែរ' : 'KHR'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Delivered Section */}
                        {deliveredOrders.length > 0 && (
                          <>
                            <tr>
                              <td colSpan={11} style={{ backgroundColor: '#ecfdf5', color: '#065f46', fontWeight: 700, padding: '5px 8px', border: '1px solid #64748b', fontSize: 10.5 }}>
                                {lang === 'km' ? 'អីវ៉ាន់ដឹកបានជោគជ័យ' : 'Successfully Delivered'} ({deliveredOrders.length} {lang === 'km' ? 'កញ្ចប់' : 'parcels'})
                              </td>
                            </tr>
                            {deliveredOrders.map((o, idx) => {
                              const isUSD = o.codCurrency === 'USD';
                              const codVal = parseFloat(o.cod || 0);
                              return (
                                <tr key={o.id}>
                                  <td style={{ textAlign: 'center', padding: '4px 3px', border: '1px solid #64748b', whiteSpace: 'nowrap' }}>{idx + 1}</td>
                                  <td style={{ padding: '4px 4px', border: '1px solid #64748b', textAlign: 'center', whiteSpace: 'nowrap' }}>{formatDateToDDMMYYYY(o.createdAt)}</td>
                                  <td style={{ padding: '4px 4px', border: '1px solid #64748b', textAlign: 'center', whiteSpace: 'nowrap' }}>{o.deliveredAt ? formatDateToDDMMYYYY(o.deliveredAt) : ''}</td>
                                  <td style={{ padding: '4px 4px', border: '1px solid #64748b', whiteSpace: 'nowrap', fontWeight: 600 }}>{o.trackingCode}</td>
                                  <td style={{ padding: '4px 4px', border: '1px solid #64748b', whiteSpace: 'nowrap' }}>{o.receiverPhone || ''}</td>
                                  <td style={{ padding: '4px 5px', border: '1px solid #64748b', wordBreak: 'break-word' }}>{o.zone?.name || o.receiverAddress || ''}</td>
                                  <td style={{ textAlign: 'right', padding: '4px 4px', border: '1px solid #64748b', whiteSpace: 'nowrap' }}>{isUSD ? `$${codVal.toFixed(2)}` : '$0.00'}</td>
                                  <td style={{ textAlign: 'right', padding: '4px 4px', border: '1px solid #64748b', whiteSpace: 'nowrap' }}>{!isUSD ? `${codVal.toLocaleString()} ៛` : '0 ៛'}</td>
                                  <td style={{ textAlign: 'right', padding: '4px 4px', border: '1px solid #64748b', whiteSpace: 'nowrap' }}>${parseFloat(o.deliveryFee || 0).toFixed(2)}</td>
                                  <td style={{ padding: '4px 4px', border: '1px solid #64748b', textAlign: 'center', color: '#15803d', fontWeight: 700, whiteSpace: 'nowrap' }}>{lang === 'km' ? 'បានដឹកជោគជ័យ' : 'Delivered'}</td>
                                  <td style={{ padding: '4px 4px', border: '1px solid #64748b', textAlign: 'left', fontSize: 9, wordBreak: 'break-word' }}>{cleanNote(o.note)}</td>
                                </tr>
                              );
                            })}
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                              <td colSpan={6} style={{ textAlign: 'right', fontWeight: 700, padding: '5px 6px', border: '1px solid #64748b' }}>{lang === 'km' ? 'សរុប' : 'Subtotal'}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, padding: '5px 4px', border: '1px solid #64748b', whiteSpace: 'nowrap' }}>${delUSD.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, padding: '5px 4px', border: '1px solid #64748b', whiteSpace: 'nowrap' }}>{delKHR.toLocaleString()} ៛</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, padding: '5px 4px', border: '1px solid #64748b', whiteSpace: 'nowrap' }}>${delFee.toFixed(2)}</td>
                              <td style={{ border: '1px solid #64748b' }}></td>
                              <td style={{ border: '1px solid #64748b' }}></td>
                            </tr>
                          </>
                        )}

                        {/* In Transit / Failed Section (អីវ៉ាន់ដឹកបន្ត) */}
                        <tr>
                          <td colSpan={11} style={{ backgroundColor: '#fffbeb', color: '#92400e', fontWeight: 700, padding: '5px 8px', border: '1px solid #64748b', fontSize: 10.5 }}>
                            {lang === 'km' ? 'អីវ៉ាន់ដឹកបន្ត' : 'Carried Forward / In-Transit'} ({inTransitOrders.length} {lang === 'km' ? 'កញ្ចប់' : 'parcels'})
                          </td>
                        </tr>
                        {inTransitOrders.length === 0 ? (
                          <tr>
                            <td colSpan={11} style={{ textAlign: 'center', padding: '5px 4px', border: '1px solid #64748b', color: '#64748b', fontStyle: 'italic' }}>
                              {lang === 'km' ? 'គ្មានអីវ៉ាន់ដឹកបន្តទេ' : 'No carried forward parcels'}
                            </td>
                          </tr>
                        ) : (
                          inTransitOrders.map((o, idx) => {
                            const isUSD = o.codCurrency === 'USD';
                            const codVal = parseFloat(o.cod || 0);

                            let statusLabel = '';
                            if (o.status === 'failed') {
                              statusLabel = lang === 'km' ? 'បរាជ័យ' : 'Failed';
                            } else if (o.status === 'pending') {
                              statusLabel = lang === 'km' ? 'កំពុងរង់ចាំ' : 'Pending';
                            } else if (o.status === 'picked-up') {
                              statusLabel = lang === 'km' ? 'បានប្រមូល' : 'Picked Up';
                            } else if (o.status === 'in-warehouse') {
                              statusLabel = lang === 'km' ? 'ក្នុងឃ្លាំង' : 'In Warehouse';
                            } else if (o.status === 'assigned') {
                              statusLabel = lang === 'km' ? 'បានចាត់តាំង' : 'Assigned';
                            } else {
                              statusLabel = lang === 'km' ? 'កំពុងដឹកជញ្ជូន' : 'In Transit';
                            }

                            const latestNote = getLatestParcelNote(o, statusLabel);

                            return (
                              <tr key={o.id}>
                                <td style={{ textAlign: 'center', padding: '4px 3px', border: '1px solid #64748b', whiteSpace: 'nowrap' }}>{idx + 1}</td>
                                <td style={{ padding: '4px 4px', border: '1px solid #64748b', textAlign: 'center', whiteSpace: 'nowrap' }}>{formatDateToDDMMYYYY(o.createdAt)}</td>
                                <td style={{ padding: '4px 4px', border: '1px solid #64748b', textAlign: 'center', whiteSpace: 'nowrap' }}>{o.deliveredAt ? formatDateToDDMMYYYY(o.deliveredAt) : (o.updatedAt ? formatDateToDDMMYYYY(o.updatedAt) : '')}</td>
                                <td style={{ padding: '4px 4px', border: '1px solid #64748b', whiteSpace: 'nowrap', fontWeight: 600 }}>{o.trackingCode}</td>
                                <td style={{ padding: '4px 4px', border: '1px solid #64748b', whiteSpace: 'nowrap' }}>{o.receiverPhone || ''}</td>
                                <td style={{ padding: '4px 5px', border: '1px solid #64748b', wordBreak: 'break-word' }}>{o.zone?.name || o.receiverAddress || ''}</td>
                                <td style={{ textAlign: 'right', padding: '4px 4px', border: '1px solid #64748b', whiteSpace: 'nowrap' }}>{isUSD ? `$${codVal.toFixed(2)}` : '$0.00'}</td>
                                <td style={{ textAlign: 'right', padding: '4px 4px', border: '1px solid #64748b', whiteSpace: 'nowrap' }}>{!isUSD ? `${codVal.toLocaleString()} ៛` : '0 ៛'}</td>
                                <td style={{ textAlign: 'right', padding: '4px 4px', border: '1px solid #64748b', whiteSpace: 'nowrap' }}>${parseFloat(o.deliveryFee || 0).toFixed(2)}</td>
                                <td style={{ padding: '4px 4px', border: '1px solid #64748b', textAlign: 'center', color: '#b45309', fontWeight: 700, whiteSpace: 'nowrap' }}>{statusLabel}</td>
                                <td style={{ padding: '4px 4px', border: '1px solid #64748b', textAlign: 'left', fontSize: 9, wordBreak: 'break-word' }}>{latestNote}</td>
                              </tr>
                            );
                          })
                        )}

                        {/* Returned Section (អីវ៉ាន់ត្រឡប់ទៅហាង) */}
                        <tr>
                          <td colSpan={11} style={{ backgroundColor: '#fef2f2', color: '#991b1b', fontWeight: 700, padding: '5px 8px', border: '1px solid #64748b', fontSize: 10.5 }}>
                            {lang === 'km' ? 'អីវ៉ាន់ត្រឡប់ទៅហាង (Return)' : 'Returned to Shop (Return)'} ({returnedOrders.length} {lang === 'km' ? 'កញ្ចប់' : 'parcels'})
                          </td>
                        </tr>
                        {returnedOrders.length === 0 ? (
                          <tr>
                            <td colSpan={11} style={{ textAlign: 'center', padding: '5px 4px', border: '1px solid #64748b', color: '#64748b', fontStyle: 'italic' }}>
                              {lang === 'km' ? 'គ្មានអីវ៉ាន់ត្រឡប់ទេ' : 'No returned parcels'}
                            </td>
                          </tr>
                        ) : (
                          returnedOrders.map((o, idx) => {
                            const isUSD = o.codCurrency === 'USD';
                            const codVal = parseFloat(o.cod || 0);
                            const latestNote = getLatestParcelNote(o, lang === 'km' ? 'ត្រឡប់' : 'Returned');
                            return (
                              <tr key={o.id}>
                                <td style={{ textAlign: 'center', padding: '4px 3px', border: '1px solid #64748b', whiteSpace: 'nowrap' }}>{idx + 1}</td>
                                <td style={{ padding: '4px 4px', border: '1px solid #64748b', textAlign: 'center', whiteSpace: 'nowrap' }}>{formatDateToDDMMYYYY(o.createdAt)}</td>
                                <td style={{ padding: '4px 4px', border: '1px solid #64748b', textAlign: 'center', whiteSpace: 'nowrap' }}>{o.deliveredAt ? formatDateToDDMMYYYY(o.deliveredAt) : (o.updatedAt ? formatDateToDDMMYYYY(o.updatedAt) : '')}</td>
                                <td style={{ padding: '4px 4px', border: '1px solid #64748b', whiteSpace: 'nowrap', fontWeight: 600 }}>{o.trackingCode}</td>
                                <td style={{ padding: '4px 4px', border: '1px solid #64748b', whiteSpace: 'nowrap' }}>{o.receiverPhone || ''}</td>
                                <td style={{ padding: '4px 5px', border: '1px solid #64748b', wordBreak: 'break-word' }}>{o.zone?.name || o.receiverAddress || ''}</td>
                                <td style={{ textAlign: 'right', padding: '4px 4px', border: '1px solid #64748b', whiteSpace: 'nowrap' }}>{isUSD ? `$${codVal.toFixed(2)}` : '$0.00'}</td>
                                <td style={{ textAlign: 'right', padding: '4px 4px', border: '1px solid #64748b', whiteSpace: 'nowrap' }}>{!isUSD ? `${codVal.toLocaleString()} ៛` : '0 ៛'}</td>
                                <td style={{ textAlign: 'right', padding: '4px 4px', border: '1px solid #64748b', whiteSpace: 'nowrap' }}>$0.00</td>
                                <td style={{ padding: '4px 4px', border: '1px solid #64748b', textAlign: 'center', color: '#dc2626', fontWeight: 700, whiteSpace: 'nowrap' }}>{lang === 'km' ? 'បានត្រឡប់' : 'Returned'}</td>
                                <td style={{ padding: '4px 4px', border: '1px solid #64748b', textAlign: 'left', color: '#475569', fontSize: 9, wordBreak: 'break-word' }}>{latestNote}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>

                    {/* Financial summaries Box */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: 14, pageBreakInside: 'avoid' }}>
                      <table className="summary-table" style={{ borderCollapse: 'collapse', fontSize: 10.5, minWidth: 360, border: '1px solid #475569' }}>
                        <tbody>
                          <tr>
                            <td style={{ padding: '6px 12px', border: '1px solid #475569', textAlign: 'right', backgroundColor: '#f8fafc', fontWeight: 600, whiteSpace: 'nowrap' }}>{lang === 'km' ? 'ប្រាក់សរុប (Total COD)' : 'Total COD Amount'}</td>
                            <td style={{ padding: '6px 12px', border: '1px solid #475569', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>${delUSD.toFixed(2)} / {delKHR.toLocaleString()} ៛</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '6px 12px', border: '1px solid #475569', textAlign: 'right', backgroundColor: '#f8fafc', fontWeight: 600, whiteSpace: 'nowrap' }}>{lang === 'km' ? 'សេវាដឹកសរុប' : 'Total Delivery Fee'}</td>
                            <td style={{ padding: '6px 12px', border: '1px solid #475569', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>${delFee.toFixed(2)}</td>
                          </tr>
                          <tr style={{ backgroundColor: '#eff6ff' }}>
                            <td style={{ padding: '7px 12px', border: '1px solid #475569', textAlign: 'right', fontWeight: 700, color: 'var(--sidebar-bg, #1565D8)', whiteSpace: 'nowrap' }}>{lang === 'km' ? 'ប្រាក់ត្រូវទូទាត់ជូនហាង (Net Payable)' : 'Net Payable to Shop'}</td>
                            <td style={{ padding: '7px 12px', border: '1px solid #475569', fontWeight: 800, color: '#dc2626', textAlign: 'right', fontSize: 11.5, whiteSpace: 'nowrap' }}>${payableUSD.toFixed(2)} / {payableKHR.toLocaleString()} ៛</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Khmer Date */}
                      <div style={{ marginTop: 8, fontSize: 10.5, fontWeight: 700, fontStyle: 'italic', color: '#0f172a' }}>
                        {lang === 'km' ? getKhmerDateString(new Date()) : new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>

                    {/* Balanced 2-Column Signatures */}
                    <div style={{ marginTop: 26, display: 'flex', justifyContent: 'space-between', padding: '0 40px', pageBreakInside: 'avoid' }}>
                      <div style={{ textAlign: 'center', minWidth: 180 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 42, color: '#0f172a' }}>{lang === 'km' ? 'បានឃើញ និងឯកភាព' : 'Approved By'}</div>
                        <div style={{ fontSize: 11, color: '#475569' }}>..........................................</div>
                      </div>
                      <div style={{ textAlign: 'center', minWidth: 180 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 42, color: '#0f172a' }}>{lang === 'km' ? 'ហត្ថលេខាម្ចាស់ហាង / អ្នកទទួលប្រាក់' : 'Merchant / Payee Signature'}</div>
                        <div style={{ fontSize: 11, color: '#475569' }}>..........................................</div>
                      </div>
                    </div>
                  </>
                );
              })()
            ) : (
              /* Summary list for all merchants */
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10, fontSize: 10, color: '#0f172a' }}>
                  <thead style={{ border: '1px solid var(--sidebar-bg, #1565D8)' }}>
                    <tr style={{ backgroundColor: 'var(--sidebar-bg, #1565D8)', color: '#ffffff' }}>
                      <th style={{ width: 32, textAlign: 'center', padding: '6px 4px', border: '1px solid rgba(255, 255, 255, 0.35)', fontWeight: 700, color: '#ffffff' }}>{lang === 'km' ? 'ល.រ' : 'No.'}</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', border: '1px solid rgba(255, 255, 255, 0.35)', fontWeight: 700, color: '#ffffff' }}>{lang === 'km' ? 'ហាងអតិថិជន' : 'Merchant Shop'}</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', border: '1px solid rgba(255, 255, 255, 0.35)', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap' }}>{lang === 'km' ? 'ទឹកប្រាក់ត្រូវទូទាត់សរុប' : 'Net Payable Amount'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedData.map((row, idx) => (
                      <tr key={row.merchant.id}>
                        <td style={{ textAlign: 'center', padding: '5px 4px', border: '1px solid #64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '5px 8px', border: '1px solid #64748b' }}>
                          {row.merchant.name} {row.merchant.nameKh ? `(${row.merchant.nameKh})` : ''} {row.merchant.phone ? `— ${row.merchant.phone}` : ''}
                        </td>
                        <td style={{ textAlign: 'right', padding: '5px 8px', border: '1px solid #64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          ${row.financials.payableUSD.toFixed(2)} / {row.financials.payableKHR.toLocaleString()} ៛
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Localized Date for Summary Print */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, fontStyle: 'italic', color: '#0f172a' }}>
                    {lang === 'km' ? getKhmerDateString(new Date()) : new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>

                <div style={{ marginTop: 26, display: 'flex', justifyContent: 'space-between', padding: '0 40px', pageBreakInside: 'avoid' }}>
                  <div style={{ textAlign: 'center', minWidth: 180 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 42, color: '#0f172a' }}>{lang === 'km' ? 'បានឃើញ និងឯកភាព' : 'Approved By'}</div>
                    <div style={{ fontSize: 11, color: '#475569' }}>..........................................</div>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 180 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 42, color: '#0f172a' }}>{lang === 'km' ? 'អ្នករៀបចំរបាយការណ៍' : 'Prepared By'}</div>
                    <div style={{ fontSize: 11, color: '#475569' }}>..........................................</div>
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
