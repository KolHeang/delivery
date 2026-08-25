'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import Badge from '@/components/ui/Badge';
import {
  MdSearch,
  MdAccessTime,
  MdContentCopy,
  MdCheck,
  MdLocalShipping,
  MdStore,
  MdPerson,
  MdPhone,
  MdLocationOn,
  MdAttachMoney,
  MdInventory2,
  MdWarehouse,
  MdAssignmentInd,
  MdCheckCircle,
  MdCancel,
  MdClose
} from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';

const trackingTranslations = {
  en: {
    title: 'Tracking',
    subtitle: 'Track the real-time status and route of any parcel',
    placeholder: 'Enter Tracking Code (e.g. CO30220626) or Receiver Phone...',
    btnTrack: 'Track Parcel',
    btnTracking: 'Tracking...',
    notFound: 'No parcel found matching this Tracking Code or Phone number.',
    trackingCode: 'Tracking Code',
    from: 'From Merchant',
    to: 'To Customer',
    assignedDrivers: 'Assigned Driver',
    pickupDriver: 'Pickup Driver',
    deliveryDriver: 'Delivery Driver',
    currentStatus: 'Current Status',
    detailedHistory: 'Full Status Activity Log',
    copied: 'Copied!',
    deliveryFee: 'Delivery Fee',
    codAmount: 'COD Amount',
    packageDetails: 'Package & Payment',
    weight: 'Weight',
    size: 'Size',
    currentLocation: 'Current Location',
    custodian: 'Current Custodian',
  },
  km: {
    title: 'តាមដានការដឹកជញ្ជូន',
    subtitle: 'តាមដានស្ថានភាពជាក់ស្តែង និងទីតាំងនៃការដឹកជញ្ជូន',
    placeholder: 'បញ្ចូលលេខកូដតាមដាន (ឧ. CO30220626) ឬ លេខទូរស័ព្ទ...',
    btnTrack: 'ស្វែងរកទំនិញ',
    btnTracking: 'កំពុងស្វែងរក...',
    notFound: 'មិនមានទិន្នន័យសម្រាប់លេខកូដតាមដាន ឬ លេខទូរស័ព្ទនេះឡើយ។',
    trackingCode: 'លេខកូដតាមដាន',
    from: 'ហាងផ្ញើ (Merchant)',
    to: 'អតិថិជនទទួល (Customer)',
    assignedDrivers: 'អ្នកដឹកជញ្ជូន',
    pickupDriver: 'អ្នកទៅយកពីហាង',
    deliveryDriver: 'អ្នកដឹកជូនភ្ញៀវ',
    currentStatus: 'ស្ថានភាពបច្ចុប្បន្ន',
    detailedHistory: 'ប្រវត្តិស្ថានភាពលម្អិតទាំងអស់',
    copied: 'បានចម្លង!',
    deliveryFee: 'ថ្លៃដឹកជញ្ជូន',
    codAmount: 'ប្រាក់ត្រូវប្រមូល (COD)',
    packageDetails: 'ព័ត៌មានទំនិញ និងការទូទាត់',
    weight: 'ទម្ងន់',
    size: 'ទំហំ',
    currentLocation: 'ទីតាំងបច្ចុប្បន្ន',
    custodian: 'អ្នកទទួលបន្ទុកបច្ចុប្បន្ន',
  }
};

const formatCOD = (cod: any, currency?: string) => {
  const num = parseFloat(cod) || 0;
  if (currency === 'KHR') return `${parseInt(String(num)).toLocaleString()} ៛`;
  return `$${num.toFixed(2)}`;
};

