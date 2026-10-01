'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getUser } from '@/lib/auth';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdArrowBack,
  MdCalendarToday,
  MdClose,
  MdReceipt,
  MdCheckCircle,
  MdHourglassEmpty,
} from 'react-icons/md';

const paymentTranslations = {
  en: {
    title: 'Payment',
    dailyInvoiceTitle: 'Daily Delivery Invoice',
    riderName: 'Rider Name',
    riderId: 'Rider ID',
    totalParcels: 'Total Parcels',
    delivered: 'Delivered',
    failed: 'Failed',
    returned: 'Returned',
    feePerParcel: 'Delivery Fee per Parcel',
    totalDeliveryFee: 'Total Delivery Fee',
    adjustment: 'Adjustment / Deduction',
    totalAmount: 'Total Amount',
    paymentStatus: 'Payment Status',
    completed: 'Completed',
    pending: 'Pending',
    paid: 'Paid',
    selectDate: 'Select Date',
    today: 'Today',
    loading: 'Loading invoice...',
    noData: 'No delivery invoice available for this date.',
  },
  km: {
    title: 'ការទូទាត់',
    dailyInvoiceTitle: 'វិក្កយបត្រថ្លៃដឹកប្រចាំថ្ងៃ',
    riderName: 'ឈ្មោះអ្នកដឹកជញ្ជូន',
    riderId: 'អត្តលេខអ្នកដឹក',
    totalParcels: 'កញ្ចប់អីវ៉ាន់សរុប',
    delivered: 'ដឹកជោគជ័យ',
    failed: 'មិនបានសម្រេច',
    returned: 'ត្រឡប់មកវិញ',
    feePerParcel: 'ថ្លៃដឹកជញ្ជូនក្នុងមួយកញ្ចប់',
    totalDeliveryFee: 'ថ្លៃដឹកជញ្ជូនសរុប',
    adjustment: 'ការកាត់កង / កែតម្រូវ',
    totalAmount: 'ទឹកប្រាក់សរុប',
    paymentStatus: 'ស្ថានភាពទូទាត់ប្រាក់',
    completed: 'បានបញ្ចប់',
    pending: 'រង់ចាំទូទាត់',
    paid: 'បានទូទាត់រួច',
    selectDate: 'ជ្រើសរើសថ្ងៃ',
    today: 'ថ្ងៃនេះ',
    loading: 'កំពុងផ្ទុកវិក្កយបត្រ...',
    noData: 'មិនមានទិន្នន័យវិក្កយបត្រសម្រាប់ថ្ងៃនេះទេ។',
  },
};

