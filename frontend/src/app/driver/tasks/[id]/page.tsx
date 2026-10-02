'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated } from '@/lib/auth';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdArrowBack,
  MdInventory2,
  MdPerson,
  MdPhone,
  MdLocationOn,
  MdMap,
  MdStore,
  MdWarning,
  MdCheckCircle,
  MdSend,
  MdSchedule,
  MdError,
  MdClose,
} from 'react-icons/md';
import { FaTelegramPlane } from 'react-icons/fa';

const detailTranslations = {
  en: {
    back: 'Back',
    detailTab: 'Detail',
    timelineTab: 'Timeline',
    chatTab: 'Chat',
    customerInfo: 'Customer Information',
    merchantInfo: 'Merchant Information',
    parcelInfo: 'Parcel Information',
    viewInMaps: 'View in Maps',
    codAmount: 'COD Amount',
    weight: 'Weight',
    items: 'Items',
    note: 'Note',
    call: 'Call',
    telegram: 'Telegram',
    reportProblem: 'Report Problem',
    completeDelivery: 'Complete Delivery',
    loading: 'Loading parcel details...',
    notFound: 'Parcel not found or access denied.',
    noEvents: 'No timeline events recorded yet.',
    chatPlaceholder: 'Type a message to merchant...',
    send: 'Send',
    issueDialogTitle: 'Report Delivery Issue',
    issueReasonPlaceholder: 'Enter issue reason...',
    btnFailed: 'Mark Delivery Failed',
    btnReturn: 'Return Package',
    cancel: 'Cancel',
    proofPhotosTitle: 'Proof of Delivery Photos',
    signatureTitle: 'Customer Signature',
    failedPhotoTitle: 'Failure Proof Photo',
  },
  km: {
    back: 'ថយក្រោយ',
    detailTab: 'ព័ត៌មានលម្អិត',
    timelineTab: 'ដំណើរការ',
    chatTab: 'ជជែក',
    customerInfo: 'ព័ត៌មានអតិថិជន',
    merchantInfo: 'ព័ត៌មានហាងផ្ញើ',
    parcelInfo: 'ព័ត៌មានកញ្ចប់អីវ៉ាន់',
    viewInMaps: 'មើលលើផែនទី',
    codAmount: 'ប្រាក់ COD',
    weight: 'ទម្ងន់',
    items: 'ប្រភេទអីវ៉ាន់',
    note: 'ចំណាំ',
    call: 'ហៅទូរស័ព្ទ',
    telegram: 'តេឡេក្រាម',
    reportProblem: 'រាយការណ៍បញ្ហា',
    completeDelivery: 'បញ្ចប់ការដឹកជញ្ជូន',
    loading: 'កំពុងផ្ទុកទិន្នន័យ...',
    notFound: 'រកមិនឃើញកញ្ចប់អីវ៉ាន់នេះឡើយ។',
    noEvents: 'មិនទាន់មានប្រវត្តិដំណើរការនៅឡើយទេ។',
    chatPlaceholder: 'សរសេរសារទៅកាន់ហាង...',
    send: 'ផ្ញើ',
    issueDialogTitle: 'រាយការណ៍បញ្ហាការដឹកជញ្ជូន',
    issueReasonPlaceholder: 'បញ្ជាក់មូលហេតុ (ឧ. ទាក់ទងមិនបាន, មិននៅផ្ទះ)...',
    btnFailed: 'ដឹកមិនបានសម្រេច',
    btnReturn: 'ប្រគល់អីវ៉ាន់ត្រឡប់',
    cancel: 'បោះបង់',
    proofPhotosTitle: 'រូបថតភស្តុតាងប្រគល់ទំនិញ',
    signatureTitle: 'ហត្ថលេខាអតិថិជន',
    failedPhotoTitle: 'រូបថតភស្តុតាងមិនបានសម្រេច',
  },
};

