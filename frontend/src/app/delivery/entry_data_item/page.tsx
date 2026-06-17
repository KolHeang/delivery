'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { MdDelete } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';

export default function BatchEntryPage() {
  const router = useRouter();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { t } = useLanguage();
  const [selectedMerchantId, setSelectedMerchantId] = useState('');
  const [date] = useState(() => new Date().toISOString().split('T')[0]);
  const [deliveryFee, setDeliveryFee] = useState('0');
  const [entryType, setEntryType] = useState<'zone' | 'delivery'>('zone');

  const [rows, setRows] = useState<any[]>([
    { receiverAddress: '', receiverPhone: '', codCurrency: 'USD', cod: '0', pickupId: '', driverId: '', note: '' }
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
      setDeliveryFee(merchant.deliveryFee?.toString() || '0');
    }
  }, [selectedMerchantId, merchants]);

  const addRow = () => {
    setRows(prev => [
      ...prev,
      { receiverAddress: '', receiverPhone: '', codCurrency: 'USD', cod: '0', pickupId: '', driverId: '', note: '' }
    ]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleRowChange = (index: number, key: string, val: any) => {
    setRows(prev => prev.map((row, i) => i === index ? { ...row, [key]: val } : row));
  };

  const handleSaveBatch = async () => {
    if (!selectedMerchantId) return alert('Please select a Shop/Merchant');
    
    // Validation
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.receiverAddress || !r.receiverPhone) {
        return alert(`Please fill required fields (Location and Receiver Phone) in Row #${i + 1}`);
      }
    }

    setSaving(true);
    try {
      const merchant = merchants.find(m => m.id.toString() === selectedMerchantId);
      const promises = rows.map(r => {
        const driverIdVal = entryType === 'delivery' ? r.driverId : r.pickupId;
        const payload = {
          senderName: merchant?.name || 'Shop',
          senderPhone: merchant?.phone || '000',
          merchantId: parseInt(selectedMerchantId),
          receiverName: `Customer ${r.receiverPhone}`,
          receiverPhone: r.receiverPhone,
          receiverAddress: r.receiverAddress,
          weight: 0.5,
          size: 'small',
          cod: parseFloat(r.cod) || 0,
          codCurrency: r.codCurrency || 'USD',
          deliveryFee: parseFloat(deliveryFee) || 0,
          zoneId: merchant?.zoneId ? parseInt(merchant.zoneId) : undefined,
          note: r.note,
          driverId: driverIdVal ? parseInt(driverIdVal) : undefined,
          status: driverIdVal ? 'picked-up' : 'pending',
        };
        return api.post('/orders', payload);
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, alignItems: 'end' }}>
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

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t('dateLabel')}</label>
                <input
                  type="text"
                  className="form-control"
                  value={date}
                  disabled
                  style={{ background: '#f1f5f9', color: '#64748b' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
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

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'block', marginBottom: 8 }}>{t('typeEntryData')} <span>*</span></label>
                <div style={{ display: 'flex', gap: 16, height: 38, alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="entryType"
                      checked={entryType === 'zone'}
                      onChange={() => setEntryType('zone')}
                      style={{ width: 16, height: 16 }}
                    />
                    {t('byZone')}
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="entryType"
                      checked={entryType === 'delivery'}
                      onChange={() => setEntryType('delivery')}
                      style={{ width: 16, height: 16 }}
                    />
                    {t('byDelivery')}
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Grid list */}
          <div className="card">
            <div style={{ overflowX: 'auto', padding: '16px' }}>
              <table style={{ minWidth: 1000 }}>
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>#</th>
                    <th>{t('locationCol')} *</th>
                    <th style={{ width: 180 }}>{t('receiverPhoneColRequired')} *</th>
                    <th style={{ width: 110 }}>{t('currencyCol')} *</th>
                    <th style={{ width: 150 }}>{t('codPodCol')} *</th>
                    <th style={{ width: 180 }}>{t('pickupPerson')}</th>
                    {entryType === 'delivery' && (
                      <th style={{ width: 180 }}>{t('deliveryPerson')}</th>
                    )}
                    <th style={{ width: 160 }}>{t('note')}</th>
                    <th style={{ width: 180, textAlign: 'center' }}>{t('actions')}</th>
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
                        <select
                          className="form-control"
                          value={row.codCurrency}
                          onChange={e => handleRowChange(idx, 'codCurrency', e.target.value)}
                          required
                        >
                          <option value="USD">USD</option>
                          <option value="KHR">KHR</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          step={row.codCurrency === 'KHR' ? '100' : '0.01'}
                          min="0"
                          className="form-control"
                          value={row.cod}
                          onChange={e => handleRowChange(idx, 'cod', e.target.value)}
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
                      {entryType === 'delivery' && (
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
                      )}
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
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={addRow}
                            style={{
                              background: 'var(--accent)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              padding: '8px 12px',
                              fontSize: 12,
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            {t('addNewBtn')}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            disabled={rows.length === 1}
                            style={{
                              background: '#dc2626',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              padding: '8px',
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

            {/* Save Button */}
            <div style={{ padding: '20px 16px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)' }}>
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
  );
}
