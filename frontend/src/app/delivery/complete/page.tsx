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
      const res = await api.get('/parcels');
      // Show all active & unfinalized orders (pending, in-warehouse, assigned, picked-up, in-transit, failed)
      const activeOrders = (res.data || []).filter((o: any) =>
        ['pending', 'in-warehouse', 'assigned', 'picked-up', 'in-transit', 'failed'].includes(o.status)
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
      const res = await api.get('/select/drivers');
      setDrivers(Array.isArray(res.data) ? res.data : (res.data?.result || []));
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

          await api.patch(`/parcels/${id}`, {
            status,
            paymentMethod: method,
            deliveredAt: completedDate ? new Date(completedDate).toISOString() : undefined,
          });
        })
      );

      alert(lang === 'km' ? 'រក្សាទុកការទូទាត់បានជោគជ័យ!' : 'Settlement saved successfully!');
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
                <span>{saving ? (lang === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...') : (lang === 'km' ? 'រក្សាទុកការទូទាត់' : 'Save Settlement')}</span>
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
                    <th style={{ padding: '12px 10px', textAlign: 'center', width: 60, background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>
                      <input
                        type="checkbox"
                        checked={currentPageItems.length > 0 && currentPageItems.every(item => selectedIds.includes(item.id))}
                        onChange={handleSelectAll}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', verticalAlign: 'middle', accentColor: '#2563eb' }}
                        title={lang === 'km' ? 'ជ្រើសរើសទាំងអស់' : 'Select All'}
                      />
                    </th>
                    <th style={{ padding: '12px 10px', textAlign: 'center', width: 110, background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>
                      {lang === 'km' ? 'សាច់ប្រាក់ KHR' : 'Cash KHR'}
                    </th>
                    <th style={{ padding: '12px 10px', textAlign: 'center', width: 110, background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>
                      {lang === 'km' ? 'សាច់ប្រាក់ USD' : 'Cash USD'}
                    </th>
                    <th style={{ padding: '12px 10px', textAlign: 'left', width: 160, background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>
                      {lang === 'km' ? 'វិធីសាស្ត្រទូទាត់' : 'Payment Method'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentPageItems.length === 0 ? (
                    <tr>
                      <td colSpan={12} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)', fontSize: '13px' }}>
                        {lang === 'km' ? 'គ្មានទិន្នន័យក្នុងតារាងទេ' : 'No data available in table'}
                      </td>
                    </tr>
                  ) : (
                    currentPageItems.map((o: any, idx) => {
                      const isSelected = selectedIds.includes(o.id);
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
                            <input
                              type="number"
                              value={rowCashKHR[o.id] ?? ''}
                              onChange={e => handleCashKHRChange(o.id, e.target.value)}
                              disabled={rowPaymentMethod[o.id] === 'failed' || rowPaymentMethod[o.id] === 'returned'}
                              style={{
                                width: '100%',
                                height: '32px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                fontSize: '13px',
                                textAlign: 'center',
                                outline: 'none',
                                background: '#fff'
                              }}
                            />
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            <input
                              type="number"
                              value={rowCashUSD[o.id] ?? ''}
                              onChange={e => handleCashUSDChange(o.id, e.target.value)}
                              disabled={rowPaymentMethod[o.id] === 'failed' || rowPaymentMethod[o.id] === 'returned'}
                              style={{
                                width: '100%',
                                height: '32px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                fontSize: '13px',
                                textAlign: 'center',
                                outline: 'none',
                                background: '#fff'
                              }}
                            />
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            <select
                              value={rowPaymentMethod[o.id] || 'cash'}
                              onChange={e => handlePaymentMethodChange(o.id, e.target.value)}
                              style={{
                                width: '100%',
                                height: '32px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                backgroundColor: '#fff',
                                fontSize: '12px',
                                cursor: 'pointer',
                                outline: 'none'
                              }}
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
