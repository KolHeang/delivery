'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { MdSearch } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';
import DateInput, { formatDateToDDMMYYYY } from '@/components/ui/DateInput';

const getLocalDateString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const FAILURE_REASONS = [
  { value: 'អ្នកដឹកខូច App / ទូរស័ព្ទអស់ថ្ម', labelKm: '📱 អ្នកដឹកខូច App / ទូរស័ព្ទអស់ថ្ម', labelEn: '📱 Driver App crashed / phone dead' },
  { value: 'អ្នកដឹកខូចម៉ូតូ / មានបញ្ហាបច្ចេកទេស', labelKm: '🛵 អ្នកដឹកខូចម៉ូតូ / មានបញ្ហាបច្ចេកទេស', labelEn: '🛵 Driver vehicle issue / breakdown' },
  { value: 'អតិថិជនមិនលើកទូរស័ព្ទ', labelKm: '📞 អតិថិជនមិនលើកទូរស័ព្ទ', labelEn: '📞 Customer did not answer phone' },
  { value: 'អតិថិជនសុំពន្យារពេលដឹក', labelKm: '⏱️ អតិថិជនសុំពន្យារពេលដឹក', labelEn: '⏱️ Customer requested reschedule' },
  { value: 'ទីតាំងមិនត្រឹមត្រូវ / ហៅមិនចូល', labelKm: '📍 ទីតាំងមិនត្រឹមត្រូវ / ហៅមិនចូល', labelEn: '📍 Wrong address / unreachable' },
  { value: 'អតិថិជនបដិសេធទទួលទំនិញ', labelKm: '🙅 អតិថិជនបដិសេធទទួលទំនិញ', labelEn: '🙅 Customer rejected parcel' },
  { value: 'ទំនិញខូចខាត / មិនត្រូវតាមកម្ម៉ង់', labelKm: '📦 ទំនិញខូចខាត / មិនត្រូវតាមកម្ម៉ង់', labelEn: '📦 Damaged item / wrong item' },
  { value: 'ហាងស្នើសុំបោះបង់ការដឹក', labelKm: '🏪 ហាងស្នើសុំបោះបង់ការដឹក', labelEn: '🏪 Merchant requested cancellation' },
];

