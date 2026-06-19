'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { MdFilterList, MdClear, MdPrint, MdSave, MdMoreHoriz } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';

export default function PaymentWithStaffPage() {
  const router = useRouter();
  const { t } = useLanguage();
  
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [driverId, setDriverId] = useState('');
  const [statusFilter, setStatusFilter] = useState('unpaid');
  
  // Data States
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

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
    loadDrivers();
    
    // Fix print blank issue: wait for print to complete before removing the class
    const handleAfterPrint = () => document.body.classList.remove('receipt-print-active');
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, [router]);

  const handleFilter = async () => {
    if (!driverId) return;
    try {
      const res = await api.get(`/orders?driverId=${driverId}&status=delivered&driverPaymentStatus=${statusFilter}`);
      setOrders(res.data || []);
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
    setSelectedIds([]);
  };

  const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(orders.map(o => o.id));
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
    
    const selectedOrders = orders.filter(o => selectedIds.includes(o.id));
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

  const selectedOrders = orders.filter(o => selectedIds.includes(o.id));
  const totalDeliveryFee = selectedOrders.reduce((sum, o) => sum + parseFloat(o.deliveryFee || '0'), 0);
  const totalCodKhr = selectedOrders.filter(o => o.codCurrency === 'KHR').reduce((sum, o) => sum + parseFloat(o.cod || '0'), 0);
  const totalCodUsd = selectedOrders.filter(o => o.codCurrency === 'USD').reduce((sum, o) => sum + parseFloat(o.cod || '0'), 0);

  // Print: use selected orders if any, otherwise print all orders
  const printOrders = selectedIds.length > 0 ? selectedOrders : orders;
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
        <Topbar title="Payment with Staff" subtitle="ទូទាត់ប្រាក់ជាមួយបុគ្គលិកដឹកជញ្ជូន" />
        
        <div style={{ padding: '20px 24px' }}>
          
          {/* Action & Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8f9fa', border: '1px solid #ced4da', borderRadius: 4, padding: '4px 12px' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>បុគ្គលិកដឹកជញ្ជូន:</span>
                <select 
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 600, fontSize: 14, minWidth: 200 }}
                  value={driverId} 
                  onChange={e => setDriverId(e.target.value)}
                >
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name} {d.nameKh ? `(${d.nameKh})` : ''}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8f9fa', border: '1px solid #ced4da', borderRadius: 4, padding: '4px 12px' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>ស្ថានភាព:</span>
                <select 
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 600, fontSize: 14 }}
                  value={statusFilter} 
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="unpaid">មិនទាន់ទូទាត់ (Unpaid)</option>
                  <option value="paid">ទូទាត់រួច (Paid)</option>
                </select>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                onClick={triggerPrintReceipt}
                style={{ height: 34, padding: '0 16px', borderRadius: 4, background: '#fff', border: '1px solid #ced4da', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                <MdPrint size={16} /> បោះពុម្ព {selectedIds.length > 0 ? `(${selectedIds.length})` : `(${orders.length} ទាំងអស់)`}
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
                      checked={orders.length > 0 && selectedIds.length === orders.length}
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
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '30px 0', color: '#6c757d' }}>គ្មានទិន្នន័យ</td>
                  </tr>
                ) : (
                  orders.map((o, idx) => {
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
                          {o.deliveredAt ? new Date(o.deliveredAt).toISOString().split('T')[0] : '—'}
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
                          <span style={{ background: '#16a34a', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                            ជោគជ័យ
                          </span>
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

      {/* Printable Invoice Cards — outside app-layout */}
      <div className="receipt-print-container" style={{ fontFamily: "'Kantumruy Pro', sans-serif" }}>
        {printOrders.map(o => {
          const codFormatted = o.codCurrency === 'KHR' 
            ? `${parseInt(o.cod).toLocaleString()} ៛` 
            : `$ ${parseFloat(o.cod).toFixed(2)}`;
          const currencySymbol = o.codCurrency === 'KHR' ? '៛' : '$';
          const codValue = o.codCurrency === 'KHR'
            ? parseInt(o.cod).toLocaleString()
            : parseFloat(o.cod).toFixed(2);

          return (
            <div
              key={o.id}
              style={{
                padding: '16px 20px',
                border: '1.5px solid #000',
                background: '#fff',
                maxWidth: 520,
                margin: '0 auto 24px',
                width: '100%',
                color: '#000',
                pageBreakAfter: 'always',
                breakAfter: 'page',
                breakInside: 'avoid',
              }}
            >
              {/* Logo + QR Code */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <img src="/ebs-logo.png" alt="EBS" style={{ height: 42, objectFit: 'contain' }} />
                </div>
                <div>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${o.trackingCode}`}
                    alt="QR"
                    style={{ width: 75, height: 75 }}
                  />
                </div>
              </div>

              {/* Invoice Title */}
              <div style={{ textAlign: 'center', margin: '8px 0 4px' }}>
                <h2 style={{ fontSize: 20, fontWeight: 'bold', margin: 0, letterSpacing: 0.5 }}>
                  INVOICE : {o.trackingCode}
                </h2>
              </div>

              <hr style={{ border: 'none', borderTop: '2.5px solid #000', margin: '4px 0 0' }} />

              {/* Sender / Customer row */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 4px',
                borderBottom: '1px solid #000',
                fontWeight: 'bold',
                fontSize: 13
              }}>
                <div>អ្នកផ្ញើ : {o.senderPhone || o.merchant?.phone || '—'}</div>
                <div>អតិថិជន: {o.receiverName || '—'}</div>
              </div>

              {/* Main info grid */}
              <div style={{ display: 'flex', fontSize: 12, borderBottom: '1px solid #000', minHeight: 70 }}>
                {/* Left */}
                <div style={{ flex: 1, padding: '8px 4px', borderRight: '1.5px solid #000', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex' }}>
                    <span style={{ fontWeight: 'bold', minWidth: 90 }}>អ្នកទទួល :</span>
                    <span>{o.receiverPhone}</span>
                  </div>
                  <div style={{ display: 'flex' }}>
                    <span style={{ fontWeight: 'bold', minWidth: 90 }}>កំបន់ :</span>
                    <span>{o.receiverAddress || o.zone?.name || '—'}</span>
                  </div>
                </div>
                {/* Right */}
                <div style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 'bold' }}>តម្លៃទំវាន់ :</span>
                    <span style={{ fontWeight: 'bold' }}>{codFormatted}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 'bold' }}>កាលបរិច្ឆេទ :</span>
                    <span>{o.deliveredAt ? new Date(o.deliveredAt).toISOString().split('T')[0] : o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : '—'}</span>
                  </div>
                </div>
              </div>

              {/* Note */}
              {o.note && (
                <div style={{ fontSize: 11, padding: '4px 4px 0', color: '#333' }}>
                  {o.note}
                </div>
              )}

              {/* Bottom COD box */}
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
                <div style={{ fontWeight: 'bold', flex: 1, paddingRight: 10 }}>
                  ក្រុមហ៊ុនមិនទទួលបញ្ញើដែលច្បាប់ហាមឃាត់
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 'bold' }}>តម្លៃ</span>
                  <span style={{ fontWeight: 'bold' }}>សរុប :</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{ fontSize: 10, textAlign: 'right' }}>{currencySymbol}</div>
                    <div style={{ borderBottom: '1.5px solid #000', padding: '0 8px 2px', fontWeight: 'bold', fontSize: 14, minWidth: 60, textAlign: 'right' }}>
                      {codValue}
                    </div>
                    <div style={{ fontSize: 10, textAlign: 'right' }}>{currencySymbol === '$' ? '$' : '៛'}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
