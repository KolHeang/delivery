'use/client';
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, clearAuth, getUser } from '@/lib/auth';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdPerson,
  MdPhone,
  MdEmail,
  MdLocalShipping,
  MdLocationOn,
  MdStar,
  MdLogout,
  MdChevronRight
} from 'react-icons/md';

const profileTranslations = {
  en: {
    title: 'My Profile',
    statusLabel: 'My Current Status',
    statusOffline: 'Offline',
    statusAvailable: 'Available',
    statusOnDelivery: 'On Delivery',
    personalInfo: 'Personal Information',
    vehicleInfo: 'Vehicle Details',
    zoneInfo: 'Assigned Zone',
    noVehicle: 'No vehicle assigned',
    noZone: 'No zone assigned',
    deliveries: 'Total Deliveries',
    rating: 'Rating',
    logout: 'Log Out',
    loading: 'Loading profile...',
    languageSetting: 'Language',
  },
  km: {
    title: 'គណនីរបស់ខ្ញុំ',
    statusLabel: 'ស្ថានភាពបច្ចុប្បន្នរបស់ខ្ញុំ',
    statusOffline: 'ក្រៅបណ្តាញ (Offline)',
    statusAvailable: 'កំពុងទំនេរ (Available)',
    statusOnDelivery: 'កំពុងដឹកជញ្ជូន (On Delivery)',
    personalInfo: 'ព័ត៌មានផ្ទាល់ខ្លួន',
    vehicleInfo: 'ព័ត៌មានយានយន្ត',
    zoneInfo: 'តំបន់ដឹកជញ្ជូន',
    noVehicle: 'មិនទាន់មានការចាត់តាំងយានយន្ត',
    noZone: 'មិនទាន់មានការចាត់តាំងតំបន់',
    deliveries: 'ការដឹកជញ្ជូនសរុប',
    rating: 'ការវាយតម្លៃ',
    logout: 'ចាកចេញពីគណនី',
    loading: 'កំពុងផ្ទុកព័ត៌មានគណនី...',
    languageSetting: 'ភាសា',
  }
};

