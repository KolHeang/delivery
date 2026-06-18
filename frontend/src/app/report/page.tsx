'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { useLanguage } from '@/lib/LanguageContext';

const OPERATION_REPORTS = [
  {
    key: '1', icon: '/3d/3d_check.png', color: '#3b82f6', bg: '#eff6ff',
    titleKey: 'rpt1Title',
    desc: { en: 'Detailed daily delivery log', km: 'កំណត់ហេតុការដឹកប្រចាំថ្ងៃ' },
  },
  {
    key: '2', icon: '/3d/3d_scooter.png', color: '#10b981', bg: '#ecfdf5',
    titleKey: 'rpt2Title',
    desc: { en: 'Delivery totals grouped by driver', km: 'ការដឹកជញ្ជូនសរុបតាមភ្នាក់ងារ' },
  },
  {
    key: '3', icon: '/3d/3d_dashboard.png', color: '#8b5cf6', bg: '#f5f3ff',
    titleKey: 'rpt3Title',
    desc: { en: 'Driver performance by date', km: 'ប្រតិបត្តិការភ្នាក់ងារតាមថ្ងៃ' },
  },
  {
    key: '4', icon: '/3d/3d_truck.png', color: '#f59e0b', bg: '#fffbeb',
    titleKey: 'rpt4Title',
    desc: { en: 'Deliveries grouped by merchant', km: 'ការដឹកជញ្ជូនសរុបតាមអតិថិជន' },
  },
  {
    key: '5', icon: '/3d/3d_barchart.png', color: '#06b6d4', bg: '#ecfeff',
    titleKey: 'rpt5Title',
    desc: { en: 'Merchant operations day by day', km: 'ប្រតិបត្តិការអតិថិជនតាមថ្ងៃ' },
  },
  {
    key: '6', icon: '/3d/3d_box.png', color: '#6366f1', bg: '#eef2ff',
    titleKey: 'rpt6Title',
    desc: { en: 'Package details & status', km: 'ព័ត៌មានលម្អិតអំពីកញ្ចប់' },
  },
  {
    key: '7', icon: '/3d/3d_users.png', color: '#ec4899', bg: '#fdf2f8',
    titleKey: 'rpt7Title',
    desc: { en: 'Pickup Useractivity log', km: 'សកម្មភាពអ្នក Pickup' },
  },
  {
    key: '8', icon: '/3d/3d_refresh.png', color: '#14b8a6', bg: '#f0fdfa',
    titleKey: 'rpt8Title',
    desc: { en: 'Stock in, out & remaining', km: 'ស្តុកចូល ចេញ និងនៅសល់' },
  },
] as const;

const FINANCIAL_REPORTS = [
  {
    key: '1', icon: '/3d/3d_cash.png', color: '#2563eb', bg: '#eff6ff',
    titleKey: 'frpt1Title',
    desc: { en: 'Daily income & expense ledger', km: 'បញ្ជីចំណូល-ចំណាយប្រចាំថ្ងៃ' },
  },
  {
    key: '2', icon: '/3d/3d_money_bag.png', color: '#16a34a', bg: '#f0fdf4',
    titleKey: 'frpt2Title',
    desc: { en: 'Daily amount collected by driver', km: 'ទឹកប្រាក់ប្រមូលប្រចាំថ្ងៃ' },
  },
  {
    key: '3', icon: '/3d/3d_khr_coin.png', color: '#7c3aed', bg: '#f5f3ff',
    titleKey: 'frpt3Title',
    desc: { en: 'Monthly balance & savings summary', km: 'សមតុល្យ និងប្រាក់ចំណើមប្រចាំខែ' },
  },
] as const;

export default function ReportPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();

  useEffect(() => { if (!isAuthenticated()) router.push('/'); }, [router]);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('report')} subtitle={lang === 'km' ? 'ជ្រើសរើសរបាយការណ៍' : 'Select a report to view'} />
        <div className="page-content">

          {/* ── Operation Reports ── */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, overflow: 'hidden',
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

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
            }}>
              {OPERATION_REPORTS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => router.push(`/report/operation/${r.key}`)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    padding: '20px 20px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.18s ease',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 24px ${r.color}22`;
                    (e.currentTarget as HTMLButtonElement).style.borderColor = r.color;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 46, height: 46, borderRadius: 12,
                    background: r.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, overflow: 'hidden',
                  }}>
                    <img src={r.icon} alt="" style={{ width: '75%', height: '75%', objectFit: 'contain' }} />
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: r.color,
                      textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4,
                    }}>
                      Report {r.key}
                    </div>
                    <div style={{
                      fontSize: 13.5, fontWeight: 700,
                      color: 'var(--text-primary)', lineHeight: 1.35,
                      marginBottom: 5,
                    }}>
                      {t(r.titleKey as any).replace(`${r.key}-`, '').replace(`${r.key}-`, '')}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {lang === 'km' ? r.desc.km : r.desc.en}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: r.bg, color: r.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, flexShrink: 0, marginTop: 2,
                  }}>›</div>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border)', marginBottom: 32 }} />

          {/* ── Financial Reports ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg,#10b981,#2563eb)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, overflow: 'hidden',
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

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
            }}>
              {FINANCIAL_REPORTS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => router.push(`/report/financial/${r.key}`)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    padding: '20px 20px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.18s ease',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 24px ${r.color}22`;
                    (e.currentTarget as HTMLButtonElement).style.borderColor = r.color;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                  }}
                >
                  <div style={{
                    width: 46, height: 46, borderRadius: 12,
                    background: r.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, overflow: 'hidden',
                  }}>
                    <img src={r.icon} alt="" style={{ width: '75%', height: '75%', objectFit: 'contain' }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: r.color,
                      textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4,
                    }}>
                      Financial {r.key}
                    </div>
                    <div style={{
                      fontSize: 13.5, fontWeight: 700,
                      color: 'var(--text-primary)', lineHeight: 1.35,
                      marginBottom: 5,
                    }}>
                      {t(r.titleKey as any).replace(`${r.key}-`, '')}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {lang === 'km' ? r.desc.km : r.desc.en}
                    </div>
                  </div>

                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: r.bg, color: r.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, flexShrink: 0, marginTop: 2,
                  }}>›</div>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
