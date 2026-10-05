'use client';

import { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdArrowBack,
  MdInventory2,
  MdAddAPhoto,
  MdDelete,
  MdAccountBalanceWallet,
  MdAccountBalance,
  MdStore,
  MdCheckCircle,
  MdClose,
  MdAttachMoney,
} from 'react-icons/md';

const confirmTranslations = {
  en: {
    title: 'Confirm Delivery',
    proofRequired: 'Delivery Proof (Required)',
    addPhoto: 'Add Photo',
    signatureOptional: 'Customer Signature (Optional)',
    clear: 'Clear',
    paymentStatus: 'Payment Status',
    cashCollected: 'Cash Collected',
    bankPayment: 'Bank Payment',
    alreadyPaid: 'Already Paid to Shop',
    noteOptional: 'Note (Optional)',
    notePlaceholder: 'Add note...',
    btnConfirm: 'Confirm Delivery',
    confirming: 'Confirming Delivery...',
    errorNoProof: 'Please upload at least 1 delivery proof photo.',
    successTitle: 'Delivery Confirmed!',
    successSub: 'Parcel status has been successfully updated to Delivered.',
    doneBtn: 'Back to Tasks',
  },
  km: {
    title: 'បញ្ជាក់ការដឹកជញ្ជូន',
    proofRequired: 'ភស្តុតាងប្រគល់អីវ៉ាន់ ចាំបាច់',
    addPhoto: 'ថតរូប / បន្ថែមរូប',
    signatureOptional: 'ហត្ថលេខាអតិថិជន',
    clear: 'លុប',
    paymentStatus: 'ស្ថានភាពទូទាត់ប្រាក់',
    cashCollected: 'បានប្រមូលប្រាក់សុទ្ធ',
    bankPayment: 'ទូទាត់តាមធនាគារ',
    alreadyPaid: 'បានទូទាត់ទៅហាងរួច',
    noteOptional: 'ចំណាំបន្ថែម',
    notePlaceholder: 'បញ្ចូលចំណាំ...',
    btnConfirm: 'បញ្ជាក់ការដឹកជញ្ជូនរួចរាល់',
    confirming: 'កំពុងបញ្ជាក់...',
    errorNoProof: 'សូមភ្ជាប់រូបថតភស្តុតាងការប្រគល់អីវ៉ាន់យ៉ាងហោចណាស់ ១ សន្លឹក។',
    successTitle: 'ដឹកជញ្ជូនជោគជ័យ!',
    successSub: 'ស្ថានភាពកញ្ចប់អីវ៉ាន់ត្រូវបានផ្លាស់ប្តូរទៅជា «ដឹកជញ្ជូនជោគជ័យ»។',
    doneBtn: 'ត្រឡប់ទៅកាន់ភារកិច្ច',
  },
};

