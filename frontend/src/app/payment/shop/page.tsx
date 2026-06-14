'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { MdFilterList, MdClear, MdPrint, MdSave, MdStorefront, MdMoreHoriz } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';

export default function PaymentWithShopPage() {
  const router = useRouter();
  const { t } = useLanguage();
  
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [merchantId, setMerchantId] = useState('');
  const [statusFilter, setStatusFilter] = useState('unpaid');
  
  // Data States
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const loadMerchants = async () => {
    try {
      const res = await api.get('/merchants');
      setMerchants(res.data || []);
      if (res.data && res.data.length > 0) {
        setMerchantId(res.data[0].id.toString());
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    loadMerchants();
    
    // Fix print blank issue: wait for print to complete before removing the class
    const handleAfterPrint = () => document.body.classList.remove('receipt-print-active');
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, [router]);

  const handleFilter = async () => {
    if (!merchantId) return;
    try {
      const res = await api.get(`/orders?merchantId=${merchantId}&status=delivered&merchantPaymentStatus=${statusFilter}`);
      setOrders(res.data || []);
      setSelectedIds([]);
    } catch {
      setOrders([]);
    }
  };

  useEffect(() => {
    if (merchantId) handleFilter();
  }, [merchantId, statusFilter]);

  const handleClear = () => {
    setMerchantId(merchants[0]?.id?.toString() || '');
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
    if (!merchantId) return;
    
    const selectedOrders = orders.filter(o => selectedIds.includes(o.id));
    const totalDeliveryFee = selectedOrders.reduce((sum, o) => sum + parseFloat(o.deliveryFee || '0'), 0);
    const totalCodUsd = selectedOrders.filter(o => o.codCurrency === 'USD').reduce((sum, o) => sum + parseFloat(o.cod || '0'), 0);
    
    const netAmountUsd = totalCodUsd - totalDeliveryFee;
    
    setSaving(true);
    try {
      await api.post('/payments/shop', {
        merchantId: parseInt(merchantId),
        amount: netAmountUsd,
        date: new Date().toISOString(),
        reference: `SETTLE-SHOP-${Date.now().toString().slice(-6)}`,
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
  
  const payableUsd = totalCodUsd - totalDeliveryFee; 
  const payableKhr = totalCodKhr; 

  if (loading) return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="loading-wrapper"><div className="spinner" /></div>
      </div>
    </div>
  );

  const selectedMerchant = merchants.find(m => m.id.toString() === merchantId);

  return (
    <>
      <div className="app-layout">
      <Sidebar />
      <div className="main-content" style={{ background: '#fff', minHeight: '100vh', fontFamily: 'Kantumruy Pro, sans-serif' }}>
        <Topbar title="Payment with Shop" subtitle="ទូទាត់ប្រាក់ជាមួយហាង" />
        
        <div style={{ padding: '20px 24px' }}>
          
          {/* Action & Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8f9fa', border: '1px solid #ced4da', borderRadius: 4, padding: '4px 12px' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>ឈ្មោះហាង:</span>
                <select 
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 600, fontSize: 14, minWidth: 200 }}
                  value={merchantId} 
                  onChange={e => setMerchantId(e.target.value)}
                >
                  {merchants.map(m => (
                    <option key={m.id} value={m.id}>{m.name} {m.nameKh ? `(${m.nameKh})` : ''}</option>
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
                <MdPrint size={16} /> បោះពុម្ព
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
                  <th style={{ padding: '12px 8px', textAlign: 'center', borderRight: '1px solid #dee2e6', width: 60 }}>ជ្រើសរើស</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', borderRight: '1px solid #dee2e6' }}>លេខកូដ</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', borderRight: '1px solid #dee2e6' }}>កាលបរិច្ឆេទ</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', borderRight: '1px solid #dee2e6' }}>លេខអ្នកទទួល</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', borderRight: '1px solid #dee2e6' }}>ប្រាក់ POD</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', borderRight: '1px solid #dee2e6' }}>ប្រាក់កម្រៃដឹក</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', borderRight: '1px solid #dee2e6' }}>ដឹកដោយ</th>
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
                        <td style={{ padding: '8px', borderRight: '1px solid #dee2e6' }}>
                          {o.receiverPhone}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #dee2e6', color: '#dc2626', fontWeight: 600 }}>
                          {o.codCurrency === 'KHR' ? `${parseInt(o.cod).toLocaleString()} ៛` : `$ ${parseFloat(o.cod).toFixed(2)}`}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #dee2e6', color: '#dc2626', fontWeight: 600 }}>
                          $ {parseFloat(o.deliveryFee).toFixed(2)}
                        </td>
                        <td style={{ padding: '8px', borderRight: '1px solid #dee2e6', fontStyle: 'italic', color: '#475569' }}>
                          {o.driver?.name || '—'}
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
                  <td colSpan={5} style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600, borderRight: '1px solid #dee2e6' }}>
                    សរុបប្រាក់ទូទាត់ជារៀល (KHR)
                  </td>
                  <td colSpan={2} style={{ padding: '8px', borderRight: '1px solid #dee2e6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontWeight: 600, minWidth: 60, textAlign: 'right' }}>{payableKhr.toLocaleString()}</span>
                      <div style={{ background: '#f59e0b', color: '#fff', padding: '6px 12px', borderRadius: 4, fontWeight: 600, flex: 1 }}>
                        {payableKhr.toLocaleString()}
                      </div>
                    </div>
                  </td>
                  <td colSpan={2}></td>
                </tr>
                <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                  <td colSpan={5} style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600, borderRight: '1px solid #dee2e6' }}>
                    សរុបប្រាក់ទូទាត់ជាដុល្លារ (USD)
                  </td>
                  <td colSpan={2} style={{ padding: '8px', borderRight: '1px solid #dee2e6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontWeight: 600, minWidth: 60, textAlign: 'right' }}>{payableUsd.toFixed(2)}</span>
                      <div style={{ background: '#f59e0b', color: '#fff', padding: '6px 12px', borderRadius: 4, fontWeight: 600, flex: 1 }}>
                        {payableUsd.toFixed(2)}
                      </div>
                    </div>
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* Printable Layout Container */}
      <div className="receipt-print-container" style={{ fontFamily: 'Kantumruy Pro, Inter, sans-serif' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>{t('companyName') || 'Company Name'}</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#475569' }}>Delivery Management System</p>
            <h3 style={{ margin: '14px 0 0', fontSize: 14, borderBottom: '2px solid #000', paddingBottom: 6 }}>{statusFilter === 'unpaid' ? 'Settlement Quotation' : t('settlementReceipt')}</h3>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 16 }}>
            <div>
              <div><strong>Merchant:</strong> {selectedMerchant?.name}</div>
              {selectedMerchant?.nameKh && <div><strong>ឈ្មោះខ្មែរ:</strong> {selectedMerchant?.nameKh}</div>}
              <div><strong>{t('phone')}:</strong> {selectedMerchant?.phone}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div><strong>{t('receiptNo')}:</strong> {statusFilter === 'unpaid' ? 'DRAFT' : 'SETTLED'}</div>
              <div><strong>{t('date')}:</strong> {new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #000' }}>
                <th style={{ textAlign: 'left', padding: '6px 0', background: 'transparent', border: 'none' }}>Description</th>
                <th style={{ textAlign: 'right', padding: '6px 0', background: 'transparent', border: 'none' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                <td style={{ padding: '6px 0', border: 'none' }}>Total POD Collected (USD)</td>
                <td style={{ textAlign: 'right', padding: '6px 0', border: 'none' }}>${totalCodUsd.toFixed(2)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                <td style={{ padding: '6px 0', border: 'none' }}>Total POD Collected (KHR)</td>
                <td style={{ textAlign: 'right', padding: '6px 0', border: 'none' }}>{totalCodKhr.toLocaleString()} ៛</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                <td style={{ padding: '6px 0', border: 'none' }}>Deductions (Delivery Fee)</td>
                <td style={{ textAlign: 'right', padding: '6px 0', border: 'none', color: '#ef4444' }}>-${totalDeliveryFee.toFixed(2)}</td>
              </tr>
              <tr style={{ borderBottom: '2px solid #000', fontWeight: 700 }}>
                <td style={{ padding: '8px 0', border: 'none' }}>Net Payable Amount</td>
                <td style={{ textAlign: 'right', padding: '8px 0', border: 'none' }}>${payableUsd.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, marginTop: 45, textAlign: 'center', fontSize: 12 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{t('payerSignature') || 'Payer Signature'}</div>
              <div style={{ marginTop: 50, borderTop: '1px solid #000', display: 'inline-block', width: '80%' }} />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{t('receiverSignature') || 'Receiver Signature'}</div>
              <div style={{ marginTop: 50, borderTop: '1px solid #000', display: 'inline-block', width: '80%' }} />
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
