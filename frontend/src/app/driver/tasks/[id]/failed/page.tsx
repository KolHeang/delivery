'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdArrowBack,
  MdInventory2,
  MdAddAPhoto,
  MdClose,
  MdCheckCircle,
  MdWarning,
} from 'react-icons/md';

const failedTranslations = {
  en: {
    title: 'Report Failed Delivery',
    selectReason: 'Select Failure Reason',
    reasons: [
      { key: 'not_home', label: 'Customer not at home' },
      { key: 'wrong_address', label: 'Wrong address' },
      { key: 'refused', label: 'Customer refused' },
      { key: 'unreachable', label: 'Phone unreachable' },
      { key: 'damaged', label: 'Item damaged / broken' },
      { key: 'reschedule', label: 'Customer requested to reschedule' },
      { key: 'other', label: 'Other' },
    ],
    addPhoto: 'Add Photo (Optional)',
    photoBtn: 'Add Photo',
    noteOptional: 'Note (Optional)',
    notePlaceholder: 'Add more details...',
    submitBtn: 'Submit Failed',
    submitting: 'Submitting...',
    successTitle: 'Failed Delivery Reported',
    successSub: 'Parcel status has been updated to Failed. It will stay separate from returns for possible rescheduling.',
    doneBtn: 'Back to Tasks',
  },
  km: {
    title: 'រាយការណ៍ការដឹកមិនបានសម្រេច',
    selectReason: 'ជ្រើសរើសមូលហេតុមិនបានសម្រេច',
    reasons: [
      { key: 'not_home', label: 'អតិថិជនមិននៅផ្ទះ' },
      { key: 'wrong_address', label: 'ខុសអាសយដ្ឋាន' },
      { key: 'refused', label: 'អតិថិជនបដិសេធមិនទទួល' },
      { key: 'unreachable', label: 'ទាក់ទងលេខទូរស័ព្ទមិនបាន' },
      { key: 'damaged', label: 'ទំនិញខូចខាត ឬបែកបាក់' },
      { key: 'reschedule', label: 'អតិថិជនសុំពន្យារពេលដឹក' },
      { key: 'other', label: 'មូលហេតុផ្សេងៗ' },
    ],
    addPhoto: 'បន្ថែមរូបថត',
    photoBtn: 'ថត / បន្ថែមរូប',
    noteOptional: 'កំណត់សម្គាល់បន្ថែម',
    notePlaceholder: 'បញ្ជាក់ព័ត៌មានបន្ថែម...',
    submitBtn: 'បញ្ជូនរបាយការណ៍មិនបានសម្រេច',
    submitting: 'កំពុងបញ្ជូន...',
    successTitle: 'បានរាយការណ៍រួចរាល់',
    successSub: 'ស្ថានភាពកញ្ចប់អីវ៉ាន់ត្រូវបានប្តូរទៅជា «មិនបានសម្រេច» ហើយអាចរៀបចំកាលវិភាគដឹកជញ្ជូនឡើងវិញបាន។',
    doneBtn: 'ត្រឡប់ទៅកាន់ភារកិច្ច',
  },
};

export default function FailedDeliveryPage({ params }: { params: Promise<{ id: string }> }) {
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
  const [selectedReason, setSelectedReason] = useState('Customer not at home');
  const [photos, setPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=300&q=80',
  ]);
  const [note, setNote] = useState('');

  const t = failedTranslations[lang as 'en' | 'km'] || failedTranslations.en;

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

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotos((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.patch(`/mobile/driver/tasks/${taskId}/status`, {
        status: 'failed',
        reason: selectedReason,
        note: note.trim() || undefined,
        proofPhotos: photos,
      });

      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit report');
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
          backgroundColor: '#fef2f2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#dc2626',
          marginBottom: '20px',
        }}>
          <MdWarning size={44} />
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px' }}>
          {t.successTitle}
        </h2>
        <p style={{ fontSize: '13.5px', color: '#64748b', margin: '0 0 28px', maxWidth: '300px', lineHeight: 1.4 }}>
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

  const merchantName = parcel?.merchant?.name || parcel?.merchant?.nameKh || 'Apple Store';
  const phoneAndAddress = `${parcel?.receiverPhone || '012 345 678'}, ${parcel?.receiverAddress || 'Phnom Penh, Sen Sok'}`;

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: '#ffedd5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ea580c',
              flexShrink: 0,
            }}>
              <MdInventory2 size={22} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>
                #{parcel?.trackingCode || 'EX00123458'}
              </div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                {merchantName}
              </div>
              <div style={{
                fontSize: '11px',
                color: '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {phoneAndAddress}
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            fontSize: '11px',
            fontWeight: '700',
            padding: '4px 10px',
            borderRadius: '12px',
            flexShrink: 0,
          }}>
            Failed Delivery
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

      {/* 3. Form */}
      <form onSubmit={handleSubmit} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Section 1: Select Failure Reason */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '18px 16px',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
            {t.selectReason}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {t.reasons.map((r) => {
              const isSelected = selectedReason === r.label || selectedReason === r.key;
              return (
                <label
                  key={r.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                    border: isSelected ? '1px solid #bfdbfe' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="failureReason"
                    checked={isSelected}
                    onChange={() => setSelectedReason(r.label)}
                    style={{
                      accentColor: '#1e60ff',
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                    }}
                  />
                  <span style={{
                    fontSize: '13px',
                    fontWeight: isSelected ? '700' : '500',
                    color: isSelected ? '#1e40af' : '#334155',
                  }}>
                    {r.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Section 2: Add Photo (Optional) */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '18px 16px',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a', marginBottom: '14px' }}>
            {t.addPhoto}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {photos.map((photo, index) => (
              <div
                key={index}
                style={{
                  position: 'relative',
                  height: '85px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid #cbd5e1',
                }}
              >
                <img src={photo} alt="Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '22px',
                    height: '22px',
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
                  <MdClose size={13} />
                </button>
              </div>
            ))}

            {/* Add Photo Button */}
            <label
              style={{
                height: '85px',
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
              <span style={{ fontSize: '10.5px', fontWeight: '700' }}>{t.photoBtn}</span>
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

        {/* Section 3: Note (Optional) */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '18px 16px',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>
              {t.noteOptional}
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              {note.length}/200
            </span>
          </div>
          <textarea
            maxLength={200}
            rows={3}
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
              resize: 'none',
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
          zIndex: 100,
          boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.08)',
        }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              height: '50px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              fontSize: '15px',
              fontWeight: '800',
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 20px rgba(220, 38, 38, 0.35)',
              opacity: submitting ? 0.8 : 1,
            }}
          >
            {submitting ? t.submitting : t.submitBtn}
          </button>
        </div>
      </form>
    </div>
  );
}