export default function DriverProfilePage() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const t = profileTranslations[lang] || profileTranslations['en'];

  const loadProfile = async () => {
    try {
      const res = await api.get('/mobile/driver/profile');
      setProfile(res.data);
    } catch (err) {
      console.error('Failed to load driver profile', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/driver/login');
      return;
    }
    loadProfile();
  }, [router]);

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      const res = await api.patch('/mobile/driver/status', { status: newStatus });
      setProfile(res.data);
    } catch (err) {
      console.error('Failed to update driver status', err);
      alert('Failed to update status.');
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push('/driver/login');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        backgroundColor: '#f8fafc',
        padding: '24px'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid rgba(47, 85, 165, 0.1)',
          borderTopColor: '#2f55a5',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '12px'
        }} />
        <span style={{ fontSize: '13px', color: '#64748b' }}>{t.loading}</span>
        <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
      backgroundColor: '#f8fafc',
      flex: 1,
      paddingBottom: '80px'
    }}>
      {/* Top Title */}
      <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 20px' }}>
        {t.title}
      </h2>

      {/* Driver Identity Card */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '20px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#eef2fa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          color: '#2f55a5',
          fontWeight: '700',
          border: '2px solid #ffffff',
          boxShadow: '0 4px 10px rgba(47, 85, 165, 0.1)'
        }}>
          {profile?.photo ? (
            <img
              src={profile.photo.startsWith('http') ? profile.photo : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/uploads/${profile.photo}`}
              alt={profile.name}
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            profile?.name?.charAt(0).toUpperCase()
          )}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            {profile?.name} {profile?.nameKh ? `(${profile.nameKh})` : ''}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: '#f59e0b',
              fontWeight: '700'
            }}>
              <MdStar size={16} /> {Number(profile?.rating || 5.0).toFixed(1)}
            </span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#cbd5e1' }} />
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
              {profile?.totalDeliveries || 0} {t.deliveries}
            </span>
          </div>
        </div>
      </div>

      {/* Online Status Toggle Box */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '20px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px'
      }}>
        <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 14px' }}>
          {t.statusLabel}
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {['offline', 'available', 'on-delivery'].map((statusOption) => {
            const isSelected = profile?.status === statusOption;
            let optColor = '#cbd5e1';
            let optBg = '#ffffff';
            let optText = '#475569';
            let label = '';

            if (statusOption === 'offline') {
              label = t.statusOffline;
              if (isSelected) { optColor = '#ef4444'; optBg = '#fef2f2'; optText = '#b91c1c'; }
            } else if (statusOption === 'available') {
              label = t.statusAvailable;
              if (isSelected) { optColor = '#10b981'; optBg = '#ecfdf5'; optText = '#047857'; }
            } else {
              label = t.statusOnDelivery;
              if (isSelected) { optColor = '#8b5cf6'; optBg = '#f5f3ff'; optText = '#6d28d9'; }
            }

            return (
              <button
                key={statusOption}
                onClick={() => !updating && handleStatusChange(statusOption)}
                disabled={updating}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: isSelected ? `2px solid ${optColor}` : '1.5px solid #cbd5e1',
                  backgroundColor: optBg,
                  color: optText,
                  fontWeight: '700',
                  fontSize: '13.5px',
                  textAlign: 'left',
                  cursor: updating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{label}</span>
                {isSelected && <span style={{ fontSize: '16px' }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Details List */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        marginBottom: '20px'
      }}>
        {/* Contact Info */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <h4 style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
            {t.personalInfo}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
              <MdPhone style={{ color: '#64748b' }} size={18} />
              <span style={{ color: '#0f172a', fontWeight: '500' }}>{profile?.phone || '—'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
              <MdEmail style={{ color: '#64748b' }} size={18} />
              <span style={{ color: '#0f172a', fontWeight: '500' }}>{profile?.email || '—'}</span>
            </div>
          </div>
        </div>

        {/* Vehicle Info */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <h4 style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
            {t.vehicleInfo}
          </h4>
          {profile?.vehicle ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2f55a5'
              }}>
                <MdLocalShipping size={20} />
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f172a' }}>
                  {profile.vehicle.brand} {profile.vehicle.model}
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', fontWeight: '500' }}>
                  Plate: <code style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{profile.vehicle.plateNumber}</code>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
              {t.noVehicle}
            </div>
          )}
        </div>

        {/* Zone Info */}
        <div style={{ padding: '16px 20px' }}>
          <h4 style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
            {t.zoneInfo}
          </h4>
          {profile?.zone ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
              <MdLocationOn style={{ color: '#ef4444' }} size={18} />
              <span style={{ color: '#0f172a', fontWeight: '700' }}>{profile.zone.name} ({profile.zone.code})</span>
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
              {t.noZone}
            </div>
          )}
        </div>
      </div>

      {/* Language Selection */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '16px 20px',
        border: '1px solid #e2e8f0',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f172a' }}>{t.languageSetting}</span>
        <div style={{
          backgroundColor: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '2px',
          display: 'flex',
          gap: '2px'
        }}>
          <button
            onClick={() => setLang('en')}
            style={{
              background: lang === 'en' ? '#ffffff' : 'transparent',
              border: 'none',
              color: lang === 'en' ? '#0f172a' : '#64748b',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: '700',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            EN
          </button>
          <button
            onClick={() => setLang('km')}
            style={{
              background: lang === 'km' ? '#ffffff' : 'transparent',
              border: 'none',
              color: lang === 'km' ? '#0f172a' : '#64748b',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: '700',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ខ្មែរ
          </button>
        </div>
      </div>

      {/* Logout button */}
      <button
        onClick={handleLogout}
        style={{
          background: '#ffffff',
          color: '#ef4444',
          border: '1.5px solid #fecaca',
          padding: '14px',
          borderRadius: '16px',
          fontSize: '14px',
          fontWeight: '700',
          cursor: 'pointer',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <MdLogout size={18} />
        {t.logout}
      </button>
    </div>
  );
}
