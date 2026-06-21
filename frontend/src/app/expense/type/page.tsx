'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { MdAdd, MdDelete } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';

export default function ExpenseTypePage() {
  const router = useRouter();
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const { t } = useLanguage();

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
    if (!name) return;
    setSaving(true);
    try {
      await api.post('/expenses/types', { name, description: desc });
      setName('');
      setDesc('');
      await load();
    } catch {
      alert(t('failedToCreateCategory') || 'Failed to create category');
    }
    setSaving(false);
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
        <Topbar title={t('typeOfExpense') || 'Type Of Expense'} subtitle={t('expenseTypeSubtitle') || 'Manage expense categories and accounts'} />
        <div className="page-content">
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
            {/* Create form */}
            <div className="card" style={{ height: 'fit-content' }}>
              <div className="card-header"><span className="card-title">➕ {t('addCategory') || 'Add Category'}</span></div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label">{t('categoryName') || 'Category Name'} <span>*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder={t('placeholderCategoryExpenseName') || 'e.g. Utilities, Marketing'}
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('description') || 'Description'}</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder={t('placeholderExplanation') || 'Short explanation...'}
                      value={desc}
                      onChange={e => setDesc(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-full mt-2" disabled={saving}>
                    {saving ? t('creating') || 'Creating...' : t('createType') || 'Create Type'}
                  </button>
                </form>
              </div>
            </div>

            {/* List table */}
            <div className="card">
              <div className="card-header"><span className="card-title">📋 {t('expenseCategories') || 'Expense Categories'}</span></div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 50 }}>#</th>
                      <th>{t('categoryName') || 'Category Name'}</th>
                      <th>{t('description') || 'Description'}</th>
                      <th style={{ width: 80, textAlign: 'center' }}>{t('reportAction') || 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {types.length === 0 ? (
                      <tr><td colSpan={4} className="text-center text-muted" style={{ padding: 24 }}>{t('noCategoriesCreated') || 'No categories created'}</td></tr>
                    ) : types.map((t, idx) => (
                      <tr key={t.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{idx + 1}</td>
                        <td style={{ fontWeight: 700 }}>{t.name}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.description || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button
                               className="btn btn-ghost btn-icon btn-sm"
                               style={{ color: 'var(--danger)' }}
                               onClick={() => handleDelete(t.id)}
                            >
                              <MdDelete size={16} />
                            </button>
                          </div>
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
    </div>
  );
}