export default function ConfirmDeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { lang } = useLanguage();
  const resolvedParams = use(params);
  const taskId = resolvedParams.id;

  const [parcel, setParcel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form states
  const [proofPhotos, setProofPhotos] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'already_paid'>('cash');
  const [note, setNote] = useState('');

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const t = confirmTranslations[lang as 'en' | 'km'] || confirmTranslations.en;

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/driver/login');
      return;
    }

    const loadParcel = async () => {
      try {
        const res = await api.get(`/mobile/driver/tasks/${taskId}`);
        setParcel(res.data);
      } catch (err) {
        console.error('Failed to load parcel', err);
      } finally {
        setLoading(false);
      }
    };
    loadParcel();
  }, [taskId]);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setProofPhotos((prev) => [...prev, reader.result as string]);
          setError('');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (idx: number) => {
    setProofPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (proofPhotos.length === 0) {
      setError(t.errorNoProof);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      let signatureData = '';
      if (canvasRef.current && hasSignature) {
        signatureData = canvasRef.current.toDataURL('image/png');
      }

      await api.patch(`/mobile/driver/tasks/${taskId}/status`, {
        status: 'delivered',
        note: note ? `[Payment: ${paymentMethod}] ${note}` : `Payment: ${paymentMethod}`,
        paymentMethod,
        signature: signatureData || undefined,
        proofPhotos,
      });

      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete delivery');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', color: '#64748b' }}>
        Loading...
      </div>
    );
  }

  if (success) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        padding: '32px 24px',
        textAlign: 'center',
        fontFamily: "'Kantumruy Pro', 'Inter', sans-serif",
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: '#dcfce7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#16a34a',
          marginBottom: '20px',
        }}>
          <MdCheckCircle size={48} />
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px' }}>
          {t.successTitle}
        </h2>
        <p style={{ fontSize: '13.5px', color: '#64748b', margin: '0 0 28px', maxWidth: '280px' }}>
          {t.successSub}
        </p>

        <button
          type="button"
          onClick={() => router.push('/driver/tasks')}
          style={{
            width: '100%',
            maxWidth: '300px',
            height: '50px',
            backgroundColor: '#1e60ff',
            color: '#ffffff',
            border: 'none',
            borderRadius: '14px',
            fontSize: '15px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(30, 96, 255, 0.35)',
          }}
        >
          {t.doneBtn}
        </button>
      </div>
    );
  }

  const merchantName = parcel?.merchant?.name || parcel?.merchant?.nameKh || parcel?.merchantName || (lang === 'km' ? 'ហាង' : 'Store');

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: "'Kantumruy Pro', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      paddingBottom: '90px',
    }}>
      {/* 1. Header Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <button
          type="button"
          onClick={() => router.push(`/driver/tasks/${taskId}`)}
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

        <div style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
          {t.title}
        </div>
      </div>

      {/* 2. Parcel Summary Banner */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '18px',
          padding: '14px 16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: '#ffedd5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ea580c',
            }}>
              <MdInventory2 size={22} />
            </div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>
                #{parcel?.trackingCode || 'EX00123456'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                {merchantName}
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            fontSize: '11px',
            fontWeight: '700',
            padding: '4px 10px',
            borderRadius: '12px',
          }}>
            Delivery
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{ padding: '12px 20px 0' }}>
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            borderRadius: '12px',
            padding: '10px 14px',
            fontSize: '12.5px',
            fontWeight: '600',
          }}>
            {error}
          </div>
        </div>
      )}

      {/* 3. Form Sections */}
      <form onSubmit={handleSubmit} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Section 1: Delivery Proof (Required) */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '18px 16px',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a', marginBottom: '14px' }}>
            {t.proofRequired}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {proofPhotos.map((photo, index) => (
              <div
                key={index}
                style={{
                  position: 'relative',
                  height: '90px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid #cbd5e1',
                }}
              >
                <img src={photo} alt="POD" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    color: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <MdClose size={14} />
                </button>
              </div>
            ))}

            {/* Add Photo Button */}
            <label
              style={{
                height: '90px',
                borderRadius: '12px',
                border: '2px dashed #93c5fd',
                backgroundColor: '#f0f9ff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1e60ff',
                cursor: 'pointer',
                gap: '4px',
              }}
            >
              <MdAddAPhoto size={22} />
              <span style={{ fontSize: '11px', fontWeight: '700' }}>{t.addPhoto}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleAddPhoto}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        {/* Section 2: Customer Signature (Optional) */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '18px 16px',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}>
            <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>
              {t.signatureOptional}
            </span>
            <button
              type="button"
              onClick={clearSignature}
              style={{
                background: 'none',
                border: 'none',
                color: '#1e60ff',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              {t.clear}
            </button>
          </div>

          <div style={{
            border: '1.5px solid #e2e8f0',
            borderRadius: '14px',
            backgroundColor: '#f8fafc',
            overflow: 'hidden',
          }}>
            <canvas
              ref={canvasRef}
              width={340}
              height={120}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              style={{ width: '100%', height: '120px', display: 'block', touchAction: 'none' }}
            />
          </div>
        </div>

        {/* Section 3: Payment Status */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '18px 16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>
            {t.paymentStatus}
          </div>

          {/* Option 1: Cash Collected */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: '14px',
            backgroundColor: paymentMethod === 'cash' ? '#f0fdf4' : '#f8fafc',
            border: paymentMethod === 'cash' ? '1.5px solid #86efac' : '1px solid #e2e8f0',
            cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                backgroundColor: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16a34a',
              }}>
                <MdAttachMoney size={20} />
              </div>
              <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>
                {t.cashCollected}
              </span>
            </div>
            <input
              type="radio"
              name="payment"
              checked={paymentMethod === 'cash'}
              onChange={() => setPaymentMethod('cash')}
              style={{ accentColor: '#16a34a', width: '18px', height: '18px' }}
            />
          </label>

          {/* Option 2: Bank Payment */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: '14px',
            backgroundColor: paymentMethod === 'bank' ? '#eff6ff' : '#f8fafc',
            border: paymentMethod === 'bank' ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
            cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
              }}>
                <MdAccountBalance size={18} />
              </div>
              <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>
                {t.bankPayment}
              </span>
            </div>
            <input
              type="radio"
              name="payment"
              checked={paymentMethod === 'bank'}
              onChange={() => setPaymentMethod('bank')}
              style={{ accentColor: '#1e60ff', width: '18px', height: '18px' }}
            />
          </label>

          {/* Option 3: Already Paid to Shop */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: '14px',
            backgroundColor: paymentMethod === 'already_paid' ? '#faf5ff' : '#f8fafc',
            border: paymentMethod === 'already_paid' ? '1.5px solid #d8b4fe' : '1px solid #e2e8f0',
            cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                backgroundColor: '#f3e8ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9333ea',
              }}>
                <MdStore size={18} />
              </div>
              <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>
                {t.alreadyPaid}
              </span>
            </div>
            <input
              type="radio"
              name="payment"
              checked={paymentMethod === 'already_paid'}
              onChange={() => setPaymentMethod('already_paid')}
              style={{ accentColor: '#9333ea', width: '18px', height: '18px' }}
            />
          </label>
        </div>

        {/* Section 4: Note (Optional) */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '18px 16px',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
            {t.noteOptional}
          </div>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.notePlaceholder}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '12px',
              border: '1.5px solid #e2e8f0',
              fontSize: '13.5px',
              outline: 'none',
            }}
          />
        </div>

        {/* Bottom Fixed Action Button */}
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
          zIndex: 90,
          boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.05)',
        }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              height: '50px',
              backgroundColor: '#1e60ff',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              fontSize: '15px',
              fontWeight: '800',
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 20px rgba(30, 96, 255, 0.35)',
              opacity: submitting ? 0.8 : 1,
            }}
          >
            {submitting ? t.confirming : t.btnConfirm}
          </button>
        </div>
      </form>
    </div>
  );
}
