'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { MdDelete } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';
import DateInput, { getLocalDateString } from '@/components/ui/DateInput';

const getLocalFirstDayOfMonthString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

export default function BatchEntryPage() {
  const router = useRouter();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [, setZones] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { t } = useLanguage();
  const [selectedMerchantId, setSelectedMerchantId] = useState('');
  const [startDate, setStartDate] = useState(() => getLocalFirstDayOfMonthString());
  const [endDate, setEndDate] = useState(() => getLocalDateString());
  const [deliveryFee, setDeliveryFee] = useState('0');

  const [rows, setRows] = useState<any[]>([
    { receiverName: '', receiverAddress: '', receiverPhone: '', deliveryFee: '0', codUSD: '0', codKHR: '0', pickupId: '', driverId: '', note: '' }
  ]);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    Promise.all([api.get('/merchants'), api.get('/zones'), api.get('/drivers')])
      .then(([m, z, d]) => {
        setMerchants(m.data || []);
        setZones(z.data || []);
        setDrivers(d.data || []);
        if (m.data.length > 0) {
          setSelectedMerchantId(m.data[0].id.toString());
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const merchant = merchants.find(m => m.id.toString() === selectedMerchantId);
    if (merchant) {
      const fee = merchant.deliveryFee?.toString() || '0';
      setDeliveryFee(fee);
      
      // Update any rows that have default/unset delivery fee
      setRows(prev => prev.map(row => {
        if (!row.deliveryFee || row.deliveryFee === '0') {
          return { ...row, deliveryFee: fee };
        }
        return row;
      }));
    }
  }, [selectedMerchantId, merchants]);

  const addRow = () => {
    setRows(prev => [
      ...prev,
      { receiverName: '', receiverAddress: '', receiverPhone: '', deliveryFee: deliveryFee || '0', codUSD: '0', codKHR: '0', pickupId: '', driverId: '', note: '' }
    ]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleRowChange = (index: number, key: string, val: any) => {
    setRows(prev => prev.map((row, i) => {
      if (i === index) {
        return { ...row, [key]: val };
      }
      return row;
    }));
  };

  const handleSaveBatch = async () => {
    if (!selectedMerchantId) return alert('Please select a Shop/Merchant');
    
    // Validation
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.receiverName) {
        return alert(`Please fill Receiver Name in Row #${i + 1}`);
      }
      if (!r.receiverAddress) {
        return alert(`Please fill Location/Zone in Row #${i + 1}`);
      }
      if (!r.receiverPhone) {
        return alert(`Please fill Receiver Phone in Row #${i + 1}`);
      }
    }

    setSaving(true);
    try {
      const merchant = merchants.find(m => m.id.toString() === selectedMerchantId);
      const promises: Promise<any>[] = [];

      rows.forEach(r => {
        const codUSDNum = parseFloat(r.codUSD) || 0;
        const codKHRNum = parseFloat(r.codKHR) || 0;

        const basePayload = {
          senderName: merchant?.name || 'Shop',
          senderPhone: merchant?.phone || '000',
          merchantId: parseInt(selectedMerchantId),
          receiverName: r.receiverName,
          receiverPhone: r.receiverPhone,
          receiverAddress: r.receiverAddress,
          weight: 0.5,
          size: 'small',
          zoneId: merchant?.zoneId ? parseInt(merchant.zoneId) : undefined,
          note: r.note,
          pickupDriverId: r.pickupId ? parseInt(r.pickupId) : undefined,
          driverId: r.driverId ? parseInt(r.driverId) : undefined,
          status: r.driverId ? 'picked-up' : 'pending',
        };

        if (codUSDNum > 0 && codKHRNum > 0) {
          // Add USD order (with delivery fee)
          promises.push(api.post('/orders', {
            ...basePayload,
            cod: codUSDNum,
            codCurrency: 'USD',
            deliveryFee: parseFloat(r.deliveryFee) || 0,
          }));
          // Add KHR order (with 0 delivery fee to avoid double charging)
          promises.push(api.post('/orders', {
            ...basePayload,
            cod: codKHRNum,
            codCurrency: 'KHR',
            deliveryFee: 0,
          }));
        } else if (codKHRNum > 0) {
          promises.push(api.post('/orders', {
            ...basePayload,
            cod: codKHRNum,
            codCurrency: 'KHR',
            deliveryFee: parseFloat(r.deliveryFee) || 0,
          }));
        } else {
          promises.push(api.post('/orders', {
            ...basePayload,
            cod: codUSDNum || 0,
            codCurrency: 'USD',
            deliveryFee: parseFloat(r.deliveryFee) || 0,
          }));
        }
      });

      await Promise.all(promises);
      router.push('/delivery');
    } catch {
      alert('Error saving batch deliveries');
    }
    setSaving(false);
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
        <Topbar title={t('batchEntryTitle')} subtitle={t('batchEntrySubtitle')} />
        <div className="page-content" style={{ maxWidth: '100%' }}>
          {/* Top Panel Controls */}
          <div className="card" style={{ marginBottom: 20, padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t('shopCustomerLabel')} <span>*</span></label>
                <select
                  className="form-control"
                  value={selectedMerchantId}
                  onChange={e => setSelectedMerchantId(e.target.value)}
                >
                  {merchants.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.id}-{m.nameKh ? `${m.nameKh} (${m.name})` : m.name}
                    </option>
                  ))}
                </select>
              </div>

              <DateInput
                labelEn="Start Date"
                labelKh="កាលបរិច្ឆេទចាប់ផ្តើម"
                value={startDate}
                onChange={setStartDate}
              />

              <DateInput
                labelEn="End Date"
                labelKh="កាលបរិច្ឆេទបញ្ចប់"
                value={endDate}
                onChange={setEndDate}
              />

              <div className="form-group" style={{ marginBottom: 0, display: 'none' }}>
                <label className="form-label">{t('deliveryFee')} <span>*</span></label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={deliveryFee}
                  onChange={e => setDeliveryFee(e.target.value)}
                  style={{ background: '#f1f5f9' }}
                />
              </div>
            </div>
          </div>

          {/* Grid list */}
          <div className="card">
            <div style={{ overflowX: 'auto', padding: '16px' }}>
              <table style={{ minWidth: 1280 }}>
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>ល.រ</th>
                    <th style={{ width: 160 }}>{t('receiverNameCol')}</th>
                    <th style={{ width: 220 }}>{t('receiverAddressCol')}</th>
                    <th style={{ width: 130 }}>{t('receiverPhoneColRequired')}</th>
                    <th style={{ width: 90 }}>{t('deliveryFee')}</th>
                    <th style={{ width: 100 }}>{t('amountUSD')}</th>
                    <th style={{ width: 110 }}>{t('amountKHR')}</th>
                    <th style={{ width: 160 }}>{t('pickupPerson')}</th>
                    <th style={{ width: 160 }}>{t('deliveryPerson')}</th>
                    <th style={{ minWidth: 140 }}>{t('note')}</th>
                    <th style={{ width: 80, textAlign: 'center' }}>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Receiver Name"
                          value={row.receiverName || ''}
                          onChange={e => handleRowChange(idx, 'receiverName', e.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Address location"
                          value={row.receiverAddress}
                          onChange={e => handleRowChange(idx, 'receiverAddress', e.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. 012345678"
                          value={row.receiverPhone}
                          onChange={e => handleRowChange(idx, 'receiverPhone', e.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-control"
                          value={row.deliveryFee}
                          onChange={e => handleRowChange(idx, 'deliveryFee', e.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-control"
                          value={row.codUSD}
                          onChange={e => handleRowChange(idx, 'codUSD', e.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="100"
                          min="0"
                          className="form-control"
                          value={row.codKHR}
                          onChange={e => handleRowChange(idx, 'codKHR', e.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <select
                          className="form-control"
                          value={row.pickupId}
                          onChange={e => handleRowChange(idx, 'pickupId', e.target.value)}
                        >
                          <option value="">— Select Driver —</option>
                          {drivers.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.name} {d.nameKh ? `(${d.nameKh})` : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className="form-control"
                          value={row.driverId}
                          onChange={e => handleRowChange(idx, 'driverId', e.target.value)}
                        >
                          <option value="">— Select Driver —</option>
                          {drivers.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.name} {d.nameKh ? `(${d.nameKh})` : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Note..."
                          value={row.note}
                          onChange={e => handleRowChange(idx, 'note', e.target.value)}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            disabled={rows.length === 1}
                            style={{
                              background: '#dc2626',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              padding: '8px 12px',
                              cursor: rows.length === 1 ? 'not-allowed' : 'pointer',
                              opacity: rows.length === 1 ? 0.5 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <MdDelete size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Buttons */}
            <div style={{ padding: '20px 16px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
              <div />
              <button
                type="button"
                onClick={addRow}
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '12px 24px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: 14,
                  boxShadow: '0 4px 6px rgba(47, 85, 165, 0.1)',
                  transition: 'opacity 0.2s'
                }}
              >
                {t('addNewBtn')}
              </button>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleSaveBatch}
                  disabled={saving}
                  style={{
                    background: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '12px 28px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: 14,
                    boxShadow: '0 4px 6px rgba(47, 85, 165, 0.2)',
                    transition: 'opacity 0.2s'
                  }}
                >
                  {saving ? t('savingBatch') : t('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
