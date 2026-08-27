'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { MdPrint, MdArrowBack, MdPhone, MdInventory } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';
import DateInput, { getLocalDateString, formatDateToDDMMYYYY } from '@/components/ui/DateInput';

const formatCOD = (cod: any, currency: string) => {
  if (currency === 'KHR') return `${parseInt(cod || 0).toLocaleString()} ៛`;
  return `$${parseFloat(cod || 0).toFixed(2)}`;
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
  const { lang } = useLanguage();
  const [isDirectMode, setIsDirectMode] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    Promise.all([
      api.get('/parcels'),
      api.get('/merchants'),
      api.get('/drivers')
    ])
      .then(([oRes, mRes, dRes]) => {
        const orderData = oRes.data || [];
        setOrders(orderData);
        setMerchants(mRes.data || []);
        setDrivers(dRes.data || []);
        
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
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handlePrint = async () => {
    try {
      await api.post('/invoices', { parcelIds: selectedIds });
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
    <div className="app-layout" style={{ display: 'block', minHeight: '100vh', background: '#f1f5f9' }}>
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
              width: 100% !important;
              min-height: 100vh;
              background: #f1f5f9 !important;
            }
            .print-only-container {
              display: grid !important;
              grid-template-columns: 1fr !important;
              justify-content: center !important;
              gap: 24px !important;
              padding: 30px 20px 60px !important;
              width: 100% !important;
              max-width: ${selectedOrders.length > 1 ? '1040px' : '520px'} !important;
              margin: 0 auto !important;
            }
            @media (min-width: 1024px) {
              .print-only-container {
                grid-template-columns: ${selectedOrders.length > 1 ? 'repeat(2, minmax(0, 480px))' : '1fr'} !important;
              }
            }
          ` : `
            .print-only-container {
              display: none !important;
            }
          `}
        }
        @page {
          size: auto;
          margin: 0mm;
        }
        @media print {
          @page {
            size: auto;
            margin: 0mm;
          }
          .no-print {
            display: none !important;
          }
          .sidebar, .topbar, .filter-section, .table-container, .select-all-bar {
            display: none !important;
          }
          .main-content {
            margin-left: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            background: #fff !important;
          }
          body, .page-content, .app-layout {
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-only-container {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .invoice-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            page-break-after: always !important;
            border: 2px solid #000 !important;
            box-shadow: none !important;
            margin: 0 auto 20px !important;
          }
        }
      `}} />

      {!isDirectMode && <Sidebar />}
      <div className="main-content" style={isDirectMode ? { marginLeft: 0, width: '100%', background: '#f1f5f9' } : {}}>
        
        {/* Direct Mode Header Toolbar */}
        {isDirectMode ? (
          <header className="no-print" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '14px 28px', 
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)'
          }}>
            {/* Left Button */}
            <button 
              className="btn btn-outline" 
              onClick={() => router.push('/delivery')}
              style={{ 
                fontWeight: 600, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6, 
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                color: '#475569',
                borderColor: '#cbd5e1',
                background: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <MdArrowBack size={18} /> {lang === 'km' ? 'ត្រឡប់ក្រោយ' : 'Go Back'}
            </button>

            {/* Center Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                {lang === 'km' ? 'គំរូវិក្កយបត្រ (Invoice Preview)' : 'Invoice Preview'}
              </span>
              <span style={{ 
                background: '#e0e7ff', 
                color: '#3730a3', 
                fontSize: 12, 
                fontWeight: 700, 
                padding: '3px 10px', 
                borderRadius: 20 
              }}>
                {selectedOrders.length} {lang === 'km' ? 'កញ្ចប់' : 'Parcels'}
              </span>
            </div>

            {/* Right Action */}
            <button 
              className="btn" 
              onClick={handlePrint}
              style={{ 
                fontWeight: 700, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                padding: '9px 22px',
                borderRadius: 8,
                fontSize: 14,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                transition: 'all 0.2s'
              }}
            >
              <MdPrint size={20} /> {lang === 'km' ? 'បោះពុម្ពវិក្កយបត្រ' : 'Print Invoice'}
            </button>
          </header>
        ) : (
          <Topbar 
            title={lang === 'km' ? 'បោះពុម្ពវិក្កយបត្រ' : 'Print Invoice Delivery'} 
            subtitle={lang === 'km' ? 'បោះពុម្ពស្លាកវិក្កយបត្រ និង QR Code សម្រាប់បិទលើកញ្ចប់ទំនិញ' : 'Print delivery invoice and QR code parcel labels'} 
          />
        )}

        <div className="page-content" style={isDirectMode ? { padding: 0 } : {}}>
          
          {/* Filter Card */}
          <div className="card filter-section" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title">🔍 {lang === 'km' ? 'ត្រងទិន្នន័យ' : 'Filter Options'}</span>
              <button 
                onClick={handlePrint}
                disabled={selectedOrders.length === 0}
                className="btn btn-primary"
                style={{ 
                  padding: '8px 18px', 
                  fontSize: '13.5px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 8,
                  cursor: selectedOrders.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: selectedOrders.length === 0 ? 0.6 : 1
                }}
              >
                <MdPrint size={18} /> {lang === 'km' ? `បោះពុម្ពដែលបានជ្រើសរើស (${selectedOrders.length})` : `Print Selected (${selectedOrders.length})`}
              </button>
            </div>
            <div className="card-body" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                {/* Driver Filter */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{lang === 'km' ? 'អ្នកដឹក' : 'Driver'}</label>
                  <select className="form-control" value={driverFilter} onChange={e => setDriverFilter(e.target.value)}>
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
                  <label className="form-label">{lang === 'km' ? 'ហាង' : 'Shop'}</label>
                  <select className="form-control" value={merchantFilter} onChange={e => setMerchantFilter(e.target.value)}>
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
            </div>
          </div>

          {/* Orders Table Card */}
          <div className="card table-container" style={{ marginBottom: 30 }}>
            <div className="card-header">
              <span className="card-title">📦 {lang === 'km' ? 'បញ្ជីកញ្ចប់សម្រាប់បោះពុម្ព' : 'Parcel List for Printing'}</span>
              <span style={{ 
                background: '#e0e7ff', 
                color: '#3730a3', 
                fontSize: 12, 
                fontWeight: 700, 
                padding: '4px 12px', 
                borderRadius: 20 
              }}>
                {selectedOrders.length} / {filteredOrders.length} {lang === 'km' ? 'កញ្ចប់បានជ្រើសរើស' : 'Selected'}
              </span>
            </div>
            <div className="table-wrapper" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1050 }}>
                <thead>
                  <tr>
                    <th style={{ width: 50, textAlign: 'center' }}>{lang === 'km' ? 'ល.រ' : 'No.'}</th>
                    <th style={{ width: 95, textAlign: 'center' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', margin: 0, fontWeight: 700 }}>
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={toggleAll}
                          style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
                        />
                        <span>{lang === 'km' ? 'ទាំងអស់' : 'All'}</span>
                      </label>
                    </th>
                    <th style={{ width: 140 }}>{lang === 'km' ? 'លេខបញ្ជូន' : 'Delivery Number'}</th>
                    <th style={{ width: 110 }}>{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                    <th style={{ width: 160 }}>{lang === 'km' ? 'ឈ្មោះហាង' : 'Shop Name'}</th>
                    <th>{lang === 'km' ? 'អាសយដ្ឋាន' : 'Address'}</th>
                    <th style={{ width: 130 }}>{lang === 'km' ? 'លេខអ្នកទទួល' : 'Receiver Phone'}</th>
                    <th style={{ width: 120, textAlign: 'right' }}>{lang === 'km' ? 'ចំនួនប្រាក់' : 'Amount'}</th>
                    <th style={{ width: 140 }}>{lang === 'km' ? 'ដឹកដោយ' : 'Driver'}</th>
                    <th style={{ width: 110, textAlign: 'center' }}>{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                        {lang === 'km' ? 'គ្មានទិន្នន័យ' : 'No Data'}
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o, idx) => (
                      <tr key={o.id} style={{ background: selectedIds.includes(o.id) ? '#f0f7ff' : undefined }}>
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>{idx + 1}</td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(o.id)}
                            onChange={() => toggleSelect(o.id)}
                            style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ fontWeight: 700 }}>{o.trackingCode}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                          {o.createdAt ? formatDateToDDMMYYYY(o.createdAt) : ''}
                        </td>
                        <td style={{ fontWeight: 600 }}>{o.merchant?.nameKh || o.merchant?.name || '—'}</td>
                        <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{o.receiverAddress || '—'}</td>
                        <td style={{ fontSize: 12.5 }}>{o.receiverPhone || '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>
                          {parseFloat(o.cod || 0).toFixed(2)} ({o.codCurrency || 'USD'})
                        </td>
                        <td>
                          {getDriverLabel(o.driver, lang)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {getStatusLabel(o.status, lang)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Printable Sticker Cards Preview */}
          <div className="print-only-container">
            {selectedOrders.map(o => (
              <div
                key={o.id}
                className="invoice-card"
                style={{
                  padding: '20px 24px',
                  border: '2px solid #0f172a',
                  borderRadius: isDirectMode ? 8 : 0,
                  background: '#ffffff',
                  maxWidth: 500,
                  margin: '0 auto 28px',
                  width: '100%',
                  color: '#0f172a',
                  fontFamily: "'Kantumruy Pro', sans-serif",
                  boxShadow: isDirectMode ? '0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.06)' : 'none',
                  boxSizing: 'border-box',
                }}
              >
                {/* Header: Logo + Brand + QR Code */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 20,
                      flexShrink: 0,
                      boxShadow: '0 4px 8px rgba(37, 99, 235, 0.25)',
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact'
                    }}>
                      📦
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 18, fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.5px', lineHeight: 1.1, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        EBS<span style={{ color: '#2563eb' }}>Express</span>
                      </span>
                      <span style={{ fontSize: 9, color: '#64748b', marginTop: 2, letterSpacing: '0.4px', fontWeight: 600 }}>
                        Delivery System
                      </span>
                    </div>
                  </div>

                  {/* QR Code image */}
                  <div style={{ textAlign: 'center' }}>
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${o.trackingCode}`} 
                      alt="QR Code" 
                      style={{ width: 72, height: 72, display: 'block', imageRendering: 'crisp-edges' }} 
                    />
                  </div>
                </div>

                {/* Tracking Title */}
                <div style={{ textAlign: 'center', margin: '12px 0 8px' }}>
                  <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: '1px', color: '#0f172a' }}>
                    {lang === 'km' ? 'វិក្កយបត្រ' : 'INVOICE'} : {o.trackingCode}
                  </h2>
                </div>

                {/* Separator */}
                <div style={{ width: '100%', height: 2, background: '#0f172a', margin: '6px 0 0 0' }} />

                {/* Shop Name & Phone */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '8px 4px', 
                  borderBottom: '2px solid #0f172a', 
                  fontWeight: 700, 
                  fontSize: 13 
                }}>
                  <div>
                    {lang === 'km' ? 'ឈ្មោះហាង' : 'Shop Name'} : <span style={{ textTransform: 'uppercase', color: '#0f172a' }}>{o.merchant?.nameKh || o.merchant?.name || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#0f172a' }}>
                    <span style={{ color: '#e11d48' }}>📞</span> {o.merchant?.phone || '—'}
                  </div>
                </div>

                {/* 2-Column Details Box */}
                <div style={{ display: 'flex', fontSize: 12, borderBottom: '2px solid #0f172a', minHeight: 80 }}>
                  {/* Left Column: Receiver Info */}
                  <div style={{ flex: 1.3, padding: '10px 8px 10px 4px', borderRight: '2px solid #0f172a', display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 800, color: '#0f172a' }}>{lang === 'km' ? 'លេខអ្នកទទួល' : 'Receiver Phone'} :</span>{' '}
                      <span style={{ fontWeight: 700 }}>{o.receiverPhone}</span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 800, color: '#0f172a' }}>{lang === 'km' ? 'អាសយដ្ឋានអ្នកទទួល' : 'Receive Address'} :</span>{' '}
                      <span>{o.receiverAddress || '—'}</span>
                    </div>
                  </div>

                  {/* Right Column: COD & Date */}
                  <div style={{ flex: 0.9, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{lang === 'km' ? 'តម្លៃឥវ៉ាន់' : 'COD'} :</span>
                      <span style={{ fontWeight: 800, color: '#0f172a' }}>{formatCOD(o.cod, o.codCurrency || 'USD')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'} :</span>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{o.createdAt ? formatDateToDDMMYYYY(o.createdAt) : ''}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Footer Notice & Total Amount */}
                <div style={{ 
                  border: '2px solid #0f172a', 
                  borderRadius: 6,
                  margin: '14px 0 2px', 
                  padding: '8px 14px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  fontSize: 11,
                  background: '#f8fafc',
                  WebkitPrintColorAdjust: 'exact', 
                  printColorAdjust: 'exact' 
                }}>
                  <div style={{ fontWeight: 700, flex: 1, paddingRight: 10, color: '#475569', fontSize: 11, lineHeight: 1.3 }}>
                    {lang === 'km' ? 'ក្រុមហ៊ុនមិនទទួលបញ្ញើដែលច្បាប់ហាមឃាត់' : 'Company does not accept contraband goods'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontWeight: 800, fontSize: 12, color: '#0f172a' }}>{lang === 'km' ? 'តម្លៃសរុប' : 'Total'} :</span>
                    <div style={{ 
                      background: '#ffffff', 
                      padding: '4px 14px', 
                      borderRadius: 6, 
                      fontWeight: 900, 
                      fontSize: 15, 
                      color: '#0f172a', 
                      border: '2px solid #0f172a', 
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
      </div>
    </div>
  );
}
