'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

export default function AddExpensePage() {
  const router = useRouter();
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { t } = useLanguage();
  const [form, setForm] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    typeId: '',
  });

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    api.get('/expenses/types')
      .then(res => {
        setTypes(res.data || []);
        if (res.data.length > 0) {
          setForm(prev => ({ ...prev, typeId: res.data[0].id.toString() }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const handleFieldChange = (field: string, val: string) => {
    setForm(prev => ({ ...prev, [field]: val }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.description.trim()) {
      errs.description = 'សូមបំពេញបរិយាយ ឬមុខទំនិញចំណាយ';
    }
    if (!form.typeId) {
      errs.typeId = 'សូមជ្រើសរើសប្រភេទចំណាយ';
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      errs.amount = 'សូមបំពេញចំនួនទឹកប្រាក់';
    }
    if (!form.date) {
      errs.date = 'សូមជ្រើសរើសកាលបរិច្ឆេទ';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      const payload = {
        description: form.description,
        amount: parseFloat(form.amount),
        date: new Date(form.date),
        typeId: parseInt(form.typeId),
      };
      await api.post('/expenses', payload);
      router.push('/expense');
    } catch {
      alert(t('failedToCreateCategory') || 'Failed to add expense');
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
        <Topbar title={t('addExpense') || 'Add Expense'} subtitle={t('addExpenseSubtitle') || 'Record a new company expenditure'} />
        <div className="page-content">
          <div className="card">
            <div className="card-header"><span className="card-title">{t('expenseDetails') || 'Expense Details'}</span></div>
            <div className="card-body">
              <form onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label className="form-label">{t('descOrItem') || 'Description / Item'} <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text"
                    className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                    placeholder={t('placeholderDescExpense') || 'e.g. Weekly office supplies, fuel reimbursement'}
                    value={form.description}
                    onChange={e => handleFieldChange('description', e.target.value)}
                  />
                  {errors.description && <div className="form-error-text">{errors.description}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">{t('expenseCategory') || 'Expense Category / Type'} <span style={{ color: '#ef4444' }}>*</span></label>
                  <select
                    className={`form-control ${errors.typeId ? 'is-invalid' : ''}`}
                    value={form.typeId}
                    onChange={e => handleFieldChange('typeId', e.target.value)}
                  >
                    {types.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  {errors.typeId && <div className="form-error-text">{errors.typeId}</div>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('amountUSD') || 'Amount ($)'} <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={`form-control ${errors.amount ? 'is-invalid' : ''}`}
                      placeholder="0.00"
                      value={form.amount}
                      onChange={e => handleFieldChange('amount', e.target.value)}
                    />
                    {errors.amount && <div className="form-error-text">{errors.amount}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('date') || 'កាលបរិច្ឆេទ'} <span style={{ color: '#ef4444' }}>*</span></label>
                    <input
                      type="date"
                      className={`form-control ${errors.date ? 'is-invalid' : ''}`}
                      value={form.date}
                      onChange={e => handleFieldChange('date', e.target.value)}
                    />
                    {errors.date && <div className="form-error-text">{errors.date}</div>}
                  </div>
                </div>

                <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-cancel"
                    style={{ background: '#dc2626', color: '#ffffff', border: '1px solid #dc2626', fontWeight: 700 }}
                    onClick={() => router.push('/expense')}
                  >
                    {t('cancel') || 'បោះបង់'}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ background: '#2563eb', color: '#ffffff', border: '1px solid #2563eb', fontWeight: 700 }}
                    disabled={saving}
                  >
                    {saving ? t('saving') || 'Saving...' : t('addExpense') || 'Add Expense'}
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
