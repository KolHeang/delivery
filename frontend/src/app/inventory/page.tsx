'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';
import api from '@/lib/api';
import {
  MdInventory2,
  MdAdd,
  MdSearch,
  MdEdit,
  MdDelete,
  MdHistory,
  MdSwapVert,
  MdWarning,
  MdCheckCircle,
  MdQrCodeScanner,
} from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';

export default function InventoryPage() {
  const router = useRouter();
  const { lang } = useLanguage();

  const [products, setProducts] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedMerchant, setSelectedMerchant] = useState<string>('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // Adjust Stock Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [adjustForm, setAdjustForm] = useState<{
    type: 'IN' | 'OUT' | 'ADJUST' | 'DAMAGED';
    quantity: number;
    note: string;
  }>({
    type: 'IN',
    quantity: 1,
    note: '',
  });

  // History Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [movements, setMovements] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/auth');
    }
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, merchRes] = await Promise.all([
        api.get('/inventory/products', {
          params: {
            page: currentPage,
            limit: pageSize,
            search: debouncedSearch || undefined,
            merchantId: selectedMerchant ? Number(selectedMerchant) : undefined,
            lowStock: lowStockOnly ? true : undefined,
          },
        }),
        api.get('/select/merchants').catch(() => ({ data: [] })),
      ]);

      if (prodRes.data?.data) {
        setProducts(prodRes.data.data);
        setTotalProducts(prodRes.data.total);
      } else if (Array.isArray(prodRes.data)) {
        setProducts(prodRes.data);
        setTotalProducts(prodRes.data.length);
      } else {
        setProducts([]);
        setTotalProducts(0);
      }

      setMerchants(Array.isArray(merchRes.data) ? merchRes.data : (merchRes.data?.result || []));
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, selectedMerchant, lowStockOnly]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Delete product
  const handleDeleteProduct = async (id: number, name: string) => {
    if (!confirm(lang === 'km' ? `តើអ្នកប្រាកដថាចង់លុបទំនិញ "${name}" មែនទេ?` : `Delete product "${name}"?`)) return;
    try {
      await api.delete(`/inventory/products/${id}`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete product');
    }
  };

  // Open adjust stock
  const handleOpenAdjust = (prod: any) => {
    setSelectedProduct(prod);
    setAdjustForm({
      type: 'IN',
      quantity: 1,
      note: '',
    });
    setAdjustModalOpen(true);
  };

  // Save adjust stock
  const handleSaveAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    try {
      await api.post(`/inventory/products/${selectedProduct.id}/adjust`, {
        type: adjustForm.type,
        quantity: Number(adjustForm.quantity),
        note: adjustForm.note || undefined,
      });
      alert(lang === 'km' ? 'កែសម្រួលស្តុកជោគជ័យ!' : 'Stock adjusted successfully!');
      setAdjustModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to adjust stock');
    }
  };

  // View movements history
  const handleOpenHistory = async (prod: any) => {
    setSelectedProduct(prod);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/inventory/products/${prod.id}/movements`);
      setMovements(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load movements:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Stats calculation
  const totalOnHand = products.reduce((acc, p) => acc + (p.quantity || 0), 0);
  const totalReserved = products.reduce((acc, p) => acc + (p.reservedQuantity || 0), 0);
  const lowStockCount = products.filter((p) => ((p.quantity || 0) - (p.reservedQuantity || 0)) <= (p.minStockAlert || 5)).length;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar
          title={lang === 'km' ? 'គ្រប់គ្រងស្តុក & មុខទំនិញ' : 'Inventory & Stock Management'}
          subtitle={lang === 'km' ? `${totalProducts} មុខទំនិញក្នុងប្រព័ន្ធ` : `${totalProducts} Products in stock`}
        />

        <div className="page-content">
          {/* Header Action Bar */}
          <div className="page-header">
            <div className="page-title-group">
              <h1 className="page-title">
                {lang === 'km' ? 'បញ្ជីទំនិញ & ស្តុកឃ្លាំង' : 'Products & Warehouse Stock'}
              </h1>
              <p className="page-subtitle">
                {lang === 'km'
                  ? 'តាមដានចំនួនស្តុកជាក់ស្តែង ស្តុកកក់ទុក និងចរន្តទំនិញចេញ-ចូលឃ្លាំង'
                  : 'Track on-hand stock, reserved order items, and warehouse movements'}
              </p>
            </div>
            <div className="page-actions" style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-secondary"
                onClick={() => router.push('/inventory/pick-pack')}
              >
                <MdQrCodeScanner size={18} />
                {lang === 'km' ? 'ស្កេន Pick & Pack' : 'Pick & Pack Scanner'}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => router.push('/inventory/create')}
              >
                <MdAdd size={18} />
                {lang === 'km' ? 'បង្កើតទំនិញថ្មី' : 'Add Product'}
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stats-card">
              <div className="stats-card-icon" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                <MdInventory2 />
              </div>
              <div className="stats-card-info">
                <div className="stats-card-value">{totalProducts}</div>
                <div className="stats-card-label">{lang === 'km' ? 'មុខទំនិញសរុប' : 'Total Products'}</div>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-card-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
                <MdCheckCircle />
              </div>
              <div className="stats-card-info">
                <div className="stats-card-value" style={{ color: 'var(--success)' }}>{totalOnHand}</div>
                <div className="stats-card-label">{lang === 'km' ? 'ស្តុកជាក់ស្តែង (On-Hand)' : 'Total On-Hand'}</div>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-card-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
                <MdSwapVert />
              </div>
              <div className="stats-card-info">
                <div className="stats-card-value" style={{ color: 'var(--warning)' }}>{totalReserved}</div>
                <div className="stats-card-label">{lang === 'km' ? 'ស្តុកកក់ទុក (Reserved)' : 'Total Reserved'}</div>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-card-icon" style={{ background: lowStockCount > 0 ? 'var(--danger-light)' : 'var(--neutral-light)', color: lowStockCount > 0 ? 'var(--danger)' : 'var(--neutral)' }}>
                <MdWarning />
              </div>
              <div className="stats-card-info">
                <div className="stats-card-value" style={{ color: lowStockCount > 0 ? 'var(--danger)' : 'inherit' }}>
                  {lowStockCount}
                </div>
                <div className="stats-card-label">{lang === 'km' ? 'ទំនិញជិតអស់ស្តុក (Low Stock)' : 'Low Stock Alerts'}</div>
              </div>
            </div>
          </div>

          {/* Filter Card */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-body" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', padding: '16px' }}>
              <div className="form-group" style={{ flex: 1, minWidth: 260, marginBottom: 0 }}>
                <div style={{ position: 'relative' }}>
                  <MdSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 18 }} />
                  <input
                    type="text"
                    className="form-control"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={lang === 'km' ? 'ស្វែងរកតាម ឈ្មោះ, SKU, ឬ Barcode...' : 'Search by name, SKU, or barcode...'}
                    style={{ paddingLeft: 38 }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ minWidth: 200, marginBottom: 0 }}>
                <select
                  className="form-control"
                  value={selectedMerchant}
                  onChange={(e) => {
                    setSelectedMerchant(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">{lang === 'km' ? '— គ្រប់ហាងទាំងអស់ (All Shops) —' : '— All Merchants —'}</option>
                  {merchants.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className={`btn ${lowStockOnly ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => {
                  setLowStockOnly(!lowStockOnly);
                  setCurrentPage(1);
                }}
              >
                <MdWarning size={16} />
                {lang === 'km' ? 'ជិតអស់ស្តុក' : 'Low Stock Only'}
              </button>
            </div>
          </div>

          {/* Table Card */}
          <div className="card">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>{lang === 'km' ? 'មុខទំនិញ' : 'Product'}</th>
                    <th>SKU / Barcode</th>
                    <th>{lang === 'km' ? 'ហាង' : 'Merchant'}</th>
                    <th>{lang === 'km' ? 'តម្លៃ' : 'Price'}</th>
                    <th style={{ textAlign: 'center' }}>{lang === 'km' ? 'ស្តុកជាក់ស្តែង' : 'On-Hand'}</th>
                    <th style={{ textAlign: 'center' }}>{lang === 'km' ? 'កក់ទុក' : 'Reserved'}</th>
                    <th style={{ textAlign: 'center' }}>{lang === 'km' ? 'អាចលក់បាន' : 'Available'}</th>
                    <th style={{ textAlign: 'center' }}>{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                    <th style={{ textAlign: 'right' }}>{lang === 'km' ? 'សកម្មភាព' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '36px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                        {lang === 'km' ? 'កំពុងទាញយកទិន្នន័យ...' : 'Loading products...'}
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '36px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                        {lang === 'km' ? 'មិនមានទំនិញក្នុងស្តុកទេ' : 'No products found'}
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => {
                      const avail = Math.max(0, (p.quantity || 0) - (p.reservedQuantity || 0));
                      const isLow = avail <= (p.minStockAlert || 5);
                      return (
                        <tr key={p.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                            {p.nameKh && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.nameKh}</div>}
                          </td>
                          <td>
                            <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.sku}</div>
                            {p.barcode && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>🏷️ {p.barcode}</div>}
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>
                            {p.merchant?.name || '—'}
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            ${Number(p.price || 0).toFixed(2)}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>
                            {p.quantity || 0} {p.unit}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--warning)' }}>
                            {p.reservedQuantity || 0}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              fontWeight: 700,
                              color: isLow ? 'var(--danger)' : 'var(--success)',
                              background: isLow ? 'var(--danger-light)' : 'var(--success-light)',
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-sm)',
                            }}>
                              {avail}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {avail === 0 ? (
                              <Badge status="danger" label={lang === 'km' ? 'អស់ស្តុក' : 'Out of Stock'} />
                            ) : isLow ? (
                              <Badge status="warning" label={lang === 'km' ? 'ជិតអស់' : 'Low Stock'} />
                            ) : (
                              <Badge status="success" label={lang === 'km' ? 'គ្រប់គ្រាន់' : 'In Stock'} />
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 6 }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenAdjust(p)}
                                title={lang === 'km' ? 'កែសម្រួលស្តុក (Stock In / Out)' : 'Adjust Stock'}
                              >
                                <MdSwapVert size={16} />
                                {lang === 'km' ? 'កែស្តុក' : 'Adjust'}
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleOpenHistory(p)}
                                title={lang === 'km' ? 'ប្រវត្តិនាំចេញ-ចូល (Movements)' : 'Movement History'}
                              >
                                <MdHistory size={16} />
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => router.push(`/inventory/edit/${p.id}`)}
                                title={lang === 'km' ? 'កែប្រែព័ត៌មាន' : 'Edit Product'}
                              >
                                <MdEdit size={16} />
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: 'var(--danger)' }}
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                title={lang === 'km' ? 'លុបទំនិញ' : 'Delete Product'}
                              >
                                <MdDelete size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalProducts > pageSize && (
              <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px' }}>
                <Pagination
                  currentPage={currentPage}
                  totalItems={totalProducts}
                  pageSize={pageSize}
                  onPageChange={(page) => setCurrentPage(page)}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {adjustModalOpen && selectedProduct && (
        <Modal
          open={adjustModalOpen}
          onClose={() => setAdjustModalOpen(false)}
          title={`${lang === 'km' ? 'កែសម្រួលស្តុក' : 'Adjust Stock'} - ${selectedProduct.name}`}
        >
          <form onSubmit={handleSaveAdjust}>
            <div style={{ background: 'var(--bg-primary)', padding: 14, borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 16 }}>
              <div><strong>SKU:</strong> {selectedProduct.sku}</div>
              <div><strong>{lang === 'km' ? 'ស្តុកបច្ចុប្បន្ន:' : 'Current On-Hand:'}</strong> {selectedProduct.quantity} {selectedProduct.unit}</div>
              <div><strong>{lang === 'km' ? 'ស្តុកកក់ទុក:' : 'Reserved:'}</strong> {selectedProduct.reservedQuantity} {selectedProduct.unit}</div>
            </div>

            <div className="form-group">
              <label className="form-label">
                {lang === 'km' ? 'ប្រភេទប្រតិបត្តិការ' : 'Operation Type'} <span>*</span>
              </label>
              <select
                className="form-control"
                value={adjustForm.type}
                onChange={(e: any) => setAdjustForm({ ...adjustForm, type: e.target.value })}
              >
                <option value="IN">{lang === 'km' ? '➕ នាំចូលស្តុកបន្ថែម (Stock IN)' : '➕ Stock IN (Add)'}</option>
                <option value="OUT">{lang === 'km' ? '➖ កាត់ចេញពីស្តុក (Stock OUT)' : '➖ Stock OUT (Deduct)'}</option>
                <option value="DAMAGED">{lang === 'km' ? '⚠️ អីវ៉ាន់ខូចខាត (Damaged Write-Off)' : '⚠️ Damaged / Loss'}</option>
                <option value="ADJUST">{lang === 'km' ? '🔄 កែតម្រូវចំនួនជាក់ស្តែង (Direct Set Qty)' : '🔄 Direct Inventory Count'}</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                {lang === 'km' ? 'ចំនួន' : 'Quantity'} <span>*</span>
              </label>
              <input
                required
                type="number"
                min="1"
                className="form-control"
                value={adjustForm.quantity}
                onChange={(e) => setAdjustForm({ ...adjustForm, quantity: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                {lang === 'km' ? 'កំណត់សម្គាល់ / មូលហេតុ' : 'Note / Reason'}
              </label>
              <textarea
                rows={2}
                className="form-control"
                placeholder="e.g. Restock from supplier, stock-take correction..."
                value={adjustForm.note}
                onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setAdjustModalOpen(false)}
              >
                {lang === 'km' ? 'បោះបង់' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                {lang === 'km' ? 'បញ្ជាក់ការកែស្តុក' : 'Confirm Adjust'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Movement History Audit Modal */}
      {historyModalOpen && selectedProduct && (
        <Modal
          open={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          title={`${lang === 'km' ? 'ប្រវត្តិនាំចេញ-ចូលស្តុក' : 'Stock Movements'} - ${selectedProduct.name}`}
        >
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {historyLoading ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Loading movements...</div>
            ) : movements.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No movements recorded</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                    <th>{lang === 'km' ? 'ប្រភេទ' : 'Type'}</th>
                    <th style={{ textAlign: 'center' }}>{lang === 'km' ? 'ចំនួន' : 'Qty'}</th>
                    <th style={{ textAlign: 'center' }}>{lang === 'km' ? 'មុន → ក្រោយ' : 'Before → After'}</th>
                    <th>{lang === 'km' ? 'សម្គាល់' : 'Note'}</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <span style={{
                          fontWeight: 700,
                          fontSize: 11,
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                          background: m.type === 'IN' || m.type === 'RETURN' ? 'var(--success-light)' : m.type === 'OUT' ? 'var(--danger-light)' : m.type === 'RESERVE' ? 'var(--warning-light)' : 'var(--bg-primary)',
                          color: m.type === 'IN' || m.type === 'RETURN' ? 'var(--success)' : m.type === 'OUT' ? 'var(--danger)' : m.type === 'RESERVE' ? 'var(--warning)' : 'var(--text-secondary)',
                        }}>
                          {m.type}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{m.quantity}</td>
                      <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        {m.previousQuantity} → {m.newQuantity}
                      </td>
                      <td>
                        {m.note || m.referenceId || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
