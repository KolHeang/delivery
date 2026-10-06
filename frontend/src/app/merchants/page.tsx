'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';
import { MdSearch, MdLocationOn, MdBusiness } from 'react-icons/md';
import { FaTelegramPlane, FaRegEdit, FaTrashAlt } from 'react-icons/fa';
import { FiPlusCircle } from 'react-icons/fi';
import { useLanguage } from '@/lib/LanguageContext';
import Pagination from '@/components/ui/Pagination';

export default function ShopsPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, z] = await Promise.all([
        api.get('/merchants', {
          params: {
            page: currentPage,
            limit: pageSize,
            search: debouncedSearch || undefined,
          },
        }),
        api.get('/select/zones'),
      ]);
      if (r.data && (r.data.results !== undefined || r.data.result !== undefined)) {
        setItems(r.data.results || r.data.result || []);
        setTotalItems(r.data.total ?? 0);
      } else {
        setItems(Array.isArray(r.data) ? r.data : []);
        setTotalItems(Array.isArray(r.data) ? r.data.length : 0);
      }
      setZones(Array.isArray(z.data) ? z.data : (z.data?.result || []));
    } catch {}
    setLoading(false);
  }, [currentPage, pageSize, debouncedSearch]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
    load();
  }, [router, load]);

  useEffect(() => {
    setFiltered(items);
  }, [items]);

  const openCreate = () => {
    router.push('/merchants/create');
  };
  const openEdit = (i: any) => {
    router.push(`/merchants/edit/${i.id}`);
  };

  const del = async (id: number) => {
    if (!confirm(t('confirm') || 'Delete this shop?')) return;
    try {
      await api.delete(`/merchants/${id}`);
      await load();
    } catch {}
  };

  const handleBranchClick = (m: any) => {
    const count = m.branches ? m.branches.length : 0;
    if (count > 0) {
      router.push(`/merchants/branches?merchantId=${m.id}`);
    } else {
      router.push(`/merchants/branches/create?merchantId=${m.id}`);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={t('shopsTitle')} subtitle={`${totalItems} ${t('shopsTitle').toLowerCase()}`} />
        <div className="page-content">
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px' }}>
              <div className="search-input-wrapper">
                <MdSearch className="search-icon" />
                <input
                  className="form-control search-input"
                  placeholder={t('searchShops')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">🏪 {t('shopsListTitle')}</span>
              <button className="btn btn-primary btn-sm" onClick={openCreate}>
                <FiPlusCircle size={14} /> {t('addShop')}
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>{t('colNo') || 'ល.រ'}</th>
                    <th>{t('name') || 'ឈ្មោះ'}</th>
                    <th>{t('phone') || 'ទូរស័ព្ទ'}</th>
                    <th>Telegram</th>
                    <th>{t('address') || 'ទីតាំង'}</th>
                    <th>{t('deliveryFee') || 'សេវាដឹក'}</th>
                    <th>{t('branch') || 'សាខា'}</th>
                    <th>{t('status') || 'ស្ថានភាព'}</th>
                    <th>{t('actions') || 'សកម្មភាព'}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '40px 0', textAlign: 'center' }}>
                        <div className="loading-wrapper"><div className="spinner" /></div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        {t('noDataFound') || 'គ្មានទិន្នន័យ'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((m: any, i) => {
                      const tg = m.telegram || m.telegramPhone;
                      const hasDeliveryFee =
                        m.deliveryFee != null &&
                        m.deliveryFee !== '' &&
                        !isNaN(Number(m.deliveryFee)) &&
                        Number(m.deliveryFee) > 0;
                      const branchCount = m.branches ? m.branches.length : 0;

                      return (
                        <tr key={m.id}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                            {(currentPage - 1) * pageSize + i + 1}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  background: '#e2e8f0',
                                  color: '#94a3b8',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 18,
                                  flexShrink: 0,
                                  overflow: 'hidden',
                                }}
                              >
                                {m.photo ? (
                                  <img src={m.photo} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <span style={{ fontSize: 16 }}>🏪</span>
                                )}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600 }}>{m.name}</div>
                                {m.nameKh && m.nameKh !== m.name && (
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.nameKh}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>{m.phone || ''}</td>
                          <td>
                            {tg ? (
                              <a
                                href={tg.startsWith('http') ? tg : `https://t.me/${tg.replace(/[^0-9a-zA-Z_+]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  color: '#0088cc',
                                  textDecoration: 'none',
                                  fontWeight: 500,
                                  fontSize: 12,
                                }}
                              >
                                <FaTelegramPlane size={14} /> {tg}
                              </a>
                            ) : null}
                          </td>
                          <td style={{ fontSize: 12, maxWidth: 180 }}>
                            {m.mapsLocation ? (
                              <a
                                href={m.mapsLocation}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  color: 'var(--accent)',
                                  textDecoration: 'none',
                                  fontWeight: 500,
                                  fontSize: 12,
                                }}
                              >
                                <MdLocationOn size={14} /> {m.address || 'Maps'}
                              </a>
                            ) : (
                              m.address || ''
                            )}
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {hasDeliveryFee ? (
                              `$${Number(m.deliveryFee).toFixed(2)}`
                            ) : (
                              <span
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  background:
                                    m.pricingTier === 'premium'
                                      ? '#fef3c7'
                                      : m.pricingTier === 'standard'
                                      ? '#e0e7ff'
                                      : '#f1f5f9',
                                  color:
                                    m.pricingTier === 'premium'
                                      ? '#b45309'
                                      : m.pricingTier === 'standard'
                                      ? '#4338ca'
                                      : '#475569',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {m.pricingTier || 'STANDARD'}
                              </span>
                            )}
                          </td>
                          <td>
                            <button
                              onClick={() => handleBranchClick(m)}
                              className="btn btn-sm"
                              style={{
                                padding: '4px 10px',
                                borderRadius: 16,
                                fontSize: 11.5,
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                background: branchCount > 0 ? '#e0f2fe' : '#f1f5f9',
                                color: branchCount > 0 ? '#0284c7' : '#64748b',
                                border: `1px solid ${branchCount > 0 ? '#bae6fd' : '#e2e8f0'}`,
                                cursor: 'pointer',
                              }}
                            >
                              <MdBusiness size={14} />
                              {branchCount > 0
                                ? `${branchCount} ${lang === 'km' ? 'សាខា' : 'Branches'}`
                                : `+ ${lang === 'km' ? 'ថែមសាខា' : 'Add Branch'}`}
                            </button>
                          </td>
                          <td>
                            <Badge status={m.active ? 'active' : 'inactive'} />
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                title={lang === 'km' ? 'គ្រប់គ្រងសាខា' : 'Manage Branches'}
                                className="btn btn-ghost btn-icon btn-sm"
                                style={{ color: '#0284c7' }}
                                onClick={() => handleBranchClick(m)}
                              >
                                <MdBusiness size={15} />
                              </button>
                              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(m)}>
                                <FaRegEdit size={14} />
                              </button>
                              <button
                                className="btn btn-ghost btn-icon btn-sm"
                                style={{ color: 'var(--danger)' }}
                                onClick={() => del(m.id)}
                              >
                                <FaTrashAlt size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {filtered.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
