'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { MdAdd, MdDelete, MdSave } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';

interface BatchRow {
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  weight: number;
  cod: number;
  codCurrency: string;
  deliveryFee: number;
  zoneId: string;
  note: string;
}

export default function BatchEntryPage() {
  const router = useRouter();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { t } = useLanguage();
  const [selectedMerchantId, setSelectedMerchantId] = useState('');
  const [rows, setRows] = useState<BatchRow[]>([
    { receiverName: '', receiverPhone: '', receiverAddress: '', weight: 0.5, cod: 0, codCurrency: 'USD', deliveryFee: 0, zoneId: '', note: '' },
  ]);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    Promise.all([api.get('/merchants'), api.get('/zones')])
      .then(([m, z]) => {
        setMerchants(m.data || []);
        setZones(z.data || []);
        if (m.data.length > 0) setSelectedMerchantId(m.data[0].id.toString());
        if (z.data.length > 0) {
          setRows([
            { receiverName: '', receiverPhone: '', receiverAddress: '', weight: 0.5, cod: 0, codCurrency: 'USD', deliveryFee: z.data[0].price, zoneId: z.data[0].id.toString(), note: '' },
          ]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const addRow = () => {
    const defaultZone = zones[0];
    setRows(prev => [
      ...prev,
      {
        receiverName: '',
        receiverPhone: '',
        receiverAddress: '',
        weight: 0.5,
        cod: 0,
        codCurrency: 'USD',
        deliveryFee: defaultZone ? defaultZone.price : 0,
        zoneId: defaultZone ? defaultZone.id.toString() : '',
        note: '',
      },
    ]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleRowChange = (index: number, key: keyof BatchRow, val: any) => {
    setRows(prev => prev.map((row, i) => {
      if (i === index) {
        const updated = { ...row, [key]: val };
        if (key === 'zoneId') {
          const zoneObj = zones.find(z => z.id.toString() === val);
          if (zoneObj) {
            updated.deliveryFee = zoneObj.price;
          }
        }
        return updated;
      }
      return row;
    }));
  };

  const handleSaveBatch = async () => {
    if (!selectedMerchantId) return alert('Please select a Shop/Merchant');
    // Validation
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.receiverName || !r.receiverPhone || !r.receiverAddress || !r.zoneId) {
        return alert(`Please fill all required fields in Row #${i + 1}`);
      }
    }

    setSaving(true);
    try {
      const merchant = merchants.find(m => m.id.toString() === selectedMerchantId);
      const promises = rows.map(r => {
        const payload = {
          senderName: merchant?.name || 'Shop',
          senderPhone: merchant?.phone || '000',
          merchantId: parseInt(selectedMerchantId),
          receiverName: r.receiverName,
          receiverPhone: r.receiverPhone,
          receiverAddress: r.receiverAddress,
          weight: parseFloat(r.weight as any),
          size: 'small',
          cod: parseFloat(r.cod as any),
          codCurrency: r.codCurrency || 'USD',
          deliveryFee: parseFloat(r.deliveryFee as any),
          zoneId: parseInt(r.zoneId),
          note: r.note,
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
          <div className="card" style={{ marginBottom: 20, padding: 20 }}>
            <div style={{ maxWidth: 400 }}>
              <label className="form-label">{t('selectShopMerchant')} <span>*</span></label>
              <select
                className="form-control"
                value={selectedMerchantId}
                onChange={e => setSelectedMerchantId(e.target.value)}
              >
                {merchants.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}{m.nameKh ? ` / ${m.nameKh}` : ''} - {m.contact}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid list */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title">📦 {t('parcelBatchMatrix')}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={addRow}>
                  <MdAdd size={16} /> {t('addRow')}
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleSaveBatch} disabled={saving}>
                  <MdSave size={16} /> {saving ? t('savingBatch') : t('submitBatch')}
                </button>
              </div>
            </div>
            <div style={{ overflowX: 'auto', padding: '16px' }}>
              <table style={{ minWidth: 1000 }}>
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>#</th>
                    <th style={{ width: 180 }}>{t('receiverNameCol')}</th>
                    <th style={{ width: 150 }}>{t('receiverPhoneCol')}</th>
                    <th>{t('receiverAddressCol')}</th>
                    <th style={{ width: 160 }}>{t('zoneCol')}</th>
                    <th style={{ width: 160 }}>{t('cod')}</th>
                    <th style={{ width: 110 }}>{t('feeCol')}</th>
                    <th style={{ width: 180 }}>{t('note')}</th>
                    <th style={{ width: 60 }}>{t('actionCol')}</th>
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
                          placeholder="Receiver name"
                          value={row.receiverName}
                          onChange={e => handleRowChange(idx, 'receiverName', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="012-345-678"
                          value={row.receiverPhone}
                          onChange={e => handleRowChange(idx, 'receiverPhone', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Full delivery address"
                          value={row.receiverAddress}
                          onChange={e => handleRowChange(idx, 'receiverAddress', e.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          className="form-control"
                          value={row.zoneId}
                          onChange={e => handleRowChange(idx, 'zoneId', e.target.value)}
                        >
                          {zones.map(z => (
                            <option key={z.id} value={z.id}>{z.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <select
                            className="form-control"
                            style={{ maxWidth: 75 }}
                            value={row.codCurrency}
                            onChange={e => handleRowChange(idx, 'codCurrency', e.target.value)}
                          >
                            <option value="USD">$</option>
                            <option value="KHR">៛</option>
                          </select>
                          <input
                            type="number"
                            step={row.codCurrency === 'KHR' ? '1000' : '0.01'}
                            min="0"
                            className="form-control"
                            value={row.cod}
                            onChange={e => handleRowChange(idx, 'cod', e.target.value)}
                          />
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-control"
                          value={row.deliveryFee}
                          onChange={e => handleRowChange(idx, 'deliveryFee', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Optional notes"
                          value={row.note}
                          onChange={e => handleRowChange(idx, 'note', e.target.value)}
                        />
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-icon"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => removeRow(idx)}
                          disabled={rows.length === 1}
                        >
                          <MdDelete size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
