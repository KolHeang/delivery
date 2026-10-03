'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import FormField from '@/components/ui/FormField';

export default function AddExpensePage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
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

    const newErrors: Record<string, string> = {};
    if (!form.description.trim()) {
      newErrors.description = lang === 'km' ? 'សូមបញ្ចូលការពិពណ៌នា' : 'Please enter description';
    }
    if (!form.typeId) {
      newErrors.typeId = lang === 'km' ? 'សូមជ្រើសរើសប្រភេទចំណាយ' : 'Please select expense category';
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      newErrors.amount = lang === 'km' ? 'សូមបញ្ចូលចំនួនទឹកប្រាក់' : 'Please enter valid amount';
    }
    if (!form.date) {
      newErrors.date = lang === 'km' ? 'សូមជ្រើសរើសកាលបរិច្ឆេទ' : 'Please select date';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
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
              <form noValidate onSubmit={handleSubmit}>
                <FormField label={t('descOrItem') || 'Description / Item'} required error={errors.description}>
                  <input
                    type="text"
                    className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                    placeholder={t('placeholderDescExpense') || 'e.g. Weekly office supplies, fuel reimbursement'}
                    value={form.description}
                    onChange={e => handleFieldChange('description', e.target.value)}
                  />
                </FormField>

                <FormField label={t('expenseCategory') || 'Expense Category / Type'} required error={errors.typeId}>
                  <select
                    className={`form-control ${errors.typeId ? 'is-invalid' : ''}`}
                    value={form.typeId}
                    onChange={e => handleFieldChange('typeId', e.target.value)}
                  >
                    <option value="">{lang === 'km' ? '-- ជ្រើសរើសប្រភេទចំណាយ --' : '-- Select Expense Category --'}</option>
                    {types.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </FormField>

                <div className="form-row">
                  <FormField label={t('amountUSD') || 'Amount ($)'} required error={errors.amount}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={`form-control ${errors.amount ? 'is-invalid' : ''}`}
                      placeholder="0.00"
                      value={form.amount}
                      onChange={e => handleFieldChange('amount', e.target.value)}
                    />
                  </FormField>
                  <FormField label={t('dateLabel') || 'Date'} required error={errors.date}>
                    <input
                      type="date"
                      className={`form-control ${errors.date ? 'is-invalid' : ''}`}
                      value={form.date}
                      onChange={e => handleFieldChange('date', e.target.value)}
                    />
                  </FormField>
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