export default function CompletePackagePage() {
  const router = useRouter();
  const { lang, t } = useLanguage();

  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters state
  const [filterDate, setFilterDate] = useState('');
  const [filterDriver, setFilterDriver] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<{ date: string; driverId: string; status: string }>(() => ({
    date: '',
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
      const res = await api.get('/parcels', { params: { limit: 1000 } });
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

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadActiveOrders(), loadDrivers()]);
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
      driverId: filterDriver,
      status: filterStatus,
    });
    setCurrentPage(1);
    setSelectedIds([]); // Reset selection on filter change
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

  const handleCompletedDateChange = (id: number, value: string) => {
    setSelectedIds(prev => Array.from(new Set([...prev, id])));
    setRowCompletedDate(prev => ({ ...prev, [id]: value }));
  };

  const handleNoteChange = (id: number, value: string) => {
    setSelectedIds(prev => Array.from(new Set([...prev, id])));
    setRowNotes(prev => ({ ...prev, [id]: value }));
  };

  // Filter and Search logic
  const filteredOrders = orders.filter(o => {
    // 1. Filter by applied driver
    if (appliedFilters.driverId) {
      if (!o.driverId || String(o.driverId) !== appliedFilters.driverId) return false;
    }

    // 2. Filter by applied status
    if (appliedFilters.status) {
      if (o.status !== appliedFilters.status) return false;
    }

    // 3. Filter by applied date
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
      await Promise.all(
        selectedIds.map(async id => {
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

          await api.patch(`/parcels/${id}`, {
            status,
            paymentMethod: method,
            paymentStatus,
            note: note || undefined,
            reason: (!isDelivered && note) ? note : undefined,
            deliveredAt: isDelivered ? (completedDate ? new Date(completedDate).toISOString() : new Date().toISOString()) : undefined,
          });
        })
      );

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

          {/* Filters Card */}
          <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <DateInput
                labelEn="Date"
                labelKh="កាលបរិច្ឆេទ"
                value={filterDate}
                onChange={setFilterDate}
                style={{ minWidth: 220 }}
                allowEmpty={true}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '200px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-main, #374151)' }}>
                  {lang === 'km' ? 'ស្ថានភាព៖' : 'Status:'}
                </label>
                <select
                  className="form-control"
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  style={{ height: '38px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}
                >
                  <option value="">{lang === 'km' ? '— ទាំងអស់ —' : '— All —'}</option>
                  <option value="pending">{lang === 'km' ? 'រង់ចាំ' : 'Pending'}</option>
                  <option value="in-warehouse">{lang === 'km' ? 'ក្នុងឃ្លាំង' : 'In Warehouse'}</option>
                  <option value="assigned">{lang === 'km' ? 'បានចាត់ចែង' : 'Assigned'}</option>
                  <option value="picked-up">{lang === 'km' ? 'បានប្រមូល' : 'Picked Up'}</option>
                  <option value="in-transit">{lang === 'km' ? 'កំពុងដឹក' : 'In Transit'}</option>
                  <option value="failed">{lang === 'km' ? 'មិនបានសម្រេច' : 'Failed'}</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '250px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-main, #374151)' }}>
                  {lang === 'km' ? 'អ្នកដឹក៖' : 'Driver:'}
                </label>
                <select
                  className="form-control"
                  value={filterDriver}
                  onChange={e => setFilterDriver(e.target.value)}
                  style={{ height: '38px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}
                >
                  <option value="">{lang === 'km' ? '— ជ្រើសរើសអ្នកដឹក —' : '— Select Driver —'}</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {lang === 'km' && d.nameKh ? d.nameKh : d.name} ({d.phone})
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="btn btn-success"
                onClick={handleFilterClick}
                style={{
                  height: '38px',
                  padding: '0 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: '600',
                  borderRadius: '6px',
                  backgroundColor: '#16a34a',
                  borderColor: '#16a34a',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                <MdSearch size={18} />
                <span>Filter</span>
              </button>
            </div>
          </div>

          {/* Grid & Actions Card */}
          <div className="card" style={{ padding: '20px' }}>

            {/* Header with Save in Batch Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', marginBottom: '16px', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'var(--accent-light, #e0f2fe)', color: 'var(--accent, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  📦
                </div>
                <div>
                  <span className="card-title" style={{ fontSize: 16, fontWeight: 'bold' }}>
                    {lang === 'km' ? 'បញ្ជីទំនិញ' : 'Parcels List'}
                  </span>
                  <div style={{ fontSize: 13, color: 'var(--text-muted, #6b7280)', marginTop: 2 }}>
                    {filteredOrders.length} {lang === 'km' ? 'កញ្ចប់ត្រូវបានរកឃើញ' : 'packages found'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {selectedIds.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                      {lang === 'km' ? `ជ្រើសរើស ${selectedIds.length}:` : `Selected ${selectedIds.length}:`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleBulkSetStatus('delivered')}
                      style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #bbf7d0', background: '#dcfce7', color: '#166534', cursor: 'pointer', fontWeight: 600 }}
                      title={lang === 'km' ? 'កំណត់បានដឹកទាំងអស់' : 'Set all delivered'}
                    >
                      {lang === 'km' ? '✅ ជោគជ័យ' : '✅ Delivered'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkSetStatus('failed')}
                      style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #fecaca', background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontWeight: 600 }}
                      title={lang === 'km' ? 'កំណត់មិនបានសម្រេចទាំងអស់' : 'Set all failed'}
                    >
                      {lang === 'km' ? '❌ មិនជោគជ័យ' : '❌ Failed'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkSetStatus('returned')}
                      style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #fed7aa', background: '#ffedd5', color: '#9a3412', cursor: 'pointer', fontWeight: 600 }}
                      title={lang === 'km' ? 'កំណត់បង្វិលត្រឡប់ទាំងអស់' : 'Set all returned'}
                    >
                      {lang === 'km' ? '↩️ បង្វិលត្រឡប់' : '↩️ Returned'}
                    </button>
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  onClick={handleBatchSave}
                  disabled={saving}
                  style={{
                    height: '42px',
                    padding: '0 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: '600',
                    borderRadius: '6px',
                    backgroundColor: '#2563eb',
                    borderColor: '#2563eb',
                    color: '#fff',
                    opacity: saving ? 0.6 : 1,
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  <span>
                    {saving
                      ? (lang === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...')
                      : (lang === 'km' 
                          ? (selectedIds.length > 0 ? `រក្សាទុកការទូទាត់ / បញ្ចប់ (${selectedIds.length})` : 'រក្សាទុកការទូទាត់ / បញ្ចប់') 
                          : (selectedIds.length > 0 ? `Save Settlement / Complete (${selectedIds.length})` : 'Save Settlement / Complete'))
                    }
                  </span>
                </button>
              </div>
            </div>

            {/* Datatable Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#4b5563' }}>
                <span>Show</span>
                <select
                  className="form-control"
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  style={{ width: '70px', height: '34px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span>entries</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#4b5563' }}>
                <span>Search:</span>
                <input
                  type="text"
                  className="form-control"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                  style={{ width: '220px', height: '34px', padding: '4px 10px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}
                />
              </div>
            </div>

            {/* Data Table */}
            <div className="table-responsive" style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#2f55a5' }}>
                    <th style={{ padding: '12px 10px', textAlign: 'center', width: 44, background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>
                      {lang === 'km' ? 'ល.រ' : 'No.'}
                    </th>
                    <th style={{ padding: '12px 10px', textAlign: 'left', background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>
                      {lang === 'km' ? 'លេខកូដ' : 'Tracking Code'}
                    </th>
                    <th style={{ padding: '12px 10px', textAlign: 'left', background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>
                      {lang === 'km' ? 'ឈ្មោះហាង' : 'Shop/Merchant'}
                    </th>
                    <th style={{ padding: '12px 10px', textAlign: 'left', background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>
                      {lang === 'km' ? 'លេខអ្នកទទួល' : 'Receiver Phone'}
                    </th>
                    <th style={{ padding: '12px 10px', textAlign: 'left', background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>
                      {lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}
                    </th>
                    <th style={{ padding: '12px 10px', textAlign: 'left', background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>
                      {lang === 'km' ? 'ទីតាំង' : 'Location'}
                    </th>
                    <th style={{ padding: '12px 10px', textAlign: 'right', background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>
                      {lang === 'km' ? 'សេវាដឹក' : 'Delivery Fee'}
                    </th>
                    <th style={{ padding: '12px 10px', textAlign: 'right', background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>
                      {lang === 'km' ? 'ប្រាក់ COD' : 'Amount/COD'}
                    </th>
                    <th style={{ padding: '12px 10px', textAlign: 'center', width: 50, background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>
                      <input
                        type="checkbox"
                        checked={currentPageItems.length > 0 && currentPageItems.every(item => selectedIds.includes(item.id))}
                        onChange={handleSelectAll}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', verticalAlign: 'middle', accentColor: '#2563eb' }}
                        title={lang === 'km' ? 'ជ្រើសរើសទាំងអស់' : 'Select All'}
                      />
                    </th>
                    <th style={{ padding: '12px 10px', textAlign: 'left', minWidth: 150, background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>
                      {lang === 'km' ? 'ស្ថានភាព' : 'Status'}
                    </th>
                    <th style={{ padding: '12px 10px', textAlign: 'center', width: 105, background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>
                      {lang === 'km' ? 'សាច់ប្រាក់ KHR' : 'Cash KHR'}
                    </th>
                    <th style={{ padding: '12px 10px', textAlign: 'center', width: 105, background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>
                      {lang === 'km' ? 'សាច់ប្រាក់ USD' : 'Cash USD'}
                    </th>
                    <th style={{ padding: '12px 10px', textAlign: 'left', minWidth: 150, background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>
                      {lang === 'km' ? 'វិធីសាស្ត្រទូទាត់' : 'Payment Method'}
                    </th>
                    <th style={{ padding: '12px 10px', textAlign: 'left', minWidth: 220, background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>
                      {lang === 'km' ? 'មូលហេតុ / ចំណាំ' : 'Reason / Notes'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentPageItems.length === 0 ? (
                    <tr>
                      <td colSpan={14} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)', fontSize: '13px' }}>
                        {lang === 'km' ? 'គ្មានទិន្នន័យក្នុងតារាងទេ' : 'No data available in table'}
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
                            backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.04)' : 'transparent',
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                            {(currentPage - 1) * pageSize + idx + 1}
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {o.trackingCode}
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px', color: 'var(--text-primary)' }}>
                            {lang === 'km' && o.merchant?.nameKh ? o.merchant.nameKh : ((o.merchant?.name && o.merchant.name !== '-' && o.merchant.name !== '—') ? o.merchant.name : '')}
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                            {(o.receiverPhone && o.receiverPhone !== '-' && o.receiverPhone !== '—') ? o.receiverPhone : ''}
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {formatDateToDDMMYYYY(o.createdAt)}
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {(o.receiverAddress && o.receiverAddress !== '-' && o.receiverAddress !== '—') ? o.receiverAddress : ''}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {formatFee(o.deliveryFee)}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>
                            {formatCODDisplay(o.cod, o.codCurrency)}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRow(o.id)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            <select
                              value={currentStatus}
                              onChange={e => handleStatusChange(o.id, e.target.value)}
                              style={{
                                width: '100%',
                                minWidth: '140px',
                                height: '32px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                border: currentStatus === 'delivered' ? '1px solid #22c55e' :
                                        (currentStatus === 'assigned' || currentStatus === 'in-warehouse') ? '1px solid #f59e0b' :
                                        currentStatus === 'in-transit' ? '1px solid #3b82f6' :
                                        (currentStatus === 'failed' || currentStatus === 'cancelled') ? '1px solid #ef4444' :
                                        currentStatus === 'returned' ? '1px solid #f97316' : '1px solid #94a3b8',
                                backgroundColor: currentStatus === 'delivered' ? '#f0fdf4' :
                                                 (currentStatus === 'assigned' || currentStatus === 'in-warehouse') ? '#fffbeb' :
                                                 currentStatus === 'in-transit' ? '#eff6ff' :
                                                 (currentStatus === 'failed' || currentStatus === 'cancelled') ? '#fef2f2' :
                                                 currentStatus === 'returned' ? '#fff7ed' : '#f8fafc',
                                color: currentStatus === 'delivered' ? '#15803d' :
                                       (currentStatus === 'assigned' || currentStatus === 'in-warehouse') ? '#b45309' :
                                       currentStatus === 'in-transit' ? '#1d4ed8' :
                                       (currentStatus === 'failed' || currentStatus === 'cancelled') ? '#b91c1c' :
                                       currentStatus === 'returned' ? '#c2410c' : '#475569',
                                fontWeight: 600,
                                fontSize: '12px',
                                cursor: 'pointer',
                                outline: 'none'
                              }}
                            >
                              <option value="assigned">{lang === 'km' ? '📋 បានចាត់ចែង' : '📋 Assigned'}</option>
                              <option value="in-transit">{lang === 'km' ? '🚚 កំពុងដឹក' : '🚚 In Transit'}</option>
                              <option value="delivered">{lang === 'km' ? '✅ បានដឹកជោគជ័យ' : '✅ Delivered'}</option>
                              <option value="failed">{lang === 'km' ? '❌ ដឹកមិនជោគជ័យ' : '❌ Failed / Issue'}</option>
                              <option value="returned">{lang === 'km' ? '↩️ បង្វិលត្រឡប់' : '↩️ Return to Shop'}</option>
                              <option value="cancelled">{lang === 'km' ? '🚫 បោះបង់ការដឹក' : '🚫 Cancelled'}</option>
                              {currentStatus === 'in-warehouse' && (
                                <option value="in-warehouse">{lang === 'km' ? '🏢 ក្នុងឃ្លាំង' : '🏢 In Warehouse'}</option>
                              )}
                              {currentStatus === 'pending' && (
                                <option value="pending">{lang === 'km' ? '⏳ រង់ចាំ' : '⏳ Pending'}</option>
                              )}
                              {currentStatus === 'picked-up' && (
                                <option value="picked-up">{lang === 'km' ? '📦 បានប្រមូល' : '📦 Picked Up'}</option>
                              )}
                            </select>
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            <input
                              type="number"
                              value={rowCashKHR[o.id] ?? ''}
                              onChange={e => handleCashKHRChange(o.id, e.target.value)}
                              disabled={!isDelivered}
                              style={{
                                width: '100%',
                                height: '32px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                fontSize: '13px',
                                textAlign: 'center',
                                outline: 'none',
                                background: !isDelivered ? '#f3f4f6' : '#fff',
                                color: !isDelivered ? '#9ca3af' : '#111827'
                              }}
                            />
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            <input
                              type="number"
                              value={rowCashUSD[o.id] ?? ''}
                              onChange={e => handleCashUSDChange(o.id, e.target.value)}
                              disabled={!isDelivered}
                              style={{
                                width: '100%',
                                height: '32px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                fontSize: '13px',
                                textAlign: 'center',
                                outline: 'none',
                                background: !isDelivered ? '#f3f4f6' : '#fff',
                                color: !isDelivered ? '#9ca3af' : '#111827'
                              }}
                            />
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            <select
                              value={rowPaymentMethod[o.id] || 'cash'}
                              onChange={e => handlePaymentMethodChange(o.id, e.target.value)}
                              disabled={!isDelivered}
                              style={{
                                width: '100%',
                                minWidth: '140px',
                                height: '32px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                backgroundColor: !isDelivered ? '#f3f4f6' : '#fff',
                                color: !isDelivered ? '#9ca3af' : '#111827',
                                fontSize: '12px',
                                cursor: !isDelivered ? 'not-allowed' : 'pointer',
                                outline: 'none'
                              }}
                            >
                              <option value="cash">{lang === 'km' ? '💵 ទទួលសាច់ប្រាក់' : '💵 Cash'}</option>
                              <option value="bank">{lang === 'km' ? '🏦 ផ្ទេរប្រាក់ / KHQR' : '🏦 Bank Transfer / KHQR'}</option>
                              <option value="unpaid">{lang === 'km' ? '⏳ ជំពាក់ / មិនទាន់គិត' : '⏳ Unpaid'}</option>
                            </select>
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px' }}>
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
                                    height: '24px',
                                    padding: '0 6px',
                                    borderRadius: '4px',
                                    border: '1px dashed #f87171',
                                    backgroundColor: '#fff1f2',
                                    color: '#be123c',
                                    fontSize: '11px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <option value="">{lang === 'km' ? '⚡ មូលហេតុលឿន...' : '⚡ Quick Reason...'}</option>
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
                                    ? (lang === 'km' ? 'មូលហេតុបញ្ហា / បោះបង់...' : 'Reason for failure/cancel...')
                                    : (lang === 'km' ? 'ចំណាំផ្សេងៗ (បើមាន)...' : 'Remarks (optional)...')
                                }
                                style={{
                                  width: '100%',
                                  height: '30px',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  border: !isDelivered ? '1px solid #fca5a5' : '1px solid #d1d5db',
                                  backgroundColor: !isDelivered ? '#fffafb' : '#fff',
                                  fontSize: '12px',
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

            {/* Pagination controls */}
            {totalPages > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Showing {startEntry} to {endEntry} of {totalEntries} entries
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    style={{ padding: '4px 10px', height: '30px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(pageNum => (
                    <button
                      key={pageNum}
                      className={`btn btn-sm ${currentPage === pageNum ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setCurrentPage(pageNum)}
                      style={{
                        padding: '4px 10px',
                        height: '30px',
                        fontSize: '12px',
                        backgroundColor: currentPage === pageNum ? '#2563eb' : 'transparent',
                        borderColor: '#2563eb',
                        color: currentPage === pageNum ? '#fff' : '#2563eb',
                        cursor: 'pointer'
                      }}
                    >
                      {pageNum}
                    </button>
                  ))}
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    style={{ padding: '4px 10px', height: '30px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Next
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
