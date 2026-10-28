'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Pagination from '@/components/ui/Pagination';
import api from '@/lib/api';
import { MdPrint, MdArrowBack, MdSearch, MdClear } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';
import { useTenant } from '@/lib/TenantContext';
import DateInput, { getLocalDateString, formatDateToDDMMYYYY } from '@/components/ui/DateInput';
import { TableSkeleton } from '@/components/ui/Skeleton';
import Thumbnail from '@/components/ui/Thumbnail';
import SearchableSelect from '@/components/ui/SearchableSelect';

const formatCOD = (cod: any, currency: string) => {
  if (currency === 'KHR') return `${parseInt(cod || 0).toLocaleString()} ៛`;
  return `$${parseFloat(cod || 0).toFixed(2)}`;
};

const getStatusLabel = (status: string, lang: string) => {
  switch (status) {
    case 'pending':
      return <span style={{ background: '#f59e0b', color: '#fff', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{lang === 'km' ? 'រង់ចាំ' : 'Pending'}</span>;
    case 'assigned':
      return <span style={{ background: '#3b82f6', color: '#fff', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{lang === 'km' ? 'ចាត់តាំងរួច' : 'Assigned'}</span>;
    case 'picked-up':
      return <span style={{ background: '#8b5cf6', color: '#fff', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{lang === 'km' ? 'បានទទួល' : 'Picked Up'}</span>;
    case 'in-warehouse':
      return <span style={{ background: '#64748b', color: '#fff', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{lang === 'km' ? 'ក្នុងឃ្លាំង' : 'In Warehouse'}</span>;
    case 'in-transit':
      return <span style={{ background: '#0d9488', color: '#fff', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{lang === 'km' ? 'កំពុងដឹក' : 'In Transit'}</span>;
    case 'delivered':
      return <span style={{ background: '#10b981', color: '#fff', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{lang === 'km' ? 'ជោគជ័យ' : 'Delivered'}</span>;
    case 'failed':
      return <span style={{ background: '#ef4444', color: '#fff', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{lang === 'km' ? 'មិនជោគជ័យ' : 'Failed'}</span>;
    case 'returned':
      return <span style={{ background: '#6b7280', color: '#fff', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{lang === 'km' ? 'បង្វិលត្រឡប់' : 'Returned'}</span>;
    default:
      return <span style={{ background: '#6b7280', color: '#fff', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{status}</span>;
  }
};

const getDriverLabel = (driver: any, lang: string) => {
  if (!driver) {
    return '';
  }
  return <span style={{ fontWeight: 600, color: '#0f172a' }}>{lang === 'km' && driver.nameKh ? driver.nameKh : driver.name}</span>;
};

export default function PrintInvoicePage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedParcelsMap, setSelectedParcelsMap] = useState<Record<number, any>>({});
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchingOrders, setFetchingOrders] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Filter & Pagination States
  const [merchants, setMerchants] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [merchantFilter, setMerchantFilter] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  const [startDate, setStartDate] = useState(() => getLocalDateString());
  const [endDate, setEndDate] = useState(() => getLocalDateString());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50); // Default to 50 for quick batch selection

  const { lang } = useLanguage();
  const { tenant } = useTenant();
  const [isDirectMode, setIsDirectMode] = useState(false);
  const [directIds, setDirectIds] = useState<string>('');
  const [orgInfo, setOrgInfo] = useState<{ name?: string; phone?: string; address?: string; logo?: string }>({});

  const getDynamicCompanyName = () => {
    if (orgInfo?.name) return orgInfo.name;
    if (tenant?.companyName) return tenant.companyName;
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      if (parts.length > 1 && parts[0] !== 'www' && parts[0] !== 'localhost') {
        return parts[0]
          .split('-')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }
    }
    return 'Delivery Express';
  };

  const dynamicCompanyName = getDynamicCompanyName();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Initial load: merchants, drivers, organisation info, URL params
  useEffect(() => {
    if (!isAuthenticated()) { router.push('/'); return; }

    const params = new URLSearchParams(window.location.search);
    const singleId = params.get('id');
    if (singleId) {
      setIsDirectMode(true);
      setDirectIds(singleId);
      const parsedIds = singleId.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x));
      setSelectedIds(parsedIds);
    }

    Promise.all([
      api.get('/select/merchants'),
      api.get('/select/drivers'),
      api.get('/settings/organisation').catch(() => null),
    ])
      .then(([mRes, dRes, orgRes]) => {
        setMerchants(Array.isArray(mRes.data) ? mRes.data : (mRes.data?.results || mRes.data?.result || []));
        setDrivers(Array.isArray(dRes.data) ? dRes.data : (dRes.data?.results || dRes.data?.result || []));
        if (orgRes && orgRes.data) {
          setOrgInfo(orgRes.data);
        }
      })
      .catch((err) => console.error('Error fetching selects:', err));
  }, [router]);

  // Main data loader function
  const loadParcels = useCallback(async () => {
    setFetchingOrders(true);
    try {
      const params: any = {
        page: currentPage,
        limit: pageSize,
        driverId: driverFilter || undefined,
        merchantId: merchantFilter || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: debouncedSearch || undefined,
      };

      if (directIds) {
        params.ids = directIds;
        params.limit = Math.max(pageSize, 500);
      }

      const res = await api.get('/parcels/print-invoices', { params });
      const orderData = Array.isArray(res.data) 
        ? res.data 
        : (res.data?.results || res.data?.result || []);
      const total = res.data?.total ?? (Array.isArray(res.data) ? res.data.length : orderData.length);

      setOrders(orderData);
      setTotalItems(total);

      // Cache order objects by id so selections across pages are preserved
      setSelectedParcelsMap(prev => {
        const next = { ...prev };
        orderData.forEach((o: any) => {
          next[o.id] = o;
        });
        return next;
      });

      // Auto-select initial items if first load or direct mode
      if (directIds) {
        const parsedIds = directIds.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x));
        setSelectedIds(parsedIds);
      } else if (loading && orderData.length > 0 && selectedIds.length === 0) {
        // Auto select current page on initial visit
        setSelectedIds(orderData.map((o: any) => o.id));
      }
    } catch (err) {
      console.error('Failed to load parcels:', err);
    } finally {
      setFetchingOrders(false);
      setLoading(false);
    }
  }, [currentPage, pageSize, driverFilter, merchantFilter, statusFilter, startDate, endDate, debouncedSearch, directIds, loading, selectedIds.length]);

  // Trigger loading parcels whenever filters or pagination change
  useEffect(() => {
    loadParcels();
  }, [loadParcels]);

  // Handle individual checkbox selection
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Check if all items on current page are selected
  const isCurrentPageAllSelected = useMemo(() => {
    return orders.length > 0 && orders.every(o => selectedIds.includes(o.id));
  }, [orders, selectedIds]);

  // Toggle selection for all items on the current page
  const toggleCurrentPageSelect = () => {
    if (isCurrentPageAllSelected) {
      const pageIds = new Set(orders.map(o => o.id));
      setSelectedIds(prev => prev.filter(id => !pageIds.has(id)));
    } else {
      const newIds = new Set([...selectedIds, ...orders.map(o => o.id)]);
      setSelectedIds(Array.from(newIds));
      setSelectedParcelsMap(prev => {
        const next = { ...prev };
        orders.forEach(o => { next[o.id] = o; });
        return next;
      });
    }
  };

  // Select all matching items across all pages (up to 1000)
  const handleSelectAllMatching = async () => {
    setFetchingOrders(true);
    try {
      const res = await api.get('/parcels/print-invoices', {
        params: {
          page: 1,
          limit: 1000,
          driverId: driverFilter || undefined,
          merchantId: merchantFilter || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search: debouncedSearch || undefined,
          ids: directIds || undefined,
        }
      });
      const allItems = Array.isArray(res.data) ? res.data : (res.data?.results || res.data?.result || []);
      const allIds = allItems.map((o: any) => o.id);
      setSelectedIds(allIds);
      setSelectedParcelsMap(prev => {
        const next = { ...prev };
        allItems.forEach((o: any) => { next[o.id] = o; });
        return next;
      });
    } catch (err) {
      console.error('Failed to select all matching items:', err);
    } finally {
      setFetchingOrders(false);
    }
  };

  // Clear all selections
  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  // Print selected invoices
  const handlePrint = async () => {
    if (selectedIds.length === 0) return;
    setIsPrinting(true);

    try {
      // Check if any selected IDs are missing from selectedParcelsMap
      const missingIds = selectedIds.filter(id => !selectedParcelsMap[id]);
      if (missingIds.length > 0) {
        const res = await api.get('/parcels/print-invoices', {
          params: {
            ids: missingIds.join(','),
            limit: missingIds.length + 50,
          }
        });
        const items = Array.isArray(res.data) ? res.data : (res.data?.results || res.data?.result || []);
        setSelectedParcelsMap(prev => {
          const next = { ...prev };
          items.forEach((o: any) => { next[o.id] = o; });
          return next;
        });
      }

      await api.post('/invoices', { parcelIds: selectedIds }).catch(() => {});
    } catch (err) {
      console.error('Failed to prepare invoices for printing:', err);
    } finally {
      setIsPrinting(false);
    }

    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Printable orders list
  const printableOrders = useMemo(() => {
    return selectedIds.map(id => selectedParcelsMap[id]).filter(Boolean);
  }, [selectedIds, selectedParcelsMap]);

  return (
    <div className="app-layout" style={{ display: 'block', minHeight: '100vh', background: '#f1f5f9' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media screen {
          .no-print {
            display: flex !important;
          }
          ${isDirectMode ? `
            .sidebar, .topbar, .filter-section, .table-container, .select-all-bar {
              display: none !important;
            }
            .main-content {
              margin-left: 0 !important;
              width: 100% !important;
              min-height: 100vh;
              background: #f1f5f9 !important;
            }
            .print-only-container {
              display: grid !important;
              grid-template-columns: 1fr !important;
              justify-content: center !important;
              gap: 24px !important;
              padding: 30px 20px 60px !important;
              width: 100% !important;
              max-width: ${printableOrders.length > 1 ? '1040px' : '520px'} !important;
              margin: 0 auto !important;
            }
            @media (min-width: 1024px) {
              .print-only-container {
                grid-template-columns: ${printableOrders.length > 1 ? 'repeat(2, minmax(0, 480px))' : '1fr'} !important;
              }
            }
          ` : `
            .print-only-container {
              display: none !important;
            }
          `}
        }
        @page {
          size: auto;
          margin: 0mm;
        }
        @media print {
          @page {
            size: auto;
            margin: 0mm;
          }
          .no-print {
            display: none !important;
          }
          .sidebar, .topbar, .filter-section, .table-container, .select-all-bar, .pagination-wrapper {
            display: none !important;
          }
          .main-content {
            margin-left: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            background: #fff !important;
          }
          body, .page-content, .app-layout {
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-only-container {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .invoice-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            page-break-after: always !important;
            border: 2px solid #000 !important;
            box-shadow: none !important;
            margin: 0 auto 20px !important;
          }
        }
      `}} />

      {!isDirectMode && <Sidebar />}
      <div className="main-content" style={isDirectMode ? { marginLeft: 0, width: '100%', background: '#f1f5f9' } : {}}>
        
        {/* Direct Mode Header Toolbar */}
        {isDirectMode ? (
          <header className="no-print" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '14px 28px', 
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)'
          }}>
            {/* Left Button */}
            <button 
              className="btn btn-outline" 
              onClick={() => router.push('/delivery')}
              style={{ 
                fontWeight: 600, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6, 
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                color: '#475569',
                borderColor: '#cbd5e1',
                background: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <MdArrowBack size={18} /> {lang === 'km' ? 'ត្រឡប់ក្រោយ' : 'Go Back'}
            </button>

            {/* Center Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                {lang === 'km' ? 'គំរូវិក្កយបត្រ (Invoice Preview)' : 'Invoice Preview'}
              </span>
              <span style={{ 
                background: '#e0e7ff', 
                color: '#3730a3', 
                fontSize: 12, 
                fontWeight: 700, 
                padding: '3px 10px', 
                borderRadius: 20 
              }}>
                {printableOrders.length} {lang === 'km' ? 'កញ្ចប់' : 'Parcels'}
              </span>
            </div>

            {/* Right Action */}
            <button 
              className="btn" 
              onClick={handlePrint}
              disabled={printableOrders.length === 0 || isPrinting}
              style={{ 
                fontWeight: 700, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                padding: '9px 22px',
                borderRadius: 8,
                fontSize: 14,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                border: 'none',
                cursor: printableOrders.length === 0 ? 'not-allowed' : 'pointer',
                opacity: printableOrders.length === 0 ? 0.6 : 1,
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                transition: 'all 0.2s'
              }}
            >
              <MdPrint size={20} /> {isPrinting ? (lang === 'km' ? 'កំពុងរៀបចំ...' : 'Preparing...') : (lang === 'km' ? 'បោះពុម្ពវិក្កយបត្រ' : 'Print Invoice')}
            </button>
          </header>
        ) : (
          <Topbar 
            title={lang === 'km' ? 'បោះពុម្ពវិក្កយបត្រ' : 'Print Invoice Delivery'} 
            subtitle={lang === 'km' ? 'បោះពុម្ពស្លាកវិក្កយបត្រ និង QR Code សម្រាប់បិទលើកញ្ចប់ទំនិញ' : 'Print delivery invoice and QR code parcel labels'} 
          />
        )}

        <div className="page-content" style={isDirectMode ? { padding: 0 } : {}}>
          
          {/* Filter Card */}
          <div className="card filter-section" style={{ marginBottom: 20 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <span className="card-title">{lang === 'km' ? 'ត្រងទិន្នន័យ' : 'Filter Options'}</span>
              <button 
                onClick={handlePrint}
                disabled={selectedIds.length === 0 || isPrinting}
                className="btn btn-primary"
                style={{ 
                  padding: '8px 18px', 
                  fontSize: '13.5px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 8,
                  cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: selectedIds.length === 0 ? 0.6 : 1
                }}
              >
                <MdPrint size={18} /> {lang === 'km' ? `បោះពុម្ពដែលបានជ្រើសរើស (${selectedIds.length})` : `Print Selected (${selectedIds.length})`}
              </button>
            </div>
            <div className="card-body" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                
                {/* Search Box */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{lang === 'km' ? 'ស្វែងរក' : 'Search'}</label>
                  <div style={{ position: 'relative' }}>
                    <MdSearch size={18} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      className="form-control"
                      placeholder={lang === 'km' ? 'លេខកូដ, លេខទូរស័ព្ទ, ឈ្មោះ...' : 'Tracking, Phone, Name...'}
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{ paddingLeft: 34, paddingRight: search ? 30 : 12 }}
                    />
                    {search && (
                      <button 
                        type="button" 
                        onClick={() => setSearch('')}
                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
                      >
                        <MdClear size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Driver Filter */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{lang === 'km' ? 'អ្នកដឹក' : 'Driver'}</label>
                  <SearchableSelect
                    value={driverFilter}
                    onChange={(val: string) => { setDriverFilter(val); setCurrentPage(1); }}
                    options={[
                      { value: '', label: lang === 'km' ? '-- ទាំងអស់ --' : '-- All --' },
                      ...drivers.map(d => ({
                        value: String(d.id),
                        label: (d.nameKh || d.name) + (d.phone ? ` (${d.phone})` : ''),
                      })),
                    ]}
                  />
                </div>

                {/* Shop Filter */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{lang === 'km' ? 'ហាង' : 'Shop'}</label>
                  <SearchableSelect
                    value={merchantFilter}
                    onChange={(val: string) => { setMerchantFilter(val); setCurrentPage(1); }}
                    options={[
                      { value: '', label: lang === 'km' ? '-- ទាំងអស់ --' : '-- All --' },
                      ...merchants.map(m => ({
                        value: String(m.id),
                        label: (m.nameKh ? `${m.nameKh} (${m.name})` : m.name) + (m.phone ? ` (${m.phone})` : ''),
                      })),
                    ]}
                  />
                </div>

                {/* Status Filter */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</label>
                  <select 
                    className="form-control" 
                    value={statusFilter} 
                    onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="all">{lang === 'km' ? '-- ទាំងអស់ --' : '-- All --'}</option>
                    <option value="pending">{lang === 'km' ? 'រង់ចាំ (Pending)' : 'Pending'}</option>
                    <option value="in-warehouse">{lang === 'km' ? 'ក្នុងឃ្លាំង (In Warehouse)' : 'In Warehouse'}</option>
                    <option value="assigned">{lang === 'km' ? 'ចាត់តាំងរួច (Assigned)' : 'Assigned'}</option>
                    <option value="picked-up">{lang === 'km' ? 'បានទទួល (Picked Up)' : 'Picked Up'}</option>
                    <option value="in-transit">{lang === 'km' ? 'កំពុងដឹក (In Transit)' : 'In Transit'}</option>
                    <option value="delivered">{lang === 'km' ? 'ជោគជ័យ (Delivered)' : 'Delivered'}</option>
                    <option value="failed">{lang === 'km' ? 'មិនជោគជ័យ (Failed)' : 'Failed'}</option>
                    <option value="returned">{lang === 'km' ? 'បង្វិលត្រឡប់ (Returned)' : 'Returned'}</option>
                  </select>
                </div>

                {/* Start Date */}
                <DateInput
                  labelEn="Start Date"
                  labelKh="ចាប់ផ្តើម"
                  value={startDate}
                  onChange={(val: string) => { setStartDate(val); setCurrentPage(1); }}
                />

                {/* End Date */}
                <DateInput
                  labelEn="End Date"
                  labelKh="បញ្ចប់"
                  value={endDate}
                  onChange={(val: string) => { setEndDate(val); setCurrentPage(1); }}
                />
              </div>
            </div>
          </div>

          {/* Orders Table Card */}
          <div className="card table-container" style={{ marginBottom: 30 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="card-title">{lang === 'km' ? 'បញ្ជីកញ្ចប់សម្រាប់បោះពុម្ព' : 'Parcel List for Printing'}</span>
                <span style={{ 
                  background: '#e0e7ff', 
                  color: '#3730a3', 
                  fontSize: 12, 
                  fontWeight: 700, 
                  padding: '4px 12px', 
                  borderRadius: 20 
                }}>
                  {selectedIds.length} / {totalItems} {lang === 'km' ? 'កញ្ចប់បានជ្រើសរើស' : 'Selected'}
                </span>
              </div>

              {/* Batch Selection Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={toggleCurrentPageSelect}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, fontWeight: 600 }}
                >
                  {isCurrentPageAllSelected 
                    ? (lang === 'km' ? 'ដោះទំព័រនេះ' : 'Deselect Page')
                    : (lang === 'km' ? 'ជ្រើសរើសទំព័រនេះ' : 'Select Page')}
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllMatching}
                  disabled={totalItems === 0 || selectedIds.length === totalItems}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, fontWeight: 600 }}
                >
                  {lang === 'km' ? `ជ្រើសរើសទាំងអស់ (${totalItems})` : `Select All (${totalItems})`}
                </button>
                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, fontWeight: 600, color: '#ef4444', borderColor: '#fca5a5' }}
                  >
                    {lang === 'km' ? 'ដោះការជ្រើសរើស' : 'Clear All'}
                  </button>
                )}
              </div>
            </div>

            <div className="table-wrapper" style={{ overflowX: 'auto', position: 'relative' }}>
              {fetchingOrders && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(255, 255, 255, 0.65)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  backdropFilter: 'blur(1px)'
                }}>
                  <div className="spinner" style={{ width: 28, height: 28 }} />
                </div>
              )}

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: 45, textAlign: 'center' }}>{lang === 'km' ? 'ល.រ' : 'No.'}</th>
                    <th style={{ width: 55, textAlign: 'center' }}>{lang === 'km' ? 'រូបភាព' : 'Photo'}</th>
                    <th style={{ width: 85, textAlign: 'center' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', margin: 0, fontWeight: 700 }}>
                        <input
                          type="checkbox"
                          checked={isCurrentPageAllSelected}
                          onChange={toggleCurrentPageSelect}
                          style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
                        />
                        <span>{lang === 'km' ? 'ទាំងអស់' : 'All'}</span>
                      </label>
                    </th>
                    <th style={{ width: 135 }}>{lang === 'km' ? 'លេខបញ្ជូន' : 'Delivery Number'}</th>
                    <th style={{ width: 105 }}>{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}</th>
                    <th style={{ width: 150 }}>{lang === 'km' ? 'ឈ្មោះហាង' : 'Shop Name'}</th>
                    <th style={{ width: 180 }}>{lang === 'km' ? 'អាសយដ្ឋាន' : 'Address'}</th>
                    <th style={{ width: 125 }}>{lang === 'km' ? 'លេខអ្នកទទួល' : 'Receiver Phone'}</th>
                    <th style={{ width: 135, textAlign: 'right' }}>{lang === 'km' ? 'ចំនួនប្រាក់' : 'Amount'}</th>
                    <th style={{ width: 135 }}>{lang === 'km' ? 'អ្នកដឹក' : 'Driver'}</th>
                    <th style={{ width: 105, textAlign: 'center' }}>{lang === 'km' ? 'ស្ថានភាព' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading || (fetchingOrders && orders.length === 0) ? (
                    <TableSkeleton columns={11} rows={8} hasThumbnail />
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                        {lang === 'km' ? 'គ្មានទិន្នន័យ' : 'No Data'}
                      </td>
                    </tr>
                  ) : (
                    orders.map((o, idx) => {
                      const parcelPhoto = o.itemPhoto || (Array.isArray(o.proofPhotos) ? o.proofPhotos[0] : o.proofPhotos) || null;
                      return (
                        <tr key={o.id} style={{ background: selectedIds.includes(o.id) ? '#f0f7ff' : undefined }}>
                          <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                            {(currentPage - 1) * pageSize + idx + 1}
                          </td>
                          <td style={{ textAlign: 'center', padding: '4px' }}>
                            <Thumbnail
                              src={parcelPhoto}
                              alt={o.trackingCode || 'Parcel'}
                              size={32}
                              type="parcel"
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(o.id)}
                              onChange={() => toggleSelect(o.id)}
                              style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ fontWeight: 700 }}>{o.trackingCode}</td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                            {o.createdAt ? formatDateToDDMMYYYY(o.createdAt) : ''}
                          </td>
                          <td style={{ fontWeight: 600 }}>{o.merchant?.nameKh || o.merchant?.name || ''}</td>
                          <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{o.receiverAddress || ''}</td>
                          <td style={{ fontSize: 12.5 }}>{o.receiverPhone || ''}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>
                            {parseFloat(o.cod || 0).toFixed(2)} ({o.codCurrency || 'USD'})
                          </td>
                          <td>
                            {getDriverLabel(o.driver, lang)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {getStatusLabel(o.status, lang)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalItems > 0 && (
              <div className="pagination-wrapper">
                <Pagination
                  currentPage={currentPage}
                  totalItems={totalItems}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(sz) => { setPageSize(sz); setCurrentPage(1); }}
                  pageSizeOptions={[10, 25, 50, 100, 200, 500]}
                />
              </div>
            )}
          </div>

          {/* Printable Sticker Cards Preview */}
          <div className="print-only-container">
            {printableOrders.map(o => (
              <div
                key={o.id}
                className="invoice-card"
                style={{
                  padding: '20px 24px',
                  border: '2px solid #0f172a',
                  borderRadius: isDirectMode ? 8 : 0,
                  background: '#ffffff',
                  maxWidth: 500,
                  margin: '0 auto 28px',
                  width: '100%',
                  color: '#0f172a',
                  fontFamily: "'Kantumruy Pro', sans-serif",
                  boxShadow: isDirectMode ? '0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.06)' : 'none',
                  boxSizing: 'border-box',
                }}
              >
                {/* Header: Logo + Brand + QR Code */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {tenant?.logoUrl || orgInfo.logo ? (
                      <img 
                        src={tenant?.logoUrl || orgInfo.logo} 
                        alt="Logo" 
                        style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'contain' }} 
                      />
                    ) : (
                      <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 20,
                        flexShrink: 0,
                        boxShadow: '0 4px 8px rgba(37, 99, 235, 0.25)',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                      }}>
                        📦
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 18, fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.5px', lineHeight: 1.1, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        {dynamicCompanyName}
                      </span>
                    </div>
                  </div>

                  {/* QR Code image */}
                  <div style={{ textAlign: 'center' }}>
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${o.trackingCode}`} 
                      alt="QR Code" 
                      style={{ width: 72, height: 72, display: 'block', imageRendering: 'crisp-edges' }} 
                    />
                  </div>
                </div>

                {/* Tracking Title */}
                <div style={{ textAlign: 'center', margin: '12px 0 8px' }}>
                  <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: '1px', color: '#0f172a' }}>
                    {lang === 'km' ? 'វិក្កយបត្រ' : 'INVOICE'} : {o.trackingCode}
                  </h2>
                </div>

                {/* Separator */}
                <div style={{ width: '100%', height: 2, background: '#0f172a', margin: '6px 0 0 0' }} />

                {/* Shop Name & Phone */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '8px 4px', 
                  borderBottom: '2px solid #0f172a', 
                  fontWeight: 700, 
                  fontSize: 13 
                }}>
                  <div>
                    {lang === 'km' ? 'ឈ្មោះហាង' : 'Shop Name'} : <span style={{ textTransform: 'uppercase', color: '#0f172a' }}>{o.merchant?.nameKh || o.merchant?.name || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#0f172a' }}>
                    <span style={{ color: '#e11d48' }}>📞</span> {o.merchant?.phone || '—'}
                  </div>
                </div>

                {/* 2-Column Details Box */}
                <div style={{ display: 'flex', fontSize: 12, borderBottom: '2px solid #0f172a', minHeight: 80 }}>
                  {/* Left Column: Receiver Info */}
                  <div style={{ flex: 1.3, padding: '10px 8px 10px 4px', borderRight: '2px solid #0f172a', display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 800, color: '#0f172a' }}>{lang === 'km' ? 'លេខអ្នកទទួល' : 'Receiver Phone'} :</span>{' '}
                      <span style={{ fontWeight: 700 }}>{o.receiverPhone}</span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 800, color: '#0f172a' }}>{lang === 'km' ? 'អាសយដ្ឋានអ្នកទទួល' : 'Receive Address'} :</span>{' '}
                      <span>{o.receiverAddress || '—'}</span>
                    </div>
                  </div>

                  {/* Right Column: COD & Date */}
                  <div style={{ flex: 0.9, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{lang === 'km' ? 'តម្លៃឥវ៉ាន់' : 'COD'} :</span>
                      <span style={{ fontWeight: 800, color: '#0f172a' }}>{formatCOD(o.cod, o.codCurrency || 'USD')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'} :</span>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{o.createdAt ? formatDateToDDMMYYYY(o.createdAt) : ''}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Footer Notice & Total Amount */}
                <div style={{ 
                  border: '2px solid #0f172a', 
                  borderRadius: 6,
                  margin: '14px 0 2px', 
                  padding: '8px 14px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  fontSize: 11,
                  background: '#f8fafc',
                  WebkitPrintColorAdjust: 'exact', 
                  printColorAdjust: 'exact' 
                }}>
                  <div style={{ fontWeight: 700, flex: 1, paddingRight: 10, color: '#475569', fontSize: 11, lineHeight: 1.3 }}>
                    {lang === 'km' ? 'ក្រុមហ៊ុនមិនទទួលបញ្ញើដែលច្បាប់ហាមឃាត់' : 'Company does not accept contraband goods'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontWeight: 800, fontSize: 12, color: '#0f172a' }}>{lang === 'km' ? 'តម្លៃសរុប' : 'Total'} :</span>
                    <div style={{ 
                      background: '#ffffff', 
                      padding: '4px 14px', 
                      borderRadius: 6, 
                      fontWeight: 900, 
                      fontSize: 15, 
                      color: '#0f172a', 
                      border: '2px solid #0f172a', 
                      WebkitPrintColorAdjust: 'exact', 
                      printColorAdjust: 'exact' 
                    }}>
                      {formatCOD(o.cod, o.codCurrency || 'USD')}
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
