'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, hasPermission } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { MdSearch, MdLocationOn, MdStar, MdStarBorder } from 'react-icons/md';
import { FaRegEdit, FaTrashAlt } from 'react-icons/fa';
import { FiPlusCircle } from 'react-icons/fi';
import { useLanguage } from '@/lib/LanguageContext';
import Pagination from '@/components/ui/Pagination';

export default function BranchesPage() {
  const router = useRouter();
  const { lang } = useLanguage();

  const [branches, setBranches] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedMerchantFilter, setSelectedMerchantFilter] = useState('');

  // Dropdown data
  const [merchants, setMerchants] = useState<any[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load merchants for filters
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
    api.get('/select/merchants')
      .then((m) => {
        setMerchants(Array.isArray(m.data) ? m.data : (m.data?.result || []));
      })
      .catch(() => {});
  }, [router]);

  const loadBranches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/merchants/branches/all', {
        params: {
          page: currentPage,
          limit: pageSize,
          search: debouncedSearch || undefined,
          merchantId: selectedMerchantFilter ? Number(selectedMerchantFilter) : undefined,
        },
      });

      if (res.data) {
        setBranches(res.data.results || res.data.result || []);
        setTotalItems(res.data.total ?? 0);
      } else {
        setBranches([]);
        setTotalItems(0);
      }
    } catch (err) {
      console.error(err);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, selectedMerchantFilter]);

  useEffect(() => {
    if (isAuthenticated()) {
      loadBranches();
    }
  }, [loadBranches]);

  const openCreatePage = () => {
    router.push(selectedMerchantFilter ? `/merchants/branches/create?merchantId=${selectedMerchantFilter}` : '/merchants/branches/create');
  };

  const openEditPage = (branchId: number) => {
    router.push(`/merchants/branches/edit/${branchId}`);
  };

  const handleDelete = async (branch: any) => {
    if (!confirm(lang === 'km' ? `តើអ្នកប្រាកដថាចង់លុបសាខា "${branch.name}" ទេ?` : `Delete branch "${branch.name}"?`)) return;
    try {
      await api.delete(`/merchants/${branch.merchantId}/branches/${branch.id}`);
      loadBranches();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete branch');
    }
  };

  const handleSetDefault = async (branch: any) => {
    try {
      await api.patch(`/merchants/${branch.merchantId}/branches/${branch.id}/default`);
      loadBranches();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to set default branch');
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar
          title={lang === 'km' ? '🏢 បញ្ជីសាខាហាង' : '🏢 Branch Management'}
          subtitle={`${totalItems} ${lang === 'km' ? 'សាខាសរុប' : 'branches'}`}
        />

        <div className="page-content">
          {/* Filters Bar */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '14px 18px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <div className="search-input-wrapper" style={{ flex: '1 1 240px', minWidth: 200 }}>
                <MdSearch className="search-icon" />
                <input
                  className="form-control search-input"
                  placeholder={lang === 'km' ? 'ស្វែងរកតាមឈ្មោះសាខា, កូដ, ទូរស័ព្ទ...' : 'Search branch name, code, phone...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Merchant Filter */}
              <div style={{ minWidth: 220 }}>
                <select
                  className="form-control"
                  value={selectedMerchantFilter}
                  onChange={(e) => {
                    setSelectedMerchantFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ height: 40, fontSize: 13 }}
                >
                  <option value="">{lang === 'km' ? '-- គ្រប់ហាងទាំងអស់ --' : '-- All Merchants --'}</option>
                  {merchants.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nameKh ? `${m.nameKh} (${m.name})` : m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Table Card */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title">
                🏢 {lang === 'km' ? 'តារាងសាខាទាំងអស់' : 'All Branches'}
              </span>
              {hasPermission('branches.create, merchants.update') && (
                <button className="btn btn-primary btn-sm" onClick={openCreatePage}>
                  <FiPlusCircle size={14} /> {lang === 'km' ? 'បង្កើតសាខាថ្មី' : 'New Branch'}
                </button>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 45 }}>{lang === 'km' ? 'ល.រ' : 'No.'}</th>
                    <th style={{ width: 60, textAlign: 'center' }}>Default</th>
                    <th>{lang === 'km' ? 'ហាងមេ' : 'Merchant'}</th>
                    <th>{lang === 'km' ? 'ឈ្មោះសាខា' : 'Branch Name'}</th>
                    <th>{lang === 'km' ? 'កូដ' : 'Code'}</th>
                    <th>{lang === 'km' ? 'អ្នកចាត់ការ' : 'Contact Person'}</th>
                    <th>{lang === 'km' ? 'លេខទូរស័ព្ទ' : 'Phone'}</th>
                    <th>{lang === 'km' ? 'អាសយដ្ឋានសាខា' : 'Address'}</th>
                    <th style={{ width: 90, textAlign: 'right' }}>{lang === 'km' ? 'សកម្មភាព' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '40px 0', textAlign: 'center' }}>
                        <div className="loading-wrapper"><div className="spinner" /></div>
                      </td>
                    </tr>
                  ) : branches.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        {lang === 'km' ? 'រកមិនឃើញសាខាណាមួយឡើយ' : 'No branches found'}
                      </td>
                    </tr>
                  ) : (
                    branches.map((b: any, index) => (
                      <tr key={b.id} style={{ background: b.isDefault ? '#f0fdf4' : undefined }}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                          {(currentPage - 1) * pageSize + index + 1}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            title={b.isDefault ? 'Default Branch' : 'Set as Default'}
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ color: b.isDefault ? '#16a34a' : '#cbd5e1' }}
                            onClick={() => !b.isDefault && handleSetDefault(b)}
                          >
                            {b.isDefault ? <MdStar size={18} /> : <MdStarBorder size={18} />}
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: '#e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 14,
                                flexShrink: 0,
                                overflow: 'hidden',
                              }}
                            >
                              {b.merchant?.photo ? (
                                <img src={b.merchant.photo} alt={b.merchant.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span>🏪</span>
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{b.merchant?.name || '-'}</div>
                              {b.merchant?.nameKh && (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.merchant.nameKh}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{b.name}</div>
                          {b.note && <div style={{ fontSize: 11, color: '#64748b' }}>{b.note}</div>}
                        </td>
                        <td>
                          {b.code ? (
                            <span
                              style={{
                                padding: '2px 7px',
                                background: '#e2e8f0',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#334155',
                              }}
                            >
                              {b.code}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, color: '#0f172a' }}>{b.contactName || '-'}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, color: '#2563eb' }}>{b.phone || '-'}</div>
                        </td>
                        <td style={{ fontSize: 12, maxWidth: 260 }}>
                          {b.address || '-'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 4 }}>
                            {hasPermission('branches.update, merchants.update') && (
                              <button
                                title={lang === 'km' ? 'កែប្រែ' : 'Edit'}
                                className="btn btn-ghost btn-icon btn-sm"
                                onClick={() => openEditPage(b.id)}
                              >
                                <FaRegEdit size={14} />
                              </button>
                            )}
                            {hasPermission('branches.delete, merchants.delete, merchants.update') && (
                              <button
                                title={lang === 'km' ? 'លុប' : 'Delete'}
                                className="btn btn-ghost btn-icon btn-sm"
                                style={{ color: 'var(--danger)' }}
                                onClick={() => handleDelete(b)}
                              >
                                <FaTrashAlt size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
