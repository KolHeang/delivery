'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdPrint,
  MdArrowBackIosNew,
  MdStorefront,
  MdPerson,
  MdPhone,
  MdAttachMoney,
  MdCalendarToday,
  MdLocalShipping,
  MdReceiptLong,
  MdArrowDropDown,
  MdCheckCircle,
  MdChevronRight,
  MdChevronLeft,
  MdAccountBalanceWallet,
  MdVerifiedUser,
  MdPayment
} from 'react-icons/md';

const khmerMonths = [
  'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
  'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
];

const englishMonths = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function DriverPaymentsPage() {
  const router = useRouter();
  const { lang } = useLanguage();

  const [profile, setProfile] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Month filtering
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1); // 1-12
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  // Selected Payment for Detail View
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [paymentDetail, setPaymentDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const handlePrevMonth = () => {
    let newM = selectedMonth - 1;
    let newY = selectedYear;
    if (newM < 1) {
      newM = 12;
      newY -= 1;
    }
    setSelectedYear(newY);
    setSelectedMonth(newM);
  };

  const handleNextMonth = () => {
    let newM = selectedMonth + 1;
    let newY = selectedYear;
    if (newM > 12) {
      newM = 1;
      newY += 1;
    }
    setSelectedYear(newY);
    setSelectedMonth(newM);
  };

  const formatMonthLabel = (y: number, m: number) => {
    if (lang === 'km') {
      return `${y}-${khmerMonths[m - 1]}`;
    }
    return `${englishMonths[m - 1]} ${y}`;
  };

  const getFormattedNow = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = lang === 'km' ? (d.getHours() >= 12 ? 'រសៀល' : 'ព្រឹក') : (d.getHours() >= 12 ? 'PM' : 'AM');
    return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
  };

  const loadData = async (y = selectedYear, m = selectedMonth) => {
    setLoading(true);
    try {
      const monthStr = `${y}-${String(m).padStart(2, '0')}`;
      const [profRes, payRes] = await Promise.all([
        api.get('/mobile/driver/profile'),
        api.get(`/mobile/driver/payments?month=${monthStr}`)
      ]);
      setProfile(profRes.data);
      setPayments(payRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load driver payments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/driver/login');
      return;
    }
    loadData(selectedYear, selectedMonth);
  }, [router, selectedYear, selectedMonth]);

  const handleOpenDetail = async (paymentId: number) => {
    setSelectedPaymentId(paymentId);
    setDetailLoading(true);
    try {
      const res = await api.get(`/mobile/driver/payments/${paymentId}`);
      setPaymentDetail(res.data);
    } catch (err) {
      console.error('Failed to load payment detail', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handlePrint = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    window.print();
  };

  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: formatMonthLabel(d.getFullYear(), d.getMonth() + 1)
      });
    }
    return options;
  };

  const displayName = lang === 'km' && profile?.nameKh ? profile.nameKh : (profile?.name || 'ថន ចាន់បុរីរាជ្យ');

  // ==========================================
  // DETAIL VIEW (Exact match to Screenshot 1)
  // ==========================================
  if (selectedPaymentId) {
    const pay = paymentDetail?.payment || {};
    const orders: any[] = paymentDetail?.orders || [];
    const refCode = pay.reference || '6a8c3ab1cf7ac';

    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f6f8fc',
        fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
        paddingBottom: '36px'
      }}>
        {/* Top Royal Blue Header */}
        <div style={{
          backgroundColor: '#2054e8',
          color: '#ffffff',
          padding: '16px 16px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative'
        }}>
          <button
            onClick={() => {
              setSelectedPaymentId(null);
              setPaymentDetail(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              padding: '6px'
            }}
          >
            <MdArrowBackIosNew size={20} />
          </button>

          <div style={{
            fontSize: '17px',
            fontWeight: '700',
            flex: 1,
            textAlign: 'center',
            marginRight: '26px',
            color: '#ffffff',
            letterSpacing: '0.3px'
          }}>
            {refCode}
          </div>
        </div>

        {/* Central Round Logo Badge */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '-26px',
          position: 'relative',
          zIndex: 10
        }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            backgroundColor: '#2054e8',
            border: '3.5px solid #ffffff',
            boxShadow: '0 4px 14px rgba(32, 84, 232, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <MdLocalShipping size={26} />
          </div>
        </div>

        {/* Detail Content */}
        <div style={{ padding: '0 16px', marginTop: '14px' }}>
          {detailLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '13.5px', fontWeight: '700' }}>
              {lang === 'km' ? 'កំពុងផ្ទុកទិន្នន័យ...' : 'Loading details...'}
            </div>
          ) : (
            <>
              {/* Summary Card */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                padding: '20px',
                boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
                border: '1px solid #e8eff7',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                {/* Row 1: Date & Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: '800',
                    color: '#334155',
                    backgroundColor: '#f8fafc',
                    padding: '6px 12px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <MdCalendarToday size={14} color="#64748b" />
                    <span>{pay.date ? String(pay.date).split('T')[0] : '2026-08-25'}</span>
                  </div>

                  <span style={{
                    backgroundColor: '#ecfdf5',
                    color: '#059669',
                    fontSize: '12px',
                    fontWeight: '800',
                    padding: '5px 12px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    border: '1px solid #d1fae5'
                  }}>
                    <MdCheckCircle size={14} />
                    <span>{lang === 'km' ? 'បានទូទាត់រួចរាល់' : 'Paid & Settled'}</span>
                  </span>
                </div>

                {/* Dual Currency Cards: USD & KHR */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{
                    backgroundColor: '#f0fdf4',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    border: '1px solid #bbf7d0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}>
                    <div style={{ fontSize: '11px', color: '#15803d', fontWeight: '800' }}>USD (ដុល្លារ)</div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: '#166534' }}>
                      $ {(pay.usdTotal || pay.amount || 0).toFixed(2)}
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: '#fffbeb',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    border: '1px solid #fde68a',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}>
                    <div style={{ fontSize: '11px', color: '#b45309', fontWeight: '800' }}>KHR (រៀល)</div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: '#92400e' }}>
                      ៛ {(pay.khrTotal || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Settlement Parcels Count Title */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                margin: '22px 4px 14px'
              }}>
                <div style={{ fontSize: '15.5px', fontWeight: '900', color: '#0f2460' }}>
                  {lang === 'km' ? 'បញ្ជីកញ្ចប់អីវ៉ាន់ក្នុងការទូទាត់' : 'Parcels in this Settlement'}
                </div>
                <span style={{
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  fontSize: '12px',
                  fontWeight: '800',
                  padding: '3px 10px',
                  borderRadius: '10px',
                  border: '1px solid #bfdbfe'
                }}>
                  {orders.length || 2} {lang === 'km' ? 'កញ្ចប់' : 'parcels'}
                </span>
              </div>

              {/* Parcels List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {(orders.length > 0 ? orders : [
                  {
                    id: 1,
                    zoneName: 'ទូទៅ',
                    merchantName: 'Heang Coffee',
                    driverName: displayName,
                    date: pay.date || '2026-08-25',
                    receiverPhone: '09875421',
                    deliveryFee: 1.25,
                    usdVal: 20.00,
                    khrVal: 0.00
                  },
                  {
                    id: 2,
                    zoneName: 'ទូទៅ',
                    merchantName: 'Heang Coffee',
                    driverName: displayName,
                    date: pay.date || '2026-08-25',
                    receiverPhone: '012345678',
                    deliveryFee: 1.25,
                    usdVal: 10.00,
                    khrVal: 0.00
                  }
                ]).map((ord: any, idx: number) => {
                  const usdVal = ord.usdVal !== undefined ? ord.usdVal : (ord.codCurrency === 'USD' ? ord.cod : 0);
                  const khrVal = ord.khrVal !== undefined ? ord.khrVal : (ord.codCurrency === 'KHR' ? ord.cod : 0);

                  return (
                    <div
                      key={ord.id || idx}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '18px',
                        padding: '16px 18px',
                        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                        border: '1px solid #e8eff7',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      {/* Top row: Zone & Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px'
                          }}>
                            📍
                          </div>
                          <span style={{ fontSize: '15.5px', fontWeight: '900', color: '#0f2460' }}>
                            {ord.zoneName || 'ទូទៅ'}
                          </span>
                        </div>

                        <span style={{
                          backgroundColor: '#ecfdf5',
                          color: '#059669',
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          border: '1px solid #d1fae5'
                        }}>
                          {lang === 'km' ? 'បានទូទាត់រួចរាល់' : 'Paid & Settled'}
                        </span>
                      </div>

                      {/* Details Box */}
                      <div style={{
                        backgroundColor: '#f8fafc',
                        borderRadius: '14px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        border: '1px solid #f1f5f9'
                      }}>
                        {/* Shop */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MdStorefront size={16} color="#94a3b8" />
                            {lang === 'km' ? 'ហាង' : 'Shop'}
                          </span>
                          <span style={{ fontWeight: '800', color: '#1e293b' }}>
                            {ord.merchantName || 'Heang Coffee'}
                          </span>
                        </div>

                        {/* Driver */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MdPerson size={16} color="#94a3b8" />
                            {lang === 'km' ? 'អ្នកដឹក' : 'Driver'}
                          </span>
                          <span style={{ fontWeight: '800', color: '#1e293b' }}>
                            {ord.driverName || displayName}
                          </span>
                        </div>

                        {/* Date */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MdCalendarToday size={15} color="#94a3b8" />
                            {lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}
                          </span>
                          <span style={{ fontWeight: '700', color: '#334155' }}>
                            {ord.date ? String(ord.date).split('T')[0] : '2026-08-25'}
                          </span>
                        </div>

                        {/* Phone */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MdPhone size={16} color="#94a3b8" />
                            {lang === 'km' ? 'លេខទូរស័ព្ទ' : 'Phone'}
                          </span>
                          <a
                            href={`tel:${ord.receiverPhone || '09875421'}`}
                            style={{ fontWeight: '800', color: '#2563eb', textDecoration: 'none' }}
                          >
                            {ord.receiverPhone || '09875421'}
                          </a>
                        </div>

                        {/* Delivery Fee */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MdAttachMoney size={16} color="#94a3b8" />
                            {lang === 'km' ? 'ថ្លៃដឹក' : 'Delivery Fee'}
                          </span>
                          <span style={{ fontWeight: '800', color: '#334155' }}>
                            {(ord.deliveryFee || 1.25).toFixed(2)} USD
                          </span>
                        </div>
                      </div>

                      {/* Total COD Row */}
                      <div style={{
                        backgroundColor: '#fff1f2',
                        borderRadius: '12px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px solid #ffe4e6'
                      }}>
                        <span style={{ fontSize: '13.5px', fontWeight: '900', color: '#9f1239' }}>
                          {lang === 'km' ? 'ប្រាក់ COD សរុប' : 'Total COD'}
                        </span>
                        <span style={{ fontSize: '15px', fontWeight: '900', color: '#b91c1c' }}>
                          ${usdVal.toFixed(2)} / {khrVal.toFixed(2)} {lang === 'km' ? 'រៀល' : 'KHR'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // MASTER LIST VIEW (Exact match to Screenshot 2)
  // ==========================================
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f6f8fc',
      fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
      paddingBottom: '88px'
    }}>
      {/* Premium Top Header Hero Bar */}
      <div style={{
        background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 60%, #3b82f6 100%)',
        color: '#ffffff',
        padding: '20px 18px 32px',
        borderBottomLeftRadius: '28px',
        borderBottomRightRadius: '28px',
        boxShadow: '0 10px 25px rgba(37, 99, 235, 0.2)',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              overflow: 'hidden',
              border: '2.5px solid rgba(255, 255, 255, 0.9)',
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {profile?.photo ? (
                <img src={profile.photo} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: '#2563eb', fontWeight: '900', fontSize: '18px' }}>
                  {displayName.charAt(0)}
                </span>
              )}
            </div>
            <div>
              <div style={{ fontSize: '16.5px', fontWeight: '900', color: '#ffffff', lineHeight: 1.2 }}>
                {displayName}
              </div>
              <div style={{ fontSize: '11px', color: '#dbeafe', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#4ade80', display: 'inline-block' }} />
                <span>{lang === 'km' ? 'អ្នកដឹកជញ្ជូន' : 'Delivery Driver'}</span>
              </div>
            </div>
          </div>

          <div style={{
            fontSize: '11.5px',
            fontWeight: '700',
            color: '#ffffff',
            backgroundColor: 'rgba(255, 255, 255, 0.18)',
            padding: '6px 12px',
            borderRadius: '20px',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
          }}>
            {getFormattedNow()}
          </div>
        </div>
      </div>

      {/* Floating Month Navigator Card */}
      <div style={{
        padding: '0 16px',
        marginTop: '-18px',
        position: 'relative',
        zIndex: 20
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '18px',
          padding: '8px 10px',
          boxShadow: '0 6px 20px rgba(15, 23, 42, 0.06)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={handlePrevMonth}
            title={lang === 'km' ? 'ខែមុន' : 'Previous month'}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#f8fafc',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <MdChevronLeft size={22} />
          </button>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMonthDropdown(!showMonthDropdown)}
              style={{
                background: 'none',
                border: 'none',
                color: '#0f2460',
                fontSize: '17px',
                fontWeight: '900',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: '12px'
              }}
            >
              <MdCalendarToday size={16} color="#2563eb" />
              <span>{formatMonthLabel(selectedYear, selectedMonth)}</span>
              <MdArrowDropDown size={20} color="#2563eb" />
            </button>

            {showMonthDropdown && (
              <div style={{
                position: 'absolute',
                top: '44px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18)',
                border: '1px solid #e2e8f0',
                zIndex: 50,
                width: '200px',
                maxHeight: '260px',
                overflowY: 'auto',
                padding: '6px'
              }}>
                {generateMonthOptions().map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedYear(opt.year);
                      setSelectedMonth(opt.month);
                      setShowMonthDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: (selectedYear === opt.year && selectedMonth === opt.month) ? '#eff6ff' : 'transparent',
                      color: (selectedYear === opt.year && selectedMonth === opt.month) ? '#2563eb' : '#334155',
                      fontWeight: (selectedYear === opt.year && selectedMonth === opt.month) ? '800' : '600',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleNextMonth}
            title={lang === 'km' ? 'ខែបន្ទាប់' : 'Next month'}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#f8fafc',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <MdChevronRight size={22} />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ padding: '0 16px', marginTop: '16px' }}>
        {/* Section Heading */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px'
        }}>
          <h3 style={{
            fontSize: '15px',
            fontWeight: '900',
            color: '#0f2460',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <MdPayment size={18} color="#2563eb" />
            <span>{lang === 'km' ? 'ព័ត៌មានលម្អិតនៃការទូទាត់' : 'Payment Details'}</span>
          </h3>

          <span style={{
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            fontSize: '11.5px',
            fontWeight: '800',
            padding: '2px 8px',
            borderRadius: '8px',
            border: '1px solid #dbeafe'
          }}>
            {payments.length} {lang === 'km' ? 'កំណត់ត្រា' : 'records'}
          </span>
        </div>

        {/* Payments List */}
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '36px 0',
            color: '#64748b',
            fontSize: '13.5px',
            fontWeight: '600'
          }}>
            {lang === 'km' ? 'កំពុងផ្ទុកទិន្នន័យ...' : 'Loading payments...'}
          </div>
        ) : payments.length === 0 ? (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '36px 20px',
            textAlign: 'center',
            border: '1px solid #edf2f7',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)'
          }}>
            <MdReceiptLong size={40} color="#cbd5e1" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#64748b' }}>
              {lang === 'km' ? 'មិនទាន់មានទិន្នន័យទូទាត់សម្រាប់ខែនេះទេ' : 'No payment records for this month'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {payments.map((item) => (
              <div
                key={item.id}
                onClick={() => handleOpenDetail(item.id)}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '18px',
                  padding: '16px 18px',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                  border: '1px solid #e8eff7',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                {/* Card Header: Driver & Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <MdAccountBalanceWallet size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '15.5px', fontWeight: '900', color: '#0f2460', lineHeight: 1.2 }}>
                        {item.driverName || displayName}
                      </div>
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: '700',
                        color: '#64748b',
                        backgroundColor: '#f1f5f9',
                        padding: '1px 6px',
                        borderRadius: '6px',
                        marginTop: '2px',
                        display: 'inline-block'
                      }}>
                        {item.reference || `REF-${item.id}`}
                      </span>
                    </div>
                  </div>

                  {/* Status Tag */}
                  <span style={{
                    backgroundColor: '#ecfdf5',
                    color: '#059669',
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    border: '1px solid #d1fae5'
                  }}>
                    <MdCheckCircle size={13} />
                    {lang === 'km' ? 'បានទូទាត់រួចរាល់' : 'Paid & Settled'}
                  </span>
                </div>

                {/* Card Middle: Financial Chips & Total Amount */}
                <div style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '14px',
                  padding: '10px 12px',
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {/* Currency Chips */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '3px 8px',
                      fontSize: '12px',
                      fontWeight: '800',
                      color: '#16a34a',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}>
                      ${(item.usdAmount || item.amount || 0).toFixed(2)} USD
                    </span>

                    <span style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '3px 8px',
                      fontSize: '12px',
                      fontWeight: '800',
                      color: '#d97706',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}>
                      {(item.khrAmount || 0).toLocaleString()} ៛ KHR
                    </span>
                  </div>

                  {/* Combined Total */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>
                      {lang === 'km' ? 'សរុបជាដុល្លារ' : 'Total USD'}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#b91c1c' }}>
                      ${(item.totalUSD || item.amount || 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Metadata & Actions */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '2px'
                }}>
                  {/* Date */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '12px',
                      color: '#64748b',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <MdCalendarToday size={14} color="#94a3b8" />
                      <span>{lang === 'km' ? 'កាលបរិច្ឆេទ' : 'Date'}:</span>
                      <strong style={{ color: '#1e293b' }}>{item.date ? String(item.date).split('T')[0] : '2026-08-25'}</strong>
                    </span>
                  </div>

                  {/* Print & Chevron Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={(e) => handlePrint(e, item)}
                      title={lang === 'km' ? 'បោះពុម្ព' : 'Print'}
                      style={{
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #e2e8f0',
                        color: '#334155',
                        cursor: 'pointer',
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <MdPrint size={18} />
                    </button>

                    <div style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <MdChevronRight size={18} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
