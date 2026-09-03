'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { MdDelete, MdAdd, MdSave } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';
import DateInput, { getLocalDateString } from '@/components/ui/DateInput';

export default function BatchEntryPage() {
  const router = useRouter();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [, setZones] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { t, lang } = useLanguage();
  const [selectedMerchantId, setSelectedMerchantId] = useState('');
  const [parcelDate, setParcelDate] = useState(() => getLocalDateString());
  const [deliveryFee, setDeliveryFee] = useState('1.25');

  const [rows, setRows] = useState<any[]>([
    { receiverName: '-', receiverAddress: '', receiverPhone: '', deliveryFee: '1.25', codUSD: '0', codKHR: '0', pickupId: '', driverId: '', note: '' }
  ]);

  const [rowErrors, setRowErrors] = useState<Record<number, { receiverAddress?: string; receiverPhone?: string }>>({});

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    Promise.all([api.get('/select/merchants'), api.get('/select/zones'), api.get('/select/drivers')])
      .then(([m, z, d]) => {
        const mList = Array.isArray(m.data) ? m.data : (m.data?.result || []);
        const zList = Array.isArray(z.data) ? z.data : (z.data?.result || []);
        const dList = Array.isArray(d.data) ? d.data : (d.data?.result || []);
        setMerchants(mList);
        setZones(zList);
        setDrivers(dList);
        if (mList.length > 0) {
          setSelectedMerchantId(mList[0].id.toString());
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const merchant = merchants.find(m => m.id.toString() === selectedMerchantId);
    if (merchant) {
      let fee = merchant.deliveryFee?.toString() || '0';
      if (parseFloat(fee) === 0) {
        fee = '1.25';
      }
      const prevDeliveryFee = deliveryFee;
      setDeliveryFee(fee);
      
      // Update any rows that have default/unset delivery fee, or matching previous merchant's default fee
      setRows(prev => prev.map(row => {
        if (!row.deliveryFee || parseFloat(row.deliveryFee) === 0 || row.deliveryFee === prevDeliveryFee) {
          return { ...row, deliveryFee: fee };
        }
        return row;
      }));
    }
  }, [selectedMerchantId, merchants]);

  const addRow = () => {
    setRows(prev => [
      ...prev,
      { receiverName: '-', receiverAddress: '', receiverPhone: '', deliveryFee: deliveryFee || '1.25', codUSD: '0', codKHR: '0', pickupId: '', driverId: '', note: '' }
    ]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(prev => prev.filter((_, i) => i !== index));
    setRowErrors(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const handleRowChange = (index: number, key: string, val: any) => {
    setRows(prev => prev.map((row, i) => {
      if (i === index) {
        return { ...row, [key]: val };
      }
      return row;
    }));
    if (rowErrors[index] && (rowErrors[index] as any)[key]) {
      setRowErrors(prev => ({
        ...prev,
        [index]: {
          ...prev[index],
          [key]: undefined
        }
      }));
    }
  };

  const handleSaveBatch = async () => {
    if (!selectedMerchantId) return alert(lang === 'km' ? 'សូមជ្រើសរើសហាង/អតិថិជន' : 'Please select a Shop/Merchant');
    
    // Validation
    const errs: Record<number, { receiverAddress?: string; receiverPhone?: string }> = {};
    let hasError = false;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowErr: { receiverAddress?: string; receiverPhone?: string } = {};
      if (!r.receiverAddress.trim()) {
        rowErr.receiverAddress = 'សូមបំពេញអាសយដ្ឋាន';
        hasError = true;
      }
      if (!r.receiverPhone.trim()) {
        rowErr.receiverPhone = 'សូមបំពេញលេខទូរស័ព្ទ';
        hasError = true;
      }
      if (Object.keys(rowErr).length > 0) {
        errs[i] = rowErr;
      }
    }

    if (hasError) {
      setRowErrors(errs);
      return;
    }

    setRowErrors({});
    setSaving(true);
    try {
      const merchant = merchants.find(m => m.id.toString() === selectedMerchantId);

      for (const r of rows) {
        const codUSDNum = parseFloat(r.codUSD) || 0;
        const codKHRNum = parseFloat(r.codKHR) || 0;

        const customDate = new Date();
        if (parcelDate) {
          const [year, month, day] = parcelDate.split('-').map(Number);
          customDate.setFullYear(year);
          customDate.setMonth(month - 1);
          customDate.setDate(day);
        }

        const basePayload = {
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
          createdAt: customDate.toISOString(),
        };

        if (codUSDNum > 0 && codKHRNum > 0) {
          // Add USD order (with delivery fee)
          await api.post('/parcels', {
            ...basePayload,
            cod: codUSDNum,
            codCurrency: 'USD',
            deliveryFee: parseFloat(r.deliveryFee) || 0,
          });
          // Add KHR order (with 0 delivery fee to avoid double charging)
          await api.post('/parcels', {
            ...basePayload,
            cod: codKHRNum,
            codCurrency: 'KHR',
            deliveryFee: 0,
          });
        } else if (codKHRNum > 0) {
          await api.post('/parcels', {
            ...basePayload,
            cod: codKHRNum,
            codCurrency: 'KHR',
            deliveryFee: parseFloat(r.deliveryFee) || 0,
          });
        } else {
          await api.post('/parcels', {
            ...basePayload,
            cod: codUSDNum || 0,
            codCurrency: 'USD',
            deliveryFee: parseFloat(r.deliveryFee) || 0,
          });
        }
      }

      router.push('/delivery');
    } catch (err: any) {
      console.error('Batch save failed', err);
      alert('Error saving batch deliveries: ' + (err.response?.data?.message || err.message));
    }
    setSaving(false);
  };

  const totalCodUSD = rows.reduce((acc, r) => acc + (parseFloat(r.codUSD) || 0), 0);
  const totalCodKHR = rows.reduce((acc, r) => acc + (parseFloat(r.codKHR) || 0), 0);

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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>{t('shopCustomerLabel')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select
                  className="form-control"
                  value={selectedMerchantId}
                  onChange={e => setSelectedMerchantId(e.target.value)}
                  style={{ height: 42, fontSize: 13.5 }}
                >
                  {merchants.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.id}-{m.nameKh ? `${m.nameKh} (${m.name})` : m.name}
                    </option>
                  ))}
                </select>
              </div>

              <DateInput
                labelEn="Parcel Date"
                labelKh="កាលបរិច្ឆេទបញ្ចូល"
                value={parcelDate}
                onChange={setParcelDate}
              />
            </div>
          </div>

          {/* Grid list */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ minWidth: 1050, width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#2f55a5' }}>
                    <th style={{ width: 45, padding: '12px 8px', textAlign: 'center', background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{lang === 'km' ? 'ល.រ' : 'No.'}</th>
                    <th style={{ width: 180, padding: '12px 8px', background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('receiverAddressCol')} *</th>
                    <th style={{ width: 130, padding: '12px 8px', background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('receiverPhoneColRequired')}</th>
                    <th style={{ width: 85, padding: '12px 8px', background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('deliveryFee')}</th>
                    <th style={{ width: 95, padding: '12px 8px', background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('amountUSD')}</th>
                    <th style={{ width: 105, padding: '12px 8px', background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('amountKHR')}</th>
                    <th style={{ width: 145, padding: '12px 8px', background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('pickupPerson')}</th>
                    <th style={{ width: 145, padding: '12px 8px', background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('deliveryPerson')}</th>
                    <th style={{ width: 120, padding: '12px 8px', background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('note')}</th>
                    <th style={{ width: 60, padding: '12px 8px', textAlign: 'center', background: '#2f55a5', color: '#ffffff', fontWeight: 700, fontSize: 13, border: 'none' }}>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 6px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 6px' }}>
                        <input
                          type="text"
                          className={`form-control ${rowErrors[idx]?.receiverAddress ? 'is-invalid' : ''}`}
                          placeholder={lang === 'km' ? 'ទីតាំង / អាសយដ្ឋាន' : 'Address location'}
                          value={row.receiverAddress}
                          onChange={e => handleRowChange(idx, 'receiverAddress', e.target.value)}
                          style={{ height: 38, fontSize: 13 }}
                        />
                        {rowErrors[idx]?.receiverAddress && (
                          <div className="form-error-text" style={{ fontSize: '11px', marginTop: '2px' }}>
                            {rowErrors[idx].receiverAddress}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        <input
                          type="text"
                          className={`form-control ${rowErrors[idx]?.receiverPhone ? 'is-invalid' : ''}`}
                          placeholder={lang === 'km' ? 'ឧ. 012345678' : 'e.g. 012345678'}
                          value={row.receiverPhone}
                          onChange={e => handleRowChange(idx, 'receiverPhone', e.target.value)}
                          style={{ height: 38, fontSize: 13 }}
                        />
                        {rowErrors[idx]?.receiverPhone && (
                          <div className="form-error-text" style={{ fontSize: '11px', marginTop: '2px' }}>
                            {rowErrors[idx].receiverPhone}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-control"
                          value={row.deliveryFee}
                          onChange={e => handleRowChange(idx, 'deliveryFee', e.target.value)}
                          required
                          style={{ height: 38, fontSize: 13, textAlign: 'right' }}
                        />
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-control"
                          value={row.codUSD}
                          onChange={e => handleRowChange(idx, 'codUSD', e.target.value)}
                          required
                          style={{ height: 38, fontSize: 13, textAlign: 'right' }}
                        />
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        <input
                          type="number"
                          step="100"
                          min="0"
                          className="form-control"
                          value={row.codKHR}
                          onChange={e => handleRowChange(idx, 'codKHR', e.target.value)}
                          required
                          style={{ height: 38, fontSize: 13, textAlign: 'right' }}
                        />
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        <select
                          className="form-control"
                          value={row.pickupId}
                          onChange={e => handleRowChange(idx, 'pickupId', e.target.value)}
                          style={{ height: 38, fontSize: 12.5 }}
                        >
                          <option value="">{lang === 'km' ? '— ជ្រើសរើសអ្នកដឹក —' : '— Select Driver —'}</option>
                          {drivers.map(d => (
                            <option key={d.id} value={d.id}>
                              {lang === 'km' ? (d.nameKh || d.name) : (d.name || d.nameKh)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        <select
                          className="form-control"
                          value={row.driverId}
                          onChange={e => handleRowChange(idx, 'driverId', e.target.value)}
                          style={{ height: 38, fontSize: 12.5 }}
                        >
                          <option value="">{lang === 'km' ? '— ជ្រើសរើសអ្នកដឹក —' : '— Select Driver —'}</option>
                          {drivers.map(d => (
                            <option key={d.id} value={d.id}>
                              {lang === 'km' ? (d.nameKh || d.name) : (d.name || d.nameKh)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder={lang === 'km' ? 'ចំណាំ...' : 'Note...'}
                          value={row.note}
                          onChange={e => handleRowChange(idx, 'note', e.target.value)}
                          style={{ height: 38, fontSize: 13 }}
                        />
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          disabled={rows.length === 1}
                          title={lang === 'km' ? 'លុបជួរនេះ' : 'Delete Row'}
                          style={{
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            borderRadius: 8,
                            padding: '8px 10px',
                            cursor: rows.length === 1 ? 'not-allowed' : 'pointer',
                            opacity: rows.length === 1 ? 0.4 : 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s'
                          }}
                        >
                          <MdDelete size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer summary & actions */}
            <div style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-card)'
            }}>
              {/* Left metrics */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  📦 {rows.length} {lang === 'km' ? 'កញ្ចប់' : 'parcels'}
                </span>
                {(totalCodUSD > 0 || totalCodKHR > 0) && (
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-light)', padding: '3px 10px', borderRadius: 8 }}>
                    💰 COD: {totalCodUSD > 0 ? `$${totalCodUSD.toFixed(2)}` : ''} {totalCodUSD > 0 && totalCodKHR > 0 ? ' | ' : ''} {totalCodKHR > 0 ? `${totalCodKHR.toLocaleString()} ៛` : ''}
                  </span>
                )}
              </div>

              {/* Center & Right buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={addRow}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 18px',
                    fontSize: 13.5,
                    fontWeight: 600,
                    borderRadius: 8,
                  }}
                >
                  <MdAdd size={18} /> {lang === 'km' ? 'បន្ថែមជួរថ្មី' : t('addNewBtn')}
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveBatch}
                  disabled={saving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 24px',
                    fontSize: 13.5,
                    fontWeight: 700,
                    borderRadius: 8,
                    minHeight: 38,
                    boxShadow: '0 4px 12px rgba(47, 85, 165, 0.25)',
                  }}
                >
                  <MdSave size={18} />
                  {saving ? (lang === 'km' ? 'កំពុងរក្សាទុក...' : t('savingBatch')) : (lang === 'km' ? 'រក្សាទុកទាំងអស់' : t('save'))}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
