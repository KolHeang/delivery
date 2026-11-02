'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import FormField from '@/components/ui/FormField';
import { MdArrowBack, MdSave } from 'react-icons/md';

export default function AddIncomePage() {
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
    api.get('/incomes/types')
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
      newErrors.typeId = lang === 'km' ? 'សូមជ្រើសរើសប្រភេទចំណូល' : 'Please select income category';
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
      await api.post('/incomes', payload);
      router.push('/income');
    } catch {
      alert(t('failedToAddIncome') || 'Failed to add income');
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
        <Topbar title={t('addIncome') || 'Add Income'} subtitle={t('addIncomeSubtitle') || 'Record a new company revenue entry'} />
        <div className="page-content">
          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px' }}>
              <button
                type="button"
                onClick={() => router.push('/income')}
                className="btn btn-ghost btn-icon btn-sm"
                title={lang === 'km' ? 'ត្រឡប់ក្រោយ' : 'Back'}
              >
                <MdArrowBack size={18} />
              </button>
              <span className="card-title" style={{ fontSize: 16, fontWeight: 700 }}>{t('incomeDetails') || 'Income Details'}</span>
            </div>
            <div className="card-body" style={{ padding: '20px 24px' }}>
              <form noValidate onSubmit={handleSubmit}>
                <FormField label={t('descOrSource') || 'Description / Source'} required error={errors.description}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={t('placeholderDescIncome') || 'e.g. Delivery fees week 24, Sponsor payment'}
                    value={form.description}
                    onChange={e => handleFieldChange('description', e.target.value)}
                  />
                </FormField>

                <FormField label={t('incomeCategory') || 'Income Category / Type'} required error={errors.typeId}>
                  <select
                    className="form-control"
                    value={form.typeId}
                    onChange={e => handleFieldChange('typeId', e.target.value)}
                  >
                    <option value="">{lang === 'km' ? '-- ជ្រើសរើសប្រភេទចំណូល --' : '-- Select Income Category --'}</option>
                    {types.map(tp => (
                      <option key={tp.id} value={tp.id}>{tp.name}</option>
                    ))}
                  </select>
                </FormField>

                <div className="form-row">
                  <FormField label={t('amountUSD') || 'Amount ($)'} required error={errors.amount}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control"
                      placeholder="0.00"
                      value={form.amount}
                      onChange={e => handleFieldChange('amount', e.target.value)}
                    />
                  </FormField>
                  <FormField label={t('dateLabel') || 'Date'} required error={errors.date}>
                    <input
                      type="date"
                      className="form-control"
                      value={form.date}
                      onChange={e => handleFieldChange('date', e.target.value)}
                    />
                  </FormField>
                </div>

                <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-cancel"
                    onClick={() => router.push('/income')}
                  >
                    {t('cancel') || 'បោះបង់'}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    <MdSave size={17} />
                    {saving ? t('saving') || 'Saving...' : t('save') || 'រក្សាទុក'}
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
