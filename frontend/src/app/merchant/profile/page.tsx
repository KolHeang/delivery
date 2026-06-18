'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, clearAuth } from '@/lib/auth';
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';
import {
  MdPerson,
  MdPhone,
  MdEmail,
  MdLocationOn,
  MdLogout,
  MdStore
} from 'react-icons/md';

const merchantProfileTranslations = {
  en: {
    title: 'Shop Profile',
    personalInfo: 'Contact Information',
    zoneInfo: 'Merchant Zone',
    noZone: 'No zone assigned',
    logout: 'Log Out',
    loading: 'Loading profile...',
    languageSetting: 'Language',
    activeStatus: 'Account Status',
    statusActive: 'Active / Open',
    statusInactive: 'Suspended / Closed',
  },
  km: {
    title: 'ព័ត៌មានហាង',
    personalInfo: 'ព័ត៌មានទំនាក់ទំនង',
    zoneInfo: 'តំបន់របស់ហាង',
    noZone: 'មិនមានព័ត៌មានតំបន់',
    logout: 'ចាកចេញពីគណនី',
    loading: 'កំពុងផ្ទុកព័ត៌មានហាង...',
    languageSetting: 'ភាសា',
    activeStatus: 'ស្ថានភាពគណនី',
    statusActive: 'សកម្ម / បើកដំណើរការ',
    statusInactive: 'ផ្អាក / បិទដំណើរការ',
  }
};

export default function MerchantProfilePage() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const t = merchantProfileTranslations[lang] || merchantProfileTranslations['en'];

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/merchant/login');
      return;
    }

    const loadProfile = async () => {
      try {
        const res = await api.get('/mobile/merchant/profile');
        setProfile(res.data);
      } catch (err) {
        console.error('Failed to load merchant profile', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push('/merchant/login');
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
          border: '3px solid rgba(16, 185, 129, 0.1)',
          borderTopColor: '#10b981',
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
      {/* Page Title */}
      <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 20px' }}>
        {t.title}
      </h2>

      {/* Merchant Details Card */}
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
          borderRadius: '20px',
          backgroundColor: '#ecfdf5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          color: '#10b981',
          fontWeight: '700',
          border: '2px solid #ffffff',
          boxShadow: '0 4px 10px rgba(16, 185, 129, 0.1)'
        }}>
          <MdStore size={36} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            {profile?.name}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: profile?.active ? '#10b981' : '#ef4444'
            }} />
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
              {profile?.active ? t.statusActive : t.statusInactive}
            </span>
          </div>
        </div>
      </div>

      {/* Info List */}
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
