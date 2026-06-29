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
  const [rowCashKHR, setRowCashKHR] = useState<Record<number, string>>({});
  const [rowCashUSD, setRowCashUSD] = useState<Record<number, string>>({});
  const [rowPaymentMethod, setRowPaymentMethod] = useState<Record<number, string>>({});
  const [rowCompletedDate, setRowCompletedDate] = useState<Record<number, string>>({});

  const loadActiveOrders = async () => {
    try {
      const res = await api.get('/orders');
      // Only show active / non-final orders (picked-up, in-transit)
      const activeOrders = (res.data || []).filter((o: any) =>
        o.status === 'in-transit' || o.status === 'picked-up' || o.status === 'assigned'
      );

      // Pre-fill default inputs for COD currencies
      const khrVals: Record<number, string> = {};
      const usdVals: Record<number, string> = {};
      const methodVals: Record<number, string> = {};
      const dateVals: Record<number, string> = {};
      const todayStr = getLocalDateString();

      activeOrders.forEach((o: any) => {
        if (o.codCurrency === 'KHR') {
          khrVals[o.id] = String(parseInt(o.cod || 0));
          usdVals[o.id] = '0';
        } else {
          khrVals[o.id] = '0';
          usdVals[o.id] = String(parseFloat(o.cod || 0).toFixed(2));
        }
        methodVals[o.id] = 'cash'; // default payment method
        dateVals[o.id] = todayStr; // default completed date
      });

      setRowCashKHR(prev => ({ ...khrVals, ...prev }));
      setRowCashUSD(prev => ({ ...usdVals, ...prev }));
      setRowPaymentMethod(prev => ({ ...methodVals, ...prev }));
      setRowCompletedDate(prev => ({ ...dateVals, ...prev }));
      setOrders(activeOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  const loadDrivers = async () => {
    try {
      const res = await api.get('/drivers');
      setDrivers(res.data || []);
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
  const handleCashKHRChange = (id: number, value: string) => {
    setRowCashKHR(prev => ({ ...prev, [id]: value }));
  };

  const handleCashUSDChange = (id: number, value: string) => {
    setRowCashUSD(prev => ({ ...prev, [id]: value }));
  };

  const handlePaymentMethodChange = (id: number, value: string) => {
    setRowPaymentMethod(prev => ({ ...prev, [id]: value }));
    // If failed or returned, automatically zero out cash amounts
    if (value === 'failed' || value === 'returned') {
      setRowCashKHR(prev => ({ ...prev, [id]: '0' }));
      setRowCashUSD(prev => ({ ...prev, [id]: '0' }));
    }
  };

  const handleCompletedDateChange = (id: number, value: string) => {
    setRowCompletedDate(prev => ({ ...prev, [id]: value }));
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
      if (!matchTracking && !matchPhone && !matchShop) return false;
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
    if (selectedIds.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(
        selectedIds.map(async id => {
          const method = rowPaymentMethod[id] || 'cash';
          let status = 'delivered';
          if (method === 'failed') status = 'failed';
          else if (method === 'returned') status = 'returned';
          const khr = parseInt(rowCashKHR[id] || '0') || 0;
          const usd = parseFloat(rowCashUSD[id] || '0') || 0;
          const completedDate = rowCompletedDate[id] || appliedFilters.date || getLocalDateString();

          await api.patch(`/orders/${id}`, {
            status,
            paymentMethod: method,
            receivedAmountKHR: khr,
            receivedAmountUSD: usd,
            deliveredAt: completedDate ? new Date(completedDate).toISOString() : undefined,
          });
        })
      );

      alert(lang === 'km' ? 'រក្សាទុកទិន្នន័យបានជោគជ័យ!' : 'Batch updated successfully!');
      setSelectedIds([]);
      await loadActiveOrders();
    } catch (err: any) {
      alert(lang === 'km' ? 'មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ' : 'Error updating orders: ' + (err.response?.data?.message || err.message));
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
                  <option value="assigned">{lang === 'km' ? 'បានចាត់ចែង' : 'Assigned'}</option>
                  <option value="picked-up">{lang === 'km' ? 'បានប្រមូល' : 'Picked Up'}</option>
                  <option value="in-transit">{lang === 'km' ? 'កំពុងដឹក' : 'In Transit'}</option>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', marginBottom: '16px' }}>
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

              <button
                className="btn btn-primary"
                onClick={handleBatchSave}
                disabled={saving || selectedIds.length === 0}
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
                  opacity: (saving || selectedIds.length === 0) ? 0.6 : 1,
                  cursor: (saving || selectedIds.length === 0) ? 'not-allowed' : 'pointer'
                }}
              >
                <span>{saving ? (lang === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...') : (lang === 'km' ? '+ បញ្ចូលទិន្នន័យជាបាច់' : '+ Save in Batch')}</span>
              </button>
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
            <div className="table-responsive" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                    <th rowSpan={2} style={{ padding: '12px 8px', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: '13px', fontWeight: 'bold' }}>
                      {lang === 'km' ? 'ល.រ' : 'No.'}
                    </th>
                    <th rowSpan={2} style={{ padding: '12px 8px', border: '1px solid #e5e7eb', textAlign: 'left', fontSize: '13px', fontWeight: 'bold' }}>
                      {lang === 'km' ? 'កូដ' : 'Tracking Code'}
                    </th>
                    <th rowSpan={2} style={{ padding: '12px 8px', border: '1px solid #e5e7eb', textAlign: 'left', fontSize: '13px', fontWeight: 'bold' }}>
                      {lang === 'km' ? 'ឈ្មោះហាង' : 'Shop/Merchant'}
                    </th>
                    <th rowSpan={2} style={{ padding: '12px 8px', border: '1px solid #e5e7eb', textAlign: 'left', fontSize: '13px', fontWeight: 'bold' }}>
                      {lang === 'km' ? 'លេខអ្នកទទួល' : 'Receiver Phone'}
                    </th>
                    <th rowSpan={2} style={{ padding: '12px 8px', border: '1px solid #e5e7eb', textAlign: 'left', fontSize: '13px', fontWeight: 'bold' }}>
                      {lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date (Created)'}
                    </th>
                    <th rowSpan={2} style={{ padding: '12px 8px', border: '1px solid #e5e7eb', textAlign: 'left', fontSize: '13px', fontWeight: 'bold' }}>
                      {lang === 'km' ? 'កាលបរិច្ឆេទបញ្ចប់' : 'End Date (Completed)'}
                    </th>
                    <th rowSpan={2} style={{ padding: '12px 8px', border: '1px solid #e5e7eb', textAlign: 'left', fontSize: '13px', fontWeight: 'bold' }}>
                      {lang === 'km' ? 'ទីតាំង' : 'Location'}
                    </th>
                    <th rowSpan={2} style={{ padding: '12px 8px', border: '1px solid #e5e7eb', textAlign: 'right', fontSize: '13px', fontWeight: 'bold' }}>
                      {lang === 'km' ? 'សេវាដឹក' : 'Delivery Fee'}
                    </th>
                    <th rowSpan={2} style={{ padding: '12px 8px', border: '1px solid #e5e7eb', textAlign: 'right', fontSize: '13px', fontWeight: 'bold' }}>
                      {lang === 'km' ? 'ទឹកប្រាក់ត្រូវទូទាត់' : 'Amount/COD'}
                    </th>
                    <th rowSpan={2} style={{ padding: '12px 8px', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', width: '80px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span>{lang === 'km' ? 'ជ្រើសរើស' : 'Select'}</span>
                        <input
                          type="checkbox"
                          checked={currentPageItems.length > 0 && currentPageItems.every(item => selectedIds.includes(item.id))}
                          onChange={handleSelectAll}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </div>
                    </th>
                    <th colSpan={2} style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: '13px', fontWeight: 'bold' }}>
                      {lang === 'km' ? 'សាច់ប្រាក់' : 'Cash'}
                    </th>
                    <th rowSpan={2} style={{ padding: '12px 8px', border: '1px solid #e5e7eb', textAlign: 'left', fontSize: '13px', fontWeight: 'bold', width: '160px' }}>
                      {lang === 'km' ? 'ស្ថានភាព / វិធីសាស្ត្រទូទាត់' : 'Status / Payment Method'}
                    </th>
                  </tr>
                  <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: '12px', fontWeight: 'normal' }}>
                      {lang === 'km' ? 'សាច់ប្រាក់ KHR' : 'Cash KHR'}
                    </th>
                    <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: '12px', fontWeight: 'normal' }}>
                      {lang === 'km' ? 'សាច់ប្រាក់ USD' : 'Cash USD'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentPageItems.length === 0 ? (
                    <tr>
                      <td colSpan={13} style={{ textAlign: 'center', padding: '32px', color: '#6b7280', fontSize: '14px' }}>
                        No data available in table
                      </td>
                    </tr>
                  ) : (
                    currentPageItems.map((o: any, idx) => {
                      const isSelected = selectedIds.includes(o.id);
                      return (
                        <tr
                          key={o.id}
                          style={{
                            borderBottom: '1px solid #e5e7eb',
                            backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          <td style={{ padding: '10px 8px', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>
                            {(currentPage - 1) * pageSize + idx + 1}
                          </td>
                          <td style={{ padding: '10px 8px', border: '1px solid #e5e7eb', fontSize: '13px', fontWeight: '600' }}>
                            <code>{o.trackingCode}</code>
                          </td>
                          <td style={{ padding: '10px 8px', border: '1px solid #e5e7eb', fontSize: '13px' }}>
                            {lang === 'km' && o.merchant?.nameKh ? o.merchant.nameKh : (o.merchant?.name || '—')}
                          </td>
                          <td style={{ padding: '10px 8px', border: '1px solid #e5e7eb', fontSize: '13px', fontWeight: '600' }}>
                            {o.receiverPhone}
                          </td>
                          <td style={{ padding: '10px 8px', border: '1px solid #e5e7eb', fontSize: '13px', color: '#4b5563' }}>
                            {formatDateToDDMMYYYY(o.createdAt)}
                          </td>
                          <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb' }}>
                            <DateInput
                              value={rowCompletedDate[o.id] || appliedFilters.date}
                              onChange={val => handleCompletedDateChange(o.id, val)}
                              inputStyle={{ width: '130px', minWidth: '130px', height: 32, padding: '2px 6px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#f3f4f6', fontSize: '12px' }}
                            />
                          </td>
                          <td style={{ padding: '10px 8px', border: '1px solid #e5e7eb', fontSize: '12px', color: '#4b5563', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {o.receiverAddress}
                          </td>
                          <td style={{ padding: '10px 8px', border: '1px solid #e5e7eb', textAlign: 'right', fontSize: '13px', fontWeight: '600' }}>
                            {formatFee(o.deliveryFee)}
                          </td>
                          <td style={{ padding: '10px 8px', border: '1px solid #e5e7eb', textAlign: 'right', fontSize: '13px', fontWeight: 'bold' }}>
                            {formatCODDisplay(o.cod, o.codCurrency)}
                          </td>
                          <td style={{ padding: '10px 8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRow(o.id)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb' }}>
                            <input
                              type="number"
                              className="form-control"
                              value={rowCashKHR[o.id] ?? ''}
                              onChange={e => handleCashKHRChange(o.id, e.target.value)}
                              disabled={rowPaymentMethod[o.id] === 'failed' || rowPaymentMethod[o.id] === 'returned'}
                              style={{ width: '100px', height: '32px', padding: '2px 6px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px', textAlign: 'center' }}
                            />
                          </td>
                          <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb' }}>
                            <input
                              type="number"
                              className="form-control"
                              value={rowCashUSD[o.id] ?? ''}
                              onChange={e => handleCashUSDChange(o.id, e.target.value)}
                              disabled={rowPaymentMethod[o.id] === 'failed' || rowPaymentMethod[o.id] === 'returned'}
                              style={{ width: '100px', height: '32px', padding: '2px 6px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px', textAlign: 'center' }}
                            />
                          </td>
                          <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb' }}>
                            <select
                              className="form-control"
                              value={rowPaymentMethod[o.id] || 'cash'}
                              onChange={e => handlePaymentMethodChange(o.id, e.target.value)}
                              style={{ width: '100%', height: '32px', padding: '2px 6px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: '#fff', fontSize: '12px', cursor: 'pointer' }}
                            >
                              <option value="cash">{lang === 'km' ? 'ទទួលសាច់ប្រាក់' : 'Receive Cash'}</option>
                              <option value="bank">{lang === 'km' ? 'ទូទាត់តាមធនាគារ' : 'Bank Transfer'}</option>
                              <option value="failed">{lang === 'km' ? 'ដឹកមិនជោគជ័យ' : 'Delivery Failed'}</option>
                              <option value="returned">{lang === 'km' ? 'បង្វិលត្រឡប់ទៅហាង' : 'Return to Shop'}</option>
                            </select>
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
