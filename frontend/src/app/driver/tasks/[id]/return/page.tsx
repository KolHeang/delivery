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
  MdStore,
  MdPhone,
  MdLocationOn,
} from 'react-icons/md';

const returnTranslations = {
  en: {
    title: 'Return Parcel',
    merchantInfo: 'Merchant Information',
    returnReason: 'Return Reason',
    selectReasonPlaceholder: 'Select reason...',
    reasons: [
      { key: 'customer_refused', label: 'Customer refused delivery' },
      { key: 'defective_item', label: 'Wrong item / Defective' },
      { key: 'customer_canceled', label: 'Customer canceled order' },
      { key: 'unreachable', label: 'Address unreachable / Invalid' },
      { key: 'merchant_request', label: 'Merchant requested return' },
      { key: 'other', label: 'Other reason' },
    ],
    addPhoto: 'Add Photo (Required)',
    photoBtn: 'Add Photo',
    noteOptional: 'Note (Optional)',
    notePlaceholder: 'Add more details...',
    submitBtn: 'Confirm Return',
    submitting: 'Submitting...',
    successTitle: 'Return Confirmed',
    successSub: 'Parcel status has been updated to Return. Please deliver the parcel back to the merchant/warehouse.',
    doneBtn: 'Back to Tasks',
    errorNoPhoto: 'Please upload at least one photo for return proof.',
  },
  km: {
    title: 'ប្រគល់អីវ៉ាន់ត្រឡប់',
    merchantInfo: 'ព័ត៌មានហាងផ្ញើ',
    returnReason: 'មូលហេតុប្រគល់ត្រឡប់',
    selectReasonPlaceholder: 'ជ្រើសរើសមូលហេតុ...',
    reasons: [
      { key: 'customer_refused', label: 'អតិថិជនបដិសេធមិនទទួល' },
      { key: 'defective_item', label: 'ទំនិញខុស ឬមានបញ្ហា' },
      { key: 'customer_canceled', label: 'អតិថិជនបានលុបចោលការបញ្ជាទិញ' },
      { key: 'unreachable', label: 'មិនអាចទាក់ទងអាសយដ្ឋានបាន' },
      { key: 'merchant_request', label: 'ហាងស្នើសុំឱ្យយកត្រឡប់វិញ' },
      { key: 'other', label: 'មូលហេតុផ្សេងៗ' },
    ],
    addPhoto: 'បន្ថែមរូបថត',
    photoBtn: 'ថត / បន្ថែមរូប',
    noteOptional: 'កំណត់សម្គាល់បន្ថែម',
    notePlaceholder: 'បញ្ជាក់ព័ត៌មានបន្ថែម...',
    submitBtn: 'បញ្ជាក់ការប្រគល់ត្រឡប់',
    submitting: 'កំពុងបញ្ជូន...',
    successTitle: 'បានបញ្ជាក់ការប្រគល់ត្រឡប់',
    successSub: 'ស្ថានភាពកញ្ចប់អីវ៉ាន់ត្រូវបានប្តូរទៅជា «ប្រគល់ត្រឡប់»។ សូមប្រគល់កញ្ចប់អីវ៉ាន់ត្រឡប់ទៅហាង ឬឃ្លាំងវិញ។',
    doneBtn: 'ត្រឡប់ទៅកាន់ភារកិច្ច',
    errorNoPhoto: 'សូមបន្ថែមរូបថតភស្តុតាងយ៉ាងតិច ១ សន្លឹក។',
  },
};

