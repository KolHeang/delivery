'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import { FaRegEdit, FaTrashAlt } from 'react-icons/fa';
import { FiPlusCircle } from 'react-icons/fi';
import { useLanguage } from '@/lib/LanguageContext';

export default function ExpenseTypePage() {
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
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit Modal State
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editNameError, setEditNameError] = useState('');
  const [updating, setUpdating] = useState(false);

  const { t, lang } = useLanguage();

  const load = async () => {
    try {
      const res = await api.get('/expenses/types');
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
    if (!name.trim()) {
      setNameError('សូមបំពេញឈ្មោះប្រភេទចំណាយ');
      return;
    }
    setNameError('');
    setSaving(true);
    try {
      await api.post('/expenses/types', { name: name.trim(), description: desc.trim() });
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
    setEditNameError('');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      setEditNameError('សូមបំពេញឈ្មោះប្រភេទចំណាយ');
      return;
    }
    if (!editItem) return;
    setEditNameError('');
    setUpdating(true);
    try {
      await api.patch(`/expenses/types/${editItem.id}`, {
        name: editName.trim(),
        description: editDesc.trim(),
      });
      setEditItem(null);
      await load();
    } catch {
      alert(lang === 'km' ? 'មិនអាចកែសម្រួលក្រុមចំណាយបានទេ' : 'Failed to update category');
    }
    setUpdating(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('deleteCategoryConfirm') || 'Delete this category? Related expenses will be updated.')) return;
    try {
      await api.delete(`/expenses/types/${id}`);
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
        <Topbar title={t('typeOfExpense') || 'Type Of Expense'} subtitle={t('expenseTypeSubtitle') || 'Manage expense categories and accounts'} />
        <div className="page-content">
          <div className="card">
            <div className="card-header">
              <span className="card-title">📋 {t('expenseCategories') || 'Expense Categories'}</span>
              <button className="btn btn-primary btn-sm" onClick={() => setAddModalOpen(true)}>
                <FiPlusCircle size={14} /> {t('addCategory') || 'Add Category'}
              </button>
            </div>
            <div className="table-wrapper" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: 60, textAlign: 'center' }}>{t('colNo') || 'No.'}</th>
                    <th style={{ width: 280 }}>{t('categoryName') || 'Category Name'}</th>
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
                              <FaRegEdit size={14} />
                            </button>
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => handleDelete(tItem.id)}
                              title={lang === 'km' ? 'លុប' : 'Delete'}
                            >
                              <FaTrashAlt size={14} />
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
          title={`➕ ${t('addCategory') || 'Add Category'}`}
          size="md"
        >
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label">{t('categoryName') || 'Category Name'} <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="text"
                className={`form-control ${nameError ? 'is-invalid' : ''}`}
                placeholder={t('placeholderCategoryExpenseName') || 'e.g. Utilities, Marketing'}
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  if (nameError) setNameError('');
                }}
                autoFocus
              />
              {nameError && <div className="form-error-text">{nameError}</div>}
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
              <button
                type="button"
                className="btn btn-cancel"
                style={{ background: '#dc2626', color: '#ffffff', border: '1px solid #dc2626', fontWeight: 700 }}
                onClick={() => setAddModalOpen(false)}
              >
                {t('cancel') || 'បោះបង់'}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ background: '#2563eb', color: '#ffffff', border: '1px solid #2563eb', fontWeight: 700 }}
                disabled={saving}
              >
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
          title={lang === 'km' ? 'កែសម្រួលក្រុមចំណាយ' : 'Edit Category'}
          size="md"
        >
          <form onSubmit={handleUpdate} noValidate>
            <div className="form-group">
              <label className="form-label">{t('categoryName') || 'Category Name'} <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="text"
                className={`form-control ${editNameError ? 'is-invalid' : ''}`}
                value={editName}
                onChange={e => {
                  setEditName(e.target.value);
                  if (editNameError) setEditNameError('');
                }}
                autoFocus
              />
              {editNameError && <div className="form-error-text">{editNameError}</div>}
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
              <button
                type="button"
                className="btn btn-cancel"
                style={{ background: '#dc2626', color: '#ffffff', border: '1px solid #dc2626', fontWeight: 700 }}
                onClick={() => setEditItem(null)}
              >
                {t('cancel') || 'បោះបង់'}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ background: '#2563eb', color: '#ffffff', border: '1px solid #2563eb', fontWeight: 700 }}
                disabled={updating}
              >
                {updating ? (lang === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...') : (lang === 'km' ? 'រក្សាទុកការផ្លាស់ប្តូរ' : 'Save Changes')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
