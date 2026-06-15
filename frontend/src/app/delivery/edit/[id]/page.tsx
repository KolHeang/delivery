'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

const SIZE_OPTIONS = ['small', 'medium', 'large'];

export default function EditOrderPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);

  const [form, setForm] = useState({
    senderName: '', senderPhone: '',
    receiverName: '', receiverPhone: '', receiverAddress: '',
    weight: 0.5, size: 'small', cod: 0, codCurrency: 'USD', deliveryFee: 0,
    note: '', merchantId: '', customerId: '', driverId: '', zoneId: ''
  });

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }

    const init = async () => {
      try {
        const [m, c, z, orderRes] = await Promise.all([
          api.get('/merchants'),
          api.get('/customers'),
          api.get('/zones'),
          api.get(`/orders/${params.id}`)
        ]);

        setMerchants(m.data || []);
        setCustomers(c.data || []);
        setZones(z.data || []);

        const o = orderRes.data;
        setForm({
          senderName: o.senderName || '', senderPhone: o.senderPhone || '',
          receiverName: o.receiverName || '', receiverPhone: o.receiverPhone || '',
          receiverAddress: o.receiverAddress || '', weight: o.weight || 0.5, size: o.size || 'small',
          cod: o.cod || 0, codCurrency: o.codCurrency || 'USD', deliveryFee: o.deliveryFee || 0, note: o.note || '',
          merchantId: o.merchantId || '', customerId: o.customerId || '',
          driverId: o.driverId || '', zoneId: o.zoneId || ''
        });
      } catch (err) {
        console.error('Failed to load order', err);
        alert('Failed to load order data.');
        router.push('/delivery');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [params.id, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        merchantId: form.merchantId ? parseInt(form.merchantId as string) : undefined,
        customerId: form.customerId ? parseInt(form.customerId as string) : undefined,
        driverId: form.driverId ? parseInt(form.driverId as string) : undefined,
        zoneId: form.zoneId ? parseInt(form.zoneId as string) : undefined,
        codCurrency: form.codCurrency || 'USD'
      };
      await api.patch(`/orders/${params.id}`, payload);
      router.push('/delivery');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error saving delivery');
    }
    setSaving(false);
  };

  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Topbar title={`Edit Order #${params.id}`} subtitle="Loading data..." />
          <div className="loading-wrapper"><div className="spinner" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={`Edit Order #${params.id}`} subtitle="Update delivery details" />
        <div className="page-content">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Order Information</span>
            </div>
            <div className="card-body">
              <form onSubmit={handleSave}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Sender Name <span>*</span></label>
                    <input className="form-control" value={form.senderName} onChange={f('senderName')} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sender Phone <span>*</span></label>
                    <input className="form-control" value={form.senderPhone} onChange={f('senderPhone')} required />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Receiver Name <span>*</span></label>
                    <input className="form-control" value={form.receiverName} onChange={f('receiverName')} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Receiver Phone <span>*</span></label>
                    <input className="form-control" value={form.receiverPhone} onChange={f('receiverPhone')} required />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Receiver Address <span>*</span></label>
                  <input className="form-control" value={form.receiverAddress} onChange={f('receiverAddress')} required />
                </div>
                
                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Weight (kg)</label>
                    <input type="number" step="0.1" min="0" className="form-control" value={form.weight} onChange={f('weight')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Size</label>
                    <select className="form-control" value={form.size} onChange={f('size')}>
                      {SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Zone</label>
                    <select className="form-control" value={form.zoneId} onChange={f('zoneId')}>
                      <option value="">— Select Zone —</option>
                      {zones.map((z: any) => <option key={z.id} value={z.id}>{z.name} (${z.price})</option>)}
                    </select>
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">COD Amount</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select className="form-control" style={{ maxWidth: 90 }} value={form.codCurrency} onChange={f('codCurrency')}>
                        <option value="USD">$ USD</option>
                        <option value="KHR">៛ KHR</option>
                      </select>
                      <input type="number" step={form.codCurrency === 'KHR' ? '1000' : '0.01'} min="0" className="form-control" value={form.cod} onChange={f('cod')} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Delivery Fee ($)</label>
                    <input type="number" step="0.01" min="0" className="form-control" value={form.deliveryFee} onChange={f('deliveryFee')} />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('merchant')}</label>
                    <select className="form-control" value={form.merchantId} onChange={f('merchantId')}>
                      <option value="">{t('selectMerchant')}</option>
                      {merchants.map((m: any) => <option key={m.id} value={m.id}>{m.name}{m.nameKh ? ` / ${m.nameKh}` : ''}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('customer')}</label>
                    <select className="form-control" value={form.customerId} onChange={f('customerId')}>
                      <option value="">{t('selectCustomer')}</option>
                      {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Note</label>
                  <input className="form-control" value={form.note} onChange={f('note')} placeholder="Optional note..." />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                  <button type="button" className="btn btn-outline" onClick={() => router.push('/delivery')}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
