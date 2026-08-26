'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import api from '@/lib/api';
import { MdAdd, MdEdit, MdDelete } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';

export default function IncomeTypePage() {
  const router = useRouter();
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Add Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit Modal State
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [updating, setUpdating] = useState(false);

  const { t, lang } = useLanguage();

  const load = async () => {
    try {
      const res = await api.get('/incomes/types');
      setTypes(res.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    load();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post('/incomes/types', { name: name.trim(), description: desc.trim() });
      setName('');
      setDesc('');
      setAddModalOpen(false);
      await load();
    } catch {
      alert(t('failedToCreateCategory') || 'Failed to create category');
    }
    setSaving(false);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setEditName(item.name || '');
    setEditDesc(item.description || '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editItem) return;
    setUpdating(true);
    try {
      await api.patch(`/incomes/types/${editItem.id}`, {
        name: editName.trim(),
        description: editDesc.trim(),
      });
      setEditItem(null);
      await load();
    } catch {
      alert(lang === 'km' ? 'មិនអាចកែសម្រួលប្រភេទចំណូលបានទេ' : 'Failed to update category');
    }
    setUpdating(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('deleteCategoryConfirmIncome') || 'Delete this category? Related incomes will be updated.')) return;
    try {
      await api.delete(`/incomes/types/${id}`);
      await load();
    } catch {
      alert(t('failedToDeleteCategory') || 'Failed to delete category');
    }
  };

  const totalItems = types.length;
  const paginatedTypes = types.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('typeOfIncome') || 'Type Of Income'} subtitle={t('incomeTypeSubtitle') || 'Manage income source categories and accounts'} />
        <div className="page-content">
          <div className="card">
            <div className="card-header">
              <span className="card-title">📋 {t('incomeCategories') || 'Income Categories'}</span>
              <button
                className="btn btn-primary"
                style={{
                  padding: '8px 18px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
                onClick={() => setAddModalOpen(true)}
              >
                <MdAdd size={18} /> {t('addIncomeCategory') || 'Add Income Category'}
              </button>
            </div>
            <div className="table-wrapper" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: 60, textAlign: 'center' }}>{t('colNo') || 'No.'}</th>
                    <th style={{ width: 280 }}>{t('incomeCategoryName') || 'Income Category Name'}</th>
                    <th>{t('description') || 'Description'}</th>
                    <th style={{ width: 100, textAlign: 'center' }}>{t('reportAction') || 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '40px 0' }}>
                        <div className="loading-wrapper"><div className="spinner" /></div>
                      </td>
                    </tr>
                  ) : paginatedTypes.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                        {t('noDataFound') || 'គ្មានទិន្នន័យ'}
                      </td>
                    </tr>
                  ) : (
                    paginatedTypes.map((tItem, idx) => (
                      <tr key={tItem.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
                          {(currentPage - 1) * pageSize + idx + 1}
                        </td>
                        <td style={{ fontWeight: 700 }}>{tItem.name}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{tItem.description || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              style={{ color: '#2563eb' }}
                              onClick={() => openEdit(tItem)}
                              title={lang === 'km' ? 'កែសម្រួល' : 'Edit'}
                            >
                              <MdEdit size={16} />
                            </button>
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => handleDelete(tItem.id)}
                              title={lang === 'km' ? 'លុប' : 'Delete'}
                            >
                              <MdDelete size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {totalItems > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {addModalOpen && (
        <Modal
          open={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          title={`➕ ${t('addIncomeCategory') || 'Add Income Category'}`}
          size="md"
        >
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t('incomeCategoryName') || 'Income Category Name'} <span>*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder={t('placeholderCategoryIncomeName') || 'e.g. Delivery Fees, Storage'}
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('description') || 'Description'}</label>
              <textarea
                className="form-control"
                placeholder={t('placeholderExplanation') || 'Short explanation...'}
                value={desc}
                onChange={e => setDesc(e.target.value)}
                rows={3}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button type="button" className="btn btn-outline" onClick={() => setAddModalOpen(false)}>
                {t('cancel') || 'បោះបង់'}
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? (t('creating') || 'Creating...') : (t('createType') || 'Create Type')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editItem && (
        <Modal
          open={!!editItem}
          onClose={() => setEditItem(null)}
          title={`✏️ ${lang === 'km' ? 'កែសម្រួលប្រភេទចំណូល' : 'Edit Income Category'}`}
          size="md"
        >
          <form onSubmit={handleUpdate}>
            <div className="form-group">
              <label className="form-label">{t('incomeCategoryName') || 'Income Category Name'} <span>*</span></label>
              <input
                type="text"
                className="form-control"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('description') || 'Description'}</label>
              <textarea
                className="form-control"
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                rows={3}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button type="button" className="btn btn-outline" onClick={() => setEditItem(null)}>
                {t('cancel') || 'បោះបង់'}
              </button>
              <button type="submit" className="btn btn-primary" disabled={updating}>
                {updating ? (lang === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...') : (lang === 'km' ? 'រក្សាទុកការផ្លាស់ប្តូរ' : 'Save Changes')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