export default function ParcelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { lang } = useLanguage();
  const resolvedParams = use(params);
  const taskId = resolvedParams.id;

  const [parcel, setParcel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'detail' | 'timeline' | 'chat'>('detail');

  // Chat State
  const [messages, setMessages] = useState<any[]>([
    { id: 1, sender: 'merchant', text: 'Hello driver, please call customer before delivery.', time: '10:15 AM' },
    { id: 2, sender: 'driver', text: 'Sure, I am on the way now.', time: '10:20 AM' },
  ]);
  const [chatInput, setChatInput] = useState('');

  // Report Problem Modal
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueReason, setIssueReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const t = detailTranslations[lang as 'en' | 'km'] || detailTranslations.en;

  const loadParcel = async () => {
    try {
      const res = await api.get(`/mobile/driver/tasks/${taskId}`);
      setParcel(res.data);
    } catch (err) {
      console.error('Failed to load parcel detail', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/driver/login');
      return;
    }
    loadParcel();
  }, [taskId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: 'driver', text: chatInput.trim(), time: timeStr },
    ]);
    setChatInput('');
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setActionLoading(true);
    try {
      await api.patch(`/mobile/driver/tasks/${taskId}/status`, {
        status: newStatus,
        note: issueReason,
      });
      setShowIssueModal(false);
      setIssueReason('');
      loadParcel();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'delivered') return { bg: '#ecfdf5', color: '#16a34a', text: 'Delivered' };
    if (s === 'failed' || s === 'problem') return { bg: '#fef2f2', color: '#dc2626', text: 'Failed' };
    if (s === 'returned' || s === 'rejected') return { bg: '#faf5ff', color: '#9333ea', text: 'Returned' };
    if (s === 'in-transit') return { bg: '#eff6ff', color: '#2563eb', text: 'In Transit' };
    return { bg: '#fffbeb', color: '#d97706', text: 'Pending' };
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        color: '#64748b',
        fontSize: '14px',
      }}>
        {t.loading}
      </div>
    );
  }

  if (!parcel) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ color: '#dc2626', fontWeight: '700' }}>{t.notFound}</p>
        <button
          type="button"
          onClick={() => router.push('/driver/tasks')}
          style={{
            marginTop: '16px',
            padding: '10px 20px',
            backgroundColor: '#1e60ff',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
          }}
        >
          {t.back}
        </button>
      </div>
    );
  }

  const statusBadge = getStatusBadge(parcel.status);
  const merchantName = parcel.merchant?.name || parcel.merchant?.nameKh || 'Sokha Store';
  const merchantPhone = parcel.merchant?.phone || '023 555 678';
  const customerName = parcel.receiverName || 'Chan Sodany';
  const customerPhone = parcel.receiverPhone || '012 345 678';
  const customerAddress = parcel.receiverAddress || '#123, St. 278, Boeung Keng Kang, Phnom Penh';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: "'Kantumruy Pro', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      paddingBottom: '88px',
    }}>
      {/* 1. Header Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <button
          type="button"
          onClick={() => router.push('/driver/tasks')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: '#0f172a',
            padding: 0,
          }}
        >
          <MdArrowBack size={24} />
        </button>

        <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
          #{parcel.trackingCode}
        </div>

        <div style={{
          backgroundColor: statusBadge.bg,
          color: statusBadge.color,
          fontSize: '11px',
          fontWeight: '700',
          padding: '4px 10px',
          borderRadius: '14px',
        }}>
          {statusBadge.text}
        </div>
      </div>

      {/* 2. Segmented Tab Control */}
      <div style={{ padding: '16px 20px 8px' }}>
        <div style={{
          display: 'flex',
          backgroundColor: '#f1f5f9',
          borderRadius: '14px',
          padding: '4px',
        }}>
          {[
            { key: 'detail', label: t.detailTab },
            { key: 'timeline', label: t.timelineTab },
            { key: 'chat', label: t.chatTab },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: isActive ? '#1e60ff' : 'transparent',
                  color: isActive ? '#ffffff' : '#64748b',
                  fontSize: '13px',
                  fontWeight: isActive ? '700' : '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 2px 8px rgba(30, 96, 255, 0.25)' : 'none',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Tab Content */}
      <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {activeTab === 'detail' && (
          <>
            {/* Header Parcel Card */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '16px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '14px',
                  backgroundColor: '#ffedd5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ea580c',
                }}>
                  <MdInventory2 size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                    {merchantName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    #{parcel.trackingCode}
                  </div>
                </div>
              </div>

              <div style={{
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                fontSize: '11.5px',
                fontWeight: '700',
                padding: '4px 10px',
                borderRadius: '12px',
              }}>
                Delivery
              </div>
            </div>

            {/* Customer Information Card */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '16px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                {t.customerInfo}
              </div>

              {/* Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MdPerson size={18} color="#64748b" />
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
                  {customerName}
                </span>
              </div>

              {/* Phone + Action buttons (Call & Telegram) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <MdPhone size={18} color="#64748b" />
                  <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#1e293b' }}>
                    {customerPhone}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* Phone Call */}
                  <a
                    href={`tel:${customerPhone}`}
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      backgroundColor: '#eff6ff',
                      color: '#1e60ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none',
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    <MdPhone size={16} />
                  </a>

                  {/* Telegram */}
                  <a
                    href={`https://t.me/+855${customerPhone.replace(/^0/, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      backgroundColor: '#e0f2fe',
                      color: '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none',
                      border: '1px solid #bae6fd',
                    }}
                  >
                    <FaTelegramPlane size={15} />
                  </a>
                </div>
              </div>

              {/* Address */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <MdLocationOn size={18} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '13px', color: '#475569', lineHeight: 1.4 }}>
                  {customerAddress}
                </span>
              </div>

              {/* Mini Map Preview with "View in Maps" */}
              <div style={{
                position: 'relative',
                height: '110px',
                borderRadius: '14px',
                overflow: 'hidden',
                backgroundColor: '#e2e8f0',
                marginTop: '4px',
              }}>
                <img
                  src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=600&q=80"
                  alt="Map Preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(15, 23, 42, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(customerAddress)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#1e60ff',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '800',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                  >
                    <MdMap size={16} />
                    <span>{t.viewInMaps}</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Merchant Information Card */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '16px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1e60ff',
                }}>
                  <MdStore size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                    {merchantName}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                    {merchantPhone}
                  </div>
                </div>
              </div>

              <a
                href={`tel:${merchantPhone}`}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: '#eff6ff',
                  color: '#1e60ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  border: '1px solid #bfdbfe',
                }}
              >
                <MdPhone size={16} />
              </a>
            </div>

            {/* Parcel Information Card */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '16px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginBottom: '2px' }}>
                {t.parcelInfo}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>{t.codAmount}</span>
                <span style={{ fontWeight: '800', color: '#c2410c' }}>
                  ${Number(parcel.cod || 0).toFixed(2)} {parcel.codCurrency || 'USD'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>{t.weight}</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>
                  {parcel.weight ? `${parcel.weight} kg` : '1.2 kg'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>{t.items}</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>
                  {parcel.size || 'Clothes (3 packages)'}
                </span>
              </div>

              {parcel.note && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>{t.note}</span>
                  <span style={{ fontWeight: '600', color: '#0f172a', maxWidth: '60%', textAlign: 'right' }}>
                    {parcel.note}
                  </span>
                </div>
              )}
            </div>

            {/* Proof of Delivery Photos Card (if any) */}
            {parcel.proofPhotos && Array.isArray(parcel.proofPhotos) && parcel.proofPhotos.length > 0 && (
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                padding: '16px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                  {t.proofPhotosTitle} ({parcel.proofPhotos.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {parcel.proofPhotos.map((src: string, idx: number) => (
                    <div key={idx} style={{ position: 'relative', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
                      <img src={src} alt={`Proof ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Signature Card (if any) */}
            {parcel.signature && (
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                padding: '16px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                  {t.signatureTitle}
                </div>
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '8px',
                  display: 'flex',
                  justifyContent: 'center',
                }}>
                  <img src={parcel.signature} alt="Customer Signature" style={{ maxHeight: '100px', objectFit: 'contain' }} />
                </div>
              </div>
            )}

            {/* Failed Photo Card (if any) */}
            {parcel.failedPhoto && (
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                padding: '16px',
                border: '1px solid #fee2e2',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#dc2626' }}>
                  {t.failedPhotoTitle}
                </div>
                <div style={{ position: 'relative', height: '140px', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#fef2f2' }}>
                  <img src={parcel.failedPhoto} alt="Failure Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>
            )}
          </>
        )}

        {/* Timeline Tab View */}
        {activeTab === 'timeline' && (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '20px 16px',
            border: '1px solid #e2e8f0',
          }}>
            {(!parcel.events || parcel.events.length === 0) ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '20px 0' }}>
                {t.noEvents}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
                {parcel.events.map((evt: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: '#eff6ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#1e60ff',
                      flexShrink: 0,
                    }}>
                      <MdSchedule size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a', textTransform: 'capitalize' }}>
                        {evt.status || 'Status Update'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        {evt.note || 'Status updated by driver'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        {new Date(evt.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat Tab View */}
        {activeTab === 'chat' && (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '16px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '360px',
          }}>
            {/* Chat message bubbles */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
              {messages.map((m) => {
                const isMe = m.sender === 'driver';
                return (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      maxWidth: '80%',
                      backgroundColor: isMe ? '#1e60ff' : '#f1f5f9',
                      color: isMe ? '#ffffff' : '#0f172a',
                      borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div>{m.text}</div>
                    <div style={{
                      fontSize: '10px',
                      color: isMe ? 'rgba(255,255,255,0.7)' : '#94a3b8',
                      marginTop: '4px',
                      textAlign: 'right',
                    }}>
                      {m.time}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={t.chatPlaceholder}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  backgroundColor: '#1e60ff',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  width: '42px',
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <MdSend size={18} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 4. Bottom Fixed Action Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        padding: '12px 20px',
        display: 'flex',
        gap: '12px',
        zIndex: 100,
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.08)',
      }}>
        {/* Report Problem Button */}
        <button
          type="button"
          onClick={() => router.push(`/driver/tasks/${taskId}/failed`)}
          style={{
            flex: 1,
            height: '48px',
            backgroundColor: '#ffffff',
            border: '1.5px solid #fecaca',
            color: '#dc2626',
            borderRadius: '14px',
            fontSize: '13.5px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <MdWarning size={18} />
          <span>{t.reportProblem}</span>
        </button>

        {/* Complete Delivery Button */}
        <button
          type="button"
          onClick={() => router.push(`/driver/tasks/${taskId}/confirm`)}
          style={{
            flex: 1.5,
            height: '48px',
            backgroundColor: '#1e60ff',
            color: '#ffffff',
            border: 'none',
            borderRadius: '14px',
            fontSize: '14px',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(30, 96, 255, 0.3)',
          }}
        >
          {t.completeDelivery}
        </button>
      </div>

      {/* Issue Modal */}
      {showIssueModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '24px',
            width: '100%',
            maxWidth: '380px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                {t.issueDialogTitle}
              </span>
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <MdClose size={22} />
              </button>
            </div>

            <textarea
              rows={3}
              value={issueReason}
              onChange={(e) => setIssueReason(e.target.value)}
              placeholder={t.issueReasonPlaceholder}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: '1.5px solid #e2e8f0',
                fontSize: '13.5px',
                outline: 'none',
                marginBottom: '16px',
                resize: 'none',
              }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowIssueModal(false);
                  router.push(`/driver/tasks/${taskId}/failed`);
                }}
                style={{
                  padding: '12px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <MdWarning size={18} />
                {t.btnFailed}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowIssueModal(false);
                  router.push(`/driver/tasks/${taskId}/return`);
                }}
                style={{
                  padding: '12px',
                  backgroundColor: '#9333ea',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <MdInventory2 size={18} />
                {t.btnReturn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
