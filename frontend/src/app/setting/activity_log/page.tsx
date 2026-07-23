'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import Pagination from '@/components/ui/Pagination';
import { MdSearch, MdFilterList, MdRemoveRedEye, MdRefresh } from 'react-icons/md';

export default function ActivityLogsPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const isKh = lang === 'km';

  // State
  const [logs, setLogs] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filters State
  const [searchEntityId, setSearchEntityId] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal State
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Available Actions for filtering list
  const actionList = [
    'CREATE_ORDER',
    'UPDATE_ORDER',
    'UPDATE_ORDER_STATUS',
    'ASSIGN_DRIVER',
    'ASSIGN_DELIVERY',
    'DELETE_ORDER',
    'CREATE_USER',
    'UPDATE_USER',
    'DELETE_USER',
    'CREATE_DRIVER',
    'UPDATE_DRIVER',
    'DELETE_DRIVER',
    'CREATE_MERCHANT',
    'UPDATE_MERCHANT',
    'DELETE_MERCHANT',
    'PROCESS_STAFF_PAYMENT',
    'UPDATE_STAFF_PAYMENT',
    'DELETE_STAFF_PAYMENT',
    'PROCESS_SHOP_PAYMENT',
    'UPDATE_SHOP_PAYMENT',
    'DELETE_SHOP_PAYMENT',
    'CREATE_INVOICE',
    'UPDATE_ORGANISATION_SETTINGS',
    'UPDATE_GENERAL_SETTING',
    'CREATE_ZONE',
    'UPDATE_ZONE',
    'DELETE_ZONE',
    'CREATE_SUB_ZONE',
    'DELETE_SUB_ZONE'
  ];

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/activity-logs', {
        params: {
          page: currentPage,
          limit: pageSize,
          action: filterAction || undefined,
          entityId: searchEntityId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });

      if (res.data && res.data.data !== undefined) {
        setLogs(res.data.data);
        setTotalItems(res.data.total);
      } else {
        setLogs(res.data);
        setTotalItems(res.data.length || 0);
      }
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    }
    setLoading(false);
  }, [currentPage, pageSize, filterAction, searchEntityId, startDate, endDate]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
    loadLogs();
  }, [router, loadLogs]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchEntityId('');
    setFilterAction('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Format timestamp helper
  const formatTimestamp = (dateStr: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // Action badge color styling helper
  const getBadgeStyle = (action: string) => {
    const base = {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      display: 'inline-block',
    };

    if (action.includes('CREATE') || action.includes('PROCESS')) {
      return { ...base, backgroundColor: '#E6F4EA', color: '#137333' }; // Green
    }
    if (action.includes('UPDATE') || action.includes('ASSIGN')) {
      return { ...base, backgroundColor: '#E8F0FE', color: '#1A73E8' }; // Blue
    }
    if (action.includes('DELETE') || action.includes('REMOVE')) {
      return { ...base, backgroundColor: '#FCE8E6', color: '#C5221F' }; // Red
    }
    return { ...base, backgroundColor: '#FEF7E0', color: '#B06000' }; // Amber
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar 
          title={isKh ? 'ប្រវត្តិកត់ត្រាសកម្មភាព' : 'Activity Audit Logs'} 
          subtitle={isKh ? 'ពិនិត្យមើលរាល់សកម្មភាព និងការកែប្រែទិន្នន័យរបស់បុគ្គលិកក្នុងប្រព័ន្ធ' : 'Track and audit user actions, creations, updates and deletions'} 
        />
        
        <div className="page-content">
          {/* Filters Card */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)', padding: '12px 16px' }}>
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MdFilterList size={18} /> {isKh ? 'ច្រោះទិន្នន័យស្វែងរក' : 'Search Filters'}
              </span>
              <button className="btn btn-sm" onClick={handleResetFilters} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MdRefresh size={14} /> {isKh ? 'កំណត់ឡើងវិញ' : 'Reset'}
              </button>
            </div>
            <div className="card-body" style={{ padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                
                {/* Action Filter */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{isKh ? 'ប្រភេទសកម្មភាព' : 'Action Type'}</label>
                  <select
                    className="form-control"
                    value={filterAction}
                    onChange={e => { setFilterAction(e.target.value); setCurrentPage(1); }}
                    style={{ width: '100%' }}
                  >
                    <option value="">{isKh ? 'បង្ហាញទាំងអស់' : 'All Actions'}</option>
                    {actionList.map(action => (
                      <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                {/* Target Entity ID Search */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{isKh ? 'ស្វែងរកតាម ID គោលដៅ' : 'Target Entity ID'}</label>
                  <div className="search-input-wrapper" style={{ marginTop: 0 }}>
                    <MdSearch className="search-icon" />
                    <input
                      className="form-control search-input"
                      placeholder="e.g. 45"
                      value={searchEntityId}
                      onChange={e => { setSearchEntityId(e.target.value); setCurrentPage(1); }}
                      style={{ paddingLeft: 36 }}
                    />
                  </div>
                </div>

                {/* Start Date */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{isKh ? 'ចាប់ពីថ្ងៃ' : 'Start Date'}</label>
                  <input
                    type="date"
                    className="form-control"
                    value={startDate}
                    onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
                  />
                </div>

                {/* End Date */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{isKh ? 'រហូតដល់ថ្ងៃ' : 'End Date'}</label>
                  <input
                    type="date"
                    className="form-control"
                    value={endDate}
                    onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
                  />
                </div>

              </div>
            </div>
          </div>

          {/* Logs Card */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📋 {isKh ? 'ប្រវត្តិនៃសកម្មភាពប្រព័ន្ធ' : 'System Audit Log Records'}</span>
            </div>

            {loading ? (
              <div className="loading-wrapper">
                <div className="spinner" />
              </div>
            ) : logs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-title">{isKh ? 'រកមិនឃើញប្រវត្តិកត់ត្រាឡើយ' : 'No Audit Logs Found'}</div>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ width: 60 }}>#</th>
                        <th>{isKh ? 'កាលបរិច្ឆេទ' : 'Timestamp'}</th>
                        <th>{isKh ? 'អ្នកធ្វើសកម្មភាព' : 'Actor'}</th>
                        <th>{isKh ? 'សកម្មភាព' : 'Action Type'}</th>
                        <th>{isKh ? 'ប្រភេទ Module' : 'Entity'}</th>
                        <th>{isKh ? 'ID គោលដៅ' : 'Target ID'}</th>
                        <th>{isKh ? 'ការពិពណ៌នា' : 'Description'}</th>
                        <th>IP Address</th>
                        <th style={{ textAlign: 'center', width: 100 }}>{isKh ? 'សកម្មភាព' : 'Details'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, idx) => {
                        const actorName = log.user?.name || log.merchant?.name || 'Anonymous';
                        const actorRole = log.user ? log.user.role : (log.merchant ? 'merchant' : 'system');
                        return (
                          <tr key={log.id}>
                            <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                              {(currentPage - 1) * pageSize + idx + 1}
                            </td>
                            <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                              {formatTimestamp(log.createdAt || log.created_at)}
                            </td>
                            <td>
                              <div>
                                <span style={{ fontWeight: 600, fontSize: 13 }}>{actorName}</span>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                  {actorRole} {log.user?.email ? `(${log.user.email})` : ''}
                                </div>
                              </div>
                            </td>
                            <td>
                              <span style={getBadgeStyle(log.action)}>
                                {log.action.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td style={{ fontWeight: 500, fontSize: 12.5 }}>
                              {log.entityName || '—'}
                            </td>
                            <td style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
                              {log.entityId ? `#${log.entityId}` : '—'}
                            </td>
                            <td style={{ fontSize: 12.5, maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.description}>
                              {log.description || '—'}
                            </td>
                            <td style={{ fontSize: 11.5, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              {log.ipAddress || '—'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button 
                                className="btn btn-sm btn-secondary" 
                                onClick={() => setSelectedLog(log)}
                                style={{ 
                                  padding: '4px 8px', 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: 4, 
                                  fontSize: 11.5 
                                }}
                              >
                                <MdRemoveRedEye size={13} /> {isKh ? 'មើល' : 'View'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalItems={totalItems}
                  pageSize={pageSize}
                  onPageChange={page => setCurrentPage(page)}
                  onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Payload Viewer Modal */}
      {selectedLog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20,
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            <div className="card-header" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border)',
              padding: '16px 20px',
              background: '#f8f9fa'
            }}>
              <span className="card-title" style={{ fontSize: 16 }}>
                🔍 {isKh ? 'ព័ត៌មានលម្អិតនៃសកម្មភាព' : 'Audit Action Details'}
              </span>
              <button 
                onClick={() => setSelectedLog(null)}
                style={{
                  border: 'none',
                  background: 'none',
                  fontSize: 22,
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  lineHeight: 1,
                  padding: 4
                }}
              >
                &times;
              </button>
            </div>
            
            <div className="card-body" style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Core Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <strong style={{ fontSize: 12, color: 'var(--text-muted)' }}>{isKh ? 'ប្រភេទសកម្មភាព' : 'Action'}</strong>
                  <div style={{ marginTop: 4 }}><span style={getBadgeStyle(selectedLog.action)}>{selectedLog.action.replace(/_/g, ' ')}</span></div>
                </div>
                <div>
                  <strong style={{ fontSize: 12, color: 'var(--text-muted)' }}>{isKh ? 'ពេលវេលា' : 'Timestamp'}</strong>
                  <div style={{ marginTop: 4, fontSize: 13.5, fontWeight: 500 }}>{formatTimestamp(selectedLog.createdAt || selectedLog.created_at)}</div>
                </div>
                <div>
                  <strong style={{ fontSize: 12, color: 'var(--text-muted)' }}>{isKh ? 'អ្នកធ្វើសកម្មភាព' : 'Actor'}</strong>
                  <div style={{ marginTop: 4, fontSize: 13.5, fontWeight: 700 }}>
                    {selectedLog.user?.name || selectedLog.merchant?.name || 'Anonymous'} 
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 6 }}>
                      ({selectedLog.user ? selectedLog.user.role : (selectedLog.merchant ? 'merchant' : 'system')})
                    </span>
                  </div>
                </div>
                <div>
                  <strong style={{ fontSize: 12, color: 'var(--text-muted)' }}>{isKh ? 'គោលដៅ' : 'Target Entity'}</strong>
                  <div style={{ marginTop: 4, fontSize: 13.5, fontWeight: 500 }}>
                    {selectedLog.entityName || '—'} {selectedLog.entityId ? `#${selectedLog.entityId}` : ''}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <strong style={{ fontSize: 12, color: 'var(--text-muted)' }}>{isKh ? 'ការពិពណ៌នា' : 'Description'}</strong>
                <div style={{ marginTop: 4, fontSize: 13.5, background: '#f1f3f4', padding: '8px 12px', borderRadius: 4, lineHeight: 1.4 }}>
                  {selectedLog.description || '—'}
                </div>
              </div>

              {/* Network Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
                <div>
                  <strong style={{ fontSize: 12, color: 'var(--text-muted)' }}>IP Address</strong>
                  <div style={{ marginTop: 4, fontSize: 13, fontFamily: 'monospace' }}>{selectedLog.ipAddress || '—'}</div>
                </div>
                <div>
                  <strong style={{ fontSize: 12, color: 'var(--text-muted)' }}>User Agent</strong>
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.3, wordBreak: 'break-all' }}>
                    {selectedLog.userAgent || '—'}
                  </div>
                </div>
              </div>

              {/* JSON Payload Code Block */}
              <div>
                <strong style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  📦 {isKh ? 'ទិន្នន័យ Payload (JSON)' : 'Request Payload Data (JSON)'}
                </strong>
                <pre style={{
                  background: '#1e1e1e',
                  color: '#d4d4d4',
                  padding: '16px',
                  borderRadius: '8px',
                  overflowX: 'auto',
                  fontSize: '12px',
                  fontFamily: 'Consolas, Monaco, monospace',
                  maxHeight: '220px',
                  border: '1px solid #333'
                }}>
                  {selectedLog.payload ? JSON.stringify(selectedLog.payload, null, 2) : '{}'}
                </pre>
              </div>
            </div>

            <div className="card-footer" style={{
              display: 'flex',
              justifyContent: 'flex-end',
              borderTop: '1px solid var(--border)',
              padding: '12px 16px',
              background: '#f8f9fa'
            }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setSelectedLog(null)}
                style={{ padding: '8px 20px' }}
              >
                {isKh ? 'បិទ' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
