'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { saasApi } from '@/lib/saas-api';
import {
  MdContentCopy,
  MdCheck,
  MdAttachMoney,
  MdPeople,
  MdAccountBalance,
  MdTrendingUp,
  MdCheckCircle,
  MdSchedule,
  MdHandshake,
  MdShare,
  MdSend,
  MdWorkspacePremium,
} from 'react-icons/md';

export default function PartnerDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchPartnerStats();
  }, []);

  const fetchPartnerStats = async () => {
    try {
      setLoading(true);
      const res = await saasApi.getPartnerStats();
      setData(res);
    } catch (err) {
      console.error('Failed to load partner stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const partner = data?.partner || {
    name: 'Cambodia Tech Partner',
    email: 'partner@saas.com',
    referralCode: 'PARTNER15',
    commissionRate: 15,
    bankAccountInfo: {
      bankName: 'ABA Bank',
      accountNumber: '001 234 567',
      accountName: 'SAAS TECH PARTNER',
    },
  };

  const stats = data?.stats || {
    totalReferrals: 8,
    totalEarned: 245.5,
    pendingAmount: 75.0,
    approvedAmount: 45.0,
    paidAmount: 125.5,
  };

  const recentCommissions = data?.recentCommissions || [
    {
      id: 1,
      calculatedAmount: 14.85,
      commissionRate: 15,
      status: 'paid',
      createdAt: '2026-08-10',
      payoutReference: 'ABA-TRX-98212',
    },
    {
      id: 2,
      calculatedAmount: 7.35,
      commissionRate: 15,
      status: 'pending',
      createdAt: '2026-08-16',
    },
  ];

  const referralUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/pricing?ref=${partner.referralCode}`
    : `http://localhost:3000/pricing?ref=${partner.referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <MainLayout>
      <div style={{ width: '100%', paddingBottom: 40 }}>
        {/* Header Hero Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
            borderRadius: 24,
            padding: '36px',
            color: '#fff',
            marginBottom: 32,
            boxShadow: '0 20px 45px -12px rgba(6, 78, 59, 0.4)',
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          {/* Subtle Ambient Light */}
          <div
            style={{
              position: 'absolute',
              top: -60,
              right: -60,
              width: 260,
              height: 260,
              background: 'radial-gradient(circle, rgba(52, 211, 153, 0.3), transparent 70%)',
              borderRadius: '50%',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
            <div style={{ maxWidth: 540 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                  padding: '4px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#a7f3d0',
                  marginBottom: 14,
                  border: '1px solid rgba(255,255,255,0.2)',
                  letterSpacing: '0.5px',
                }}
              >
                <MdHandshake size={15} />
                <span>AFFILIATE & PARTNER PROGRAM</span>
              </div>

              <h1 style={{ fontSize: 30, fontWeight: 900, margin: '0 0 10px', letterSpacing: '-0.5px', lineHeight: 1.3 }}>
                ផ្ទាំងគ្រប់គ្រងដៃគូសហការ (Partner Portal)
              </h1>
              <p style={{ fontSize: 14.5, color: '#d1fae5', margin: 0, lineHeight: 1.6 }}>
                ណែនាំអតិថិជនប្រើប្រាស់ប្រព័ន្ធ SaaS និងទទួលបានកម្រៃជើងសារ <strong style={{ color: '#fff', textDecoration: 'underline' }}>{partner.commissionRate}%</strong> រាល់ពេលដែលពួកគេបង់ប្រាក់!
              </p>
            </div>

            {/* Referral Link Box */}
            <div
              style={{
                background: 'rgba(255,255,255,0.95)',
                borderRadius: 18,
                padding: '20px 24px',
                color: '#0f172a',
                minWidth: 320,
                boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
              }}
            >
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 800, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🔗 តំណភ្ជាប់ណែនាំរបស់អ្នក (Referral Link)
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  readOnly
                  value={referralUrl}
                  style={{
                    flex: 1,
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#0f172a',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleCopy}
                  style={{
                    background: copied ? '#10b981' : '#0f172a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 16px',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                >
                  {copied ? <MdCheck size={16} /> : <MdContentCopy size={16} />}
                  <span>{copied ? 'ចម្លងរួច' : 'ចម្លង'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Stats Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 20,
            marginBottom: 32,
          }}
        >
          {/* Card 1 */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 8px 24px -6px rgba(15, 23, 42, 0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                flexShrink: 0,
              }}
            >
              <MdAttachMoney size={28} />
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>ចំណូលសរុប (Total Earned)</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', marginTop: 4 }}>
                ${Number(stats.totalEarned).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 8px 24px -6px rgba(15, 23, 42, 0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                color: '#b45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                flexShrink: 0,
              }}
            >
              <MdSchedule size={26} />
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>រង់ចាំអនុម័ត (Pending)</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#d97706', marginTop: 4 }}>
                ${Number(stats.pendingAmount).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 8px 24px -6px rgba(15, 23, 42, 0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
                color: '#4338ca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                flexShrink: 0,
              }}
            >
              <MdCheckCircle size={26} />
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>បានបើកជូនរួច (Paid Out)</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#4f46e5', marginTop: 4 }}>
                ${Number(stats.paidAmount).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              padding: '24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 8px 24px -6px rgba(15, 23, 42, 0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #fce7f3, #fbcfe8)',
                color: '#be185d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                flexShrink: 0,
              }}
            >
              <MdPeople size={26} />
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>អ្នកចុះឈ្មោះ (Referrals)</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', marginTop: 4 }}>
                {stats.totalReferrals} <span style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>Tenants</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bank / Payout Information Box */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 20,
            padding: '24px 28px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 8px 24px -6px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 20,
            marginBottom: 32,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: '#f1f5f9',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MdAccountBalance size={24} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                គណនីធនាគារទទួលប្រាក់ ({partner.bankAccountInfo?.bankName || 'ABA Bank'})
              </div>
              <div style={{ fontSize: 13.5, color: '#64748b', marginTop: 2 }}>
                លេខកូដ៖ <strong>{partner.bankAccountInfo?.accountNumber || '001 234 567'}</strong> • ឈ្មោះ៖ <strong>{partner.bankAccountInfo?.accountName || 'SAAS TECH PARTNER'}</strong>
              </div>
            </div>
          </div>

          <button
            onClick={() => alert('សំណើបើកប្រាក់ត្រូវបានបញ្ជូនទៅកាន់ Admin ត្រួតពិនិត្យ!')}
            style={{
              padding: '11px 22px',
              borderRadius: 12,
              border: 'none',
              background: '#0f172a',
              color: '#fff',
              fontWeight: 800,
              fontSize: 13.5,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(15,23,42,0.15)',
            }}
          >
            ស្នើសុំដកប្រាក់ (Request Payout)
          </button>
        </div>

        {/* Commission History Table */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 24,
            padding: '30px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.04)',
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 20px' }}>
            ប្រវត្តិទឹកប្រាក់កម្រៃជើងសារ (Recent Commissions)
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontSize: 13, fontWeight: 700 }}>
                  <th style={{ padding: '14px 16px', borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }}>កាលបរិច្ឆេទ</th>
                  <th style={{ padding: '14px 16px' }}>ភាគរយ (%)</th>
                  <th style={{ padding: '14px 16px' }}>ទឹកប្រាក់កម្រៃជើងសារ</th>
                  <th style={{ padding: '14px 16px' }}>ស្ថានភាព</th>
                  <th style={{ padding: '14px 16px', borderTopRightRadius: 10, borderBottomRightRadius: 10 }}>លេខយោង (Tx Ref)</th>
                </tr>
              </thead>
              <tbody>
                {recentCommissions.map((c: any) => (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      fontSize: 14,
                    }}
                  >
                    <td style={{ padding: '16px', color: '#64748b' }}>
                      {c.createdAt}
                    </td>
                    <td style={{ padding: '16px', fontWeight: 700, color: '#4f46e5' }}>
                      {c.commissionRate}%
                    </td>
                    <td style={{ padding: '16px', fontWeight: 900, color: '#059669', fontSize: 15 }}>
                      +${Number(c.calculatedAmount).toFixed(2)}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          background: c.status === 'paid' ? '#ecfdf5' : '#fef3c7',
                          color: c.status === 'paid' ? '#059669' : '#d97706',
                          padding: '4px 12px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.status === 'paid' ? '#10b981' : '#f59e0b' }} />
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: '#64748b', fontFamily: 'monospace' }}>
                      {c.payoutReference || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
