'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import { useSettings } from '@/lib/SettingsContext';
import { TableSkeleton } from '@/components/ui/Skeleton';
import Pagination from '@/components/ui/Pagination';
import { FiPlusCircle } from 'react-icons/fi';
import { FaRegEdit, FaTrashAlt } from 'react-icons/fa';
import { MdSync, MdClose, MdCheck, MdSearch } from 'react-icons/md';

interface CurrencyItem {
  id: number;
  code: string;
  name: string;
  nameKh: string | null;
  symbol: string;
  exchangeRate: number;
  isBase: boolean;
  isActive: boolean;
  decimalDigits: number;
  countryCode: string | null;
  source: string;
  lastSyncedAt: string | null;
}

interface CatalogItem {
  code: string;
  name: string;
  nameKh: string;
  symbol: string;
  countryCode: string;
  decimalDigits: number;
  defaultRate: number;
}

export default function CurrencySettingsPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { refreshSettings } = useSettings();

  const [currencies, setCurrencies] = useState<CurrencyItem[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('catalog');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Edit Rate Modal
  const [editingItem, setEditingItem] = useState<CurrencyItem | null>(null);
  const [editRate, setEditRate] = useState('');
  const [savingRate, setSavingRate] = useState(false);

  // Custom Form
  const [customForm, setCustomForm] = useState({
    code: '',
    name: '',
    nameKh: '',
    symbol: '$',
    exchangeRate: '1.0',
    decimalDigits: '2',
    isBase: false,
    isActive: true,
  });
  const [addingCustom, setAddingCustom] = useState(false);

  const loadData = async () => {
    try {
      const [curRes, catRes] = await Promise.all([
        api.get('/settings/currencies'),
        api.get('/settings/currencies/catalog').catch(() => ({ data: [] })),
      ]);
      setCurrencies(curRes.data || []);
      setCatalog(catRes.data || []);
    } catch (err) {
      console.error('Failed to load currencies', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
    loadData();
  }, [router]);

  const handleSyncFromInternet = async () => {
    setSyncing(true);
    setSuccessMsg('');
    try {
      const res = await api.post('/settings/currencies/sync');
      if (res.data?.currencies) {
        setCurrencies(res.data.currencies);
      } else {
        await loadData();
      }
      await refreshSettings();
      setSuccessMsg(
        lang === 'km'
          ? `បានទាញយកអត្រាប្តូរប្រាក់ពីអ៊ីនធឺណិតដោយជោគជ័យ (${res.data?.updatedCount || 0} រូបិយប័ណ្ណ)`
          : `Live exchange rates updated from internet (${res.data?.updatedCount || 0} currencies)`
      );
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      alert(lang === 'km' ? 'មិនអាចទាញយកទិន្នន័យពីអ៊ីនធឺណិតបានទេ' : 'Failed to sync rates from internet');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleActive = async (cur: CurrencyItem) => {
    try {
      const updated = await api.put(`/settings/currencies/${cur.id}`, {
        isActive: !cur.isActive,
      });
      setCurrencies(prev => prev.map(c => (c.id === cur.id ? updated.data : c)));
      await refreshSettings();
    } catch {
      alert(lang === 'km' ? 'បរាជ័យក្នុងការផ្លាស់ប្តូរស្ថានភាព' : 'Failed to update status');
    }
  };

  const handleSetBase = async (cur: CurrencyItem) => {
    if (cur.isBase) return;
    if (
      !confirm(
        lang === 'km'
          ? `កំណត់ "${cur.code} (${cur.name})" ជារូបិយប័ណ្ណគោលរបស់ប្រព័ន្ធ?`
          : `Set "${cur.code} (${cur.name})" as primary base currency?`
      )
    )
      return;

    try {
      await api.post(`/settings/currencies/${cur.id}/set-base`);
      await loadData();
      await refreshSettings();
      setSuccessMsg(
        lang === 'km'
          ? `បានកំណត់ ${cur.code} ជារូបិយប័ណ្ណគោលដោយជោគជ័យ`
          : `${cur.code} set as primary base currency`
      );
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      alert(lang === 'km' ? 'បរាជ័យក្នុងការកំណត់រូបិយប័ណ្ណគោល' : 'Failed to set base currency');
    }
  };

  const handleDelete = async (cur: CurrencyItem) => {
    if (cur.isBase) {
      alert(lang === 'km' ? 'មិនអាចលុបរូបិយប័ណ្ណគោលបានទេ' : 'Cannot delete base currency');
      return;
    }
    if (
      !confirm(
        lang === 'km'
          ? `តើអ្នកប្រាកដជាចង់លុបរូបិយប័ណ្ណ "${cur.code}" នេះមែនទេ?`
          : `Are you sure you want to delete "${cur.code}"?`
      )
    )
      return;

    try {
      await api.delete(`/settings/currencies/${cur.id}`);
      setCurrencies(prev => prev.filter(c => c.id !== cur.id));
      await refreshSettings();
      setSuccessMsg(t('currencyDeletedSuccess'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      alert(lang === 'km' ? 'បរាជ័យក្នុងការលុបរូបិយប័ណ្ណ' : 'Failed to delete currency');
    }
  };

  const handleOpenEditRate = (cur: CurrencyItem) => {
    setEditingItem(cur);
    setEditRate(cur.exchangeRate.toString());
  };

  const handleSaveRate = async () => {
    if (!editingItem) return;
    const rateNum = parseFloat(editRate);
    if (isNaN(rateNum) || rateNum <= 0) {
      alert(lang === 'km' ? 'សូមបញ្ចូលអត្រាត្រឹមត្រូវ' : 'Please enter a valid rate');
      return;
    }

    setSavingRate(true);
    try {
      const updated = await api.put(`/settings/currencies/${editingItem.id}`, {
        exchangeRate: rateNum,
      });
      setCurrencies(prev => prev.map(c => (c.id === editingItem.id ? updated.data : c)));
      await refreshSettings();
      setEditingItem(null);
      setSuccessMsg(t('currencyUpdatedSuccess'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      alert(lang === 'km' ? 'បរាជ័យក្នុងការកែប្រែអត្រា' : 'Failed to update rate');
    } finally {
      setSavingRate(false);
    }
  };

  const handleAddFromCatalog = async (item: CatalogItem) => {
    try {
      const res = await api.post('/settings/currencies', {
        code: item.code,
        name: item.name,
        nameKh: item.nameKh,
        symbol: item.symbol,
        exchangeRate: item.defaultRate,
        decimalDigits: item.decimalDigits,
        countryCode: item.countryCode,
        source: 'internet',
        isActive: true,
      });
      setCurrencies(prev =>
        [...prev, res.data].sort((a, b) => (b.isBase ? 1 : 0) - (a.isBase ? 1 : 0) || a.code.localeCompare(b.code))
      );
      await refreshSettings();
      setSuccessMsg(
        lang === 'km' ? `បានបន្ថែម ${item.code} ដោយជោគជ័យ!` : `Added ${item.code} successfully!`
      );
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err?.response?.data?.message || (lang === 'km' ? 'បរាជ័យក្នុងការបន្ថែមរូបិយប័ណ្ណ' : 'Failed to add currency'));
    }
  };

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customForm.code.trim()) {
      alert(lang === 'km' ? 'សូមបញ្ចូលកូដរូបិយប័ណ្ណ' : 'Please enter currency code');
      return;
    }

    setAddingCustom(true);
    try {
      await api.post('/settings/currencies', {
        code: customForm.code.toUpperCase().trim(),
        name: customForm.name.trim() || customForm.code.toUpperCase().trim(),
        nameKh: customForm.nameKh.trim() || undefined,
        symbol: customForm.symbol.trim() || '$',
        exchangeRate: parseFloat(customForm.exchangeRate) || 1.0,
        decimalDigits: parseInt(customForm.decimalDigits) || 2,
        isBase: customForm.isBase,
        isActive: customForm.isActive,
        source: 'manual',
      });
      await loadData();
      await refreshSettings();
      setShowAddModal(false);
      setCustomForm({
        code: '',
        name: '',
        nameKh: '',
        symbol: '$',
        exchangeRate: '1.0',
        decimalDigits: '2',
        isBase: false,
        isActive: true,
      });
      setSuccessMsg(t('currencyAddedSuccess'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err?.response?.data?.message || (lang === 'km' ? 'បរាជ័យក្នុងការបង្កើតរូបិយប័ណ្ណ' : 'Failed to create currency'));
    } finally {
      setAddingCustom(false);
    }
  };

  const existingCodes = useMemo(() => new Set(currencies.map(c => c.code)), [currencies]);

  const filteredCurrencies = useMemo(() => {
    if (!searchQuery.trim()) return currencies;
    const q = searchQuery.toLowerCase().trim();
    return currencies.filter(
      c =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.nameKh && c.nameKh.toLowerCase().includes(q))
    );
  }, [currencies, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const paginatedCurrencies = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCurrencies.slice(start, start + pageSize);
  }, [filteredCurrencies, currentPage, pageSize]);

  const filteredCatalog = useMemo(() => {
    if (!catalogSearch.trim()) return catalog;
    const q = catalogSearch.toLowerCase().trim();
    return catalog.filter(
      c =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.nameKh.toLowerCase().includes(q)
    );
  }, [catalog, catalogSearch]);

  const latestSyncTime = useMemo(() => {
    const dates = currencies.map(c => c.lastSyncedAt).filter(Boolean);
    if (dates.length === 0) return null;
    return new Date(dates[0]!).toLocaleString();
  }, [currencies]);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar
          title={t('currencySettings')}
          subtitle={`${currencies.length} ${lang === 'km' ? 'រូបិយប័ណ្ណត្រូវបានកំណត់' : 'currencies configured'}`}
        />

        <div className="page-content">
          {successMsg && (
            <div
              className="badge badge-delivered"
              style={{
                display: 'block',
                padding: 12,
                marginBottom: 16,
                textAlign: 'center',
                fontSize: 13,
                borderRadius: 8,
              }}
            >
              {successMsg}
            </div>
          )}

          <div className="card">
            {/* Clean Card Header */}
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="card-title">💱 {t('currencyTable')}</span>
                {latestSyncTime && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    ({lang === 'km' ? 'ទិន្នន័យអ៊ីនធឺណិត' : 'Live Data'}: {latestSyncTime})
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleSyncFromInternet}
                  disabled={syncing}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <MdSync size={16} className={syncing ? 'spinner-icon' : ''} />
                  <span>{syncing ? t('syncingInternet') : t('syncFromInternet')}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowAddModal(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <FiPlusCircle size={14} />
                  <span>{t('addCurrency')}</span>
                </button>
              </div>
            </div>

            {/* Clean Search Bar */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', background: '#fafbfc' }}>
              <div style={{ position: 'relative', maxWidth: 320 }}>
                <MdSearch
                  size={18}
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder={t('searchCurrency')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: 34, height: 36, fontSize: 13, borderRadius: 8 }}
                />
              </div>
            </div>

            {/* Clean Table with Standard Application Styles */}
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '50px', textAlign: 'center' }}>{lang === 'km' ? 'ល.រ' : 'No.'}</th>
                    <th style={{ width: '90px' }}>{lang === 'km' ? 'កូដ' : 'Code'}</th>
                    <th>{lang === 'km' ? 'ឈ្មោះរូបិយប័ណ្ណ' : 'Currency Name'}</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>{lang === 'km' ? 'និមិត្តសញ្ញា' : 'Symbol'}</th>
                    <th style={{ width: '180px' }}>{lang === 'km' ? 'អត្រាប្តូរប្រាក់' : 'Exchange Rate'}</th>
                    <th style={{ width: '130px', textAlign: 'center' }}>{lang === 'km' ? 'រូបិយប័ណ្ណគោល' : 'Base Currency'}</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>{lang === 'km' ? 'សកម្មភាព' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton columns={8} rows={6} />
                  ) : filteredCurrencies.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        {t('noDataFound') || 'គ្មានទិន្នន័យ'}
                      </td>
                    </tr>
                  ) : (
                    paginatedCurrencies.map((c, idx) => {
                      const rateFormatted =
                        c.decimalDigits === 0
                          ? Math.round(c.exchangeRate).toLocaleString()
                          : Number(c.exchangeRate).toFixed(4);

                      return (
                        <tr key={c.id}>
                          {/* No. */}
                          <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
                            {(currentPage - 1) * pageSize + idx + 1}
                          </td>

                          {/* Code */}
                          <td>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                fontSize: 13,
                                background: '#f1f5f9',
                                color: '#0f172a',
                                padding: '3px 8px',
                                borderRadius: 6,
                                border: '1px solid #e2e8f0',
                                display: 'inline-block',
                              }}
                            >
                              {c.code}
                            </span>
                          </td>

                          {/* Currency Name */}
                          <td>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>
                              {lang === 'km' && c.nameKh ? c.nameKh : c.name}
                            </div>
                            {lang === 'km' && c.nameKh && (
                              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                                {c.name}
                              </div>
                            )}
                          </td>

                          {/* Symbol */}
                          <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
                            {c.symbol}
                          </td>

                          {/* Exchange Rate */}
                          <td>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>
                              1 USD = {rateFormatted} {c.symbol}
                            </div>
                          </td>

                          {/* Base Currency */}
                          <td style={{ textAlign: 'center' }}>
                            {c.isBase ? (
                              <span className="badge badge-delivered" style={{ fontSize: 11.5, fontWeight: 700 }}>
                                ✓ {lang === 'km' ? 'គោល' : 'Base'}
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                style={{ padding: '2px 8px', fontSize: 11, minHeight: 'unset', height: 26, borderRadius: 6 }}
                                onClick={() => handleSetBase(c)}
                                title={lang === 'km' ? 'កំណត់ជារូបិយប័ណ្ណគោល' : 'Set as base currency'}
                              >
                                {lang === 'km' ? 'កំណត់ជាគោល' : 'Set as Base'}
                              </button>
                            )}
                          </td>

                          {/* Status */}
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(c)}
                              disabled={c.isBase}
                              style={{
                                border: 'none',
                                background: 'none',
                                padding: 0,
                                cursor: c.isBase ? 'default' : 'pointer',
                              }}
                              title={
                                c.isBase
                                  ? (lang === 'km' ? 'មិនអាចបិទរូបិយប័ណ្ណគោលបានទេ' : 'Base currency cannot be deactivated')
                                  : (c.isActive ? (lang === 'km' ? 'ចុចដើម្បីបិទ' : 'Click to deactivate') : (lang === 'km' ? 'ចុចដើម្បីបើក' : 'Click to activate'))
                              }
                            >
                              <span className={`badge ${c.isActive ? 'badge-delivered' : 'badge-failed'}`}>
                                {c.isActive ? (lang === 'km' ? 'សកម្ម' : 'Active') : (lang === 'km' ? 'អសកម្ម' : 'Inactive')}
                              </span>
                            </button>
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                              <button
                                type="button"
                                className="btn btn-ghost btn-icon btn-sm"
                                onClick={() => handleOpenEditRate(c)}
                                title={lang === 'km' ? 'កែប្រែ' : 'Edit'}
                              >
                                <FaRegEdit size={14} />
                              </button>
                              {!c.isBase && (
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-icon btn-sm"
                                  style={{ color: 'var(--danger)' }}
                                  onClick={() => handleDelete(c)}
                                  title={lang === 'km' ? 'លុប' : 'Delete'}
                                >
                                  <FaTrashAlt size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {filteredCurrencies.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredCurrencies.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>
        </div>

        {/* ── Add Currency Modal ── */}
        {showAddModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 16,
            }}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: 14,
                width: '100%',
                maxWidth: 620,
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                    {t('addCurrency')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    border: 'none',
                    background: '#f1f5f9',
                    borderRadius: '50%',
                    width: 30,
                    height: 30,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                >
                  <MdClose size={18} />
                </button>
              </div>

              {/* Tabs */}
              <div
                style={{
                  display: 'flex',
                  borderBottom: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  padding: '0 20px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('catalog')}
                  style={{
                    padding: '10px 14px',
                    border: 'none',
                    background: 'none',
                    fontWeight: 700,
                    fontSize: 13,
                    color: activeTab === 'catalog' ? '#2563eb' : '#64748b',
                    borderBottom: activeTab === 'catalog' ? '2px solid #2563eb' : '2px solid transparent',
                    cursor: 'pointer',
                  }}
                >
                  {t('pickFromCatalog')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('custom')}
                  style={{
                    padding: '10px 14px',
                    border: 'none',
                    background: 'none',
                    fontWeight: 700,
                    fontSize: 13,
                    color: activeTab === 'custom' ? '#2563eb' : '#64748b',
                    borderBottom: activeTab === 'custom' ? '2px solid #2563eb' : '2px solid transparent',
                    cursor: 'pointer',
                  }}
                >
                  {t('customCurrency')}
                </button>
              </div>

              {/* Content */}
              <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
                {activeTab === 'catalog' ? (
                  <div>
                    <div style={{ position: 'relative', marginBottom: 14 }}>
                      <MdSearch
                        size={18}
                        style={{
                          position: 'absolute',
                          left: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#94a3b8',
                        }}
                      />
                      <input
                        type="text"
                        className="form-control"
                        placeholder={lang === 'km' ? 'ស្វែងរកតាមកូដ ឬឈ្មោះ...' : 'Search by code or name...'}
                        value={catalogSearch}
                        onChange={e => setCatalogSearch(e.target.value)}
                        style={{ paddingLeft: 34, height: 36, fontSize: 13 }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {filteredCatalog.map(item => {
                        const isAdded = existingCodes.has(item.code);
                        return (
                          <div
                            key={item.code}
                            style={{
                              padding: '10px 14px',
                              borderRadius: 8,
                              border: '1px solid #e2e8f0',
                              background: isAdded ? '#f8fafc' : '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', width: 44 }}>
                                {item.code}
                              </span>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                                  {item.nameKh ? `${item.nameKh} • ${item.name}` : item.name}
                                </div>
                                <div style={{ fontSize: 11, color: '#64748b' }}>
                                  1 USD = {item.defaultRate.toLocaleString()} {item.symbol}
                                </div>
                              </div>
                            </div>

                            {isAdded ? (
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#dcfce7', padding: '3px 8px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                <MdCheck size={14} />
                                {lang === 'km' ? 'មានរួច' : 'Added'}
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleAddFromCatalog(item)}
                                style={{ padding: '3px 10px', fontSize: 12 }}
                              >
                                + {lang === 'km' ? 'បន្ថែម' : 'Add'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCreateCustom}>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">{t('currencyCode')} <span>*</span></label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. MYR, EUR"
                          maxLength={10}
                          value={customForm.code}
                          onChange={e => setCustomForm({ ...customForm, code: e.target.value.toUpperCase() })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">{t('currencySymbol')} <span>*</span></label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. $, ៛, €"
                          maxLength={10}
                          value={customForm.symbol}
                          onChange={e => setCustomForm({ ...customForm, symbol: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">{t('currencyName')} <span>*</span></label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Malaysian Ringgit"
                          value={customForm.name}
                          onChange={e => setCustomForm({ ...customForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">{t('currencyNameKh')}</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. រីងហ្គីតម៉ាឡេស៊ី"
                          value={customForm.nameKh}
                          onChange={e => setCustomForm({ ...customForm, nameKh: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">{t('exchangeRateToUSD')} <span>*</span></label>
                      <input
                        type="number"
                        step="0.0001"
                        className="form-control"
                        value={customForm.exchangeRate}
                        onChange={e => setCustomForm({ ...customForm, exchangeRate: e.target.value })}
                        required
                      />
                    </div>

                    <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowAddModal(false)}
                      >
                        {lang === 'km' ? 'បោះបង់' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={addingCustom}
                      >
                        {addingCustom ? (lang === 'km' ? 'កំពុងបន្ថែម...' : 'Adding...') : t('addCurrency')}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Edit Rate Modal ── */}
        {editingItem && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 16,
            }}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: 14,
                width: '100%',
                maxWidth: 400,
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  {t('editRate')} — {editingItem.code}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  style={{
                    border: 'none',
                    background: '#f1f5f9',
                    borderRadius: '50%',
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                >
                  <MdClose size={16} />
                </button>
              </div>

              <div style={{ padding: 20 }}>
                <div className="form-group">
                  <label className="form-label">
                    {t('exchangeRateToUSD')} ({editingItem.code} / 1 USD)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-control"
                    value={editRate}
                    onChange={e => setEditRate(e.target.value)}
                    autoFocus
                  />
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    1 USD = {editRate || '0'} {editingItem.code}
                  </div>
                </div>

                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setEditingItem(null)}
                  >
                    {lang === 'km' ? 'បោះបង់' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleSaveRate}
                    disabled={savingRate}
                  >
                    {savingRate ? (lang === 'km' ? 'កំពុងរក្សាទុក...' : 'Saving...') : (lang === 'km' ? 'រក្សាទុក' : 'Save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
