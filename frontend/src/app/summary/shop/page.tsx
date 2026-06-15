'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { MdSearch } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';

interface ShopSummary {
  id: number;
  name: string;
  delivered: number;
  failed: number;
  returned: number;
  qrShopUSD: number;
  qrShopKHR: number;
  qrDriverUSD: number;
  qrDriverKHR: number;
  codUSD: number;
  codKHR: number;
  fee: number;
}

export default function ShopSummaryPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [data, setData] = useState<ShopSummary[]>([]);
  const [filtered, setFiltered] = useState<ShopSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:3001/reports/shop-summary', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        setData(res.data);
      } catch (error) {
        console.error('Failed to fetch shop summary:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(q ? data.filter(i => i.name?.toLowerCase().includes(q)) : data);
  }, [data, search]);

  const totalDelivered = filtered.reduce((acc, curr) => acc + curr.delivered, 0);
  const totalFailed = filtered.reduce((acc, curr) => acc + curr.failed, 0);
  const totalReturned = filtered.reduce((acc, curr) => acc + curr.returned, 0);
  const totalCodUSD = filtered.reduce((acc, curr) => acc + curr.codUSD, 0);
  const totalCodKHR = filtered.reduce((acc, curr) => acc + curr.codKHR, 0);
  const totalFee = filtered.reduce((acc, curr) => acc + curr.fee, 0);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('shopSummary') || 'Shop Summary'} subtitle={`${filtered.length} entries`} />
        
        <div className="page-content">
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px' }}>
              <div className="search-input-wrapper">
                <MdSearch className="search-icon" />
                <input 
                  className="form-control search-input" 
                  placeholder="Search Shop..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">🏪 {t('shopSummary') || 'Shop Summary'}</span>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid var(--border)' }}>ល.រ</th>
                    <th rowSpan={2} style={{ verticalAlign: 'middle', borderRight: '1px solid var(--border)' }}>ឈ្មោះ ហាង</th>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid var(--border)' }}>ដឹកជញ្ជូនរួច</th>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid var(--border)' }}>បរាជ័យ</th>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid var(--border)' }}>ប្រគល់</th>
                    <th colSpan={2} style={{ textAlign: 'center', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>QR ហាង</th>
                    <th colSpan={2} style={{ textAlign: 'center', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>QR អ្នកដឹក</th>
                    <th colSpan={2} style={{ textAlign: 'center', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>COD</th>
                    <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle' }}>សេវាដឹក</th>
                  </tr>
                  <tr>
                    <th style={{ textAlign: 'center', borderRight: '1px solid var(--border)', borderTop: 'none' }}>USD</th>
                    <th style={{ textAlign: 'center', borderRight: '1px solid var(--border)', borderTop: 'none' }}>KHR</th>
                    <th style={{ textAlign: 'center', borderRight: '1px solid var(--border)', borderTop: 'none' }}>USD</th>
                    <th style={{ textAlign: 'center', borderRight: '1px solid var(--border)', borderTop: 'none' }}>KHR</th>
                    <th style={{ textAlign: 'center', borderRight: '1px solid var(--border)', borderTop: 'none' }}>USD</th>
                    <th style={{ textAlign: 'center', borderRight: '1px solid var(--border)', borderTop: 'none' }}>KHR</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={12} style={{ textAlign: 'center', padding: '40px 0' }}>
                        <div className="spinner" style={{ margin: '0 auto' }} />
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={12} style={{ padding: '60px 0', borderBottom: 'none' }}>
                        <div className="empty-state" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                          <div className="empty-state-icon" style={{ fontSize: 48, marginBottom: 16 }}>🏪</div>
                          <div className="empty-state-title">No data available</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filtered.map((row, index) => (
                        <tr key={row.id}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>{index + 1}</td>
                          <td style={{ fontWeight: 600, borderRight: '1px solid var(--border-light)' }}>{row.name}</td>
                          <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>{row.delivered} កញ្ចប់</td>
                          <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>{row.failed} កញ្ចប់</td>
                          <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>{row.returned} កញ្ចប់</td>
                          <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>${(row.qrShopUSD || 0).toFixed(2)}</td>
                          <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>៛{row.qrShopKHR || 0}</td>
                          <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>${(row.qrDriverUSD || 0).toFixed(2)}</td>
                          <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>៛{row.qrDriverKHR || 0}</td>
                          <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-light)', fontWeight: 600 }}>${(row.codUSD || 0).toFixed(2)}</td>
                          <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-light)', fontWeight: 600 }}>៛{(row.codKHR || 0).toLocaleString()}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--success)' }}>${(row.fee || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr style={{ background: 'var(--bg-primary)', fontWeight: 700 }}>
                        <td colSpan={2} style={{ textAlign: 'right', paddingRight: 20, borderRight: '1px solid var(--border)' }}>សរុប</td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>{totalDelivered} កញ្ចប់</td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>{totalFailed} កញ្ចប់</td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>{totalReturned} កញ្ចប់</td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>$0.00</td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>៛0</td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>$0.00</td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>៛0</td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>${totalCodUSD.toFixed(2)}</td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>៛{totalCodKHR.toLocaleString()}</td>
                        <td style={{ textAlign: 'center', color: 'var(--success)' }}>${totalFee.toFixed(2)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
