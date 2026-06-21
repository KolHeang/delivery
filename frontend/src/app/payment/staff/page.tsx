'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { MdFilterList, MdClear, MdPrint, MdSave, MdMoreHoriz } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';
import DateInput, { formatDateToDDMMYYYY } from '@/components/ui/DateInput';

const getLocalDateString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalFirstDayOfMonthString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

export default function PaymentWithStaffPage() {
  const router = useRouter();
  const { t } = useLanguage();
  
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [driverId, setDriverId] = useState('');
  const [statusFilter, setStatusFilter] = useState('unpaid');
  const [startDate, setStartDate] = useState(() => getLocalFirstDayOfMonthString());
  const [endDate, setEndDate] = useState(() => getLocalDateString());
  
  // Data States
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  const loadDrivers = async () => {
    try {
      const res = await api.get('/drivers');
      setDrivers(res.data || []);
      if (res.data && res.data.length > 0) {
        setDriverId(res.data[0].id.toString());
      }
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
    if (!driverId) return;
    try {
      const res = await api.get(`/orders?driverId=${driverId}`);
      let allOrders = res.data || [];
      if (statusFilter === 'unpaid') {
        allOrders = allOrders.filter(o => o.driverPaymentStatus === 'unpaid' || o.status === 'failed' || o.status === 'returned' || o.status === 'pending');
      } else {
        allOrders = allOrders.filter(o => o.driverPaymentStatus === 'paid');
      }
      setOrders(allOrders);
      setSelectedIds([]);
    } catch {
      setOrders([]);
    }
  };

  useEffect(() => {
    if (driverId) handleFilter();
  }, [driverId, statusFilter]);

  const handleClear = () => {
    setDriverId(drivers[0]?.id?.toString() || '');
    setStatusFilter('unpaid');
    setStartDate('');
    setEndDate('');
    setSelectedIds([]);
  };

  // Filter orders by date client-side
  const deliveredOrders = orders.filter(o => o.status === 'delivered' || o.status === 'failed' || o.status === 'returned');
  const pendingOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'failed' && o.status !== 'returned');

  const filteredOrders = orders.filter(o => {
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
      setSelectedIds(filteredOrders.map(o => o.id));
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
    if (selectedIds.length === 0) return alert('Please select at least one order to settle.');
    if (!driverId) return;
    
    const selectedOrders = filteredOrders.filter(o => selectedIds.includes(o.id));
    const totalDeliveryFee = selectedOrders.reduce((sum, o) => sum + parseFloat(o.deliveryFee || '0'), 0);
    
    setSaving(true);
    try {
      await api.post('/payments/staff', {
        driverId: parseInt(driverId),
        amount: totalDeliveryFee,
        date: new Date().toISOString(),
        reference: `SETTLE-STAFF-${Date.now().toString().slice(-6)}`,
        note: `Bulk settlement for ${selectedIds.length} orders`,
        orderIds: selectedIds,
      });
      alert('Payment settled successfully!');
      handleFilter(); 
    } catch {
      alert('Failed to settle payment.');
    }
    setSaving(false);
  };

  const selectedOrders = filteredOrders.filter(o => selectedIds.includes(o.id));
  const totalDeliveryFee = selectedOrders.reduce((sum, o) => sum + parseFloat(o.deliveryFee || '0'), 0);
  const totalCodKhr = selectedOrders.filter(o => o.codCurrency === 'KHR').reduce((sum, o) => sum + parseFloat(o.cod || '0'), 0);
  const totalCodUsd = selectedOrders.filter(o => o.codCurrency === 'USD').reduce((sum, o) => sum + parseFloat(o.cod || '0'), 0);

  // Print: use selected orders if any, otherwise print all orders
  const basePrintOrders = selectedIds.length > 0 ? selectedOrders : filteredOrders;
  const printOrders = basePrintOrders.filter(o => o.status === 'delivered' || o.status === 'failed' || o.status === 'returned');
  
  const printTotalFee = printOrders.reduce((sum, o) => sum + parseFloat(o.deliveryFee || '0'), 0);
  const printCodKhr = printOrders.filter(o => o.codCurrency === 'KHR').reduce((sum, o) => sum + parseFloat(o.cod || '0'), 0);
  const printCodUsd = printOrders.filter(o => o.codCurrency === 'USD').reduce((sum, o) => sum + parseFloat(o.cod || '0'), 0);
  const printPayableUsd = printTotalFee;

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
        <Topbar title="Payment with Delivery" subtitle="ទូទាត់ប្រាក់ជាមួយអ្នកដឹកជញ្ជូន" />
        
        <div style={{ padding: '20px 24px' }}>
          
          {/* Action & Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, paddingLeft: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>បុគ្គលិកដឹកជញ្ជូន</span>
                </div>
                <select 
                  className="form-control"
                  style={{ minWidth: 200, height: 38, cursor: 'pointer' }}
                  value={driverId} 
                  onChange={e => setDriverId(e.target.value)}
                >
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name} {d.nameKh ? `(${d.nameKh})` : ''}</option>
                  ))}
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
                <MdPrint size={16} /> បោះពុម្ព {selectedIds.length > 0 ? `(${selectedIds.length})` : `(${filteredOrders.length} ទាំងអស់)`}
              </button>
              {statusFilter === 'unpaid' && (
                <button 
                  onClick={handleSavePayment} 
                  disabled={saving || selectedIds.length === 0}
                  style={{ height: 34, padding: '0 16px', borderRadius: 4, background: (saving || selectedIds.length === 0) ? '#6c757d' : '#0d6efd', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: (saving || selectedIds.length === 0) ? 'not-allowed' : 'pointer' }}
                >
                  <MdSave size={16} /> រក្សាទុកការទូទាត់
                </button>
              )}
            </div>
          </div>

          {/* Dense ERP Table */}
          <div style={{ border: '1px solid #dee2e6', borderRadius: 4, overflowX: 'auto', background: '#fff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 1000 }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'center', borderRight: '1px solid #dee2e6', width: 40 }}>ល.រ</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', borderRight: '1px solid #dee2e6', width: 60 }}>
                    <input type="checkbox"
                      checked={filteredOrders.length > 0 && selectedIds.length === filteredOrders.length}
                      onChange={handleToggleSelectAll}
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', borderRight: '1px solid #dee2e6' }}>លេខកូដ</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', borderRight: '1px solid #dee2e6' }}>កាលបរិច្ឆេទ</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', borderRight: '1px solid #dee2e6' }}>ឈ្មោះហាង</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', borderRight: '1px solid #dee2e6' }}>លេខអ្នកទទួល</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', borderRight: '1px solid #dee2e6' }}>ប្រាក់បានបញ្ចូល</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', borderRight: '1px solid #dee2e6' }}>ប្រាក់កម្រៃដឹក</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>ស្ថានភាព</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '30px 0', color: '#6c757d' }}>គ្មានទិន្នន័យ</td>
                  </tr>
                ) : (
                  filteredOrders.map((o, idx) => {
                    const isSelected = selectedIds.includes(o.id);
                    return (
                      <tr key={o.id} style={{ borderBottom: '1px solid #dee2e6', background: isSelected ? '#f1f5f9' : '#fff' }}>
                        <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #dee2e6', fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #dee2e6' }}>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => handleToggleSelect(o.id)}
                            style={{ width: 18, height: 18, accentColor: '#0ea5e9', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '8px', borderRight: '1px solid #dee2e6', color: '#475569' }}>
                          {o.trackingCode}
                        </td>
                        <td style={{ padding: '8px', borderRight: '1px solid #dee2e6' }}>
                          {o.deliveredAt ? formatDateToDDMMYYYY(o.deliveredAt) : '—'}
                        </td>
                        <td style={{ padding: '8px', borderRight: '1px solid #dee2e6', color: '#0d6efd', fontWeight: 600 }}>
                          {o.merchant?.name || '—'}
                        </td>
                        <td style={{ padding: '8px', borderRight: '1px solid #dee2e6' }}>
                          {o.receiverPhone}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #dee2e6', color: '#dc2626', fontWeight: 600 }}>
                          {o.codCurrency === 'KHR' ? `${parseInt(o.cod).toLocaleString()} ៛` : `$ ${parseFloat(o.cod).toFixed(2)}`}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #dee2e6', color: '#dc2626', fontWeight: 600 }}>
                          $ {parseFloat(o.deliveryFee).toFixed(2)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          {o.status === 'delivered' ? (
                            <span style={{ background: '#16a34a', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>ជោគជ័យ</span>
                          ) : o.status === 'returned' ? (
                            <span style={{ background: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>បង្វិលត្រឡប់</span>
                          ) : o.status === 'failed' ? (
                            <span style={{ background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>បរាជ័យ</span>
                          ) : (
                            <span style={{ background: '#64748b', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>កំពុងដឹក</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
                
                {/* Summary Rows Embedded in Table */}
                <tr style={{ background: '#f8f9fa' }}>
                  <td colSpan={6} style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600, borderRight: '1px solid #dee2e6' }}>
                    សរុបប្រាក់បានបញ្ចូលជារៀល (POD KHR)
                  </td>
                  <td colSpan={2} style={{ padding: '8px', borderRight: '1px solid #dee2e6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontWeight: 600, minWidth: 60, textAlign: 'right' }}>{totalCodKhr.toLocaleString()}</span>
                      <div style={{ background: '#f59e0b', color: '#fff', padding: '6px 12px', borderRadius: 4, fontWeight: 600, flex: 1 }}>
                        {totalCodKhr.toLocaleString()}
                      </div>
                    </div>
                  </td>
                  <td colSpan={1}></td>
                </tr>
                <tr style={{ background: '#f8f9fa' }}>
                  <td colSpan={6} style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600, borderRight: '1px solid #dee2e6' }}>
                    សរុបប្រាក់បានបញ្ចូលជាដុល្លារ (POD USD)
                  </td>
                  <td colSpan={2} style={{ padding: '8px', borderRight: '1px solid #dee2e6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontWeight: 600, minWidth: 60, textAlign: 'right' }}>{totalCodUsd.toFixed(2)}</span>
                      <div style={{ background: '#f59e0b', color: '#fff', padding: '6px 12px', borderRadius: 4, fontWeight: 600, flex: 1 }}>
                        {totalCodUsd.toFixed(2)}
                      </div>
                    </div>
                  </td>
                  <td colSpan={1}></td>
                </tr>
                <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                  <td colSpan={6} style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600, borderRight: '1px solid #dee2e6' }}>
                    សរុបប្រាក់កម្រៃដឹកជាដុល្លារ (Delivery Fee)
                  </td>
                  <td colSpan={2} style={{ padding: '8px', borderRight: '1px solid #dee2e6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontWeight: 600, minWidth: 60, textAlign: 'right' }}>{totalDeliveryFee.toFixed(2)}</span>
                      <div style={{ background: '#f59e0b', color: '#fff', padding: '6px 12px', borderRadius: 4, fontWeight: 600, flex: 1 }}>
                        {totalDeliveryFee.toFixed(2)}
                      </div>
                    </div>
                  </td>
                  <td colSpan={1}></td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>
      </div>

      {/* Printable Invoice List Table — outside app-layout (Print-only) */}
      <div className="receipt-print-container" style={{ fontFamily: "'Kantumruy Pro', sans-serif", fontSize: 11 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, color: '#3b82f6' }}>អ៊ី អ៊ិចប្រេស</h2>
          <p style={{ margin: 0, fontSize: 16, color: '#94a3b8' }}>E-Express</p>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 10 }}>
          <div>
            <div><strong>ឈ្មោះអ្នកដឹកជញ្ជូន :</strong> {selectedDriver ? `${selectedDriver.name} ${selectedDriver.nameKh ? `(${selectedDriver.nameKh})` : ''}` : '—'}</div>
            <div><strong>លេខទូរស័ព្ទ :</strong> {selectedDriver?.phone || 'N/A'}</div>
            <div><strong>Print Date :</strong> {new Date().toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 'bold' }}>វិក្កយបត្រ (សំរាប់អ្នកដឹក)</div>
            <div><strong>លេខ :</strong> INV_DRIVER_{getLocalDateString().replace(/-/g, '')}</div>
            <div><strong>កាលបរិច្ឆេទ :</strong> {formatDateToDDMMYYYY(getLocalDateString())}</div>
            <div><strong>អ្នកបោះពុម្ព :</strong> {user?.name || 'Admin'}</div>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', textAlign: 'center', fontSize: 10 }}>
          <thead>
            <tr style={{ background: '#a7f3d0' }}>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: 4 }}>No</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: 4 }}>Bill Invoice</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: 4 }}>អតិថិជន</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: 4 }}>តំបន់</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: 4 }}>លេខទូរស័ព្ទ</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: 4 }}>ទទួលអីវ៉ាន់</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: 4 }}>ចេញអីវ៉ាន់</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: 4 }}>ប្រភេទបង់លុយ</th>
              <th colSpan={2} style={{ border: '1px solid #000', padding: 4 }}>COD</th>
              <th colSpan={2} style={{ border: '1px solid #000', padding: 4 }}>QR ហាង</th>
              <th colSpan={2} style={{ border: '1px solid #000', padding: 4 }}>QR ក្រុមហ៊ុន</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: 4 }}>សេវាដឹក(USD)</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: 4 }}>ទឹកប្រាក់សរុប (USD)</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: 4 }}>ទឹកប្រាក់សរុប (KHR)</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: 4 }}>Remark</th>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: 4 }}>ស្ថានភាព</th>
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
              <tr><td colSpan={17} style={{ padding: 10 }}>គ្មានទិន្នន័យ</td></tr>
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
                    <td style={{ border: '1px solid #000', padding: 4 }}>{isCOD ? 'COD' : 'QR + សាច់ប្រាក់'}</td>
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
                      {o.status === 'delivered' ? 'ជោគជ័យ' : o.status === 'returned' ? 'បង្វិលត្រឡប់' : o.status === 'failed' ? 'បរាជ័យ' : 'កំពុងដឹក'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {printOrders.length > 0 && (
            <tfoot>
              <tr style={{ background: '#e2e8f0', fontWeight: 'bold' }}>
                <td colSpan={8} style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>សរុប</td>
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
                <td colSpan={15} style={{ border: '1px solid #000', padding: 4, textAlign: 'right' }}>ប្រាក់ដែលត្រូវទូទាត់សរុប</td>
                <td style={{ border: '1px solid #000', padding: 4 }}>${printCodUsd.toFixed(2)}</td>
                <td style={{ border: '1px solid #000', padding: 4 }}>៛{printCodKhr.toLocaleString()}</td>
                <td colSpan={2} style={{ border: '1px solid #000', padding: 4 }}></td>
              </tr>
            </tfoot>
          )}
        </table>

        {pendingOrders.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 14 }}>Pendding Packages</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', textAlign: 'center', fontSize: 10 }}>
              <thead>
                <tr style={{ background: '#22c55e', color: '#fff' }}>
                  <th style={{ border: '1px solid #000', padding: 4 }}>No</th>
                  <th style={{ border: '1px solid #000', padding: 4 }}>Bill Invoice</th>
                  <th style={{ border: '1px solid #000', padding: 4 }}>Customer</th>
                  <th style={{ border: '1px solid #000', padding: 4 }}>Bill Create</th>
                  <th style={{ border: '1px solid #000', padding: 4 }}>Bill Finish</th>
                  <th style={{ border: '1px solid #000', padding: 4 }}>Zone</th>
                  <th style={{ border: '1px solid #000', padding: 4 }}>Receiver Phone</th>
                  <th style={{ border: '1px solid #000', padding: 4 }}>COD</th>
                  <th style={{ border: '1px solid #000', padding: 4 }}>Remark</th>
                  <th style={{ border: '1px solid #000', padding: 4 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {pendingOrders.map((o, idx) => (
                  <tr key={o.id}>
                    <td style={{ border: '1px solid #000', padding: 4 }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #000', padding: 4 }}>{o.trackingCode}</td>
                    <td style={{ border: '1px solid #000', padding: 4 }}>{o.merchant?.name || '—'}</td>
                    <td style={{ border: '1px solid #000', padding: 4 }}>{o.createdAt ? formatDateToDDMMYYYY(o.createdAt) : '—'}</td>
                    <td style={{ border: '1px solid #000', padding: 4 }}>-</td>
                    <td style={{ border: '1px solid #000', padding: 4 }}>{o.zone?.name || '—'}</td>
                    <td style={{ border: '1px solid #000', padding: 4 }}>{o.receiverPhone}</td>
                    <td style={{ border: '1px solid #000', padding: 4 }}>{o.codCurrency === 'USD' ? `$${parseFloat(o.cod||'0').toFixed(2)}` : `៛${parseFloat(o.cod||'0').toLocaleString()}`}</td>
                    <td style={{ border: '1px solid #000', padding: 4 }}>{o.note || ''}</td>
                    <td style={{ border: '1px solid #000', padding: 4, color: '#dc2626' }}>កំពុងដំណើរការ (ផ្ញើចេញពីឃ្លាំង)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