export default function TrackingPage() {
  const searchParams = useSearchParams();
  const initialCode = searchParams?.get('code') || '';
  
  const [code, setCode] = useState(initialCode);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const { lang } = useLanguage();

  const tLocal = trackingTranslations[lang] || trackingTranslations['en'];

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
      fetchTracking(initialCode);
    }
  }, [initialCode]);

  const fetchTracking = async (searchStr: string) => {
    if (!searchStr.trim()) return;
    setSearching(true);
    setError('');
    setOrder(null);
    try {
      const res = await api.get(`/orders/tracking/${encodeURIComponent(searchStr.trim())}`);
      if (res.data) {
        setOrder(res.data);
      } else {
        setError(tLocal.notFound);
      }
    } catch {
      setError(tLocal.notFound);
    }
    setSearching(false);
  };

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTracking(code);
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString(lang === 'km' ? 'kh-KH' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Modern Stepper Calculation (5 distinct stages: Pending -> Warehouse/Picked -> Assigned -> In Transit -> Delivered)
  const getProgressStage = (status: string) => {
    switch (status) {
      case 'pending':
        return 1;
      case 'in-warehouse':
      case 'picked-up':
        return 2;
      case 'assigned':
        return 3;
      case 'in-transit':
        return 4;
      case 'delivered':
      case 'failed':
      case 'returned':
        return 5;
      default:
        return 1;
    }
  };

  const currentStage = order ? getProgressStage(order.status) : 0;

  const stepperStages = [
    {
      stage: 1,
      titleKh: 'បានបញ្ចូលបុង',
      titleEn: 'Order Created',
      descKh: 'ហាងបានចុះឈ្មោះក្នុងប្រព័ន្ធ',
      descEn: 'Registered in system',
      icon: <MdInventory2 size={20} />
    },
    {
      stage: 2,
      titleKh: 'ចូលឃ្លាំង / ទទួលអីវ៉ាន់',
      titleEn: 'In Warehouse / Picked',
      descKh: 'អីវ៉ាន់ដល់ឃ្លាំងមជ្ឈមណ្ឌល',
      descEn: 'Arrived at warehouse hub',
      icon: <MdWarehouse size={20} />
    },
    {
      stage: 3,
      titleKh: 'បានចាត់តាំង',
      titleEn: 'Driver Assigned',
      descKh: 'បានចាត់តាំងអ្នកដឹកជញ្ជូន',
      descEn: 'Assigned to driver',
      icon: <MdAssignmentInd size={20} />
    },
    {
      stage: 4,
      titleKh: 'កំពុងដឹកជញ្ជូន',
      titleEn: 'In Transit',
      descKh: 'អ្នកដឹកកំពុងធ្វើដំណើរទៅកាន់ភ្ញៀវ',
      descEn: 'On the way to customer',
      icon: <MdLocalShipping size={20} />
    },
    {
      stage: 5,
      titleKh: order?.status === 'failed' ? 'បរាជ័យ' : (order?.status === 'returned' ? 'ប្រគល់មកវិញ' : 'ដឹកជោគជ័យ'),
      titleEn: order?.status === 'failed' ? 'Failed' : (order?.status === 'returned' ? 'Returned' : 'Delivered'),
      descKh: order?.status === 'failed' ? 'មិនអាចប្រគល់ជូនបាន' : (order?.status === 'returned' ? 'បានប្រគល់ជូនហាងវិញ' : 'បានប្រគល់ជូនអតិថិជន'),
      descEn: order?.status === 'failed' ? 'Delivery unfulfilled' : (order?.status === 'returned' ? 'Returned to merchant' : 'Successfully received'),
      icon: order?.status === 'failed' || order?.status === 'returned' ? <MdCancel size={20} /> : <MdCheckCircle size={20} />
    }
  ];

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={tLocal.title} subtitle={tLocal.subtitle} />

        <div className="page-content">
          
          {/* Hero Search Box */}
          <div
            className="card"
            style={{
              padding: '24px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
              marginBottom: 24,
            }}
          >
            <form onSubmit={handleTrack} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <MdSearch
                  size={22}
                  style={{
                    position: 'absolute',
                    left: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="text"
                  placeholder={tLocal.placeholder}
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  style={{
                    width: '100%',
                    height: 50,
                    paddingLeft: 48,
                    paddingRight: code ? 40 : 16,
                    fontSize: 15,
                    fontWeight: 500,
                    borderRadius: 12,
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(47, 85, 165, 0.15)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  required
                />
                {code && (
                  <button
                    type="button"
                    onClick={() => { setCode(''); setOrder(null); setError(''); }}
                    style={{
                      position: 'absolute',
                      right: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: '#f1f5f9',
                      border: 'none',
                      borderRadius: '50%',
                      width: 24,
                      height: 24,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#64748b',
                    }}
                  >
                    <MdClose size={14} />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={searching}
                className="btn btn-primary"
                style={{
                  height: 50,
                  padding: '0 28px',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 12px rgba(47, 85, 165, 0.25)',
                  flexShrink: 0,
                }}
              >
                <MdSearch size={20} />
                <span>{searching ? tLocal.btnTracking : tLocal.btnTrack}</span>
              </button>
            </form>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="card"
              style={{
                padding: '24px',
                textAlign: 'center',
                borderRadius: '16px',
                border: '1.5px solid #fee2e2',
                background: '#fff1f2',
                color: '#be123c',
                fontWeight: 600,
                marginBottom: 24,
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 6 }}>🔍</div>
              <div>{error}</div>
            </div>
          )}

          {/* Tracking Result View */}
          {order && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Main Stepper & Overview Card */}
              <div
                className="card"
                style={{
                  padding: '28px',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
                  background: '#ffffff',
                }}
              >
                {/* Header with Tracking Code & Badges */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 16,
                    paddingBottom: 24,
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: 'rgba(47, 85, 165, 0.1)',
                        color: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                      }}
                    >
                      📦
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {tLocal.trackingCode}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>
                          {order.trackingCode}
                        </span>
                        <button
                          onClick={() => handleCopy(order.trackingCode)}
                          title="Copy tracking code"
                          style={{
                            background: copied ? '#ecfdf5' : '#f1f5f9',
                            border: `1px solid ${copied ? '#a7f3d0' : '#e2e8f0'}`,
                            color: copied ? '#059669' : '#64748b',
                            borderRadius: 6,
                            padding: '4px 8px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {copied ? <MdCheck size={14} /> : <MdContentCopy size={14} />}
                          <span>{copied ? tLocal.copied : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Badge status={order.status} />
                    <span
                      style={{
                        fontSize: 13,
                        color: '#64748b',
                        background: '#f8fafc',
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        fontWeight: 500,
                      }}
                    >
                      🕒 {formatDateTime(order.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Visual Progress Stepper */}
                <div style={{ marginTop: 32, marginBottom: 12 }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      position: 'relative',
                      gap: 8,
                    }}
                  >
                    {/* Connecting Bar */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 22,
                        left: '10%',
                        right: '10%',
                        height: 4,
                        background: '#e2e8f0',
                        zIndex: 1,
                        borderRadius: 2,
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          background: 'linear-gradient(90deg, #2563eb, #3b82f6)',
                          width: `${((Math.min(currentStage, 5) - 1) / 4) * 100}%`,
                          borderRadius: 2,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>

                    {stepperStages.map((st) => {
                      const isCompleted = currentStage >= st.stage;
                      const isCurrent = currentStage === st.stage;
                      const isFailed = (order.status === 'failed' || order.status === 'returned') && st.stage === 5;

                      return (
                        <div
                          key={st.stage}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            zIndex: 2,
                            position: 'relative',
                          }}
                        >
                          {/* Circle Icon */}
                          <div
                            style={{
                              width: 46,
                              height: 46,
                              borderRadius: '50%',
                              background: isFailed
                                ? '#ef4444'
                                : isCompleted
                                ? '#2563eb'
                                : '#ffffff',
                              color: isCompleted || isFailed ? '#ffffff' : '#94a3b8',
                              border: `3px solid ${
                                isFailed
                                  ? '#fee2e2'
                                  : isCurrent
                                  ? '#93c5fd'
                                  : isCompleted
                                  ? '#dbeafe'
                                  : '#e2e8f0'
                              }`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: isCurrent
                                ? '0 0 0 4px rgba(37, 99, 235, 0.15)'
                                : '0 2px 6px rgba(0,0,0,0.04)',
                              transition: 'all 0.3s ease',
                            }}
                          >
                            {st.icon}
                          </div>

                          {/* Title & Description */}
                          <div style={{ marginTop: 12 }}>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: isCompleted ? 700 : 500,
                                color: isFailed
                                  ? '#dc2626'
                                  : isCompleted
                                  ? '#0f172a'
                                  : '#94a3b8',
                              }}
                            >
                              {lang === 'km' ? st.titleKh : st.titleEn}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: '#64748b',
                                marginTop: 2,
                                maxWidth: 160,
                                lineHeight: 1.3,
                              }}
                            >
                              {lang === 'km' ? st.descKh : st.descEn}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3-Column Info Cards Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: 20,
                }}
              >
                {/* Sender & Receiver Card */}
                <div
                  className="card"
                  style={{
                    padding: '24px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
                    <MdStore size={20} color="var(--accent)" />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                      {lang === 'km' ? 'ព័ត៌មានអ្នកផ្ញើ និងអ្នកទទួល' : 'Route & Contact Details'}
                    </span>
                  </div>

                  {/* Sender Section */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {tLocal.from}
                    </div>
                    {(order.merchant?.nameKh || order.merchant?.name) && (order.merchant?.name !== '-') && (
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginTop: 4 }}>
                        {order.merchant?.nameKh || order.merchant?.name}
                      </div>
                    )}
                    {order.merchant?.phone && (order.merchant.phone !== '-') && (
                      <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <MdPhone size={14} color="#2563eb" />
                        <span>{order.merchant.phone}</span>
                      </div>
                    )}
                    {order.merchant?.address && (
                      <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 4 }}>
                        <MdLocationOn size={14} color="#64748b" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{order.merchant.address}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ borderTop: '1px dashed #e2e8f0', margin: '14px 0' }} />

                  {/* Receiver Section */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {tLocal.to}
                    </div>
                    {order.receiverName && order.receiverName.trim() !== '' && order.receiverName.trim() !== '-' && (
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginTop: 4 }}>
                        {order.receiverName}
                      </div>
                    )}
                    {order.receiverPhone && (
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 6, marginTop: order.receiverName && order.receiverName !== '-' ? 3 : 4 }}>
                        <MdPhone size={14} />
                        <a href={`tel:${order.receiverPhone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {order.receiverPhone}
                        </a>
                      </div>
                    )}
                    {order.receiverAddress && (
                      <div style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 4 }}>
                        <MdLocationOn size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{order.receiverAddress}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Package & Payment Card */}
                <div
                  className="card"
                  style={{
                    padding: '24px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
                    <MdAttachMoney size={20} color="#16a34a" />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                      {tLocal.packageDetails}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    {/* COD Box */}
                    <div
                      style={{
                        padding: '12px 14px',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: 12,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                        {tLocal.codAmount}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#15803d', marginTop: 4 }}>
                        {formatCOD(order.cod, order.codCurrency || 'USD')}
                      </div>
                    </div>

                    {/* Delivery Fee Box */}
                    <div
                      style={{
                        padding: '12px 14px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        {tLocal.deliveryFee}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                        ${parseFloat(order.deliveryFee || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12, color: '#64748b' }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{tLocal.weight}:</span> {order.weight || 0.5} kg
                    </div>
                    <div>
                      <span style={{ fontWeight: 600 }}>{tLocal.size}:</span> <span style={{ textTransform: 'capitalize' }}>{order.size || 'small'}</span>
                    </div>
                  </div>

                  {order.note && (
                    <div
                      style={{
                        marginTop: 14,
                        padding: '10px 12px',
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: 8,
                        fontSize: 12,
                        color: '#92400e',
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>Note:</span> {order.note}
                    </div>
                  )}
                </div>

                {/* Assigned Drivers & Current Custodian */}
                <div
                  className="card"
                  style={{
                    padding: '24px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
                    <MdLocalShipping size={20} color="#7c3aed" />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                      {lang === 'km' ? 'អ្នកដឹកជញ្ជូន និងទីតាំង' : 'Driver & Custodian'}
                    </span>
                  </div>

                  {/* Delivery Driver */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      {tLocal.deliveryDriver}
                    </div>
                    {order.driver ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                            {lang === 'km' ? (order.driver.nameKh || order.driver.name) : order.driver.name}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>📞 {order.driver.phone || '—'}</div>
                        </div>
                        {order.driver.phone && (
                          <a
                            href={`tel:${order.driver.phone}`}
                            className="btn btn-sm btn-outline"
                            style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, textDecoration: 'none' }}
                          >
                            Call
                          </a>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic', marginTop: 4 }}>
                        {lang === 'km' ? 'មិនទាន់ចាត់តាំងអ្នកដឹក' : 'Not assigned yet'}
                      </div>
                    )}
                  </div>

                  {/* Pickup Driver if any */}
                  {order.pickupDriver && (
                    <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: 12, marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        {tLocal.pickupDriver}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', marginTop: 2 }}>
                        {order.pickupDriver.name} ({order.pickupDriver.phone})
                      </div>
                    </div>
                  )}

                  {/* Current Custodian */}
                  <div
                    style={{
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: 14,
                      marginTop: 14,
                      background: '#f8fafc',
                      padding: '10px 12px',
                      borderRadius: 10,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      {tLocal.custodian}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginTop: 2 }}>
                      {order.status === 'delivered'
                        ? (order.receiverName || 'Customer')
                        : order.status === 'in-transit'
                        ? (order.driver?.name || 'Delivery Driver')
                        : order.status === 'in-warehouse'
                        ? 'EBS Warehouse Hub'
                        : (order.merchant?.name || 'Merchant')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Activity Logs */}
              {order.histories && order.histories.length > 0 && (
                <div
                  className="card"
                  style={{
                    padding: '24px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
                    background: '#ffffff',
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>
                    📋 {tLocal.detailedHistory}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', paddingLeft: 12 }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: 23,
                        top: 14,
                        bottom: 14,
                        width: 2,
                        background: '#e2e8f0',
                        zIndex: 1,
                      }}
                    />

                    {[...order.histories]
                      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((h: any, idx: number) => {
                        const isLatest = idx === 0;
                        return (
                          <div key={h.id || idx} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
                            {/* Bullet indicator */}
                            <div
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: isLatest ? '#2563eb' : '#ffffff',
                                border: `3px solid ${isLatest ? '#93c5fd' : '#cbd5e1'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {isLatest && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff' }} />}
                            </div>

                            {/* Content */}
                            <div
                              style={{
                                flex: 1,
                                background: isLatest ? '#f8fafc' : 'transparent',
                                padding: isLatest ? '12px 16px' : '4px 0',
                                borderRadius: 10,
                                border: isLatest ? '1px solid #e2e8f0' : 'none',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                                  <Badge status={h.status} />
                                  {h.note && <span style={{ marginLeft: 8, color: '#475569', fontWeight: 500 }}>— {h.note}</span>}
                                </div>
                                <div style={{ fontSize: 12, color: '#64748b' }}>
                                  🕒 {formatDateTime(h.createdAt)}
                                </div>
                              </div>
                              {h.note && (
                                <div style={{ 
                                  marginTop: 8,
                                  padding: '8px 12px', 
                                  background: h.status === 'failed' || h.status === 'returned' ? '#fef2f2' : '#f8fafc',
                                  borderLeft: `3px solid ${h.status === 'failed' || h.status === 'returned' ? '#ef4444' : '#cbd5e1'}`,
                                  borderRadius: '0 6px 6px 0', 
                                  fontSize: 12.5, 
                                  color: '#334155',
                                  fontWeight: 500,
                                  maxWidth: '90%'
                                }}>
                                  📝 {lang === 'km' ? 'សម្គាល់៖' : 'Remark:'} {h.note}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
