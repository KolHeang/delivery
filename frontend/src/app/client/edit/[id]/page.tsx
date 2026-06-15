'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

export default function EditShopPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useLanguage();
  
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    nameKh: '',
    contact: '',
    phone: '',
    email: '',
    address: '',
    pricingTier: 'standard',
    zoneId: '',
  });

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    
    const load = async () => {
      try {
        const [zonesRes, shopRes] = await Promise.all([
          api.get('/zones'),
          api.get(`/merchants/${params.id}`)
        ]);
        
        setZones(zonesRes.data || []);
        
        const shop = shopRes.data;
        if (shop) {
          setForm({
            name: shop.name || '',
            nameKh: shop.nameKh || '',
            contact: shop.contact || '',
            phone: shop.phone || '',
            email: shop.email || '',
            address: shop.address || '',
            pricingTier: shop.pricingTier || 'standard',
            zoneId: shop.zoneId ? shop.zoneId.toString() : '',
          });
        }
      } catch (err) {
        console.error('Failed to load shop details', err);
        alert('Failed to load shop details.');
        router.push('/client');
      }
      setLoading(false);
    };
    
    load();
  }, [params.id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        zoneId: form.zoneId ? parseInt(form.zoneId) : undefined,
      };
      await api.patch(`/merchants/${params.id}`, payload);
      router.push('/client');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating shop');
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('editShop')} subtitle="Loading data..." />
        <div className="loading-wrapper"><div className="spinner" /></div>
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('editShop')} subtitle="Update merchant account details" />
        <div className="page-content">
          <div className="card">
            <div className="card-header"><span className="card-title">🏪 {t('editShop')}</span></div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('shopNameEn')} <span>*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Zando Shop"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('shopNameKh')}</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. ហាងហ្សង់ដូ"
                      value={form.nameKh}
                      onChange={e => setForm({ ...form, nameKh: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('contact')} <span>*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Channy"
                      value={form.contact}
                      onChange={e => setForm({ ...form, contact: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('phone')} <span>*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 012-100-200"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('email')} <span>*</span></label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. contact@zando.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('zone')} <span>*</span></label>
                    <select
                      className="form-control"
                      value={form.zoneId}
                      onChange={e => setForm({ ...form, zoneId: e.target.value })}
                      required
                    >
                      <option value="">{t('selectZone')}</option>
                      {zones.map(z => (
                        <option key={z.id} value={z.id}>{z.name} (${z.price})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('pricingTier')}</label>
                    <select
                      className="form-control"
                      value={form.pricingTier}
                      onChange={e => setForm({ ...form, pricingTier: e.target.value })}
                    >
                      <option value="basic">Basic</option>
                      <option value="standard">Standard</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('address')} <span>*</span></label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Full pickup address..."
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                    required
                  />
                </div>

                <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-outline" onClick={() => router.push('/client')}>
                    {t('cancel')}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? t('saving') : t('save')}
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
