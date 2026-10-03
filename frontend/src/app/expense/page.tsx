'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { MdTrendingDown } from 'react-icons/md';
import { FiPlusCircle } from 'react-icons/fi';
import { useLanguage } from '@/lib/LanguageContext';
import Pagination from '@/components/ui/Pagination';
import { formatDate } from '@/lib/date-utils';

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
      if (res.data && (res.data.results !== undefined || res.data.result !== undefined)) {
        setExpenses(res.data.results || res.data.result || []);
        setTotalItems(res.data.total || 0);
      } else {
        setExpenses(Array.isArray(res.data) ? res.data : []);
        setTotalItems(Array.isArray(res.data) ? res.data.length : 0);
      }
    } catch {}
    setLoading(false);
  }, [currentPage, pageSize]);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    load();
  }, [router, load]);

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
              <span className="card-title">📉 {t('outlaysTitle') || 'Expenses & Outflows'}</span>
              <button className="btn btn-primary btn-sm" onClick={() => router.push('/expense/create')}>
                <FiPlusCircle size={14} /> {t('addExpense') || 'Add Expense'}
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 60, textAlign: 'center' }}>{t('colNo') || 'No.'}</th>
                    <th>{t('description') || 'Description'}</th>
                    <th style={{ width: 160 }}>{t('expenseType') || 'Expense Type'}</th>
                    <th style={{ width: 140, textAlign: 'right' }}>{t('amountUSD') || 'Amount ($)'}</th>
                    <th style={{ width: 140 }}>{t('expenseDate') || 'Expense Date'}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '40px 0', textAlign: 'center' }}>
                        <div className="loading-wrapper"><div className="spinner" /></div>
                      </td>
                    </tr>
                  ) : expenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        {t('noDataFound') || 'គ្មានទិន្នន័យ'}
                      </td>
                    </tr>
                  ) : (
                    expenses.map((e, idx) => (
                      <tr key={e.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>{(currentPage - 1) * pageSize + idx + 1}</td>
                        <td style={{ fontWeight: 700 }}>{e.description}</td>
                        <td>
                          <span className="badge badge-standard" style={{ textTransform: 'capitalize' }}>
                            {e.type?.name || 'General'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--danger)', textAlign: 'right' }}>-${parseFloat(e.amount).toFixed(2)}</td>
                        <td style={{ fontSize: 12 }}>{formatDate(e.date)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {expenses.length > 0 && (
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
    </div>
  );
}
