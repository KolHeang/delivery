'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, hasPermission } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { useLanguage } from '@/lib/LanguageContext';

const OPERATION_REPORTS = [
  {
    key: '1', icon: '/3d/3d_check.png', color: '#3b82f6', bg: '#eff6ff',
    titleKey: 'rpt1Title',
    permission: 'reports.operation_daily',
    desc: { en: 'Detailed daily delivery log', km: 'កំណត់ហេតុការដឹកប្រចាំថ្ងៃ' },
  },
  {
    key: '2', icon: '/3d/3d_scooter.png', color: '#10b981', bg: '#ecfdf5',
    titleKey: 'rpt2Title',
    permission: 'reports.operation_driver',
    desc: { en: 'Delivery totals grouped by driver', km: 'ការដឹកជញ្ជូនសរុបតាមភ្នាក់ងារ' },
  },
  {
    key: '3', icon: '/3d/3d_dashboard.png', color: '#8b5cf6', bg: '#f5f3ff',
    titleKey: 'rpt3Title',
    permission: 'reports.operation_driver_daily',
    desc: { en: 'Driver performance by date', km: 'ប្រតិបត្តិការភ្នាក់ងារតាមថ្ងៃ' },
  },
  {
    key: '4', icon: '/3d/3d_truck.png', color: '#f59e0b', bg: '#fffbeb',
    titleKey: 'rpt4Title',
    permission: 'reports.operation_merchant',
    desc: { en: 'Deliveries grouped by merchant', km: 'ការដឹកជញ្ជូនសរុបតាមអតិថិជន' },
  },
  {
    key: '5', icon: '/3d/3d_barchart.png', color: '#06b6d4', bg: '#ecfeff',
    titleKey: 'rpt5Title',
    permission: 'reports.operation_merchant_daily',
    desc: { en: 'Merchant operations day by day', km: 'ប្រតិបត្តិការអតិថិជនតាមថ្ងៃ' },
  },
  {
    key: '6', icon: '/3d/3d_box.png', color: '#6366f1', bg: '#eef2ff',
    titleKey: 'rpt6Title',
    permission: 'reports.operation_package',
    desc: { en: 'Package details & status', km: 'ព័ត៌មានលម្អិតអំពីកញ្ចប់' },
  },
  {
    key: '7', icon: '/3d/3d_users.png', color: '#ec4899', bg: '#fdf2f8',
    titleKey: 'rpt7Title',
    permission: 'reports.operation_pickup',
    desc: { en: 'Pickup Useractivity log', km: 'សកម្មភាពអ្នក Pickup' },
  },
  {
    key: '8', icon: '/3d/3d_refresh.png', color: '#14b8a6', bg: '#f0fdfa',
    titleKey: 'rpt8Title',
    permission: 'reports.operation_stock',
    desc: { en: 'Stock in, out & remaining', km: 'ស្តុកចូល ចេញ និងនៅសល់' },
  },
] as const;

const FINANCIAL_REPORTS = [
  {
    key: '1', icon: '/3d/3d_cash.png', color: '#2563eb', bg: '#eff6ff',
    titleKey: 'frpt1Title',
    permission: 'reports.financial_ledger',
    desc: { en: 'Daily income & expense ledger', km: 'បញ្ជីចំណូល-ចំណាយប្រចាំថ្ងៃ' },
  },
  {
    key: '2', icon: '/3d/3d_money_bag.png', color: '#16a34a', bg: '#f0fdf4',
    titleKey: 'frpt2Title',
    permission: 'reports.financial_collection',
    desc: { en: 'Daily amount collected by driver', km: 'ទឹកប្រាក់ប្រមូលប្រចាំថ្ងៃ' },
  },
  {
    key: '3', icon: '/3d/3d_khr_coin.png', color: '#7c3aed', bg: '#f5f3ff',
    titleKey: 'frpt3Title',
    permission: 'reports.financial_balance',
    desc: { en: 'Monthly balance & savings summary', km: 'សមតុល្យ និងប្រាក់ចំណើមប្រចាំខែ' },
  },
] as const;

