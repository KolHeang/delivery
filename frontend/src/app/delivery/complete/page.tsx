'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import {
  MdSearch,
  MdFilterList,
  MdRefresh,
  MdSave,
  MdCheckCircle,
  MdCancel,
  MdAssignmentReturn,
  MdLocalShipping,
  MdDoneAll,
} from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';
import DateInput, { formatDateToDDMMYYYY } from '@/components/ui/DateInput';
import SearchableSelect from '@/components/ui/SearchableSelect';

const getLocalDateString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const FAILURE_REASONS = [
  { value: 'អ្នកដឹកខូច App / ទូរស័ព្ទអស់ថ្ម', labelKm: 'អ្នកដឹកខូច App / ទូរស័ព្ទអស់ថ្ម', labelEn: 'Driver App crashed / phone dead' },
  { value: 'អ្នកដឹកខូចម៉ូតូ / មានបញ្ហាបច្ចេកទេស', labelKm: 'អ្នកដឹកខូចម៉ូតូ / មានបញ្ហាបច្ចេកទេស', labelEn: 'Driver vehicle issue / breakdown' },
  { value: 'អតិថិជនមិនលើកទូរស័ព្ទ', labelKm: 'អតិថិជនមិនលើកទូរស័ព្ទ', labelEn: 'Customer did not answer phone' },
  { value: 'អតិថិជនសុំពន្យារពេលដឹក', labelKm: 'អតិថិជនសុំពន្យារពេលដឹក', labelEn: 'Customer requested reschedule' },
  { value: 'ទីតាំងមិនត្រឹមត្រូវ / ហៅមិនចូល', labelKm: 'ទីតាំងមិនត្រឹមត្រូវ / ហៅមិនចូល', labelEn: 'Wrong address / unreachable' },
  { value: 'អតិថិជនបដិសេធទទួលទំនិញ', labelKm: 'អតិថិជនបដិសេធទទួលទំនិញ', labelEn: 'Customer rejected parcel' },
  { value: 'ទំនិញខូចខាត / មិនត្រូវតាមកម្ម៉ង់', labelKm: 'ទំនិញខូចខាត / មិនត្រូវតាមកម្ម៉ង់', labelEn: 'Damaged item / wrong item' },
  { value: 'ហាងស្នើសុំបោះបង់ការដឹក', labelKm: 'ហាងស្នើសុំបោះបង់ការដឹក', labelEn: 'Merchant requested cancellation' },
];

