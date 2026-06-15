'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { MdSearch } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';

interface PickupSummary {
  id: number;
  name: string;
  package: number;
  fee: number;
}

export default function PickUpSummaryPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [data, setData] = useState<PickupSummary[]>([]);
  const [filtered, setFiltered] = useState<PickupSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    const fetchData = async () => {
      try {
        const res = await api.get('/reports/pickup-summary');
        setData(res.data);
      } catch (error) {
        console.error('Failed to fetch pickup summary:', error);
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

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('pickupSummary') || 'Pick Up Summary'} subtitle={`${filtered.length} entries`} />
        
        <div className="page-content">
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Show</span>
                <select className="form-control" style={{ width: 70, padding: '4px 8px' }}>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>entries</span>
              </div>
              <div className="search-input-wrapper">
                <MdSearch className="search-icon" />
                <input 
                  className="form-control search-input" 
                  placeholder="Search Pick Up Person..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">🚚 {t('pickupSummary') || 'Pick Up Summary'} / សង្ខេបអ្នកប្រមូលកញ្ចប់</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 60, textAlign: 'center' }}>#</th>
                    <th>អ្នកយកកញ្ចប់</th>
                    <th style={{ textAlign: 'center' }}>សរុបកញ្ចប់</th>
                    <th style={{ textAlign: 'right', paddingRight: 24 }}>សរុបតម្លៃដឹកជញ្ជូន</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '40px 0' }}>
                        <div className="spinner" style={{ margin: '0 auto' }} />
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '60px 0', borderBottom: 'none' }}>
                        <div className="empty-state" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                          <div className="empty-state-icon" style={{ fontSize: 48, marginBottom: 16 }}>🚚</div>
                          <div className="empty-state-title">No data available</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row, index) => (
                      <tr key={row.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>{index + 1}</td>
                        <td style={{ fontWeight: 600 }}>{row.name}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ 
                            background: 'var(--success)', 
                            color: 'white', 
                            padding: '4px 12px', 
                            borderRadius: 4, 
                            fontWeight: 600,
                            fontSize: 12 
                          }}>{row.package}</span>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--success)', textAlign: 'right', paddingRight: 24 }}>
                          ${(row.fee || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {!loading && filtered.length > 0 && (
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Showing 1 to {filtered.length} of {filtered.length} entries
                </div>
                <div style={{ display: 'flex' }}>
                  <button className="btn btn-outline btn-sm" disabled style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: 'none' }}>Previous</button>
                  <button className="btn btn-primary btn-sm" style={{ borderRadius: 0 }}>1</button>
                  <button className="btn btn-outline btn-sm" disabled style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: 'none' }}>Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
