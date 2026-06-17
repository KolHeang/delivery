'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { useLanguage } from '@/lib/LanguageContext';
import { MdSearch } from 'react-icons/md';

const OPERATION_REPORTS = [
  { key: '1', titleKey: 'rpt1Title' },
  { key: '2', titleKey: 'rpt2Title' },
  { key: '3', titleKey: 'rpt3Title' },
  { key: '4', titleKey: 'rpt4Title' },
  { key: '5', titleKey: 'rpt5Title' },
  { key: '6', titleKey: 'rpt6Title' },
  { key: '7', titleKey: 'rpt7Title' },
  { key: '8', titleKey: 'rpt8Title' },
] as const;

export default function OperationReportMenuPage() {
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => { if (!isAuthenticated()) router.push('/'); }, [router]);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('operationReportTitle')} subtitle={t('operationReportSubtitle')} />
        <div className="page-content">

          {/* Tab bar */}
          <div className="no-print" style={{ display: 'flex', gap: 12, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
            <button
              onClick={() => router.push('/report/financial')}
              className="btn btn-outline btn-sm"
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}
            >
              💵 {t('financialReport')}
            </button>
            <button
              className="btn btn-primary btn-sm"
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
                    <th style={{ width: '80%' }}>{t('reportList')}</th>
                    <th style={{ textAlign: 'center', width: '20%' }}>{t('reportAction')}</th>
                  </tr>
                </thead>
                <tbody>
                  {OPERATION_REPORTS.map((r) => (
                    <tr
                      key={r.key}
                      style={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/report/operation/${r.key}`)}
                    >
                      <td style={{ fontWeight: 600, color: 'var(--accent)', padding: '14px 16px', fontSize: 15 }}>
                        {t(r.titleKey as any)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ padding: '6px 14px' }}
                          onClick={(e) => { e.stopPropagation(); router.push(`/report/operation/${r.key}`); }}
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
