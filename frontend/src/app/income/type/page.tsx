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
import FormField from '@/components/ui/FormField';

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
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

  // Edit Modal State
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [updating, setUpdating] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

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
    const errs: Record<string, string> = {};
    if (!name.trim()) {
      errs.name = lang === 'km' ? 'សូមបញ្ចូលឈ្មោះប្រភេទចំណូល' : 'Please enter category name';
    }
    if (Object.keys(errs).length > 0) {
      setAddErrors(errs);
      return;
    }
    setAddErrors({});

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
    setEditErrors({});
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    const errs: Record<string, string> = {};
    if (!editName.trim()) {
      errs.editName = lang === 'km' ? 'សូមបញ្ចូលឈ្មោះប្រភេទចំណូល' : 'Please enter category name';
    }
    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }
    setEditErrors({});

    setUpdating(true);
    try {
      await api.patch(`/incomes/types/${editItem.id}`, { name: editName.trim(), description: editDesc.trim() });
      setEditItem(null);
      await load();
    } catch {
      alert(t('failedToUpdateCategory') || 'Failed to update category');
    }
    setUpdating(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDeleteCategory') || 'Are you sure you want to delete this category?')) return;
    try {
      await api.delete(`/incomes/types/${id}`);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message || t('failedToDeleteCategory') || 'Failed to delete category');
    }
  };

  // Pagination logic
  const totalItems = types.length;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTypes = types.slice(startIndex, startIndex + pageSize);

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
        <Topbar title={t('incomeCategoriesTitle') || 'Income Categories'} subtitle={t('incomeCategoriesSubtitle') || 'Manage and classify income sources'} />
        <div className="page-content">
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title">{t('categoryList') || 'Category List'}</span>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setAddModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
              >
                <FiPlusCircle size={16} /> {t('addCategory') || 'Add Category'}
              </button>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>{t('no') || '#'}</th>
                    <th>{t('categoryName') || 'Category Name'}</th>
                    <th>{t('description') || 'Description'}</th>
                    <th style={{ width: 120, textAlign: 'center' }}>{t('actions') || 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTypes.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        {t('noCategoriesFound') || 'No income categories found. Click "Add Category" to create one.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedTypes.map((tItem, idx) => (
                      <tr key={tItem.id}>
                        <td>{startIndex + idx + 1}</td>
                        <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{tItem.name}</td>
                        <td>{tItem.description || '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => openEdit(tItem)}
                              title={lang === 'km' ? 'កែប្រែ' : 'Edit'}
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
          title={`➕ ${t('addIncomeCategory') || 'Add Income Category'}`}
          size="md"
        >
          <form noValidate onSubmit={handleSubmit}>
            <FormField
              label={t('incomeCategoryName') || 'Income Category Name'}
              required
              error={addErrors.name}
            >
              <input
                type="text"
                className={`form-control ${addErrors.name ? 'is-invalid' : ''}`}
                placeholder={t('placeholderCategoryIncomeName') || 'e.g. Delivery Fees, Storage'}
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  if (addErrors.name) setAddErrors({ ...addErrors, name: '' });
                }}
                autoFocus
              />
            </FormField>
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
          title={lang === 'km' ? 'កែសម្រួលប្រភេទចំណូល' : 'Edit Income Category'}
          size="md"
        >
          <form noValidate onSubmit={handleUpdate}>
            <FormField
              label={t('incomeCategoryName') || 'Income Category Name'}
              required
              error={editErrors.editName}
            >
              <input
                type="text"
                className={`form-control ${editErrors.editName ? 'is-invalid' : ''}`}
                value={editName}
                onChange={e => {
                  setEditName(e.target.value);
                  if (editErrors.editName) setEditErrors({ ...editErrors, editName: '' });
                }}
                autoFocus
              />
            </FormField>
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
