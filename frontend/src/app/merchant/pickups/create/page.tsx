'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import api from '@/lib/api';
import { MdArrowBack, MdInventory2, MdCheckCircle } from 'react-icons/md';

export default function MerchantCreatePickupPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({
    declaredQuantity: '',
    pickupAddress: '',
    pickupTime: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/merchant/login'); return; }
    api.get('/mobile/merchant/profile').then(res => {
      setProfile(res.data);
      // Pre-fill address from merchant profile
      if (res.data?.address) {
        setForm(f => ({ ...f, pickupAddress: res.data.address }));
      }
    }).catch(() => { /* silent */ });

    // Default pickup time = tomorrow 9:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const iso = tomorrow.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
    setForm(f => ({ ...f, pickupTime: iso }));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(form.declaredQuantity);
    if (isNaN(qty) || qty < 1) { setError('Please enter a valid quantity (min 1)'); return; }
    if (!form.pickupTime) { setError('Please select a pickup time'); return; }
    setError('');
    setSubmitting(true);
    try {
      await api.post('/mobile/merchant/pickup-requests', {
        declaredQuantity: qty,
        pickupAddress: form.pickupAddress.trim() || undefined,
        pickupTime: new Date(form.pickupTime).toISOString(),
      });
      setSuccess(true);
      setTimeout(() => router.push('/merchant/pickups'), 1800);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit pickup request');
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MdCheckCircle size={44} color="#16a34a" />
        </div>
        <div style={{ fontWeight: 800, fontSize: 20, color: '#1e293b', textAlign: 'center' }}>Pickup Requested!</div>
        <div style={{ fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 1.6 }}>
          Your request has been submitted.<br />Our team will assign a rider shortly.
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>Redirecting to your requests…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#2f55a5,#4f46e5)', padding: '20px 20px 28px', color: '#fff' }}>
        <button onClick={() => router.back()} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: '8px 12px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          <MdArrowBack size={18} /> Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MdInventory2 size={28} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Request Pickup</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>Our rider will collect from your store</div>
          </div>
        </div>
      </div>

      {/* Form card */}
      <div style={{ flex: 1, padding: '0 16px 24px', marginTop: -14 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(15,23,42,0.08)' }}>

          {error && (
            <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 12, background: '#fee2e2', color: '#dc2626', fontWeight: 600, fontSize: 13 }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Quantity */}
            <div>
              <label style={{ fontSize: 14, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 8 }}>
                📦 Number of Parcels *
              </label>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10, lineHeight: 1.5 }}>
                How many parcels are you handing over? (You don't need to enter individual recipient details yet.)
              </div>
              <input
                type="number" min="1" inputMode="numeric"
                value={form.declaredQuantity}
                onChange={e => setForm(f => ({ ...f, declaredQuantity: e.target.value }))}
                placeholder="e.g. 10"
                required
                style={{ width: '100%', padding: '14px 16px', border: '2px solid #e2e8f0', borderRadius: 12, fontSize: 24, fontWeight: 800, textAlign: 'center', outline: 'none', boxSizing: 'border-box', color: '#1e293b', background: '#f8fafc', transition: 'border-color 0.2s' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#2f55a5')}
                onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
              />
            </div>

            {/* Pickup Address */}
            <div>
              <label style={{ fontSize: 14, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 8 }}>
                📍 Pickup Address
              </label>
              <textarea
                value={form.pickupAddress}
                onChange={e => setForm(f => ({ ...f, pickupAddress: e.target.value }))}
                placeholder="Your shop address (pre-filled from profile)"
                rows={3}
                style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 12, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#1e293b', background: '#f8fafc', resize: 'none', lineHeight: 1.5, transition: 'border-color 0.2s', fontFamily: 'inherit' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#2f55a5')}
                onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
              />
            </div>

            {/* Pickup Time */}
            <div>
              <label style={{ fontSize: 14, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 8 }}>
                🕐 Preferred Pickup Time *
              </label>
              <input
                type="datetime-local"
                value={form.pickupTime}
                onChange={e => setForm(f => ({ ...f, pickupTime: e.target.value }))}
                required
                style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 12, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#1e293b', background: '#f8fafc', transition: 'border-color 0.2s' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#2f55a5')}
                onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
              />
            </div>

            {/* Info note */}
            <div style={{ background: '#eff6ff', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#1e40af', lineHeight: 1.6 }}>
              <strong>ℹ️ How it works:</strong><br />
              1. You submit this request with total parcel count.<br />
              2. Our admin assigns a rider to your store.<br />
              3. The rider arrives and counts the parcels.<br />
              4. Admin scans each parcel individually at the hub.
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '16px', borderRadius: 14, border: 'none',
                background: submitting ? '#e2e8f0' : 'linear-gradient(135deg,#2f55a5,#4f46e5)',
                color: submitting ? '#94a3b8' : '#fff',
                fontWeight: 800, fontSize: 16, cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: submitting ? 'none' : '0 6px 20px rgba(47,85,165,0.35)',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}
            >
              <MdInventory2 size={20} />
              {submitting ? 'Submitting...' : 'Submit Pickup Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
