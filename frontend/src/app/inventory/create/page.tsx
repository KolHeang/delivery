'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { MdArrowBack, MdSave, MdInventory2 } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';

export default function CreateProductPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();

  const [merchants, setMerchants] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    nameKh: '',
    sku: `SKU-${Date.now().toString().slice(-6)}`,
    barcode: '',
    merchantId: '',
    price: 0,
    costPrice: 0,
    quantity: 0,
    minStockAlert: 5,
    unit: 'pcs',
    category: '',
    description: '',
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/auth');
      return;
    }
    const loadMerchants = async () => {
      try {
        const res = await api.get('/select/merchants');
        setMerchants(Array.isArray(res.data) ? res.data : (res.data?.result || []));
      } catch (err) {
        console.error('Failed to load merchants:', err);
      }
    };
    loadMerchants();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.sku.trim()) {
      alert(lang === 'km' ? 'សូមបញ្ចូលឈ្មោះទំនិញ និង SKU' : 'Please provide product name and SKU');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        nameKh: form.nameKh.trim() || undefined,
        sku: form.sku.trim(),
        barcode: form.barcode.trim() || undefined,
        merchantId: form.merchantId ? Number(form.merchantId) : undefined,
        price: Number(form.price) || 0,
        costPrice: Number(form.costPrice) || 0,
        quantity: Number(form.quantity) || 0,
        minStockAlert: Number(form.minStockAlert) || 5,
        unit: form.unit.trim() || 'pcs',
        category: form.category.trim() || undefined,
        description: form.description.trim() || undefined,
      };

      await api.post('/inventory/products', payload);
      alert(lang === 'km' ? 'បង្កើតទំនិញបានជោគជ័យ!' : 'Product created successfully!');
      router.push('/inventory');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar
          title={lang === 'km' ? 'បង្កើតទំនិញថ្មី' : 'Add New Product'}
          subtitle={lang === 'km' ? 'បញ្ចូលទំនិញ និងកំណត់ចំនួនស្តុកដំបូង' : 'Create a new inventory product'}
        />

        <div className="page-content">
          {/* Header Action Bar */}
          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">
                {lang === 'km' ? '📦 បង្កើតទំនិញថ្មីក្នុងស្តុក' : '📦 Create New Inventory Product'}
              </h1>
              <p className="page-subtitle">
                {lang === 'km'
                  ? 'កំណត់ព័ត៌មានលម្អិត តម្លៃ និងចំនួនស្តុកសម្រាប់ទំនិញ'
                  : 'Fill in product details, pricing, and initial stock count'}
              </p>
            </div>
            <div className="page-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => router.push('/inventory')}
              >
                <MdArrowBack size={18} />
                {lang === 'km' ? 'ត្រឡប់ក្រោយ' : 'Back to Inventory'}
              </button>
            </div>
          </div>

          {/* Form Card */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                {lang === 'km' ? 'ព័ត៌មានទំនិញ (Product Details)' : 'Product Details'}
              </span>
            </div>

            <div className="card-body">
              <form onSubmit={handleSubmit}>
                {/* Name EN & KH */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      {lang === 'km' ? 'ឈ្មោះទំនិញ (EN)' : 'Product Name (EN)'} <span>*</span>
                    </label>
                    <input
                      required
                      type="text"
                      className="form-control"
                      placeholder="e.g. iPhone 15 Pro Max"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      {lang === 'km' ? 'ឈ្មោះទំនិញ (KH)' : 'Product Name (KH)'}
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="ឧ. ទូរស័ព្ទ iPhone 15 Pro Max"
                      value={form.nameKh}
                      onChange={(e) => setForm({ ...form, nameKh: e.target.value })}
                    />
                  </div>
                </div>

                {/* SKU & Barcode */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      SKU <span>*</span>
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        required
                        type="text"
                        className="form-control"
                        placeholder="e.g. SKU-10029"
                        value={form.sku}
                        onChange={(e) => setForm({ ...form, sku: e.target.value })}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ whiteSpace: 'nowrap', fontSize: 12 }}
                        onClick={() => setForm({ ...form, sku: `SKU-${Date.now().toString().slice(-6)}` })}
                      >
                        Auto
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Barcode
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 885123456789 (Scannable Barcode)"
                      value={form.barcode}
                      onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    />
                  </div>
                </div>

                {/* Merchant & Unit */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      {lang === 'km' ? 'ម្ចាស់ហាង (Merchant / Shop)' : 'Merchant / Shop'}
                    </label>
                    <select
                      className="form-control"
                      value={form.merchantId}
                      onChange={(e) => setForm({ ...form, merchantId: e.target.value })}
                    >
                      <option value="">{lang === 'km' ? '— ឃ្លាំងកណ្តាល / គ្មាន —' : '— Main Warehouse / None —'}</option>
                      {merchants.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      {lang === 'km' ? 'ខ្នាត (Unit)' : 'Unit'}
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="pcs, box, kg, pack..."
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    />
                  </div>
                </div>

                {/* Category & Description */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      {lang === 'km' ? 'ប្រភេទទំនិញ (Category)' : 'Category'}
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Electronics, Clothing, Cosmetics..."
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      {lang === 'km' ? 'ការពិពណ៌នា (Description)' : 'Description'}
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Color, specs, size..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                </div>

                {/* Pricing & Initial Stock */}
                <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
                  <div className="form-group">
                    <label className="form-label">
                      {lang === 'km' ? 'តម្លៃលក់ ($)' : 'Sale Price ($)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      {lang === 'km' ? 'តម្លៃដើម ($)' : 'Cost Price ($)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control"
                      value={form.costPrice}
                      onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      {lang === 'km' ? 'ស្តុកដំបូង' : 'Initial Stock'} <span>*</span>
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      className="form-control"
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      {lang === 'km' ? 'រោទិ៍ជិតអស់ស្តុក' : 'Min Alert Qty'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={form.minStockAlert}
                      onChange={(e) => setForm({ ...form, minStockAlert: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Submit Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => router.push('/inventory')}
                  >
                    {lang === 'km' ? 'បោះបង់' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn btn-primary"
                    style={{ minWidth: 140 }}
                  >
                    <MdSave size={18} />
                    {saving ? (lang === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...') : (lang === 'km' ? 'រក្សាទុកទំនិញ' : 'Save Product')}
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
