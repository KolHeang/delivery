'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { MdPrint, MdSearch, MdClose, MdBookmark } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';
import Modal from '@/components/ui/Modal';
import DateInput, { getLocalDateString, formatDateToDDMMYYYY } from '@/components/ui/DateInput';

const getLocalFirstDayOfMonthString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

const formatCOD = (cod: any, currency: string) => {
  if (currency === 'KHR') return `${parseInt(cod).toLocaleString()} ៛`;
  return `$${parseFloat(cod).toFixed(2)}`;
};

const getStatusLabel = (status: string, lang: string) => {
  switch (status) {
    case 'pending':
      return <span style={{ background: '#78716c', color: '#fff', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 'bold' }}>{lang === 'km' ? 'បញ្ចូលចុង' : 'Pending'}</span>;
    case 'assigned':
      return <span style={{ background: '#3b82f6', color: '#fff', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 'bold' }}>{lang === 'km' ? 'ចាត់តាំងរួច' : 'Assigned'}</span>;
    case 'picked-up':
      return <span style={{ background: '#8b5cf6', color: '#fff', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 'bold' }}>{lang === 'km' ? 'បានទទួល' : 'Picked Up'}</span>;
    case 'in-transit':
      return <span style={{ background: '#0d9488', color: '#fff', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 'bold' }}>{lang === 'km' ? 'កំពុងដំណើរការដឹក' : 'In Transit'}</span>;
    case 'delivered':
      return <span style={{ background: '#10b981', color: '#fff', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 'bold' }}>{lang === 'km' ? 'ដឹកជោគជ័យ' : 'Delivered'}</span>;
    case 'failed':
      return <span style={{ background: '#ef4444', color: '#fff', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 'bold' }}>{lang === 'km' ? 'មិនជោគជ័យ' : 'Failed'}</span>;
    case 'returned':
      return <span style={{ background: '#6b7280', color: '#fff', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 'bold' }}>{lang === 'km' ? 'បង្វិលត្រឡប់' : 'Returned'}</span>;
    default:
      return <span style={{ background: '#6b7280', color: '#fff', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 'bold' }}>{status}</span>;
  }
};

const getDriverLabel = (driver: any, lang: string) => {
  if (!driver) {
    return <span style={{ background: '#0284c7', color: '#fff', padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 'bold' }}>{lang === 'km' ? 'មិនទាន់ធ្វើការ assign អ្នកដឹក' : 'Driver not assigned'}</span>;
  }
  return <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{lang === 'km' && driver.nameKh ? driver.nameKh : driver.name}</span>;
};