export default function DriverPaymentsPage() {
  const router = useRouter();
  const { lang } = useLanguage();

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  const t = paymentTranslations[lang as 'en' | 'km'] || paymentTranslations.en;

  const loadDailyInvoice = async (dateStr = selectedDate) => {
    try {
      const res = await api.get(`/mobile/driver/invoices/daily?date=${dateStr}`);
      setInvoice(res.data);
    } catch (err) {
      console.error('Failed to load daily delivery invoice', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/driver/login');
      return;
    }
    const user = getUser();
    if (user?.role !== 'driver') {
      router.push('/driver/login');
      return;
    }
    loadDailyInvoice(selectedDate);
  }, [router]);

  const formatDateDisplay = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(lang === 'km' ? 'km-KH' : 'en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setShowCalendarModal(false);
    setLoading(true);
    loadDailyInvoice(dateStr);
  };

  const riderName = invoice?.rider?.name || 'Sophal Rider';
  const riderId = invoice?.rider?.riderId || 'RDR001';
  const totalParcels = invoice?.parcels?.total || 0;
  const delivered = invoice?.parcels?.delivered || 0;
  const failed = invoice?.parcels?.failed || 0;
  const returned = invoice?.parcels?.returned || 0;

  const feePerParcel = invoice?.financial?.feePerParcel || 1.0;
  const totalDeliveryFee = invoice?.financial?.totalDeliveryFee || (totalParcels * feePerParcel);
  const adjustment = invoice?.financial?.adjustment || 0;
  const totalAmount = invoice?.financial?.totalAmount || Math.max(0, totalDeliveryFee + adjustment);
  const isPaid = invoice?.financial?.paymentStatus === 'Paid';
  const isCompleted = invoice?.invoiceStatus === 'Completed';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: "'Kantumruy Pro', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
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
          onClick={() => router.push('/driver/dashboard')}
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

        <h1 style={{
          fontSize: '18px',
          fontWeight: '800',
          color: '#0f172a',
          margin: 0,
        }}>
          {t.title}
        </h1>

        <div style={{ width: '24px' }} />
      </div>

      {/* Main Content Area */}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 2. Date Filter Bar */}
        <div
          onClick={() => setShowCalendarModal(true)}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#1e293b',
            cursor: 'pointer',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MdCalendarToday size={18} color="#1e60ff" />
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
              {formatDateDisplay(selectedDate)}
            </span>
          </div>
          <MdCalendarToday size={18} color="#64748b" />
        </div>

        {/* 3. Daily Delivery Invoice Card */}
        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: '13.5px' }}>
            {t.loading}
          </div>
        ) : (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '24px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            {/* Header: Title & Completed/Pending Badge */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a' }}>
                {t.dailyInvoiceTitle}
              </div>

              <div style={{
                backgroundColor: isCompleted ? '#dcfce7' : '#fef3c7',
                color: isCompleted ? '#16a34a' : '#d97706',
                padding: '4px 12px',
                borderRadius: '16px',
                fontSize: '11.5px',
                fontWeight: '800',
              }}>
                {isCompleted ? t.completed : t.pending}
              </div>
            </div>

            {/* Rider Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                <span style={{ color: '#64748b' }}>{t.riderName}</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{riderName}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                <span style={{ color: '#64748b' }}>{t.riderId}</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{riderId}</span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', backgroundColor: '#f1f5f9' }} />

            {/* Parcel Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                <span style={{ color: '#64748b' }}>{t.totalParcels}</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{totalParcels}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                <span style={{ color: '#64748b' }}>{t.delivered}</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{delivered}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                <span style={{ color: '#64748b' }}>{t.failed}</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{failed}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                <span style={{ color: '#64748b' }}>{t.returned}</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{returned}</span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', backgroundColor: '#f1f5f9' }} />

            {/* Financial Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                <span style={{ color: '#64748b' }}>{t.feePerParcel}</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>${feePerParcel.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                <span style={{ color: '#64748b' }}>{t.totalDeliveryFee}</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>${totalDeliveryFee.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                <span style={{ color: '#64748b' }}>{t.adjustment}</span>
                <span style={{ fontWeight: '700', color: adjustment < 0 ? '#dc2626' : '#0f172a' }}>
                  {adjustment < 0 ? `-$${Math.abs(adjustment).toFixed(2)}` : `$${adjustment.toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1.5px', backgroundColor: '#e2e8f0' }} />

            {/* Total Amount & Payment Status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px', fontWeight: '900', color: '#1e60ff' }}>
                  {t.totalAmount}
                </span>
                <span style={{ fontSize: '20px', fontWeight: '900', color: '#1e60ff' }}>
                  ${totalAmount.toFixed(2)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>
                  {t.paymentStatus}
                </span>

                <div style={{
                  backgroundColor: isPaid ? '#dcfce7' : '#fffbeb',
                  color: isPaid ? '#16a34a' : '#d97706',
                  padding: '4px 12px',
                  borderRadius: '14px',
                  fontSize: '12px',
                  fontWeight: '800',
                }}>
                  {isPaid ? t.paid : t.pending}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Date Picker Modal */}
      {showCalendarModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '24px',
            width: '100%',
            maxWidth: '360px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                {t.selectDate}
              </span>
              <button
                type="button"
                onClick={() => setShowCalendarModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <MdClose size={22} />
              </button>
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleSelectDate(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1.5px solid #e2e8f0',
                fontSize: '14px',
                fontWeight: '600',
                outline: 'none',
                marginBottom: '16px',
              }}
            />

            <button
              type="button"
              onClick={() => handleSelectDate(new Date().toISOString().split('T')[0])}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#eff6ff',
                color: '#1e60ff',
                border: '1px solid #bfdbfe',
                borderRadius: '12px',
                fontSize: '13.5px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              {t.today}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
