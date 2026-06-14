'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { MdAdd, MdTrendingDown } from 'react-icons/md';

export default function ExpenseListPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    api.get('/expenses')
      .then(res => setExpenses(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

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
          title="Expense List"
          subtitle="Overview of company outlays and expenses"
        />
        <div className="page-content">
          <div className="card">
            <div className="card-header">
              <span className="card-title">💸 Outlays & Expenditures</span>
              <button className="btn btn-primary btn-sm" onClick={() => router.push('/expense/create')}><MdAdd size={14} /> Add Expense</button>
            </div>
            {expenses.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💸</div>
                <div className="empty-state-title">No expenses found</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Description</th>
                      <th>Expense Type</th>
                      <th>Amount ($)</th>
                      <th>Expense Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e, idx) => (
                      <tr key={e.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{idx + 1}</td>
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
