'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { MdFilterList, MdClear, MdPrint, MdSave, MdMoreHoriz, MdEdit, MdDelete, MdClose } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';
import DateInput, { formatDateToDDMMYYYY, getLocalDateString } from '@/components/ui/DateInput';
import Modal from '@/components/ui/Modal';



const getLocalFirstDayOfMonthString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

export default function PaymentWithStaffPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [driverId, setDriverId] = useState('');
  const [statusFilter, setStatusFilter] = useState('unpaid');
  const [startDate, setStartDate] = useState(() => getLocalDateString());
  const [endDate, setEndDate] = useState(() => getLocalDateString());
  
  // Data States
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Tabs & History states
  const [activeTab, setActiveTab] = useState<'settle' | 'history'>('settle');
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyDriverId, setHistoryDriverId] = useState('');

  // Edit Payout Modal State
  const [editPayment, setEditPayment] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editReference, setEditReference] = useState('');

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/payments/staff');
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
      await api.patch(`/payments/staff/${editPayment.id}`, {
        amount: parseFloat(editAmount) || 0,
        note: editNote,
        date: editDate || undefined,
        reference: editReference || undefined,
      });
      alert(lang === 'km' ? 'ធ្វើបច្ចុប្បន្នភាពបានជោគជ័យ!' : 'Updated successfully!');
      setEditPayment(null);
      loadHistory();
      handleFilter();
    } catch (err: any) {
      alert(lang === 'km' ? 'ធ្វើបច្ចុប្បន្នភាពបានបរាជ័យ' : 'Failed to update: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!confirm(lang === 'km' ? 'តើអ្នកប្រាកដជាចង់បង្វិលការទូទាត់នេះថយក្រោយវិញទេ? វានឹងកំណត់ស្ថានភាពកញ្ចប់អីវ៉ាន់ទាំងអស់ទៅជាមិនទាន់ទូទាត់ឡើងវិញ។' : 'Are you sure you want to reverse this settlement? This will reset all associated orders back to unpaid.')) return;
    try {
      await api.delete(`/payments/staff/${paymentId}`);
      alert(lang === 'km' ? 'បានបង្វិលប្រតិបត្តិការដោយជោគជ័យ!' : 'Reversal completed successfully!');
      loadHistory();
      handleFilter();
    } catch (err: any) {
      alert(lang === 'km' ? 'ការបង្វិលប្រតិបត្តិការបានបរាជ័យ' : 'Failed to reverse payment: ' + (err.response?.data?.message || err.message));
    }
  };

  const loadDrivers = async () => {
    try {
      const res = await api.get('/drivers');
      setDrivers(res.data || []);
      setDriverId(''); // Default to "All" (empty string)
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    import('@/lib/auth').then((m) => setUser(m.getUser()));
    loadDrivers();
    
    // Fix print blank issue: wait for print to complete before removing the class
    const handleAfterPrint = () => document.body.classList.remove('receipt-print-active');
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, [router]);

  const handleFilter = async () => {
    try {
      const url = driverId 
        ? `/orders?driverId=${driverId}`
        : `/orders`;
      const res = await api.get(url);
      setOrders(res.data || []);
      setSelectedIds([]);
    } catch {
      setOrders([]);
    }
  };

  useEffect(() => {
    handleFilter();
  }, [driverId, statusFilter]);

  const handleClear = () => {
    setDriverId('');
    setStatusFilter('unpaid');
    setStartDate(getLocalDateString());
    setEndDate(getLocalDateString());
    setSelectedIds([]);
  };

  // Filter orders by date client-side
  const deliveredOrders = orders.filter((o: any) => o.status === 'delivered' || o.status === 'failed' || o.status === 'returned');
  const pendingOrders = orders.filter((o: any) => o.status !== 'delivered' && o.status !== 'failed' && o.status !== 'returned');

  const filteredOrders = orders.filter((o: any) => {
    let dateString = o.deliveredAt;
    if (!dateString && (o.status === 'failed' || o.status === 'returned' || o.status === 'pending')) {
      dateString = o.updatedAt || o.createdAt;
    }
    const d = dateString ? new Date(dateString) : new Date(o.createdAt);
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (d < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (d > end) return false;
    }
    return true;
  });

  const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredOrders.map((o: any) => o.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const triggerPrintReceipt = () => {
    document.body.classList.add('receipt-print-active');
    // Small delay to allow the class to be applied and DOM to update before triggering print dialog
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleSavePayment = async () => {
    // Also include unpaid failed/returned order IDs in the date range so they get marked as paid/settled
    const unpaidFailedOrderIds = filteredOrders
      .filter((o: any) => (o.status === 'failed' || o.status === 'returned') && o.driverPaymentStatus === 'unpaid')
      .map((o: any) => o.id);

    const allOrderIdsToSettle = [...selectedIds, ...unpaidFailedOrderIds];

    if (allOrderIdsToSettle.length === 0) {
      alert(lang === 'km' ? 'សូមជ្រើសរើសយ៉ាងហោចណាស់កញ្ចប់អីវ៉ាន់មួយ ឬមានកញ្ចប់អីវ៉ាន់មិនជោគជ័យដើម្បីទូទាត់។' : 'Please select at least one order or have failed/returned orders to settle.');
      return;
    }
    if (!driverId) {
      alert(lang === 'km' ? 'សូមជ្រើសរើសបុគ្គលិកដឹកជញ្ជូនជាក់លាក់ណាមួយដើម្បីធ្វើការទូទាត់ប្រាក់។' : 'Please select a specific delivery driver to perform settlement.');
      return;
    }
    
    const selectedOrders = filteredOrders.filter((o: any) => selectedIds.includes(o.id));
    const totalDeliveryFee = selectedOrders.reduce((sum, o: any) => sum + parseFloat(o.deliveryFee || '0'), 0);
    
    setSaving(true);
    try {
      await api.post('/payments/staff', {
        driverId: parseInt(driverId),
        amount: totalDeliveryFee,
        date: new Date().toISOString(),
        reference: `SETTLE-STAFF-${Date.now().toString().slice(-6)}`,
        note: `Bulk settlement for ${selectedIds.length} orders`,
        orderIds: allOrderIdsToSettle,
      });
      alert(lang === 'km' ? 'រក្សាទុកការទូទាត់បានជោគជ័យ!' : 'Payment settled successfully!');
      handleFilter(); 
    } catch {
      alert(lang === 'km' ? 'រក្សាទុកការទូទាត់បានបរាជ័យ។' : 'Failed to settle payment.');
    }
    setSaving(false);
  };

  const unpaidFailedOrders = filteredOrders.filter((o: any) => (o.status === 'failed' || o.status === 'returned') && o.driverPaymentStatus === 'unpaid');
  const selectedOrders = filteredOrders.filter((o: any) => selectedIds.includes(o.id));
  const totalDeliveryFee = selectedOrders.reduce((sum, o: any) => sum + parseFloat(o.deliveryFee || '0'), 0);
  const totalCodKhr = selectedOrders.filter((o: any) => o.codCurrency === 'KHR').reduce((sum, o: any) => sum + parseFloat(o.cod || '0'), 0);
  const totalCodUsd = selectedOrders.filter((o: any) => o.codCurrency === 'USD').reduce((sum, o: any) => sum + parseFloat(o.cod || '0'), 0);

  // Print: use selected orders if any, otherwise print all filtered orders — delivered only for section 1
  const basePrintOrders = selectedIds.length > 0 ? selectedOrders : filteredOrders;
  const printOrders = basePrintOrders.filter((o: any) => o.status === 'delivered' && o.driverPaymentStatus === statusFilter);
  const printFailedOrders = basePrintOrders.filter((o: any) => (o.status === 'failed' || o.status === 'returned') && o.driverPaymentStatus === statusFilter);
  
  const printTotalFee = printOrders.reduce((sum, o: any) => sum + parseFloat(o.deliveryFee || '0'), 0);
  const printCodKhr = printOrders.filter((o: any) => o.codCurrency === 'KHR').reduce((sum, o: any) => sum + parseFloat(o.cod || '0'), 0);
  const printCodUsd = printOrders.filter((o: any) => o.codCurrency === 'USD').reduce((sum, o: any) => sum + parseFloat(o.cod || '0'), 0);
  const printPayableUsd = printTotalFee;

  // Filter historyData client-side
  const filteredHistory = historyData.filter((h: any) => {
    if (historyDriverId && String(h.driverId) !== historyDriverId) {
      return false;
    }
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      const refMatch = h.reference?.toLowerCase().includes(q);
      const noteMatch = h.note?.toLowerCase().includes(q);
      const driverNameMatch = h.driver?.name?.toLowerCase().includes(q) || h.driver?.nameKh?.toLowerCase().includes(q);
      if (!refMatch && !noteMatch && !driverNameMatch) {
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

  const selectedDriver = drivers.find(d => d.id.toString() === driverId);

  return (
    <>
      <div className="app-layout">
      <Sidebar />
      <div className="main-content" style={{ background: '#fff', minHeight: '100vh', fontFamily: 'Kantumruy Pro, sans-serif' }}>
        <Topbar title={lang === 'km' ? 'ទូទាត់ប្រាក់ជាមួយអ្នកដឹក' : 'Payment with Delivery'} subtitle={lang === 'km' ? 'ទូទាត់ប្រាក់ជាមួយអ្នកដឹកជញ្ជូន' : 'Settle payout with delivery drivers'} />
        
        {/* Tabs Bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', padding: '0 24px', background: '#fff', gap: 20 }}>
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

        <div style={{ padding: '20px 24px' }}>
          {activeTab === 'settle' ? (
            <>
          
          {/* Action & Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, paddingLeft: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>{lang === 'km' ? 'បុគ្គលិកដឹកជញ្ជូន' : 'Delivery Driver'}</span>
                </div>
                <select 
                  className="form-control"
                  style={{ minWidth: 200, height: 38, cursor: 'pointer' }}
                  value={driverId} 
                  onChange={e => setDriverId(e.target.value)}
                >
                  <option value="">{lang === 'km' ? '-- ទាំងអស់ --' : '-- All --'}</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name} {d.nameKh ? `(${d.nameKh})` : ''}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b', paddingLeft: 2 }}>
                  {lang === 'km' ? 'ស្ថានភាពទូទាត់' : 'Payment Status'}
                </span>
                <select
                  className="form-control"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  style={{ width: '200px', height: '38px', padding: '6px 12px', borderRadius: '4px', border: '1px solid #ced4da', backgroundColor: '#fff', cursor: 'pointer' }}
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
              />
              
              <DateInput
                labelEn="End Date"
                labelKh="ដល់"
                value={endDate}
                onChange={setEndDate}
              />
            </div>
            
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                onClick={triggerPrintReceipt}
                style={{ height: 34, padding: '0 16px', borderRadius: 4, background: '#fff', border: '1px solid #ced4da', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                <MdPrint size={16} /> {lang === 'km' ? 'បោះពុម្ព' : 'Print'} {selectedIds.length > 0 ? `(${selectedIds.length})` : `(${filteredOrders.length} ${lang === 'km' ? 'ទាំងអស់' : 'All'})`}
              </button>
              {statusFilter === 'unpaid' && (
                <button 
                  onClick={handleSavePayment} 
                  disabled={saving || (selectedIds.length === 0 && unpaidFailedOrders.length === 0)}
                  style={{ height: 34, padding: '0 16px', borderRadius: 4, background: (saving || (selectedIds.length === 0 && unpaidFailedOrders.length === 0)) ? '#6c757d' : '#0d6efd', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: (saving || (selectedIds.length === 0 && unpaidFailedOrders.length === 0)) ? 'not-allowed' : 'pointer' }}
                >
                  <MdSave size={16} /> {lang === 'km' ? 'រក្សាទុកការទូទាត់' : 'Save Settlement'}
                </button>
              )}
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
                {filteredOrders.filter((o: any) => o.status === 'delivered' && o.driverPaymentStatus === statusFilter).length} {lang === 'km' ? 'កញ្ចប់' : 'parcels'}
              </span>
            </div>
            <div style={{ border: '1px solid #dee2e6', borderRadius: 4, overflowX: 'auto', background: '#fff' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
                <thead>
                  <tr style={{ background: '#f0fdf4', borderBottom: '2px solid #16a34a' }}>
                    <th style={{ padding: '10px 8px', textAlign: 'center', borderRight: '1px solid #dee2e6', width: 40 }}>{lang === 'km' ? 'ល.រ' : 'No.'}</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', borderRight: '1px solid #dee2e6', width: 44 }}>
                      <input type="checkbox"
                        checked={filteredOrders.filter((o: any) => o.status === 'delivered' && o.driverPaymentStatus === statusFilter).length > 0 && filteredOrders.filter((o: any) => o.status === 'delivered' && o.driverPaymentStatus === statusFilter).every((o: any) => selectedIds.includes(o.id))}
                        onChange={(e) => {
                          const ids = filteredOrders.filter((o: any) => o.status === 'delivered' && o.driverPaymentStatus === statusFilter).map((o: any) => o.id);
                          if (e.target.checked) setSelectedIds(prev => Array.from(new Set([...prev, ...ids])));
                          else setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
                        }}
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', borderRight: '1px solid #dee2e6' }}>{lang === 'km' ? 'លេខកូដ' : 'Tracking Code'}</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', borderRight: '1px solid #dee2e6' }}>{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', borderRight: '1px solid #dee2e6' }}>{lang === 'km' ? 'ឈ្មោះហាង' : 'Shop Name'}</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', borderRight: '1px solid #dee2e6' }}>{lang === 'km' ? 'លេខអ្នកទទួល' : 'Receiver Phone'}</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', borderRight: '1px solid #dee2e6' }}>{lang === 'km' ? 'ប្រាក់បានបញ្ចូល' : 'Collected COD'}</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', borderRight: '1px solid #dee2e6' }}>{lang === 'km' ? 'ប្រាក់កម្រៃដឹក' : 'Delivery Fee'}</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center' }}>{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.filter((o: any) => o.status === 'delivered' && o.driverPaymentStatus === statusFilter).length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: '24px 0', color: '#6c757d' }}>{lang === 'km' ? 'គ្មានទិន្នន័យ' : 'No data'}</td></tr>
                  ) : (
                    filteredOrders.filter((o: any) => o.status === 'delivered' && o.driverPaymentStatus === statusFilter).map((o: any, idx: number) => {
                      const isSelected = selectedIds.includes(o.id);
                      return (
                        <tr key={o.id} style={{ borderBottom: '1px solid #dee2e6', background: isSelected ? '#f0fdf4' : '#fff' }}>
                          <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #dee2e6', fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #dee2e6' }}>
                            <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelect(o.id)} style={{ width: 18, height: 18, accentColor: '#16a34a', cursor: 'pointer' }} />
                          </td>
                          <td style={{ padding: '8px', borderRight: '1px solid #dee2e6', color: '#475569' }}>{o.trackingCode}</td>
                          <td style={{ padding: '8px', borderRight: '1px solid #dee2e6' }}>{o.deliveredAt ? formatDateToDDMMYYYY(o.deliveredAt) : '—'}</td>
                          <td style={{ padding: '8px', borderRight: '1px solid #dee2e6', color: '#0d6efd', fontWeight: 600 }}>{o.merchant?.name || '—'}</td>
                          <td style={{ padding: '8px', borderRight: '1px solid #dee2e6' }}>{o.receiverPhone}</td>
                          <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #dee2e6', color: '#dc2626', fontWeight: 600 }}>
                            {o.codCurrency === 'KHR' ? `${parseInt(o.cod).toLocaleString()} ៛` : `$ ${parseFloat(o.cod).toFixed(2)}`}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #dee2e6', color: '#dc2626', fontWeight: 600 }}>
                            $ {parseFloat(o.deliveryFee).toFixed(2)}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <span style={{ background: '#16a34a', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{lang === 'km' ? 'ជោគជ័យ' : 'Delivered'}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {/* Totals for delivered */}
                  {(() => {
                    const delivOrders = filteredOrders.filter((o: any) => o.status === 'delivered' && o.driverPaymentStatus === statusFilter && selectedIds.includes(o.id));
                    const allDeliv = filteredOrders.filter((o: any) => o.status === 'delivered' && o.driverPaymentStatus === statusFilter);
                    const src = delivOrders.length > 0 ? delivOrders : allDeliv;
                    const khr = src.filter((o: any) => o.codCurrency === 'KHR').reduce((s: number, o: any) => s + parseFloat(o.cod || '0'), 0);
                    const usd = src.filter((o: any) => o.codCurrency === 'USD').reduce((s: number, o: any) => s + parseFloat(o.cod || '0'), 0);
                    const fee = src.reduce((s: number, o: any) => s + parseFloat(o.deliveryFee || '0'), 0);
                    return (
                      <>
                        <tr style={{ background: '#f8f9fa' }}>
                          <td colSpan={6} style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 600, borderRight: '1px solid #dee2e6' }}>{lang === 'km' ? 'សរុបប្រាក់បានបញ្ចូលជារៀល (POD KHR)' : 'Total KHR Collected (POD KHR)'}</td>
                          <td colSpan={2} style={{ padding: '8px 12px', borderRight: '1px solid #dee2e6' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontWeight: 600, minWidth: 60, textAlign: 'right' }}>{khr.toLocaleString()}</span>
                              <div style={{ background: '#f59e0b', color: '#fff', padding: '5px 12px', borderRadius: 4, fontWeight: 600, flex: 1 }}>{khr.toLocaleString()}</div>
                            </div>
                          </td>
                          <td />
                        </tr>
                        <tr style={{ background: '#f8f9fa' }}>
                          <td colSpan={6} style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 600, borderRight: '1px solid #dee2e6' }}>{lang === 'km' ? 'សរុបប្រាក់បានបញ្ចូលជាដុល្លារ (POD USD)' : 'Total USD Collected (POD USD)'}</td>
                          <td colSpan={2} style={{ padding: '8px 12px', borderRight: '1px solid #dee2e6' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontWeight: 600, minWidth: 60, textAlign: 'right' }}>{usd.toFixed(2)}</span>
                              <div style={{ background: '#f59e0b', color: '#fff', padding: '5px 12px', borderRadius: 4, fontWeight: 600, flex: 1 }}>{usd.toFixed(2)}</div>
                            </div>
                          </td>
                          <td />
                        </tr>
                        <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                          <td colSpan={6} style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 600, borderRight: '1px solid #dee2e6' }}>{lang === 'km' ? 'សរុបប្រាក់កម្រៃដឹក (Delivery Fee)' : 'Total Delivery Fee (USD)'}</td>
                          <td colSpan={2} style={{ padding: '8px 12px', borderRight: '1px solid #dee2e6' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontWeight: 600, minWidth: 60, textAlign: 'right' }}>{fee.toFixed(2)}</span>
                              <div style={{ background: '#f59e0b', color: '#fff', padding: '5px 12px', borderRadius: 4, fontWeight: 600, flex: 1 }}>{fee.toFixed(2)}</div>
                            </div>
                          </td>
                          <td />
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Section 2: Failed / Returned Deliveries ── */}
          {(() => {
            const failedOrders = filteredOrders.filter((o: any) => (o.status === 'failed' || o.status === 'returned') && o.driverPaymentStatus === statusFilter);
            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 4, height: 20, background: '#ef4444', borderRadius: 2 }} />
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#ef4444' }}>
                    {lang === 'km' ? '២. ផ្នែកដឹកមិនជោគជ័យ' : '2. Failed Deliveries'}
                  </h3>
                  <span style={{ background: '#fee2e2', color: '#ef4444', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                    {lang === 'km' ? `សរុបកញ្ចប់មិនជោគជ័យ: ${failedOrders.length} កញ្ចប់` : `Total Failed: ${failedOrders.length} parcels`}
                  </span>
                </div>
                <div style={{ border: '1px solid #fca5a5', borderRadius: 4, overflowX: 'auto', background: '#fff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
                    <thead>
                      <tr style={{ background: '#fef2f2', borderBottom: '2px solid #ef4444' }}>
                        <th style={{ padding: '10px 8px', textAlign: 'center', borderRight: '1px solid #fca5a5', width: 40 }}>{lang === 'km' ? 'ល.រ' : 'No.'}</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', borderRight: '1px solid #fca5a5' }}>{lang === 'km' ? 'លេខកូដ' : 'Tracking Code'}</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', borderRight: '1px solid #fca5a5' }}>{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', borderRight: '1px solid #fca5a5' }}>{lang === 'km' ? 'ឈ្មោះហាង' : 'Shop Name'}</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', borderRight: '1px solid #fca5a5' }}>{lang === 'km' ? 'លេខអ្នកទទួល' : 'Receiver Phone'}</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right', borderRight: '1px solid #fca5a5' }}>{lang === 'km' ? 'ប្រាក់បានបញ្ចូល' : 'Collected COD'}</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right', borderRight: '1px solid #fca5a5' }}>{lang === 'km' ? 'ប្រាក់កម្រៃដឹក' : 'Delivery Fee'}</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', borderRight: '1px solid #fca5a5', minWidth: 160 }}>{lang === 'km' ? 'មូលហេតុ (Note)' : 'Reason (Note)'}</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center' }}>{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {failedOrders.length === 0 ? (
                        <tr><td colSpan={9} style={{ textAlign: 'center', padding: '24px 0', color: '#6c757d' }}>{lang === 'km' ? 'គ្មានទិន្នន័យ' : 'No failed orders'}</td></tr>
                      ) : (
                        failedOrders.map((o: any, idx: number) => {
                          const latestNote = o.histories
                            ?.slice()
                            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .find((h: any) => h.note)?.note || o.note || '—';
                          return (
                            <tr key={o.id} style={{ borderBottom: '1px solid #fca5a5', background: idx % 2 === 0 ? '#fff' : '#fff9f9' }}>
                              <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #fca5a5', fontWeight: 600 }}>{idx + 1}</td>
                              <td style={{ padding: '8px', borderRight: '1px solid #fca5a5', color: '#475569' }}>{o.trackingCode}</td>
                              <td style={{ padding: '8px', borderRight: '1px solid #fca5a5' }}>{o.deliveredAt ? formatDateToDDMMYYYY(o.deliveredAt) : (o.updatedAt ? formatDateToDDMMYYYY(o.updatedAt) : '—')}</td>
                              <td style={{ padding: '8px', borderRight: '1px solid #fca5a5', color: '#0d6efd', fontWeight: 600 }}>{o.merchant?.name || '—'}</td>
                              <td style={{ padding: '8px', borderRight: '1px solid #fca5a5' }}>{o.receiverPhone}</td>
                              <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #fca5a5', color: '#6b7280', fontWeight: 600 }}>
                                {o.codCurrency === 'KHR' ? `${parseInt(o.cod).toLocaleString()} ៛` : `$ ${parseFloat(o.cod).toFixed(2)}`}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #fca5a5', color: '#6b7280', fontWeight: 600 }}>
                                $ {parseFloat(o.deliveryFee).toFixed(2)}
                              </td>
                              <td style={{ padding: '8px', borderRight: '1px solid #fca5a5', fontSize: 12, color: '#7c3aed', fontStyle: latestNote === '—' ? 'italic' : 'normal' }}>
                                {latestNote !== '—' ? `📝 ${latestNote}` : '—'}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                {o.status === 'failed' ? (
                                  <span style={{ background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{lang === 'km' ? 'បរាជ័យ' : 'Failed'}</span>
                                ) : (
                                  <span style={{ background: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{lang === 'km' ? 'បង្វិលត្រឡប់' : 'Returned'}</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                      {/* Failed summary row */}
                      {failedOrders.length > 0 && (
                        <tr style={{ background: '#fef2f2', borderTop: '2px solid #ef4444' }}>
                          <td colSpan={9} style={{ padding: '10px 16px', fontWeight: 700, color: '#ef4444', fontSize: 13 }}>
                            📦 {lang === 'km'
                              ? `សរុបកញ្ចប់មិនជោគជ័យ: ${failedOrders.length} កញ្ចប់ (បរាជ័យ: ${failedOrders.filter((o: any) => o.status === 'failed').length} · ត្រឡប់: ${failedOrders.filter((o: any) => o.status === 'returned').length})`
                              : `Total Failed Parcels: ${failedOrders.length} (Failed: ${failedOrders.filter((o: any) => o.status === 'failed').length} · Returned: ${failedOrders.filter((o: any) => o.status === 'returned').length})`}
                          </td>
                        </tr>
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
              
              {/* History Search & Select Driver Filter Bar */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b', paddingLeft: 2 }}>
                    {lang === 'km' ? 'ស្វែងរក' : 'Search'}
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={lang === 'km' ? 'ស្វែងរកលេខយោង សម្គាល់...' : 'Search ref, note, name...'}
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    style={{ width: '240px', height: '38px', padding: '6px 12px' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b', paddingLeft: 2 }}>
                    {lang === 'km' ? 'អ្នកដឹកជញ្ជូន' : 'Delivery Driver'}
                  </span>
                  <select
                    className="form-control"
                    value={historyDriverId}
                    onChange={e => setHistoryDriverId(e.target.value)}
                    style={{ width: '200px', height: '38px', cursor: 'pointer' }}
                  >
                    <option value="">{lang === 'km' ? '-- ទាំងអស់ --' : '-- All --'}</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name} {d.nameKh ? `(${d.nameKh})` : ''}</option>
                    ))}
                  </select>
                </div>

                <button
                  className="btn btn-outline"
                  onClick={() => {
                    setHistorySearch('');
                    setHistoryDriverId('');
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
                      <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'center' }}>ល.រ</th>
                      <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'left' }}>អ្នកដឹកជញ្ជូន</th>
                      <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'left' }}>លេខយោង</th>
                      <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'left' }}>កាលបរិច្ឆេទ</th>
                      <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'right' }}>ទឹកប្រាក់ ($)</th>
                      <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'left' }}>សម្គាល់</th>
                      <th style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'center', width: 120 }}>សកម្មភាព</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyLoading ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px 0' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
                    ) : filteredHistory.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px 0', color: '#64748b' }}>{lang === 'km' ? 'គ្មានទិន្នន័យប្រវត្តិទូទាត់ទេ' : 'No payout settlement history found'}</td></tr>
                    ) : (
                      filteredHistory.map((h, idx) => (
                        <tr key={h.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                          <td style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ padding: '10px 8px', border: '1px solid #dee2e6', fontWeight: 600 }}>{h.driver?.nameKh || h.driver?.name || '—'}</td>
                          <td style={{ padding: '10px 8px', border: '1px solid #dee2e6' }}><code>{h.reference || '—'}</code></td>
                          <td style={{ padding: '10px 8px', border: '1px solid #dee2e6' }}>{formatDateToDDMMYYYY(h.date)}</td>
                          <td style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>${parseFloat(h.amount).toFixed(2)}</td>
                          <td style={{ padding: '10px 8px', border: '1px solid #dee2e6' }}>{h.note || '—'}</td>
                          <td style={{ padding: '10px 8px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                              <button 
                                onClick={() => handleEditPayment(h)}
                                style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                              >
                                <MdEdit size={14} /> {lang === 'km' ? 'កែប្រែ' : 'Edit'}
                              </button>
                              <button 
                                onClick={() => handleDeletePayment(h.id)}
                                style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                              >
                                <MdDelete size={14} /> {lang === 'km' ? 'បង្វិល' : 'Reverse'}
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





      {/* Printable Invoice List Table — outside app-layout (Print-only) */}
      <div className="receipt-print-container" style={{ fontFamily: "'Kantumruy Pro', sans-serif", fontSize: 11 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, color: '#3b82f6' }}>{lang === 'km' ? 'អ៊ី អ៊ិចប្រេស' : 'E-Express'}</h2>
          <p style={{ margin: 0, fontSize: 16, color: '#94a3b8' }}>E-Express</p>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 10 }}>
          <div>
            <div><strong>{lang === 'km' ? 'ឈ្មោះអ្នកដឹកជញ្ជូន :' : 'Driver Name :'}</strong> {selectedDriver ? `${selectedDriver.name} ${selectedDriver.nameKh ? `(${selectedDriver.nameKh})` : ''}` : (lang === 'km' ? 'ទាំងអស់' : 'All')}</div>
            <div><strong>{lang === 'km' ? 'លេខទូរស័ព្ទ :' : 'Phone Number :'}</strong> {selectedDriver?.phone || '—'}</div>
            <div><strong>{lang === 'km' ? 'កាលបរិច្ឆេទបោះពុម្ព :' : 'Print Date :'}</strong> {new Date().toLocaleString(lang === 'km' ? 'kh-KH' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 'bold' }}>{lang === 'km' ? 'វិក្កយបត្រ (សំរាប់អ្នកដឹក)' : 'Invoice (For Driver)'}</div>
            <div><strong>{lang === 'km' ? 'លេខ :' : 'No. :'}</strong> INV_DRIVER_{getLocalDateString().replace(/-/g, '')}</div>
            <div><strong>{lang === 'km' ? 'កាលបរិច្ឆេទ :' : 'Date :'}</strong> {formatDateToDDMMYYYY(getLocalDateString())}</div>
            <div><strong>{lang === 'km' ? 'អ្នកបោះពុម្ព :' : 'Printed By :'}</strong> {user?.name || 'Admin'}</div>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', textAlign: 'center', fontSize: 10 }}>
          <thead>
            <tr style={{ background: '#a7f3d0' }}>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: 4 }}>{lang === 'km' ? 'ល.រ' : 'No'}</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: 4 }}>{lang === 'km' ? 'លេខកូដវិក្កយបត្រ' : 'Bill Invoice'}</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: 4 }}>{lang === 'km' ? 'អតិថិជន' : 'Merchant'}</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: 4 }}>{lang === 'km' ? 'តំបន់' : 'Zone'}</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: 4 }}>{lang === 'km' ? 'លេខទូរស័ព្ទ' : 'Phone'}</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: 4 }}>{lang === 'km' ? 'ទទួលអីវ៉ាន់' : 'Collected'}</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: 4 }}>{lang === 'km' ? 'ចេញអីវ៉ាន់' : 'Delivered'}</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: 4 }}>{lang === 'km' ? 'ប្រភេទបង់លុយ' : 'Payment Type'}</th>
              <th colSpan={2} style={{ border: '1px solid #000', padding: 4 }}>COD</th>
              <th colSpan={2} style={{ border: '1px solid #000', padding: 4 }}>QR {lang === 'km' ? 'ហាង' : 'Shop'}</th>
              <th colSpan={2} style={{ border: '1px solid #000', padding: 4 }}>QR {lang === 'km' ? 'ក្រុមហ៊ុន' : 'Company'}</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: 4 }}>{lang === 'km' ? 'សេវាដឹក(USD)' : 'Delivery Fee (USD)'}</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: 4 }}>{lang === 'km' ? 'ទឹកប្រាក់សរុប (USD)' : 'Total Amount (USD)'}</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: 4 }}>{lang === 'km' ? 'ទឹកប្រាក់សរុប (KHR)' : 'Total Amount (KHR)'}</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: 4 }}>Remark</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: 4 }}>{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
            </tr>
            <tr style={{ background: '#a7f3d0' }}>
              <th style={{ border: '1px solid #000', padding: 4 }}>USD ($)</th>
              <th style={{ border: '1px solid #000', padding: 4 }}>KHR (៛)</th>
              <th style={{ border: '1px solid #000', padding: 4 }}>USD ($)</th>
              <th style={{ border: '1px solid #000', padding: 4 }}>KHR (៛)</th>
              <th style={{ border: '1px solid #000', padding: 4 }}>USD ($)</th>
              <th style={{ border: '1px solid #000', padding: 4 }}>KHR (៛)</th>
            </tr>
          </thead>
          <tbody>
            {printOrders.length === 0 ? (
              <tr><td colSpan={17} style={{ padding: 10 }}>{lang === 'km' ? 'គ្មានទិន្នន័យ' : 'No data available'}</td></tr>
            ) : (
              printOrders.map((o, idx) => {
                const isCOD = o.paymentMethod === 'cod' || !o.paymentMethod;
                const isQR = o.paymentMethod === 'qr';
                const codUSD = o.codCurrency === 'USD' && isCOD ? parseFloat(o.cod || '0') : 0;
                const codKHR = o.codCurrency === 'KHR' && isCOD ? parseFloat(o.cod || '0') : 0;
                const qrShopUSD = o.codCurrency === 'USD' && isQR ? parseFloat(o.cod || '0') : 0;
                const qrShopKHR = o.codCurrency === 'KHR' && isQR ? parseFloat(o.cod || '0') : 0;
                const fee = parseFloat(o.deliveryFee || '0');
                const totalUSD = codUSD + qrShopUSD;
                const totalKHR = codKHR + qrShopKHR;

                return (
                  <tr key={o.id}>
                    <td style={{ border: '1px solid #000', padding: 4 }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #000', padding: 4 }}>{o.trackingCode}</td>
                    <td style={{ border: '1px solid #000', padding: 4 }}>{o.merchant?.name || '—'}</td>
                    <td style={{ border: '1px solid #000', padding: 4 }}>{o.zone?.name || '—'}</td>
                    <td style={{ border: '1px solid #000', padding: 4 }}>{o.receiverPhone}</td>
                    <td style={{ border: '1px solid #000', padding: 4 }}>{o.createdAt ? formatDateToDDMMYYYY(o.createdAt) : '—'}</td>
                    <td style={{ border: '1px solid #000', padding: 4 }}>{o.deliveredAt ? formatDateToDDMMYYYY(o.deliveredAt) : '—'}</td>
                    <td style={{ border: '1px solid #000', padding: 4 }}>{isCOD ? 'COD' : (lang === 'km' ? 'QR + សាច់ប្រាក់' : 'QR + Cash')}</td>
                    <td style={{ border: '1px solid #000', padding: 4, color: codUSD ? 'inherit' : '#9ca3af' }}>{codUSD ? `$${codUSD.toFixed(2)}` : '-'}</td>
                    <td style={{ border: '1px solid #000', padding: 4, color: codKHR ? 'inherit' : '#9ca3af' }}>{codKHR ? `៛${codKHR.toLocaleString()}` : '-'}</td>
                    <td style={{ border: '1px solid #000', padding: 4, color: qrShopUSD ? 'inherit' : '#9ca3af' }}>{qrShopUSD ? `$${qrShopUSD.toFixed(2)}` : '-'}</td>
                    <td style={{ border: '1px solid #000', padding: 4, color: qrShopKHR ? 'inherit' : '#9ca3af' }}>{qrShopKHR ? `៛${qrShopKHR.toLocaleString()}` : '-'}</td>
                    <td style={{ border: '1px solid #000', padding: 4, color: '#9ca3af' }}>-</td>
                    <td style={{ border: '1px solid #000', padding: 4, color: '#9ca3af' }}>-</td>
                    <td style={{ border: '1px solid #000', padding: 4 }}>${fee.toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', padding: 4 }}>${totalUSD.toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', padding: 4 }}>{totalKHR ? `៛${totalKHR.toLocaleString()}` : '៛0'}</td>
                    <td style={{ border: '1px solid #000', padding: 4 }}>{o.note || ''}</td>
                    <td style={{ border: '1px solid #000', padding: 4, color: o.status === 'delivered' ? '#16a34a' : o.status === 'returned' ? '#f59e0b' : o.status === 'failed' ? '#ef4444' : '#64748b' }}>
                      {o.status === 'delivered' ? (lang === 'km' ? 'ជោគជ័យ' : 'Delivered') : o.status === 'returned' ? (lang === 'km' ? 'បង្វិលត្រឡប់' : 'Returned') : o.status === 'failed' ? (lang === 'km' ? 'បរាជ័យ' : 'Failed') : (lang === 'km' ? 'កំពុងដឹក' : 'In Transit')}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {printOrders.length > 0 && (
            <tfoot>
              <tr style={{ background: '#e2e8f0', fontWeight: 'bold' }}>
                <td colSpan={8} style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>{lang === 'km' ? 'សរុប' : 'Total'}</td>
                <td style={{ border: '1px solid #000', padding: 4 }}>${printOrders.reduce((sum, o) => sum + (o.codCurrency === 'USD' && (o.paymentMethod === 'cod' || !o.paymentMethod) ? parseFloat(o.cod||'0') : 0), 0).toFixed(2)}</td>
                <td style={{ border: '1px solid #000', padding: 4 }}>៛{printOrders.reduce((sum, o) => sum + (o.codCurrency === 'KHR' && (o.paymentMethod === 'cod' || !o.paymentMethod) ? parseFloat(o.cod||'0') : 0), 0).toLocaleString()}</td>
                <td style={{ border: '1px solid #000', padding: 4 }}>${printOrders.reduce((sum, o) => sum + (o.codCurrency === 'USD' && o.paymentMethod === 'qr' ? parseFloat(o.cod||'0') : 0), 0).toFixed(2)}</td>
                <td style={{ border: '1px solid #000', padding: 4 }}>៛{printOrders.reduce((sum, o) => sum + (o.codCurrency === 'KHR' && o.paymentMethod === 'qr' ? parseFloat(o.cod||'0') : 0), 0).toLocaleString()}</td>
                <td style={{ border: '1px solid #000', padding: 4 }}>$0.00</td>
                <td style={{ border: '1px solid #000', padding: 4 }}>៛0</td>
                <td style={{ border: '1px solid #000', padding: 4 }}>${printTotalFee.toFixed(2)}</td>
                <td style={{ border: '1px solid #000', padding: 4 }}>${printCodUsd.toFixed(2)}</td>
                <td style={{ border: '1px solid #000', padding: 4 }}>៛{printCodKhr.toLocaleString()}</td>
                <td colSpan={2} style={{ border: '1px solid #000', padding: 4 }}></td>
              </tr>
              <tr style={{ background: '#e2e8f0', fontWeight: 'bold' }}>
                <td colSpan={15} style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>{lang === 'km' ? 'ប្រាក់ដែលត្រូវទូទាត់សរុប' : 'Total Net Payable Amount'}</td>
                <td style={{ border: '1px solid #000', padding: 4 }}>${printCodUsd.toFixed(2)}</td>
                <td style={{ border: '1px solid #000', padding: 4 }}>៛{printCodKhr.toLocaleString()}</td>
                <td colSpan={2} style={{ border: '1px solid #000', padding: 4 }}></td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* ── Print Section 2: Failed / Returned ── */}
        {printFailedOrders.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: 13, color: '#dc2626', borderBottom: '2px solid #dc2626', paddingBottom: 4 }}>
              {lang === 'km' ? '២. ផ្នែកដឹកមិនជោគជ័យ' : '2. Failed / Returned Deliveries'}
              &nbsp;—&nbsp;
              <span style={{ fontWeight: 400 }}>
                {lang === 'km'
                  ? `សរុបកញ្ចប់មិនជោគជ័យ: ${printFailedOrders.length} កញ្ចប់ (បរាជ័យ: ${printFailedOrders.filter((o: any) => o.status === 'failed').length} · ត្រឡប់: ${printFailedOrders.filter((o: any) => o.status === 'returned').length})`
                  : `Total: ${printFailedOrders.length} parcels (Failed: ${printFailedOrders.filter((o: any) => o.status === 'failed').length} · Returned: ${printFailedOrders.filter((o: any) => o.status === 'returned').length})`}
              </span>
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', textAlign: 'center', fontSize: 10 }}>
              <thead>
                <tr style={{ background: '#fecaca' }}>
                  <th style={{ border: '1px solid #000', padding: 4 }}>{lang === 'km' ? 'ល.រ' : 'No'}</th>
                  <th style={{ border: '1px solid #000', padding: 4 }}>{lang === 'km' ? 'លេខកូដ' : 'Bill Invoice'}</th>
                  <th style={{ border: '1px solid #000', padding: 4 }}>{lang === 'km' ? 'ហាង' : 'Shop'}</th>
                  <th style={{ border: '1px solid #000', padding: 4 }}>{lang === 'km' ? 'តំបន់' : 'Zone'}</th>
                  <th style={{ border: '1px solid #000', padding: 4 }}>{lang === 'km' ? 'លេខទូរស័ព្ទ' : 'Phone'}</th>
                  <th style={{ border: '1px solid #000', padding: 4 }}>{lang === 'km' ? 'ថ្ងៃបង្កើត' : 'Date'}</th>
                  <th style={{ border: '1px solid #000', padding: 4 }}>COD</th>
                  <th style={{ border: '1px solid #000', padding: 4, minWidth: 160 }}>{lang === 'km' ? 'មូលហេតុ (Note)' : 'Reason (Note)'}</th>
                  <th style={{ border: '1px solid #000', padding: 4 }}>{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {printFailedOrders.map((o: any, idx: number) => {
                  const latestNote = o.histories
                    ?.slice()
                    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .find((h: any) => h.note)?.note || o.note || '—';
                  return (
                    <tr key={o.id}>
                      <td style={{ border: '1px solid #000', padding: 4 }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #000', padding: 4 }}>{o.trackingCode}</td>
                      <td style={{ border: '1px solid #000', padding: 4 }}>{o.merchant?.name || '—'}</td>
                      <td style={{ border: '1px solid #000', padding: 4 }}>{o.zone?.name || '—'}</td>
                      <td style={{ border: '1px solid #000', padding: 4 }}>{o.receiverPhone}</td>
                      <td style={{ border: '1px solid #000', padding: 4 }}>{o.createdAt ? formatDateToDDMMYYYY(o.createdAt) : '—'}</td>
                      <td style={{ border: '1px solid #000', padding: 4 }}>
                        {o.codCurrency === 'USD' ? `$${parseFloat(o.cod||'0').toFixed(2)}` : `៛${parseFloat(o.cod||'0').toLocaleString()}`}
                      </td>
                      <td style={{ border: '1px solid #000', padding: 4, textAlign: 'left', color: '#7c3aed' }}>{latestNote}</td>
                      <td style={{ border: '1px solid #000', padding: 4, color: o.status === 'failed' ? '#dc2626' : '#d97706', fontWeight: 'bold' }}>
                        {o.status === 'failed'
                          ? (lang === 'km' ? 'បរាជ័យ' : 'Failed')
                          : (lang === 'km' ? 'បង្វិលត្រឡប់' : 'Returned')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#fee2e2', fontWeight: 'bold' }}>
                  <td colSpan={9} style={{ border: '1px solid #000', padding: 6, textAlign: 'left', color: '#dc2626' }}>
                    📦 {lang === 'km'
                      ? `សរុបកញ្ចប់មិនជោគជ័យ: ${printFailedOrders.length} កញ្ចប់`
                      : `Total Failed Parcels: ${printFailedOrders.length}`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
