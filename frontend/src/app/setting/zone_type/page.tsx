'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { MdAdd, MdEdit, MdDelete, MdMoreHoriz, MdClose, MdBookmark } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';
import Modal from '@/components/ui/Modal';

export default function ZonesPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Subzone state management
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  const [subzoneModal, setSubzoneModal] = useState<any>(null);
  const [modalZoneId, setModalZoneId] = useState<string>('');
  const [subzoneName, setSubzoneName] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/zones');
      setItems(r.data || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }
    load();
  }, [router, load]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleCloseDropdown = () => {
      setActiveDropdownId(null);
    };
    window.addEventListener('click', handleCloseDropdown);
    return () => window.removeEventListener('click', handleCloseDropdown);
  }, []);

  // Update modal state when active zone is set
  useEffect(() => {
    if (subzoneModal) {
      setModalZoneId(subzoneModal.id.toString());
      setSubzoneName('');
    }
  }, [subzoneModal]);

  const openCreate = () => { router.push('/setting/zone_type/create'); };
  const openEdit = (i: any) => { router.push(`/setting/zone_type/edit/${i.id}`); };

  const del = async (id: number) => {
    if (!confirm(lang === 'km' ? 'តើអ្នកប្រាកដជាចង់លុបតំបន់នេះមែនទេ?' : 'Delete this zone?')) return;
    try {
      await api.delete(`/zones/${id}`);
      await load();
    } catch {}
  };

  const delSubZone = async (id: number, name: string) => {
    if (!confirm(lang === 'km' ? `តើអ្នកប្រាកដជាចង់លុបតំបន់រង "${name}" នេះមែនទេ?` : `Delete subzone "${name}"?`)) return;
    try {
      await api.delete(`/zones/subzones/${id}`);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error deleting subzone');
    }
  };

  const saveSubzone = async () => {
    if (!subzoneName.trim() || !modalZoneId) return;
    try {
      await api.post(`/zones/${modalZoneId}/subzones`, { name: subzoneName.trim() });
      setSubzoneModal(null);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error saving subzone');
    }
  };

  return (
    <div className="app-layout">

      <Sidebar />
      <div className="main-content">
        <Topbar title={t('zoneType') || 'Zone Type'} subtitle={`${items.length} ${lang === 'km' ? 'តំបន់ត្រូវបានកំណត់' : 'zones configured'}`} />
        <div className="page-content">
          <div className="card">
            <div className="card-header">
              <span className="card-title">🗺️ {lang === 'km' ? 'តំបន់ដែលបានកំណត់' : 'Zones Configured'}</span>
              <button className="btn btn-primary btn-sm" onClick={openCreate}>
                <MdAdd size={14} /> {lang === 'km' ? 'បន្ថែមតំបន់' : 'Add Zone'}
              </button>
            </div>
            {loading ? (
              <div className="loading-wrapper"><div className="spinner" /></div>
            ) : items.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🗺️</div>
                <div className="empty-state-title">{lang === 'km' ? 'មិនទាន់មានតំបន់ត្រូវបានកំណត់' : 'No zones configured'}</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>{lang === 'km' ? 'ល.រ' : 'No.'}</th>
                      <th>{lang === 'km' ? 'ឈ្មោះតំបន់' : 'Zone Name'}</th>
                      <th>{lang === 'km' ? 'ឈ្មោះភ្នាក់ងារ' : 'Agent Name'}</th>
                      <th>{lang === 'km' ? 'ប្រភេទតំបន់រង' : 'Subzone Types'}</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>{lang === 'km' ? 'សកម្មភាព' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((z: any, i) => (
                      <tr key={z.id}>
                        <td style={{ verticalAlign: 'top', paddingTop: '16px', color: '#1e293b', fontSize: 14 }}>{i + 1}</td>
                        <td style={{ verticalAlign: 'top', paddingTop: '16px', fontWeight: 700 }}>{z.name}</td>
                        <td style={{ verticalAlign: 'top', paddingTop: '16px' }}>
                          {z.driver ? (
                            <span style={{ fontWeight: 600 }}>{z.driver.nameKh || z.driver.name}</span>
                          ) : (
                            ''
                          )}
                        </td>
                        <td style={{ verticalAlign: 'top', paddingTop: '12px', paddingBottom: '12px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {z.subZones && z.subZones.map((sz: any) => (
                              <span
                                key={sz.id}
                                style={{
                                  background: '#e28a35',
                                  color: '#ffffff',
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: '12px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontWeight: 500,
                                  userSelect: 'none'
                                }}
                              >
                                {sz.name}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    delSubZone(sz.id, sz.name);
                                  }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    cursor: 'pointer',
                                    padding: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '10px',
                                    lineHeight: 1,
                                    marginLeft: 2,
                                    transition: 'color 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'}
                                >
                                  x
                                </button>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ verticalAlign: 'top', paddingTop: '16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', alignItems: 'center' }}>
                            {/* Add Subzone */}
                            <button
                              onClick={() => setSubzoneModal(z)}
                              title={lang === 'km' ? 'បន្ថែមតំបន់រង' : 'Add Subzone'}
                              style={{
                                border: 'none',
                                background: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#64748b',
                                outline: 'none',
                                transition: 'color 0.15s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#0f172a'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                            >
                              <MdAdd size={20} />
                            </button>
                            {/* Edit */}
                            <button
                              onClick={() => openEdit(z)}
                              title={lang === 'km' ? 'កែប្រែ' : 'Edit'}
                              style={{
                                border: 'none',
                                background: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#64748b',
                                outline: 'none',
                                transition: 'color 0.15s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#0f172a'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                            >
                              <MdEdit size={20} />
                            </button>
                            {/* Delete */}
                            <button
                              onClick={() => del(z.id)}
                              title={lang === 'km' ? 'លុប' : 'Delete'}
                              style={{
                                border: 'none',
                                background: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ef4444',
                                outline: 'none',
                                transition: 'opacity 0.15s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                              <MdDelete size={20} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {subzoneModal && (
        <Modal
          open={!!subzoneModal}
          onClose={() => setSubzoneModal(null)}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'Kantumruy Pro', sans-serif" }}>
              <span style={{ fontWeight: 'bold', fontSize: 16 }}>
                {lang === 'km' ? 'បន្ថែមតំបន់ប្រតិបត្តិការរង' : 'Add Operation Subzone'}
              </span>
            </div>
          }
          size="sm"
          footer={
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', width: '100%', fontFamily: "'Kantumruy Pro', sans-serif" }}>
              <button 
                onClick={() => setSubzoneModal(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#334155',
                  padding: '8px 16px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13
                }}
              >
                <MdClose size={16} /> {lang === 'km' ? 'បិទ' : 'Close'}
              </button>
              <button 
                onClick={saveSubzone}
                disabled={!subzoneName.trim() || !modalZoneId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  border: 'none',
                  background: '#e28a35',
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: 6,
                  cursor: (!subzoneName.trim() || !modalZoneId) ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: 13
                }}
              >
                <MdBookmark size={16} /> {lang === 'km' ? 'រក្សាទុក' : 'Save'}
              </button>
            </div>
          }
        >
          <div style={{ fontFamily: "'Kantumruy Pro', sans-serif", padding: '10px 0' }}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 6, display: 'block', color: '#1e293b' }}>
                {lang === 'km' ? 'ប្រភេទតំបន់ប្រតិបត្តិការ' : 'Operation Zone Type'} <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                className="form-control"
                value={modalZoneId}
                onChange={e => setModalZoneId(e.target.value)}
                style={{ width: '100%', height: 38, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 4, padding: '0 8px' }}
              >
                {items.map(z => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label" style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 6, display: 'block', color: '#1e293b' }}>
                {lang === 'km' ? 'ឈ្មោះតំបន់ប្រតិបត្តិការរង' : 'Operation Subzone Name'} <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={subzoneName}
                onChange={e => setSubzoneName(e.target.value)}
                placeholder={lang === 'km' ? 'បញ្ចូលឈ្មោះតំបន់រង' : 'Enter subzone name'}
                required
                style={{ width: '100%', height: 38, border: '1px solid #cbd5e1', borderRadius: 4, padding: '0 10px' }}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
