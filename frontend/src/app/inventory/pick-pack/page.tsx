'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';
import {
  MdQrCodeScanner,
  MdCheckCircle,
  MdRadioButtonUnchecked,
  MdLocalShipping,
  MdSearch,
  MdDoneAll,
  MdRefresh,
} from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';

export default function PickPackPage() {
  const router = useRouter();
  const { lang } = useLanguage();

  const [parcels, setParcels] = useState<any[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<any>(null);
  const [parcelItems, setParcelItems] = useState<any[]>([]);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/auth');
    }
  }, [router]);

  // Load orders waiting for packing
  const loadParcels = async () => {
    setLoading(true);
    try {
      const res = await api.get('/parcels', {
        params: {
          limit: 50,
          status: 'pending',
        },
      });
      const data = res.data?.result || res.data || [];
      setParcels(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load parcels:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParcels();
  }, []);

  // When a parcel is selected, fetch its items and focus scanner
  const handleSelectParcel = async (parcel: any) => {
    setSelectedParcel(parcel);
    setScanMessage(null);
    setScannedBarcode('');
    try {
      const res = await api.get(`/inventory/parcels/${parcel.id}/items`);
      setParcelItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load parcel items:', err);
      setParcelItems([]);
    }
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };

  // Handle barcode scanning (Enter key from scanner gun or submit)
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParcel || !scannedBarcode.trim()) return;

    const barcode = scannedBarcode.trim();
    try {
      const res = await api.post('/inventory/pick-pack/scan', {
        parcelId: selectedParcel.id,
        barcode,
      });

      if (res.data?.success) {
        setScanMessage({
          text: res.data.message || (lang === 'km' ? 'បានផ្ទៀងផ្ទាត់ទំនិញជោគជ័យ!' : 'Item verified!'),
          type: 'success',
        });
        // Refresh items
        const updated = await api.get(`/inventory/parcels/${selectedParcel.id}/items`);
        setParcelItems(Array.isArray(updated.data) ? updated.data : []);
      }
    } catch (err: any) {
      setScanMessage({
        text: err.response?.data?.message || (lang === 'km' ? 'Barcode មិនត្រូវនឹងទំនិញក្នុងកញ្ចប់នេះទេ!' : 'Barcode mismatch!'),
        type: 'error',
      });
    } finally {
      setScannedBarcode('');
      barcodeInputRef.current?.focus();
    }
  };

  const allItemsPicked =
    parcelItems.length > 0 && parcelItems.every((item) => item.isPicked);
  const pickedCount = parcelItems.filter((i) => i.isPicked).length;
  const progressPercent =
    parcelItems.length > 0 ? Math.round((pickedCount / parcelItems.length) * 100) : 0;

  // Filter parcels
  const filteredParcels = parcels.filter(
    (p) =>
      p.trackingCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.receiverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.receiverPhone?.includes(searchTerm),
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar
          title={lang === 'km' ? 'ស្កេនរៀបចំអីវ៉ាន់ (Pick & Pack)' : 'Pick & Pack Barcode Scanner'}
          subtitle={lang === 'km' ? 'ផ្ទៀងផ្ទាត់មុខទំនិញមុននឹងប្រគល់ឱ្យអ្នកដឹក' : 'Verify items before driver dispatch'}
        />

        <div className="page-content">
          {/* Header Action Bar */}
          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">
                {lang === 'km' ? 'ស្កេនរៀបចំអីវ៉ាន់តាម Barcode' : 'Barcode Pick & Pack Verification'}
              </h1>
              <p className="page-subtitle">
                {lang === 'km'
                  ? 'ស្កេន Barcode ផ្ទៀងផ្ទាត់មុខទំនិញមុននឹងប្រគល់ឱ្យអ្នកដឹកជញ្ជូន'
                  : 'Scan item barcodes to verify order contents before dispatch'}
              </p>
            </div>
            <div className="page-actions">
              <button
                className="btn btn-secondary"
                onClick={loadParcels}
              >
                <MdRefresh size={18} />
                {lang === 'km' ? 'ផ្ទុកឡើងវិញ' : 'Refresh Orders'}
              </button>
            </div>
          </div>

          {/* Main Grid: Left = Orders List, Right = Scanner & Checklist */}
          <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20 }}>
            {/* Left: Orders Queue */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 210px)' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="card-title">📦 {lang === 'km' ? 'កញ្ចប់រង់ចាំរៀបចំ' : 'Orders Queue'}</span>
                <span style={{ fontSize: 12, background: 'var(--accent-light)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
                  {filteredParcels.length}
                </span>
              </div>

              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ position: 'relative' }}>
                  <MdSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder={lang === 'km' ? 'ស្វែងរក Tracking, ឈ្មោះ, ទូរស័ព្ទ...' : 'Search tracking, name, phone...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: 32 }}
                  />
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Loading orders...</div>
                ) : filteredParcels.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No pending orders</div>
                ) : (
                  filteredParcels.map((p) => {
                    const isSelected = selectedParcel?.id === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelectParcel(p)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius)',
                          border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                          background: isSelected ? 'var(--accent-light)' : 'var(--bg-card)',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{p.trackingCode}</span>
                          <Badge status="info" label={p.status} />
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                          👤 {p.receiverName} ({p.receiverPhone})
                        </div>
                        {p.merchant?.name && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            🏪 {p.merchant.name}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Scanner & Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {selectedParcel ? (
                <>
                  {/* Selected Parcel Summary & Barcode Scanner Gun Input */}
                  <div className="card">
                    <div className="card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {lang === 'km' ? 'កញ្ចប់អីវ៉ាន់ដែលបានជ្រើសរើស' : 'Selected Order'}
                          </div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                            {selectedParcel.trackingCode}
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                            {selectedParcel.receiverName} • {selectedParcel.receiverPhone} • {selectedParcel.receiverAddress}
                          </div>
                        </div>

                        {/* Progress */}
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {lang === 'km' ? 'វឌ្ឍនភាពពិនិត្យ' : 'Packing Progress'}
                          </div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: allItemsPicked ? 'var(--success)' : 'var(--accent)' }}>
                            {pickedCount} / {parcelItems.length} ({progressPercent}%)
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ width: '100%', height: 8, background: 'var(--border)', borderRadius: 4, marginTop: 14, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${progressPercent}%`,
                            height: '100%',
                            background: allItemsPicked ? 'var(--success)' : 'var(--accent)',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>

                      {/* Barcode Form */}
                      <form onSubmit={handleBarcodeSubmit} style={{ marginTop: 20 }}>
                        <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <MdQrCodeScanner size={18} color="var(--accent)" />
                          {lang === 'km' ? 'ស្កេន Barcode ឬបញ្ចូល SKU នៃទំនិញ (រួចចុច Enter):' : 'Scan Barcode or Type SKU (Press Enter):'}
                        </label>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <input
                            ref={barcodeInputRef}
                            type="text"
                            autoFocus
                            className="form-control"
                            value={scannedBarcode}
                            onChange={(e) => setScannedBarcode(e.target.value)}
                            placeholder="e.g. Scan item barcode with scanner gun..."
                            style={{
                              fontSize: 16,
                              fontWeight: 600,
                              borderColor: 'var(--accent)',
                            }}
                          />
                          <button
                            type="submit"
                            className="btn btn-primary"
                          >
                            {lang === 'km' ? 'ផ្ទៀងផ្ទាត់' : 'Verify'}
                          </button>
                        </div>
                      </form>

                      {/* Feedback Alert */}
                      {scanMessage && (
                        <div
                          style={{
                            marginTop: 12,
                            padding: '10px 14px',
                            borderRadius: 'var(--radius)',
                            fontSize: 13,
                            fontWeight: 600,
                            background: scanMessage.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
                            color: scanMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
                            border: `1px solid ${scanMessage.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                          }}
                        >
                          {scanMessage.text}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Checklist of Items */}
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">
                        📋 {lang === 'km' ? 'បញ្ជីមុខទំនិញក្នុងកញ្ចប់នេះ (Order Checklist)' : 'Order Items Checklist'}
                      </span>
                    </div>

                    <div className="card-body">
                      {parcelItems.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                          {lang === 'km'
                            ? 'កញ្ចប់នេះមិនមានភ្ជាប់មុខទំនិញក្នុងស្តុកទេ (General Parcel)'
                            : 'This parcel has no tracked inventory items (General Parcel)'}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {parcelItems.map((item) => (
                            <div
                              key={item.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 16px',
                                borderRadius: 'var(--radius)',
                                border: item.isPicked ? '1px solid var(--success)' : '1px solid var(--border)',
                                background: item.isPicked ? 'var(--success-light)' : 'var(--bg-card)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                {item.isPicked ? (
                                  <MdCheckCircle size={22} color="var(--success)" />
                                ) : (
                                  <MdRadioButtonUnchecked size={22} color="var(--text-muted)" />
                                )}
                                <div>
                                  <div style={{ fontWeight: 700 }}>{item.product?.name}</div>
                                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    SKU: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.product?.sku}</span>
                                    {item.product?.barcode && ` • Barcode: ${item.product.barcode}`}
                                  </div>
                                </div>
                              </div>

                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>
                                  {lang === 'km' ? 'ចំនួន:' : 'Qty:'} {item.quantity} {item.product?.unit}
                                </div>
                                <div style={{ fontSize: 12, color: item.isPicked ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
                                  {item.isPicked
                                    ? (lang === 'km' ? '✓ បានស្កេនរួច' : '✓ Verified')
                                    : (lang === 'km' ? '⏳ រង់ចាំស្កេន' : '⏳ Waiting Scan')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* All Items Verified Banner */}
                      {allItemsPicked && (
                        <div
                          style={{
                            marginTop: 20,
                            padding: '16px 20px',
                            background: 'var(--success-light)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: 'var(--radius)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <MdDoneAll size={24} color="var(--success)" />
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--success)' }}>
                                {lang === 'km' ? 'ទំនិញគ្រប់ចំនួន ១០០%!' : 'All Items Verified 100%!'}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                {lang === 'km' ? 'កញ្ចប់នេះរួចរាល់សម្រាប់ការបញ្ជូនចេញ (Ready to Dispatch)' : 'This parcel is ready for driver dispatch'}
                              </div>
                            </div>
                          </div>

                          <button
                            className="btn btn-primary"
                            onClick={() => {
                              alert(lang === 'km' ? 'បានបញ្ជាក់កញ្ចប់អីវ៉ាន់រួចរាល់!' : 'Parcel marked ready!');
                              loadParcels();
                              setSelectedParcel(null);
                            }}
                          >
                            <MdLocalShipping size={18} />
                            {lang === 'km' ? 'រួចរាល់សម្រាប់ដឹក' : 'Ready to Dispatch'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div
                  className="card"
                  style={{
                    padding: '80px 20px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                  }}
                >
                  <MdQrCodeScanner size={64} style={{ color: 'var(--border)', marginBottom: 16 }} />
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {lang === 'km' ? 'សូមជ្រើសរើសកញ្ចប់អីវ៉ាន់ពីខាងឆ្វេង' : 'Please select an order from the left queue'}
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {lang === 'km' ? 'បន្ទាប់មកប្រើ Barcode Scanner Gun ដើម្បីស្កេនផ្ទៀងផ្ទាត់ទំនិញ' : 'Then use barcode scanner to verify packed items'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