export default function ReturnParcelPage({ params }: { params: Promise<{ id: string }> }) {
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
  const [selectedReason, setSelectedReason] = useState('Customer refused delivery');
  const [photos, setPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=300&q=80',
  ]);
  const [note, setNote] = useState('');

  const t = returnTranslations[lang as 'en' | 'km'] || returnTranslations.en;

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
          setError('');
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
    if (photos.length === 0) {
      setError(t.errorNoPhoto);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.patch(`/mobile/driver/tasks/${taskId}/status`, {
        status: 'returned',
        reason: selectedReason,
        note: note.trim() || undefined,
        proofPhotos: photos,
      });

      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit return');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#9333ea',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const merchantName = parcel?.merchant?.name || parcel?.merchant?.nameKh || 'K-Mall';
  const merchantPhone = parcel?.merchant?.phone || '023 555 678';
  const merchantAddress = parcel?.merchant?.address || 'Phnom Penh, Chamkarmon';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: "'Kantumruy Pro', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* Top App Header */}
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
          onClick={() => router.back()}
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
          fontSize: '17px',
          fontWeight: '800',
          color: '#0f172a',
          margin: 0,
        }}>
          {t.title}
        </h1>

        <div style={{ width: '24px' }} />
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {/* Parcel Header Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            backgroundColor: '#faf5ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9333ea',
            flexShrink: 0,
          }}>
            <MdInventory2 size={24} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
              #{parcel?.trackingCode || 'EX00123459'}
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
              {merchantName}
            </div>
          </div>

          <div style={{
            padding: '5px 12px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: '800',
            backgroundColor: '#faf5ff',
            color: '#9333ea',
            border: '1px solid #f3e8ff',
          }}>
            Return
          </div>
        </div>

        {/* Merchant Information Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
            {t.merchantInfo}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MdStore size={18} color="#64748b" />
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
              {merchantName}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MdPhone size={18} color="#64748b" />
            <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#1e293b' }}>
              {merchantPhone}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <MdLocationOn size={18} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: '13px', color: '#475569', lineHeight: 1.4 }}>
              {merchantAddress}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Select Return Reason */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '16px',
            border: '1px solid #e2e8f0',
          }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '800',
              color: '#0f172a',
              marginBottom: '10px',
            }}>
              {t.returnReason}
            </label>

            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1.5px solid #e2e8f0',
                backgroundColor: '#ffffff',
                fontSize: '13.5px',
                color: '#0f172a',
                fontWeight: '600',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {t.reasons.map((r) => (
                <option key={r.key} value={r.label}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Add Photo (Required) */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '16px',
            border: '1px solid #e2e8f0',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                {t.addPhoto}
              </span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {photos.length} photos
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
            }}>
              {photos.map((photo, idx) => (
                <div
                  key={idx}
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <img
                    src={photo}
                    alt={`Photo ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
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
                    <MdClose size={16} />
                  </button>
                </div>
              ))}

              {/* Add Photo Button */}
              <label style={{
                aspectRatio: '1',
                borderRadius: '14px',
                border: '2px dashed #d8b4fe',
                backgroundColor: '#faf5ff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: 'pointer',
                color: '#9333ea',
              }}>
                <MdAddAPhoto size={24} />
                <span style={{ fontSize: '11px', fontWeight: '700' }}>
                  {t.photoBtn}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAddPhoto}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          {/* Note (Optional) with 0/200 counter */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '16px',
            border: '1px solid #e2e8f0',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                {t.noteOptional}
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                {note.length}/200
              </span>
            </div>

            <textarea
              rows={3}
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.notePlaceholder}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: '1.5px solid #e2e8f0',
                fontSize: '13.5px',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              borderRadius: '14px',
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: '600',
            }}>
              {error}
            </div>
          )}

          {/* Confirm Return Button */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: '4px',
              marginBottom: '20px',
              padding: '15px',
              backgroundColor: '#9333ea',
              color: '#ffffff',
              border: 'none',
              borderRadius: '16px',
              fontSize: '15px',
              fontWeight: '800',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              boxShadow: '0 8px 20px rgba(147, 51, 234, 0.3)',
              transition: 'transform 0.1s',
            }}
          >
            {submitting ? t.submitting : t.submitBtn}
          </button>
        </form>
      </div>

      {/* Success Modal */}
      {success && (
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
            padding: '28px 20px',
            width: '100%',
            maxWidth: '360px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#faf5ff',
              color: '#9333ea',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}>
              <MdCheckCircle size={40} />
            </div>

            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
              {t.successTitle}
            </div>

            <div style={{ fontSize: '13.5px', color: '#64748b', lineHeight: 1.5, marginBottom: '24px' }}>
              {t.successSub}
            </div>

            <button
              type="button"
              onClick={() => router.push('/driver/tasks')}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#9333ea',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: '800',
                cursor: 'pointer',
              }}
            >
              {t.doneBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