export default function ReportPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();

  useEffect(() => { if (!isAuthenticated()) router.push('/'); }, [router]);

  const visibleOperationReports = OPERATION_REPORTS.filter(r => hasPermission(r.permission) || hasPermission('reports.view'));
  const visibleFinancialReports = FINANCIAL_REPORTS.filter(r => hasPermission(r.permission) || hasPermission('reports.view'));

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('report')} subtitle={lang === 'km' ? 'ជ្រើសរើសរបាយការណ៍' : 'Select a report to view'} />
        <div className="page-content">

          <style>{`
            .reports-grid-4 {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 16px;
            }
            .reports-grid-3 {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 16px;
            }
            @media (max-width: 1300px) {
              .reports-grid-4 {
                grid-template-columns: repeat(2, 1fr);
              }
              .reports-grid-3 {
                grid-template-columns: repeat(2, 1fr);
              }
            }
            @media (max-width: 768px) {
              .reports-grid-4, .reports-grid-3 {
                grid-template-columns: 1fr;
              }
            }
            .report-card {
              background: var(--bg-card, #ffffff);
              border: 1.5px solid #e2e8f0;
              border-radius: 16px;
              padding: 20px 16px;
              display: flex;
              align-items: flex-start;
              gap: 14px;
              cursor: pointer;
              transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
              text-align: left;
              position: relative;
              overflow: hidden;
              box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            }
            .report-card:hover {
              transform: translateY(-3px);
              box-shadow: 0 12px 28px -6px rgba(0,0,0,0.08);
            }
            .report-card:hover .report-card-icon {
              transform: scale(1.08);
            }
            .report-card:hover .report-card-arrow {
              transform: translateX(3px);
            }
          `}</style>

          {/* ── Operation Reports ── */}
          {visibleOperationReports.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
                  }}>
                    <img src="/3d/3d_barchart.png" alt="" style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {t('operationReportTitle')}
                    </h2>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {t('operationReportSubtitle')}
                    </p>
                  </div>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 600, color: '#3b82f6',
                  background: '#eff6ff', border: '1px solid #bfdbfe',
                  padding: '4px 12px', borderRadius: 20,
                }}>
                  {visibleOperationReports.length} {lang === 'km' ? 'របាយការណ៍' : 'Reports'}
                </span>
              </div>

              <div className="reports-grid-4">
                {visibleOperationReports.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => router.push(`/report/operation/${r.key}`)}
                    className="report-card"
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = r.color;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0';
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: r.bg,
                      border: `1px solid ${r.color}25`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, overflow: 'hidden',
                      transition: 'transform 0.2s ease',
                    }} className="report-card-icon">
                      <img src={r.icon} alt="" style={{ width: '72%', height: '72%', objectFit: 'contain' }} />
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{
                          fontSize: 10.5, fontWeight: 700, color: r.color,
                          background: r.bg, border: `1px solid ${r.color}35`,
                          padding: '1px 7px', borderRadius: 6,
                          textTransform: 'uppercase', letterSpacing: '0.5px',
                        }}>
                          Report {r.key}
                        </span>
                      </div>
                      <div style={{
                        fontSize: 14, fontWeight: 700,
                        color: 'var(--text-primary)', lineHeight: 1.45,
                        marginBottom: 4,
                      }}>
                        {t(r.titleKey as any).replace(`${r.key}-`, '').replace(`${r.key}-`, '')}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                        {lang === 'km' ? r.desc.km : r.desc.en}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div style={{
                      width: 26, height: 26, borderRadius: 8,
                      background: r.bg, color: r.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, fontWeight: 700, flexShrink: 0, marginTop: 2,
                      transition: 'transform 0.2s ease',
                    }} className="report-card-arrow">›</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          {visibleOperationReports.length > 0 && visibleFinancialReports.length > 0 && (
            <div style={{ height: 1, background: '#f1f5f9', marginBottom: 32 }} />
          )}

          {/* ── Financial Reports ── */}
          {visibleFinancialReports.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: 'linear-gradient(135deg, #10b981, #2563eb)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                  }}>
                    <img src="/3d/3d_cash.png" alt="" style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {t('financialReportTitle')}
                    </h2>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {t('financialReportSubtitle')}
                    </p>
                  </div>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 600, color: '#10b981',
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  padding: '4px 12px', borderRadius: 20,
                }}>
                  {visibleFinancialReports.length} {lang === 'km' ? 'របាយការណ៍' : 'Reports'}
                </span>
              </div>

              <div className="reports-grid-3">
                {visibleFinancialReports.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => router.push(`/report/financial/${r.key}`)}
                    className="report-card"
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = r.color;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0';
                    }}
                  >
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: r.bg,
                      border: `1px solid ${r.color}25`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, overflow: 'hidden',
                      transition: 'transform 0.2s ease',
                    }} className="report-card-icon">
                      <img src={r.icon} alt="" style={{ width: '72%', height: '72%', objectFit: 'contain' }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{
                          fontSize: 10.5, fontWeight: 700, color: r.color,
                          background: r.bg, border: `1px solid ${r.color}35`,
                          padding: '1px 7px', borderRadius: 6,
                          textTransform: 'uppercase', letterSpacing: '0.5px',
                        }}>
                          Financial {r.key}
                        </span>
                      </div>
                      <div style={{
                        fontSize: 14, fontWeight: 700,
                        color: 'var(--text-primary)', lineHeight: 1.45,
                        marginBottom: 4,
                      }}>
                        {t(r.titleKey as any).replace(`${r.key}-`, '')}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                        {lang === 'km' ? r.desc.km : r.desc.en}
                      </div>
                    </div>

                    <div style={{
                      width: 26, height: 26, borderRadius: 8,
                      background: r.bg, color: r.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, fontWeight: 700, flexShrink: 0, marginTop: 2,
                      transition: 'transform 0.2s ease',
                    }} className="report-card-arrow">›</div>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
