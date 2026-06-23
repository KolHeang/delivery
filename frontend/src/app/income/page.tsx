'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { MdAdd } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';
import Pagination from '@/components/ui/Pagination';

export default function IncomeListPage() {
  const router = useRouter();
  const [incomes, setIncomes] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { t } = useLanguage();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/incomes', {
        params: { page: currentPage, limit: pageSize }
      });
      if (res.data && res.data.data !== undefined) {
        setIncomes(res.data.data || []);
        setTotalItems(res.data.total || 0);
      } else {
        setIncomes(res.data || []);
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
          title={t('incomeList') || 'Income List'}
          subtitle={t('incomeSubtitle') || 'Overview of company revenues and collections'}
        />
        <div className="page-content">
          <div className="card">
            <div className="card-header">
              <span className="card-title">💵 {t('revenuesTitle') || 'Revenues & Collections'}</span>
              <button className="btn btn-primary btn-sm" onClick={() => router.push('/income/create')}><MdAdd size={14} /> {t('addIncome') || 'Add Income'}</button>
            </div>
            {incomes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💸</div>
                <div className="empty-state-title">{t('noIncomesRecorded') || 'No incomes recorded yet'}</div>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>{t('description') || 'Description'}</th>
                        <th>{t('incomeType') || 'Income Type'}</th>
                        <th>{t('amountUSD') || 'Amount ($)'}</th>
                        <th>{t('incomeDate') || 'Income Date'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomes.map((inc, idx) => (
                        <tr key={inc.id}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(currentPage - 1) * pageSize + idx + 1}</td>
                          <td style={{ fontWeight: 700 }}>{inc.description}</td>
                          <td>
                            <span className="badge badge-delivered" style={{ textTransform: 'capitalize' }}>
                              {inc.type?.name || 'General'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--success)' }}>+${parseFloat(inc.amount).toFixed(2)}</td>
                          <td style={{ fontSize: 12 }}>{new Date(inc.date).toLocaleDateString()}</td>
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
