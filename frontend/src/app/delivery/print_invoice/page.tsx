'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { MdPrint, MdClose, MdFilterList, MdSelectAll } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';
import DateInput, { getLocalDateString, formatDateToDDMMYYYY } from '@/components/ui/DateInput';

const getLocalFirstDayOfMonthString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

const formatCOD = (cod: any, currency: string) => {
  if (!cod || parseFloat(cod) === 0) return '—';
  if (currency === 'KHR') return `${parseInt(cod).toLocaleString()} ៛`;
  return `$${parseFloat(cod).toFixed(2)}`;
};

const STATUS_OPTIONS = [
  { value: 'all', labelEn: 'All Status', labelKh: 'ស្ថានភាពទាំងអស់' },
  { value: 'pending', labelEn: 'Pending', labelKh: 'រង់ចាំ' },
  { value: 'in-warehouse', labelEn: 'In Warehouse', labelKh: 'ក្នុងឃ្លាំង' },
  { value: 'assigned', labelEn: 'Assigned', labelKh: 'បានចាត់ចែង' },
  { value: 'picked-up', labelEn: 'Picked Up', labelKh: 'បានប្រមូល' },
  { value: 'in-transit', labelEn: 'In Transit', labelKh: 'កំពុងដឹក' },
  { value: 'delivered', labelEn: 'Delivered', labelKh: 'ដឹកជោគជ័យ' },
  { value: 'failed', labelEn: 'Failed', labelKh: 'មិនជោគជ័យ' },
  { value: 'returned', labelEn: 'Returned', labelKh: 'បានត្រឡប់' },
];

export default function PrintInvoiceDeliveryPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
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
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    Promise.all([
      api.get('/orders'),
      api.get('/merchants'),
      api.get('/drivers'),
    ]).then(([oRes, mRes, dRes]) => {
      const orderData = oRes.data || [];
      setOrders(orderData);
      setMerchants(mRes.data || []);
      setDrivers(dRes.data || []);
      // Pre-select IDs from query param if present
      const params = new URLSearchParams(window.location.search);
      const ids = params.get('id');
      if (ids) {
        const parsed = ids.split(',').map(x => parseInt(x)).filter(x => !isNaN(x));
        setSelectedIds(parsed);
      } else {
        setSelectedIds(orderData.map((o: any) => o.id));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [router]);

  // Filter logic
  useEffect(() => {
    let list = [...orders];
    if (statusFilter !== 'all') list = list.filter(o => o.status === statusFilter);
    if (driverFilter) list = list.filter(o => String(o.driverId) === driverFilter);
    if (merchantFilter) list = list.filter(o => String(o.merchantId) === merchantFilter);
    if (startDate) {
      const s = new Date(startDate); s.setHours(0, 0, 0, 0);
      list = list.filter(o => new Date(o.createdAt) >= s);
    }
    if (endDate) {
      const e = new Date(endDate); e.setHours(23, 59, 59, 999);
      list = list.filter(o => new Date(o.createdAt) <= e);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.trackingCode?.toLowerCase().includes(q) ||
        o.receiverName?.toLowerCase().includes(q) ||
        o.receiverPhone?.includes(q) ||
        o.receiverAddress?.toLowerCase().includes(q) ||
        o.merchant?.name?.toLowerCase().includes(q) ||
        o.merchant?.nameKh?.toLowerCase().includes(q)
      );
    }
    setFilteredOrders(list);
  }, [orders, statusFilter, driverFilter, merchantFilter, startDate, endDate, search]);

  const allSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedIds.includes(o.id));

  const toggleAll = () => {
    const ids = filteredOrders.map(o => o.id);
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...ids])));
    }
  };

  const toggleOne = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 200);
  };

  const selectedOrders = orders.filter(o => selectedIds.includes(o.id));

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
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print, .sidebar, .topbar, .filter-panel, .order-table-panel, .select-bar {
            display: none !important;
          }
          .main-content { margin-left: 0 !important; }
          body, .page-content { background: #fff !important; padding: 0 !important; }
          .print-area { display: block !important; }
          .invoice-slip {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            box-shadow: none !important;
            border: 1.5px solid #000 !important;
            margin-bottom: 0 !important;
          }
          .invoice-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8mm !important;
            padding: 6mm !important;
          }
        }
        @media screen {
          .print-area { display: none !important; }
        }
      `}} />

      <Sidebar />
      <div className="main-content">
        <Topbar
          title={lang === 'km' ? 'បោះពុម្ពវិក្កយបត្រ' : 'Print Invoice'}
          subtitle={lang === 'km' ? `${selectedIds.length} រាយការណ៍ដែលបានជ្រើសរើស` : `${selectedIds.length} items selected`}
        />

        <div className="page-content">

          {/* ── Filter Panel ── */}
          <div className="card filter-panel" style={{ marginBottom: 16, padding: '16px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
              {/* Status */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 11 }}>{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</label>
                <select className="form-control" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{lang === 'km' ? s.labelKh : s.labelEn}</option>
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

              {/* Driver */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 11 }}>{lang === 'km' ? 'អ្នកដឹក' : 'Driver'}</label>
                <select className="form-control" value={driverFilter} onChange={e => setDriverFilter(e.target.value)}>
                  <option value="">{lang === 'km' ? '-- ទាំងអស់ --' : '-- All --'}</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.nameKh || d.name}</option>
                  ))}
                </select>
              </div>

              {/* Merchant */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 11 }}>{lang === 'km' ? 'ហាង' : 'Shop'}</label>
                <select className="form-control" value={merchantFilter} onChange={e => setMerchantFilter(e.target.value)}>
                  <option value="">{lang === 'km' ? '-- ទាំងអស់ --' : '-- All --'}</option>
                  {merchants.map(m => (
                    <option key={m.id} value={m.id}>{m.nameKh ? `${m.nameKh} (${m.name})` : m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search + Action buttons */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                <input
                  className="form-control"
                  placeholder={lang === 'km' ? 'ស្វែងរក...' : 'Search tracking, receiver, shop...'}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: 12 }}
                />
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={toggleAll}
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <MdSelectAll size={16} />
                {allSelected
                  ? (lang === 'km' ? 'លុបការជ្រើស' : 'Deselect All')
                  : (lang === 'km' ? 'ជ្រើសទាំងអស់' : 'Select All')}
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handlePrint}
                disabled={selectedIds.length === 0 || isPrinting}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
              >
                <MdPrint size={16} />
                {lang === 'km'
                  ? `បោះពុម្ព (${selectedIds.length})`
                  : `Print (${selectedIds.length})`}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => router.push('/delivery')}
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <MdClose size={16} />
                {lang === 'km' ? 'ត្រឡប់' : 'Back'}
              </button>
            </div>
          </div>

          {/* ── Orders Table ── */}
          <div className="card order-table-panel" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', width: 44, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      style={{ cursor: 'pointer', width: 15, height: 15 }}
                    />
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>{lang === 'km' ? 'ល.រ' : 'No.'}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>{lang === 'km' ? 'លេខ' : 'Tracking'}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>{lang === 'km' ? 'ហាង' : 'Shop'}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>{lang === 'km' ? 'អ្នកទទួល' : 'Receiver'}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>{lang === 'km' ? 'អាសយដ្ឋាន' : 'Address'}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>{lang === 'km' ? 'ទូរស័ព្ទ' : 'Phone'}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>COD</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>{lang === 'km' ? 'អ្នកដឹក' : 'Driver'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                      {lang === 'km' ? 'គ្មានទិន្នន័យ' : 'No orders found'}
                    </td>
                  </tr>
                ) : filteredOrders.map((o, idx) => (
                  <tr
                    key={o.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: selectedIds.includes(o.id) ? '#eff6ff' : 'transparent',
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleOne(o.id)}
                  >
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(o.id)}
                        onChange={() => toggleOne(o.id)}
                        onClick={e => e.stopPropagation()}
                        style={{ cursor: 'pointer', width: 15, height: 15 }}
                      />
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: 12 }}>{idx + 1}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: '#2563eb' }}>{o.trackingCode}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDateToDDMMYYYY(o.createdAt)}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{o.merchant?.nameKh || o.merchant?.name || '—'}</td>
                    <td style={{ padding: '8px 12px' }}>{o.receiverName || '—'}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12 }}>{o.receiverAddress || '—'}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{o.receiverPhone || '—'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                      {formatCOD(o.cod, o.codCurrency || 'USD')}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 12 }}>{o.driver?.nameKh || o.driver?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          PRINT AREA — hidden on screen, shown on print
      ══════════════════════════════════════════ */}
      <div className="print-area">
        <div className="invoice-grid">
          {selectedOrders.map(o => (
            <div
              key={o.id}
              className="invoice-slip"
              style={{
                border: '1.5px solid #000',
                borderRadius: 0,
                background: '#fff',
                color: '#000',
                fontFamily: "'Kantumruy Pro', sans-serif",
                padding: '10px 14px',
                fontSize: 11,
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              {/* Header: Logo + QR */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: '#000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 14,
                    flexShrink: 0,
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}>
                    📦
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#000', letterSpacing: '0.5px', lineHeight: 1.1 }}>EBS<span style={{ color: '#555' }}>Express</span></span>
                    <span style={{ fontSize: 8, color: '#555', marginTop: 1, letterSpacing: '0.2px' }}>Delivery System</span>
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${o.trackingCode}`}
                    alt="QR"
                    style={{ width: 60, height: 60 }}
                  />
                  <div style={{ fontSize: 8, marginTop: 2, fontWeight: 'bold', letterSpacing: '0.5px' }}>{o.trackingCode}</div>
                </div>
              </div>

              {/* Title */}
              <div style={{ textAlign: 'center', borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '4px 0', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 'bold', letterSpacing: '1px' }}>
                  {lang === 'km' ? 'វិក្កយបត្រ' : 'DELIVERY INVOICE'}
                </span>
              </div>

              {/* Sender row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ccc', paddingBottom: 4, marginBottom: 4, fontSize: 10 }}>
                <div>
                  <span style={{ color: '#555' }}>{lang === 'km' ? 'ហាង: ' : 'Shop: '}</span>
                  <strong>{o.merchant?.nameKh || o.merchant?.name || o.senderName || '—'}</strong>
                </div>
                <div>
                  <span style={{ color: '#555' }}>{lang === 'km' ? 'កាលបរិច្ឆេទ: ' : 'Date: '}</span>
                  <strong>{o.createdAt ? formatDateToDDMMYYYY(o.createdAt) : '—'}</strong>
                </div>
              </div>

              {/* Receiver block */}
              <div style={{ border: '1px solid #999', borderRadius: 3, padding: '5px 8px', marginBottom: 6 }}>
                <div style={{ fontSize: 9, fontWeight: 'bold', color: '#555', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {lang === 'km' ? 'ព័ត៌មានអ្នកទទួល' : 'Receiver Info'}
                </div>
                <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 2 }}>{o.receiverName || '—'}</div>
                <div style={{ fontSize: 10, marginBottom: 2 }}>📞 {o.receiverPhone || '—'}</div>
                <div style={{ fontSize: 10, color: '#333' }}>📍 {o.receiverAddress || '—'}</div>
              </div>

              {/* COD + Delivery Fee row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                <div style={{ border: '1px solid #999', borderRadius: 3, padding: '4px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 8, color: '#555', marginBottom: 2 }}>COD</div>
                  <div style={{ fontWeight: 'bold', fontSize: 13, color: '#dc2626' }}>
                    {formatCOD(o.cod, o.codCurrency || 'USD')}
                  </div>
                </div>
                <div style={{ border: '1px solid #999', borderRadius: 3, padding: '4px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 8, color: '#555', marginBottom: 2 }}>{lang === 'km' ? 'ថ្លៃដឹក' : 'Delivery Fee'}</div>
                  <div style={{ fontWeight: 'bold', fontSize: 13 }}>
                    ${parseFloat(o.deliveryFee || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Driver + Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, borderTop: '1px solid #ccc', paddingTop: 4 }}>
                <div>
                  <span style={{ color: '#555' }}>{lang === 'km' ? 'អ្នកដឹក: ' : 'Driver: '}</span>
                  <strong>{o.driver?.nameKh || o.driver?.name || (lang === 'km' ? 'មិនទាន់ assign' : 'Unassigned')}</strong>
                </div>
                <div>
                  <span style={{ color: '#555' }}>{lang === 'km' ? 'ស្ថានភាព: ' : 'Status: '}</span>
                  <strong>{o.status}</strong>
                </div>
              </div>

              {/* Footer note */}
              <div style={{ marginTop: 5, fontSize: 8, color: '#777', borderTop: '1px dashed #ccc', paddingTop: 4, textAlign: 'center' }}>
                {lang === 'km'
                  ? 'ក្រុមហ៊ុនមិនទទួលបញ្ញើដែលច្បាប់ហាមឃាត់'
                  : 'Company does not accept prohibited goods'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