export default function PrintInvoicePage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const [merchants, setMerchants] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [merchantFilter, setMerchantFilter] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  const [startDate, setStartDate] = useState(() => getLocalDateString());
  const [endDate, setEndDate] = useState(() => getLocalDateString());
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const { lang, t } = useLanguage();
  const [isDirectMode, setIsDirectMode] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    Promise.all([
      api.get('/orders'),
      api.get('/merchants'),
      api.get('/drivers')
    ])
      .then(([oRes, mRes, dRes]) => {
        const orderData = oRes.data || [];
        setOrders(orderData);
        setMerchants(mRes.data || []);
        setDrivers(dRes.data || []);
        
        // Pre-select single ID or comma-separated list of IDs from query parameter if provided
        const params = new URLSearchParams(window.location.search);
        const singleId = params.get('id');
        if (singleId) {
          setIsDirectMode(true);
          if (singleId.includes(',')) {
            const parsedIds = singleId.split(',').map(x => parseInt(x)).filter(x => !isNaN(x));
            setSelectedIds(parsedIds);
            const matchedOrders = orderData.filter((o: any) => parsedIds.includes(o.id));
            setOrders(matchedOrders);
          } else {
            const parsedId = parseInt(singleId);
            setSelectedIds([parsedId]);
            const matchedOrder = orderData.find((o: any) => o.id === parsedId);
            if (matchedOrder) {
              setSearch(matchedOrder.trackingCode || '');
            }
            setOrders(orderData);
          }
        } else {
          // select all by default
          setSelectedIds(orderData.map((o: any) => o.id));
          setOrders(orderData);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    let list = orders;
    if (statusFilter !== 'all') list = list.filter(o => o.status === statusFilter);
    if (driverFilter) list = list.filter(o => o.driverId === parseInt(driverFilter));
    if (merchantFilter) list = list.filter(o => o.merchantId === parseInt(merchantFilter));
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      list = list.filter(o => new Date(o.createdAt) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      list = list.filter(o => new Date(o.createdAt) <= end);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.trackingCode?.toLowerCase().includes(q) ||
        o.receiverName?.toLowerCase().includes(q) ||
        o.receiverPhone?.includes(q) ||
        o.merchant?.name?.toLowerCase().includes(q) ||
        o.merchant?.nameKh?.toLowerCase().includes(q) ||
        o.driver?.name?.toLowerCase().includes(q) ||
        o.driver?.nameKh?.toLowerCase().includes(q)
      );
    }
    setFilteredOrders(list);
  }, [orders, search, statusFilter, driverFilter, merchantFilter, startDate, endDate]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const allFilteredSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedIds.includes(o.id));

  const toggleAll = () => {
    const filteredIds = filteredOrders.map(o => o.id);
    if (allFilteredSelected) {
      // Deselect all filtered
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      // Select all filtered
      setSelectedIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handlePrint = async () => {
    try {
      await api.post('/invoices', { orderIds: selectedIds });
    } catch (err) {
      console.error('Failed to save printed invoices:', err);
    }
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (loading) return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="loading-wrapper"><div className="spinner" /></div>
      </div>
    </div>
  );

  const selectedOrders = filteredOrders.filter(o => selectedIds.includes(o.id));

  return (
    <div className="app-layout">
      {/* Hide Sidebar & Topbar during print, and conditionally on screen if in direct preview */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media screen {
          .no-print {
            display: flex !important;
          }
          ${isDirectMode ? `
            .sidebar, .topbar, .filter-section, .table-container, .select-all-bar {
              display: none !important;
            }
            .main-content {
              margin-left: 0 !important;
            }
            .print-only-container {
              display: block !important;
            }
          ` : `
            .print-only-container {
              display: none !important;
            }
          `}
        }
        @media print {
          .no-print {
            display: none !important;
          }
          .sidebar, .topbar, .filter-section, .table-container, .select-all-bar {
            display: none !important;
          }
          .main-content {
            margin-left: 0 !important;
          }
          body, .page-content {
            background: #fff !important;
            padding: 0 !important;
          }
          .print-only-container {
            display: block !important;
          }
          .invoice-card {
            break-inside: avoid !important;
            border: 1.5px solid #000 !important;
            box-shadow: none !important;
            margin-bottom: 20px !important;
          }
        }
      `}} />

      <Sidebar />
      <div className="main-content">
        {isDirectMode ? (
          <div className="no-print" style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 16, 
            padding: '16px 24px', 
            background: '#fff',
            borderBottom: '1px solid #e2e8f0',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <button 
              className="btn btn-success" 
              onClick={handlePrint}
              style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <MdPrint size={18} /> {lang === 'km' ? 'បោះពុម្ពវិក្កយបត្រ' : 'Print Invoice'}
            </button>
            <button 
              className="btn btn-outline" 
              onClick={() => router.push('/delivery')}
              style={{ fontWeight: 'bold' }}
            >
              {lang === 'km' ? 'ត្រឡប់ក្រោយ' : 'Go Back'}
            </button>
          </div>
        ) : (
          <Topbar title="" subtitle="" />
        )}
        <div className="page-content">
          
          <div className="card filter-section" style={{ marginBottom: 20, padding: '16px 20px', background: '#f8fafc' }}>
            {/* Row 1: dropdowns + dates */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>

              {/* Driver Filter */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 6, display: 'block', color: '#1e293b' }}>{lang === 'km' ? 'អ្នកដឹក' : 'Driver'}</label>
                <select className="form-control" value={driverFilter} onChange={e => setDriverFilter(e.target.value)} style={{ background: '#fff', border: '1px solid #cbd5e1' }}>
                  <option value="">{lang === 'km' ? '-- ទាំងអស់ --' : '-- All --'}</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.nameKh || d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Shop Filter */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 6, display: 'block', color: '#1e293b' }}>{lang === 'km' ? 'ហាង' : 'Shop'}</label>
                <select className="form-control" value={merchantFilter} onChange={e => setMerchantFilter(e.target.value)} style={{ background: '#fff', border: '1px solid #cbd5e1' }}>
                  <option value="">{lang === 'km' ? '-- ទាំងអស់ --' : '-- All --'}</option>
                  {merchants.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nameKh ? `${m.nameKh} (${m.name})` : m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <DateInput
                labelEn="Start Date"
                labelKh="ចាប់ផ្តើម"
                value={startDate}
                onChange={setStartDate}
              />

              {/* End Date */}
              <DateInput
                labelEn="End Date"
                labelKh="បញ្ចប់"
                value={endDate}
                onChange={setEndDate}
              />

            </div>

            {/* Row 2: buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>

              {/* Print Button */}
              <button 
                onClick={handlePrint}
                disabled={selectedOrders.length === 0}
                className="btn" 
                style={{ 
                  background: 'var(--accent)',
                  color: '#fff', 
                  height: 38, 
                  padding: '0 20px', 
                  borderRadius: 4, 
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: selectedOrders.length === 0 ? 'not-allowed' : 'pointer',
                  border: 'none'
                }}
              >
                <MdPrint size={18} /> {lang === 'km' ? `បោះពុម្ពដែលបានជ្រើសរើស (${selectedOrders.length})` : `Print Selected (${selectedOrders.length})`}
              </button>

            </div>
          </div>


          {/* Select All Checkbox Bar */}
          <div className="select-all-bar" style={{ 
            background: '#eeeeee', 
            padding: '12px 20px', 
            borderRadius: 4, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10,
            marginBottom: 20
          }}>
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleAll}
              style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 'bold', fontSize: 13, color: '#334155' }}>{lang === 'km' ? 'ទាំងអស់' : 'All'}</span>
          </div>

          {/* Orders Table */}
          <div className="card table-container" style={{ padding: '0px', overflowX: 'auto', border: '1px solid #dee2e6', marginBottom: 30 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 1000 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 'bold', borderRight: '1px solid #dee2e6', width: 50 }}>{lang === 'km' ? 'ល.រ' : 'No.'}</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 'bold', borderRight: '1px solid #dee2e6', width: 80 }}>{lang === 'km' ? 'ជ្រើសរើស' : 'Select'}</th>
                  <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 'bold', borderRight: '1px solid #dee2e6' }}>{lang === 'km' ? 'លេខបញ្ជូន' : 'Delivery Number'}</th>
                  <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 'bold', borderRight: '1px solid #dee2e6' }}>{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                  <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 'bold', borderRight: '1px solid #dee2e6' }}>{lang === 'km' ? 'ឈ្មោះហាង' : 'Shop Name'}</th>
                  {/* <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 'bold', borderRight: '1px solid #dee2e6' }}>{lang === 'km' ? 'ឈ្មោះអតិថិជន' : 'Customer Name'}</th> */}
                  <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 'bold', borderRight: '1px solid #dee2e6' }}>{lang === 'km' ? 'អាសយដ្ឋាន' : 'Address'}</th>
                  <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 'bold', borderRight: '1px solid #dee2e6' }}>{lang === 'km' ? 'លេខអ្នកទទួល' : 'Receiver Phone'}</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 'bold', borderRight: '1px solid #dee2e6' }}>{lang === 'km' ? 'ចំនួនប្រាក់' : 'Amount'}</th>
                  <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 'bold', borderRight: '1px solid #dee2e6' }}>{lang === 'km' ? 'ដឹកដោយ' : 'Driver'}</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 'bold' }}>{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '30px 0', color: '#64748b' }}>{lang === 'km' ? 'គ្មានទិន្នន័យ' : 'No Data'}</td>
                  </tr>
                ) : (
                  filteredOrders.map((o, idx) => (
                    <tr key={o.id} style={{ borderBottom: '1px solid #dee2e6', background: selectedIds.includes(o.id) ? '#f1f5f9' : '#fff' }}>
                      <td style={{ padding: '12px 10px', textAlign: 'center', borderRight: '1px solid #dee2e6', color: '#64748b', fontWeight: 'bold' }}>{idx + 1}</td>
                      <td style={{ padding: '12px 10px', textAlign: 'center', borderRight: '1px solid #dee2e6' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(o.id)}
                          onChange={() => toggleSelect(o.id)}
                          style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '12px 10px', borderRight: '1px solid #dee2e6', fontWeight: '500' }}>{o.trackingCode}</td>
                      <td style={{ padding: '12px 10px', borderRight: '1px solid #dee2e6' }}>
                        {o.createdAt ? formatDateToDDMMYYYY(o.createdAt) : '—'}
                      </td>
                      <td style={{ padding: '12px 10px', borderRight: '1px solid #dee2e6', fontWeight: 600 }}>{o.merchant?.nameKh || o.merchant?.name || o.senderName}</td>
                      {/* <td style={{ padding: '12px 10px', borderRight: '1px solid #dee2e6' }}>{o.receiverName || '—'}</td> */}
                      <td style={{ padding: '12px 10px', borderRight: '1px solid #dee2e6' }}>{o.receiverAddress || '—'}</td>
                      <td style={{ padding: '12px 10px', borderRight: '1px solid #dee2e6' }}>{o.receiverPhone}</td>
                      <td style={{ padding: '12px 10px', textAlign: 'right', borderRight: '1px solid #dee2e6', fontWeight: 'bold', color: '#dc2626' }}>
                        {parseFloat(o.cod).toFixed(2)} ({o.codCurrency || 'USD'})
                      </td>
                      <td style={{ padding: '12px 10px', borderRight: '1px solid #dee2e6' }}>
                        {getDriverLabel(o.driver, lang)}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        {getStatusLabel(o.status, lang)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* Printable Previews (hidden on screen, visible on print) */}
      <div className="print-only-container">
        {selectedOrders.map(o => (
          <div
            key={o.id}
            className="invoice-card"
            style={{
              padding: '16px 20px',
              border: '1.5px solid #000',
              borderRadius: 0,
              background: '#fff',
              maxWidth: 480,
              margin: '0 auto 24px',
              width: '100%',
              color: '#000',
              fontFamily: "'Kantumruy Pro', sans-serif",
              boxShadow: 'none',
            }}
          >
            {/* Logo and QR Code header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'linear-gradient(135deg, #2563eb, #6366f1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 16,
                    flexShrink: 0,
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}>
                    📦
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#1e3a8a', letterSpacing: '0.5px', lineHeight: 1.1, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      EBS<span style={{ color: '#2563eb' }}>Express</span>
                    </span>
                    <span style={{ fontSize: 8, color: '#4b5563', marginTop: 1, letterSpacing: '0.2px' }}>
                      Delivery System
                    </span>
                  </div>
                </div>
              </div>
              {/* Real QR Code using api.qrserver.com */}
              <div style={{ textAlign: 'center' }}>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${o.trackingCode}`} 
                  alt="QR Code" 
                  style={{ width: 65, height: 65 }} 
                />
              </div>
            </div>

            {/* Invoice Title */}
            <div style={{ textAlign: 'center', margin: '10px 0 5px' }}>
              <h2 style={{ fontSize: 18, fontWeight: 'bold', margin: 0, letterSpacing: '0.5px', color: '#000' }}>
                {lang === 'km' ? 'វិក្កយបត្រ' : 'INVOICE'} : {o.trackingCode}
              </h2>
            </div>

            {/* Horizontal Separator */}
            <hr style={{ border: 'none', borderTop: '2px solid #000', margin: '4px 0 0 0' }} />

            {/* Shop Details Header Row */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '6px 4px', 
              borderBottom: '1.5px solid #000', 
              fontWeight: 'bold', 
              fontSize: 12 
            }}>
              <div>
                {lang === 'km' ? 'ឈ្មោះហាង' : 'Shop Name'} : <span style={{ textTransform: 'uppercase' }}>{o.merchant?.nameKh || o.merchant?.name || o.senderName || '—'}</span>
              </div>
              <div>
                📞 {o.senderPhone || o.merchant?.phone || '—'}
              </div>
            </div>

            {/* Main Grid: Left vs Right */}
            <div style={{ display: 'flex', fontSize: 11, borderBottom: '1.5px solid #000', minHeight: 70 }}>
              {/* Left Side */}
              <div style={{ flex: 1.2, padding: '8px 4px', borderRight: '1.5px solid #000', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div>
                  <strong>{lang === 'km' ? 'លេខអ្នកទទួល' : 'Receiver Phone'} :</strong> {o.receiverPhone}
                </div>
                <div>
                  <strong>{lang === 'km' ? 'អាសយដ្ឋានអ្នកទទួល' : 'Receive Address'} :</strong> {o.receiverAddress || '—'}
                </div>
              </div>

              {/* Right Side */}
              <div style={{ flex: 0.8, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{lang === 'km' ? 'តម្លៃវ៉ាន់' : 'COD'} :</span>
                  <span style={{ fontWeight: 'bold' }}>{formatCOD(o.cod, o.codCurrency || 'USD')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'} :</span>
                  <span>{o.createdAt ? formatDateToDDMMYYYY(o.createdAt) : ''}</span>
                </div>
              </div>
            </div>

            {/* Bottom Footer Box */}
            <div style={{ 
              border: '1.5px solid #000', 
              margin: '12px 0 4px', 
              padding: '8px 12px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              fontSize: 10,
              lineHeight: 1.4
            }}>
              <div style={{ fontWeight: 'bold', flex: 1, paddingRight: 10, color: '#4b5563' }}>
                {lang === 'km' ? 'ក្រុមហ៊ុនមិនទទួលបញ្ញើដែលច្បាប់ហាមឃាត់' : 'Company does not accept contraband goods'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 'bold' }}>{lang === 'km' ? 'តម្លៃសរុប' : 'Total'} :</span>
                <div style={{ 
                  background: '#f1f5f9', 
                  padding: '4px 10px', 
                  borderRadius: 4, 
                  fontWeight: 'bold', 
                  fontSize: 13, 
                  color: '#000', 
                  border: '1px solid #000', 
                  WebkitPrintColorAdjust: 'exact', 
                  printColorAdjust: 'exact' 
                }}>
                  {formatCOD(o.cod, o.codCurrency || 'USD')}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>



    </div>
  );
}
