'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { useLanguage } from '@/lib/LanguageContext';
import { MdSearch } from 'react-icons/md';

const FINANCIAL_REPORTS = [
  { key: '1', titleKey: 'frpt1Title', descKey: 'frpt1Desc' },
  { key: '2', titleKey: 'frpt2Title', descKey: 'frpt2Desc' },
  { key: '3', titleKey: 'frpt3Title', descKey: 'frpt3Desc' },
] as const;

export default function FinancialReportMenuPage() {
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => { if (!isAuthenticated()) router.push('/'); }, [router]);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('financialReportTitle')} subtitle={t('financialReportSubtitle')} />
        <div className="page-content">

          {/* Tab bar */}
          <div className="no-print" style={{ display: 'flex', gap: 12, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
            <button
              className="btn btn-primary btn-sm"
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}
            >
              💵 {t('financialReport')}
            </button>
            <button
              onClick={() => router.push('/report/operation')}
              className="btn btn-outline btn-sm"
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}
            >
              📊 {t('operationReport')}
            </button>
          </div>

          <div className="card">
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>{t('reportList')}</th>
                    <th style={{ width: '50%' }}>{t('reportDescription')}</th>
                    <th style={{ textAlign: 'center', width: '10%' }}>{t('reportAction')}</th>
                  </tr>
                </thead>
                <tbody>
                  {FINANCIAL_REPORTS.map((r) => (
                    <tr
                      key={r.key}
                      style={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/report/financial/${r.key}`)}
                    >
                      <td style={{ fontWeight: 600, color: 'var(--accent)', padding: '14px 16px', fontSize: 15 }}>
                        {t(r.titleKey as any)}
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {t(r.descKey as any)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ padding: '6px 14px' }}
                          onClick={(e) => { e.stopPropagation(); router.push(`/report/financial/${r.key}`); }}
                        >
                          <MdSearch size={16} />
                        </button>
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
  );
}
