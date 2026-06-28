'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import { formatDateToDDMMYYYY } from '@/components/ui/DateInput';

const getKhmerDateString = (date: Date = new Date()) => {
  const days = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
  const months = [
    'មករា', 'កម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
    'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
  ];
  const khmerNums = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  const toKhmerNum = (num: number) => {
    return String(num).split('').map(char => {
      const idx = parseInt(char);
      return isNaN(idx) ? char : khmerNums[idx];
    }).join('');
  };

  const dayName = days[date.getDay()];
  const day = toKhmerNum(date.getDate());
  const monthName = months[date.getMonth()];
  const year = toKhmerNum(date.getFullYear());

  return `ថ្ងៃ ${dayName} ទី ${day} ខែ ${monthName} ឆ្នាំ ${year}`;
};

export default function ReportPaymentCustomerPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasAutoPrintedRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clientId = params.get('client_id');
    const reference = params.get('reference');

    if (!clientId || !reference) {
      setError('ខ្វះប៉ារ៉ាម៉ែត្រក្នុង URL (Missing client_id or reference)');
      setLoading(false);
      return;
    }

    api.get(`/payments/public/invoice?client_id=${clientId}&reference=${reference}`)
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        console.error('Error fetching public payment invoice:', err);
        setError('រកមិនឃើញរបាយការណ៍ទូទាត់ប្រាក់ទេ (Payment settlement report not found)');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!loading && data && !error && !hasAutoPrintedRef.current) {
      hasAutoPrintedRef.current = true;
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, data, error]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f3f4f6' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #d1d5db', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f3f4f6', fontFamily: 'Kantumruy Pro, sans-serif' }}>
        <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626', marginBottom: '8px' }}>មានកំហុស</h3>
          <p style={{ color: '#4b5563', fontSize: '14px' }}>{error}</p>
        </div>
      </div>
    );
  }

  const { payment, orders, orgInfo } = data;
  const merchant = payment.merchant;

  const deliveredOrders = orders.filter((o: any) => o.status === 'delivered');
  const inTransitOrders = orders.filter((o: any) => o.status === 'in-transit' || o.status === 'picked-up' || o.status === 'pending' || o.status === 'failed');
  const returnedOrders = orders.filter((o: any) => o.status === 'returned');

  const delUSD = deliveredOrders.filter((o: any) => o.codCurrency === 'USD').reduce((sum: number, o: any) => sum + parseFloat(o.cod || 0), 0);
  const delKHR = deliveredOrders.filter((o: any) => o.codCurrency === 'KHR').reduce((sum: number, o: any) => sum + parseFloat(o.cod || 0), 0);
  const delFee = deliveredOrders.reduce((sum: number, o: any) => sum + parseFloat(o.deliveryFee || 0), 0);

  const payableUSD = Math.max(0, delUSD - delFee);
  const payableKHR = delKHR;

  const formattedDate = payment.date ? formatDateToDDMMYYYY(payment.date) : formatDateToDDMMYYYY(new Date().toISOString());

  return (
    <div className="receipt-page-wrapper" style={{ background: '#94a3b8', minHeight: '100vh', padding: '40px 20px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', boxSizing: 'border-box' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body, .receipt-page-wrapper {
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .receipt-card {
            box-shadow: none !important;
            padding: 20px 24px !important;
            max-width: 100% !important;
            width: 100% !important;
          }
        }
      `}} />

      <div className="receipt-card" style={{
        background: '#ffffff',
        width: '100%',
        maxWidth: '800px',
        padding: '40px 48px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        boxSizing: 'border-box',
        fontFamily: 'Kantumruy Pro, Inter, sans-serif'
      }}>
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, borderBottom: '2px solid #000', paddingBottom: 15 }}>
          {/* Left: Company Details */}
          <div style={{ fontSize: 11, lineHeight: '1.6', flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: '#2563eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 15
              }}>
                📦
              </div>
              <span style={{ fontSize: 14, fontWeight: '800', color: '#1e3a8a', fontStyle: 'italic' }}>
                {orgInfo.name}
              </span>
            </div>
            <div><strong>អាសយដ្ឋាន៖</strong> {orgInfo.address}</div>
            <div><strong>ទូរស័ព្ទ៖</strong> {orgInfo.phone}</div>
          </div>

          {/* Center: Title */}
          <div style={{ textAlign: 'center', alignSelf: 'center', flex: 1.2 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 'bold', fontFamily: 'Kantumruy Pro, sans-serif', color: '#000' }}>
              របាយការណ៍ទូទាត់ប្រចាំថ្ងៃ
            </h2>
          </div>

          {/* Right: Merchant Details */}
          <div style={{ fontSize: 11, textAlign: 'right', lineHeight: '1.6', flex: 1 }}>
            <div><strong>ឈ្មោះហាង៖</strong> <span style={{ fontStyle: 'italic', fontWeight: 'bold' }}>{merchant.nameKh || merchant.name}</span></div>
            <div><strong>ទូរស័ព្ទ៖</strong> {merchant.phone || '—'}</div>
            <div><strong>កាលបរិច្ឆេទ៖</strong> {formattedDate}</div>
          </div>
        </div>

        {/* Table of Orders */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 11 }}>
          <thead>
            <tr style={{ backgroundColor: '#244f96', color: '#fff' }}>
              <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold', color: '#fff' }}>ល.រ</th>
              <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold', color: '#fff' }}>កាលបរិច្ឆេទ</th>
              <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold', color: '#fff' }}>បរិយាយ</th>
              <th colSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold', color: '#fff' }}>ទឹកប្រាក់ដើមមាន<br/>(ដុល្លារ / ខ្មែរ)</th>
              <th colSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold', color: '#fff' }}>ទឹកប្រាក់ទទួលបាន<br/>(ដុល្លារ / ខ្មែរ)</th>
              <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold', color: '#fff' }}>សេវាដឹក</th>
              <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid #000', fontWeight: 'bold', color: '#fff' }}>ផ្សេងៗ</th>
            </tr>
            <tr style={{ backgroundColor: '#3060a8', color: '#fff' }}>
              <th style={{ border: '1px solid #000', padding: '2px', fontSize: '9px', fontWeight: 'normal', textAlign: 'center', color: '#fff' }}>ដុល្លារ</th>
              <th style={{ border: '1px solid #000', padding: '2px', fontSize: '9px', fontWeight: 'normal', textAlign: 'center', color: '#fff' }}>ខ្មែរ</th>
              <th style={{ border: '1px solid #000', padding: '2px', fontSize: '9px', fontWeight: 'normal', textAlign: 'center', color: '#fff' }}>ដុល្លារ</th>
              <th style={{ border: '1px solid #000', padding: '2px', fontSize: '9px', fontWeight: 'normal', textAlign: 'center', color: '#fff' }}>ខ្មែរ</th>
            </tr>
          </thead>
          <tbody>
            {/* Delivered Section */}
            {deliveredOrders.length > 0 && (
              <>
                <tr>
                  <td colSpan={9} style={{ backgroundColor: '#10b981', color: '#fff', fontWeight: 'bold', padding: '7px 10px', border: '1px solid #000', fontSize: 12 }}>
                    អីវ៉ាន់ដែលបានជោគជ័យ ({deliveredOrders.length} កញ្ចប់)
                  </td>
                </tr>
                {deliveredOrders.map((o: any, idx: number) => {
                  const isUSD = o.codCurrency === 'USD';
                  const codVal = parseFloat(o.cod || 0);
                  return (
                    <tr key={o.id}>
                      <td style={{ textAlign: 'center', padding: '6px 4px', border: '1px solid #000' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}>{formatDateToDDMMYYYY(o.createdAt)}</td>
                      <td style={{ padding: '6px 4px', border: '1px solid #000' }}>{o.trackingCode} {o.receiverPhone ? `(${o.receiverPhone})` : ''}</td>
                      <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>{isUSD ? `$ ${codVal.toFixed(2)}` : '$ 0'}</td>
                      <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>{!isUSD ? `${codVal.toLocaleString()} ៛` : '0 ៛'}</td>
                      <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>{isUSD ? `$ ${codVal.toFixed(2)}` : '$ 0.00'}</td>
                      <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>{!isUSD ? `${codVal.toLocaleString()} ៛` : '0 ៛'}</td>
                      <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>$ {parseFloat(o.deliveryFee || 0).toFixed(2)}</td>
                      <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}></td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={3} style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000' }}>សរុប</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000' }}>$ {delUSD.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000' }}>{delKHR.toLocaleString()} រៀល</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000' }}>$ {delUSD.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000' }}>{delKHR.toLocaleString()} រៀល</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #000' }}>$ {delFee.toFixed(2)}</td>
                  <td style={{ border: '1px solid #000' }}></td>
                </tr>
              </>
            )}

            {/* In Transit / Failed Section */}
            {inTransitOrders.length > 0 && (
              <>
                <tr>
                  <td colSpan={9} style={{ backgroundColor: '#f59e0b', color: '#000', fontWeight: 'bold', padding: '7px 10px', border: '1px solid #000', fontSize: 12 }}>
                    អីវ៉ាន់ដឹកបន្ត ({inTransitOrders.length} កញ្ចប់)
                  </td>
                </tr>
                {inTransitOrders.map((o: any, idx: number) => {
                  const isUSD = o.codCurrency === 'USD';
                  const codVal = parseFloat(o.cod || 0);

                  // Get Khmer status translation
                  let statusLabel = '';
                  if (o.status === 'failed') {
                    statusLabel = 'មិនជោគជ័យ';
                  } else if (o.status === 'pending') {
                    statusLabel = 'រង់ចាំ';
                  } else if (o.status === 'picked-up') {
                    statusLabel = 'ក្នុងឃ្លាំង';
                  } else {
                    statusLabel = 'កំពុងដឹក';
                  }

                  const latestNote = o.histories
                    ?.slice()
                    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .find((h: any) => h.note)?.note || o.note || statusLabel;

                  return (
                    <tr key={o.id}>
                      <td style={{ textAlign: 'center', padding: '6px 4px', border: '1px solid #000' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}>{formatDateToDDMMYYYY(o.createdAt)}</td>
                      <td style={{ padding: '6px 4px', border: '1px solid #000' }}>{o.trackingCode} {o.receiverPhone ? `(${o.receiverPhone})` : ''}</td>
                      <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>{isUSD ? `$ ${codVal.toFixed(2)}` : '$ 0'}</td>
                      <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>{!isUSD ? `${codVal.toLocaleString()} ៛` : '0'}</td>
                      <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}></td>
                      <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}></td>
                      <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>$ {parseFloat(o.deliveryFee || 0).toFixed(2)}</td>
                      <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}>{latestNote}</td>
                    </tr>
                  );
                })}
              </>
            )}

            {/* Returned Section */}
            {returnedOrders.length > 0 && (
              <>
                <tr>
                  <td colSpan={9} style={{ backgroundColor: '#ef4444', color: '#fff', fontWeight: 'bold', padding: '7px 10px', border: '1px solid #000', fontSize: 12 }}>
                    អីវ៉ាន់ត្រឡប់ទៅហាង (Return) ({returnedOrders.length} កញ្ចប់)
                  </td>
                </tr>
                {returnedOrders.map((o: any, idx: number) => {
                  const isUSD = o.codCurrency === 'USD';
                  const codVal = parseFloat(o.cod || 0);
                  const latestNote = o.histories
                    ?.slice()
                    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .find((h: any) => h.note)?.note || o.note || 'ត្រឡប់';
                  return (
                    <tr key={o.id} style={{ background: '#fff5f5' }}>
                      <td style={{ textAlign: 'center', padding: '6px 4px', border: '1px solid #000' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'center' }}>{formatDateToDDMMYYYY(o.createdAt)}</td>
                      <td style={{ padding: '6px 4px', border: '1px solid #000' }}>{o.trackingCode} {o.receiverPhone ? `(${o.receiverPhone})` : ''}</td>
                      <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>{isUSD ? `$ ${codVal.toFixed(2)}` : '$ 0'}</td>
                      <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>{!isUSD ? `${codVal.toLocaleString()} ៛` : '0 ៛'}</td>
                      <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}></td>
                      <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}></td>
                      <td style={{ textAlign: 'right', padding: '6px 4px', border: '1px solid #000' }}>$ 0.00</td>
                      <td style={{ padding: '6px 4px', border: '1px solid #000', textAlign: 'left', color: '#7c3aed', fontSize: 10 }}>{latestNote}</td>
                    </tr>
                  );
                })}
              </>
            )}

            {deliveredOrders.length === 0 && inTransitOrders.length === 0 && returnedOrders.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '12px', border: '1px solid #000', color: '#6b7280' }}>
                  គ្មានទិន្នន័យ
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Financial Summaries Box */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: 20 }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '280px', border: '1px solid #000' }}>
            <tbody>
              <tr>
                <td style={{ padding: '6px 12px', border: '1px solid #000', textAlign: 'right' }}>ប្រាក់សរុប</td>
                <td style={{ padding: '6px 12px', border: '1px solid #000', fontWeight: 'bold', textAlign: 'right' }}>$ {delUSD.toFixed(2)} / {delKHR.toLocaleString()} រៀល</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 12px', border: '1px solid #000', textAlign: 'right' }}>សេវាដឹក</td>
                <td style={{ padding: '6px 12px', border: '1px solid #000', fontWeight: 'bold', textAlign: 'right' }}>$ {delFee.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 12px', border: '1px solid #000', textAlign: 'right' }}>ប្រាក់ត្រូវទទួលបាន</td>
                <td style={{ padding: '6px 12px', border: '1px solid #000', fontWeight: 'bold', color: '#dc2626', textAlign: 'right' }}>$ {payableUSD.toFixed(2)} / {payableKHR.toLocaleString()} រៀល</td>
              </tr>
            </tbody>
          </table>

          {/* Localized Khmer Date */}
          <div style={{ marginTop: 8, fontSize: 11, fontWeight: 'bold', fontStyle: 'italic', color: '#000' }}>
            {getKhmerDateString(payment.date ? new Date(payment.date) : new Date())}
          </div>
        </div>

        {/* Signatures Section */}
        <div style={{ marginTop: 30, display: 'flex', justifyContent: 'space-between', paddingLeft: 30 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 40 }}>បានឃើញ និងឯកភាព</div>
            <div style={{ fontSize: 12, color: '#000' }}>..........................................</div>
          </div>
        </div>

      </div>
    </div>
  );
}
