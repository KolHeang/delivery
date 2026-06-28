'use client';

import React from 'react';
import { formatDateToDDMMYYYY } from '@/components/ui/DateInput';

interface ReportHeaderProps {
  title: string;
  startDate?: string;
  endDate?: string;
}

export default function ReportHeader({ title, startDate, endDate }: ReportHeaderProps) {
  return (
    <div className="print-only" style={{
      marginBottom: 20,
      paddingBottom: 12,
      borderBottom: '2px solid #000',
      fontFamily: 'Kantumruy Pro, Inter, sans-serif',
      WebkitPrintColorAdjust: 'exact',
      printColorAdjust: 'exact'
    }}>
      {/* Top Row: Logo (Left) and Centered Title (Center) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
        {/* Left: Branded Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1.2 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, #2563eb, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 18, boxShadow: '0 4px 10px rgba(37,99,235,0.2)',
            flexShrink: 0,
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact'
          }}>
            📦
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#1e3a8a', letterSpacing: '0.3px', lineHeight: 1.1, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              EBS<span style={{ color: '#2563eb' }}>Express</span>
            </span>
            <span style={{ fontSize: 9, color: '#4b5563', fontWeight: 600, letterSpacing: '0.1px' }}>
              Delivery System
            </span>
          </div>
        </div>

        {/* Center: Title (Centered) */}
        <div style={{ textAlign: 'center', flex: 1.6, paddingTop: 6 }}>
          <h1 style={{ fontSize: 16, fontWeight: 'bold', margin: 0, color: '#000' }}>
            EBS Express
          </h1>
          <h2 style={{ fontSize: 13, fontWeight: 'bold', margin: '4px 0 0', color: '#000' }}>
            {title}
          </h2>
        </div>

        {/* Right: Balance spacer */}
        <div style={{ flex: 1.2 }} />
      </div>

      {/* Bottom Row: Branch and Date (Left Aligned) */}
      <div style={{ marginTop: 15, fontSize: 11, lineHeight: '1.6', textAlign: 'left' }}>
        <div>
          <strong>សាខា៖</strong> <span style={{ fontStyle: 'italic' }}>ការិយាល័យកណ្តាល</span>
        </div>
        <div>
          <strong>កាលបរិច្ឆេទ៖</strong>{' '}
          <span style={{ fontStyle: 'italic' }}>
            {startDate && endDate
              ? `ថ្ងៃទី ${formatDateToDDMMYYYY(startDate)} ដល់ ${formatDateToDDMMYYYY(endDate)}`
              : `ថ្ងៃទី ${formatDateToDDMMYYYY(new Date().toISOString())}`}
          </span>
        </div>
      </div>
    </div>
  );
}