export default function CompletePackagePage() {
  const router = useRouter();
  const { lang, t } = useLanguage();

  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters state
  const [filterDate, setFilterDate] = useState('');
  const [filterMerchant, setFilterMerchant] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterDriver, setFilterDriver] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<{
    date: string;
    merchantId: string;
    branchId: string;
    driverId: string;
    status: string;
  }>(() => ({
    date: '',
    merchantId: '',
    branchId: '',
    driverId: '',
    status: '',
  }));

  // Table controls state
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Selection & row input state
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [rowStatus, setRowStatus] = useState<Record<number, string>>({});
  const [rowCashKHR, setRowCashKHR] = useState<Record<number, string>>({});
  const [rowCashUSD, setRowCashUSD] = useState<Record<number, string>>({});
  const [rowPaymentMethod, setRowPaymentMethod] = useState<Record<number, string>>({});
  const [rowCompletedDate, setRowCompletedDate] = useState<Record<number, string>>({});
  const [rowNotes, setRowNotes] = useState<Record<number, string>>({});

  const loadActiveOrders = async () => {
    try {
      const res = await api.get('/parcels/complete-box');
      const rawList = Array.isArray(res.data)
        ? res.data
        : (res.data?.results || res.data?.result || []);
      // Show all active & unfinalized orders (pending, in-warehouse, assigned, picked-up, in-transit, failed)
      const activeOrders = rawList.filter((o: any) =>
        ['pending', 'in-warehouse', 'assigned', 'picked-up', 'in-transit', 'failed'].includes(o.status)
      );

      // Pre-fill default inputs for COD currencies
      const statusVals: Record<number, string> = {};
      const khrVals: Record<number, string> = {};
      const usdVals: Record<number, string> = {};
      const methodVals: Record<number, string> = {};
      const dateVals: Record<number, string> = {};
      const noteVals: Record<number, string> = {};
      const todayStr = getLocalDateString();

      activeOrders.forEach((o: any) => {
        statusVals[o.id] = o.status || 'pending';
        if (o.status === 'delivered') {
          if (o.codCurrency === 'KHR') {
            khrVals[o.id] = String(parseInt(o.cod || 0));
            usdVals[o.id] = '0';
          } else {
            khrVals[o.id] = '0';
            usdVals[o.id] = String(parseFloat(o.cod || 0).toFixed(2));
          }
        } else {
          khrVals[o.id] = '0';
          usdVals[o.id] = '0';
        }
        methodVals[o.id] = o.paymentMethod || 'cash'; // default payment method
        dateVals[o.id] = todayStr; // default completed date
        noteVals[o.id] = o.note || '';
      });

      setRowStatus(statusVals);
      setRowCashKHR(khrVals);
      setRowCashUSD(usdVals);
      setRowPaymentMethod(methodVals);
      setRowCompletedDate(dateVals);
      setRowNotes(noteVals);
      setOrders(activeOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  const loadDrivers = async () => {
    try {
      const res = await api.get('/select/drivers');
      setDrivers(Array.isArray(res.data) ? res.data : (res.data?.results || res.data?.result || []));
    } catch (err) {
      console.error('Error fetching drivers:', err);
    }
  };

  const loadMerchants = async () => {
    try {
      const res = await api.get('/merchants');
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || res.data?.result || res.data?.data || []);
      setMerchants(list);
    } catch (err) {
      console.error('Error fetching merchants:', err);
    }
  };

  const loadBranches = async () => {
    try {
      const res = await api.get('/merchants/branches/all');
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || res.data?.result || res.data?.data || []);
      setBranches(list);
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadActiveOrders(), loadDrivers(), loadMerchants(), loadBranches()]);
    setLoading(false);
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
    loadData();
  }, [router]);

  // Handle Filter Click
  const handleFilterClick = () => {
    setAppliedFilters({
      date: filterDate,
      merchantId: filterMerchant,
      branchId: filterBranch,
      driverId: filterDriver,
      status: filterStatus,
    });
    setCurrentPage(1);
    setSelectedIds([]); // Reset selection on filter change
  };

  // Reset Filters
  const handleResetFilters = () => {
    setFilterDate('');
    setFilterMerchant('');
    setFilterBranch('');
    setFilterDriver('');
    setFilterStatus('');
    setAppliedFilters({
      date: '',
      merchantId: '',
      branchId: '',
      driverId: '',
      status: '',
    });
    setSearch('');
    setCurrentPage(1);
    setSelectedIds([]);
  };

  // Toggle selection for a single row
  const toggleSelectRow = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Input changes
  const handleStatusChange = (id: number, status: string) => {
    setSelectedIds(prev => Array.from(new Set([...prev, id])));
    setRowStatus(prev => ({ ...prev, [id]: status }));
    if (status !== 'delivered') {
      setRowCashKHR(prev => ({ ...prev, [id]: '0' }));
      setRowCashUSD(prev => ({ ...prev, [id]: '0' }));
    } else {
      const order = orders.find(o => o.id === id);
      if (order) {
        if (order.codCurrency === 'KHR') {
          setRowCashKHR(prev => ({ ...prev, [id]: String(parseInt(order.cod || 0)) }));
          setRowCashUSD(prev => ({ ...prev, [id]: '0' }));
        } else {
          setRowCashKHR(prev => ({ ...prev, [id]: '0' }));
          setRowCashUSD(prev => ({ ...prev, [id]: String(parseFloat(order.cod || 0).toFixed(2)) }));
        }
      }
    }
  };

  const handleBulkSetStatus = (status: string) => {
    if (selectedIds.length === 0) return;
    setRowStatus(prev => {
      const next = { ...prev };
      selectedIds.forEach(id => {
        next[id] = status;
      });
      return next;
    });
    if (status !== 'delivered') {
      setRowCashKHR(prev => {
        const next = { ...prev };
        selectedIds.forEach(id => { next[id] = '0'; });
        return next;
      });
      setRowCashUSD(prev => {
        const next = { ...prev };
        selectedIds.forEach(id => { next[id] = '0'; });
        return next;
      });
    } else {
      setRowCashKHR(prev => {
        const next = { ...prev };
        selectedIds.forEach(id => {
          const order = orders.find(o => o.id === id);
          if (order && order.codCurrency === 'KHR') next[id] = String(parseInt(order.cod || 0));
        });
        return next;
      });
      setRowCashUSD(prev => {
        const next = { ...prev };
        selectedIds.forEach(id => {
          const order = orders.find(o => o.id === id);
          if (order && order.codCurrency !== 'KHR') next[id] = String(parseFloat(order.cod || 0).toFixed(2));
        });
        return next;
      });
    }
  };

  const handleCashKHRChange = (id: number, value: string) => {
    setSelectedIds(prev => Array.from(new Set([...prev, id])));
    setRowCashKHR(prev => ({ ...prev, [id]: value }));
  };

  const handleCashUSDChange = (id: number, value: string) => {
    setSelectedIds(prev => Array.from(new Set([...prev, id])));
    setRowCashUSD(prev => ({ ...prev, [id]: value }));
  };

  const handlePaymentMethodChange = (id: number, value: string) => {
    setSelectedIds(prev => Array.from(new Set([...prev, id])));
    setRowPaymentMethod(prev => ({ ...prev, [id]: value }));
  };

  const handleNoteChange = (id: number, value: string) => {
    setSelectedIds(prev => Array.from(new Set([...prev, id])));
    setRowNotes(prev => ({ ...prev, [id]: value }));
  };

  // Filter and Search logic
  const filteredOrders = orders.filter(o => {
    // 1. Filter by applied merchant
    if (appliedFilters.merchantId) {
      const mId = String(o.merchantId || o.merchant?.id || '');
      if (mId !== appliedFilters.merchantId) return false;
    }

    // 2. Filter by applied branch
    if (appliedFilters.branchId) {
      const bId = String(o.branchId || o.branch?.id || '');
      if (bId !== appliedFilters.branchId) return false;
    }

    // 3. Filter by applied driver
    if (appliedFilters.driverId) {
      if (!o.driverId || String(o.driverId) !== appliedFilters.driverId) return false;
    }

    // 4. Filter by applied status
    if (appliedFilters.status) {
      if (o.status !== appliedFilters.status) return false;
    }

    // 5. Filter by applied date
    if (appliedFilters.date) {
      const orderDateStr = getLocalDateString(new Date(o.createdAt));
      if (orderDateStr !== appliedFilters.date) return false;
    }

    // 4. Search query
    if (search) {
      const q = search.toLowerCase();
      const matchTracking = o.trackingCode?.toLowerCase().includes(q);
      const matchPhone = o.receiverPhone?.includes(q);
      const matchShop = (o.merchant?.name?.toLowerCase().includes(q) || o.merchant?.nameKh?.toLowerCase().includes(q));
      const matchNote = (o.note?.toLowerCase().includes(q) || rowNotes[o.id]?.toLowerCase().includes(q));
      if (!matchTracking && !matchPhone && !matchShop && !matchNote) return false;
    }

    return true;
  });

  // Pagination calculations
  const totalEntries = filteredOrders.length;
  const totalPages = Math.ceil(totalEntries / pageSize);
  const startEntry = totalEntries === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endEntry = Math.min(currentPage * pageSize, totalEntries);
  const currentPageItems = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Toggle selection for all visible items on current page
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (checked) {
      const idsToAdd = currentPageItems.map(item => item.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...idsToAdd])));
    } else {
      const idsToRemove = currentPageItems.map(item => item.id);
      setSelectedIds(prev => prev.filter(id => !idsToRemove.includes(id)));
    }
  };

  // Bulk save changes
  const handleBatchSave = async () => {
    if (selectedIds.length === 0) {
      alert(lang === 'km' 
        ? 'សូមគូសធីក (Check) លើកញ្ចប់អីវ៉ាន់ដែលលោកអ្នកចង់រក្សាទុក ឬចុចធីកជ្រើសរើសទាំងអស់!' 
        : 'Please check the box for the parcels you want to save or click Select All!');
      return;
    }
    setSaving(true);
    try {
      const items = selectedIds.map(id => {
        const status = rowStatus[id] || 'delivered';
        const isDelivered = status === 'delivered';
        const isIssue = ['failed', 'returned', 'cancelled'].includes(status);
        const method = isDelivered 
          ? (rowPaymentMethod[id] || 'cash') 
          : (isIssue ? status : undefined);
        const paymentStatus = isDelivered 
          ? (method === 'unpaid' ? 'pending' : 'paid') 
          : 'pending';
        const completedDate = rowCompletedDate[id] || appliedFilters.date || getLocalDateString();
        const note = rowNotes[id] ?? '';

        return {
          id,
          status,
          paymentMethod: method,
          paymentStatus,
          note: note || undefined,
          reason: (!isDelivered && note) ? note : undefined,
          deliveredAt: isDelivered ? (completedDate ? new Date(completedDate).toISOString() : new Date().toISOString()) : undefined,
        };
      });

      await api.post('/parcels/complete-box/batch-update', { items });

      alert(lang === 'km' ? 'រក្សាទុកទិន្នន័យបានជោគជ័យ!' : 'Operations updated successfully!');
      setSelectedIds([]);
      await loadActiveOrders();
    } catch (err: any) {
      alert(lang === 'km' ? 'មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ: ' + (err.response?.data?.message || err.message) : 'Error updating orders: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
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
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('completePackageTitle')} subtitle={t('completePackageSubtitle')} />
        <div className="page-content">

          {/* ── Modern Filter Card ── */}
          <div className="card" style={{ padding: '16px 20px', marginBottom: '20px', border: '1.5px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
                <DateInput
                  labelEn="Date"
                  labelKh="កាលបរិច្ឆេទ"
                  value={filterDate}
                  onChange={setFilterDate}
                  allowEmpty={true}
                />
              </div>

              <div style={{ flex: '1 1 180px', minWidth: '160px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>
                  {lang === 'km' ? 'ស្ថានភាព៖' : 'Status:'}
                </label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  style={{
                    height: '38px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border, #d1d5db)',
                    backgroundColor: 'var(--bg-card, #fff)',
                    color: 'var(--text-primary, #1e293b)',
                    fontSize: '13px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">{lang === 'km' ? '— ទាំងអស់ —' : '— All Statuses —'}</option>
                  <option value="pending">{lang === 'km' ? 'រង់ចាំ' : 'Pending'}</option>
                  <option value="in-warehouse">{lang === 'km' ? 'ក្នុងឃ្លាំង' : 'In Warehouse'}</option>
                  <option value="assigned">{lang === 'km' ? 'បានចាត់ចែង' : 'Assigned'}</option>
                  <option value="picked-up">{lang === 'km' ? 'បានប្រមូល' : 'Picked Up'}</option>
                  <option value="in-transit">{lang === 'km' ? 'កំពុងដឹក' : 'In Transit'}</option>
                  <option value="failed">{lang === 'km' ? 'មិនបានសម្រេច' : 'Failed'}</option>
                </select>
              </div>

              {/* Merchant Filter */}
              <div style={{ flex: '1 1 200px', minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>
                  {lang === 'km' ? 'ហាង / អាជីវករ៖' : 'Merchant:'}
                </label>
                <SearchableSelect
                  value={filterMerchant}
                  onChange={val => {
                    setFilterMerchant(val);
                    setFilterBranch('');
                  }}
                  style={{ height: '38px', borderRadius: '8px' }}
                  placeholder={lang === 'km' ? '— ជ្រើសរើសហាង —' : '— Select Merchant —'}
                  options={[
                    { value: '', label: lang === 'km' ? '— ជ្រើសរើសហាង —' : '— Select Merchant —' },
                    ...merchants.map(m => ({
                      value: String(m.id),
                      label: (lang === 'km' && m.nameKh ? m.nameKh : m.name) + (m.phone ? ` (${m.phone})` : ''),
                    })),
                  ]}
                />
              </div>

              {/* Branch Filter */}
              <div style={{ flex: '1 1 180px', minWidth: '160px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>
                  {lang === 'km' ? 'សាខា៖' : 'Branch:'}
                </label>
                <SearchableSelect
                  value={filterBranch}
                  onChange={setFilterBranch}
                  style={{ height: '38px', borderRadius: '8px' }}
                  placeholder={lang === 'km' ? '— ជ្រើសរើសសាខា —' : '— Select Branch —'}
                  options={[
                    { value: '', label: lang === 'km' ? '— ជ្រើសរើសសាខា —' : '— Select Branch —' },
                    ...branches
                      .filter(b => !filterMerchant || String(b.merchantId || b.merchant?.id) === filterMerchant)
                      .map(b => ({
                        value: String(b.id),
                        label: (lang === 'km' && b.branchNameKh ? b.branchNameKh : (b.branchName || b.name)) + (b.phone ? ` (${b.phone})` : ''),
                      })),
                  ]}
                />
              </div>

              {/* Driver Filter */}
              <div style={{ flex: '1 1 200px', minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>
                  {lang === 'km' ? 'អ្នកដឹក៖' : 'Driver:'}
                </label>
                <SearchableSelect
                  value={filterDriver}
                  onChange={setFilterDriver}
                  style={{ height: '38px', borderRadius: '8px' }}
                  placeholder={lang === 'km' ? '— ជ្រើសរើសអ្នកដឹក —' : '— Select Driver —'}
                  options={[
                    { value: '', label: lang === 'km' ? '— ជ្រើសរើសអ្នកដឹក —' : '— Select Driver —' },
                    ...drivers.map(d => ({
                      value: String(d.id),
                      label: (lang === 'km' && d.nameKh ? d.nameKh : d.name) + (d.phone ? ` (${d.phone})` : ''),
                    })),
                  ]}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleFilterClick}
                  style={{
                    height: '38px',
                    padding: '0 20px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600,
                    fontSize: '13px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--sidebar-bg, #1565D8)',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(21, 101, 216, 0.2)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <MdFilterList size={18} />
                  <span>{lang === 'km' ? 'ចម្រាញ់' : 'Filter'}</span>
                </button>

                {(filterDate || filterMerchant || filterBranch || filterDriver || filterStatus || appliedFilters.date || appliedFilters.merchantId || appliedFilters.branchId || appliedFilters.driverId || appliedFilters.status) && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    style={{
                      height: '38px',
                      padding: '0 14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 500,
                      fontSize: '13px',
                      borderRadius: '8px',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary, #64748b)',
                      border: '1px solid var(--border, #e2e8f0)',
                      cursor: 'pointer'
                    }}
                    title={lang === 'km' ? 'សម្អាត Filter' : 'Reset Filters'}
                  >
                    <MdRefresh size={18} />
                    <span>{lang === 'km' ? 'សម្អាត' : 'Reset'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Table & Actions Card ── */}
          <div className="card" style={{ padding: '20px', border: '1.5px solid var(--border)' }}>

            {/* Card Header & Batch Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border, #e5e7eb)', paddingBottom: '16px', marginBottom: '16px', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="card-title" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                  {lang === 'km' ? 'បញ្ជីទំនិញ' : 'Parcels List'}
                </span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: 'rgba(21, 101, 216, 0.08)',
                  color: 'var(--sidebar-bg, #1565D8)',
                  border: '1px solid rgba(21, 101, 216, 0.15)'
                }}>
                  {filteredOrders.length} {lang === 'km' ? 'កញ្ចប់' : 'parcels'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {selectedIds.length > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#f8fafc',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginRight: 4 }}>
                      {lang === 'km' ? `ជ្រើសបាន ${selectedIds.length}៖` : `Selected ${selectedIds.length}:`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleBulkSetStatus('delivered')}
                      style={{
                        fontSize: '11.5px',
                        padding: '4px 9px',
                        borderRadius: '6px',
                        border: '1px solid #bbf7d0',
                        background: '#dcfce7',
                        color: '#166534',
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                      title={lang === 'km' ? 'កំណត់បានដឹកជោគជ័យទាំងអស់' : 'Set all delivered'}
                    >
                      <MdCheckCircle size={14} />
                      {lang === 'km' ? 'ជោគជ័យ' : 'Delivered'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkSetStatus('failed')}
                      style={{
                        fontSize: '11.5px',
                        padding: '4px 9px',
                        borderRadius: '6px',
                        border: '1px solid #fecaca',
                        background: '#fee2e2',
                        color: '#991b1b',
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                      title={lang === 'km' ? 'កំណត់មិនបានសម្រេចទាំងអស់' : 'Set all failed'}
                    >
                      <MdCancel size={14} />
                      {lang === 'km' ? 'មិនជោគជ័យ' : 'Failed'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkSetStatus('returned')}
                      style={{
                        fontSize: '11.5px',
                        padding: '4px 9px',
                        borderRadius: '6px',
                        border: '1px solid #fed7aa',
                        background: '#ffedd5',
                        color: '#9a3412',
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                      title={lang === 'km' ? 'កំណត់បង្វិលត្រឡប់ទាំងអស់' : 'Set all returned'}
                    >
                      <MdAssignmentReturn size={14} />
                      {lang === 'km' ? 'បង្វិលត្រឡប់' : 'Returned'}
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleBatchSave}
                  disabled={saving}
                  style={{
                    height: '40px',
                    padding: '0 20px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600,
                    fontSize: '13px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--sidebar-bg, #1565D8)',
                    color: '#ffffff',
                    border: 'none',
                    opacity: saving ? 0.6 : 1,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <MdSave size={18} />
                  <span>
                    {saving
                      ? (lang === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...')
                      : (lang === 'km' 
                          ? (selectedIds.length > 0 ? `រក្សាទុកការទូទាត់ (${selectedIds.length})` : 'រក្សាទុកការទូទាត់ / បញ្ចប់') 
                          : (selectedIds.length > 0 ? `Save Settlement (${selectedIds.length})` : 'Save Settlement / Complete'))
                    }
                  </span>
                </button>
              </div>
            </div>

            {/* ── Modern Table Controls (Replaces legacy DataTables) ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary, #64748b)' }}>
                <span>{lang === 'km' ? 'បង្ហាញ' : 'Show'}</span>
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  style={{
                    height: '34px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border, #cbd5e1)',
                    backgroundColor: 'var(--bg-card, #fff)',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--text-primary, #1e293b)',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span>{lang === 'km' ? 'ជួរ' : 'entries'}</span>
              </div>

              <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
                <MdSearch size={18} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                  placeholder={lang === 'km' ? 'ស្វែងរកលេខកូដ, ហាង, ទូរស័ព្ទ...' : 'Search code, shop, phone...'}
                  style={{
                    width: '100%',
                    height: '36px',
                    paddingLeft: '34px',
                    paddingRight: search ? '30px' : '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border, #cbd5e1)',
                    backgroundColor: 'var(--bg-card, #fff)',
                    fontSize: '13px',
                    color: 'var(--text-primary, #1e293b)',
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
                      border: 'none',
                      background: 'transparent',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '14px',
                      padding: 2
                    }}
                    title={lang === 'km' ? 'សម្អាតការស្វែងរក' : 'Clear search'}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* ── Data Table (Modern Clean Header, No Vertical Lines, Checkbox in Col 1) ── */}
            <div className="table-responsive" style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--sidebar-bg, #1565D8)' }}>
                    {/* Column 1: Bulk Checkbox */}
                    <th style={{ width: 44, padding: '12px 14px', background: 'var(--sidebar-bg, #1565D8)', border: 'none', textAlign: 'center', verticalAlign: 'middle' }}>
                      <input
                        type="checkbox"
                        checked={currentPageItems.length > 0 && currentPageItems.every(item => selectedIds.includes(item.id))}
                        onChange={handleSelectAll}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', verticalAlign: 'middle', accentColor: '#ffffff' }}
                        title={lang === 'km' ? 'ជ្រើសរើសទាំងអស់លើទំព័រនេះ' : 'Select all on this page'}
                      />
                    </th>
                    {/* Column 2: Number */}
                    <th style={{ padding: '12px 10px', textAlign: 'center', width: 48, background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none', whiteSpace: 'nowrap' }}>
                      {lang === 'km' ? 'ល.រ' : 'No.'}
                    </th>
                    {/* Column 3: Tracking Code */}
                    <th style={{ padding: '12px 12px', textAlign: 'left', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none', whiteSpace: 'nowrap' }}>
                      {lang === 'km' ? 'លេខកូដ' : 'Tracking Code'}
                    </th>
                    {/* Column 4: Shop Name */}
                    <th style={{ padding: '12px 12px', textAlign: 'left', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none', whiteSpace: 'nowrap' }}>
                      {lang === 'km' ? 'ឈ្មោះហាង' : 'Shop/Merchant'}
                    </th>
                    {/* Column 5: Receiver Phone */}
                    <th style={{ padding: '12px 12px', textAlign: 'left', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none', whiteSpace: 'nowrap' }}>
                      {lang === 'km' ? 'លេខអ្នកទទួល' : 'Receiver Phone'}
                    </th>
                    {/* Column 6: Date */}
                    <th style={{ padding: '12px 12px', textAlign: 'left', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none', whiteSpace: 'nowrap' }}>
                      {lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}
                    </th>
                    {/* Column 7: Location */}
                    <th style={{ padding: '12px 12px', textAlign: 'left', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none', whiteSpace: 'nowrap' }}>
                      {lang === 'km' ? 'ទីតាំង' : 'Location'}
                    </th>
                    {/* Column 8: Delivery Fee */}
                    <th style={{ padding: '12px 12px', textAlign: 'right', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none', whiteSpace: 'nowrap' }}>
                      {lang === 'km' ? 'សេវាដឹក' : 'Fee'}
                    </th>
                    {/* Column 9: Amount COD */}
                    <th style={{ padding: '12px 12px', textAlign: 'right', background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none', whiteSpace: 'nowrap' }}>
                      {lang === 'km' ? 'ប្រាក់ COD' : 'COD Amount'}
                    </th>
                    {/* Column 10: Status */}
                    <th style={{ padding: '12px 12px', textAlign: 'left', minWidth: 150, background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none', whiteSpace: 'nowrap' }}>
                      {lang === 'km' ? 'ស្ថានភាព' : 'Status'}
                    </th>
                    {/* Column 11: Cash KHR */}
                    <th style={{ padding: '12px 10px', textAlign: 'center', width: 120, background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none', whiteSpace: 'nowrap' }}>
                      {lang === 'km' ? 'សាច់ប្រាក់ KHR' : 'Cash KHR'}
                    </th>
                    {/* Column 12: Cash USD */}
                    <th style={{ padding: '12px 10px', textAlign: 'center', width: 110, background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none', whiteSpace: 'nowrap' }}>
                      {lang === 'km' ? 'សាច់ប្រាក់ USD' : 'Cash USD'}
                    </th>
                    {/* Column 13: Payment Method */}
                    <th style={{ padding: '12px 12px', textAlign: 'left', minWidth: 145, background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none', whiteSpace: 'nowrap' }}>
                      {lang === 'km' ? 'វិធីសាស្ត្រទូទាត់' : 'Payment Method'}
                    </th>
                    {/* Column 14: Reason / Notes */}
                    <th style={{ padding: '12px 12px', textAlign: 'left', minWidth: 220, background: 'var(--sidebar-bg, #1565D8)', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none', whiteSpace: 'nowrap' }}>
                      {lang === 'km' ? 'មូលហេតុ / ចំណាំ' : 'Reason / Notes'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentPageItems.length === 0 ? (
                    <tr>
                      <td colSpan={14} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted, #94a3b8)', fontSize: '13px' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 52,
                            height: 52,
                            borderRadius: '50%',
                            background: '#f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8'
                          }}>
                            <MdLocalShipping size={26} />
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-secondary, #64748b)' }}>
                            {lang === 'km' ? 'មិនមានកញ្ចប់អីវ៉ាន់ដែលត្រូវបញ្ចប់ទេ' : 'No parcels available for completion'}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)' }}>
                            {lang === 'km' ? 'សូមជ្រើសរើស Filter ឬផ្លាស់ប្តូរពាក្យស្វែងរកឡើងវិញ' : 'Try adjusting your filters or search keywords'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentPageItems.map((o: any, idx) => {
                      const isSelected = selectedIds.includes(o.id);
                      const currentStatus = rowStatus[o.id] || 'delivered';
                      const isDelivered = currentStatus === 'delivered';
                      return (
                        <tr
                          key={o.id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          {/* Col 1: Checkbox */}
                          <td style={{ padding: '10px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRow(o.id)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer', verticalAlign: 'middle', accentColor: '#2563eb' }}
                            />
                          </td>
                          {/* Col 2: No. */}
                          <td style={{ padding: '10px 10px', textAlign: 'center', fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
                            {(currentPage - 1) * pageSize + idx + 1}
                          </td>
                          {/* Col 3: Tracking Code */}
                          <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                            <span style={{ fontFamily: 'monospace', letterSpacing: '0.02em', background: '#f1f5f9', padding: '3px 7px', borderRadius: 6, fontSize: 12 }}>
                              {o.trackingCode}
                            </span>
                          </td>
                          {/* Col 4: Shop Name */}
                          <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary, #1e293b)' }}>
                            {lang === 'km' && o.merchant?.nameKh ? o.merchant.nameKh : ((o.merchant?.name && o.merchant.name !== '-' && o.merchant.name !== '—') ? o.merchant.name : '—')}
                          </td>
                          {/* Col 5: Receiver Phone */}
                          <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary, #1e293b)' }}>
                            {(o.receiverPhone && o.receiverPhone !== '-' && o.receiverPhone !== '—') ? o.receiverPhone : '—'}
                          </td>
                          {/* Col 6: Date */}
                          <td style={{ padding: '10px 12px', fontSize: '12.5px', color: 'var(--text-secondary, #64748b)', whiteSpace: 'nowrap' }}>
                            {formatDateToDDMMYYYY(o.createdAt)}
                          </td>
                          {/* Col 7: Location */}
                          <td style={{ padding: '10px 12px', fontSize: '12.5px', color: 'var(--text-secondary, #64748b)', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={o.receiverAddress || ''}>
                            {(o.receiverAddress && o.receiverAddress !== '-' && o.receiverAddress !== '—') ? o.receiverAddress : '—'}
                          </td>
                          {/* Col 8: Delivery Fee */}
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #1e293b)' }}>
                            {formatFee(o.deliveryFee)}
                          </td>
                          {/* Col 9: Amount COD */}
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>
                            {formatCODDisplay(o.cod, o.codCurrency)}
                          </td>
                          {/* Col 10: Status Select */}
                          <td style={{ padding: '8px 10px' }}>
                            <select
                              value={currentStatus}
                              onChange={e => handleStatusChange(o.id, e.target.value)}
                              style={{
                                width: '100%',
                                minWidth: '135px',
                                height: '32px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                border: currentStatus === 'delivered' ? '1px solid #86efac' :
                                        (currentStatus === 'assigned' || currentStatus === 'in-warehouse') ? '1px solid #fde047' :
                                        currentStatus === 'in-transit' ? '1px solid #93c5fd' :
                                        (currentStatus === 'failed' || currentStatus === 'cancelled') ? '1px solid #fca5a5' :
                                        currentStatus === 'returned' ? '1px solid #fdba74' : '1px solid #cbd5e1',
                                backgroundColor: currentStatus === 'delivered' ? '#f0fdf4' :
                                                 (currentStatus === 'assigned' || currentStatus === 'in-warehouse') ? '#fefce8' :
                                                 currentStatus === 'in-transit' ? '#eff6ff' :
                                                 (currentStatus === 'failed' || currentStatus === 'cancelled') ? '#fff1f2' :
                                                 currentStatus === 'returned' ? '#fff7ed' : '#f8fafc',
                                color: currentStatus === 'delivered' ? '#15803d' :
                                       (currentStatus === 'assigned' || currentStatus === 'in-warehouse') ? '#854d0e' :
                                       currentStatus === 'in-transit' ? '#1d4ed8' :
                                       (currentStatus === 'failed' || currentStatus === 'cancelled') ? '#be123c' :
                                       currentStatus === 'returned' ? '#c2410c' : '#475569',
                                fontWeight: 600,
                                fontSize: '12px',
                                cursor: 'pointer',
                                outline: 'none'
                              }}
                            >
                              <option value="assigned">{lang === 'km' ? 'បានចាត់ចែង' : 'Assigned'}</option>
                              <option value="in-transit">{lang === 'km' ? 'កំពុងដឹក' : 'In Transit'}</option>
                              <option value="delivered">{lang === 'km' ? 'បានដឹកជោគជ័យ' : 'Delivered'}</option>
                              <option value="failed">{lang === 'km' ? 'ដឹកមិនជោគជ័យ' : 'Failed / Issue'}</option>
                              <option value="returned">{lang === 'km' ? 'បង្វិលត្រឡប់' : 'Return to Shop'}</option>
                              <option value="cancelled">{lang === 'km' ? 'បោះបង់ការដឹក' : 'Cancelled'}</option>
                              {currentStatus === 'in-warehouse' && (
                                <option value="in-warehouse">{lang === 'km' ? 'ក្នុងឃ្លាំង' : 'In Warehouse'}</option>
                              )}
                              {currentStatus === 'pending' && (
                                <option value="pending">{lang === 'km' ? 'រង់ចាំ' : 'Pending'}</option>
                              )}
                              {currentStatus === 'picked-up' && (
                                <option value="picked-up">{lang === 'km' ? 'បានប្រមូល' : 'Picked Up'}</option>
                              )}
                            </select>
                          </td>
                          {/* Col 11: Cash KHR */}
                          <td style={{ padding: '8px 8px' }}>
                            <div style={{ position: 'relative', width: '100%', minWidth: '95px' }}>
                              <input
                                type="number"
                                value={rowCashKHR[o.id] ?? ''}
                                onChange={e => handleCashKHRChange(o.id, e.target.value)}
                                disabled={!isDelivered}
                                style={{
                                  width: '100%',
                                  height: '32px',
                                  padding: '2px 24px 2px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #d1d5db',
                                  fontSize: '12.5px',
                                  fontWeight: 600,
                                  textAlign: 'right',
                                  outline: 'none',
                                  background: !isDelivered ? '#f8fafc' : '#fff',
                                  color: !isDelivered ? '#94a3b8' : '#0f172a'
                                }}
                              />
                              <span style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: !isDelivered ? '#cbd5e1' : '#64748b', pointerEvents: 'none', fontWeight: 600 }}>៛</span>
                            </div>
                          </td>
                          {/* Col 12: Cash USD */}
                          <td style={{ padding: '8px 8px' }}>
                            <div style={{ position: 'relative', width: '100%', minWidth: '85px' }}>
                              <input
                                type="number"
                                step="0.01"
                                value={rowCashUSD[o.id] ?? ''}
                                onChange={e => handleCashUSDChange(o.id, e.target.value)}
                                disabled={!isDelivered}
                                style={{
                                  width: '100%',
                                  height: '32px',
                                  padding: '2px 20px 2px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #d1d5db',
                                  fontSize: '12.5px',
                                  fontWeight: 600,
                                  textAlign: 'right',
                                  outline: 'none',
                                  background: !isDelivered ? '#f8fafc' : '#fff',
                                  color: !isDelivered ? '#94a3b8' : '#0f172a'
                                }}
                              />
                              <span style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: !isDelivered ? '#cbd5e1' : '#64748b', pointerEvents: 'none', fontWeight: 600 }}>$</span>
                            </div>
                          </td>
                          {/* Col 13: Payment Method */}
                          <td style={{ padding: '8px 8px' }}>
                            <select
                              value={rowPaymentMethod[o.id] || 'cash'}
                              onChange={e => handlePaymentMethodChange(o.id, e.target.value)}
                              disabled={!isDelivered}
                              style={{
                                width: '100%',
                                minWidth: '135px',
                                height: '32px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                backgroundColor: !isDelivered ? '#f8fafc' : '#fff',
                                color: !isDelivered ? '#94a3b8' : '#1e293b',
                                fontSize: '12px',
                                cursor: !isDelivered ? 'not-allowed' : 'pointer',
                                outline: 'none'
                              }}
                            >
                              <option value="cash">{lang === 'km' ? 'សាច់ប្រាក់ (Cash)' : 'Cash'}</option>
                              <option value="bank">{lang === 'km' ? 'ផ្ទេរប្រាក់ / KHQR' : 'Bank Transfer / KHQR'}</option>
                              <option value="unpaid">{lang === 'km' ? 'ជំពាក់ / មិនទាន់គិត' : 'Unpaid'}</option>
                            </select>
                          </td>
                          {/* Col 14: Reason / Notes */}
                          <td style={{ padding: '8px 8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '190px' }}>
                              {!isDelivered && (
                                <select
                                  value=""
                                  onChange={e => {
                                    if (e.target.value) {
                                      handleNoteChange(o.id, e.target.value);
                                    }
                                  }}
                                  style={{
                                    width: '100%',
                                    height: '26px',
                                    padding: '0 8px',
                                    borderRadius: '6px',
                                    border: '1px solid #fed7aa',
                                    backgroundColor: '#fffaf5',
                                    color: '#c2410c',
                                    fontSize: '11.5px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    outline: 'none'
                                  }}
                                >
                                  <option value="">{lang === 'km' ? '⚡ ជ្រើសមូលហេតុលឿន...' : '⚡ Quick Reason...'}</option>
                                  {FAILURE_REASONS.map((r, rIdx) => (
                                    <option key={rIdx} value={r.value}>
                                      {lang === 'km' ? r.labelKm : r.labelEn}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <input
                                type="text"
                                value={rowNotes[o.id] ?? ''}
                                onChange={e => handleNoteChange(o.id, e.target.value)}
                                placeholder={
                                  !isDelivered
                                    ? (lang === 'km' ? 'បញ្ជាក់មូលហេតុ...' : 'Reason for failure/cancel...')
                                    : (lang === 'km' ? 'ចំណាំផ្សេងៗ (បើមាន)...' : 'Remarks (optional)...')
                                }
                                style={{
                                  width: '100%',
                                  height: '30px',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #d1d5db',
                                  backgroundColor: '#fff',
                                  fontSize: '12px',
                                  color: 'var(--text-primary, #0f172a)',
                                  outline: 'none'
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Modern Pagination Controls ── */}
            {totalPages > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)' }}>
                  {lang === 'km' 
                    ? `បង្ហាញ ${startEntry} ដល់ ${endEntry} នៃ ${totalEntries} កញ្ចប់សរុប` 
                    : `Showing ${startEntry} to ${endEntry} of ${totalEntries} entries`}
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    style={{
                      padding: '4px 12px',
                      height: '32px',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      borderRadius: '6px',
                      border: '1px solid var(--border, #cbd5e1)',
                      backgroundColor: 'transparent',
                      color: currentPage === 1 ? '#94a3b8' : 'var(--text-primary, #1e293b)',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {lang === 'km' ? 'ថយក្រោយ' : 'Previous'}
                  </button>
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(pageNum => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      style={{
                        padding: '4px 10px',
                        height: '32px',
                        minWidth: '32px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: currentPage === pageNum ? 'var(--sidebar-bg, #1565D8)' : 'var(--border, #cbd5e1)',
                        backgroundColor: currentPage === pageNum ? 'var(--sidebar-bg, #1565D8)' : 'transparent',
                        color: currentPage === pageNum ? '#ffffff' : 'var(--text-primary, #1e293b)',
                        cursor: 'pointer'
                      }}
                    >
                      {pageNum}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    style={{
                      padding: '4px 12px',
                      height: '32px',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      borderRadius: '6px',
                      border: '1px solid var(--border, #cbd5e1)',
                      backgroundColor: 'transparent',
                      color: currentPage === totalPages || totalPages === 0 ? '#94a3b8' : 'var(--text-primary, #1e293b)',
                      cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {lang === 'km' ? 'បន្ទាប់' : 'Next'}
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
