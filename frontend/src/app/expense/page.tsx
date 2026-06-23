'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { MdAdd, MdTrendingDown } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';
import Pagination from '@/components/ui/Pagination';

export default function ExpenseListPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { t } = useLanguage();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/expenses', {
        params: { page: currentPage, limit: pageSize }
      });
      if (res.data && res.data.data !== undefined) {
        setExpenses(res.data.data || []);
        setTotalItems(res.data.total || 0);
      } else {
        setExpenses(res.data || []);
        setTotalItems(res.data?.length || 0);
      }
    } catch {}
    setLoading(false);
  }, [currentPage, pageSize]);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    load();
  }, [router, load]);

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
        <Topbar
          title={t('expenseList') || 'Expense List'}
          subtitle={t('expenseSubtitle') || 'Overview of company outlays and expenses'}
        />
        <div className="page-content">
          <div className="card">
            <div className="card-header">
              <span className="card-title">💸 {t('outlaysTitle') || 'Outlays & Expenditures'}</span>
              <button className="btn btn-primary btn-sm" onClick={() => router.push('/expense/create')}><MdAdd size={14} /> {t('addExpense') || 'Add Expense'}</button>
            </div>
            {expenses.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💸</div>
                <div className="empty-state-title">{t('noExpensesFound') || 'No expenses found'}</div>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>{t('description') || 'Description'}</th>
                        <th>{t('expenseType') || 'Expense Type'}</th>
                        <th>{t('amountUSD') || 'Amount ($)'}</th>
                        <th>{t('expenseDate') || 'Expense Date'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((e, idx) => (
                        <tr key={e.id}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(currentPage - 1) * pageSize + idx + 1}</td>
                          <td style={{ fontWeight: 700 }}>{e.description}</td>
                          <td>
                            <span className="badge badge-standard" style={{ textTransform: 'capitalize' }}>
                              {e.type?.name || 'General'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--danger)' }}>-${parseFloat(e.amount).toFixed(2)}</td>
                          <td style={{ fontSize: 12 }}>{new Date(e.date).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalItems={totalItems}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
