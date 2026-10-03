'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { FiPlusCircle } from 'react-icons/fi';
import { useLanguage } from '@/lib/LanguageContext';
import Pagination from '@/components/ui/Pagination';
import { formatDate } from '@/lib/date-utils';

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
      if (res.data && (res.data.results !== undefined || res.data.result !== undefined)) {
        setIncomes(res.data.results || res.data.result || []);
        setTotalItems(res.data.total || 0);
      } else {
        setIncomes(Array.isArray(res.data) ? res.data : []);
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
          title={t('incomeList') || 'Income List'}
          subtitle={t('incomeSubtitle') || 'Overview of company revenues and collections'}
        />
        <div className="page-content">
          <div className="card">
            <div className="card-header">
              <span className="card-title">💵 {t('revenuesTitle') || 'Revenues & Collections'}</span>
              <button className="btn btn-primary btn-sm" onClick={() => router.push('/income/create')}>
                <FiPlusCircle size={14} /> {t('addIncome') || 'Add Income'}
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 60, textAlign: 'center' }}>{t('colNo') || 'No.'}</th>
                    <th>{t('description') || 'Description'}</th>
                    <th style={{ width: 160 }}>{t('incomeType') || 'Income Type'}</th>
                    <th style={{ width: 140, textAlign: 'right' }}>{t('amountUSD') || 'Amount ($)'}</th>
                    <th style={{ width: 140 }}>{t('incomeDate') || 'Income Date'}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '40px 0', textAlign: 'center' }}>
                        <div className="loading-wrapper"><div className="spinner" /></div>
                      </td>
                    </tr>
                  ) : incomes.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        {t('noDataFound') || 'គ្មានទិន្នន័យ'}
                      </td>
                    </tr>
                  ) : (
                    incomes.map((inc, idx) => (
                      <tr key={inc.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>{(currentPage - 1) * pageSize + idx + 1}</td>
                        <td style={{ fontWeight: 700 }}>{inc.description}</td>
                        <td>
                          <span className="badge badge-delivered" style={{ textTransform: 'capitalize' }}>
                            {inc.type?.name || 'General'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--success)', textAlign: 'right' }}>+${parseFloat(inc.amount).toFixed(2)}</td>
                        <td style={{ fontSize: 12 }}>{formatDate(inc.date)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {incomes.length > 0 && (
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
