'use client';

import React, { useEffect, useState } from 'react';
import { formatDateToDDMMYYYY } from '@/components/ui/DateInput';
import { useTenant } from '@/lib/TenantContext';
import { useLanguage } from '@/lib/LanguageContext';

interface ReportHeaderProps {
  title: string;
  startDate?: string;
  endDate?: string;
}

export default function ReportHeader({ title, startDate, endDate }: ReportHeaderProps) {
  const { tenant, isTenant } = useTenant();
  const { lang } = useLanguage();
  const [orgInfo, setOrgInfo] = useState<{ name: string; logo: string; phone: string; address: string }>({
    name: '',
    logo: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    try {
      const cacheKey = tenant?.subdomain ? `app-org-settings-${tenant.subdomain}` : 'app-org-settings';
      const cached = localStorage.getItem(cacheKey) || localStorage.getItem('app-org-settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        setOrgInfo({
          name: parsed?.name || '',
          logo: parsed?.logo || '',
          phone: parsed?.phone || '',
          address: parsed?.address || '',
        });
      }
    } catch {}
  }, [tenant?.subdomain]);

  const companyName =
    (isTenant && tenant?.companyName && (!orgInfo.name || orgInfo.name === 'EBS Digital Solutions'))
      ? tenant.companyName
      : orgInfo.name || tenant?.companyName || 'Delivery Express';
  const companyLogo = tenant?.logoUrl || orgInfo.logo;
  const companyPhone = orgInfo.phone || tenant?.phone || '';
  const companyAddress = orgInfo.address || tenant?.address || '';

  return (
    <div
      className="print-only"
      style={{
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: '2px solid #0f172a',
        fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, width: '100%' }}>
        {/* Left: Branded Logo & Company Info */}
        <div style={{ flex: 1, fontSize: 10.5, lineHeight: 1.55, color: '#0f172a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={companyName}
                style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'contain' }}
              />
            ) : (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: '#1e3a8a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: 15,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {companyName.charAt(0).toUpperCase()}
              </div>
            )}
            <span style={{ fontSize: 15, fontWeight: 800, color: '#1e3a8a', lineHeight: 1.2 }}>
              {companyName}
            </span>
          </div>
          {companyAddress && (
            <div>
              <strong>{lang === 'km' ? 'អាសយដ្ឋាន៖' : 'Address:'}</strong> {companyAddress}
            </div>
          )}
          {companyPhone && (
            <div>
              <strong>{lang === 'km' ? 'ទូរស័ព្ទ៖' : 'Phone:'}</strong> {companyPhone}
            </div>
          )}
        </div>

        {/* Center: Report Title */}
        <div style={{ flex: 1.4, textAlign: 'center', alignSelf: 'center' }}>
          <h1 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: '#0f172a', lineHeight: 1.35 }}>
            {title}
          </h1>
          <div style={{ fontSize: 10.5, color: '#475569', marginTop: 4, fontWeight: 600 }}>
            {startDate && endDate
              ? lang === 'km'
                ? `ចាប់ពីថ្ងៃទី ${formatDateToDDMMYYYY(startDate)} ដល់ ${formatDateToDDMMYYYY(endDate)}`
                : `Period: ${formatDateToDDMMYYYY(startDate)} - ${formatDateToDDMMYYYY(endDate)}`
              : lang === 'km'
                ? `កាលបរិច្ឆេទ៖ ${formatDateToDDMMYYYY(new Date().toISOString())}`
                : `Date: ${formatDateToDDMMYYYY(new Date().toISOString())}`}
          </div>
        </div>

        {/* Right: Print Metadata */}
        <div style={{ flex: 1, textAlign: 'right', fontSize: 10.5, lineHeight: 1.55, color: '#334155' }}>
          <div>
            <strong>{lang === 'km' ? 'សាខា៖' : 'Branch:'}</strong>{' '}
            <span>{lang === 'km' ? 'ការិយាល័យកណ្តាល' : 'Head Office'}</span>
          </div>
          <div>
            <strong>{lang === 'km' ? 'ថ្ងៃបោះពុម្ព៖' : 'Printed:'}</strong>{' '}
            <span>{formatDateToDDMMYYYY(new Date().toISOString())}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
